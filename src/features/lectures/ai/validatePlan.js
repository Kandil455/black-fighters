/**
 * src/features/lectures/ai/validatePlan.js — Plan validator & deterministic repair (Section 11.4).
 *
 * Checks (Section 11.4):
 *   • Valid JSON of the right shape
 *   • Sections are contiguous (the first starts at the first window id, each next starts
 *     at the successor of the previous end, the last ends at the last window id)
 *   • Every id exists in the window
 *   • Paragraph breaks and annotation ids belong to the window, unique and sorted
 *   • Off-topic ranges are valid
 *   • Titles are non-empty, at most 80 characters, with no HTML
 *   • Annotation density is at most 1 per 3 sentences (`Math.ceil(windowSentences.length / 3)`)
 *
 * `repairPlan(plan, windowSentences)` applies deterministic fixes:
 *   • Clamp ids into window bounds
 *   • Close gaps / resolve overlaps by extending the previous section or adding a continuation
 *     section titled with the previous title + ` (تابع)`
 *   • Drop invalid annotations, cap density to 1 per 3 sentences, sort and dedupe
 *   • If repair would move more than 30 percent of section boundaries, count the plan as invalid.
 */
import { SECTION_KINDS, ANNOTATION_KINDS, OFFTOPIC_KINDS } from "./schemas.js";
import { formatSentenceId, parseSentenceIdNumber } from "../text/segment.js";

const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/i;
const VALID_SECTION_KIND_SET = new Set(SECTION_KINDS);
const VALID_ANNOTATION_KIND_SET = new Set(ANNOTATION_KINDS);
const VALID_OFFTOPIC_KIND_SET = new Set(OFFTOPIC_KINDS);

function toCanonicalId(rawId, idByNum) {
  if (typeof rawId === "string" && idByNum.has(parseSentenceIdNumber(rawId))) {
    return idByNum.get(parseSentenceIdNumber(rawId));
  }
  const n = parseSentenceIdNumber(rawId);
  if (Number.isFinite(n) && idByNum.has(n)) return idByNum.get(n);
  return String(rawId || "");
}

function buildWindowIndex(windowSentences = []) {
  const list = Array.isArray(windowSentences) ? windowSentences : [];
  const indexById = new Map();
  const idByNum = new Map();
  const canonicalIds = [];

  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    const num = parseSentenceIdNumber(s.id ?? i + 1);
    const cid = typeof s.id === "string" && /^s\d+$/.test(s.id) ? s.id : formatSentenceId(num);
    canonicalIds.push(cid);
    indexById.set(cid, i);
    indexById.set(String(s.id), i);
    if (Number.isFinite(num)) {
      idByNum.set(num, cid);
      indexById.set(String(num), i);
    }
  }

  return { list, canonicalIds, indexById, idByNum };
}

/**
 * Validate a DeepSeek Plan strictly against `windowSentences` (Section 11.4).
 *
 * @param {object} plan
 * @param {Array<{id:string|number, text:string}>} windowSentences
 * @returns {{ valid: boolean, errors: string[], normalizedPlan?: object }}
 */
