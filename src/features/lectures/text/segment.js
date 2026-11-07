/**
 * src/features/lectures/text/segment.js — Sentence segmentation, sequential IDs,
 * approximate timestamps (`tSec`), and 300-sentence pagination (Section 10.4).
 *
 * Rules (Section 10.4):
 *   • Split after `.`, `!`, `?`, `؟`, `…`, or newline.
 *   • Do NOT split inside decimals (`7.4`), numbered list markers (`1.`), or common
 *     abbreviations (`Dr.`, `e.g.`, `i.e.`, `vs.`, `mg.`, `approx.`, `Fig.`).
 *   • A unit longer than `SEGMENT_MAX_WORDS` (45) is split at the clause boundary
 *     nearest its middle, choosing among `،`, `,`, `;`, `؛`, or the connector words
 *     `ثم`, `لكن`, `يعني`, `عشان`, `علشان`, `بس`, `لأن`. If none exists, split at
 *     the word boundary nearest the middle.
 *   • A unit shorter than 3 words merges into the previous unit (when one exists).
 *   • IDs are sequential: `s000001`, `s000002` (and numeric `numId: 1, 2...`).
 *   • Approximate time `tSec` = chunk start + (character offset in chunk / chunk characters) * chunk duration,
 *     rounded to whole seconds.
 *   • Pages of 300 sentences are built for `sentencePages`.
 *   • Invariant: joining all sentence texts with single spaces equals the normalised text with whitespace collapsed.
 */
import { LECTURE_CONFIG } from "../config.js";
import { detectLanguage } from "../lib/segmentSentences.js";

export const PROTECTED_ABBREVIATIONS = Object.freeze([
  "dr.", "mr.", "mrs.", "ms.", "prof.", "st.", "vs.", "e.g.", "i.e.", "etc.",
  "fig.", "no.", "approx.", "mg.", "kg.", "ml.", "cm.", "mm.", "ca.", "cf.",
  "vol.", "pp.", "al.", "أ.د.", "د.", "أ.", "م.",
]);

const CONNECTOR_WORDS = new Set(["ثم", "لكن", "يعني", "عشان", "علشان", "بس", "لأن"]);

export function formatSentenceId(n) {
  return `s${String(n).padStart(6, "0")}`;
}

export function parseSentenceIdNumber(id) {
  if (typeof id === "number") return id;
  const m = String(id || "").match(/(\d+)/);
  return m ? Number(m[1]) : NaN;
}

