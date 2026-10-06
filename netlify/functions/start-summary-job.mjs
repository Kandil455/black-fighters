import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { assertCourseOwner, getJobArtifacts, jobKey, safeJobConfig, serializeSnapshot, FieldValue } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const courseId = body.courseId ? String(body.courseId) : "";
    await assertCourseOwner(user.uid, courseId);
    const totalChunks = Math.max(1, Math.min(500, Number(body.totalChunks) || 1));
    const id = jobKey(user.uid, body.idempotencyKey);
    const ref = adminDb.collection("summaryJobs").doc(id);
    let existing = await ref.get();
    if (existing.exists) {
      if (["failed", "cancelled"].includes(existing.data()?.status)) {
        await adminDb.runTransaction(async (transaction) => {
          const current = await transaction.get(ref);
          const chunks = (current.data()?.chunks || []).map((chunk) => (
            chunk.status === "completed"
              ? chunk
              : { ...chunk, status: "pending", error: null, updated_at_ms: Date.now() }
          ));
          transaction.update(ref, {
            status: "queued",
            chunks,
            error: null,
            cancelled_at: FieldValue.delete(),
            updated_at: FieldValue.serverTimestamp(),
          });
        });
        existing = await ref.get();
      }
      const artifacts = await getJobArtifacts(ref);
      return json(200, { job: serializeSnapshot(existing), idempotent: true, ...artifacts });
    }
    const config = safeJobConfig(body.config);
    await ref.set({
      user_id: user.uid,
      course_id: courseId,
      fingerprint: String(body.fingerprint || "").slice(0, 128),
      status: "queued",
      progress: 0,
      completed_chunks: 0,
      total_chunks: totalChunks,
      config,
      chunks: Array.from({ length: totalChunks }, (_, index) => ({ index, status: "pending", attempts: 0 })),
      model_actual: "",
      pipeline_version: config.pipelineVersion,
      error: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    return json(201, { job: serializeSnapshot(await ref.get()), idempotent: false, chunkOutputs: [], result: null });
  } catch (error) {
    return handleError(error);
  }
};
