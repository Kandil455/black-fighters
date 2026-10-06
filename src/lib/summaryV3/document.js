import {
  SUMMARY_BLOCK_ROLES,
  SUMMARY_BLOCK_TYPES,
  SUMMARY_COLOR_PROFILES,
  SUMMARY_LANGUAGE_MODES,
  SUMMARY_V3_PIPELINE_VERSION,
  SUMMARY_V3_SCHEMA_VERSION,
  requireSummaryColorProfile,
  requireSummaryTemplateContract,
  resolveSummaryTemplateId,
} from "./registry.js";
import { stableSummaryId } from "./schema.js";
import {
  applyDeterministicSectionEmphasis,
  collectBlockRichText,
  detectSummaryDirection,
  detectSummaryLanguage,
  normalizeSummaryRichText,
  normalizeTechnicalRichText,
} from "./text.js";

const PAGE_REFERENCE = /\[(?:صفحة|page)\s*[:#-]?\s*(\d+)\]/gi;

function uniqueNumbers(values) {
  return [...new Set((values || [])
    .map((value) => Math.floor(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0))]
    .sort((left, right) => left - right);
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))].sort();
}

export function extractSummarySourceRefs(value) {
  return uniqueNumbers([...String(value || "").matchAll(PAGE_REFERENCE)].map((match) => match[1]));
}

function inferDocumentLanguage(value) {
  const detected = detectSummaryLanguage(value);
  if (detected === "ar") return "ar";
  if (detected === "en") return "en";
  return "bilingual";
}

function blockText(block) {
  return collectBlockRichText(block).map((richText) => richText.text).join("\n");
}

function normalizeRole(role) {
  return SUMMARY_BLOCK_ROLES.includes(role) ? role : "body";
}

function normalizeBlock(block, sectionSeed, index, languageMode) {
  const type = SUMMARY_BLOCK_TYPES.includes(block?.type) ? block.type : "paragraph";
  const rawContent = type === "image" ? (block?.content ?? block?.caption ?? block?.alt ?? "Image") : block?.content;
  const content = rawContent == null
    ? undefined
    : (type === "code" || type === "equation" ? normalizeTechnicalRichText(rawContent) : normalizeSummaryRichText(rawContent));
  const items = Array.isArray(block?.items) ? block.items.map(normalizeSummaryRichText) : undefined;
  const table = block?.table ? {
    headers: Array.isArray(block.table.headers) ? block.table.headers.map(normalizeSummaryRichText) : [],
    rows: Array.isArray(block.table.rows)
      ? block.table.rows.map((row) => (Array.isArray(row) ? row.map(normalizeSummaryRichText) : []))
      : [],
  } : undefined;
  const draft = { content, items, table };
  const text = blockText(draft);
  const detectedLanguage = detectSummaryLanguage(text);
  let role = normalizeRole(block?.role);
  if (role === "body" && languageMode === "bilingual" && (type === "bullet_list" || type === "ordered_list") && detectedLanguage === "en") {
    role = "english_points";
  }
  const direction = type === "code" || type === "equation"
    ? "ltr"
    : detectSummaryDirection(text);
  const sourceRefs = uniqueNumbers([
    ...(block?.sourceRefs || []),
    ...extractSummarySourceRefs(text),
  ]);
  const sourceFactIds = uniqueStrings(block?.sourceFactIds);
  const attribution = type === "image" && block?.attribution && typeof block.attribution === "object" ? {
    creator: String(block.attribution.creator || "Unknown").slice(0, 180),
    license: String(block.attribution.license || "").toLowerCase().slice(0, 24),
    licenseUrl: String(block.attribution.licenseUrl || "").slice(0, 1000),
    sourcePage: String(block.attribution.sourcePage || "").slice(0, 1000),
    provider: String(block.attribution.provider || "").slice(0, 40),
    approved: block.attribution.approved === true,
  } : undefined;

  return {
    id: String(block?.id || stableSummaryId("blk", `${sectionSeed}:${type}:${text}`, index)),
    type,
    role,
    direction,
    ...(content ? { content } : {}),
    ...(items ? { items } : {}),
    ...(table ? { table } : {}),
    ...(type === "image" ? {
      src: String(block?.src || block?.url || "").trim().slice(0, 4000),
      alt: String(block?.alt || content?.text || "Educational image").slice(0, 300),
      ...(attribution ? { attribution } : {}),
    } : {}),
    sourceRefs,
    sourceFactIds,
  };
}

function normalizeBlocks(blocks, seed, languageMode) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((block, index) => normalizeBlock(block, seed, index, languageMode))
    .filter((block) => block.content?.text || block.items?.some((item) => item.text) || block.table?.rows?.length || (block.type === "image" && block.src));
}

