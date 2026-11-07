/**
 * summaryFigures.js — pulls lecture figures out of the source PDF, uploads the
 * best ones, and attaches them to the saved summary so SummaryView can render
 * the images beside the sections that discuss them.
 *
 * Skeleton: extract (pdfjs) → pick (big, diverse, capped) → compress (canvas)
 * → upload (server media endpoint) → persist (GeneratedContent.content.figures).
 * Everything is fire-and-forget by design and never blocks course saving.
 */
import { extractImagesFromPdf, extractImagesFromFile, blobToDataUrl } from "./imageExtractor.js";
import { uploadMedia } from "./mediaUpload.js";

export const MAX_SUMMARY_FIGURES = 24;
const MAX_PER_PAGE = 2;
const MIN_AREA_PX = 90_000; // ≈ 300×300 — skips logos & tiny icons
const MAX_SIDE = 1100;
const JPEG_QUALITY = 0.74;
const MAX_UPLOAD_BYTES = 900 * 1024; // keep well under the 3.5MB media cap

/** Keep at most `perPage` images per page, prefer the biggest, keep page order. */
export function pickTopFigures(extracted = [], { max = MAX_SUMMARY_FIGURES, perPage = MAX_PER_PAGE } = {}) {
  const candidates = (Array.isArray(extracted) ? extracted : [])
    .filter((img) => {
      const w = Number(img?.width) || 0;
      const h = Number(img?.height) || 0;
      return w * h >= MIN_AREA_PX;
    })
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));

  const byPage = new Map();
  for (const img of candidates) {
    const page = Number(img?.pageOrSlideNumber) || 0;
    const list = byPage.get(page) || [];
    if (list.length < perPage) {
      list.push(img);
      byPage.set(page, list);
    }
  }
  const chosen = [...byPage.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([, list]) => list);

  // If the biggest-first selection over-shot, trim from the smallest end.
  return chosen.slice(0, Math.max(max, 1));
}

/** Downscale a blob to JPEG within maxSide/quality via a canvas. */
async function compressImageBlob(blob, maxSide = MAX_SIDE, quality = JPEG_QUALITY) {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const out = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!out) return blob;
    return out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

/**
 * Full pipeline: PDF file → figures persisted on the GeneratedContent row.
 * Safe to call detached (no await) — errors are logged, never thrown.
 *
 * @returns {Promise<{attached: number}>}
 */
