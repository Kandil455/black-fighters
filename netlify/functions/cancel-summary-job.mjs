import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { getOwnedJob, serializeSnapshot, FieldValue } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const { jobId } = parseBody(event);
    const { ref } = await getOwnedJob(user.uid, jobId);
    await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.data()?.status === "completed") return;
      const chunks = (snap.data()?.chunks || []).map((chunk) =>
        ["pending", "running"].includes(chunk.status) ? { ...chunk, status: "cancelled" } : chunk,
      );
      transaction.update(ref, { status: "cancelled", chunks, cancelled_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
    });
    return json(200, { job: serializeSnapshot(await ref.get()) });
  } catch (error) {
    return handleError(error);
  }
};
