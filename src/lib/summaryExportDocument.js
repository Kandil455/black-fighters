const RTL_RE = /[\u0590-\u08ff]/;
const LTR_RE = /[A-Za-z]/;
const HIGHLIGHT_RE = /==(green|yellow|cyan|orange|red):([\s\S]+?)==/gi;

const SEMANTIC_BY_COLOR = {
  green: "definition",
  yellow: "keyFact",
  cyan: "term",
  orange: "example",
  red: "warning",
};

function compactText(value = "") {
  const text = value && typeof value === "object" && typeof value.text === "string" ? value.text : value;
  return String(text ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<\/?(?:script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function detectExportDirection(value, fallback = "rtl") {
  const text = typeof value === "string" ? value : exportTextFromRuns(value);
  const rtlIndex = text.search(RTL_RE);
  const ltrIndex = text.search(LTR_RE);
  if (rtlIndex === -1 && ltrIndex === -1) return fallback;
  if (rtlIndex === -1) return "ltr";
  if (ltrIndex === -1) return "rtl";
  return rtlIndex < ltrIndex ? "rtl" : "ltr";
}

function languageFor(text, dir) {
  if (RTL_RE.test(text)) return "ar";
  if (LTR_RE.test(text)) return "en";
  return dir === "rtl" ? "ar" : "en";
}

function makeRun(text, options = {}) {
  const value = String(text || "");
  const dir = options.dir || detectExportDirection(value, "rtl");
  return {
    text: value,
    lang: options.lang || languageFor(value, dir),
    dir,
    marks: Array.isArray(options.marks) ? [...new Set(options.marks)] : [],
    semanticType: options.semanticType || null,
    importance: Number.isFinite(Number(options.importance)) ? Number(options.importance) : null,
    highlightColor: options.highlightColor || options.color || null,
    href: options.href || null,
  };
}

function normalizeRichTextDirection(value, fallbackDir) {
  const requested = value?.direction || value?.dir;
  if (requested === "rtl" || requested === "ltr") return requested;
  return detectExportDirection(value?.text || "", fallbackDir);
}

function richTextToRuns(value, fallbackDir = "rtl") {
  const text = String(value?.text || "");
  if (!text) return [];
  const annotations = (Array.isArray(value?.annotations) ? value.annotations : [])
    .map((annotation) => ({
      ...annotation,
      start: Math.max(0, Math.min(text.length, Math.floor(Number(annotation?.start) || 0))),
      end: Math.max(0, Math.min(text.length, Math.floor(Number(annotation?.end) || 0))),
    }))
    .filter((annotation) => annotation.end > annotation.start);
  const dir = normalizeRichTextDirection(value, fallbackDir);
  const lang = value?.language === "mixed" || value?.language === "neutral" ? undefined : value?.language;
  if (!annotations.length) return [makeRun(text, { dir, lang })];

  const boundaries = [...new Set([0, text.length, ...annotations.flatMap((annotation) => [annotation.start, annotation.end])])]
    .sort((left, right) => left - right);
  const runs = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    const segment = text.slice(start, end);
    if (!segment) continue;
    const active = annotations
      .filter((annotation) => annotation.start <= start && annotation.end >= end)
      .sort((left, right) => Number(right.importance || 0) - Number(left.importance || 0));
    const marks = [];
    if (active.some((annotation) => annotation.bold)) marks.push("bold");
    if (active.some((annotation) => annotation.italic)) marks.push("italic");
    if (active.some((annotation) => annotation.code)) marks.push("code");
    if (active.some((annotation) => annotation.highlight)) marks.push("highlight");
    const primary = active[0];
    runs.push(makeRun(segment, {
      dir: detectExportDirection(segment, dir),
      lang,
      marks,
      semanticType: primary?.semantic || null,
      importance: primary?.importance,
      highlightColor: primary?.color || null,
    }));
  }
  return runs;
}

export function parseInlineRuns(value, fallbackDir = "rtl") {
  const text = String(value || "");
  if (!text) return [];
  const token = /==(green|yellow|cyan|orange|red):([\s\S]+?)==|\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*\n]+)\*/gi;
  const runs = [];
  let cursor = 0;
  let match;
  while ((match = token.exec(text))) {
    if (match.index > cursor) runs.push(makeRun(text.slice(cursor, match.index), { dir: fallbackDir }));
    if (match[1]) {
      runs.push(makeRun(match[2], {
        dir: detectExportDirection(match[2], fallbackDir),
        marks: ["bold", "highlight"],
        semanticType: SEMANTIC_BY_COLOR[match[1].toLowerCase()] || "keyFact",
        importance: 0.8,
      }));
    } else if (match[3]) {
      runs.push(makeRun(match[3], { dir: detectExportDirection(match[3], fallbackDir), marks: ["bold"] }));
    } else if (match[4]) {
      runs.push(makeRun(match[4], { dir: "ltr", lang: "en", marks: ["code"] }));
    } else if (match[5]) {
      runs.push(makeRun(match[5], { dir: detectExportDirection(match[5], fallbackDir), marks: ["link"], href: match[6] }));
    } else if (match[7]) {
      runs.push(makeRun(match[7], { dir: detectExportDirection(match[7], fallbackDir), marks: ["italic"] }));
    }
    cursor = token.lastIndex;
  }
  if (cursor < text.length) runs.push(makeRun(text.slice(cursor), { dir: fallbackDir }));
  return runs.filter((run) => run.text);
}

