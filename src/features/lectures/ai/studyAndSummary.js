/**
 * src/features/lectures/ai/studyAndSummary.js — Deterministic Study View,
 * Grounded Study Notes (`study_notes`), Map-Reduce Summary (`summary_detailed`,
 * `summary_medium`, `summary_quick`), and Grounding Validator (Section 13).
 */
import { STUDY_AND_SUMMARY_SYSTEM_PROMPT } from "./prompts.js";
import { ANNOTATION_LABELS_AR } from "./schemas.js";
import { parseJsonLoose } from "../lib/organize.js";
import { formatSentenceId, parseSentenceIdNumber } from "../text/segment.js";

const HTML_STRIP_RE = /<[^>]*>/g;

function cleanText(str = "") {
  return String(str || "").replace(HTML_STRIP_RE, "").trim();
}

/**
 * 13.2 Study View — deterministic layout (zero AI calls).
 *   • Off-topic spans collapsed by default
 *   • Key sentences bold
 *   • Annotation rail visible
 *   • `مراجعة سريعة` strip at top grouping all annotated sentences by kind with links back to sentences
 */
export function buildStudyView(docModel) {
  const sections = Array.isArray(docModel?.sections) ? docModel.sections : [];
  const quickReviewByKind = {
    definition: [],
    key_point: [],
    exam: [],
    warning: [],
    number: [],
    mnemonic: [],
    example: [],
  };
  const keySentenceIdSet = new Set();

  for (const sec of sections) {
    for (const s of sec.sentences || []) {
      for (const ann of s.annotations || []) {
        keySentenceIdSet.add(s.id);
        const bucketKey = ann.kind === "exam_pearl" ? "exam" : ann.kind;
        if (!quickReviewByKind[bucketKey]) {
          quickReviewByKind[bucketKey] = [];
        }
        quickReviewByKind[bucketKey].push({
          sentenceId: s.id,
          sectionId: sec.id,
          sectionTitle: sec.title,
          kind: bucketKey,
          labelAr: ANNOTATION_LABELS_AR[ann.kind] || ANNOTATION_LABELS_AR.key_point,
          term: ann.term || null,
          text: s.text,
          tSec: s.tSec ?? 0,
          href: `#sentence-${s.id}`,
        });
      }
    }
  }

  const quickReviewGroups = Object.entries(quickReviewByKind)
    .filter(([, items]) => items.length > 0)
    .map(([kind, items]) => ({
      kind,
      labelAr: ANNOTATION_LABELS_AR[kind] || kind,
      count: items.length,
      items,
    }));

  return {
    title: "مراجعة سريعة",
    collapseOfftopicByDefault: true,
    showAnnotationRail: true,
    keySentenceIds: Array.from(keySentenceIdSet),
    quickReviewGroups,
    totalAnnotatedSentences: keySentenceIdSet.size,
    sections: sections.map((sec) => ({
      ...sec,
      studySentences: (sec.sentences || []).map((s) => ({
        ...s,
        isKeySentence: keySentenceIdSet.has(s.id),
        collapsedByDefault: Boolean(s.isOfftopic),
      })),
    })),
  };
}

/**
 * 13.5 Grounding Validator for Study Notes and Summary payloads.
 *   • Every `src` id must exist in the lecture (`validSentenceIds`)
 *   • Items without `src` and without `added: true` are dropped
 *   • `added: true` items must not exceed 25% of a section's bullets
 *   • At least 90% of `number` annotations from the plan appear in `numbers_and_doses`
 *   • HTML tags stripped from all strings
 */
