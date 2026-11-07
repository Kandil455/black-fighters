/**
 * Sentence segmentation + per-sentence language detection.
 *
 * The transcript is NEVER rewritten — this module only cuts a wall of text into
 * stable, numbered sentence units. Those ids are what DeepSeek later groups
 * (never re-words). Cutting rules:
 *   • split after . ! ? ؟ … and after Arabic full stop / newline
 *   • never split inside an abbreviation, decimal, or a Latin acronym
 *   • force a clause split at SEGMENT_MAX_WORDS words for run-on speech
 */
import { LECTURE_CONFIG } from "./config.js";

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
const LATIN_RE = /[A-Za-z]/g;

/** Abbreviations that must not terminate a sentence. */
const ABBREVIATIONS = new Set([
  "dr", "dr.", "mr", "mrs", "ms", "prof", "st", "vs", "e.g", "i.e", "etc",
  "fig", "no", "approx", "ca", "cf", "vol", "pp", "al", "d", "أ.د", "د.", "أ.", "م.",
]);

/** "ar" | "en" | "mixed" — decided by WORD counts, not letter counts.
 *  Word counts keep a single English acronym ("ACL", "MRI") inside an Arabic
 *  sentence from being misclassified as mixed-language. */
export function detectLanguage(text) {
  const value = String(text || "");
  const words = value.split(/\s+/).filter((w) => /[\p{L}]/u.test(w));
  if (words.length === 0) return "neutral";

  let arabicWords = 0;
  let latinWords = 0;
  for (const word of words) {
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(word);
    const hasLatin = /[A-Za-z]/.test(word);
    if (hasArabic && hasLatin) {
      arabicWords += 1; // transliterated token ("ACL-ي") counts as Arabic-led
    } else if (hasArabic) {
      arabicWords += 1;
    } else if (hasLatin) {
      latinWords += 1;
    }
  }

  if (arabicWords === 0 && latinWords === 0) return "neutral";
  if (arabicWords === 0) return "en";
  if (latinWords === 0) return "ar";

  // Mixed only when the minority language is a meaningful share of the words.
  const min = Math.min(arabicWords, latinWords);
  const max = Math.max(arabicWords, latinWords);
  if (min / max >= 0.34 && min >= 2) return "mixed";
  return arabicWords > latinWords ? "ar" : "en";
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

/** Split at the last clause boundary before `limit` words. */
function forceClauseSplit(sentence, limit) {
  const words = sentence.split(/\s+/);
  if (words.length <= limit) return [sentence];
  const head = words.slice(0, limit);
  // Prefer to break after a comma / connector when one exists in the tail half.
  const tailStart = Math.floor(limit * 0.55);
  const tail = head.slice(tailStart);
  const breakAt = tail.findLastIndex((w) => /[,،;؛:]$/.test(w));
  const cut = breakAt >= 0 ? tailStart + breakAt + 1 : limit;
  const first = words.slice(0, cut).join(" ").trim();
  const rest = words.slice(cut).join(" ").trim();
  if (!first || !rest) return [sentence];
  return [first, ...forceClauseSplit(rest, limit)];
}

/**
 * Cut text into sentence units.
 * @param {string} text
 * @returns {string[]} non-empty sentences, in original order
 */
export function segmentSentences(text, { maxWords = LECTURE_CONFIG.SEGMENT_MAX_WORDS } = {}) {
  const clean = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (!clean) return [];

  // Protect abbreviations and decimals with placeholders before splitting.
  const protect = [];
  const shielded = clean
    .replace(/\b\d+\.\d+\b/g, (m) => {
      protect.push(m);
      return `\u0000${protect.length - 1}\u0000`;
    })
    .replace(/\b([A-Za-z]{1,4})\.(?=\s)/g, (m, abbr) => {
      if (!ABBREVIATIONS.has(abbr.toLowerCase())) return m;
      protect.push(m);
      return `\u0000${protect.length - 1}\u0000`;
    });

  const restored = (value) =>
    value.replace(/\u0000(\d+)\u0000/g, (_m, i) => protect[Number(i)] ?? "");

  // Split on sentence terminators, keeping the terminator with its sentence.
  const raw = shielded
    .split(/(?<=[.!?؟…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];
  for (const piece of raw) {
    const restoredPiece = restored(piece).trim();
    if (!restoredPiece) continue;
    // Merge fragments that are clearly not sentences (e.g. "3." alone).
    if (out.length && wordCount(restoredPiece) <= 1 && !/[.!?؟…]$/.test(restoredPiece)) {
      out[out.length - 1] = `${out[out.length - 1]} ${restoredPiece}`.trim();
      continue;
    }
    for (const unit of splitScriptSwitches(restoredPiece)) {
      out.push(...forceClauseSplit(unit, maxWords));
    }
  }

  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * A professor switching language ("... محتاج MRI. The anterior cruciate...")
 * usually reads as two units even when the model emits no punctuation between
 * them. We split ONLY where the dominant script flips and the new script
 * sustains for minRunWords words — so an acronym or loanword inside a sentence
 * never causes a cut, and a long run in one language is never chopped up.
 */
function splitScriptSwitches(sentence, { minRunWords = 4 } = {}) {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < minRunWords * 2) return [sentence];

  const scriptOf = (word) => {
    const hasAr = /[\u0600-\u06FF]/.test(word);
    const hasEn = /[A-Za-z]/.test(word);
    if (hasAr) return "ar"; // Arabic wins for transliterated loanwords
    if (hasEn) return "en";
    return "neutral";
  };

  const labels = words.map(scriptOf);

  // The sentence OPENS in some script; a sustained switch away from it is the
  // boundary. Using the opening script (not the word-count majority) handles
  // "... عملية The anterior cruciate ligament is torn and needs an MRI." where
  // the English tail is numerically longer than the Arabic head.
  const firstScript = labels.find((l) => l !== "neutral");
  if (!firstScript) return [sentence];
  const home = firstScript;
  const other = home === "ar" ? "en" : "ar";

  // Find ONE boundary: the first sustained run of the other script, provided
  // the sentence does not return to the home script afterwards for a long run.
  let run = 0;
  let runStart = -1;
  let boundary = -1;
  for (let i = 0; i < labels.length; i += 1) {
    if (labels[i] === other) {
      if (run === 0) runStart = i;
      run += 1;
      if (run >= minRunWords && i === labels.length - 1) {
        boundary = runStart;
        break;
      }
    } else if (labels[i] === home) {
      if (run >= minRunWords) {
        boundary = runStart;
        break;
      }
      run = 0;
      runStart = -1;
    }
  }
  // A run that reaches the end of the sentence also ends it.
  if (boundary === -1 && run >= minRunWords) boundary = runStart;

  if (boundary <= 0) return [sentence];

  const head = words.slice(0, boundary).join(" ").trim();
  const tail = words.slice(boundary).join(" ").trim();
  if (!head || !tail) return [sentence];
  return [head, ...splitScriptSwitches(tail, { minRunWords })];
}

/**
 * Build the numbered transcript record.
 * @param {string} text full joined transcript
 * @param {{ chunkIndex?: number }} opts
 */
export function buildTranscript(text, { chunkIndex = 0 } = {}) {
  const sentences = segmentSentences(text).map((value, index) => ({
    id: index + 1,
    text: value,
    lang: detectLanguage(value),
    start_chunk: chunkIndex,
  }));
  return {
    sentences,
    sentence_count: sentences.length,
    word_count: wordCount(text),
  };
}

export { wordCount, ARABIC_RE, LATIN_RE };
