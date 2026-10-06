import {
  adaptSummaryForExport,
  detectExportDirection,
  estimateSummaryExport,
  exportBlockPlainText,
  exportTextFromRuns,
} from "./summaryExportDocument.js";

const A4 = { width: 595.28, height: 841.89 };
const FONT_FAMILY = "DejaVuSans";
const FONT_FILES = {
  regular: "DejaVuSans.ttf",
  bold: "DejaVuSans-Bold.ttf",
};

const COLORS = {
  ink: "#12242d",
  muted: "#667780",
  line: "#dce8eb",
  paper: "#ffffff",
  soft: "#f3f9fa",
  cyan: "#12bfd0",
  cyanDark: "#087f8b",
  green: "#27ae72",
  yellow: "#f2c94c",
  orange: "#f2994a",
  red: "#eb5757",
  purple: "#8856d9",
};

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

function bytesToBase64(value) {
  const bytes = asBytes(value);
  if (!bytes) throw new Error("بيانات الخط غير صالحة");
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`تعذر تحميل أصل التصدير (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

// §9 font tax: DejaVu regular+bold ≈ 1.4MB. Browsers cache the URLs, but the
// fetch→ArrayBuffer→base64→VFS round-trip reran on EVERY export. Memoize the
// decoded bytes per URL — repeat exports pay zero network and zero decode.
const fontBytesCache = new Map();

async function fetchBytesCached(url) {
  if (fontBytesCache.has(url)) return fontBytesCache.get(url);
  const bytes = await fetchBytes(url);
  fontBytesCache.set(url, bytes);
  return bytes;
}

async function defaultFontUrls() {
  const [regular, bold] = await Promise.all([
    import("../../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url"),
    import("../../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url"),
  ]);
  return { regular: regular.default, bold: bold.default };
}

async function loadFonts(options = {}) {
  const supplied = options.fontBytes || {};
  if (asBytes(supplied.regular) && asBytes(supplied.bold)) {
    return { regular: asBytes(supplied.regular), bold: asBytes(supplied.bold) };
  }
  const urls = options.fontUrls || await defaultFontUrls();
  const [regular, bold] = await Promise.all([fetchBytesCached(urls.regular), fetchBytesCached(urls.bold)]);
  return { regular, bold };
}

function registerFonts(doc, fonts) {
  doc.addFileToVFS(FONT_FILES.regular, bytesToBase64(fonts.regular));
  doc.addFont(FONT_FILES.regular, FONT_FAMILY, "normal");
  doc.addFileToVFS(FONT_FILES.bold, bytesToBase64(fonts.bold));
  doc.addFont(FONT_FILES.bold, FONT_FAMILY, "bold");
  doc.setFont(FONT_FAMILY, "normal");
}

function normalizeHex(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function sanitizeFileName(value, extension) {
  const base = String(value || "Black-Fighters-summary")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Black-Fighters-summary";
  return `${base}.${extension}`;
}

function containsBoldRun(runs) {
  return Array.isArray(runs) && runs.some((run) => run?.marks?.includes("bold"));
}

function toneColor(tone, accent) {
  const value = String(tone || "").toLowerCase();
  if (/warn|danger|error|red|تحذير/.test(value)) return COLORS.red;
  if (/success|definition|green|تعريف/.test(value)) return COLORS.green;
  if (/example|orange|مثال/.test(value)) return COLORS.orange;
  if (/key|yellow|important|مهم/.test(value)) return COLORS.yellow;
  return accent;
}

function dataUrlByteLength(value = "") {
  if (!String(value).startsWith("data:")) return 0;
  const payload = String(value).split(",", 2)[1] || "";
  return Math.floor(payload.length * 0.75);
}

async function resolveImageSource(block, document, options) {
  let source = block.src || document.assets.find((asset) => asset.id === block.assetId)?.src || "";
  if (!source && options.assetResolver) source = await options.assetResolver(block, document);
  if (!source) return null;
  if (source instanceof Uint8Array || source instanceof ArrayBuffer) return source;
  if (typeof source !== "string") return null;
  if (source.startsWith("data:")) return source;
  if (!options.fetchImages) return null;
  const response = await fetch(source);
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (typeof FileReader === "undefined") return bytes;
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(new Blob([bytes], { type: response.headers.get("content-type") || "image/jpeg" }));
  });
}

function imageFormat(source) {
  if (typeof source !== "string") return "PNG";
  const match = source.match(/^data:image\/([^;,]+)/i);
  const format = match?.[1]?.toLowerCase();
  if (format === "jpg" || format === "jpeg") return "JPEG";
  if (format === "webp") return "WEBP";
  return "PNG";
}

function makeBlob(bytes, mimeType) {
  if (typeof Blob !== "undefined") return new Blob([bytes], { type: mimeType });
  return bytes;
}

export function estimateSummaryPdfSize(input, options = {}) {
  return estimateSummaryExport(input, options);
}

export async function createSummaryPdfV2(input, options = {}) {
  const document = adaptSummaryForExport(input, options);
  const estimate = estimateSummaryExport(document, options);
  const report = typeof options.onProgress === "function" ? options.onProgress : null;
  report?.({ stage: "fonts", percent: 5, detail: "تحميل خطوط التصدير…" });
  const [{ jsPDF }, fonts] = await Promise.all([import("jspdf"), loadFonts(options)]);
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
    precision: 2,
  });
  registerFonts(doc, fonts);
  report?.({ stage: "layout", percent: 15, detail: "تجهيز الصفحات…" });
  doc.setLanguage(document.languageMode === "en" ? "en" : "ar");
  doc.setProperties({
    title: document.title,
    subject: "Black Fighters study summary",
    author: String(document.branding?.author || "Black Fighters"),
    creator: "Black Fighters Export Pipeline v2",
    keywords: `Black Fighters,summary,${document.templateId}`,
  });

  const brandName = String(document.branding?.name || document.branding?.productName || "Black Fighters");
  const accent = normalizeHex(document.branding?.accentColor || document.style?.accentColor, COLORS.cyan);
  const margins = {
    left: Math.max(32, Number(options.marginLeft || 46)),
    right: Math.max(32, Number(options.marginRight || 46)),
    top: Math.max(58, Number(options.marginTop || 74)),
    bottom: Math.max(46, Number(options.marginBottom || 54)),
  };
  const contentWidth = A4.width - margins.left - margins.right;
  const warnings = [];
  let y = margins.top;

  const setFont = (style = "normal", size = 12, color = COLORS.ink) => {
    doc.setFont(FONT_FAMILY, style === "bold" ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
  };

  const drawPageChrome = (isFirst = false) => {
    doc.setFillColor(COLORS.paper);
    doc.rect(0, 0, A4.width, A4.height, "F");
    setFont("bold", isFirst ? 12 : 9, accent);
    doc.setR2L(false);
    doc.text(brandName, margins.left, 31, { align: "left", baseline: "middle" });
    doc.setDrawColor(accent);
    doc.setLineWidth(isFirst ? 2 : 1);
    doc.line(margins.left, 45, A4.width - margins.right, 45);

    setFont("bold", 34, "#edf5f6");
    doc.text(brandName, A4.width / 2, A4.height / 2, { align: "center", angle: 32 });
  };

  const addPage = () => {
    doc.addPage("a4", "portrait");
    drawPageChrome(false);
    y = margins.top;
  };

  const ensureSpace = (needed) => {
    if (y + needed <= A4.height - margins.bottom) return;
    addPage();
  };

  const splitText = (text, width, style, size) => {
    setFont(style, size);
    const clean = String(text || "").replace(/[\u2066-\u2069]/g, "").trim();
    if (!clean) return [];
    return doc.splitTextToSize(clean, Math.max(40, width));
  };

  const writeLine = (line, x, baselineY, width, dir, style, size, color = COLORS.ink, alignOverride) => {
    const rtl = dir === "rtl";
    setFont(style, size, color);
    doc.setR2L(rtl);
    const xPos = alignOverride === "center" ? x + width / 2 : rtl ? x + width : x;
    doc.text(String(line), xPos, baselineY, {
      align: alignOverride || (rtl ? "right" : "left"),
      baseline: "top",
      isInputVisual: false,
      isInputRtl: rtl,
      isOutputVisual: true,
      isOutputRtl: rtl,
      isSymmetricSwapping: true,
    });
  };

  const drawText = (text, config = {}) => {
    const value = String(text || "").trim();
    if (!value) return 0;
    const size = config.size || 12;
    const style = config.style || "normal";
    const width = config.width || contentWidth;
    const x = config.x ?? margins.left;
    const dir = config.dir || detectExportDirection(value, document.languageMode === "en" ? "ltr" : "rtl");
    const lineHeight = config.lineHeight || size * 1.62;
    const lines = splitText(value, width, style, size);
    ensureSpace(lines.length * lineHeight + (config.gap ?? 7));
    for (const line of lines) {
      if (y + lineHeight > A4.height - margins.bottom) addPage();
      writeLine(line, x, y, width, dir, style, size, config.color, config.align);
      y += lineHeight;
    }
    y += config.gap ?? 7;
    return lines.length * lineHeight;
  };

  const drawSectionTitle = (section, index) => {
    const title = section.title || `Section ${index + 1}`;
    const dir = section.dir || detectExportDirection(title, "rtl");
    const lines = splitText(title, contentWidth - 28, "bold", 16);
    const height = Math.max(38, lines.length * 22 + 14);
    ensureSpace(height + 12);
    doc.setFillColor(accent);
    doc.roundedRect(margins.left, y, contentWidth, height, 8, 8, "F");
    let lineY = y + 9;
    for (const line of lines) {
      writeLine(line, margins.left + 14, lineY, contentWidth - 28, dir, "bold", 16, "#ffffff");
      lineY += 22;
    }
    y += height + 13;
    if (Array.isArray(section.sourceRefs) && section.sourceRefs.length) {
      const sourceLabel = document.languageMode === "en" ? "Source pages" : "صفحات المصدر";
      drawText(`${sourceLabel}: ${section.sourceRefs.join(", ")}`, {
        size: 8.7,
        color: COLORS.muted,
        dir: document.languageMode === "en" ? "ltr" : "rtl",
        gap: 5,
      });
    }
  };

  const drawBulletList = (block) => {
    const ordered = !!block.ordered;
    block.items.forEach((item, index) => {
      const text = exportTextFromRuns(item.runs).trim();
      if (!text) return;
      const dir = detectExportDirection(text, block.dir || "rtl");
      const bulletWidth = 19;
      const textWidth = contentWidth - bulletWidth;
      const lines = splitText(text, textWidth, containsBoldRun(item.runs) ? "bold" : "normal", 11.5);
      const lineHeight = 18.2;
      ensureSpace(lines.length * lineHeight + 5);
      const rtl = dir === "rtl";
      const bulletX = rtl ? A4.width - margins.right - 5 : margins.left + 5;
      setFont("bold", ordered ? 9 : 12, accent);
      doc.setR2L(rtl);
      if (ordered) doc.text(`${index + 1}.`, bulletX, y + 1, { align: rtl ? "right" : "left", baseline: "top" });
      else {
        doc.setFillColor(accent);
        doc.circle(bulletX, y + 6, 2.2, "F");
      }
      const textX = rtl ? margins.left : margins.left + bulletWidth;
      for (const line of lines) {
        writeLine(line, textX, y, textWidth, dir, containsBoldRun(item.runs) ? "bold" : "normal", 11.5, COLORS.ink);
        y += lineHeight;
      }
      y += 4;
    });
    y += 2;
  };

  const drawCallout = (block, definition = false) => {
    const title = definition ? exportTextFromRuns(block.term) : exportTextFromRuns(block.title);
    const body = definition ? exportTextFromRuns(block.definition) : exportTextFromRuns(block.runs);
    const dir = block.dir || detectExportDirection(`${title} ${body}`, "rtl");
    const color = definition ? COLORS.green : toneColor(block.tone, accent);
    const titleLines = title ? splitText(title, contentWidth - 30, "bold", 12.5) : [];
    const bodyLines = splitText(body, contentWidth - 30, "normal", 11.5);
    const height = Math.max(38, 14 + titleLines.length * 19 + bodyLines.length * 18 + 8);
    ensureSpace(height + 10);
    doc.setFillColor(COLORS.soft);
    doc.setDrawColor(color);
    doc.setLineWidth(1.2);
    doc.roundedRect(margins.left, y, contentWidth, height, 8, 8, "FD");
    const railX = dir === "rtl" ? A4.width - margins.right - 4 : margins.left + 4;
    doc.setFillColor(color);
    doc.roundedRect(railX - 2, y + 8, 4, height - 16, 2, 2, "F");
    let lineY = y + 10;
    for (const line of titleLines) {
      writeLine(line, margins.left + 15, lineY, contentWidth - 30, dir, "bold", 12.5, color);
      lineY += 19;
    }
    for (const line of bodyLines) {
      writeLine(line, margins.left + 15, lineY, contentWidth - 30, dir, "normal", 11.5, COLORS.ink);
      lineY += 18;
    }
    y += height + 10;
  };

  const drawEquation = (block) => {
    const label = exportTextFromRuns(block.label);
    const explanation = exportTextFromRuns(block.explanation);
    if (label) drawText(label, { size: 11, style: "bold", dir: block.dir || "rtl", color: accent, gap: 3 });
    const expression = block.expression || "";
    const lines = splitText(expression, contentWidth - 32, "bold", 13);
    const height = Math.max(46, lines.length * 21 + 20);
    ensureSpace(height + 6);
    doc.setFillColor("#eef8fa");
    doc.setDrawColor(accent);
    doc.roundedRect(margins.left, y, contentWidth, height, 8, 8, "FD");
    let lineY = y + 11;
    for (const line of lines) {
      writeLine(line, margins.left + 16, lineY, contentWidth - 32, "ltr", "bold", 13, COLORS.ink, "center");
      lineY += 21;
    }
    y += height + 6;
    if (explanation) drawText(explanation, { size: 11, dir: detectExportDirection(explanation, "rtl"), gap: 8 });
  };

  const drawTable = (block) => {
    const fallbackDir = block.dir || (document.languageMode === "en" ? "ltr" : "rtl");
    if (block.caption?.length) drawText(exportTextFromRuns(block.caption), { size: 12, style: "bold", dir: fallbackDir, color: accent, gap: 5 });
    const rtl = fallbackDir === "rtl";
    const rawHeaders = block.headers.length ? block.headers : Array.from({ length: Math.max(1, ...block.rows.map((row) => row.length)) }, (_, index) => ({ runs: [{ text: `${index + 1}` }] }));
    const headers = rtl ? [...rawHeaders].reverse() : rawHeaders;
    const rows = block.rows.map((row) => rtl ? [...row].reverse() : row);
    const columns = Math.max(1, headers.length);
    const cellWidth = contentWidth / columns;
    const padding = 5;

    const measureRow = (cells, header = false) => {
      const lines = cells.map((cell) => {
        const text = exportTextFromRuns(cell?.runs || cell);
        const dir = cell?.dir || detectExportDirection(text, fallbackDir);
        return { text, dir, lines: splitText(text, cellWidth - padding * 2, header ? "bold" : "normal", header ? 9.5 : 9) };
      });
      const height = Math.max(header ? 28 : 24, ...lines.map((cell) => cell.lines.length * (header ? 14.5 : 14) + padding * 2));
      return { lines, height };
    };

    const drawRow = (cells, header = false) => {
      const measured = measureRow(cells, header);
      if (y + measured.height > A4.height - margins.bottom) {
        addPage();
        if (!header) drawRow(headers, true);
      }
      measured.lines.forEach((cell, column) => {
        const x = margins.left + column * cellWidth;
        doc.setFillColor(header ? accent : column % 2 ? "#fbfdfd" : COLORS.paper);
        doc.setDrawColor(COLORS.line);
        doc.rect(x, y, cellWidth, measured.height, "FD");
        let lineY = y + padding;
        cell.lines.forEach((line) => {
          writeLine(line, x + padding, lineY, cellWidth - padding * 2, cell.dir, header ? "bold" : "normal", header ? 9.5 : 9, header ? "#ffffff" : COLORS.ink);
          lineY += header ? 14.5 : 14;
        });
      });
      y += measured.height;
    };

    ensureSpace(60);
    drawRow(headers, true);
    rows.forEach((row) => {
      const padded = Array.from({ length: columns }, (_, index) => row[index] || { runs: [] });
      drawRow(padded, false);
    });
    y += 12;
  };

  const drawTimeline = (block) => {
    if (block.title?.length) drawText(exportTextFromRuns(block.title), { size: 12.5, style: "bold", color: accent, dir: block.dir, gap: 6 });
    for (const item of block.items) {
      const body = exportTextFromRuns(item.runs);
      ensureSpace(44);
      const rtl = (block.dir || "rtl") === "rtl";
      const railX = rtl ? A4.width - margins.right - 8 : margins.left + 8;
      doc.setDrawColor(accent);
      doc.setLineWidth(1.5);
      doc.line(railX, y, railX, y + 36);
      doc.setFillColor(accent);
      doc.circle(railX, y + 7, 3, "F");
      if (item.label) drawText(item.label, { x: margins.left + 20, width: contentWidth - 40, size: 10, style: "bold", color: accent, dir: detectExportDirection(item.label, block.dir), gap: 1 });
      drawText(body, { x: margins.left + 20, width: contentWidth - 40, size: 10.5, dir: detectExportDirection(body, block.dir), gap: 7 });
    }
  };

  const drawConceptMap = (block) => {
    if (block.title?.length) drawText(exportTextFromRuns(block.title), { size: 12.5, style: "bold", color: accent, dir: block.dir, gap: 6 });
    const nodes = block.nodes || [];
    for (let index = 0; index < nodes.length; index += 2) {
      const pair = nodes.slice(index, index + 2);
      const cardWidth = (contentWidth - 10) / 2;
      const measured = pair.map((node) => {
        const value = exportTextFromRuns(node.runs);
        return { value, dir: detectExportDirection(value, block.dir), lines: splitText(value, cardWidth - 20, "bold", 10.5) };
      });
      const height = Math.max(44, ...measured.map((item) => item.lines.length * 16 + 18));
      ensureSpace(height + 10);
      measured.forEach((item, column) => {
        const x = margins.left + column * (cardWidth + 10);
        doc.setFillColor("#f0fbfc");
        doc.setDrawColor(accent);
        doc.roundedRect(x, y, cardWidth, height, 8, 8, "FD");
        let lineY = y + 9;
        item.lines.forEach((line) => {
          writeLine(line, x + 10, lineY, cardWidth - 20, item.dir, "bold", 10.5, COLORS.ink, "center");
          lineY += 16;
        });
      });
      y += height + 10;
    }
  };

  const drawImage = async (block) => {
    const caption = exportTextFromRuns(block.caption);
    const source = await resolveImageSource(block, document, options).catch(() => null);
    const byteLength = typeof source === "string" ? dataUrlByteLength(source) : asBytes(source)?.byteLength || 0;
    const maxBytes = Number(options.maxEmbeddedImageBytes || 450 * 1024);
    if (!source || byteLength > maxBytes) {
      if (byteLength > maxBytes) warnings.push(`تم تجاوز صورة كبيرة للحفاظ على حجم PDF: ${block.alt || block.assetId || "image"}`);
      const label = caption || block.alt;
      if (label) drawCallout({ type: "callout", dir: block.dir, tone: "info", title: [], runs: [{ text: label }] });
      return;
    }
    const maxWidth = Math.min(contentWidth, Number(block.width) || 360);
    const maxHeight = Math.min(220, Number(block.height) || 190);
    ensureSpace(maxHeight + 26);
    try {
      doc.addImage(source, imageFormat(source), margins.left + (contentWidth - maxWidth) / 2, y, maxWidth, maxHeight, undefined, "MEDIUM");
      y += maxHeight + 7;
      if (caption) drawText(caption, { size: 9.5, color: COLORS.muted, dir: block.dir, align: "center", gap: 8 });
    } catch {
      warnings.push(`تعذر تضمين الصورة: ${block.alt || block.assetId || "image"}`);
    }
  };

  const drawBlock = async (block) => {
    if (!block) return;
    if (block.type === "bulletList") return drawBulletList(block);
    if (block.type === "definition") return drawCallout(block, true);
    if (block.type === "callout") return drawCallout(block, false);
    if (block.type === "equation") return drawEquation(block);
    if (block.type === "table") return drawTable(block);
    if (block.type === "timeline") return drawTimeline(block);
    if (block.type === "conceptMap") return drawConceptMap(block);
    if (block.type === "image") return drawImage(block);
    const text = exportBlockPlainText(block);
    return drawText(text, {
      size: block.role === "subheading" ? 13.5 : 11.5,
      style: block.role === "subheading" || containsBoldRun(block.runs) ? "bold" : "normal",
      color: block.role === "subheading" ? accent : COLORS.ink,
      dir: block.dir,
      gap: block.role === "subheading" ? 7 : 6,
    });
  };

  drawPageChrome(true);
  const titleDir = detectExportDirection(document.title, document.languageMode === "en" ? "ltr" : "rtl");
  drawText(document.title, { size: 25, style: "bold", color: COLORS.ink, dir: titleDir, gap: 5 });
  const defaultSubtitle = document.languageMode === "en"
    ? "Structured, searchable study summary"
    : "ملخص دراسي منظم وقابل للبحث";
  drawText(String(document.branding?.subtitle || defaultSubtitle), { size: 10.5, color: COLORS.muted, dir: document.languageMode === "en" ? "ltr" : "rtl", gap: 17 });

  if (document.overview.length) {
    drawText(document.languageMode === "en" ? "Quick Overview" : "نظرة سريعة | Quick Overview", { size: 15, style: "bold", color: accent, dir: document.languageMode === "en" ? "ltr" : "rtl", gap: 7 });
    for (const block of document.overview) await drawBlock(block);
  }

  for (let index = 0; index < document.sections.length; index += 1) {
    drawSectionTitle(document.sections[index], index);
    for (const block of document.sections[index].blocks) await drawBlock(block);
  }

  if (document.conclusion.length) {
    drawSectionTitle({ title: document.languageMode === "en" ? "Summary Conclusion" : "الخلاصة | Summary Conclusion", dir: document.languageMode === "en" ? "ltr" : "rtl" }, document.sections.length);
    for (const block of document.conclusion) await drawBlock(block);
  }

  if (document.sources.length) {
    drawSectionTitle({ title: document.languageMode === "en" ? "Sources" : "المصادر | Sources", dir: document.languageMode === "en" ? "ltr" : "rtl" }, document.sections.length + 1);
    const sourceItems = document.sources.map((source, index) => {
      const page = source.page != null ? ` — ${document.languageMode === "en" ? "page" : "صفحة"} ${source.page}` : "";
      const url = source.url ? ` — ${source.url}` : "";
      return { runs: [{ text: `${index + 1}. ${source.title}${page}${url}` }] };
    });
    drawBulletList({ type: "bulletList", ordered: false, dir: document.languageMode === "en" ? "ltr" : "rtl", items: sourceItems });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(COLORS.line);
    doc.setLineWidth(0.7);
    doc.line(margins.left, A4.height - 38, A4.width - margins.right, A4.height - 38);
    setFont("normal", 8.2, COLORS.muted);
    doc.setR2L(false);
    doc.text(`${page} / ${pageCount}`, A4.width / 2, A4.height - 23, { align: "center" });
    const shortTitle = document.title.length > 42 ? `${document.title.slice(0, 41)}…` : document.title;
    const footerDir = detectExportDirection(shortTitle, "rtl");
    const footerWidth = Math.min(170, contentWidth * 0.36);
    const titleX = footerDir === "rtl" ? A4.width - margins.right - footerWidth : margins.left;
    writeLine(shortTitle, titleX, A4.height - 25, footerWidth, footerDir, "normal", 7.5, COLORS.muted);
    doc.setR2L(false);
    doc.text(brandName, footerDir === "rtl" ? margins.left : A4.width - margins.right, A4.height - 23, {
      align: footerDir === "rtl" ? "left" : "right",
    });
  }

  const bytes = new Uint8Array(doc.output("arraybuffer"));
  const blob = makeBlob(bytes, "application/pdf");
  return {
    blob,
    bytes,
    size: bytes.byteLength,
    pageCount,
    estimate,
    withinTarget: bytes.byteLength <= estimate.targetBytes,
    warnings,
    document,
    fileName: sanitizeFileName(options.fileName || document.title, "pdf"),
  };
}

export async function downloadSummaryPdfV2(input, options = {}) {
  const result = await createSummaryPdfV2(input, options);
  if (typeof document === "undefined" || typeof URL === "undefined" || !(result.blob instanceof Blob)) return result;
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return result;
}

export { sanitizeFileName };