export function normalizeExportRuns(value, fallbackDir = "rtl") {
  if (Array.isArray(value)) {
    return value.flatMap((run) => {
      if (typeof run === "string") return parseInlineRuns(run, fallbackDir);
      if (!run || typeof run !== "object") return [];
      if (typeof run.text === "string" && Array.isArray(run.annotations)) return richTextToRuns(run, fallbackDir);
      const text = run.text ?? run.value ?? "";
      return [makeRun(text, {
        ...run,
        dir: run.dir || detectExportDirection(text, fallbackDir),
        marks: Array.isArray(run.marks) ? run.marks : run.mark ? [run.mark] : [],
      })];
    }).filter((run) => run.text);
  }
  if (value && typeof value === "object" && Array.isArray(value.runs)) {
    return normalizeExportRuns(value.runs, value.dir || fallbackDir);
  }
  if (value && typeof value === "object" && typeof value.text === "string") {
    return richTextToRuns(value, fallbackDir);
  }
  return parseInlineRuns(value == null ? "" : String(value), fallbackDir);
}

export function exportTextFromRuns(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.text === "string" && !Array.isArray(value.runs)) return value.text;
  const runs = Array.isArray(value) ? value : value?.runs;
  return Array.isArray(runs) ? runs.map((run) => typeof run === "string" ? run : run?.text || "").join("") : "";
}

function normalizeListItem(item, fallbackDir) {
  if (typeof item === "string") return { runs: normalizeExportRuns(item, fallbackDir), children: [] };
  const runs = normalizeExportRuns(item?.runs || item || item?.text || item?.value || "", item?.direction || item?.dir || fallbackDir);
  const children = Array.isArray(item?.children) ? item.children.map((child) => normalizeListItem(child, fallbackDir)) : [];
  return { runs, children };
}

function normalizeCell(cell, fallbackDir) {
  if (cell && typeof cell === "object" && Array.isArray(cell.runs)) {
    return { runs: normalizeExportRuns(cell.runs, cell.dir || fallbackDir), dir: cell.dir || fallbackDir };
  }
  if (cell && typeof cell === "object" && typeof cell.text === "string") {
    const dir = normalizeRichTextDirection(cell, fallbackDir);
    return { runs: normalizeExportRuns(cell, dir), dir };
  }
  const text = cell == null ? "" : String(cell);
  const dir = detectExportDirection(text, fallbackDir);
  return { runs: normalizeExportRuns(text, dir), dir };
}

function normalizeTimelineItems(items, fallbackDir) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    if (typeof item === "string") return { id: `event-${index + 1}`, label: "", runs: normalizeExportRuns(item, fallbackDir) };
    return {
      id: item?.id || `event-${index + 1}`,
      label: String(item?.label || item?.date || item?.year || ""),
      runs: normalizeExportRuns(item?.runs || item?.text || item?.description || "", item?.dir || fallbackDir),
    };
  });
}

