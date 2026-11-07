/**
 * src/features/lectures/ui/buildDocModel.js — Pure document view-model builder (Section 12.2).
 *
 * `buildDocModel(sentencePages, plans, gaps)` produces `{ meta, toc, sections[] }`
 * with adaptive per-section density:
 *   • `< 60` words       -> `micro`: slim note card, no numbering, no sub-structure
 *   • `60..249` words    -> `compact`: heading + one paragraph group
 *   • `250..899` words   -> `standard`: heading, paragraphs (breaks from plan), key-points rail
 *   • `>= 900` words     -> `extended`: heading + subsections from plan (or every 600 words `الجزء 1 من N`),
 *                           first open, rest behind `اعرض الباقي` button.
 */
import { formatSentenceId, parseSentenceIdNumber } from "../text/segment.js";
import { splitRuns } from "../text/bidi.js";
import { buildFallbackPlan } from "../ai/fallbackPlan.js";
import { stitchWindowPlans } from "../ai/organize.js";
import { SECTION_KIND_LABELS_AR, ANNOTATION_LABELS_AR } from "../ai/schemas.js";
import {
  restoreEnglishMedicalTerms,
  extractMedicalLexiconFromSentences,
} from "../text/medicalTermRestorer.js";

function countWords(text = "") {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function classifySectionDensity(wordCount) {
  if (wordCount < 60) return "micro";
  if (wordCount < 250) return "compact";
  if (wordCount < 900) return "standard";
  return "extended";
}

function flattenSentencePages(sentencePages = []) {
  if (!Array.isArray(sentencePages)) return [];
  const flat = [];
  for (const item of sentencePages) {
    if (item && Array.isArray(item.sentences)) {
      for (const s of item.sentences) {
        flat.push(s);
      }
    } else if (item && typeof item === "object" && typeof item.text === "string") {
      flat.push(item);
    }
  }
  return flat.map((s, idx) => {
    const num = parseSentenceIdNumber(s.id ?? idx + 1);
    const id = typeof s.id === "string" && /^s\d+$/.test(s.id) ? s.id : formatSentenceId(num);
    const restoredText = restoreEnglishMedicalTerms(String(s.text || ""));
    return {
      ...s,
      id,
      num,
      chunk: s.chunk ?? s.chunkIndex ?? 0,
      tSec: Number.isFinite(s.tSec) ? s.tSec : Number.isFinite(s.approxStartSec) ? s.approxStartSec : 0,
      text: restoredText,
      runs: splitRuns(restoredText),
    };
  });
}

function normalizePlansInput(plans, flatSentences) {
  if (!plans) {
    return buildFallbackPlan(flatSentences);
  }
  if (Array.isArray(plans)) {
    const wrapped = plans.map((p, idx) => (p.plan ? p : { windowIndex: idx, plan: p, source: "deepseek" }));
    return stitchWindowPlans(wrapped);
  }
  if (plans.stitched) {
    return plans.stitched;
  }
  if (Array.isArray(plans.sections) && plans.sections.length > 0) {
    return plans;
  }
  return buildFallbackPlan(flatSentences);
}

function buildParagraphsForSentences(secSentences, breakSet) {
  if (secSentences.length === 0) return [];
  const paragraphs = [];
  let current = [];
  for (let i = 0; i < secSentences.length; i += 1) {
    const s = secSentences[i];
    if (current.length > 0 && breakSet.has(s.id)) {
      paragraphs.push({
        id: `p-${paragraphs.length + 1}-${current[0].id}`,
        fromId: current[0].id,
        toId: current[current.length - 1].id,
        sentences: current,
        text: current.map((x) => x.text).join(" "),
      });
      current = [];
    }
    current.push(s);
  }
  if (current.length > 0) {
    paragraphs.push({
      id: `p-${paragraphs.length + 1}-${current[0].id}`,
      fromId: current[0].id,
      toId: current[current.length - 1].id,
      sentences: current,
      text: current.map((x) => x.text).join(" "),
    });
  }
  return paragraphs;
}

function buildExtendedSubsections(secSentences, subheadings = [], breakSet = new Set()) {
  if (secSentences.length === 0) return [];
  const subMap = new Map();
  for (const sh of Array.isArray(subheadings) ? subheadings : []) {
    if (sh?.at && sh?.title) subMap.set(String(sh.at), sh.title);
  }

  // Group either at plan subheadings or every ~600 words
  const groups = [];
  let currentSentences = [];
  let currentTitle = null;
  let currentWords = 0;

  for (let i = 0; i < secSentences.length; i += 1) {
    const s = secSentences[i];
    const explicitTitle = subMap.get(s.id);
    if (currentSentences.length > 0 && (explicitTitle || currentWords >= 600)) {
      groups.push({
        title: currentTitle,
        sentences: currentSentences,
      });
      currentSentences = [];
      currentTitle = explicitTitle || null;
      currentWords = 0;
    } else if (currentSentences.length === 0 && explicitTitle) {
      currentTitle = explicitTitle;
    }
    currentSentences.push(s);
    currentWords += countWords(s.text);
  }
  if (currentSentences.length > 0) {
    groups.push({
      title: currentTitle,
      sentences: currentSentences,
    });
  }

  const total = groups.length;
  return groups.map((g, idx) => ({
    id: `sub-${idx + 1}-${g.sentences[0]?.id || idx}`,
    partIndex: idx + 1,
    totalParts: total,
    title: g.title || `الجزء ${idx + 1} من ${total}`,
    defaultExpanded: idx === 0,
    expandButtonLabel: "اعرض الباقي",
    wordCount: g.sentences.reduce((acc, s) => acc + countWords(s.text), 0),
    sentences: g.sentences,
    paragraphs: buildParagraphsForSentences(g.sentences, breakSet),
  }));
}

/**
 * Pure document builder (Section 12.2).
 *
 * @param {Array} sentencePages
 * @param {object|Array} plans
 * @param {Array} gaps
 * @param {object} [metaOptions]
 * @returns {{ meta: object, toc: Array, sections: Array, terms: Array, gaps: Array, annotations: Array }}
 */
export function buildDocModel(sentencePages = [], plans = null, gaps = [], metaOptions = {}) {
  const flatSentences = flattenSentencePages(sentencePages);
  const indexById = new Map();
  flatSentences.forEach((s, idx) => {
    indexById.set(s.id, idx);
    indexById.set(String(s.num), idx);
  });

  const normalizedPlan = normalizePlansInput(plans, flatSentences);
  const breakSet = new Set(
    (normalizedPlan.paragraph_breaks || []).map((id) => {
      const idx = indexById.get(String(id));
      return idx != null ? flatSentences[idx].id : String(id);
    }),
  );

  const annotationsBySentenceId = new Map();
  for (const ann of normalizedPlan.annotations || []) {
    const idx = indexById.get(String(ann?.id));
    if (idx == null) continue;
    const cid = flatSentences[idx].id;
    const list = annotationsBySentenceId.get(cid) || [];
    list.push({
      ...ann,
      id: cid,
      labelAr: ANNOTATION_LABELS_AR[ann.kind] || ANNOTATION_LABELS_AR.key_point,
    });
    annotationsBySentenceId.set(cid, list);
  }

  const offtopicBySentenceId = new Map();
  for (const ot of normalizedPlan.offtopic || []) {
    const fIdx = indexById.get(String(ot?.from));
    const tIdx = indexById.get(String(ot?.to));
    if (fIdx == null || tIdx == null || tIdx < fIdx) continue;
    for (let i = fIdx; i <= tIdx; i += 1) {
      offtopicBySentenceId.set(flatSentences[i].id, ot.kind || "other");
    }
  }

  // Ensure every sentence in flatSentences belongs to a section so zero words are ever lost
  const rawSections = Array.isArray(normalizedPlan.sections) && normalizedPlan.sections.length > 0
    ? normalizedPlan.sections
    : buildFallbackPlan(flatSentences).sections;

  const sections = [];
  let coveredUpTo = -1;
  let visibleSectionNumber = 0;

  for (let i = 0; i < rawSections.length; i += 1) {
    const rawSec = rawSections[i];
    const fromRaw = rawSec.from ?? rawSec.sentence_ids?.[0];
    const toRaw = rawSec.to ?? rawSec.sentence_ids?.[rawSec.sentence_ids.length - 1];

    let fromIdx = indexById.get(String(fromRaw));
    let toIdx = indexById.get(String(toRaw));

    if (fromIdx == null) fromIdx = coveredUpTo + 1;
    if (toIdx == null || toIdx < fromIdx) toIdx = fromIdx;
    if (fromIdx > coveredUpTo + 1) {
      fromIdx = coveredUpTo + 1;
    }
    if (i === rawSections.length - 1 && toIdx < flatSentences.length - 1) {
      toIdx = flatSentences.length - 1;
    }
    if (fromIdx >= flatSentences.length) continue;

    coveredUpTo = Math.max(coveredUpTo, toIdx);
    const secSentences = flatSentences.slice(fromIdx, toIdx + 1).map((s) => ({
      ...s,
      annotations: annotationsBySentenceId.get(s.id) || [],
      offtopicKind: offtopicBySentenceId.get(s.id) || null,
      isOfftopic: offtopicBySentenceId.has(s.id),
    }));

    const wordCount = secSentences.reduce((sum, s) => sum + countWords(s.text), 0);
    const density = classifySectionDensity(wordCount);
    const showNumber = density !== "micro";
    if (showNumber) visibleSectionNumber += 1;

    const kind = rawSec.kind || rawSec.kindHint || "concept";
    const paragraphs =
      density === "micro" || density === "compact"
        ? buildParagraphsForSentences(secSentences, new Set()) // Single paragraph group for micro/compact
        : buildParagraphsForSentences(secSentences, breakSet);

    const sectionAnnotations = secSentences.flatMap((s) =>
      (s.annotations || []).map((a) => ({
        ...a,
        sentenceId: s.id,
        sentenceText: s.text,
        tSec: s.tSec,
      })),
    );

    const keyPointsRail =
      density === "standard" || density === "extended"
        ? sectionAnnotations.filter((a) =>
            ["key_point", "definition", "exam", "exam_pearl", "warning", "number", "mnemonic"].includes(a.kind),
          )
        : [];

    const subsections =
      density === "extended"
        ? buildExtendedSubsections(secSentences, rawSec.subheadings, breakSet)
        : [];

    const approxStartSec = secSentences[0]?.tSec ?? 0;
    const approxEndSec = secSentences[secSentences.length - 1]?.tSec ?? approxStartSec;

    sections.push({
      id: rawSec.id || `sec-${i + 1}`,
      sectionIndex: i,
      sectionNumber: showNumber ? visibleSectionNumber : null,
      showNumber,
      title: rawSec.title || `الجزء ${i + 1}`,
      kind,
      kindLabelAr: SECTION_KIND_LABELS_AR[kind] || SECTION_KIND_LABELS_AR.concept,
      density,
      wordCount,
      from: secSentences[0]?.id || "s000001",
      to: secSentences[secSentences.length - 1]?.id || "s000001",
      approxStartSec,
      approxEndSec,
      sentences: secSentences,
      paragraphs,
      keyPointsRail,
      annotations: sectionAnnotations,
      subsections,
      isOfftopicOnly: secSentences.length > 0 && secSentences.every((s) => s.isOfftopic),
    });
  }

  // Catch any trailing uncovered sentences
  if (coveredUpTo < flatSentences.length - 1) {
    const rest = flatSentences.slice(coveredUpTo + 1);
    const wordCount = rest.reduce((sum, s) => sum + countWords(s.text), 0);
    const density = classifySectionDensity(wordCount);
    const showNumber = density !== "micro";
    if (showNumber) visibleSectionNumber += 1;
    sections.push({
      id: `sec-${sections.length + 1}`,
      sectionIndex: sections.length,
      sectionNumber: showNumber ? visibleSectionNumber : null,
      showNumber,
      title: `الجزء ${sections.length + 1}`,
      kind: "concept",
      kindLabelAr: SECTION_KIND_LABELS_AR.concept,
      density,
      wordCount,
      from: rest[0].id,
      to: rest[rest.length - 1].id,
      approxStartSec: rest[0]?.tSec ?? 0,
      approxEndSec: rest[rest.length - 1]?.tSec ?? 0,
      sentences: rest,
      paragraphs: buildParagraphsForSentences(rest, breakSet),
      keyPointsRail: [],
      annotations: [],
      subsections: density === "extended" ? buildExtendedSubsections(rest, [], breakSet) : [],
      isOfftopicOnly: false,
    });
  }

  const totalWords = sections.reduce((sum, sec) => sum + sec.wordCount, 0);
  const toc = sections
    .filter((sec) => sec.showNumber)
    .map((sec) => ({
      id: sec.id,
      sectionNumber: sec.sectionNumber,
      title: sec.title,
      kind: sec.kind,
      kindLabelAr: sec.kindLabelAr,
      density: sec.density,
      wordCount: sec.wordCount,
      from: sec.from,
      to: sec.to,
      approxStartSec: sec.approxStartSec,
    }));

  const normalizedGaps = (Array.isArray(gaps) ? gaps : []).map((g, idx) => ({
    id: g.id || `gap-${idx + 1}`,
    chunkIndex: g.chunkIndex ?? idx,
    fromSec: g.fromSec ?? g.startSec ?? 0,
    toSec: g.toSec ?? g.endSec ?? 0,
    reason: g.reason || "TRANSCRIBE_FAILED",
    labelAr:
      g.labelAr ||
      `مقطع غير مفرّغ من ${formatTimeMarker(g.fromSec ?? g.startSec ?? 0)} إلى ${formatTimeMarker(
        g.toSec ?? g.endSec ?? 0,
      )}`,
  }));

  return {
    meta: {
      title: metaOptions.title || "محاضرة بدون عنوان",
      subject: metaOptions.subject || "",
      lecturer: metaOptions.lecturer || "",
      date: metaOptions.date || "",
      durationSec: metaOptions.durationSec || 0,
      totalWords,
      totalSentences: flatSentences.length,
      totalSections: sections.length,
      hasGaps: normalizedGaps.length > 0,
      usedFallback: Boolean(normalizedPlan.usedFallback),
      lazySections: sections.length > 15,
    },
    toc,
    sections,
    terms: extractMedicalLexiconFromSentences(flatSentences, normalizedPlan.terms || []),
    annotations: sections.flatMap((s) => s.annotations),
    gaps: normalizedGaps,
  };
}

export function formatTimeMarker(sec = 0) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default {
  buildDocModel,
  classifySectionDensity,
  formatTimeMarker,
};
