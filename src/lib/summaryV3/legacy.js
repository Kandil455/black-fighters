import { normalizeSummaryDocument } from "./document.js";
import { detectSummaryLanguage, normalizeSummaryRichText } from "./text.js";
import { normalizeSummaryMarkup } from "../summaryMarkup.js";

const OVERVIEW_HEADING = /quick overview|overview|نظرة سريعة|ملخص سريع/i;
const CONCLUSION_HEADING = /summary conclusion|conclusion|الخلاصة|الخاتمة/i;
const ARABIC_EXPLANATION = /^\*\*\s*(?:الشرح بالعربي|الشرح العربي)\s*:?\s*\*\*\s*:?$/i;
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)\|?\s*$/;
const MARKDOWN_IMAGE = /^!\[([^\]]*)\]\((https:\/\/\S+?)(?:\s+\"([^\"]*)\")?\)$/i;

function splitTableRow(line) {
  return String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function rawBlock(type, role, content, extra = {}) {
  return {
    type,
    role,
    ...(content == null ? {} : { content }),
    sourceRefs: [],
    ...extra,
  };
}

function isListLine(line) {
  return /^(\s*)([-+*•]|\d+[.)])\s+(.+)$/.exec(line);
}

export function migrateLegacySummaryMarkdown(markdown, options = {}) {
  const normalized = normalizeSummaryMarkup(String(markdown || "").replace(/\r\n/g, "\n"));
  const source = normalized.trim();
  const lines = source.split("\n");
  let title = options.title || "Summary";
  let target = "overview";
  let role = "body";
  let currentSection = null;
  const overview = [];
  const conclusion = [];
  const sections = [];
  let paragraph = [];

  const currentBlocks = () => {
    if (target === "overview") return overview;
    if (target === "conclusion") return conclusion;
    if (!currentSection) {
      currentSection = { title: "Content", blocks: [], sourceRefs: [] };
      sections.push(currentSection);
    }
    return currentSection.blocks;
  };

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (!text) return;
    const language = detectSummaryLanguage(text);
    const inferredRole = role === "body" && options.languageMode === "bilingual" && language === "en"
      ? "english_points"
      : role;
    currentBlocks().push(rawBlock("paragraph", inferredRole, text));
  };

  const startSection = (heading) => {
    flushParagraph();
    role = "body";
    if (OVERVIEW_HEADING.test(heading)) {
      target = "overview";
      currentSection = null;
      return;
    }
    if (CONCLUSION_HEADING.test(heading)) {
      target = "conclusion";
      currentSection = null;
      return;
    }
    target = "section";
    currentSection = { title: heading, blocks: [], sourceRefs: [] };
    sections.push(currentSection);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      const code = [];
      const languageHint = trimmed.slice(3).trim();
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      const codeText = code.join("\n");
      const blockType = /[=±×÷∑√]|equation|formula|معادلة/i.test(`${languageHint} ${codeText}`) ? "equation" : "code";
      currentBlocks().push(rawBlock(blockType, blockType === "equation" ? "formula" : role, codeText));
      continue;
    }

    const h1 = /^#\s+(.+)$/.exec(trimmed);
    if (h1) {
      flushParagraph();
      title = h1[1].trim();
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(trimmed);
    if (h2) {
      startSection(h2[1].trim());
      continue;
    }
    const h3 = /^#{3,6}\s+(.+)$/.exec(trimmed);
    if (h3) {
      flushParagraph();
      currentBlocks().push(rawBlock("heading", role, h3[1].trim()));
      continue;
    }
    if (ARABIC_EXPLANATION.test(trimmed)) {
      flushParagraph();
      role = "arabic_explanation";
      continue;
    }

    const image = MARKDOWN_IMAGE.exec(trimmed);
    if (image) {
      flushParagraph();
      const creditLine = /^>\s*Image credit:\s*(.+)$/i.exec(String(lines[index + 1] || "").trim());
      const credit = creditLine ? creditLine[1].split("|").map((value) => value.trim()) : [];
      if (creditLine) index += 1;
      currentBlocks().push(rawBlock("image", "example", image[3] || image[1] || "Educational image", {
        src: image[2],
        alt: image[1] || image[3] || "Educational image",
        attribution: {
          creator: credit[0] || "Unknown",
          license: credit[1] || "",
          sourcePage: credit[2] || "",
          licenseUrl: credit[3] || "",
          provider: credit[4] || "",
          approved: credit[5] === "approved",
        },
      }));
      continue;
    }

    if (trimmed.includes("|") && TABLE_SEPARATOR.test(lines[index + 1] || "")) {
      flushParagraph();
      const headers = splitTableRow(trimmed);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      currentBlocks().push(rawBlock("table", role, null, {
        table: {
          headers: headers.map(normalizeSummaryRichText),
          rows: rows.map((row) => row.map(normalizeSummaryRichText)),
        },
      }));
      continue;
    }

    const list = isListLine(rawLine);
    if (list) {
      flushParagraph();
      const ordered = /^\d/.test(list[2]);
      const type = ordered ? "ordered_list" : "bullet_list";
      const items = [list[3].trim()];
      while (index + 1 < lines.length) {
        const next = isListLine(lines[index + 1]);
        if (!next || /^\d/.test(next[2]) !== ordered) break;
        items.push(next[3].trim());
        index += 1;
      }
      const listLanguage = detectSummaryLanguage(items.join(" "));
      const listRole = role === "body" && listLanguage === "en" ? "english_points" : role;
      currentBlocks().push(rawBlock(type, listRole, null, { items }));
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      currentBlocks().push(rawBlock("quote", role, trimmed.replace(/^>\s?/, "")));
      continue;
    }
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushParagraph();
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();

  if (!sections.length && overview.length) {
    sections.push({ title: options.fallbackSectionTitle || "Content", blocks: overview.splice(0), sourceRefs: [] });
  }
  const detected = detectSummaryLanguage(source);
  const languageMode = options.languageMode || (detected === "ar" ? "ar" : detected === "en" ? "en" : "bilingual");
  const templateId = options.templateId || (languageMode === "bilingual" ? "bilingual_lecture" : "complete_study_guide");
  if (templateId === "bilingual_lecture" && languageMode === "bilingual") {
    for (const section of sections) {
      let foundEnglishPoints = false;
      for (const block of section.blocks || []) {
        if (block.role === "english_points") foundEnglishPoints = true;
        if (block.role !== "body") continue;
        const rawText = [
          typeof block.content === "string" ? block.content : block.content?.text,
          ...(block.items || []).map((item) => typeof item === "string" ? item : item?.text),
        ].filter(Boolean).join(" ");
        const blockLanguage = detectSummaryLanguage(rawText);
        if (blockLanguage === "en") {
          block.role = "english_points";
          foundEnglishPoints = true;
        } else if (blockLanguage === "ar" && foundEnglishPoints) {
          block.role = "arabic_explanation";
        }
      }
    }
  }
  return normalizeSummaryDocument({
    schemaVersion: 1,
    templateId,
    languageMode,
    colorLevel: options.colorLevel || "medium",
    title,
    overview,
    sections,
    conclusion,
    metadata: {
      ...(options.metadata && typeof options.metadata === "object" ? options.metadata : {}),
      migratedFrom: options.migratedFrom || "legacy_markdown",
      legacyLength: source.length,
    },
  }, options);
}

export const migrateLegacySummary = migrateLegacySummaryMarkdown;