export function normalizeExportBlock(block, fallbackDir = "rtl") {
  if (typeof block === "string") {
    const dir = detectExportDirection(block, fallbackDir);
    return { type: "paragraph", dir, runs: normalizeExportRuns(block, dir) };
  }
  if (!block || typeof block !== "object") return null;
  const rawType = block.type || block.kind || "paragraph";
  const type = rawType === "bullet_list" || rawType === "ordered_list" ? "bulletList"
    : rawType === "quote" ? "callout"
      : rawType === "concept_map" ? "conceptMap"
        : rawType;
  const rawText = block.text ?? block.content ?? block.value ?? "";
  const dir = block.direction === "auto"
    ? detectExportDirection(rawText || block.runs, fallbackDir)
    : block.direction || block.dir || detectExportDirection(rawText || block.runs, fallbackDir);
  const base = {
    id: block.id || null,
    type,
    dir,
    role: block.role || block.variant || null,
    sourceRefs: Array.isArray(block.sourceRefs) ? block.sourceRefs : [],
    sourceFactIds: Array.isArray(block.sourceFactIds) ? block.sourceFactIds : [],
  };

  if (type === "bulletList") {
    return {
      ...base,
      ordered: rawType === "ordered_list" || !!block.ordered,
      items: (Array.isArray(block.items) ? block.items : []).map((item) => normalizeListItem(item, dir)),
    };
  }
  if (type === "definition") {
    return {
      ...base,
      term: normalizeExportRuns(block.term || block.title || "", dir),
      definition: normalizeExportRuns(block.definition || block.explanation || rawText, dir),
    };
  }
  if (type === "callout") {
    return {
      ...base,
      tone: block.tone || block.semanticType || block.role || "info",
      title: normalizeExportRuns(block.title || block.label || "", dir),
      runs: normalizeExportRuns(block.runs || rawText, dir),
    };
  }
  if (type === "code") {
    const code = exportTextFromRuns(rawText);
    if (block.role === "formula") {
      return { ...base, type: "equation", dir: "ltr", label: [], expression: code, explanation: [] };
    }
    return {
      ...base,
      type: "callout",
      dir: "ltr",
      tone: "code",
      title: normalizeExportRuns(block.title || "Code", "ltr"),
      runs: normalizeExportRuns(rawText, "ltr").map((run) => ({ ...run, marks: [...new Set([...(run.marks || []), "code"])] })),
    };
  }
  if (type === "equation") {
    const expression = exportTextFromRuns(block.expression || block.formula || block.latex || rawText || "");
    return {
      ...base,
      dir: "ltr",
      label: normalizeExportRuns(block.label || block.title || "", dir),
      expression,
      explanation: normalizeExportRuns(block.explanation || block.description || "", dir),
    };
  }
  if (type === "table") {
    const headers = block.table?.headers || block.headers || block.columns || block.head || [];
    const rows = block.table?.rows || block.rows || block.data || [];
    return {
      ...base,
      caption: normalizeExportRuns(block.caption || block.title || "", dir),
      headers: (Array.isArray(headers) ? headers : []).map((cell) => normalizeCell(cell?.label ?? cell?.title ?? cell, dir)),
      rows: (Array.isArray(rows) ? rows : []).map((row) => {
        const cells = Array.isArray(row) ? row : headers.map((header) => row?.[header?.key || header]);
        return cells.map((cell) => normalizeCell(cell, dir));
      }),
    };
  }
  if (type === "image") {
    return {
      ...base,
      assetId: block.assetId || block.asset_id || null,
      src: block.src || block.url || block.dataUrl || "",
      alt: String(block.alt || ""),
      caption: normalizeExportRuns(block.caption || block.content || "", dir),
      width: Number(block.width) || null,
      height: Number(block.height) || null,
    };
  }
  if (type === "conceptMap") {
    const fallbackNodes = exportTextFromRuns(rawText).split(/\n|\s*(?:->|→)\s*/).map((text) => text.trim()).filter(Boolean);
    return {
      ...base,
      title: normalizeExportRuns(block.title || "", dir),
      nodes: (Array.isArray(block.nodes) ? block.nodes : Array.isArray(block.items) ? block.items : fallbackNodes).map((node, index) => ({
        id: node?.id || `node-${index + 1}`,
        runs: normalizeExportRuns(node?.runs || node?.text || node?.label || node || "", node?.dir || dir),
      })),
      edges: Array.isArray(block.edges) ? block.edges : [],
    };
  }
  if (type === "timeline") {
    return { ...base, title: normalizeExportRuns(block.title || "", dir), items: normalizeTimelineItems(block.items || block.events, dir) };
  }

  return {
    ...base,
    type: "paragraph",
    role: rawType === "heading" ? "subheading" : block.role || block.variant || null,
    runs: normalizeExportRuns(block.runs || rawText, dir),
  };
}

