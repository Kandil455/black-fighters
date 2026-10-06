import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { getOwnedJob, serializeSnapshot, FieldValue } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const { ref } = await getOwnedJob(user.uid, body.jobId);
    const index = Number(body.chunkIndex);
    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const chunks = [...(snap.data()?.chunks || [])];
      if (!Number.isInteger(index) || !chunks[index]) throw new Error("INVALID_CHUNK_INDEX");
      if (!["failed", "cancelled"].includes(chunks[index].status)) throw new Error("CHUNK_NOT_RETRYABLE");
      chunks[index] = { ...chunks[index], status: "pending", error: null, updated_at_ms: Date.now() };
      transaction.update(ref, { status: "running", chunks, error: null, updated_at: FieldValue.serverTimestamp() });
    });
    return json(200, { job: serializeSnapshot(await ref.get()) });
  } catch (error) {
    return handleError(error);
  }
};
