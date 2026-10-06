import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { cleanId, documentKey } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const { courseId } = parseBody(event);
    const id = documentKey(user.uid, cleanId(courseId, "course_id"));
    const snap = await adminDb.collection("summaryDocuments").doc(id).get();
    if (!snap.exists) return json(200, { document: null, revision: 0 });
    if (snap.data()?.user_id !== user.uid) throw new Error("FORBIDDEN_SUMMARY_DOCUMENT");
    return json(200, { document: snap.data()?.document || null, revision: Number(snap.data()?.active_revision || 0), metadata: { bytes: snap.data()?.bytes || 0, updated_at: snap.data()?.updated_at || null } });
  } catch (error) {
    return handleError(error);
  }
};
