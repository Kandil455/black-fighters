/**
 * Template plan builder — the "extensible templates" requirement.
 *
 * The same components render every size of lecture; only density changes:
 *   compact  (<600 words)    one card, paragraphs, no TOC
 *   standard (<2,500)        3–4 cards + light TOC
 *   rich     (<8,000)        cards + TOC + per-section mini-summary
 *   deep     (≥8,000)        tabs + search + sticky TOC + reading progress
 *
 * Sections are merged/split to land between SECTIONS_MIN and SECTIONS_MAX so a
 * 12-word recording and a 4-hour recording both look intentional.
 */
import { LECTURE_CONFIG } from "./config.js";

export const DENSITIES = Object.freeze(["compact", "standard", "rich", "deep"]);

/** Visual style per DeepSeek kindHint. */
export const SECTION_STYLES = Object.freeze({
  concept: "concept",
  steps: "steps",
  compare: "compare",
  exam: "exam",
  example: "example",
  narration: "narration",
  fluff: "fluff",
});

export function pickDensity(wordCount) {
  const w = Math.max(0, Number(wordCount) || 0);
  if (w < LECTURE_CONFIG.DENSITY_COMPACT_MAX) return "compact";
  if (w < LECTURE_CONFIG.DENSITY_STANDARD_MAX) return "standard";
  if (w < LECTURE_CONFIG.DENSITY_RICH_MAX) return "rich";
  return "deep";
}

function targetSectionCount(wordCount) {
  const w = Math.max(0, Number(wordCount) || 0);
  const raw = Math.ceil(w / LECTURE_CONFIG.WORDS_PER_SECTION);
  return Math.max(LECTURE_CONFIG.SECTIONS_MIN, Math.min(LECTURE_CONFIG.SECTIONS_MAX, raw));
}

function mergeAdjacent(sections, max) {
  const out = [];
  for (const section of sections) {
    const last = out[out.length - 1];
    if (last && out.length >= max && section.kindHint === "narration" && last.kindHint !== "fluff") {
      last.sentence_ids = [...last.sentence_ids, ...section.sentence_ids];
      continue;
    }
    out.push({ ...section, sentence_ids: [...section.sentence_ids] });
  }
  // Still too many → merge the smallest adjacent pair until we fit.
  while (out.length > max) {
    let bestIdx = 0;
    let bestSize = Infinity;
    for (let i = 0; i < out.length - 1; i += 1) {
      const size = out[i].sentence_ids.length + out[i + 1].sentence_ids.length;
      if (size < bestSize) {
        bestSize = size;
        bestIdx = i;
      }
    }
    const merged = {
      title: out[bestIdx].title,
      kindHint: out[bestIdx].kindHint,
      importance: Math.max(out[bestIdx].importance || 1, out[bestIdx + 1].importance || 1),
      sentence_ids: [...out[bestIdx].sentence_ids, ...out[bestIdx + 1].sentence_ids],
    };
    out.splice(bestIdx, 2, merged);
  }
  return out;
}

function splitLargeSections(sections, min) {
  const out = [];
  for (const section of sections) {
    const ids = section.sentence_ids;
    if (out.length < min && ids.length > 12) {
      const half = Math.ceil(ids.length / 2);
      out.push({ ...section, sentence_ids: ids.slice(0, half) });
      out.push({
        ...section,
        title: `${section.title} (تكملة)`,
        sentence_ids: ids.slice(half),
      });
      continue;
    }
    out.push(section);
  }
  return out;
}

/**
 * @param {{word_count:number}} transcript
 * @param {{plan:{sections:Array,noise_sentence_ids?:number[],glossary?:Array}}} organization
 */
export function buildTemplatePlan(transcript, organization) {
  const density = pickDensity(transcript?.word_count);
  const rawSections = Array.isArray(organization?.plan?.sections)
    ? organization.plan.sections.filter((s) => Array.isArray(s.sentence_ids) && s.sentence_ids.length)
    : [];
  const target = targetSectionCount(transcript?.word_count);

  let sections = rawSections.map((s) => ({
    title: String(s.title || "بدون عنوان").trim(),
    kindHint: SECTION_STYLES[s.kindHint] ? s.kindHint : "concept",
    importance: Number(s.importance) || 1,
    sentence_ids: [...s.sentence_ids],
  }));

  sections = splitLargeSections(sections, target);
  sections = mergeAdjacent(sections, target);

  const glossary = Array.isArray(organization?.plan?.glossary)
    ? organization.plan.glossary.filter((g) => g?.term)
    : [];
  const noiseIds = Array.isArray(organization?.plan?.noise_sentence_ids)
    ? organization.plan.noise_sentence_ids
    : [];

  return {
    density,
    sections,
    glossary,
    noiseIds,
    hasGlossary: glossary.length > 0,
    hasNoise: noiseIds.length > 0,
    showToc: density === "standard" || density === "rich" || density === "deep",
    showSearch: density === "deep",
    showMiniSummaries: density === "rich" || density === "deep",
    showTabs: density === "deep",
    showReadingProgress: density === "deep",
    ...extraLayout(density),
  };
}

function extraLayout(density) {
  switch (density) {
    case "compact":
      return { showSectionNumbers: false, compact: true, showStickyToc: false };
    case "standard":
      return { showSectionNumbers: true, compact: false, showStickyToc: false };
    case "rich":
      return { showSectionNumbers: true, compact: false, showStickyToc: false };
    default:
      return { showSectionNumbers: true, compact: false, showStickyToc: true };
  }
}

/** Which sentence ids exist in the transcript (for validation). */
export function collectSentenceIds(transcript) {
  return new Set((transcript?.sentences || []).map((s) => Number(s.id)));
}

export default buildTemplatePlan;
