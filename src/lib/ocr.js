/**
 * ocr.js — High Performance Visual OCR Engine
 * Uses Gemini Flash Lite Multimodal AI for instant (<1s per page) accurate OCR
 * with automatic fallback to Tesseract.js if offline or API quota depleted.
 */

import { ocrImageWithVisionAI } from "./imageFilter.js";

/**
 * Convert File/Blob to Base64 Data URL
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Recognize text from an image file (PNG, JPG, WebP)
 * Tries fast Gemini Flash Lite Multimodal AI first, then falls back to Tesseract.
 */
export async function recognizeImageFile(file, { onProgress, signal } = {}) {
  if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");

  // 1. Primary: Lightning-fast AI Vision OCR (1 second response time)
  try {
    onProgress?.(25);
    const dataUrl = await fileToDataUrl(file);
    if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
    
    onProgress?.(50);
    const aiText = await ocrImageWithVisionAI(dataUrl, {
      model: "gemini-3.5-flash-lite",
      max_tokens: 2500,
    });

    if (aiText && aiText.trim().length > 0) {
      onProgress?.(100);
      return aiText.trim();
    }
  } catch (aiErr) {
    if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
    console.warn("[OCR] Fast AI vision OCR failed, attempting Tesseract fallback:", aiErr?.message);
  }

  // 2. Secondary Fallback: In-browser Tesseract.js worker
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["ara", "eng"], 1, {
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress?.(Math.round((message.progress || 0) * 100));
      }
    },
  });

  try {
    if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
    const result = await worker.recognize(file);
    return result?.data?.text?.trim() || "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Recognize text from a PDF file by rendering pages to visual canvases
 * and running visual OCR directly on the pixels (ideal for scanned, corrupted, or non-digital PDFs).
 */
export async function recognizePdfFile(file, { onProgress, signal } = {}) {
  if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");

  const pdfjs = (await import("./pdfWorkerSetup.js")).ensurePdfWorker(await import("pdfjs-dist"));
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableWorker: true,
    isEvalSupported: false,
  }).promise;

  const maxOcrPages = Math.min(pdf.numPages, 20);
  const pagesText = new Array(maxOcrPages);

  // Lazy-loaded Tesseract worker instance if needed for fallback
  let tesseractWorker = null;
  const getTesseractWorker = async () => {
    if (!tesseractWorker) {
      const { createWorker } = await import("tesseract.js");
      tesseractWorker = await createWorker(["ara", "eng"]);
    }
    return tesseractWorker;
  };

  try {
    // Process in lightweight chunks of 2 pages for optimal parallelism and speed
    const CHUNK_SIZE = 2;
    for (let i = 1; i <= maxOcrPages; i += CHUNK_SIZE) {
      if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");

      const pageIndices = [];
      for (let j = i; j < i + CHUNK_SIZE && j <= maxOcrPages; j++) {
        pageIndices.push(j);
      }

      await Promise.all(
        pageIndices.map(async (pageIndex) => {
          let page = null;
          try {
            page = await pdf.getPage(pageIndex);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext("2d");
            await page.render({ canvasContext: ctx, viewport }).promise;

            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

            // Try fast AI vision OCR first
            let pageResult = "";
            try {
              pageResult = await ocrImageWithVisionAI(dataUrl, {
                model: "gemini-3.5-flash-lite",
                max_tokens: 2000,
              });
            } catch (pageAiErr) {
              console.warn(`[OCR Page ${pageIndex}] AI Vision failed:`, pageAiErr?.message);
            }

            // Fallback to Tesseract if AI vision failed
            if (!pageResult || pageResult.trim().length === 0) {
              try {
                const tw = await getTesseractWorker();
                const res = await tw.recognize(canvas);
                pageResult = res?.data?.text?.trim() || "";
              } catch (tessErr) {
                console.warn(`[OCR Page ${pageIndex}] Tesseract failed:`, tessErr?.message);
              }
            }

            pagesText[pageIndex - 1] = `[صفحة ${pageIndex}]\n${pageResult.trim()}`;
            page.cleanup();
          } catch (err) {
            console.warn(`[OCR Page ${pageIndex}] Page processing error:`, err);
            pagesText[pageIndex - 1] = `[صفحة ${pageIndex}]\n(تعذر قراءة محتوى الصفحة)`;
          } finally {
            const completedCount = pagesText.filter(Boolean).length;
            onProgress?.(Math.round((completedCount / maxOcrPages) * 100), completedCount, maxOcrPages);
          }
        })
      );
    }

    return pagesText.filter(Boolean).join("\n\n");
  } finally {
    if (tesseractWorker) {
      await tesseractWorker.terminate().catch(() => {});
    }
    await pdf.destroy().catch(() => {});
  }
}

/**
 * Universal file OCR dispatcher
 */
export async function recognizeFile(file, options) {
  const isPdf = file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
  return isPdf ? recognizePdfFile(file, options) : recognizeImageFile(file, options);
}