function splitTableRow(line) {
  return String(line).trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => compactText(cell));
}

function isTableDivider(line) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function flushParagraph(lines, blocks, fallbackDir) {
  const text = lines.splice(0).map((line) => line.trim()).filter(Boolean).join(" ");
  if (!text) return;
  blocks.push(normalizeExportBlock(text, fallbackDir));
}

function sectionBucket(title, index, fallbackDir) {
  return {
    id: `section-${index + 1}`,
    title: compactText(title || `Section ${index + 1}`),
    dir: detectExportDirection(title, fallbackDir),
    sourceFactIds: [],
    blocks: [],
  };
}

export function parseMarkdownForExport(markdown, options = {}) {
  const source = String(markdown || "").replace(/<!--[^]*?-->/g, "");
  const fallbackDir = options.direction || detectExportDirection(source, options.languageMode === "en" ? "ltr" : "rtl");
  const lines = source.replace(/\r/g, "").split("\n");
  const document = {
    schemaVersion: 3,
    templateId: options.templateId || "legacy-markdown",
    languageMode: options.languageMode || (RTL_RE.test(source) && LTR_RE.test(source) ? "bilingual" : RTL_RE.test(source) ? "ar" : "en"),
    title: compactText(options.title || "ملخص Black Fighters"),
    overview: [],
    sections: [],
    conclusion: [],
    sources: Array.isArray(options.sources) ? options.sources : [],
    assets: Array.isArray(options.assets) ? options.assets : [],
    style: options.style || {},
    branding: options.branding || {},
    quality: options.quality || null,
  };
  let current = null;
  let mode = "overview";
  let paragraph = [];
  const target = () => mode === "conclusion" ? document.conclusion : current ? current.blocks : document.overview;
  const flush = () => flushParagraph(paragraph, target(), fallbackDir);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^#\s+/.test(line)) {
      flush();
      if (!options.title) document.title = compactText(line.replace(/^#\s+/, ""));
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      const heading = compactText(line.replace(/^##\s+/, ""));
      if (/quick overview|نظرة سريعة|ملخص سريع/i.test(heading)) {
        current = null;
        mode = "overview";
      } else if (/summary conclusion|الخلاصة|الخاتمة/i.test(heading)) {
        current = null;
        mode = "conclusion";
      } else {
        current = sectionBucket(heading, document.sections.length, fallbackDir);
        document.sections.push(current);
        mode = "section";
      }
      continue;
    }
    if (/^#{3,6}\s+/.test(line)) {
      flush();
      target().push(normalizeExportBlock({ type: "paragraph", role: "subheading", text: line.replace(/^#{3,6}\s+/, "") }, fallbackDir));
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      flush();
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      target().push(normalizeExportBlock({ type: "table", headers, rows }, fallbackDir));
      continue;
    }
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flush();
      const ordered = /^\d+[.)]\s+/.test(line);
      const items = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        if (ordered ? !/^\d+[.)]\s+/.test(candidate) : !/^[-*•]\s+/.test(candidate)) break;
        items.push(candidate.replace(ordered ? /^\d+[.)]\s+/ : /^[-*•]\s+/, ""));
        index += 1;
      }
      index -= 1;
      target().push(normalizeExportBlock({ type: "bulletList", ordered, items }, fallbackDir));
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      target().push(normalizeExportBlock({ type: "callout", text: line.replace(/^>\s?/, "") }, fallbackDir));
      continue;
    }
    if (/^\$\$/.test(line) || /^```(?:math|latex)?/i.test(line)) {
      flush();
      const closing = line.startsWith("$$") ? "$$" : "```";
      const expression = [];
      const inlineExpression = closing === "$$" ? line.replace(/^\$\$/, "").replace(/\$\$$/, "").trim() : "";
      if (inlineExpression) expression.push(inlineExpression);
      else {
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith(closing)) expression.push(lines[index++]);
      }
      target().push(normalizeExportBlock({ type: "equation", expression: expression.join("\n") }, fallbackDir));
      continue;
    }
    if (line === "---" || line === "***" || line === "___") { flush(); continue; }
    paragraph.push(line);
  }
  flush();
  if (!document.sections.length && document.overview.length) {
    document.sections.push({ id: "section-1", title: document.title, dir: fallbackDir, sourceFactIds: [], blocks: document.overview });
    document.overview = [];
  }
  return document;
}

