/**
 * richText.js — ONE emphasis engine for screen, HTML export and PDF.
 *
 * Replaces three divergent implementations:
 *   • SummaryView.FormattedInlineText (lead terms, (terms), ALL-CAPS, units)
 *   • summaryStudyGuide.inlineMarkup  (weaker, lost lead terms)
 *   • InfographicSummary.cleanText    (destroyed emphasis outright)
 *
 * Pipeline:  parseRich() → tokens → autoEmphasis() → toHtml() / <RichText/>
 *
 * Guarantees:
 *   • every leaf is escaped (no HTML injection from AI output)
 *   • mixed Arabic/English is wrapped in <bdi dir="auto"> so each run keeps its
 *     own direction (the owner's strict-bidi rule)
 *   • never wraps the same span twice
 */
import {
  ROLES, MARK_ALIASES, EXAM_WORDS_AR, EXAM_WORDS_EN, KEY_WORDS_AR, KEY_WORDS_EN, DENSITY_RULES,
} from "./colorTokens.js";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_CHAR = /[A-Za-z]/;

/** Combine Arabic + Latin in one string → needs bidi isolation. */
function needsBidi(value) {
  const text = String(value ?? "");
  return ARABIC_CHAR.test(text) && LATIN_CHAR.test(text);
}

/* ───────────────────────────── parsing ──────────────────────────────────── */

