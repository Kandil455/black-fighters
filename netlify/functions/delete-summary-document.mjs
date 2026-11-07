import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { assertCourseOwner, cleanId, documentKey } from "./_shared/summary-documents.mjs";

/**
 * Owner-satisfaction request: full per-user data control. Deletes the v3
 * summary document, every revision snapshot, and the generatedContent mirror
 * for the calling user + course. Other courses/users are never touched.
 * Also marks any in-flight summaryJobs for the course as cancelled.
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const courseId = cleanId(body.courseId, "course_id");
    await assertCourseOwner(user.uid, courseId);
    const key = documentKey(user.uid, courseId);

    const docRef = adminDb.collection("summaryDocuments").doc(key);
    const [docSnap, revisions, generated, activeJobs] = await Promise.all([
      docRef.get(),
      adminDb.collection("summaryRevisions").where("user_id", "==", user.uid).where("course_id", "==", courseId).get(),
      adminDb.collection("generatedContent").where("user_id", "==", user.uid).where("course_id", "==", courseId).where("content_type", "==", "summary").get(),
      adminDb.collection("summaryJobs").where("user_id", "==", user.uid).where("course_id", "==", courseId).where("status", "in", ["queued", "analyzing", "running", "merging", "validating"]).get(),
    ]);

    const batch = adminDb.batch();
    let deleted = 0;
    if (docSnap.exists) {
      batch.delete(docRef);
      deleted += 1;
    }
    revisions.forEach((doc) => { batch.delete(doc.ref); deleted += 1; });
    generated.forEach((doc) => { batch.delete(doc.ref); deleted += 1; });
    activeJobs.forEach((job) => {
      batch.update(job.ref, { status: "cancelled", updated_at_ms: Date.now() });
    });
    await batch.commit();

    return json(200, { ok: true, deleted, cancelledJobs: activeJobs.size });
  } catch (error) {
    return handleError(error);
  }
};