function countWords(str) {
  return String(str || "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Split a unit longer than `maxWords` at the clause boundary nearest its middle.
 */
function splitLongUnitMiddle(unit, maxWords = LECTURE_CONFIG.SEGMENT_MAX_WORDS) {
  const words = unit.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [words.join(" ")];

  const mid = Math.floor(words.length / 2);
  const searchRadius = Math.max(4, Math.floor(words.length * 0.3));
  const minIdx = Math.max(2, mid - searchRadius);
  const maxIdx = Math.min(words.length - 2, mid + searchRadius);

  let bestCut = -1;
  let bestDist = Infinity;

  for (let i = minIdx; i <= maxIdx; i += 1) {
    const prevWord = words[i - 1];
    const currWord = words[i].replace(/^[،,;؛]+/, "");
    const isPunctAfterPrev = /[،,;؛:]$/.test(prevWord);
    const isConnectorBeforeCurr = CONNECTOR_WORDS.has(currWord);

    if (isPunctAfterPrev || isConnectorBeforeCurr) {
      const dist = Math.abs(i - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestCut = i;
      }
    }
  }

  const cut = bestCut !== -1 ? bestCut : mid;
  const left = words.slice(0, cut).join(" ");
  const right = words.slice(cut).join(" ");

  return [
    ...splitLongUnitMiddle(left, maxWords),
    ...splitLongUnitMiddle(right, maxWords),
  ];
}

/**
 * Segment text into sentence strings obeying Section 10.4 rules and preserving
 * the exact reconstruction invariant (`sentences.join(' ') === collapseWhitespace(text)`).
 */
export function segmentSentencesStrict(
  text,
  cfg = LECTURE_CONFIG,
) {
  const maxWords = Number(cfg?.SEGMENT_MAX_WORDS ?? LECTURE_CONFIG.SEGMENT_MAX_WORDS);
  const minWords = Number(cfg?.SEGMENT_MIN_WORDS ?? 3);

  const rawText = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!rawText) return [];

  // Shield decimals (7.4), numbered list markers (1. at start or after space/newline), and abbreviations
  const placeholders = [];
  const shield = (match) => {
    placeholders.push(match);
    return `\uE000${placeholders.length - 1}\uE000`;
  };

  let shielded = rawText
    // Multi-dot abbreviations like e.g., i.e., أ.د.
    .replace(/(?:e\.g\.|i\.e\.)/gi, shield)
    .replace(/(?:أ\.د\.)/g, shield)
    // Decimals like 7.4 or 0.005
    .replace(/\d+\.\d+/g, shield)
    // Numbered list markers like "1." or "12." followed by space
    .replace(/(^|\s)(\d+\.)(?=\s)/g, (_m, pre, marker) => `${pre}${shield(marker)}`)
    // Single-word abbreviations
    .replace(/(^|\s)([A-Za-z\u0600-\u06FF]{1,6}\.)(?=\s)/g, (full, pre, abbr) => {
      if (PROTECTED_ABBREVIATIONS.includes(abbr.toLowerCase())) {
        return `${pre}${shield(abbr)}`;
      }
      return full;
    });

  const unshield = (str) =>
    str.replace(/\uE000(\d+)\uE000/g, (_m, idx) => placeholders[Number(idx)] ?? "");

  // Split after sentence terminators (. ! ? ؟ …) or newlines
  const parts = shielded
    .split(/(?<=[.!?؟…])\s+|\n+/)
    .map((p) => unshield(p).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Split long units (> maxWords) at clause boundary nearest middle
  const splitUnits = [];
  for (const part of parts) {
    splitUnits.push(...splitLongUnitMiddle(part, maxWords));
  }

  // Merge units shorter than `minWords` (3 words) into the previous unit
  const merged = [];
  for (const unit of splitUnits) {
    const wc = countWords(unit);
    if (wc < minWords && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${unit}`.trim();
    } else {
      merged.push(unit);
    }
  }

  // If the first unit itself was < minWords and there is a second unit, merge it forward
  if (merged.length >= 2 && countWords(merged[0]) < minWords) {
    merged[1] = `${merged[0]} ${merged[1]}`.trim();
    merged.shift();
  }

  return merged;
}

/**
 * Segment merged chunks (including gap items) into numbered sentences with `s000001` IDs,
 * approximate timestamps (`tSec`), and 300-sentence pages (`sentencePages`).
 *
 * @param {Array<{kind:'text'|'gap', chunkIndex:number, startSec:number, endSec:number, text?:string, reason?:string}>} mergedItems
 * @param {object} [cfg]
 */
export function buildSentencePagesFromMerged(mergedItems = [], cfg = LECTURE_CONFIG) {
  const pageSize = Number(cfg?.SENTENCE_PAGE_SIZE ?? LECTURE_CONFIG.SENTENCE_PAGE_SIZE ?? 300);
  const allSentences = [];
  const gapItems = [];
  let seq = 0;

  for (const item of mergedItems) {
    if (item.kind === "gap") {
      const gapId = `gap_${String(gapItems.length + 1).padStart(3, "0")}`;
      const gapRecord = {
        id: gapId,
        kind: "gap",
        afterSentenceId: seq > 0 ? formatSentenceId(seq) : null,
        after_sentence: seq,
        chunkIndex: item.chunkIndex,
        startSec: Math.round(Number(item.startSec || 0)),
        endSec: Math.round(Number(item.endSec || 0)),
        reason: item.reason || "chunk_failed",
      };
      gapItems.push(gapRecord);
      continue;
    }

    const chunkText = String(item.text || "").trim();
    if (!chunkText) continue;

    const unitStrings = segmentSentencesStrict(chunkText, cfg);
    const totalChars = Math.max(1, chunkText.length);
    const chunkStart = Number(item.startSec || 0);
    const chunkDuration = Math.max(0, Number(item.endSec || chunkStart) - chunkStart);

    let charOffset = 0;
    for (const unit of unitStrings) {
      seq += 1;
      const tSec = Math.round(chunkStart + (charOffset / totalChars) * chunkDuration);
      charOffset += unit.length + 1;
      const sid = formatSentenceId(seq);
      allSentences.push({
        id: sid,
        numId: seq,
        text: unit,
        chunk: Number(item.chunkIndex || 0),
        start_chunk: Number(item.chunkIndex || 0),
        tSec,
        lang: detectLanguage(unit),
      });
    }
  }

  const pages = [];
  for (let i = 0; i < allSentences.length; i += pageSize) {
    const pageIndex = Math.floor(i / pageSize);
    pages.push({
      pageIndex,
      pageId: String(pageIndex).padStart(3, "0"),
      sentences: allSentences.slice(i, i + pageSize),
    });
  }

  const wordCount = allSentences.reduce((sum, s) => sum + countWords(s.text), 0);

  return {
    sentences: allSentences,
    sentencePages: pages,
    gaps: gapItems,
    sentenceCount: allSentences.length,
    wordCount,
  };
}

export default {
  PROTECTED_ABBREVIATIONS,
  formatSentenceId,
  parseSentenceIdNumber,
  segmentSentencesStrict,
  buildSentencePagesFromMerged,
};