export async function attachPdfFiguresToSummary({ file, GeneratedContent, contentId, contentJson, onProgress = () => {} }) {
  if (!file || !GeneratedContent || !contentId) return { attached: 0 };
  try {
    onProgress("extract");
    const extracted = await extractImagesFromPdf(file, () => {});
    const chosen = pickTopFigures(extracted);
    if (!chosen.length) return { attached: 0 };

    onProgress("upload");
    const figures = [];
    for (let i = 0; i < chosen.length; i += 1) {
      const img = chosen[i];
      try {
        let blob = img.imageBlob;
        if (blob && blob.size > MAX_UPLOAD_BYTES) {
          blob = await compressImageBlob(blob);
        }
        if (!blob) continue;
        let url = "";
        try {
          url = await uploadMedia(blob, {});
        } catch {
          const compact = await compressImageBlob(blob, 780, 0.62);
          url = await blobToDataUrl(compact);
        }
        if (!url) continue;
        onProgress("upload", { current: i + 1, total: chosen.length });
        figures.push({
          page: Number(img.pageOrSlideNumber) || 0,
          url,
          width: img.width || 0,
          height: img.height || 0,
          caption: String(img.contextText || "").slice(0, 160),
        });
      } catch (err) {
        console.warn(`[summaryFigures] upload failed for page ${img.pageOrSlideNumber}:`, err?.message);
      }
    }
    if (!figures.length) return { attached: 0 };

    onProgress("persist");
    const nextContent = { ...(contentJson || {}), figures };
    await GeneratedContent.update(contentId, { content: JSON.stringify(nextContent) });
    return { attached: figures.length };
  } catch (err) {
    console.warn("[summaryFigures] pipeline failed:", err?.message);
    return { attached: 0, error: err?.message };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * PAGE SNAPSHOT GUARANTEE PATH
 *
 * Real lecture PDFs are frequently scans / photo slides, so extractImagesFromPdf
 * finds no embedded raster images at all and the summary ends up with zero
 * figures. This path renders the PDF *pages themselves* to JPEG and attaches
 * those, so a summary always gets lecture visuals even when the source has no
 * extractable embedded images.
 * ──────────────────────────────────────────────────────────────────────────── */

/** How many page snapshots a single run may attach. */
export const MAX_PAGE_FIGURES = 12;
/** Hard cap for the persisted figures list (embedded figures + page snapshots). */
export const MAX_MERGED_FIGURES = 30;

const PAGE_SNAPSHOT_LONGEST_SIDE = 1100; // px on the long edge
const PAGE_SNAPSHOT_JPEG_QUALITY = 0.72;
const PDFJS_VERSION = "4.10.38";
const PDFJS_CMAP_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`;
const PDFJS_STANDARD_FONTS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`;

/** Coerce a value to a positive integer page number; 0 when unusable. */
function toPageNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

/** Coerce a figure cap to a non-negative integer, falling back when unusable. */
function toFigureLimit(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

/** A figure only renders if it carries a usable URL. */
function figureUrl(figure) {
  return typeof figure?.url === "string" ? figure.url.trim() : "";
}

/**
 * Which 1-based PDF pages should be snapshotted?
 *
 * - `requestedPages` (1-based) are de-duplicated, clamped to `numPages` and
 *   sorted; invalid entries (0, negatives, non-numeric) are dropped.
 * - When `requestedPages` is empty the first `min(max, numPages)` pages are the
 *   default candidates (the "guarantee" set).
 * - Pages already covered by an existing figure **with a URL** are skipped —
 *   url-less legacy entries do not cover a page, so that page is still targeted.
 * - Result is capped at `max`.
 *
 * Pure and synchronous: no PDF/DOM access, safe to unit test in Node.
 *
 * @param {{numPages?: number, requestedPages?: number[], existingFigures?: object[], max?: number}} [options]
 * @returns {number[]} sorted unique page numbers, 1-based
 */
export function pickPageSnapshotTargets({
  numPages,
  requestedPages = [],
  existingFigures = [],
  max = MAX_PAGE_FIGURES,
} = {}) {
  const totalPages = toPageNumber(numPages);
  if (!totalPages) return [];
  const limit = toFigureLimit(max, MAX_PAGE_FIGURES);
  if (limit <= 0) return [];

  const coveredPages = new Set();
  for (const figure of Array.isArray(existingFigures) ? existingFigures : []) {
    const page = toPageNumber(figure?.page);
    if (page && page <= totalPages && figureUrl(figure)) coveredPages.add(page);
  }

  // An explicit request that parses to nothing attaches nothing; only a truly
  // empty request falls back to the first-pages guarantee set.
  const requestedList = Array.isArray(requestedPages)
    ? requestedPages
    : requestedPages == null || requestedPages === ""
      ? []
      : [requestedPages];

  const candidates = [];
  if (requestedList.length > 0) {
    for (const value of requestedList) {
      const page = toPageNumber(value);
      if (page) candidates.push(Math.min(page, totalPages));
    }
  } else {
    const defaultCount = Math.min(limit, totalPages);
    for (let page = 1; page <= defaultCount; page += 1) candidates.push(page);
  }

  return [...new Set(candidates)]
    .filter((page) => !coveredPages.has(page))
    .sort((a, b) => a - b)
    .slice(0, limit);
}

/**
 * Merge freshly captured figures into the already-persisted ones.
 *
 * Existing figures always come first and win their page: an incoming figure is
 * only appended when its 1-based page is not already present. The merged list
 * is capped at `max`. Entries without a usable page (legacy data) are kept but
 * cannot block/dedupe anything. Inputs are never mutated.
 *
 * Pure and synchronous: no PDF/DOM access, safe to unit test in Node.
 *
 * @param {object[]} [existing]
 * @param {object[]} [incoming]
 * @param {{max?: number}} [options]
 * @returns {object[]}
 */
export function mergeFigureSets(existing = [], incoming = [], { max = MAX_MERGED_FIGURES } = {}) {
  const limit = toFigureLimit(max, MAX_MERGED_FIGURES);
  if (limit <= 0) return [];

  const merged = [];
  const usedPages = new Set();
  const append = (figure) => {
    if (merged.length >= limit) return;
    merged.push(figure);
    const page = toPageNumber(figure?.page);
    if (page) usedPages.add(page);
  };

  for (const figure of Array.isArray(existing) ? existing : []) append(figure);
  for (const figure of Array.isArray(incoming) ? incoming : []) {
    const page = toPageNumber(figure?.page);
    if (page && usedPages.has(page)) continue;
    append(figure);
  }
  return merged;
}

/** `contentJson` arrives as an object from callers, but tolerate a JSON string. */
function normalizeContentJson(contentJson) {
  if (typeof contentJson === "string") {
    try {
      const parsed = JSON.parse(contentJson);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return contentJson && typeof contentJson === "object" && !Array.isArray(contentJson)
    ? contentJson
    : {};
}

/** Long side ≈ PAGE_SNAPSHOT_LONGEST_SIDE, never below 1× and never above 2×. */
function pageSnapshotScale(viewport) {
  const longestSide = Math.max(Number(viewport?.width) || 0, Number(viewport?.height) || 0);
  if (!longestSide) return 1;
  return Math.min(2, Math.max(1, PAGE_SNAPSHOT_LONGEST_SIDE / longestSide));
}

/** Render one pdf.js page onto a white canvas and encode it as a JPEG blob. */
async function renderPageJpeg(page) {
  const viewport = page.getViewport({ scale: pageSnapshotScale(page.getViewport({ scale: 1 })) });
  const width = Math.max(1, Math.ceil(viewport.width));
  const height = Math.max(1, Math.ceil(viewport.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("canvas-2d-unavailable");
    // PDF pages draw on a transparent background — fill white first so the
    // resulting JPEG never has black/transparent corners.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    await page.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", PAGE_SNAPSHOT_JPEG_QUALITY)
    );
    if (!blob) throw new Error("page-jpeg-empty");
    return { blob, width, height };
  } finally {
    // Release the full-page backing store immediately — many page canvases at
    // ~2MP each add up fast on mobile.
    canvas.width = 1;
    canvas.height = 1;
  }
}

/**
 * Guarantee path: render the requested PDF pages as JPEG snapshots, upload them
 * and attach them to the saved summary as figures.
 *
 * Safe to call detached (fire-and-forget): never throws, logs and returns
 * `{ attached, error? }`. Pages are processed sequentially and the pdf document
 * is destroyed in `finally` so no 3-4× file-size buffer is retained.
 *
 * `contentJson` must be the CURRENT persisted summary JSON: its `figures` are
 * merged with the new page snapshots (existing figures win their page) instead
 * of being overwritten. `GeneratedContent` only needs an `update(id, payload)`
 * method.
 *
 * Note (this app's API adapter): `GeneratedContent.update()` routes through the
 * `save-generated-content` function, which requires `course_id` and
 * `content_type` in the payload. Pass `courseId` (and, if the row is not a
 * summary, `contentType`) so the persist step actually lands; without them the
 * update can be rejected server-side.
 *
 * @param {object} params
 * @param {File|Blob} params.file source PDF file
 * @param {{update: (id: string, payload: object) => Promise<unknown>}} params.GeneratedContent entity adapter
 * @param {string} params.contentId id of the GeneratedContent row to update
 * @param {object|string} params.contentJson current content JSON (may already include figures)
 * @param {string} [params.courseId] owning course id (needed by the app's entity adapter)
 * @param {string} [params.contentType="summary"] generated-content type for the adapter
 * @param {number[]} [params.pages=[]] 1-based pages to snapshot; empty → first `min(max, numPages)`
 * @param {number} [params.max=12] max page snapshots to attach in this run
 * @param {(phase: "render"|"upload"|"persist", progress?: {current: number, total: number}) => void} [params.onProgress]
 * @returns {Promise<{attached: number, error?: string}>}
 */
export async function attachPdfPageFiguresToSummary({
  file,
  GeneratedContent,
  contentId,
  contentJson,
  courseId,
  contentType = "summary",
  pages = [],
  max = MAX_PAGE_FIGURES,
  onProgress = () => {},
}) {
  const report = (phase, progress) => {
    try {
      if (typeof onProgress === "function") onProgress(phase, progress);
    } catch {
      /* progress callbacks must never break the pipeline */
    }
  };

  let loadingTask = null;
  try {
    if (!file || !GeneratedContent || !contentId) return { attached: 0 };

    const baseContent = normalizeContentJson(contentJson);
    const existingFigures = Array.isArray(baseContent.figures) ? baseContent.figures : [];

    // Lazy-load pdf.js here so this module stays cheap for every other caller.
    const pdfjs = await import("pdfjs-dist");
    const { ensurePdfWorker } = await import("./pdfWorkerSetup.js");
    ensurePdfWorker(pdfjs);

    const arrayBuffer = await file.arrayBuffer();
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: PDFJS_CMAP_URL,
      cMapPacked: true,
      standardFontDataUrl: PDFJS_STANDARD_FONTS_URL,
      useSystemFonts: true,
      disableFontFace: false,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;

    const targets = pickPageSnapshotTargets({
      numPages: pdf?.numPages,
      requestedPages: pages,
      existingFigures,
      max,
    });
    if (!targets.length) return { attached: 0 };

    // 1) Render requested pages → JPEG blobs. Sequential: PDF.js canvas work is
    //    expensive, and a parallel burst is what freezes low-end phones.
    const snapshots = [];
    for (let index = 0; index < targets.length; index += 1) {
      const pageNumber = targets[index];
      let page = null;
      try {
        page = await pdf.getPage(pageNumber);
        const snapshot = await renderPageJpeg(page);
        snapshots.push({ page: pageNumber, blob: snapshot.blob, width: snapshot.width, height: snapshot.height });
      } catch (err) {
        console.warn(`[summaryFigures] page ${pageNumber} snapshot failed:`, err?.message);
      } finally {
        try {
          page?.cleanup?.();
        } catch {
          /* page already released */
        }
        report("render", { current: index + 1, total: targets.length });
      }
    }
    if (!snapshots.length) return { attached: 0 };

    // 2) Upload the snapshots one by one, keeping going if a single upload fails.
    const uploadedFigures = [];
    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      try {
        let url = "";
        try {
          url = await uploadMedia(snapshot.blob, {});
        } catch {
          const compact = await compressImageBlob(snapshot.blob, 780, 0.58);
          url = await blobToDataUrl(compact);
        }
        if (!url) continue;
        uploadedFigures.push({
          page: snapshot.page,
          url,
          kind: "page",
          width: snapshot.width,
          height: snapshot.height,
          caption: "",
        });
      } catch (err) {
        console.warn(`[summaryFigures] page ${snapshot.page} upload failed:`, err?.message);
      } finally {
        report("upload", { current: index + 1, total: snapshots.length });
      }
    }
    if (!uploadedFigures.length) return { attached: 0 };

    // 3) Persist: existing figures stay first, snapshots only fill uncovered
    //    pages, total list capped at MAX_MERGED_FIGURES.
    report("persist");
    const uploadedPages = new Set(uploadedFigures.map((figure) => figure.page));
    // A legacy figure on the same page without a URL never renders, so let the
    // fresh snapshot replace that invisible placeholder instead of being skipped.
    const retainedFigures = existingFigures.filter(
      (figure) => figureUrl(figure) || !uploadedPages.has(toPageNumber(figure?.page))
    );
    const merged = mergeFigureSets(retainedFigures, uploadedFigures, { max: MAX_MERGED_FIGURES });
    const attached = merged.filter((figure) => uploadedFigures.includes(figure)).length;

    const updatePayload = {
      content: JSON.stringify({ ...baseContent, figures: merged }),
    };
    if (courseId) updatePayload.course_id = courseId;
    if (contentType) updatePayload.content_type = contentType;
    await GeneratedContent.update(contentId, updatePayload);

    return { attached };
  } catch (err) {
    console.warn("[summaryFigures] page snapshot pipeline failed:", err?.message);
    return { attached: 0, error: err?.message };
  } finally {
    try {
      await loadingTask?.destroy?.();
    } catch {
      /* document already released */
    }
  }
}

/**
 * Extracts embedded figures (and page snapshots as fallback) from a PDF/PPTX/Image file
 * into ready-to-render `{ page, url, width, height, caption }` objects for Summaries & Lectures.
 */
export async function extractQuickFiguresFromFile(file, { max = 10 } = {}) {
  if (!file) return [];
  try {
    const raw = await extractImagesFromFile(file, () => {});
    const chosen = pickTopFigures(raw, { max, perPage: 2 });
    const figures = [];
    for (const img of chosen) {
      let dataUrl = img.thumbnailDataUrl || "";
      if (!dataUrl && img.imageBlob) {
        const compact = await compressImageBlob(img.imageBlob, 820, 0.68);
        dataUrl = await blobToDataUrl(compact);
      }
      if (dataUrl) {
        figures.push({
          page: Number(img.pageOrSlideNumber) || 1,
          url: dataUrl,
          width: img.width || 0,
          height: img.height || 0,
          caption: String(img.contextText || "").slice(0, 160),
        });
      }
    }
    return figures;
  } catch (err) {
    console.warn("[summaryFigures] extractQuickFiguresFromFile warning:", err?.message);
    return [];
  }
}
