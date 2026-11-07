import crypto from "node:crypto";
import { adminDb, FieldValue } from "./firebase-admin.mjs";
import { ALLOWED_MEDIA_LICENSES, validateAllowedMediaUrl } from "./media-security.mjs";

const SAFE_TEMPLATE_IDS = new Set([
  // Atlas V5 defaults — MUST stay in sync with SUMMARY_TEMPLATE_REGISTRY
  // (src/lib/summaryV3/registry.js). While they were missing here, safeJobConfig
  // silently coerced the user's template choice to bilingual_lecture.
  "foundational_bilingual",
  "atlas_cram",
  "bilingual_lecture",
  "complete_study_guide",
  "exam_revision_sheet",
  "comparison_classification",
  "qa_tutor",
  "visual_concepts_formulas",
  // Owner visual designs (kept in sync with src/lib/summaryDesigns.js so a
  // Royal/Capsule summary can actually be saved instead of failing validation).
  "royal_study",
  "capsule_sheet",
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

const TEMPLATE_ALIASES = {
  atlas_foundational: "foundational_bilingual",
  foundational: "foundational_bilingual",
  standard: "foundational_bilingual",
  detailed: "complete_study_guide",
  condensed: "atlas_cram",
  exam_capsules: "atlas_cram",
  cram_sheet: "atlas_cram",
  comparisons: "comparison_classification",
  ultra_multi_agent: "bilingual_lecture",
  lecture_exact: "complete_study_guide",
  complete: "complete_study_guide",
  revision_sheet: "exam_revision_sheet",
  key_points: "exam_revision_sheet",
  equations_only: "visual_concepts_formulas",
  bilingual_blocks: "bilingual_lecture",
  simple_overview: "complete_study_guide",
  compact: "exam_revision_sheet",
  qa_notes: "qa_tutor",
  comparison_tables: "comparison_classification",
  concept_map: "visual_concepts_formulas",
  timeline: "visual_concepts_formulas",
  organized_original: "complete_study_guide",
  format_only: "complete_study_guide",
  royal: "royal_study",
  capsule: "capsule_sheet",
};

export function safeJobConfig(input = {}) {
  const resolvedTemplate = TEMPLATE_ALIASES[input.templateId] || input.templateId;
  const templateId = SAFE_TEMPLATE_IDS.has(resolvedTemplate) ? resolvedTemplate : "foundational_bilingual";
  const languageMode = SAFE_LANGUAGE_MODES.has(input.languageMode) ? input.languageMode : "bilingual";
  const colorLevel = SAFE_COLOR_LEVELS.has(input.colorLevel) ? input.colorLevel : "medium";
  return {
    templateId,
    languageMode,
    colorLevel,
    maxPages: Math.max(1, Math.min(200, Number(input.maxPages) || 20)),
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
  const parsed = JSON.parse(serialized);
  // Firestore rejects map KEYS containing '.', '~', '*', '[', ']', '/',
  // backticks or '__' prefixes with an opaque "invalid nested entity". AI
  // glossaries/tables love terms like "v2.2" or "1.5mg/kg" — sanitize keys
  // and fail with a NAMED path when something can't be represented.
  return { document: assertAndSanitizeFirestoreDoc(parsed), bytes: Buffer.byteLength(serialized) };
}

const BAD_KEY_RE = /[.~*/[\]`]/;

export function assertAndSanitizeFirestoreDoc(value, path = "document", depth = 0) {
  if (depth > 60) return value;
  if (Array.isArray(value)) {
    const mapped = value.map((item, i) => assertAndSanitizeFirestoreDoc(item, `${path}[${i}]`, depth + 1));
    // Firestore REJECTS arrays containing arrays ("invalid nested entity").
    // AI tables/annotations love [[...],[...]] — wrap each nested array in a
    // plain map so the write can never be rejected again.
    return mapped.map((item) => (Array.isArray(item) ? { values: item } : item));
  }
  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      const err = new Error(`FIRESTORE_INVALID_FIELD::${path} non-plain object`);
      err.code = "FIRESTORE_INVALID_FIELD";
      throw err;
    }
    const out = {};
    for (const [key, sub] of Object.entries(value)) {
      const trimmed = String(key).trim();
      if (!trimmed) {
        out._ = assertAndSanitizeFirestoreDoc(sub, `${path}._`, depth + 1);
        continue;
      }
      if (BAD_KEY_RE.test(key) || key.startsWith("__") || key.length > 1500) {
        const safeKey = key.replace(/[.~*/[\]`]/g, "·").replace(/^__/, "_").slice(0, 1500);
        out[safeKey] = assertAndSanitizeFirestoreDoc(sub, `${path}.${safeKey}`, depth + 1);
        continue;
      }
      // Firestore caps nesting at ~20 levels — collapse pathological subtrees
      // into a JSON string instead of letting the whole write fail.
      if (depth > 14) {
        out[trimmed] = JSON.stringify(sub);
        continue;
      }
      out[trimmed] = assertAndSanitizeFirestoreDoc(sub, `${path}.${trimmed}`, depth + 1);
    }
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return 0;
  if (value === null || ["string", "boolean", "number"].includes(typeof value)) return value;
  const err = new Error(`FIRESTORE_INVALID_FIELD::${path} type ${typeof value}`);
  err.code = "FIRESTORE_INVALID_FIELD";
  throw err;
}


function validateJsonPayload(value, maxBytes, errorCode) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") throw new Error(errorCode);
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized) > maxBytes) throw new Error(errorCode);
  if (/<\s*(?:script|iframe|object|embed|svg)[\s>]/i.test(serialized) || /javascript\s*:/i.test(serialized)) {
    throw new Error("UNSAFE_SUMMARY_CONTENT");
  }
  return assertAndSanitizeFirestoreDoc(JSON.parse(serialized));
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