export function validatePlan(plan, windowSentences = []) {
  const errors = [];
  const { list, canonicalIds, indexById, idByNum } = buildWindowIndex(windowSentences);
  const n = list.length;

  if (!plan || typeof plan !== "object") {
    return { valid: false, errors: ["NOT_AN_OBJECT"] };
  }
  if (n === 0) {
    return { valid: false, errors: ["EMPTY_WINDOW"] };
  }
  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    return { valid: false, errors: ["NO_SECTIONS"] };
  }

  const normalizedSections = [];
  let expectedStartIdx = 0;

  for (let i = 0; i < plan.sections.length; i += 1) {
    const sec = plan.sections[i];
    if (!sec || typeof sec !== "object") {
      errors.push(`SECTION_NOT_OBJECT:${i}`);
      continue;
    }

    // Reject prose smuggling
    for (const key of ["text", "content", "body", "sentences"]) {
      if (typeof sec[key] === "string" && sec[key].trim()) {
        errors.push(`SECTION_HAS_PROSE:${i}:${key}`);
      }
    }

    const title = typeof sec.title === "string" ? sec.title.trim() : "";
    if (!title) errors.push(`EMPTY_TITLE:${i}`);
    if (title.length > 80) errors.push(`TITLE_TOO_LONG:${i}`);
    if (HTML_TAG_RE.test(title)) errors.push(`TITLE_HAS_HTML:${i}`);

    // Support both `{ from, to }` and `{ sentence_ids }`
    let fromRaw = sec.from;
    let toRaw = sec.to;
    if (fromRaw == null && Array.isArray(sec.sentence_ids) && sec.sentence_ids.length > 0) {
      fromRaw = sec.sentence_ids[0];
      toRaw = sec.sentence_ids[sec.sentence_ids.length - 1];
    }

    const fromIdx = indexById.get(String(fromRaw));
    const toIdx = indexById.get(String(toRaw));

    if (fromIdx == null) {
      errors.push(`UNKNOWN_FROM_ID:${i}:${fromRaw}`);
      continue;
    }
    if (toIdx == null) {
      errors.push(`UNKNOWN_TO_ID:${i}:${toRaw}`);
      continue;
    }
    if (toIdx < fromIdx) {
      errors.push(`INVERTED_SECTION_RANGE:${i}`);
      continue;
    }
    if (fromIdx !== expectedStartIdx) {
      if (fromIdx > expectedStartIdx) errors.push(`SECTION_GAP_AT:${i}`);
      else errors.push(`SECTION_OVERLAP_AT:${i}`);
    }
    expectedStartIdx = toIdx + 1;

    const kind = VALID_SECTION_KIND_SET.has(sec.kind || sec.kindHint)
      ? sec.kind || sec.kindHint
      : "concept";

    normalizedSections.push({
      title,
      from: canonicalIds[fromIdx],
      to: canonicalIds[toIdx],
      kind,
      continues_previous: Boolean(sec.continues_previous),
      subheadings: Array.isArray(sec.subheadings)
        ? sec.subheadings
            .filter(
              (sh) =>
                sh &&
                indexById.has(String(sh.at)) &&
                typeof sh.title === "string" &&
                sh.title.trim() &&
                !HTML_TAG_RE.test(sh.title),
            )
            .map((sh) => ({
              at: canonicalIds[indexById.get(String(sh.at))],
              title: sh.title.trim().slice(0, 80),
            }))
        : [],
      sentence_ids: canonicalIds.slice(fromIdx, toIdx + 1),
    });
  }

  if (expectedStartIdx !== n) {
    errors.push(`WINDOW_END_NOT_COVERED:${expectedStartIdx}_OF_${n}`);
  }

  // Paragraph breaks: belong to window, unique, sorted
  const rawBreaks = Array.isArray(plan.paragraph_breaks) ? plan.paragraph_breaks : [];
  const breakIndices = [];
  for (const br of rawBreaks) {
    const idx = indexById.get(String(br));
    if (idx == null) {
      errors.push(`UNKNOWN_BREAK_ID:${br}`);
      continue;
    }
    if (breakIndices.length > 0 && idx <= breakIndices[breakIndices.length - 1]) {
      errors.push(`UNSORTED_OR_DUPLICATE_BREAK:${br}`);
    }
    breakIndices.push(idx);
  }

  // Annotations: belong to window, unique, sorted, valid kind, max 1 per 3 sentences
  const rawAnnotations = Array.isArray(plan.annotations) ? plan.annotations : [];
  const maxAnnotations = Math.max(1, Math.floor(n / 3));
  if (rawAnnotations.length > maxAnnotations) {
    errors.push(`TOO_MANY_ANNOTATIONS:${rawAnnotations.length}_MAX_${maxAnnotations}`);
  }
  const annIndices = [];
  const normalizedAnnotations = [];
  for (const ann of rawAnnotations) {
    if (!ann || typeof ann !== "object") {
      errors.push("INVALID_ANNOTATION_ITEM");
      continue;
    }
    const idx = indexById.get(String(ann.id));
    if (idx == null) {
      errors.push(`UNKNOWN_ANNOTATION_ID:${ann.id}`);
      continue;
    }
    if (!VALID_ANNOTATION_KIND_SET.has(ann.kind)) {
      errors.push(`INVALID_ANNOTATION_KIND:${ann.kind}`);
      continue;
    }
    if (annIndices.length > 0 && idx <= annIndices[annIndices.length - 1]) {
      errors.push(`UNSORTED_OR_DUPLICATE_ANNOTATION:${ann.id}`);
    }
    annIndices.push(idx);
    normalizedAnnotations.push({
      id: canonicalIds[idx],
      kind: ann.kind,
      ...(typeof ann.term === "string" && ann.term.trim() && !HTML_TAG_RE.test(ann.term)
        ? { term: ann.term.trim().slice(0, 60) }
        : {}),
    });
  }

  // Offtopic ranges
  const rawOfftopic = Array.isArray(plan.offtopic) ? plan.offtopic : [];
  const normalizedOfftopic = [];
  for (const ot of rawOfftopic) {
    if (!ot || typeof ot !== "object") {
      errors.push("INVALID_OFFTOPIC_ITEM");
      continue;
    }
    const fIdx = indexById.get(String(ot.from));
    const tIdx = indexById.get(String(ot.to));
    if (fIdx == null || tIdx == null || tIdx < fIdx) {
      errors.push(`INVALID_OFFTOPIC_RANGE:${ot?.from}-${ot?.to}`);
      continue;
    }
    const kind = VALID_OFFTOPIC_KIND_SET.has(ot.kind) ? ot.kind : "other";
    normalizedOfftopic.push({
      from: canonicalIds[fIdx],
      to: canonicalIds[tIdx],
      kind,
    });
  }

  // Terms
  const rawTerms = Array.isArray(plan.terms)
    ? plan.terms
    : Array.isArray(plan.glossary)
    ? plan.glossary.map((g) => ({
        en: g.en || g.term,
        ar_hint: g.ar_hint || g.ar,
        first_id: g.first_id || g.sentence_ids?.[0],
      }))
    : [];
  const normalizedTerms = [];
  for (const t of rawTerms) {
    if (!t || typeof t.en !== "string" || !t.en.trim()) continue;
    if (HTML_TAG_RE.test(t.en) || (t.ar_hint && HTML_TAG_RE.test(t.ar_hint))) {
      errors.push("TERM_HAS_HTML");
      continue;
    }
    const firstIdx = t.first_id != null ? indexById.get(String(t.first_id)) : 0;
    normalizedTerms.push({
      en: t.en.trim().slice(0, 80),
      ...(typeof t.ar_hint === "string" && t.ar_hint.trim()
        ? { ar_hint: t.ar_hint.trim().slice(0, 120) }
        : {}),
      first_id: canonicalIds[firstIdx ?? 0],
    });
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    normalizedPlan: valid
      ? {
          sections: normalizedSections,
          paragraph_breaks: breakIndices.map((idx) => canonicalIds[idx]),
          annotations: normalizedAnnotations,
          offtopic: normalizedOfftopic,
          terms: normalizedTerms,
        }
      : undefined,
  };
}

