import {
  SEMANTIC_EMPHASIS,
  SUMMARY_COLOR_PROFILES,
  SUMMARY_SEMANTICS,
} from "./registry.js";

const ARABIC_CHAR = /[\u0600-\u06ff]/g;
const ENGLISH_CHAR = /[A-Za-z]/g;
const COLORS = "green|yellow|cyan|orange|red";
const VALID_COLORS = new Set(COLORS.split("|"));
const COLOR_TO_SEMANTIC = Object.freeze({
  red: "warning",
  orange: "example",
  green: "definition",
  yellow: "fact",
  cyan: "term",
});

function scriptCounts(value) {
  const text = String(value || "");
  return {
    arabic: (text.match(ARABIC_CHAR) || []).length,
    english: (text.match(ENGLISH_CHAR) || []).length,
  };
}

export function detectSummaryLanguage(value, { mixedThreshold = 0.22 } = {}) {
  const { arabic, english } = scriptCounts(value);
  const total = arabic + english;
  if (!total) return "neutral";
  const arabicRatio = arabic / total;
  if (arabicRatio >= 1 - mixedThreshold) return "ar";
  if (arabicRatio <= mixedThreshold) return "en";
  return "mixed";
}

export function detectSummaryDirection(value, options) {
  const language = detectSummaryLanguage(value, options);
  if (language === "ar") return "rtl";
  if (language === "en") return "ltr";
  return "auto";
}

export function segmentBidirectionalText(value) {
  const text = String(value || "");
  if (!text) return [];
  const segments = [];
  let buffer = "";
  let direction = "auto";

  const flush = () => {
    if (!buffer) return;
    segments.push({ text: buffer, direction });
    buffer = "";
  };

  for (const char of text) {
    const nextDirection = /[\u0600-\u06ff]/.test(char)
      ? "rtl"
      : /[A-Za-z]/.test(char)
        ? "ltr"
        : direction;
    if (buffer && nextDirection !== direction && nextDirection !== "auto") flush();
    if (!buffer && nextDirection !== "auto") direction = nextDirection;
    buffer += char;
  }
  flush();
  return segments;
}

function protectCode(value) {
  const tokens = [];
  const text = String(value || "").replace(/```[\s\S]*?```|`[^`\n]*`/g, (token) => {
    const placeholder = `\uE000${tokens.length}\uE001`;
    tokens.push(token);
    return placeholder;
  });
  return {
    text,
    restore(result) {
      return String(result).replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] || "");
    },
  };
}

export function normalizeLegacyHighlightMarkup(value, { strip = false } = {}) {
  if (typeof value !== "string" || !value) return value || "";
  const protectedValue = protectCode(value);
  let normalized = protectedValue.text
    .replace(new RegExp(`==\\s*([^=\\n]+?)\\s*==\\s*:\\s*(${COLORS})\\s*==?`, "gi"), "==$2:$1==")
    .replace(new RegExp(`==\\s*([^=\\n:]+?)\\s*:\\s*(${COLORS})\\s*==`, "gi"), "==$2:$1==")
    .replace(new RegExp(`==\\s*(${COLORS})\\s*==\\s*:\\s*([^=\\n]+?)\\s*==`, "gi"), "==$1:$2==")
    .replace(new RegExp(`==\\s*(${COLORS})\\s*:\\s*([^\\n]*?)\\s*==`, "gi"), (_, color, text) => `==${color.toLowerCase()}:${text.trim()}==`)
    .replace(new RegExp(`(^|[\\s،؛,.!?])\\s*:(${COLORS})==`, "gi"), "$1");

  if (strip) {
    normalized = normalized
      .replace(new RegExp(`==(${COLORS}):([^\\n]*?)==`, "gi"), "$2")
      .replace(/==([^\n]*?)==/g, "$1");
  }
  return protectedValue.restore(normalized);
}

export function stripLegacySummaryMarkup(value) {
  const normalized = normalizeLegacyHighlightMarkup(String(value || ""), { strip: true });
  return normalized
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1");
}

export function hasLegacyMarkupLeak(value) {
  const protectedValue = protectCode(String(value || ""));
  return /==(?:green|yellow|cyan|orange|red):|==[^\n]*?==|\*\*[^*\n]+\*\*/i.test(protectedValue.text);
}

export function inferSummarySemantic(value, fallbackColor = "") {
  const text = String(value || "");
  if (/warning|danger|contraindication|exception|error|تحذير|خطر|ممنوع|استثناء|خطأ/i.test(text)) return "warning";
  if (/(?:^|\s)[A-Za-z][A-Za-z0-9_()]*\s*=|[=±×÷∑√]|equation|formula|معادلة|قانون/i.test(text)) return "formula";
  if (/defined as|definition|means|refers to|تعريف|يعر[ّ]?ف|يُقصد|هو عبارة|هي عبارة/i.test(text)) return "definition";
  if (/result|conclusion|therefore|نتيجة|خلاصة|بالتالي|لذلك/i.test(text)) return "result";
  if (/example|case study|e\.g\.|مثال|حالة تطبيقية|على سبيل المثال/i.test(text)) return "example";
  if (/\b\d+(?:\.\d+)?%\b|statistic|rate|percentage|إحصاء|نسبة|معدل/i.test(text)) return "statistic";
  if (COLOR_TO_SEMANTIC[fallbackColor]) return COLOR_TO_SEMANTIC[fallbackColor];
  if (/[A-Za-z][A-Za-z0-9_-]{2,}|مصطلح|مفهوم|concept|term/i.test(text)) return "term";
  return "fact";
}

function normalizeAnnotation(annotation, textLength) {
  const start = Math.max(0, Math.min(textLength, Math.floor(Number(annotation?.start) || 0)));
  const end = Math.max(start, Math.min(textLength, Math.floor(Number(annotation?.end) || 0)));
  if (end <= start) return null;
  const semantic = SUMMARY_SEMANTICS.includes(annotation?.semantic)
    ? annotation.semantic
    : inferSummarySemantic("", VALID_COLORS.has(annotation?.color) ? annotation.color : "");
  const definition = SEMANTIC_EMPHASIS[semantic] || SEMANTIC_EMPHASIS.fact;
  return {
    start,
    end,
    semantic,
    importance: Math.max(0, Math.min(100, Number(annotation?.importance ?? definition.weight) || definition.weight)),
    bold: annotation?.bold === true,
    highlight: annotation?.highlight === true,
    color: VALID_COLORS.has(annotation?.color) ? annotation.color : definition.color,
    ...(annotation?.code === true ? { code: true } : {}),
    ...(annotation?.italic === true ? { italic: true } : {}),
  };
}

function mergeAnnotations(annotations, textLength) {
  const seen = new Set();
  return annotations
    .map((annotation) => normalizeAnnotation(annotation, textLength))
    .filter(Boolean)
    .filter((annotation) => {
      const key = `${annotation.start}:${annotation.end}:${annotation.semantic}:${annotation.bold}:${annotation.highlight}:${annotation.code || false}:${annotation.italic || false}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.start - right.start || right.end - left.end);
}

