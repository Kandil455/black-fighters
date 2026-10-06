import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { cleanId } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const courseId = cleanId(body.courseId, "course_id");
    const max = Math.max(1, Math.min(50, Number(body.limit) || 20));
    const snap = await adminDb.collection("summaryRevisions")
      .where("user_id", "==", user.uid)
      .where("course_id", "==", courseId)
      .orderBy("revision", "desc")
      .limit(max)
      .get();
    const revisions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return json(200, { revisions });
  } catch (error) {
    return handleError(error);
  }
};
