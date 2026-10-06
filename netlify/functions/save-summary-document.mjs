import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { assertCourseOwner, cleanId, documentKey, validateSummaryDocument, FieldValue } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const courseId = cleanId(body.courseId, "course_id");
    await assertCourseOwner(user.uid, courseId);
    const validated = validateSummaryDocument(body.document);
    const key = documentKey(user.uid, courseId);
    const documentRef = adminDb.collection("summaryDocuments").doc(key);
    const requestedBase = Math.max(0, Number(body.baseRevision) || 0);
    let revision = 0;

    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(documentRef);
      const currentRevision = current.exists ? Number(current.data()?.active_revision || 0) : 0;
      if (requestedBase !== currentRevision) throw new Error("SUMMARY_REVISION_CONFLICT");
      revision = currentRevision + 1;
      const revisionRef = adminDb.collection("summaryRevisions").doc(`${key}_${String(revision).padStart(6, "0")}`);
      const common = {
        user_id: user.uid,
        course_id: courseId,
        document: validated.document,
        schema_version: 3,
        revision,
        bytes: validated.bytes,
        reason: String(body.reason || "autosave").slice(0, 80),
        updated_at: FieldValue.serverTimestamp(),
      };
      transaction.set(documentRef, { ...common, active_revision: revision, created_at: current.exists ? current.data()?.created_at : FieldValue.serverTimestamp() });
      transaction.set(revisionRef, { ...common, created_at: FieldValue.serverTimestamp() });
    });

    const generatedQuery = adminDb.collection("generatedContent")
      .where("course_id", "==", courseId)
      .where("user_id", "==", user.uid)
      .where("content_type", "==", "summary")
      .limit(1);
    const generated = await generatedQuery.get();
    const compatibility = JSON.stringify({
      summary_document_v3: validated.document,
      summary_markdown: String(body.renderedMarkdown || "").slice(0, 500_000),
      schema_version: 3,
      active_revision: revision,
    });
    if (generated.empty) {
      await adminDb.collection("generatedContent").add({
        user_id: user.uid,
        course_id: courseId,
        content_type: "summary",
        language: validated.document.languageMode,
        content: compatibility,
        schema_version: 3,
        active_revision: revision,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    } else {
      await generated.docs[0].ref.update({
        content: compatibility,
        language: validated.document.languageMode,
        schema_version: 3,
        active_revision: revision,
        updated_at: FieldValue.serverTimestamp(),
      });
    }
    return json(200, { success: true, revision, bytes: validated.bytes });
  } catch (error) {
    return handleError(error);
  }
};
