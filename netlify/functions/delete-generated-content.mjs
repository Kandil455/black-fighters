import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { assertCourseOwner, cleanId, documentKey } from "./_shared/summary-documents.mjs";

const ALLOWED_TYPES = new Set(["summary", "quiz", "flashcards"]);

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const courseId = cleanId(body.courseId, "course_id");
    await assertCourseOwner(user.uid, courseId);
    const contentType = String(body.contentType || "").trim().toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) throw new Error("INVALID_GENERATED_CONTENT_TYPE");
    const id = `${documentKey(user.uid, `${courseId}:generated:${contentType}`)}_${contentType}`;
    await adminDb.collection("generatedContent").doc(id).delete();
    return json(200, { deleted: true, id });
  } catch (error) {
    return handleError(error);
  }
};
