/**
 * src/features/lectures/text/terms.js — Distinct Latin term extractor (Section 10.6).
 *
 * Reuses `splitRuns` from `bidi.js` to collect distinct Latin phrases with frequencies
 * and first-occurrence sentence IDs for DeepSeek context and the glossary panel.
 */
import { splitRuns } from "./bidi.js";

const STOP_EN = new Set([
  "the", "and", "or", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of",
  "with", "by", "an", "a", "it", "this", "that", "from", "as", "be",
]);

/**
 * Extract distinct Latin terms/phrases from sentences with frequency and first_id.
 *
 * @param {Array<{id:string|number, text:string}>} sentences
 * @param {{ maxTerms?: number }} [opts]
 * @returns {Array<{ term: string, count: number, first_id: string }>}
 */
export function extractTermCandidates(sentences = [], { maxTerms = 100 } = {}) {
  const map = new Map();

  for (const s of Array.isArray(sentences) ? sentences : []) {
    const sid = String(s.id ?? "");
    const runs = splitRuns(s.text || "");
    for (const run of runs) {
      if (run.type !== "en") continue;
      // Strip outer parentheses and purely numeric units
      const cleaned = run.text
        .replace(/^\(+|\)+$/g, "")
        .trim();
      if (!cleaned || !/[A-Za-z\u0370-\u03FF]/.test(cleaned)) continue;
      if (cleaned.length < 2) continue;
      if (STOP_EN.has(cleaned.toLowerCase())) continue;

      const key = cleaned.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          term: cleaned,
          count: 1,
          first_id: sid,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, maxTerms);
}

export default extractTermCandidates;
