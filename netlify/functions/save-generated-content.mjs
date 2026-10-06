import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { assertCourseOwner, cleanId, documentKey, FieldValue } from "./_shared/summary-documents.mjs";

const ALLOWED_TYPES = new Set(["summary", "quiz", "flashcards"]);
const ALLOWED_LANGUAGES = new Set(["ar", "en", "bilingual", "mixed"]);

function cleanContent(value) {
  const content = typeof value === "string" ? value : JSON.stringify(value ?? "");
  if (!content.trim()) throw new Error("INVALID_GENERATED_CONTENT");
  if (Buffer.byteLength(content) > 700_000) throw new Error("GENERATED_CONTENT_TOO_LARGE");
  if (/<\s*(?:script|iframe|object|embed|svg|math)[\s>]/i.test(content) || /javascript\s*:/i.test(content)) {
    throw new Error("UNSAFE_GENERATED_CONTENT");
  }
  return content;
}

function cleanMetadata(value) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_GENERATED_METADATA");
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > 50_000 || /<\s*(?:script|iframe|object|embed|svg)[\s>]/i.test(serialized) || /javascript\s*:/i.test(serialized)) {
    throw new Error("INVALID_GENERATED_METADATA");
  }
  return JSON.parse(serialized);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const courseId = cleanId(body.courseId, "course_id");
    await assertCourseOwner(user.uid, courseId);
    const contentType = String(body.contentType || "").trim().toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) throw new Error("INVALID_GENERATED_CONTENT_TYPE");
    const language = ALLOWED_LANGUAGES.has(String(body.language || "").toLowerCase()) ? String(body.language).toLowerCase() : "ar";
    const content = cleanContent(body.content);
    const metadata = cleanMetadata(body.metadata);
    const id = `${documentKey(user.uid, `${courseId}:generated:${contentType}`)}_${contentType}`;
    const ref = adminDb.collection("generatedContent").doc(id);
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      transaction.set(ref, {
        user_id: user.uid,
        course_id: courseId,
        content_type: contentType,
        content,
        language,
        metadata,
        created_at: current.exists ? current.data()?.created_at : FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    });
    return json(200, { id, contentType, updated: true });
  } catch (error) {
    return handleError(error);
  }
};