function normalizeSection(section, index, languageMode) {
  const title = normalizeSummaryRichText(section?.title || `Section ${index + 1}`);
  const id = String(section?.id || stableSummaryId("sec", title.text, index));
  const blocks = normalizeBlocks(section?.blocks, id, languageMode);
  const sourceRefs = uniqueNumbers([
    ...(section?.sourceRefs || []),
    ...extractSummarySourceRefs(title.text),
    ...blocks.flatMap((block) => block.sourceRefs),
  ]);
  const sourceFactIds = uniqueStrings([
    ...(section?.sourceFactIds || []),
    ...blocks.flatMap((block) => block.sourceFactIds),
  ]);
  return { id, title, blocks, sourceRefs, sourceFactIds };
}

function applyDocumentEmphasis(document) {
  const virtualSections = [
    { id: "title", title: normalizeSummaryRichText("Title"), blocks: [{ id: "title_block", type: "heading", role: "body", direction: document.title.direction, content: document.title, sourceRefs: [], sourceFactIds: [] }], sourceRefs: [] },
    { id: "overview", title: normalizeSummaryRichText("Overview"), blocks: document.overview, sourceRefs: [] },
    ...document.sections,
    { id: "conclusion", title: normalizeSummaryRichText("Conclusion"), blocks: document.conclusion, sourceRefs: [] },
  ];
  for (const section of virtualSections) applyDeterministicSectionEmphasis(section, document.colorLevel);
  return document;
}

export function createSummaryDocument({
  title = "Summary",
  templateId = "complete_study_guide",
  languageMode = "ar",
  colorLevel = "medium",
  overview = [],
  sections = [],
  conclusion = [],
  metadata = {},
} = {}) {
  return normalizeSummaryDocument({
    schemaVersion: SUMMARY_V3_SCHEMA_VERSION,
    pipelineVersion: SUMMARY_V3_PIPELINE_VERSION,
    title,
    templateId,
    languageMode,
    colorLevel,
    overview,
    sections,
    conclusion,
    metadata,
  });
}

export function normalizeSummaryDocument(input, options = {}) {
  const requestedTemplateId = String(options.templateId || input?.templateId || "complete_study_guide");
  const templateId = resolveSummaryTemplateId(requestedTemplateId);
  if (!templateId) requireSummaryTemplateContract(requestedTemplateId);
  const colorLevel = String(options.colorLevel || input?.colorLevel || "medium");
  requireSummaryTemplateContract(templateId);
  requireSummaryColorProfile(colorLevel);

  const sourceText = JSON.stringify(input || {});
  const requestedLanguage = options.languageMode || input?.languageMode;
  const languageMode = SUMMARY_LANGUAGE_MODES.includes(requestedLanguage)
    ? requestedLanguage
    : inferDocumentLanguage(sourceText);
  const title = normalizeSummaryRichText(input?.title || options.title || "Summary");
  const overview = normalizeBlocks(input?.overview, "overview", languageMode);
  const sections = (Array.isArray(input?.sections) ? input.sections : [])
    .map((section, index) => normalizeSection(section, index, languageMode));
  const conclusion = normalizeBlocks(input?.conclusion, "conclusion", languageMode);
  const sourceRefs = uniqueNumbers([
    ...overview.flatMap((block) => block.sourceRefs),
    ...sections.flatMap((section) => section.sourceRefs),
    ...conclusion.flatMap((block) => block.sourceRefs),
  ]);
  const document = {
    schemaVersion: SUMMARY_V3_SCHEMA_VERSION,
    pipelineVersion: SUMMARY_V3_PIPELINE_VERSION,
    templateId,
    templateVersion: requireSummaryTemplateContract(templateId).version,
    languageMode,
    colorLevel,
    title,
    overview,
    sections,
    conclusion,
    metadata: {
      ...(input?.metadata && typeof input.metadata === "object" ? input.metadata : {}),
      ...(options.metadata && typeof options.metadata === "object" ? options.metadata : {}),
      sourceRefs,
      migratedFrom: input?.schemaVersion === SUMMARY_V3_SCHEMA_VERSION ? input?.metadata?.migratedFrom : (input?.metadata?.migratedFrom || "unknown"),
    },
  };
  return applyDocumentEmphasis(document);
}

