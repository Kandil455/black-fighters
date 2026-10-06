import {
  getSummaryDocumentText as getV3DocumentText,
  isSummaryV3Document,
  summaryDocumentToMarkdown as renderV3DocumentMarkdown,
} from "./summaryV3/index.js";

const ARABIC_CHAR = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const LATIN_CHAR = /[A-Za-z]/;

function asText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export function stripSummaryMarkup(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/==(?:green|yellow|cyan|orange|red):([^=]+)==/gi, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/^[#>*+-]+\s*/gm, "")
    .replace(/[`_*~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve the base direction for one independent block, never for the page. */
export function detectTextDirection(value, fallback = "rtl") {
  const text = stripSummaryMarkup(asText(value));
  for (const character of text) {
    if (ARABIC_CHAR.test(character)) return "rtl";
    if (LATIN_CHAR.test(character)) return "ltr";
  }
  return fallback;
}

export function getSummaryDocumentV3(summary) {
  if (!summary || typeof summary !== "object") return null;
  const candidates = [
    summary.summary_document_v3,
    summary.summaryDocumentV3,
    summary.document_v3,
    summary.documentV3,
    summary.document,
  ];
  if (Array.isArray(summary.blocks)) candidates.push(summary);
  return candidates.find((candidate) => candidate && (
    Array.isArray(candidate.blocks)
    || isSummaryV3Document(candidate)
    || (Number(candidate.schemaVersion) === 3 && Array.isArray(candidate.sections))
  )) || null;
}

export function getLegacySummaryMarkdown(summary) {
  if (typeof summary === "string") return summary;
  if (!summary || typeof summary !== "object") return "";
  const candidates = [
    summary.edited_summary_markdown,
    summary.summary_markdown,
    summary.markdown,
    summary.text,
    getSummaryDocumentV3(summary)?.source_markdown,
    getSummaryDocumentV3(summary)?.markdown,
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim()) || "";
}

export function getLegacySummaryHtml(summary) {
  if (!summary || typeof summary !== "object") return "";
  return typeof summary.summary_html === "string" ? summary.summary_html : "";
}

function inlineRunsToMarkdown(runs) {
  if (!Array.isArray(runs)) return "";
  return runs.map((run) => {
    if (typeof run === "string") return run;
    if (!run || typeof run !== "object") return "";
    let text = asText(run.text ?? run.content ?? run.value);
    if (run.code) text = `\`${text}\``;
    if (run.bold || run.strong) text = `**${text}**`;
    if (run.italic || run.emphasis) text = `*${text}*`;
    if (run.highlight) {
      const color = typeof run.highlight === "string" ? run.highlight : (run.color || "yellow");
      text = `==${color}:${text}==`;
    }
    if (run.href || run.url) text = `[${text}](${run.href || run.url})`;
    return text;
  }).join("");
}

function richTextValue(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.runs)) return inlineRunsToMarkdown(value.runs);
  return "";
}

export function summaryBlockText(block) {
  if (typeof block === "string") return block;
  if (!block || typeof block !== "object") return "";
  if (Array.isArray(block.runs)) return inlineRunsToMarkdown(block.runs);
  return richTextValue(block.text ?? block.content ?? block.body ?? block.value ?? block.markdown ?? block.title);
}

function listItems(block) {
  const items = block.items || block.children || [];
  return Array.isArray(items) ? items : [];
}

export function normalizeSummaryBlockType(block) {
  const raw = String(block?.type || block?.kind || "paragraph").toLowerCase().replace(/[-\s]/g, "_");
  if (/^h[1-6]$/.test(raw)) return "heading";
  if (["bullets", "bullet_list", "ordered_list", "unordered_list"].includes(raw)) return "list";
  if (["blockquote", "note", "warning", "tip"].includes(raw)) return "callout";
  if (["formula", "equation"].includes(raw)) return "code";
  if (["hr", "separator"].includes(raw)) return "divider";
  return raw;
}

function tableToMarkdown(block) {
  const table = block.table && typeof block.table === "object" ? block.table : block;
  const headers = Array.isArray(table.headers) ? table.headers : (Array.isArray(table.columns) ? table.columns : []);
  const rows = Array.isArray(table.rows) ? table.rows : [];
  if (!headers.length && !rows.length) return "";
  const width = Math.max(headers.length, ...rows.map((row) => Array.isArray(row) ? row.length : 0), 1);
  const normalizedHeaders = Array.from({ length: width }, (_, index) => summaryBlockText(headers[index]) || `Column ${index + 1}`);
  const line = (cells) => `| ${Array.from({ length: width }, (_, index) => summaryBlockText(cells?.[index])).join(" | ")} |`;
  return [line(normalizedHeaders), `| ${Array.from({ length: width }, () => "---").join(" | ")} |`, ...rows.map(line)].join("\n");
}