function normalizeBlockArray(value, fallbackDir) {
  if (value == null || value === "") return [];
  const source = Array.isArray(value) ? value : [value];
  return source.map((block) => normalizeExportBlock(block, fallbackDir)).filter(Boolean);
}

function normalizeSources(sources) {
  return (Array.isArray(sources) ? sources : []).map((source, index) => ({
    id: source?.id || `source-${index + 1}`,
    title: String(source?.title || source?.name || source?.fileName || `Source ${index + 1}`),
    url: String(source?.url || source?.href || ""),
    page: source?.page ?? source?.pageNumber ?? null,
    pages: Array.isArray(source?.pages) ? source.pages : [],
  }));
}

function normalizeAssets(assets) {
  return (Array.isArray(assets) ? assets : []).map((asset, index) => ({
    id: asset?.id || `asset-${index + 1}`,
    type: asset?.type || "image",
    src: asset?.src || asset?.url || asset?.dataUrl || "",
    mimeType: asset?.mimeType || asset?.mime_type || "",
    byteLength: Number(asset?.byteLength || asset?.size || 0) || 0,
    alt: asset?.alt || "",
  }));
}

function adaptV3(raw, options) {
  const defaultDir = raw.languageMode === "en" ? "ltr" : "rtl";
  return {
    schemaVersion: 3,
    pipelineVersion: raw.pipelineVersion || null,
    templateId: raw.templateId || options.templateId || "summary-v3",
    languageMode: raw.languageMode || options.languageMode || "ar",
    colorLevel: raw.colorLevel || options.colorLevel || "medium",
    title: compactText(options.title || raw.title || "ملخص Black Fighters"),
    overview: normalizeBlockArray(raw.overview, defaultDir),
    sections: (Array.isArray(raw.sections) ? raw.sections : []).map((section, index) => {
      const title = compactText(section?.title || `Section ${index + 1}`);
      const requestedDir = section?.title?.direction || section?.direction || section?.dir;
      const dir = requestedDir === "auto" ? detectExportDirection(title, defaultDir) : requestedDir || detectExportDirection(title, defaultDir);
      return {
        id: section?.id || `section-${index + 1}`,
        title,
        dir,
        sourceRefs: Array.isArray(section?.sourceRefs) ? section.sourceRefs : [],
        sourceFactIds: Array.isArray(section?.sourceFactIds) ? section.sourceFactIds : [],
        blocks: normalizeBlockArray(section?.blocks || section?.content, dir),
      };
    }),
    conclusion: normalizeBlockArray(raw.conclusion, defaultDir),
    sources: normalizeSources(raw.sources || options.sources),
    assets: normalizeAssets(raw.assets || options.assets),
    style: { ...(raw.style || {}), ...(options.style || {}) },
    branding: { ...(raw.branding || {}), ...(options.branding || {}) },
    quality: raw.quality || options.quality || null,
    metadata: { ...(raw.metadata || {}), ...(options.metadata || {}) },
  };
}

export function adaptSummaryForExport(input, options = {}) {
  const candidates = [input?.document, input?.summary_document_v3, input?.summaryDocumentV3, input?.document_v3, input?.documentV3];
  const wrapped = candidates.find((candidate) => candidate && typeof candidate === "object") || input;
  if (wrapped?.schemaVersion === 3 || wrapped?.schema_version === 3) return adaptV3(wrapped, options);

  const markdown = typeof wrapped === "string" ? wrapped
    : wrapped?.markdown || wrapped?.summary_markdown || wrapped?.summaryMarkdown
      || wrapped?.summary?.summary_markdown || wrapped?.content?.summary_markdown || "";
  if (markdown) {
    return parseMarkdownForExport(markdown, {
      ...options,
      title: options.title || wrapped?.title || wrapped?.name,
      templateId: wrapped?.templateId || wrapped?.style || options.templateId,
      languageMode: wrapped?.languageMode || wrapped?.language || options.languageMode,
      sources: wrapped?.sources || options.sources,
      assets: wrapped?.assets || options.assets,
      quality: wrapped?.quality || wrapped?.coverage || options.quality,
      branding: wrapped?.branding || options.branding,
    });
  }

  if (Array.isArray(wrapped?.chapters)) {
    const languageMode = wrapped.languageMode || wrapped.language || options.languageMode || "ar";
    const defaultDir = languageMode === "en" ? "ltr" : "rtl";
    return adaptV3({
      schemaVersion: 3,
      templateId: wrapped.templateId || "legacy-course",
      languageMode,
      title: options.title || wrapped.title,
      overview: wrapped.description || "",
      sections: wrapped.chapters.map((chapter, index) => ({
        id: chapter.id || `chapter-${index + 1}`,
        title: chapter.title || `Part ${index + 1}`,
        blocks: parseMarkdownForExport(chapter.content || "", { languageMode, direction: defaultDir, title: chapter.title }).sections.flatMap((section) => section.blocks),
      })),
      conclusion: wrapped.conclusion || "",
      sources: wrapped.sources || [],
      assets: wrapped.assets || [],
      style: wrapped.style || {},
      branding: wrapped.branding || {},
      quality: wrapped.quality || null,
    }, options);
  }

  const html = wrapped?.summary_html || wrapped?.html || wrapped?.content;
  if (typeof html === "string" && html) {
    return parseMarkdownForExport(stripHtml(html), { ...options, title: options.title || wrapped?.title });
  }
  return adaptV3({ schemaVersion: 3, title: options.title || wrapped?.title || "ملخص Black Fighters", sections: [] }, options);
}

