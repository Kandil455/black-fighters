/**
 * Organization validator — enforces owner rule N2/N3:
 * DeepSeek NEVER rewrites a sentence. It may only return sentence IDs.
 *
 * A plan is accepted only when:
 *   1. every sentence id appears EXACTLY once across sections + noise
 *   2. no id falls outside 1..N
 *   3. ids are ascending within each section (preserves the professor's order)
 *   4. no section carries verbatim transcript prose (that means it re-wrote)
 *   5. structural shape is sane (titles are strings, sections non-empty)
 *
 * Any violation → the caller retries, then falls back to a deterministic
 * split so the user always gets a usable document.
 */
import { normalizeForCompare } from "./textNormalize.js";

const VALID_KINDS = new Set([
  "concept", "steps", "compare", "exam", "example", "narration", "fluff",
]);

/** A section title longer than this is almost certainly leaked prose. */
const MAX_TITLE_CHARS = 90;

/**
 * @param {object} plan DeepSeek JSON
 * @param {{sentences:Array<{id:number,text:string}>}} transcript
 * @returns {{passed:boolean, errors:string[], plan?:object}}
 */
export function validateOrganization(plan, transcript) {
  const errors = [];
  const sentences = Array.isArray(transcript?.sentences) ? transcript.sentences : [];
  const max = sentences.length;

  if (!plan || typeof plan !== "object") {
    return { passed: false, errors: ["NOT_AN_OBJECT"] };
  }
  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    return { passed: false, errors: ["NO_SECTIONS"] };
  }
  if (max === 0) {
    return { passed: false, errors: ["EMPTY_TRANSCRIPT"] };
  }

  const seen = new Map(); // id -> count
  const noise = Array.isArray(plan.noise_sentence_ids) ? plan.noise_sentence_ids : [];

  const register = (rawId, where) => {
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      errors.push(`NON_INTEGER_ID:${where}`);
      return null;
    }
    if (id < 1 || id > max) {
      errors.push(`OUT_OF_RANGE:${id}`);
      return null;
    }
    seen.set(id, (seen.get(id) || 0) + 1);
    return id;
  };

  const cleanSections = [];
  for (const [index, section] of plan.sections.entries()) {
    if (!section || typeof section !== "object") {
      errors.push(`SECTION_NOT_OBJECT:${index}`);
      continue;
    }
    const title = typeof section.title === "string" ? section.title.trim() : "";
    if (!title) errors.push(`MISSING_TITLE:${index}`);
    if (title.length > MAX_TITLE_CHARS) errors.push(`TITLE_TOO_LONG:${index}`);
    // Verbatim prose leak check: a title must not repeat a whole transcript sentence.
    if (title) {
      const normalized = normalizeForCompare(title);
      if (normalized.length >= 40) {
        const leaked = sentences.some(
          (s) => normalizeForCompare(s.text) === normalized,
        );
        if (leaked) errors.push(`TITLE_IS_TRANSCRIPT_TEXT:${index}`);
      }
    }

    const rawIds = Array.isArray(section.sentence_ids) ? section.sentence_ids : [];
    if (rawIds.length === 0) {
      errors.push(`EMPTY_SECTION:${index}`);
      continue;
    }
    const ids = [];
    let previous = -Infinity;
    for (const rawId of rawIds) {
      const id = register(rawId, `s${index}`);
      if (id == null) continue;
      if (id < previous) errors.push(`NOT_ASCENDING:${index}`);
      previous = id;
      ids.push(id);
    }
    // Any string payload masquerading as content = a rewrite.
    for (const key of ["text", "content", "body", "sentences"]) {
      if (typeof section[key] === "string" && section[key].trim().length > 0) {
        errors.push(`SECTION_HAS_PROSE:${index}:${key}`);
      }
    }
    const kindHint = VALID_KINDS.has(section.kindHint) ? section.kindHint : "concept";
    cleanSections.push({
      title: title || "بدون عنوان",
      kindHint,
      importance: Math.min(3, Math.max(1, Number(section.importance) || 1)),
      sentence_ids: ids,
    });
  }

  for (const rawId of noise) register(rawId, "noise");

  for (const [id, count] of seen) {
    if (count > 1) errors.push(`DUPLICATED:${id}`);
  }
  const missing = [];
  for (let id = 1; id <= max; id += 1) {
    if (!seen.has(id)) missing.push(id);
  }
  if (missing.length) errors.push(`MISSING_IDS:${missing.slice(0, 12).join(",")}`);

  const glossary = Array.isArray(plan.glossary)
    ? plan.glossary
        .filter((g) => g && typeof g.term === "string" && g.term.trim())
        .slice(0, 200)
        .map((g) => ({
          term: String(g.term).trim(),
          ar: typeof g.ar === "string" ? g.ar.trim() : "",
          sentence_ids: Array.isArray(g.sentence_ids)
            ? g.sentence_ids.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= max)
            : [],
        }))
    : [];

  const passed = errors.length === 0;
  return {
    passed,
    errors,
    plan: passed
      ? {
          sections: cleanSections,
          noise_sentence_ids: noise.map(Number).filter(Number.isInteger),
          glossary,
        }
      : undefined,
  };
}

/**
 * Deterministic fallback: chunk sentences into equal groups of 8.
 * Guarantees full, exactly-once coverage with no model involvement.
 */
export function fallbackOrganization(transcript) {
  const sentences = Array.isArray(transcript?.sentences) ? transcript.sentences : [];
  const sections = [];
  const groupSize = 8;
  for (let i = 0; i < sentences.length; i += groupSize) {
    const group = sentences.slice(i, i + groupSize);
    const firstId = group[0]?.id ?? i + 1;
    const lastId = group[group.length - 1]?.id ?? firstId;
    sections.push({
      title: `الجزء ${sections.length + 1} — جمل ${firstId} إلى ${lastId}`,
      kindHint: "narration",
      importance: 1,
      sentence_ids: group.map((s) => Number(s.id)),
    });
  }
  return { sections, noise_sentence_ids: [], glossary: [] };
}

export default validateOrganization;