function renderRichTextToMarkdown(richText) {
  const text = String(richText?.text || "");
  const annotations = (richText?.annotations || []).filter((annotation) => annotation.end > annotation.start);
  if (!annotations.length) return text;
  const boundaries = [...new Set([0, text.length, ...annotations.flatMap((annotation) => [annotation.start, annotation.end])])]
    .filter((value) => value >= 0 && value <= text.length)
    .sort((left, right) => left - right);
  let result = "";
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    let chunk = text.slice(start, end);
    if (!chunk) continue;
    const active = annotations.filter((annotation) => annotation.start <= start && annotation.end >= end);
    if (active.some((annotation) => annotation.code)) chunk = `\`${chunk}\``;
    else {
      const highlighted = active.find((annotation) => annotation.highlight && annotation.color);
      if (highlighted) chunk = `==${highlighted.color}:${chunk}==`;
      if (active.some((annotation) => annotation.bold)) chunk = `**${chunk}**`;
      if (active.some((annotation) => annotation.italic)) chunk = `*${chunk}*`;
    }
    result += chunk;
  }
  return result;
}

function renderBlock(block) {
  if (block.type === "bullet_list" || block.type === "ordered_list") {
    return (block.items || []).map((item, index) => `${block.type === "ordered_list" ? `${index + 1}.` : "-"} ${renderRichTextToMarkdown(item)}`).join("\n");
  }
  if (block.type === "table") {
    const headers = (block.table?.headers || []).map(renderRichTextToMarkdown);
    const rows = block.table?.rows || [];
    if (!headers.length && !rows.length) return "";
    const width = Math.max(headers.length, ...rows.map((row) => row.length));
    const normalizedHeaders = Array.from({ length: width }, (_, index) => headers[index] || " ");
    return [
      `| ${normalizedHeaders.join(" | ")} |`,
      `| ${normalizedHeaders.map(() => "---").join(" | ")} |`,
      ...rows.map((row) => `| ${Array.from({ length: width }, (_, index) => renderRichTextToMarkdown(row[index]) || " ").join(" | ")} |`),
    ].join("\n");
  }
  if (block.type === "image") {
    const alt = String(block.alt || block.content?.text || "Educational image").replace(/[\[\]]/g, "");
    const caption = String(block.content?.text || "").replace(/[\r\n\"]+/g, " ").trim();
    const image = `![${alt}](${block.src}${caption ? ` \"${caption}\"` : ""})`;
    const credit = block.attribution ? `> Image credit: ${block.attribution.creator || "Unknown"} | ${block.attribution.license || ""} | ${block.attribution.sourcePage || ""} | ${block.attribution.licenseUrl || ""} | ${block.attribution.provider || ""} | approved` : "";
    return [image, credit].filter(Boolean).join("\n");
  }
  const content = renderRichTextToMarkdown(block.content);
  if (block.type === "heading") return `### ${content}`;
  if (block.type === "quote") return content.split("\n").map((line) => `> ${line}`).join("\n");
  if (block.type === "code" || block.type === "equation") return `\`\`\`\n${block.content?.text || ""}\n\`\`\``;
  return content;
}

function renderBlocks(blocks, { bilingualSection = false } = {}) {
  const output = [];
  let emittedArabicLabel = false;
  for (const block of blocks || []) {
    if (bilingualSection && block.role === "arabic_explanation" && !emittedArabicLabel) {
      output.push("**الشرح بالعربي:**");
      emittedArabicLabel = true;
    }
    const rendered = renderBlock(block);
    if (rendered) output.push(rendered);
  }
  return output.join("\n\n");
}

export function summaryDocumentToMarkdown(document) {
  const normalized = normalizeSummaryDocument(document);
  const output = [`# ${renderRichTextToMarkdown(normalized.title)}`];
  if (normalized.overview.length) output.push("## Quick Overview", renderBlocks(normalized.overview));
  for (const section of normalized.sections) {
    output.push(`## ${renderRichTextToMarkdown(section.title)}`);
    output.push(renderBlocks(section.blocks, { bilingualSection: normalized.languageMode === "bilingual" }));
  }
  if (normalized.conclusion.length) output.push("## Summary Conclusion", renderBlocks(normalized.conclusion));
  return output.filter(Boolean).join("\n\n").trim();
}

export function getSummaryDocumentText(document) {
  const values = [document?.title?.text || ""];
  for (const block of [...(document?.overview || []), ...(document?.conclusion || [])]) values.push(blockText(block));
  for (const section of document?.sections || []) {
    values.push(section.title?.text || "");
    for (const block of section.blocks || []) values.push(blockText(block));
  }
  return values.filter(Boolean).join("\n");
}

export function getColorProfileForDocument(document) {
  return SUMMARY_COLOR_PROFILES[document?.colorLevel] || null;
}