export function exportBlockPlainText(block) {
  if (!block) return "";
  if (block.type === "bulletList") return block.items.map((item) => exportTextFromRuns(item.runs)).join("\n");
  if (block.type === "definition") return `${exportTextFromRuns(block.term)}: ${exportTextFromRuns(block.definition)}`;
  if (block.type === "callout") return `${exportTextFromRuns(block.title)} ${exportTextFromRuns(block.runs)}`.trim();
  if (block.type === "equation") return `${block.expression} ${exportTextFromRuns(block.explanation)}`.trim();
  if (block.type === "table") return [block.headers, ...block.rows].map((row) => row.map((cell) => exportTextFromRuns(cell.runs)).join(" | ")).join("\n");
  if (block.type === "image") return `${block.alt} ${exportTextFromRuns(block.caption)}`.trim();
  if (block.type === "conceptMap") return block.nodes.map((node) => exportTextFromRuns(node.runs)).join("; ");
  if (block.type === "timeline") return block.items.map((item) => `${item.label} ${exportTextFromRuns(item.runs)}`).join("\n");
  return exportTextFromRuns(block.runs);
}

export function getSummaryExportPlainText(input, options = {}) {
  const document = adaptSummaryForExport(input, options);
  const parts = [document.title];
  document.overview.forEach((block) => parts.push(exportBlockPlainText(block)));
  for (const section of document.sections) {
    parts.push(section.title);
    section.blocks.forEach((block) => parts.push(exportBlockPlainText(block)));
  }
  document.conclusion.forEach((block) => parts.push(exportBlockPlainText(block)));
  return parts.filter(Boolean).join("\n");
}

export function estimateSummaryExport(input, options = {}) {
  const document = adaptSummaryForExport(input, options);
  const plainText = getSummaryExportPlainText(document);
  const characters = plainText.length;
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const tableCells = document.sections.reduce((sum, section) => sum + section.blocks.reduce((inner, block) => inner + (block.type === "table" ? block.headers.length + block.rows.reduce((count, row) => count + row.length, 0) : 0), 0), 0);
  const imageBytes = document.assets.reduce((sum, asset) => sum + (asset.byteLength || (asset.src?.startsWith("data:") ? Math.floor(asset.src.length * 0.72) : 0)), 0);
  const estimatedPages = Math.max(1, Math.ceil((characters + tableCells * 90) / (options.charactersPerPage || 2500)));
  const fontBudget = 230 * 1024;
  const vectorTextBudget = Math.ceil(characters * 0.56 + estimatedPages * 1450 + tableCells * 34);
  const includedImageBudget = Math.min(imageBytes, Number(options.maxEstimatedImageBytes || 900 * 1024));
  const estimatedBytes = Math.ceil((fontBudget + vectorTextBudget + includedImageBudget) * 1.08);
  const targetBytes = Number(options.targetBytes || 3 * 1024 * 1024);
  return {
    estimatedBytes,
    estimatedMB: Number((estimatedBytes / 1024 / 1024).toFixed(2)),
    estimatedPages,
    targetBytes,
    withinTarget: estimatedBytes <= targetBytes,
    characters,
    words,
    tableCells,
    imageBytes,
    confidence: imageBytes ? "medium" : "high",
  };
}

export { HIGHLIGHT_RE };
