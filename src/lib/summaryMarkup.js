const COLORS = "green|yellow|cyan|orange|red";
const HIGHLIGHT = new RegExp(`==(${COLORS}):([^=\\n]+)==`, "gi");
const COLOR_ORDER = ["cyan", "green", "yellow", "orange", "red"];

/**
 * Repairs common highlight variants emitted by language models, converts unicode
 * bullets to standard Markdown list items, fixes BiDi spacing around bilingual
 * sections, and breaks dense Arabic paragraphs into legible bullet points.
 */
export function normalizeSummaryMarkup(value) {
  if (typeof value !== "string" || !value) return value || "";

  let result = value
    .replace(new RegExp(`==\\s*([^=\\n]+?)\\s*==\\s*:\\s*(${COLORS})\\s*==?`, "gi"), "==$2:$1==")
    .replace(new RegExp(`==\\s*([^=\\n:]+?)\\s*:\\s*(${COLORS})\\s*==`, "gi"), "==$2:$1==")
    .replace(new RegExp(`==\\s*(${COLORS})\\s*==\\s*:\\s*([^=\\n]+?)\\s*==`, "gi"), "==$1:$2==")
    .replace(new RegExp(`(^|[\\s،؛,.!?])\\s*:(${COLORS})==`, "gi"), "$1")
    .replace(new RegExp(`==(${COLORS}):\\s*([^=]+?)\\s+==`, "gi"), "==$1:$2==");

  // 1. Convert unicode bullets (•, ·, ●, ▪, ▫) at line starts to standard Markdown list markers `- `
  result = result.replace(/^([ \t]*)[•·●▪▫]\s+/gm, "$1- ");

  // 2. Ensure blank line before lists when preceded by a regular text line
  result = result.replace(/([^\n#\-*+>|`~])\n([ \t]*[-*+]\s+)/g, "$1\n\n$2");

  // 3. Ensure **الشرح بالعربي:** has proper blank line spacing before and after
  result = result.replace(
    /\n*(\*\*\s*(?:الشرح بالعربي|الشرح العربي)\s*:?\s*\*\*|#{2,4}\s*(?:الشرح بالعربي|الشرح العربي)\s*:?)\n*/gi,
    "\n\n$1\n\n"
  );

  // 4. Break dense Arabic explanation blocks into structured bullet points if they were output as a solid paragraph
  result = result.replace(
    /(\*\*\s*(?:الشرح بالعربي|الشرح العربي)\s*:?\s*\*\*\n\n)([\s\S]+?)(?=(\n\n#{1,6}\s+|\n\n>|\n\n---|$))/gi,
    (match, header, body) => {
      const trimmedBody = body.trim();
      const lines = trimmedBody.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return match;

      // If already using markdown list markers or special block elements, keep as is
      const hasSpecial = lines.some((l) => /^[-*+>|`]|^\d+[.)]/.test(l));
      if (hasSpecial) {
        return `${header}${trimmedBody}\n\n`;
      }

      // Split into clean sentence-level bullet points
      const bullets = [];
      lines.forEach((line) => {
        const segments = line.split(/(?<=[.!?؛:])\s+/).map((s) => s.trim()).filter(Boolean);
        if (segments.length > 0) {
          bullets.push(...segments);
        } else if (line) {
          bullets.push(line);
        }
      });

      if (bullets.length > 1) {
        return `${header}${bullets.map((b) => `- ${b}`).join("\n")}\n\n`;
      }
      return `${header}- ${trimmedBody}\n\n`;
    }
  );

  return result.trim();
}

function semanticColor(text, fallbackIndex = 0) {
  const value = String(text || "");
  if (/تحذير|خطر|ممنوع|استثناء|خطأ|warning|danger|contraindication|exception/i.test(value)) return "red";
  if (/مثال|تطبيق|حالة|example|case|e\.g\.|\d+(?:\.\d+)?%/i.test(value)) return "orange";
  if (/تعريف|نتيجة|خلاصة|يعرف|defined|definition|result|conclusion/i.test(value)) return "green";
  if (/[A-Za-z]{3,}|مصطلح|مفهوم|concept|term/i.test(value)) return "cyan";
  return COLOR_ORDER[fallbackIndex % COLOR_ORDER.length];
}

function applySectionColorPolicy(section, colorLevel) {
  if (colorLevel === "none") return section.replace(HIGHLIGHT, "$2");
  const matches = [...section.matchAll(new RegExp(HIGHLIGHT.source, "gi"))];
  if (!matches.length) return section;

  const limit = colorLevel === "rich" ? 8 : 4;
  const originalColors = new Set(matches.map((match) => match[1].toLowerCase()));
  let kept = 0;
  return section.replace(new RegExp(HIGHLIGHT.source, "gi"), (match, color, text) => {
    if (kept >= limit) return text.trim();
    const outputIndex = kept;
    kept += 1;
    const balancedColor = originalColors.size === 1 && matches.length >= 3
      ? semanticColor(text, outputIndex)
      : color.toLowerCase();
    return `==${balancedColor}:${text.trim()}==`;
  });
}

/** Enforces the UI color choice even when a model ignores the requested limit. */
export function applySummaryColorPolicy(value, colorLevel = "medium") {
  const normalized = normalizeSummaryMarkup(value);
  if (!normalized) return "";
  const sections = normalized.split(/(?=^##\s+)/gm);
  return sections.map((section) => applySectionColorPolicy(section, colorLevel)).join("").trim();
}

/** Keeps the conclusion last when the coverage validator adds missing source facts. */
export function insertBeforeSummaryConclusion(summary, addition) {
  const value = String(summary || "").trim();
  const extra = String(addition || "").trim();
  if (!extra) return value;
  const conclusion = /^##\s+.*(?:summary conclusion|الخلاصة|الخاتمة).*$/im.exec(value);
  if (!conclusion) return `${value}\n\n${extra}`.trim();
  return `${value.slice(0, conclusion.index).trim()}\n\n${extra}\n\n${value.slice(conclusion.index).trim()}`.trim();
}
