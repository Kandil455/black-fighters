/**
 * lecture-transcribe-chunk.mjs — transcribe ONE uploaded chunk.
 *
 * POST /api/lecture-transcribe-chunk
 * body: { job_id, chunk_index, audio_url | storage_path, mime, lease_id }
 *
 * Flow: verify ownership → global rate-limit slot (3 RPM project-wide) →
 *       download chunk → Files API → generateContent → extractTranscriptText →
 *       persist text → release slot.
 *
 * Never falls back to another model (owner rule N1).
 * Never logs transcript content (owner rule / privacy).
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { LECTURE_CONFIG } from "../../src/features/lectures/lib/config.js";
import { withGlobalSlot } from "./_shared/lectures/global-rate-limiter.mjs";
import {
  transcribeBuffer,
  TranscribeError,
} from "./_shared/lectures/gemini-transcribe.mjs";
import { getAdminTranscribeKeys } from "./_shared/lectures/admin-keys.mjs";
import { collapseWhitespace } from "../../src/features/lectures/lib/textNormalize.js";

const MAX_CHUNK_BYTES = 60 * 1024 * 1024;

async function loadJob(jobId, uid) {
  const ref = adminDb.collection("lectureJobs").doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const data = snap.data();
  if (data.user_id !== uid) throw new Error("UNAUTHORIZED");
  return { ref, data };
}

async function downloadChunk({ audioUrl, audioBase64, storagePath, event }) {
  if (audioBase64 && typeof audioBase64 === "string") {
    const raw = audioBase64.includes(",") ? audioBase64.split(",").pop() : audioBase64;
    const buf = Buffer.from(raw, "base64");
    if (buf.byteLength > MAX_CHUNK_BYTES) {
      throw new TranscribeError("CHUNK_TOO_LARGE", "الجزء أكبر من الحد المسموح");
    }
    return buf;
  }
  if (audioUrl && typeof audioUrl === "string") {
    let resolvedUrl = audioUrl.trim();
    // If the URL is a stream-media proxy URL and TELEGRAM_BOT_TOKEN is configured, fetch directly from Telegram to avoid self-invocation timeouts
    if (resolvedUrl.includes("/api/stream-media") && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const parsed = new URL(resolvedUrl, "https://blackfighters.site");
        const tgPath = parsed.searchParams.get("p");
        if (tgPath && !tgPath.includes("..") && !tgPath.startsWith("/")) {
          const directTgUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${tgPath}`;
          const tgRes = await fetch(directTgUrl, { cache: "no-store" });
          if (tgRes.ok) {
            const buf = Buffer.from(await tgRes.arrayBuffer());
            if (buf.byteLength > MAX_CHUNK_BYTES) {
              throw new TranscribeError("CHUNK_TOO_LARGE", "الجزء أكبر من الحد المسموح");
            }
            return buf;
          }
        }
      } catch {
        // Fall through to standard HTTP fetch
      }
    }
    if (resolvedUrl.startsWith("/")) {
      const proto = event?.headers?.["x-forwarded-proto"] || "https";
      const host = event?.headers?.["x-forwarded-host"] || event?.headers?.host || "blackfighters.site";
      resolvedUrl = `${proto}://${host}${resolvedUrl}`;
    }
    const res = await fetch(resolvedUrl, { cache: "no-store" });
    if (!res.ok) throw new TranscribeError("CHUNK_DOWNLOAD_FAILED", `تعذّر تحميل الجزء (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_CHUNK_BYTES) {
      throw new TranscribeError("CHUNK_TOO_LARGE", "الجزء أكبر من الحد المسموح");
    }
    return buf;
  }
  if (storagePath) {
    const bucket = adminDb.app ? null : null; // storage handled via URL below
    if (!bucket) throw new TranscribeError("CHUNK_REQUIRED", "لازم رابط الصوت للجزء");
  }
  throw new TranscribeError("CHUNK_REQUIRED", "لازم رابط الصوت للجزء");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const jobId = String(body.job_id || body.jobId || body.id || "").trim();
    const rawChunkIdx = body.chunk_index ?? body.chunkIndex ?? 0;
    const chunkIndex = Number(rawChunkIdx);
    if (!jobId || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return json(400, {
        error: "INVALID_REQUEST",
        details: "Missing job_id or invalid chunk_index",
        received_keys: Object.keys(body || {}),
      });
    }

    const { ref, data } = await loadJob(jobId, user.uid);
    if (data.status === "cancelled") return json(409, { error: "JOB_CANCELLED" });

    const existing = (
      Array.isArray(data?.plan?.chunks) && data.plan.chunks.length > 0
        ? data.plan.chunks
        : Array.isArray(data?.["plan.chunks"]) && data["plan.chunks"].length > 0
          ? data["plan.chunks"]
          : []
    );
    const already = existing.find((c) => Number(c.index) === chunkIndex);
    if (already?.status === "done" && already?.text) {
      return json(200, { ok: true, chunk_index: chunkIndex, cached: true, words: already.text_words || 0 });
    }

    const bytes = await downloadChunk({
      audioUrl: body.audio_url || body.audioUrl,
      audioBase64: body.audio_base64 || body.audioBase64 || body.bytes_base64,
      storagePath: body.storage_path || body.storagePath,
      event,
    });

    const mime = String(body.mime || data?.source?.mime || "audio/mp3");
    const languageCodes = Array.isArray(data?.settings?.languageCodes) && data.settings.languageCodes.length
      ? data.settings.languageCodes
      : ["ar-EG", "en-US"];
    const customVocabulary = Array.isArray(data?.settings?.glossaryTerms)
      ? data.settings.glossaryTerms.slice(0, 100)
      : [];
    const adminKeys = await getAdminTranscribeKeys();

    // ─── the single global gate: 3 requests/minute across the whole project ───
    const started = Date.now();
    let result;
    try {
      result = await withGlobalSlot(
        () =>
          transcribeBuffer({
            bytes,
            mimeType: mime,
            displayName: `chunk-${chunkIndex}`,
            languageCodes,
            customVocabulary,
            apiKeys: adminKeys,
            log: (msg) => console.info(`[lecture] job=${jobId} chunk=${chunkIndex} ${msg}`),
          }),
        { log: () => {} },
      );
    } catch (error) {
      const code = error?.code || "TRANSCRIBE_FAILED";
      const attempts = Number(already?.attempts || 0) + 1;
      const nextChunks = existing.map((c) =>
        Number(c.index) === chunkIndex
          ? { ...c, status: attempts >= LECTURE_CONFIG.MAX_ATTEMPTS_PER_CHUNK ? "failed" : "pending", attempts, error: code }
          : c,
      );
      if (!existing.some((c) => Number(c.index) === chunkIndex)) {
        nextChunks.push({ index: chunkIndex, status: attempts >= LECTURE_CONFIG.MAX_ATTEMPTS_PER_CHUNK ? "failed" : "pending", attempts, error: code });
      }
      const nextPlan = { ...(data?.plan || {}), chunks: nextChunks };
      await ref.set(
        {
          updated_date: FieldValue.serverTimestamp(),
          plan: nextPlan,
          "plan.chunks": nextChunks,
          error: { code, message: String(error?.message || code).slice(0, 200), at_chunk_index: chunkIndex },
        },
        { merge: true },
      );
      return json(200, { ok: false, chunk_index: chunkIndex, error: code, retryable: code !== "CHUNK_REQUIRED" });
    }

    const text = collapseWhitespace(result.text);
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const ms = Date.now() - started;

    const nextChunks = existing.filter((c) => Number(c.index) !== chunkIndex);
    nextChunks.push({
      index: chunkIndex,
      status: "done",
      attempts: Number(already?.attempts || 0) + 1,
      text,
      text_words: words,
      finish_reason: result.finishReason || null,
      took_ms: ms,
      error: null,
    });
    nextChunks.sort((a, b) => Number(a.index) - Number(b.index));

    const nextPlan = { ...(data?.plan || {}), chunks: nextChunks };
    const nextProgress = {
      ...(data?.progress || {}),
      chunks_done: nextChunks.filter((c) => c.status === "done").length,
      chunks_failed: nextChunks.filter((c) => c.status === "failed").length,
    };

    await ref.set(
      {
        updated_date: FieldValue.serverTimestamp(),
        status: "transcribing",
        plan: nextPlan,
        "plan.chunks": nextChunks,
        progress: nextProgress,
        "progress.chunks_done": nextProgress.chunks_done,
        "progress.chunks_failed": nextProgress.chunks_failed,
        error: null,
      },
      { merge: true },
    );

    return json(200, {
      ok: true,
      chunk_index: chunkIndex,
      words,
      took_ms: ms,
      empty: words === 0,
    });
  } catch (error) {
    if (error?.message === "NOT_FOUND") return json(404, { error: "NOT_FOUND" });
    if (error?.message === "UNAUTHORIZED") return json(401, { error: "UNAUTHORIZED" });
    return handleError(error);
  }
};
