/**
 * src/features/lectures/text/bidi.js — Strict Bidi (Mixed Arabic & English) run splitter (Section 12.5).
 *
 * Exports:
 *   • `splitRuns(text)` -> Array<{ type: 'ar' | 'en', text: string }>
 *   • `renderBidiHtml(text)` -> HTML string wrapping `en` runs in `<bdi dir="ltr" class="en">`
 *
 * Definition of a Latin run (Section 12.5):
 *   A maximal span that starts and ends with a Latin letter, Greek letter, or a digit
 *   attached to a letter (or a balanced opening `(` before a Latin letter and closing `)`
 *   after a Latin/Greek letter or unit), and contains only Latin or Greek letters, digits,
 *   spaces between two Latin words/numbers, hyphens, slashes, apostrophes, periods between
 *   letters/digits, percent signs, plus signs, and balanced parentheses.
 *   Arabic punctuation (`،` `؛` `؟`) and Arabic words stay outside.
 */
import { escapeHtml } from "../lib/htmlEscape.js";

// Latin + Greek letters
const EN_LETTER_RE = /[A-Za-z\u0370-\u03FF]/;
const ARABIC_LETTER_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

/**
 * Find all non-overlapping maximal Latin runs in `text`.
 *
 * Required test strings from Section 12.5:
 *   1. الـ Myocardial infarction بيحصل لما...
 *   2. علاج MI بالـ aspirin 300 mg؛
 *   3. IL-6/TNF-α بيزيدوا؛
 *   4. الـ pH بتاع الدم 7.4 طبيعي؛
 *   5. (ECG) هو الأساس؛
 *   6. 5 mg/kg كل 8 ساعات.
 */
export function splitRuns(text) {
  const input = String(text ?? "");
  if (!input) return [];

  // If the entire string has no Latin/Greek letters at all, return a single 'ar' run
  if (!EN_LETTER_RE.test(input)) {
    return [{ type: "ar", text: input }];
  }

  // If the entire string has no Arabic letters and no Arabic punctuation, check if it's purely Latin
  if (!ARABIC_LETTER_RE.test(input) && !/[،؛؟]/.test(input)) {
    const trimmed = input.trim();
    if (trimmed && EN_LETTER_RE.test(trimmed)) {
      return [{ type: "en", text: input }];
    }
  }

  // Match candidate tokens that belong to the Latin/technical domain:
  //   - Balanced parens containing Latin/Greek letters: e.g. `(ECG)`, `(TNF-α)`
  //   - Digits followed by optional space and Latin unit/word: e.g. `300 mg`, `5 mg/kg`
  //   - Words containing Latin/Greek letters, digits, hyphens, slashes, periods, apostrophes, +, %:
  //     e.g. `Myocardial`, `infarction`, `IL-6/TNF-α`, `pH`, `7.4` (when attached or standalone technical)
  // Note: Arabic prefixes like `الـ` or `بالـ` are Arabic chars and never matched by `TOKEN_RE`.
  const TOKEN_RE =
    /\([A-Za-z\u0370-\u03FF][A-Za-z\u0370-\u03FF0-9\s/\-.+%']*\)|\d+\.\d+(?:\s+[A-Za-z\u0370-\u03FF][A-Za-z\u0370-\u03FF0-9/\-.+%']*)*|\d+(?:\s+[A-Za-z\u0370-\u03FF][A-Za-z\u0370-\u03FF0-9/\-.+%']*)+|[A-Za-z\u0370-\u03FF][A-Za-z\u0370-\u03FF0-9]*(?:[/-][A-Za-z\u0370-\u03FF0-9]+)*[%+]?/gu;

  const rawTokens = [];
  let m;
  while ((m = TOKEN_RE.exec(input)) !== null) {
    const val = m[0];
    const start = m.index;
    const end = start + val.length;
    const hasLetter = EN_LETTER_RE.test(val);
    const isDecimal = /^\d+\.\d+$/.test(val);
    // Keep tokens that contain a Latin/Greek letter, OR decimals like 7.4
    if (hasLetter || isDecimal) {
      rawTokens.push({ start, end, text: val, hasLetter });
    }
  }

  if (rawTokens.length === 0) {
    return [{ type: "ar", text: input }];
  }

  // Merge adjacent tokens separated only by spaces, hyphens, or slashes when both sides are part of a Latin phrase
  const mergedSpans = [];
  for (const tok of rawTokens) {
    const prev = mergedSpans[mergedSpans.length - 1];
    if (prev) {
      const between = input.slice(prev.end, tok.start);
      // Merge if separated only by spaces (and no Arabic letters/punctuation between)
      if (/^[ \t/\-]+$/.test(between) && (prev.hasLetter || tok.hasLetter)) {
        prev.end = tok.end;
        prev.text = input.slice(prev.start, prev.end);
        prev.hasLetter = prev.hasLetter || tok.hasLetter;
        continue;
      }
    }
    mergedSpans.push({ ...tok });
  }

  // Trim any trailing spaces/punctuation that shouldn't be at the boundary of a Latin run
  const cleanSpans = mergedSpans
    .map((span) => {
      let { start, end } = span;
      while (start < end && /\s/.test(input[start])) start += 1;
      while (end > start && /\s/.test(input[end - 1])) end -= 1;
      return { start, end, text: input.slice(start, end) };
    })
    .filter((s) => s.end > s.start);

  const runs = [];
  let cursor = 0;
  for (const span of cleanSpans) {
    if (span.start > cursor) {
      runs.push({ type: "ar", text: input.slice(cursor, span.start) });
    }
    runs.push({ type: "en", text: span.text });
    cursor = span.end;
  }
  if (cursor < input.length) {
    runs.push({ type: "ar", text: input.slice(cursor) });
  }

  return runs;
}

/**
 * Render mixed Arabic/English text into escaped HTML with `<bdi dir="ltr" class="en">` around Latin runs.
 */
export function renderBidiHtml(text) {
  const runs = splitRuns(text);
  return runs
    .map((run) =>
      run.type === "en"
        ? `<bdi dir="ltr" class="en" style="unicode-bidi:isolate">${escapeHtml(run.text)}</bdi>`
        : escapeHtml(run.text),
    )
    .join("");
}

export default { splitRuns, renderBidiHtml };
