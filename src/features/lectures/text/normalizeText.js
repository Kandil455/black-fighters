/**
 * src/features/lectures/text/normalizeText.js — Pure text normalisation (Section 10.3).
 *
 * Rules:
 *   • Unicode NFC
 *   • Collapse repeated spaces
 *   • Remove BOM and stray control characters
 *   • Ensure a space follows sentence punctuation
 *   • Leave digits as returned (Western or Arabic-Indic)
 *   • Keep filler words and dialect spelling; never translate or transliterate.
 */
import {
  normalizeForCompare,
  collapseWhitespace,
  tidyTranscript,
  trimOverlap,
} from "../lib/textNormalize.js";

/**
 * Normalize transcript text without altering words, numbers, or dialect.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text) return "";
  return String(text)
    .normalize("NFC")
    // Strip BOM and control chars except newline and tab
    .replace(/[\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    // Collapse horizontal whitespace
    .replace(/[ \t]+/g, " ")
    // Remove space before sentence punctuation (except before opening parens)
    .replace(/\s+([،؛؟!.,:])/g, "$1")
    // Ensure a space follows sentence punctuation when not inside a decimal (7.4), multi-dot abbreviation (e.g., i.e.), or slash/colon
    .replace(/([،؛؟!.,:])(?=[^\s\d.,!?؟،؛)\]}'"])/g, (m, punct, offset, str) => {
      if (punct === ".") {
        const before = str.slice(Math.max(0, offset - 3), offset);
        const after = str.slice(offset + 1, offset + 4);
        if (/\b[eEiI]$/.test(before) && /^[gGeE]\./.test(after)) {
          return punct;
        }
      }
      return `${punct} `;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export { normalizeForCompare, collapseWhitespace, tidyTranscript, trimOverlap };
export default normalizeText;
