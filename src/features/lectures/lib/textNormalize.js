/**
 * Text normalisation helpers shared by the validator, dedupe and export.
 * Pure functions — no DOM, no node builtins.
 */

/** Arabic diacritics + tatweel. */
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Aggressive comparison key: strips diacritics, unifies alef/yaa/taa-marbuta,
 * lowercases Latin, collapses whitespace and punctuation.
 */
export function normalizeForCompare(text) {
  return String(text || "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Collapse whitespace only (keeps original wording/punctuation). */
export function collapseWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

/**
 * Fix spacing before Arabic punctuation and remove spaces inside Latin
 * acronyms that the model sometimes introduces ("A C L" → "ACL").
 */
export function tidyTranscript(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([،؛؟!.,:])/g, "$1")
    .replace(/([،؛؟!.,:])(?=[^\s\d])/g, "$1 ")
    .replace(/\b([A-Za-z])\s(?=[A-Za-z]\s[A-Za-z])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Remove the overlap between two consecutive chunk transcripts.
 * The recorder keeps CHUNK_OVERLAP_SEC of shared audio at the boundary, so the
 * tail of chunk N repeats the head of chunk N+1. We drop the repeated words
 * from the beginning of the next chunk instead of guessing timestamps.
 */
export function trimOverlap(previousText, nextText, { maxWords = 40 } = {}) {
  const prevWords = collapseWhitespace(previousText).split(" ").filter(Boolean);
  const nextWords = collapseWhitespace(nextText).split(" ").filter(Boolean);
  if (!prevWords.length || !nextWords.length) return collapseWhitespace(nextText);

  const limit = Math.min(maxWords, prevWords.length, nextWords.length);
  for (let size = limit; size >= 4; size -= 1) {
    const tail = prevWords.slice(-size).map(normalizeForCompare).join(" ");
    const head = nextWords.slice(0, size).map(normalizeForCompare).join(" ");
    if (tail && tail === head) {
      return nextWords.slice(size).join(" ");
    }
  }
  return nextWords.join(" ");
}

export default { normalizeForCompare, collapseWhitespace, tidyTranscript, trimOverlap };
