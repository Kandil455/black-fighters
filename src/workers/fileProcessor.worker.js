import { splitCourseText } from "@/lib/courseChunking";
import { ensurePdfWorker } from "../lib/pdfWorkerSetup.js";

const PDF_CMAP_CONFIG = {
  cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/",
};

function decodeXmlText(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

async function extractPdf(buffer) {
  const pdfjs = await import("pdfjs-dist");
  ensurePdfWorker(pdfjs);
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    ...PDF_CMAP_CONFIG,
    useSystemFonts: true,
    disableFontFace: false,
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str || "").join(" ").trim();
    if (text.length > 10) pages.push(`[صفحة ${i}]\n${text}`);
    page.cleanup();
    self.postMessage({ type: "progress", progress: Math.round((i / pdf.numPages) * 100), current: i, total: pdf.numPages });
  }
  await pdf.destroy();
  if (!pages.length) throw new Error("scanned_pdf");
  return pages.join("\n\n");
}

async function extractDocx(buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return String(result.value || "").trim();
}

async function extractPptx(buffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));
  const slides = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const parts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXmlText(match[1]).trim())
      .filter(Boolean);
    if (parts.length) slides.push(`[Slide ${i + 1}]\n${parts.join("\n")}`);
    self.postMessage({ type: "progress", progress: Math.round(((i + 1) / Math.max(1, slideFiles.length)) * 100), current: i + 1, total: slideFiles.length });
  }
  return slides.join("\n\n").trim();
}

self.onmessage = async ({ data }) => {
  const { id, task } = data;
  try {
    let result;
    if (task === "chunk") {
      result = splitCourseText(data.text, data.maxChars);
    } else if (task === "extract") {
      if (data.ext === "pdf") result = await extractPdf(data.buffer);
      else if (data.ext === "docx") result = await extractDocx(data.buffer);
      else if (data.ext === "pptx") result = await extractPptx(data.buffer);
      else throw new Error(`unsupported_worker_format:${data.ext}`);
    } else {
      throw new Error(`unknown_worker_task:${task}`);
    }
    self.postMessage({ type: "result", id, result });
  } catch (error) {
    self.postMessage({ type: "error", id, error: error?.message || String(error) });
  }
};