function findNextInlineToken(value) {
  const patterns = [
    { type: "code", regex: /`([^`\n]+)`/ },
    { type: "highlight", regex: new RegExp(`==(${COLORS}):([^\\n]*?)==`, "i") },
    { type: "plain_highlight", regex: /==([^\n]*?)==/ },
    { type: "bold", regex: /\*\*([^*\n]+)\*\*/ },
    { type: "bold", regex: /__([^_\n]+)__/ },
    { type: "italic", regex: /(?<!\*)\*([^*\n]+)\*(?!\*)/ },
  ];
  let result = null;
  for (const pattern of patterns) {
    const match = pattern.regex.exec(value);
    if (!match) continue;
    if (!result || match.index < result.match.index) result = { ...pattern, match };
  }
  return result;
}

export function parseLegacyRichText(value) {
  const source = normalizeLegacyHighlightMarkup(String(value || ""));
  let remaining = source;
  let text = "";
  const annotations = [];

  while (remaining) {
    const token = findNextInlineToken(remaining);
    if (!token) {
      text += remaining;
      break;
    }
    text += remaining.slice(0, token.match.index);
    const rawContent = token.type === "highlight" ? token.match[2] : token.match[1];
    const nested = token.type === "code"
      ? { text: rawContent, annotations: [] }
      : parseLegacyRichText(rawContent);
    const start = text.length;
    text += nested.text;
    const end = text.length;
    annotations.push(...nested.annotations.map((annotation) => ({
      ...annotation,
      start: annotation.start + start,
      end: annotation.end + start,
    })));

    if (end > start) {
      if (token.type === "highlight" || token.type === "plain_highlight") {
        const color = token.type === "highlight" ? token.match[1].toLowerCase() : "yellow";
        const semantic = inferSummarySemantic(nested.text, color);
        annotations.push({
          start,
          end,
          semantic,
          importance: SEMANTIC_EMPHASIS[semantic].weight,
          bold: true,
          highlight: true,
          color: SEMANTIC_EMPHASIS[semantic].color,
        });
      } else if (token.type === "bold") {
        const semantic = inferSummarySemantic(nested.text);
        annotations.push({ start, end, semantic, importance: SEMANTIC_EMPHASIS[semantic].weight, bold: true, highlight: false, color: SEMANTIC_EMPHASIS[semantic].color });
      } else if (token.type === "italic") {
        annotations.push({ start, end, semantic: "fact", importance: 25, bold: false, highlight: false, color: "yellow", italic: true });
      } else if (token.type === "code") {
        annotations.push({ start, end, semantic: "formula", importance: 95, bold: false, highlight: false, color: "cyan", code: true });
      }
    }
    remaining = remaining.slice(token.match.index + token.match[0].length);
  }

  return {
    text,
    language: detectSummaryLanguage(text),
    direction: detectSummaryDirection(text),
    annotations: mergeAnnotations(annotations, text.length),
  };
}

export function normalizeSummaryRichText(value) {
  if (typeof value === "string" || value == null) return parseLegacyRichText(value || "");
  const parsed = parseLegacyRichText(value.text || "");
  return {
    text: parsed.text,
    language: detectSummaryLanguage(parsed.text),
    direction: detectSummaryDirection(parsed.text),
    annotations: mergeAnnotations([...(parsed.annotations || []), ...(Array.isArray(value.annotations) ? value.annotations : [])], parsed.text.length),
  };
}

export function normalizeTechnicalRichText(value) {
  const text = typeof value === "string" || value == null ? String(value || "") : String(value.text || "");
  return {
    text,
    language: detectSummaryLanguage(text),
    direction: "ltr",
    annotations: text ? [{
      start: 0,
      end: text.length,
      semantic: "formula",
      importance: SEMANTIC_EMPHASIS.formula.weight,
      bold: false,
      highlight: false,
      color: null,
      code: true,
    }] : [],
  };
}

function richTextEntries(block) {
  const values = [];
  if (block?.content) values.push(block.content);
  if (Array.isArray(block?.items)) values.push(...block.items);
  if (block?.table) {
    values.push(...(block.table.headers || []));
    for (const row of block.table.rows || []) values.push(...row);
  }
  return values;
}

function annotationScore(annotation, richText, order) {
  const definition = SEMANTIC_EMPHASIS[annotation.semantic] || SEMANTIC_EMPHASIS.fact;
  const length = annotation.end - annotation.start;
  const explicitBonus = annotation.highlight ? 5 : 0;
  const conciseBonus = length <= 80 ? 3 : length > 180 ? -10 : 0;
  return (annotation.importance ?? definition.weight) + explicitBonus + conciseBonus - order / 100000;
}

export function applyDeterministicSectionEmphasis(section, colorLevel = "medium") {
  const profile = SUMMARY_COLOR_PROFILES[colorLevel];
  if (!profile) throw new Error(`UNKNOWN_SUMMARY_COLOR_LEVEL:${String(colorLevel)}`);
  const candidates = [];
  let order = 0;
  for (const block of section?.blocks || []) {
    for (const richText of richTextEntries(block)) {
      for (const annotation of richText.annotations || []) {
        if (!annotation.code && !(annotation.italic && !annotation.bold && !annotation.highlight) && annotation.end > annotation.start) {
          candidates.push({ annotation, richText, order, score: annotationScore(annotation, richText, order) });
        }
        order += 1;
      }
    }
  }

  const selected = new Set();
  const occupied = new Map();
  for (const candidate of candidates.sort((left, right) => right.score - left.score || left.order - right.order)) {
    if (selected.size >= profile.maxPerSection) break;
    const ranges = occupied.get(candidate.richText) || [];
    if (ranges.some(([start, end]) => candidate.annotation.start < end && candidate.annotation.end > start)) continue;
    selected.add(candidate.annotation);
    ranges.push([candidate.annotation.start, candidate.annotation.end]);
    occupied.set(candidate.richText, ranges);
  }

  for (const block of section?.blocks || []) {
    for (const richText of richTextEntries(block)) {
      richText.annotations = (richText.annotations || []).map((annotation) => {
        const definition = SEMANTIC_EMPHASIS[annotation.semantic] || SEMANTIC_EMPHASIS.fact;
        const highlight = profile.maxPerSection > 0 && selected.has(annotation);
        return {
          ...annotation,
          bold: annotation.bold || highlight,
          highlight,
          color: highlight ? definition.color : null,
        };
      });
    }
  }
  return section;
}

export function countSectionHighlights(section) {
  let count = 0;
  for (const block of section?.blocks || []) {
    for (const richText of richTextEntries(block)) {
      count += (richText.annotations || []).filter((annotation) => annotation.highlight).length;
    }
  }
  return count;
}

export function collectBlockRichText(block) {
  return richTextEntries(block);
}