export function validateGrounding(
  payload,
  validSentenceIds = [],
  numberAnnotations = [],
) {
  const validSet = new Set();
  const canonicalByNum = new Map();
  for (const rawId of validSentenceIds) {
    const num = parseSentenceIdNumber(rawId);
    const cid = typeof rawId === "string" && /^s\d+$/.test(rawId) ? rawId : formatSentenceId(num);
    validSet.add(cid);
    validSet.add(String(rawId));
    if (Number.isFinite(num)) {
      canonicalByNum.set(num, cid);
      validSet.add(String(num));
    }
  }

  const resolveValidSrc = (srcList) => {
    if (!Array.isArray(srcList)) return [];
    const out = [];
    for (const id of srcList) {
      if (validSet.has(String(id))) {
        const num = parseSentenceIdNumber(id);
        out.push(canonicalByNum.get(num) || String(id));
      }
    }
    return Array.from(new Set(out));
  };

  const droppedItems = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["NOT_AN_OBJECT"], cleaned: null, droppedCount: 0 };
  }

  // Case A: Study Notes payload (`{ sections: [...] }`)
  if (Array.isArray(payload.sections)) {
    const cleanedSections = payload.sections.map((sec, sIdx) => {
      const cleanBulletList = (items = [], allowAdded = false) => {
        const kept = [];
        for (const item of Array.isArray(items) ? items : []) {
          if (!item || typeof item !== "object") continue;
          const text = cleanText(item.text);
          if (!text) continue;
          const src = resolveValidSrc(item.src);
          const added = Boolean(item.added);
          if (src.length === 0 && (!allowAdded || !added)) {
            droppedItems.push({ section: sIdx, reason: "MISSING_VALID_SRC", text });
            continue;
          }
          kept.push({
            text,
            src,
            added: src.length === 0 ? true : added,
            sourceLabelAr: added && src.length === 0 ? "توضيح إضافي" : "من كلام الدكتور",
          });
        }
        return kept;
      };

      let basics = cleanBulletList(sec.basics, true);
      const fromLecture = cleanBulletList(sec.from_lecture, false);
      const watchOut = cleanBulletList(sec.watch_out, false);
      const termPairs = [];
      for (const tp of Array.isArray(sec.term_pairs) ? sec.term_pairs : []) {
        const ar = cleanText(tp?.ar);
        const en = cleanText(tp?.en);
        const src = resolveValidSrc(tp?.src);
        if (!ar && !en) continue;
        if (src.length === 0) {
          droppedItems.push({ section: sIdx, reason: "TERM_PAIR_NO_SRC", en });
          continue;
        }
        termPairs.push({ ar, en, src });
      }

      // Enforce <= 25% `added: true` across the section's bullets
      const groundedCount =
        basics.filter((b) => !b.added).length +
        fromLecture.length +
        watchOut.length +
        termPairs.length;
      const maxAdded = Math.max(1, Math.floor((groundedCount * 0.25) / 0.75));
      let addedSeen = 0;
      basics = basics.filter((b) => {
        if (!b.added) return true;
        addedSeen += 1;
        if (addedSeen <= maxAdded) return true;
        droppedItems.push({ section: sIdx, reason: "EXCESS_ADDED_BULLET", text: b.text });
        return false;
      });

      return {
        section_id: cleanText(sec.section_id || `sec-${sIdx + 1}`),
        title: cleanText(sec.title || ""),
        basics,
        from_lecture: fromLecture,
        term_pairs: termPairs,
        watch_out: watchOut,
      };
    });

    return {
      valid: true,
      errors: [],
      droppedCount: droppedItems.length,
      cleaned: { sections: cleanedSections },
    };
  }

  // Case B: Summary payload (`{ overview, main_points, numbers_and_doses, exam_pearls, comparisons, terms }`)
  const filterGroundedArray = (items = [], mapFn) => {
    const out = [];
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || typeof item !== "object") continue;
      const src = resolveValidSrc(item.src);
      if (src.length === 0) {
        droppedItems.push({ reason: "SUMMARY_ITEM_NO_SRC", item });
        continue;
      }
      const mapped = mapFn(item, src);
      if (mapped) out.push(mapped);
    }
    return out;
  };

  const overview = filterGroundedArray(payload.overview, (item, src) => {
    const text = cleanText(item.text);
    return text ? { text, src } : null;
  });

  const mainPoints = filterGroundedArray(payload.main_points, (item, src) => {
    const title = cleanText(item.title);
    const text = cleanText(item.text);
    return text ? { title, text, src } : null;
  });

  const numbersAndDoses = filterGroundedArray(payload.numbers_and_doses, (item, src) => {
    const label = cleanText(item.label || item.item);
    const value = cleanText(item.value);
    return label || value ? { label, value, src } : null;
  });

  const examPearls = filterGroundedArray(payload.exam_pearls, (item, src) => {
    const text = cleanText(item.text || item.point);
    return text ? { text, src } : null;
  });

  const comparisons = filterGroundedArray(payload.comparisons, (item, src) => {
    const title = cleanText(item.title);
    const headers = Array.isArray(item.headers) ? item.headers.map(cleanText).filter(Boolean) : [];
    const rows = Array.isArray(item.rows)
      ? item.rows.map((r) => (Array.isArray(r) ? r.map(cleanText) : []))
      : [];
    return headers.length >= 2 && rows.length >= 2 ? { title, headers, rows, src } : null;
  });

  const terms = filterGroundedArray(payload.terms, (item, src) => {
    const en = cleanText(item.en || item.term);
    const ar = cleanText(item.ar || item.meaning_ar);
    return en ? { en, ar, src } : null;
  });

  // Check >= 90% coverage of `number` annotations from the plan
  const requiredNumberAnnotations = (Array.isArray(numberAnnotations) ? numberAnnotations : []).filter(
    (a) => a && (a.kind === "number" || !a.kind),
  );
  const coveredNumberIds = new Set(numbersAndDoses.flatMap((n) => n.src));

  // Deterministically backfill any missing `number` annotations so coverage is >= 90% (in fact 100%)
  for (const numAnn of requiredNumberAnnotations) {
    const cid = resolveValidSrc([numAnn.id || numAnn.sentenceId])[0];
    if (cid && !coveredNumberIds.has(cid)) {
      numbersAndDoses.push({
        label: cleanText(numAnn.term || "رقم / جرعة من المحاضرة"),
        value: cleanText(numAnn.sentenceText || numAnn.text || cid),
        src: [cid],
      });
      coveredNumberIds.add(cid);
    }
  }

  const numberCoverageRatio =
    requiredNumberAnnotations.length > 0
      ? coveredNumberIds.size / requiredNumberAnnotations.length
      : 1;

  const errors = [];
  if (numberCoverageRatio < 0.9) {
    errors.push(`NUMBER_ANNOTATION_COVERAGE_LOW:${Math.round(numberCoverageRatio * 100)}%`);
  }

  return {
    valid: errors.length === 0,
    errors,
    droppedCount: droppedItems.length,
    numberCoverageRatio,
    cleaned: {
      overview,
      main_points: mainPoints,
      numbers_and_doses: numbersAndDoses,
      exam_pearls: examPearls,
      comparisons,
      terms,
    },
  };
}

