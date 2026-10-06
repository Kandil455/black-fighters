import {
  adaptSummaryForExport,
  detectExportDirection,
  estimateSummaryExport,
  exportBlockPlainText,
  exportTextFromRuns,
} from "./summaryExportDocument.js";
import { sanitizeFileName } from "./summaryPdfV2.js";

const COLORS = {
  background: "F8FBFC",
  ink: "102A34",
  muted: "65767D",
  line: "D7E7EA",
  accent: "11BFD0",
  accentDark: "087E89",
  soft: "EDF8FA",
  white: "FFFFFF",
  green: "27AE72",
  yellow: "F2C94C",
  orange: "F2994A",
  red: "EB5757",
};

function hex(value, fallback) {
  const result = String(value || "").replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(result) ? result : fallback;
}

function toneColor(value, accent) {
  const tone = String(value || "").toLowerCase();
  if (/warn|danger|error|red|تحذير/.test(tone)) return COLORS.red;
  if (/success|definition|green|تعريف/.test(tone)) return COLORS.green;
  if (/example|orange|مثال/.test(tone)) return COLORS.orange;
  if (/key|yellow|important|مهم/.test(tone)) return COLORS.yellow;
  return accent;
}

function splitText(value, maxChars = 1050) {
  const text = String(value || "").trim();
  if (text.length <= maxChars) return text ? [text] : [];
  const sentences = text.split(/(?<=[.!؟])\s+|\n+/).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const sentence of sentences.length ? sentences : [text]) {
    if (!current) current = sentence;
    else if (current.length + sentence.length + 1 <= maxChars) current += ` ${sentence}`;
    else {
      chunks.push(current);
      current = sentence;
    }
    while (current.length > maxChars) {
      let cut = current.lastIndexOf(" ", maxChars);
      if (cut < maxChars * 0.6) cut = maxChars;
      chunks.push(current.slice(0, cut).trim());
      current = current.slice(cut).trim();
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function blockUnits(block) {
  if (!block) return [];
  if (block.type === "bulletList") {
    return block.items.flatMap((item, index) => splitText(`${block.ordered ? `${index + 1}.` : "•"} ${exportTextFromRuns(item.runs)}`, 520).map((text) => ({ type: "bullet", text, dir: detectExportDirection(text, block.dir) })));
  }
  if (block.type === "definition") {
    const text = `${exportTextFromRuns(block.term)}: ${exportTextFromRuns(block.definition)}`;
    return splitText(text, 850).map((part) => ({ type: "callout", text: part, dir: detectExportDirection(part, block.dir), tone: "definition" }));
  }
  if (block.type === "callout") {
    const title = exportTextFromRuns(block.title);
    const text = `${title}${title ? "\n" : ""}${exportTextFromRuns(block.runs)}`;
    return splitText(text, 850).map((part) => ({ type: "callout", text: part, dir: detectExportDirection(part, block.dir), tone: block.tone }));
  }
  if (block.type === "equation") {
    const explanation = exportTextFromRuns(block.explanation);
    return [{ type: "equation", text: block.expression, explanation, dir: "ltr" }];
  }
  if (block.type === "table") return [{ type: "table", block }];
  if (block.type === "image") return [{ type: "image", block }];
  if (block.type === "timeline") {
    return block.items.map((item) => {
      const text = `${item.label}${item.label ? " — " : ""}${exportTextFromRuns(item.runs)}`;
      return { type: "timeline", text, dir: detectExportDirection(text, block.dir) };
    });
  }
  if (block.type === "conceptMap") {
    return block.nodes.map((node) => {
      const text = exportTextFromRuns(node.runs);
      return { type: "concept", text, dir: detectExportDirection(text, block.dir) };
    });
  }
  const text = exportBlockPlainText(block);
  return splitText(text).map((part) => ({ type: block.role === "subheading" ? "subheading" : "paragraph", text: part, dir: block.dir || detectExportDirection(part, "rtl") }));
}

function unitCost(unit) {
  if (unit.type === "table" || unit.type === "image") return 8;
  if (unit.type === "equation" || unit.type === "callout") return 3;
  return Math.max(1, Math.ceil(String(unit.text || "").length / 230));
}

function paginateUnits(units, maxCost = 9) {
  const pages = [];
  let page = [];
  let cost = 0;
  for (const unit of units) {
    const nextCost = unitCost(unit);
    if (page.length && cost + nextCost > maxCost) {
      pages.push(page);
      page = [];
      cost = 0;
    }
    page.push(unit);
    cost += nextCost;
    if (nextCost >= maxCost) {
      pages.push(page);
      page = [];
      cost = 0;
    }
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function makeBlob(bytes, mimeType) {
  if (typeof Blob !== "undefined") return new Blob([bytes], { type: mimeType });
  return bytes;
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array();
}

export function estimateSummaryPptxSize(input, options = {}) {
  const estimate = estimateSummaryExport(input, { ...options, charactersPerPage: 1700 });
  const estimatedSlides = Math.max(2, Math.ceil(estimate.characters / 1700) + Math.ceil(estimate.tableCells / 35));
  const estimatedBytes = Math.ceil(160 * 1024 + estimate.characters * 0.42 + estimatedSlides * 6200 + Math.min(estimate.imageBytes, 1.5 * 1024 * 1024));
  return {
    ...estimate,
    estimatedSlides,
    estimatedBytes,
    estimatedMB: Number((estimatedBytes / 1024 / 1024).toFixed(2)),
  };
}

export async function createSummaryPptx(input, options = {}) {
  const document = adaptSummaryForExport(input, options);
  const estimate = estimateSummaryPptxSize(document, options);
  const report = typeof options.onProgress === "function" ? options.onProgress : null;
  report?.({ stage: "layout", percent: 10, detail: "تجهيز السلايدات…" });
  const module = await import("pptxgenjs");
  const PptxGenJS = module.default || module;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = String(document.branding?.author || "Black Fighters");
  pptx.company = String(document.branding?.company || "Black Fighters");
  pptx.subject = "Black Fighters study summary";
  pptx.title = document.title;
  pptx.lang = document.languageMode === "en" ? "en-US" : "ar-EG";
  pptx.theme = {
    headFontFace: options.pptxFontFace || "Arial",
    bodyFontFace: options.pptxFontFace || "Arial",
    lang: document.languageMode === "en" ? "en-US" : "ar-EG",
  };

  const accent = hex(document.branding?.accentColor || document.style?.accentColor, COLORS.accent);
  const brandName = String(document.branding?.name || document.branding?.productName || "Black Fighters");
  const shape = pptx.ShapeType;
  let slideNumber = 0;
  const warnings = [];

  const addChrome = (slide, title, dir = "rtl", optionsForSlide = {}) => {
    slideNumber += 1;
    slide.background = { color: COLORS.background };
    slide.addShape(shape.rect, { x: 0, y: 0, w: 13.333, h: 0.12, line: { color: accent, transparency: 100 }, fill: { color: accent } });
    slide.addText(brandName, { x: 0.45, y: 0.22, w: 1.6, h: 0.3, fontFace: "Arial", fontSize: 11, bold: true, color: accent, margin: 0, fit: "shrink" });
    slide.addText(brandName, { x: 4.6, y: 2.65, w: 4.1, h: 1.05, fontFace: "Arial", fontSize: 42, bold: true, color: "EAF3F5", transparency: 22, rotate: 25, align: "center", margin: 0, fit: "shrink" });
    if (!optionsForSlide.hideTitle) {
      slide.addText(String(title || document.title), {
        x: 0.55, y: 0.62, w: 12.2, h: 0.55,
        fontFace: options.pptxFontFace || "Arial", fontSize: 22, bold: true,
        color: COLORS.ink, margin: 0, fit: "shrink", rtlMode: dir === "rtl", align: dir === "rtl" ? "right" : "left",
      });
      slide.addShape(shape.line, { x: 0.55, y: 1.27, w: 12.2, h: 0, line: { color: COLORS.line, width: 1 } });
    }
    slide.addShape(shape.line, { x: 0.55, y: 7.14, w: 12.2, h: 0, line: { color: COLORS.line, width: 0.7 } });
    slide.addText(`${brandName}  •  ${slideNumber}`, { x: 5.4, y: 7.2, w: 2.5, h: 0.18, fontFace: "Arial", fontSize: 8, color: COLORS.muted, align: "center", margin: 0 });
  };

  const addTitleSlide = () => {
    const slide = pptx.addSlide();
    addChrome(slide, "", "ltr", { hideTitle: true });
    const dir = detectExportDirection(document.title, document.languageMode === "en" ? "ltr" : "rtl");
    slide.addText(document.title, {
      x: 0.85, y: 1.55, w: 11.65, h: 1.25,
      fontFace: options.pptxFontFace || "Arial", fontSize: 32, bold: true,
      color: COLORS.ink, margin: 0, fit: "shrink", valign: "mid",
      rtlMode: dir === "rtl", align: dir === "rtl" ? "right" : "left",
    });
    slide.addShape(shape.roundRect, { x: 0.86, y: 3.05, w: 4.0, h: 0.12, rectRadius: 0.03, line: { color: accent, transparency: 100 }, fill: { color: accent } });
    slide.addText(document.languageMode === "en" ? "Structured, editable study deck" : "عرض دراسي منظم وقابل للتعديل", {
      x: 0.86, y: 3.34, w: 6.6, h: 0.4, fontFace: options.pptxFontFace || "Arial", fontSize: 16,
      color: COLORS.muted, margin: 0, rtlMode: document.languageMode !== "en", align: document.languageMode === "en" ? "left" : "right",
    });
    slide.addText(brandName, { x: 8.2, y: 4.55, w: 3.2, h: 0.65, fontFace: "Arial", fontSize: 28, bold: true, color: accent, align: "center", margin: 0 });
  };

  const addTextUnits = (slide, units) => {
    let y = 1.48;
    const available = 5.42;
    const totalCost = Math.max(1, units.reduce((sum, unit) => sum + unitCost(unit), 0));
    const unitScale = available / totalCost;
    for (const unit of units) {
      const cost = unitCost(unit);
      const height = Math.max(0.48, Math.min(2.35, unitScale * cost - 0.08));
      const dir = unit.dir || detectExportDirection(unit.text, "rtl");
      if (unit.type === "callout" || unit.type === "equation") {
        const calloutColor = unit.type === "equation" ? accent : toneColor(unit.tone, accent);
        slide.addShape(shape.roundRect, { x: 0.62, y, w: 12.1, h: height, rectRadius: 0.05, line: { color: calloutColor, width: 1 }, fill: { color: COLORS.soft, transparency: 5 } });
        const text = unit.type === "equation" ? `${unit.text}${unit.explanation ? `\n${unit.explanation}` : ""}` : unit.text;
        slide.addText(text, {
          x: 0.85, y: y + 0.08, w: 11.65, h: height - 0.16,
          fontFace: options.pptxFontFace || "Arial", fontSize: unit.type === "equation" ? 17 : 14,
          bold: unit.type === "equation", color: COLORS.ink, margin: 0.04, fit: "shrink", valign: "mid",
          rtlMode: dir === "rtl", align: unit.type === "equation" ? "center" : dir === "rtl" ? "right" : "left",
        });
      } else {
        const isHeading = unit.type === "subheading";
        const isBullet = unit.type === "bullet" || unit.type === "timeline" || unit.type === "concept";
        slide.addText(unit.text, {
          x: isBullet ? 0.92 : 0.72, y, w: isBullet ? 11.55 : 11.9, h: height,
          fontFace: options.pptxFontFace || "Arial", fontSize: isHeading ? 17 : isBullet ? 14 : 15,
          bold: isHeading, color: isHeading ? accent : COLORS.ink,
          margin: 0.04, fit: "shrink", valign: "top", breakLine: true,
          rtlMode: dir === "rtl", align: dir === "rtl" ? "right" : "left",
        });
        if (isBullet) {
          const bulletX = dir === "rtl" ? 12.57 : 0.72;
          slide.addShape(shape.ellipse, { x: bulletX, y: y + 0.15, w: 0.07, h: 0.07, line: { color: accent, transparency: 100 }, fill: { color: accent } });
        }
      }
      y += height + 0.1;
    }
  };

  const addTableSlides = (title, block, dir) => {
    const rtl = dir === "rtl";
    const headers = (rtl ? [...block.headers].reverse() : block.headers).map((cell) => exportTextFromRuns(cell.runs));
    const rows = block.rows.map((row) => (rtl ? [...row].reverse() : row).map((cell) => exportTextFromRuns(cell.runs)));
    const pageRows = Math.max(5, Number(options.tableRowsPerSlide || 9));
    const chunks = [];
    for (let index = 0; index < rows.length; index += pageRows) chunks.push(rows.slice(index, index + pageRows));
    if (!chunks.length) chunks.push([]);
    chunks.forEach((rowsChunk, chunkIndex) => {
      const slide = pptx.addSlide();
      addChrome(slide, `${title}${chunks.length > 1 ? ` (${chunkIndex + 1}/${chunks.length})` : ""}`, dir);
      slide.addTable([headers, ...rowsChunk], {
        x: 0.6, y: 1.48, w: 12.1, h: 5.35,
        border: { color: COLORS.line, pt: 1 },
        fill: COLORS.white, color: COLORS.ink,
        fontFace: options.pptxFontFace || "Arial", fontSize: 11,
        margin: 0.06, valign: "mid", rtlMode: rtl,
        bold: false,
        rowH: 0.48,
        autoFit: false,
      });
    });
  };

  const addImageSlide = (title, unit, dir) => {
    const source = unit.block.src || document.assets.find((asset) => asset.id === unit.block.assetId)?.src || "";
    const slide = pptx.addSlide();
    addChrome(slide, title, dir);
    if (typeof source === "string" && source.startsWith("data:image/")) {
      slide.addImage({ data: source, x: 1.3, y: 1.55, w: 10.73, h: 4.85, transparency: 0 });
    } else {
      warnings.push(`تعذر تضمين صورة PPTX: ${unit.block.alt || unit.block.assetId || "image"}`);
      slide.addShape(shape.roundRect, { x: 1.4, y: 2.1, w: 10.53, h: 2.5, rectRadius: 0.06, line: { color: COLORS.line, width: 1 }, fill: { color: COLORS.soft } });
      slide.addText(exportTextFromRuns(unit.block.caption) || unit.block.alt || "Image", { x: 1.7, y: 2.8, w: 9.93, h: 0.7, fontFace: options.pptxFontFace || "Arial", fontSize: 18, color: COLORS.muted, align: "center", margin: 0, fit: "shrink", rtlMode: dir === "rtl" });
    }
  };

  addTitleSlide();
  if (document.overview.length) {
    const units = document.overview.flatMap(blockUnits);
    paginateUnits(units).forEach((pageUnits, index) => {
      const slide = pptx.addSlide();
      const title = document.languageMode === "en" ? "Quick Overview" : "نظرة سريعة | Quick Overview";
      addChrome(slide, `${title}${index ? ` (${index + 1})` : ""}`, document.languageMode === "en" ? "ltr" : "rtl");
      addTextUnits(slide, pageUnits);
    });
  }

  for (const section of document.sections) {
    const units = section.blocks.flatMap(blockUnits);
    const pages = paginateUnits(units);
    pages.forEach((pageUnits, index) => {
      if (pageUnits.length === 1 && pageUnits[0].type === "table") {
        addTableSlides(section.title, pageUnits[0].block, section.dir);
        return;
      }
      if (pageUnits.length === 1 && pageUnits[0].type === "image") {
        addImageSlide(section.title, pageUnits[0], section.dir);
        return;
      }
      const slide = pptx.addSlide();
      addChrome(slide, `${section.title}${pages.length > 1 ? ` (${index + 1}/${pages.length})` : ""}`, section.dir);
      addTextUnits(slide, pageUnits);
    });
  }

  if (document.conclusion.length) {
    const units = document.conclusion.flatMap(blockUnits);
    paginateUnits(units).forEach((pageUnits, index) => {
      const slide = pptx.addSlide();
      const title = document.languageMode === "en" ? "Summary Conclusion" : "الخلاصة | Summary Conclusion";
      addChrome(slide, `${title}${index ? ` (${index + 1})` : ""}`, document.languageMode === "en" ? "ltr" : "rtl");
      addTextUnits(slide, pageUnits);
    });
  }

  if (document.sources.length) {
    const units = document.sources.map((source, index) => {
      const page = source.page != null ? ` — ${document.languageMode === "en" ? "page" : "صفحة"} ${source.page}` : "";
      const text = `${index + 1}. ${source.title}${page}${source.url ? ` — ${source.url}` : ""}`;
      return { type: "bullet", text, dir: detectExportDirection(text, document.languageMode === "en" ? "ltr" : "rtl") };
    });
    paginateUnits(units).forEach((pageUnits, index) => {
      const slide = pptx.addSlide();
      const title = document.languageMode === "en" ? "Sources" : "المصادر | Sources";
      addChrome(slide, `${title}${index ? ` (${index + 1})` : ""}`, document.languageMode === "en" ? "ltr" : "rtl");
      addTextUnits(slide, pageUnits);
    });
  }

  report?.({ stage: "render", percent: 70, detail: "تجميع العرض…" });
  const output = await pptx.write({ outputType: "arraybuffer", compression: true });
  report?.({ stage: "save", percent: 95, detail: "إنشاء الملف…" });
  const bytes = asBytes(output);
  const blob = makeBlob(bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  return {
    blob,
    bytes,
    size: bytes.byteLength,
    slideCount: slideNumber,
    estimate,
    warnings,
    document,
    fileName: sanitizeFileName(options.fileName || document.title, "pptx"),
  };
}

export async function downloadSummaryPptx(input, options = {}) {
  const result = await createSummaryPptx(input, options);
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
