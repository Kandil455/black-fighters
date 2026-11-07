/**
 * lecture-create.mjs — create a lecture job and quote its cost.
 *
 * POST /api/lecture-create
 * auth: Bearer ID token (required)
 * body: { title, subject, file_name, size_bytes, duration_sec, chunk_count,
 *         client_request_id }
 *
 * Idempotent on client_request_id so a double tap never creates two jobs.
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import {
  LECTURE_CONFIG,
  estimateTranscribeSeconds,
  planChunkCount,
  quoteLectureCredits,
} from "../../src/features/lectures/lib/config.js";
import { decideLectureAccess } from "./_shared/lectures/access.mjs";

function text(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);

    const durationSec = Math.max(0, Math.round(Number(body.duration_sec) || 0));
    if (durationSec <= 0) return json(400, { error: "INVALID_DURATION" });
    if (durationSec > LECTURE_CONFIG.MAX_AUDIO_SEC) {
      return json(400, { error: "AUDIO_TOO_LONG", max_sec: LECTURE_CONFIG.MAX_AUDIO_SEC });
    }

    const sizeBytes = Math.max(0, Number(body.size_bytes) || 0);
    if (sizeBytes > LECTURE_CONFIG.MAX_AUDIO_BYTES) {
      return json(400, { error: "AUDIO_TOO_LARGE", max_bytes: LECTURE_CONFIG.MAX_AUDIO_BYTES });
    }

    const access = await decideLectureAccess(user);
    const quoted = quoteLectureCredits(durationSec);
    const chunkCount = Math.max(
      1,
      Math.min(64, Number(body.chunk_count) || planChunkCount(durationSec)),
    );
    const etaSec = estimateTranscribeSeconds(chunkCount);

    const clientRequestId = text(body.client_request_id, 120);
    if (clientRequestId) {
      const existing = await adminDb
        .collection("lectureJobs")
        .where("user_id", "==", user.uid)
        .where("client_request_id", "==", clientRequestId)
        .limit(1)
        .get();
      if (!existing.empty) {
        const doc = existing.docs[0];
        const data = doc.data();
        return json(200, {
          ok: true,
          idempotent: true,
          job_id: doc.id,
          quoted_credits: data?.credits?.quoted ?? quoted,
          eta_sec: data?.progress?.eta_sec ?? etaSec,
          chunk_count: data?.plan?.chunk_count ?? chunkCount,
        });
      }
    }

    if (!access.canCreate && access.charged === false && access.reason) {
      return json(402, { error: access.reason, quoted_credits: quoted });
    }

    const ref = adminDb.collection("lectureJobs").doc();
    await ref.set({
      id: ref.id,
      user_id: user.uid,
      client_request_id: clientRequestId || ref.id,
      created_date: FieldValue.serverTimestamp(),
      updated_date: FieldValue.serverTimestamp(),
      title: text(body.title, 160) || "محاضرة بدون عنوان",
      subject: text(body.subject, 80),
      status: "draft",
      source: {
        file_name: text(body.file_name, 200),
        mime: text(body.mime, 80),
        size_bytes: sizeBytes,
        duration_sec: durationSec,
        language_hint: text(body.language_hint, 20) || "ar-EG",
      },
      plan: {
        chunk_count: chunkCount,
        total_audio_sec: durationSec,
        chunks: [],
      },
      progress: { chunks_done: 0, chunks_failed: 0, eta_sec: etaSec },
      credits: { quoted, charged: 0, refunded: 0 },
      feature_flag: LECTURE_CONFIG.FEATURE_FLAG,
      schema_version: LECTURE_CONFIG.SCHEMA_VERSION,
      error: null,
    });

    return json(200, {
      ok: true,
      job_id: ref.id,
      quoted_credits: quoted,
      eta_sec: etaSec,
      chunk_count: chunkCount,
      can_use_ai: access.canUseAi,
    });
  } catch (error) {
    return handleError(error);
  }
};