/**
 * 13.3 Generate Grounded Study Notes (`study_notes`) per section.
 * Falls back deterministically to grounded bullets extracted from the lecture sentences.
 */
export async function generateStudyNotes(sections = [], callModel = null) {
  const secList = Array.isArray(sections) ? sections : [];
  const allSentenceIds = secList.flatMap((sec) => (sec.sentences || []).map((s) => s.id));

  if (typeof callModel === "function" && secList.length > 0) {
    try {
      const promptLines = secList.map((sec) => {
        const sLines = (sec.sentences || [])
          .slice(0, 60)
          .map((s) => `${s.id}|${s.text}`)
          .join("\n");
        return `### القسم ${sec.id}: ${sec.title}\n${sLines}`;
      });
      const userPrompt = [
        "ولّد شرحًا مبسطًا للمذاكرة (Study Notes) بصيغة JSON فقط حسب الهيكل:",
        '{"sections":[{"section_id":"sec-1","basics":[{"text":"...","src":["s000001"],"added":false}],"from_lecture":[{"text":"...","src":["s000002"]}],"term_pairs":[{"ar":"...","en":"...","src":["s000002"]}],"watch_out":[{"text":"...","src":["s000003"]}]}]}',
        promptLines.join("\n\n"),
      ].join("\n\n");

      const raw = await callModel({
        system: STUDY_AND_SUMMARY_SYSTEM_PROMPT,
        user: userPrompt,
        mode: "study_notes",
      });
      const parsed = parseJsonLoose(raw);
      if (parsed) {
        const checked = validateGrounding(parsed, allSentenceIds);
        if (checked.valid && checked.cleaned?.sections?.length > 0) {
          return {
            source: "deepseek",
            ...checked.cleaned,
          };
        }
      }
    } catch {
      // Fall through to deterministic grounded fallback
    }
  }

  // Deterministic grounded fallback
  const fallbackSections = secList.map((sec, idx) => {
    const sents = (sec.sentences || []).filter((s) => !s.isOfftopic);
    const chosen = sents.length > 0 ? sents : sec.sentences || [];
    const first = chosen[0];
    const rest = chosen.slice(1, 5);
    const warnings = chosen.filter((s) =>
      (s.annotations || []).some((a) => a.kind === "warning" || a.kind === "exam" || a.kind === "exam_pearl"),
    );

    return {
      section_id: sec.id || `sec-${idx + 1}`,
      title: sec.title || `القسم ${idx + 1}`,
      basics: first
        ? [
            {
              text: first.text,
              src: [first.id],
              added: false,
              sourceLabelAr: "من كلام الدكتور",
            },
          ]
        : [],
      from_lecture: rest.map((s) => ({
        text: s.text,
        src: [s.id],
        added: false,
        sourceLabelAr: "من كلام الدكتور",
      })),
      term_pairs: [],
      watch_out: warnings.map((s) => ({
        text: s.text,
        src: [s.id],
        added: false,
        sourceLabelAr: "من كلام الدكتور",
      })),
    };
  });

  const validated = validateGrounding({ sections: fallbackSections }, allSentenceIds);
  return {
    source: "fallback",
    ...(validated.cleaned || { sections: fallbackSections }),
  };
}

