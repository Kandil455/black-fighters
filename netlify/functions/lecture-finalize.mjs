/**
 * lecture-finalize.mjs — stitch chunk transcripts into a numbered transcript.
 *
 * POST /api/lecture-finalize   body: { job_id }
 *
 * • keeps chunk order, removes recorder overlap at the seams
 * • segments into sentences and numbers them 1..N (the ids DeepSeek consumes)
 * • records gaps for failed chunks instead of silently dropping audio (N5)
 * • persists to lectureTranscripts/{jobId}
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { buildTranscript } from "../../src/features/lectures/lib/segmentSentences.js";
import { tidyTranscript, trimOverlap } from "../../src/features/lectures/lib/textNormalize.js";

async function loadJob(jobId, uid) {
  const snap = await adminDb.collection("lectureJobs").doc(jobId).get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const data = snap.data();
  if (data.user_id !== uid) throw new Error("UNAUTHORIZED");
  return { ref: snap.ref, data };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const jobId = String(body.job_id || "").trim();
    if (!jobId) return json(400, { error: "INVALID_REQUEST" });

    const { ref, data } = await loadJob(jobId, user.uid);
    const chunks = (
      Array.isArray(data?.plan?.chunks) && data.plan.chunks.length > 0
        ? [...data.plan.chunks]
        : Array.isArray(data?.["plan.chunks"]) && data["plan.chunks"].length > 0
          ? [...data["plan.chunks"]]
          : Array.isArray(data?.chunks) && data.chunks.length > 0
            ? [...data.chunks]
            : []
    );
    if (chunks.length === 0) return json(400, { error: "NO_CHUNKS" });

    chunks.sort((a, b) => Number(a.index) - Number(b.index));

    const done = chunks.filter((c) => c.status === "done" && c.text);
    if (done.length === 0) return json(400, { error: "NO_TRANSCRIPT_TEXT" });

    // ─── stitch with overlap trimming ───────────────────────────────────────
    let joined = "";
    let previous = "";
    const gaps = [];
    for (const chunk of chunks) {
      if (chunk.status !== "done" || !chunk.text) {
        gaps.push({
          after_sentence: null,
          chunk_index: Number(chunk.index),
          start_sec: chunk.start_sec ?? null,
          end_sec: chunk.end_sec ?? null,
          reason: chunk.error || "CHUNK_FAILED",
        });
        continue;
      }
      const piece = previous ? trimOverlap(previous, chunk.text) : chunk.text;
      joined = joined ? `${joined} ${piece}` : piece;
      previous = chunk.text;
    }

    const cleaned = tidyTranscript(joined);
    const transcript = buildTranscript(cleaned, { chunkIndex: 0 });

    if (transcript.sentence_count === 0) {
      return json(400, { error: "EMPTY_TRANSCRIPT" });
    }

    // Attach gaps at the nearest known sentence boundary (UI shows a marker).
    const totalSentences = transcript.sentence_count;
    for (const gap of gaps) {
      const before = chunks
        .filter((c) => Number(c.index) < gap.chunk_index && c.status === "done")
        .reduce((sum, c) => sum + (Number(c.text_words) || 0), 0);
      const ratio = transcript.word_count > 0 ? Math.min(1, before / transcript.word_count) : 0;
      gap.after_sentence = Math.max(0, Math.min(totalSentences, Math.round(ratio * totalSentences)));
    }

    const docRef = adminDb.collection("lectureTranscripts").doc(jobId);
    await docRef.set({
      job_id: jobId,
      user_id: user.uid,
      word_count: transcript.word_count,
      sentence_count: transcript.sentence_count,
      gaps,
      sentences: transcript.sentences,
      built_at: FieldValue.serverTimestamp(),
    });

    await ref.set(
      {
        updated_date: FieldValue.serverTimestamp(),
        status: "organizing",
        "progress.chunks_done": done.length,
        "progress.chunks_failed": chunks.length - done.length,
        transcript_stats: {
          word_count: transcript.word_count,
          sentence_count: transcript.sentence_count,
          gaps: gaps.length,
        },
      },
      { merge: true },
    );

    return json(200, {
      ok: true,
      sentence_count: transcript.sentence_count,
      word_count: transcript.word_count,
      gaps: gaps.length,
      chunks_done: done.length,
      chunks_failed: chunks.length - done.length,
      transcript: {
        job_id: jobId,
        user_id: user.uid,
        word_count: transcript.word_count,
        sentence_count: transcript.sentence_count,
        gaps,
        sentences: transcript.sentences,
      },
    });
  } catch (error) {
    if (error?.message === "NOT_FOUND") return json(404, { error: "NOT_FOUND" });
    if (error?.message === "UNAUTHORIZED") return json(401, { error: "UNAUTHORIZED" });
    return handleError(error);
  }
};
