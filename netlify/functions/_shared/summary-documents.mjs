import crypto from "node:crypto";
import { adminDb, FieldValue } from "./firebase-admin.mjs";
import { ALLOWED_MEDIA_LICENSES, validateAllowedMediaUrl } from "./media-security.mjs";

const SAFE_TEMPLATE_IDS = new Set([
  "bilingual_lecture",
  "complete_study_guide",
  "exam_revision_sheet",
  "comparison_classification",
  "qa_tutor",
  "visual_concepts_formulas",
]);
const SAFE_LANGUAGE_MODES = new Set(["ar", "en", "bilingual"]);
const SAFE_COLOR_LEVELS = new Set(["none", "medium", "rich"]);
const SAFE_JOB_STATUSES = new Set(["queued", "analyzing", "running", "merging", "validating", "completed", "failed", "cancelled"]);
const SAFE_CHUNK_STATUSES = new Set(["pending", "running", "completed", "failed", "cancelled"]);

export function cleanId(value, name = "id") {
  const result = String(value || "").trim();
  if (!result || result.length > 180 || /[\/\u0000-\u001f]/.test(result)) throw new Error(`INVALID_${name.toUpperCase()}`);
  return result;
}

export function documentKey(uid, courseId) {
  return crypto.createHash("sha256").update(`${uid}:${courseId}`).digest("hex");
}

export function jobKey(uid, idempotencyKey) {
  const key = cleanId(idempotencyKey || crypto.randomUUID(), "idempotency_key");
  return crypto.createHash("sha256").update(`${uid}:${key}`).digest("hex");
}

export function safeJobConfig(input = {}) {
  const templateId = SAFE_TEMPLATE_IDS.has(input.templateId) ? input.templateId : "bilingual_lecture";
  const languageMode = SAFE_LANGUAGE_MODES.has(input.languageMode) ? input.languageMode : "bilingual";
  const colorLevel = SAFE_COLOR_LEVELS.has(input.colorLevel) ? input.colorLevel : "medium";
  return {
    templateId,
    languageMode,
    colorLevel,
    maxPages: Math.max(1, Math.min(100, Number(input.maxPages) || 12)),
    inputChars: Math.max(0, Math.min(5_000_000, Number(input.inputChars) || 0)),
    pipelineVersion: String(input.pipelineVersion || "summary-v3").slice(0, 40),
  };
}

export async function assertCourseOwner(uid, courseId) {
  if (!courseId) return;
  const snap = await adminDb.collection("courses").doc(cleanId(courseId, "course_id")).get();
  if (!snap.exists) throw new Error("COURSE_NOT_FOUND");
  if (snap.data()?.user_id !== uid) throw new Error("FORBIDDEN_COURSE");
}

export function validateSummaryDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("INVALID_SUMMARY_DOCUMENT");
  if (Number(document.schemaVersion) !== 3) throw new Error("INVALID_SUMMARY_SCHEMA");
  if (!SAFE_TEMPLATE_IDS.has(document.templateId)) throw new Error("INVALID_TEMPLATE_ID");
  if (!SAFE_LANGUAGE_MODES.has(document.languageMode)) throw new Error("INVALID_LANGUAGE_MODE");
  if (!Array.isArray(document.sections) || document.sections.length > 120) throw new Error("INVALID_SUMMARY_SECTIONS");
  const serialized = JSON.stringify(document);
  if (serialized.length > 800_000) throw new Error("SUMMARY_DOCUMENT_TOO_LARGE");
  if (/<\s*(?:script|iframe|object|embed|svg|math)[\s>]/i.test(serialized) || /javascript\s*:/i.test(serialized)) {
    throw new Error("UNSAFE_SUMMARY_CONTENT");
  }
  const blocks = [
    ...(document.overview || []),
    ...(document.conclusion || []),
    ...(document.sections || []).flatMap((section) => section?.blocks || []),
  ];
  for (const block of blocks) {
    if (block?.type !== "image") continue;
    validateAllowedMediaUrl(block.src);
    if (block.attribution?.approved !== true) throw new Error("IMAGE_NOT_APPROVED");
    if (!ALLOWED_MEDIA_LICENSES.has(String(block.attribution?.license || "").toLowerCase())) throw new Error("INVALID_IMAGE_LICENSE");
    try {
      const source = new URL(String(block.attribution?.sourcePage || ""));
      if (source.protocol !== "https:") throw new Error();
    } catch {
      throw new Error("INVALID_IMAGE_SOURCE_PAGE");
    }
  }
  return { document: JSON.parse(serialized), bytes: Buffer.byteLength(serialized) };
}

function validateJsonPayload(value, maxBytes, errorCode) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") throw new Error(errorCode);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > maxBytes) throw new Error(errorCode);
  if (/<\s*(?:script|iframe|object|embed|svg)[\s>]/i.test(serialized) || /javascript\s*:/i.test(serialized)) {
    throw new Error("UNSAFE_SUMMARY_CONTENT");
  }
  return JSON.parse(serialized);
}

export function validateChunkOutput(value) {
  return validateJsonPayload(value, 120_000, "SUMMARY_CHUNK_OUTPUT_TOO_LARGE");
}

export function validateJobResult(value) {
  return validateJsonPayload(value, 900_000, "SUMMARY_JOB_RESULT_TOO_LARGE");
}

export async function getJobArtifacts(ref) {
  const [chunkSnapshot, resultSnapshot] = await Promise.all([
    ref.collection("chunkOutputs").orderBy("index", "asc").limit(500).get(),
    ref.collection("results").doc("current").get(),
  ]);
  return {
    chunkOutputs: chunkSnapshot.docs.map((doc) => doc.data()),
    result: resultSnapshot.exists ? resultSnapshot.data()?.output || null : null,
  };
}

export function cleanJobStatus(value, fallback = null) {
  return SAFE_JOB_STATUSES.has(value) ? value : fallback;
}

export function cleanChunkStatus(value, fallback = null) {
  return SAFE_CHUNK_STATUSES.has(value) ? value : fallback;
}

export function serializeSnapshot(snapshot) {
  if (!snapshot?.exists) return null;
  const data = snapshot.data();
  return { id: snapshot.id, ...data };
}

export async function getOwnedJob(uid, id) {
  const ref = adminDb.collection("summaryJobs").doc(cleanId(id, "job_id"));
  const snap = await ref.get();
  if (!snap.exists) throw new Error("SUMMARY_JOB_NOT_FOUND");
  if (snap.data()?.user_id !== uid) throw new Error("FORBIDDEN_SUMMARY_JOB");
  return { ref, snap };
}

export { FieldValue };