const MARKER_RE = /==([a-zA-Z]+):([^=]+)==|==([^=]+)==|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`/g;

/**
 * Split raw text into tokens.
 * A token = { text, role|null }. Unknown markers fall back to visible text
 * (never silently swallowed — that was the `purple:` bug).
 */
export function parseRich(raw) {
  const source = String(raw ?? "");
  if (!source) return [];

  // Accept already-structured input: [{text, annotations}] or [{text, role}]
  if (Array.isArray(raw)) return fromStructured(raw);

  const tokens = [];
  let last = 0;
  let match;
  MARKER_RE.lastIndex = 0;

  while ((match = MARKER_RE.exec(source)) !== null) {
    if (match.index > last) tokens.push({ text: source.slice(last, match.index), role: null });

    const [, colorName, colorBody, plainMark, boldBody, boldBody2, codeBody] = match;
    if (colorName) {
      const role = MARK_ALIASES[colorName.toLowerCase()] || "key";
      tokens.push({ text: colorBody, role });
    } else if (plainMark) {
      tokens.push({ text: plainMark, role: "key" });
    } else if (boldBody) {
      tokens.push({ text: boldBody, role: "term" });
    } else if (boldBody2) {
      tokens.push({ text: boldBody2, role: "term" });
    } else if (codeBody) {
      tokens.push({ text: codeBody, role: "code" });
    }
    last = match.index + match[0].length;
  }
  if (last < source.length) tokens.push({ text: source.slice(last), role: null });

  return tokens.filter((t) => t.text !== "");
}

function fromStructured(items) {
  const tokens = [];
  for (const item of items) {
    if (!item) continue;
    if (typeof item === "string") {
      tokens.push({ text: item, role: null });
      continue;
    }
    const annotations = Array.isArray(item.annotations) ? item.annotations : [];
    const role =
      annotations.find((a) => a?.role && ROLES[a.role])?.role ||
      (ROLES[item.role] ? item.role : null);
    tokens.push({ text: String(item.text ?? ""), role, explicit: Boolean(role) });
  }
  return tokens.filter((t) => t.text !== "");
}

/* ─────────────────────────── auto emphasis ──────────────────────────────── */

/**
 * Dose / number / threshold. Uses explicit character-class boundaries instead
 * of \b, because \b fails around "/" and would split "5 mg/kg" into "5 mg" + "/kg".
 */
const VALUE_RE = /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ml|mL|L|kg|g|mmHg|mmol|mEq|IU|units?|%|°C|hours?|days?|weeks?|cm|mm|bpm)(?:\s?\/\s?\d+(?:[.,]\d+)?)?(?:\s?\/\s?(?:kg|m2|m²|min|h|day|dose))?(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(?:GCS|pH|SpO2|BP|HR|RR|INR|eGFR|HbA1c)\s?[≤≥<>=]+\s?\d+(?:[.,]\d+)?(?:\s?\/\s?\d+(?:[.,]\d+)?)?/giu;

/** ALL-CAPS medical acronyms (2–6 letters) that read as terms. */
const ACRONYM_RE = /\b[A-Z]{2,6}(?:\d+)?\b/g;

/** Arabic/English exam trigger words. */
function examWordRe() {
  const ar = EXAM_WORDS_AR.join("|");
  const en = EXAM_WORDS_EN.join("|");
  return new RegExp(`(?:${ar}|\\b(?:${en})\\b)`, "i");
}

/** Emphasis words (أهم / لازم / يجب) → the yellow `key` role. */
function keyWordRe() {
  const ar = KEY_WORDS_AR.join("|");
  const en = KEY_WORDS_EN.join("|");
  return new RegExp(`(?:${ar}|\\b(?:${en})\\b)`, "i");
}

/**
 * Is this match a standalone word?
 * Arabic has no \b, so we check the neighbouring characters directly. Arabic
 * word chars include the definite-article prefixes (ال، و، ب، ل) — those are
 * different words, so a match glued to them is rejected.
 */
function isWholeWordAt(text, start, matched) {
  const WORD_CHAR = /[\p{L}\p{N}]/u;
  const before = text[start - 1];
  const after = text[start + matched.length];
  if (before && WORD_CHAR.test(before)) return false;
  if (after && WORD_CHAR.test(after)) return false;
  return true;
}

/**
 * Apply automatic emphasis to role-less tokens, mirroring the richest existing
 * engine (lead terms, parenthetical terms, ALL-CAPS, doses, exam words).
 *
 * @param {Array} tokens
 * @param {{lang?:string, density?:object, enabled?:boolean}} opts
 */
export function autoEmphasis(tokens, { lang = "ar", enabled = true } = {}) {
  if (!enabled) return tokens;
  const out = [];
  let boldCount = 0;

  for (const [index, token] of tokens.entries()) {
    if (token.role) {
      out.push(token);
      if (token.role === "key") token.autoHighlights = 0;
      continue;
    }

    // Lead term: "Term: rest of sentence" at the very start of a block.
    const isFirst = index === 0;
    const lead = isFirst ? matchLeadTerm(token.text, lang) : null;
    if (lead) {
      out.push({ text: lead.head, role: "term", auto: true });
      out.push(...splitInlineRoles(lead.rest, { boldCount: () => boldCount, bump: () => (boldCount += 1) }));
      continue;
    }

    out.push(...splitInlineRoles(token.text, { boldCount: () => boldCount, bump: () => (boldCount += 1) }));
  }

  return out;
}

function matchLeadTerm(text, lang) {
  const value = String(text || "");
  const patterns = lang === "ar"
    ? [
        /^([^:—\n]{2,78})(\s*[:—]\s*)([\s\S]+)$/,
        /^([^،\n]{4,68})(،\s+)([\s\S]+)$/,
      ]
    : [
        /^([^:—\n]{2,78})(\s*[:—]\s*)([\s\S]+)$/,
        /^([A-Z][A-Za-z0-9\s/-]{3,60})(,\s+)([\s\S]+)$/,
      ];
  for (const re of patterns) {
    const m = value.match(re);
    if (!m) continue;
    const head = m[1].trim();
    // A lead term is a TERM (1–3 words), not a heading that merely ends with a
    // colon. "الجرعة في حالات الأطفال" is a heading, not a term, so it is skipped.
    const wordCount = head.split(/\s+/).length;
    if (wordCount > 3) continue;
    return { head, rest: `${m[2]}${m[3]}` };
  }
  return null;
}

/** Split a plain chunk into value / acronym / exam-word roles. */
function splitInlineRoles(text, ctx) {
  const value = String(text ?? "");
  if (!value) return [];

  const ranges = [];
  const pushRanges = (re, role) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(value)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, role });
    }
  };

  pushRanges(new RegExp(VALUE_RE.source, VALUE_RE.flags), "value");
  pushRanges(new RegExp(ACRONYM_RE.source, "g"), "term");

  // Exam words: highlight the phrase, keep surrounding text plain.
  const exam = examWordRe();
  const excerpt = value.slice(0, 220);
  const examMatch = excerpt.match(exam);
  // Arabic words must match as WHOLE words: "فخ" inside "الفخذ" is not an exam
  // trap, and colouring it red made the page look broken.
  if (examMatch && examMatch.index != null && isWholeWordAt(excerpt, examMatch.index, examMatch[0])) {
    ranges.push({ start: examMatch.index, end: examMatch.index + examMatch[0].length, role: "danger" });
  }

  // Emphasis words get the yellow marker UNLESS a danger word already claimed
  // this span (text like "ممنوع" must stay red).
  const keyMatch = excerpt.match(keyWordRe());
  if (keyMatch && keyMatch.index != null && isWholeWordAt(excerpt, keyMatch.index, keyMatch[0])) {
    const start = keyMatch.index;
    const end = start + keyMatch[0].length;
    if (!ranges.some((range) => start < range.end && end > range.start)) {
      ranges.push({ start, end, role: "key" });
    }
  }

  if (ranges.length === 0) return [{ text: value, role: null }];

  // Resolve overlaps: first wins, later overlapping ranges are dropped.
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const picked = [];
  for (const range of ranges) {
    if (picked.some((p) => range.start < p.end && range.end > p.start)) continue;
    picked.push(range);
  }

  const tokens = [];
  let cursor = 0;
  for (const range of picked) {
    if (range.start > cursor) tokens.push({ text: value.slice(cursor, range.start), role: null });
    tokens.push({ text: value.slice(range.start, range.end), role: range.role, auto: true });
    cursor = range.end;
  }
  if (cursor < value.length) tokens.push({ text: value.slice(cursor), role: null });
  return tokens;
}

/**
 * Enforce density: a block may not glow everywhere.
 * Excess `key` roles degrade to plain text (bold survives, highlight drops).
 */
export function enforceDensity(tokens, { maxRatio = DENSITY_RULES.maxRatio, maxPerParagraph = DENSITY_RULES.maxPerParagraph } = {}) {
  const keyed = tokens.filter((t) => t.role === "key");
  if (keyed.length === 0) return tokens;

  // ONLY long spans make a page look "all yellow". A single emphasis word
  // ("أهم" in a short line) triggered the ratio rule before, so genuinely
  // important words were silently un-highlighted.
  const MIN_SIGNIFICANT_CHARS = 40;
  const longKeys = keyed.filter((t) => t.text.trim().length >= MIN_SIGNIFICANT_CHARS);
  if (longKeys.length === 0) return tokens;

  const total = tokens.reduce((sum, t) => sum + t.text.length, 0) || 1;
  const longChars = longKeys.reduce((sum, t) => sum + t.text.length, 0);
  const tooMuch = longKeys.length > maxPerParagraph || longChars / total > maxRatio;
  if (!tooMuch) return tokens;

  // Degrade the longest automatic highlights first; author-written ones last.
  // EXPLICIT FIRST: a highlight the author wrote outranks every automatic one,
  // even if it is longer. (The previous sort put explicit last, so the automatic
  // highlight won the "first survivor" slot and the author's was dropped.)
  const order = [...longKeys].sort((a, b) => {
    const aExplicit = a.explicit ?? !a.auto;
    const bExplicit = b.explicit ?? !b.auto;
    if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
    return b.text.length - a.text.length;
  });

  // Walk cheapest-first and KEEP while both budgets allow; once a token no
  // longer fits, everything after it is demoted (stable, predictable result).
  const demote = new Set();
  let keptLong = 0;
  let keptChars = 0;
  for (const token of order) {
    const explicit = token.explicit ?? !token.auto;
    const nextChars = keptChars + token.text.length;
    // Always allow the single most important highlight to survive: a guide with
    // zero emphasis reads as flat as one with too much.
    const isFirst = keptLong === 0;
    const fitsRatio = nextChars / total <= maxRatio;
    const fitsCount = keptLong < maxPerParagraph;
    if (isFirst || (fitsRatio && (explicit || fitsCount))) {
      keptLong += 1;
      keptChars = nextChars;
    } else {
      demote.add(token);
    }
  }

  return tokens.map((token) => (demote.has(token) ? { ...token, role: null } : token));
}

/* ──────────────────────────── HTML output ───────────────────────────────── */

function renderToken(token) {
  const text = String(token.text ?? "");
  if (!text) return "";
  const escaped = escapeHtml(text);
  const bidi = needsBidi(text);

  if (!token.role || !ROLES[token.role]) {
    return bidi ? `<bdi dir="auto">${escaped}</bdi>` : escaped;
  }
  const className = ROLES[token.role].className;
  const inner = bidi ? `<bdi dir="auto">${escaped}</bdi>` : escaped;
  return `<span class="${className}">${inner}</span>`;
}

/**
 * tokens → safe HTML.
 * @param {Array} tokens
 */
export function toHtml(tokens) {
  return (tokens || []).map(renderToken).join("");
}

/**
 * One call: raw text → emphasis HTML.
 * @param {string|Array} raw
 * @param {{lang?:string, auto?:boolean, density?:boolean}} opts
 */
export function richToHtml(raw, opts = {}) {
  const { lang = detectRichLang(raw), auto = true, density = true } = opts;
  let tokens = parseRich(raw);
  if (auto) tokens = autoEmphasis(tokens, { lang });
  if (density) tokens = enforceDensity(tokens);
  return toHtml(tokens);
}

/** Which language should lead-term rules use? */
export function detectRichLang(raw) {
  const text = Array.isArray(raw) ? raw.map((t) => t?.text ?? "").join(" ") : String(raw ?? "");
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin ? "ar" : "en";
}

/**
 * Plain text from tokens (for aria-labels, PDF titles, word counts).
 * Strips all emphasis — the reading text is unchanged.
 */
export function tokensToPlain(tokens) {
  return (tokens || []).map((t) => t.text).join("");
}

export default richToHtml;