/**
 * Deterministic repair of a slightly invalid DeepSeek Plan (Section 11.4).
 * If repair moves more than 30% of section boundaries, returns `{ repaired: false }`.
 */
export function repairPlan(plan, windowSentences = []) {
  const { list, canonicalIds, indexById } = buildWindowIndex(windowSentences);
  const n = list.length;
  if (!plan || typeof plan !== "object" || n === 0) {
    return { repaired: false, reason: "EMPTY_OR_NOT_OBJECT" };
  }

  // Reject outright if prose was smuggled into sections
  const rawSections = Array.isArray(plan.sections) ? plan.sections : [];
  if (rawSections.length === 0) {
    return { repaired: false, reason: "NO_SECTIONS" };
  }
  for (const sec of rawSections) {
    for (const key of ["text", "content", "body", "sentences"]) {
      if (typeof sec?.[key] === "string" && sec[key].trim()) {
        return { repaired: false, reason: "PROSE_SMUGGLED" };
      }
    }
  }

  // Clamp and repair section boundaries
  const clampIdx = (rawId, fallbackIdx) => {
    const direct = indexById.get(String(rawId));
    if (direct != null) return direct;
    const num = parseSentenceIdNumber(rawId);
    if (Number.isFinite(num)) {
      const firstNum = parseSentenceIdNumber(canonicalIds[0]);
      const offset = num - firstNum;
      return Math.max(0, Math.min(n - 1, offset));
    }
    return fallbackIdx;
  };

  let boundaryMoves = 0;
  const totalBoundaries = rawSections.length * 2;
  const fixedSections = [];
  let cursor = 0;

  for (let i = 0; i < rawSections.length; i += 1) {
    if (cursor >= n) {
      boundaryMoves += 2;
      continue;
    }
    const sec = rawSections[i] || {};
    const origFromRaw = sec.from ?? sec.sentence_ids?.[0];
    const origToRaw = sec.to ?? sec.sentence_ids?.[sec.sentence_ids.length - 1];

    const origFrom = indexById.get(String(origFromRaw));
    const origTo = indexById.get(String(origToRaw));

    const fromIdx = cursor;
    if (origFrom !== fromIdx) boundaryMoves += 1;

    let toIdx = i === rawSections.length - 1 ? n - 1 : clampIdx(origToRaw, Math.min(n - 1, fromIdx + 3));
    if (toIdx < fromIdx) toIdx = fromIdx;
    if (i === rawSections.length - 1 && toIdx < n - 1) {
      toIdx = n - 1;
    }
    if (origTo !== toIdx) boundaryMoves += 1;

    const cleanTitle = String(sec.title || `الجزء ${i + 1}`)
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, 80) || `الجزء ${i + 1}`;

    const kind = VALID_SECTION_KIND_SET.has(sec.kind || sec.kindHint)
      ? sec.kind || sec.kindHint
      : "concept";

    fixedSections.push({
      title: cleanTitle,
      from: canonicalIds[fromIdx],
      to: canonicalIds[toIdx],
      kind,
      continues_previous: Boolean(sec.continues_previous),
      subheadings: [],
      sentence_ids: canonicalIds.slice(fromIdx, toIdx + 1),
    });

    cursor = toIdx + 1;
  }

  // If cursor didn't reach n, append a continuation section titled with previous title + تابع
  if (cursor < n && fixedSections.length > 0) {
    boundaryMoves += 1;
    const prev = fixedSections[fixedSections.length - 1];
    fixedSections.push({
      title: `${prev.title.slice(0, 70)} (تابع)`,
      from: canonicalIds[cursor],
      to: canonicalIds[n - 1],
      kind: prev.kind,
      continues_previous: true,
      subheadings: [],
      sentence_ids: canonicalIds.slice(cursor, n),
    });
  }

  const moveRatio = totalBoundaries > 0 ? boundaryMoves / totalBoundaries : 1;
  if (moveRatio > 0.3) {
    return {
      repaired: false,
      reason: `TOO_MANY_BOUNDARY_MOVES:${Math.round(moveRatio * 100)}%`,
      moveRatio,
    };
  }

  // Sort and dedupe paragraph_breaks
  const breakSet = new Set();
  for (const br of Array.isArray(plan.paragraph_breaks) ? plan.paragraph_breaks : []) {
    const idx = indexById.get(String(br));
    if (idx != null) breakSet.add(idx);
  }
  const sortedBreaks = Array.from(breakSet)
    .sort((a, b) => a - b)
    .map((idx) => canonicalIds[idx]);

  // Sort, dedupe, and cap annotations to max 1 per 3 sentences
  const maxAnnotations = Math.max(1, Math.floor(n / 3));
  const seenAnn = new Set();
  const validAnns = [];
  for (const ann of Array.isArray(plan.annotations) ? plan.annotations : []) {
    if (!ann || typeof ann !== "object") continue;
    const idx = indexById.get(String(ann.id));
    if (idx == null || seenAnn.has(idx)) continue;
    if (!VALID_ANNOTATION_KIND_SET.has(ann.kind)) continue;
    seenAnn.add(idx);
    validAnns.push({
      idx,
      id: canonicalIds[idx],
      kind: ann.kind,
      ...(typeof ann.term === "string" && ann.term.trim()
        ? { term: ann.term.replace(/<[^>]*>/g, "").trim().slice(0, 60) }
        : {}),
    });
  }
  validAnns.sort((a, b) => a.idx - b.idx);
  const cappedAnns = validAnns.slice(0, maxAnnotations).map(({ idx: _i, ...rest }) => rest);

  // Repair offtopic
  const validOfftopic = [];
  for (const ot of Array.isArray(plan.offtopic) ? plan.offtopic : []) {
    const fIdx = indexById.get(String(ot?.from));
    const tIdx = indexById.get(String(ot?.to));
    if (fIdx == null || tIdx == null || tIdx < fIdx) continue;
    validOfftopic.push({
      from: canonicalIds[fIdx],
      to: canonicalIds[tIdx],
      kind: VALID_OFFTOPIC_KIND_SET.has(ot.kind) ? ot.kind : "other",
    });
  }

  // Repair terms
  const validTerms = [];
  for (const t of Array.isArray(plan.terms) ? plan.terms : []) {
    if (!t || typeof t.en !== "string" || !t.en.trim()) continue;
    const firstIdx = indexById.get(String(t.first_id)) ?? 0;
    validTerms.push({
      en: t.en.replace(/<[^>]*>/g, "").trim().slice(0, 80),
      ...(typeof t.ar_hint === "string" && t.ar_hint.trim()
        ? { ar_hint: t.ar_hint.replace(/<[^>]*>/g, "").trim().slice(0, 120) }
        : {}),
      first_id: canonicalIds[firstIdx],
    });
  }

  const candidate = {
    sections: fixedSections,
    paragraph_breaks: sortedBreaks,
    annotations: cappedAnns,
    offtopic: validOfftopic,
    terms: validTerms,
  };

  const recheck = validatePlan(candidate, windowSentences);
  if (!recheck.valid) {
    return { repaired: false, reason: recheck.errors.join(",") };
  }

  return {
    repaired: true,
    moveRatio,
    plan: recheck.normalizedPlan,
  };
}

export default {
  validatePlan,
  repairPlan,
};
