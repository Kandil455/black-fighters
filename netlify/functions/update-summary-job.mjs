import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import {
  cleanChunkStatus, cleanJobStatus, getJobArtifacts, getOwnedJob, serializeSnapshot,
  validateChunkOutput, validateJobResult, FieldValue,
} from "./_shared/summary-documents.mjs";
import { notifySummaryReady } from "./_shared/telegram-sync.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const { ref } = await getOwnedJob(user.uid, body.jobId);
    const chunkOutput = validateChunkOutput(body.chunkOutput);
    const resultOutput = validateJobResult(body.resultOutput);

    // Only the run that MOVED the job into `completed` notifies the student —
    // otherwise every later poll of the same job would send another message.
    let justCompleted = false;
    let jobTitle = "";

    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      const data = current.data();
      if (["completed", "cancelled"].includes(data.status)) return;
      const chunks = Array.isArray(data.chunks) ? [...data.chunks] : [];
      const chunkIndex = Number(body.chunkIndex);
      const chunkStatus = cleanChunkStatus(body.chunkStatus);
      if (Number.isInteger(chunkIndex) && chunkStatus && chunks[chunkIndex]) {
        const previous = chunks[chunkIndex];
        chunks[chunkIndex] = {
          ...previous,
          status: chunkStatus,
          attempts: chunkStatus === "running" ? Number(previous.attempts || 0) + 1 : Number(previous.attempts || 0),
          error: chunkStatus === "failed" ? String(body.error || "CHUNK_FAILED").slice(0, 500) : null,
          updated_at_ms: Date.now(),
        };
      }
      if (Number.isInteger(chunkIndex) && chunkOutput) {
        transaction.set(ref.collection("chunkOutputs").doc(String(chunkIndex).padStart(4, "0")), {
          index: chunkIndex,
          output: chunkOutput,
          updated_at: FieldValue.serverTimestamp(),
        });
      }
      if (resultOutput) {
        transaction.set(ref.collection("results").doc("current"), {
          output: resultOutput,
          updated_at: FieldValue.serverTimestamp(),
        });
      }
      const completed = chunks.filter((chunk) => chunk.status === "completed").length;
      const status = cleanJobStatus(body.status, data.status);
      transaction.update(ref, {
        chunks,
        status,
        completed_chunks: completed,
        progress: chunks.length ? Math.round((completed / chunks.length) * 100) : 0,
        model_actual: body.model ? String(body.model).slice(0, 120) : data.model_actual || "",
        error: status === "failed" ? String(body.error || "SUMMARY_JOB_FAILED").slice(0, 1000) : null,
        quality: body.quality && typeof body.quality === "object" ? body.quality : data.quality || null,
        updated_at: FieldValue.serverTimestamp(),
        ...(status === "completed" ? { completed_at: FieldValue.serverTimestamp(), progress: 100 } : {}),
      });
      if (status === "completed" && data.status !== "completed") {
        justCompleted = true;
        jobTitle = String(data.title || data.course_title || "");
      }
    });
    const artifacts = await getJobArtifacts(ref);

    if (justCompleted) {
      // Best-effort, budget-limited by telegram-notify: a Telegram failure must
      // never fail the save that the student is waiting on.
      notifySummaryReady({ uid: user.uid, documentId: body.jobId, title: jobTitle })
        .catch((err) => console.warn("[update-summary-job] notify skipped:", err?.message));
    }

    return json(200, { job: serializeSnapshot(await ref.get()), ...artifacts });
  } catch (error) {
    return handleError(error);
  }
};