export function summaryBlockToMarkdown(block, depth = 0) {
  if (typeof block === "string") return block;
  if (!block || typeof block !== "object") return "";
  const type = normalizeSummaryBlockType(block);
  const text = summaryBlockText(block);
  if (type === "heading") {
    const inferred = /^h([1-6])$/i.exec(String(block.type || ""));
    const level = Math.max(1, Math.min(6, Number(block.level || inferred?.[1] || depth + 2)));
    return `${"#".repeat(level)} ${text}`;
  }
  if (["markdown", "paragraph", "text"].includes(type)) return text;
  if (type === "list") {
    const ordered = block.ordered || /ordered/.test(String(block.type || ""));
    return listItems(block).map((item, index) => {
      const itemText = summaryBlockText(item);
      const nested = item && typeof item === "object" && Array.isArray(item.children)
        ? `\n${item.children.map((child) => summaryBlockToMarkdown(child, depth + 1)).filter(Boolean).join("\n")}`
        : "";
      return `${ordered ? `${index + 1}.` : "-"} ${itemText}${nested}`;
    }).join("\n");
  }
  if (type === "table") return tableToMarkdown(block);
  if (["quote", "callout"].includes(type)) return String(text).split("\n").map((line) => `> ${line}`).join("\n");
  if (type === "code") return `\`\`\`${block.language || ""}\n${text}\n\`\`\``;
  if (type === "image") {
    const source = block.src || block.url || block.asset_url || "";
    return source ? `![${block.alt || block.caption || ""}](${source})${block.caption ? `\n*${block.caption}*` : ""}` : "";
  }
  if (type === "divider") return "---";
  if (type === "section") {
    const title = text ? `${"#".repeat(Math.max(2, Math.min(6, depth + 2)))} ${text}` : "";
    const children = listItems(block).map((child) => summaryBlockToMarkdown(child, depth + 1)).filter(Boolean).join("\n\n");
    return [title, children].filter(Boolean).join("\n\n");
  }
  return text;
}

export function summaryDocumentToMarkdown(document) {
  if (!document) return "";
  if (Number(document.schemaVersion) === 3 && Array.isArray(document.sections)) {
    try { return renderV3DocumentMarkdown(document); } catch {}
    const output = [];
    if (richTextValue(document.title)) output.push(`# ${richTextValue(document.title)}`);
    if (Array.isArray(document.overview) && document.overview.length) output.push("## Quick Overview", document.overview.map((block) => summaryBlockToMarkdown(block)).filter(Boolean).join("\n\n"));
    for (const section of document.sections) {
      output.push(`## ${richTextValue(section.title) || "Section"}`);
      output.push((section.blocks || []).map((block) => summaryBlockToMarkdown(block)).filter(Boolean).join("\n\n"));
    }
    if (Array.isArray(document.conclusion) && document.conclusion.length) output.push("## Summary Conclusion", document.conclusion.map((block) => summaryBlockToMarkdown(block)).filter(Boolean).join("\n\n"));
    return output.filter(Boolean).join("\n\n").trim();
  }
  if (!Array.isArray(document.blocks)) return "";
  return document.blocks.map((block) => summaryBlockToMarkdown(block)).filter(Boolean).join("\n\n").trim();
}

export function summaryToEditableMarkdown(summary) {
  const legacy = getLegacySummaryMarkdown(summary);
  if (summary?.render_preference === "markdown" && legacy) return legacy;
  const document = getSummaryDocumentV3(summary);
  return document ? (document.source_markdown || document.markdown || summaryDocumentToMarkdown(document) || legacy) : legacy;
}

export function shouldRenderSummaryDocumentV3(summary) {
  return summary?.render_preference !== "markdown" && !!getSummaryDocumentV3(summary);
}

function blockPlainText(block) {
  if (!block || typeof block !== "object") return summaryBlockText(block);
  const own = summaryBlockText(block);
  const childText = listItems(block).map(blockPlainText).filter(Boolean).join(" ");
  const rowText = Array.isArray(block.rows)
    ? block.rows.flatMap((row) => Array.isArray(row) ? row.map(summaryBlockText) : []).join(" ")
    : "";
  return [own, childText, rowText].filter(Boolean).join(" ");
}

export function summaryPlainText(summary) {
  if (shouldRenderSummaryDocumentV3(summary)) {
    const document = getSummaryDocumentV3(summary);
    if (Number(document.schemaVersion) === 3 && Array.isArray(document.sections)) {
      try { return stripSummaryMarkup(getV3DocumentText(document)); } catch {}
    }
    return stripSummaryMarkup((document.blocks || []).map(blockPlainText).join(" "));
  }
  const markdown = getLegacySummaryMarkdown(summary);
  if (markdown) return stripSummaryMarkup(markdown);
  return stripSummaryMarkup(getLegacySummaryHtml(summary));
}

export function summaryWordCount(summary) {
  const text = summaryPlainText(summary);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function createEditedSummary(summary, markdown, options = {}) {
  const base = summary && typeof summary === "object" ? summary : {};
  return {
    ...base,
    summary_markdown: markdown,
    edited_summary_markdown: markdown,
    ...(options.document ? {
      summary_document_v3: options.document,
      schema_version: 3,
      active_revision: Number(options.revision ?? base.active_revision ?? 0),
      render_preference: "document_v3",
    } : { render_preference: "markdown" }),
    editor: {
      ...(base.editor || {}),
      version: 1,
      updated_at: new Date().toISOString(),
    },
  };
}

export function stableSummaryFingerprint(value = "") {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