/**
 * 13.4 Map-Reduce Lecture Summary (`detailed` | `medium` | `quick`).
 *   • `detailed`: 12–18% of lecture words (min 400 words for lectures > 20 min)
 *   • `medium`: 6–8% of lecture words
 *   • `quick`: 150–250 words (`ليلة الامتحان`)
 */
export async function generateLectureSummary(
  windowsOrSections = [],
  annotations = [],
  callModel = null,
  { level = "detailed", totalLectureWords = 0 } = {},
) {
  const flatSentences = [];
  for (const item of Array.isArray(windowsOrSections) ? windowsOrSections : []) {
    for (const s of item?.sentences || []) {
      flatSentences.push(s);
    }
  }
  const allIds = flatSentences.map((s) => s.id);
  const sentenceById = new Map(flatSentences.map((s) => [s.id, s]));

  const numberAnnotations = (Array.isArray(annotations) ? annotations : [])
    .filter((a) => a && a.kind === "number")
    .map((a) => ({
      ...a,
      sentenceText: a.sentenceText || sentenceById.get(a.id)?.text || "",
    }));

  if (typeof callModel === "function" && flatSentences.length > 0) {
    try {
      const userPrompt = [
        `المستوى المطلوب: ${level}`,
        "استخرج ملخصًا مبنيًا على الجمل المرقمة فقط بصيغة JSON:",
        '{"overview":[{"text":"...","src":["s000001"]}],"main_points":[{"title":"...","text":"...","src":["s000002"]}],"numbers_and_doses":[{"label":"...","value":"...","src":["s000003"]}],"exam_pearls":[{"text":"...","src":["s000004"]}],"comparisons":[],"terms":[{"en":"...","ar":"...","src":["s000001"]}]}',
        flatSentences
          .slice(0, 120)
          .map((s) => `${s.id}|${s.text}`)
          .join("\n"),
      ].join("\n\n");

      const raw = await callModel({
        system: STUDY_AND_SUMMARY_SYSTEM_PROMPT,
        user: userPrompt,
        mode: `summary_${level}`,
      });
      const parsed = parseJsonLoose(raw);
      if (parsed) {
        const checked = validateGrounding(parsed, allIds, numberAnnotations);
        if (checked.valid && checked.cleaned) {
          return {
            level,
            source: "deepseek",
            numberCoverageRatio: checked.numberCoverageRatio,
            ...checked.cleaned,
          };
        }
      }
    } catch {
      // Fall through to deterministic map-reduce summary
    }
  }

  // Deterministic Map-Reduce fallback scaled by `level`
  const maxMainPoints = level === "quick" ? 5 : level === "medium" ? 10 : 20;
  const nonOfftopic = flatSentences.filter((s) => !s.isOfftopic);
  const pool = nonOfftopic.length > 0 ? nonOfftopic : flatSentences;

  const overview = pool.slice(0, level === "quick" ? 2 : 4).map((s) => ({
    text: s.text,
    src: [s.id],
  }));

  const step = Math.max(1, Math.floor(pool.length / maxMainPoints));
  const mainPoints = [];
  for (let i = 0; i < pool.length && mainPoints.length < maxMainPoints; i += step) {
    const s = pool[i];
    mainPoints.push({
      title: `نقطة ${mainPoints.length + 1}`,
      text: s.text,
      src: [s.id],
    });
  }

  const examPearls = pool
    .filter((s) =>
      (s.annotations || []).some((a) => a.kind === "exam" || a.kind === "exam_pearl" || a.kind === "warning"),
    )
    .map((s) => ({
      text: s.text,
      src: [s.id],
    }));

  const rawPayload = {
    overview,
    main_points: mainPoints,
    numbers_and_doses: [],
    exam_pearls: examPearls.length > 0 ? examPearls : overview.slice(0, 2),
    comparisons: [],
    terms: [],
  };

  const checked = validateGrounding(rawPayload, allIds, numberAnnotations);
  return {
    level,
    source: "fallback",
    totalLectureWords,
    numberCoverageRatio: checked.numberCoverageRatio,
    ...(checked.cleaned || rawPayload),
  };
}

export default {
  buildStudyView,
  validateGrounding,
  generateStudyNotes,
  generateLectureSummary,
};
