/**
 * src/features/lectures/ai/fallbackPlan.js — Deterministic non-AI fallback plan (Section 11.6).
 *
 * Rules (Section 11.6):
 *   • Section break at each chunk boundary or about every 350 words at the nearest sentence end.
 *   • Titles are `الجزء N` with the approximate start time.
 *   • Paragraph break every 4 sentences.
 *   • No annotations and no off-topic.
 *   • Marks the window source as `fallback`.
 */
import { formatSentenceId, parseSentenceIdNumber } from "../text/segment.js";

function formatMmSs(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function normalizeId(rawId, indexFallback) {
  if (typeof rawId === "string" && /^s\d+$/.test(rawId)) return rawId;
  const num = parseSentenceIdNumber(rawId);
  return formatSentenceId(Number.isFinite(num) && num > 0 ? num : indexFallback);
}

/**
 * Build a deterministic fallback Plan for a window of sentences (always passes `validatePlan`).
 *
 * @param {Array<{id:string|number, text:string, chunk?:number, tSec?:number}>} windowSentences
 * @param {{ sectionStartNumber?: number, targetWordsPerSection?: number }} [opts]
 */
export function buildFallbackPlan(
  windowSentences = [],
  { sectionStartNumber = 1, targetWordsPerSection = 350 } = {},
) {
  const list = Array.isArray(windowSentences) ? windowSentences : [];
  if (list.length === 0) {
    return {
      sections: [],
      paragraph_breaks: [],
      annotations: [],
      offtopic: [],
      terms: [],
      source: "fallback",
    };
  }

  const sections = [];
  const paragraphBreaks = [];

  let groupStartIdx = 0;
  let wordsInGroup = 0;

  const flushSection = (endIdx) => {
    const slice = list.slice(groupStartIdx, endIdx + 1);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const fromId = normalizeId(first.id, groupStartIdx + 1);
    const toId = normalizeId(last.id, endIdx + 1);
    const secNum = sectionStartNumber + sections.length;
    const timeSuffix = first.tSec != null ? ` (~${formatMmSs(first.tSec)})` : "";

    sections.push({
      title: `الجزء ${secNum}${timeSuffix}`,
      from: fromId,
      to: toId,
      kind: "concept",
      sentence_ids: slice.map((s, idx) => s.id ?? normalizeId(s.id, groupStartIdx + idx + 1)),
    });
  };

  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    const wc = String(s.text || "").trim().split(/\s+/).filter(Boolean).length;
    wordsInGroup += wc;

    if (i > 0 && i % 4 === 0) {
      paragraphBreaks.push(normalizeId(s.id, i + 1));
    }

    const next = list[i + 1];
    const isLast = i === list.length - 1;
    const isChunkBoundary = next && s.chunk != null && next.chunk != null && next.chunk !== s.chunk;

    if (isLast || isChunkBoundary || wordsInGroup >= targetWordsPerSection) {
      flushSection(i);
      groupStartIdx = i + 1;
      wordsInGroup = 0;
    }
  }

  return {
    sections,
    paragraph_breaks: paragraphBreaks,
    annotations: [],
    offtopic: [],
    terms: [],
    source: "fallback",
  };
}

export default buildFallbackPlan;
