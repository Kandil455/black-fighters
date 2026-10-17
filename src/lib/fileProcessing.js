import { extractFileInWorker, supportsFileWorker } from './fileWorkerClient';

export const TEXT_EXTENSIONS = ['txt', 'csv', 'html', 'htm', 'md', 'rtf'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'];
export const EXTRACTABLE_EXTENSIONS = [...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS, 'pdf', 'docx', 'pptx'];

// Single-pass extraction memoization & in-flight deduplication cache
// Guarantees any uploaded lecture file is processed ONCE and never re-parsed or re-OCR'd.
const EXTRACTION_CACHE = new Map();
const IN_FLIGHT_EXTRACTIONS = new Map();

function getFileCacheKey(file) {
  if (!file || typeof file !== 'object') return '';
  return `${file.name || 'unnamed'}:${file.size || 0}:${file.lastModified || 0}`;
}

export function clearExtractionCache() {
  EXTRACTION_CACHE.clear();
  IN_FLIGHT_EXTRACTIONS.clear();
}

export function getExt(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeXmlText(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function joinPdfTextItems(items = []) {
  let out = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const str = item?.str || '';
    if (!str) {
      if (item?.hasEOL && !out.endsWith('\n')) out += '\n';
      continue;
    }
    if (!out || out.endsWith('\n') || out.endsWith(' ')) {
      out += str;
    } else {
      const prevChar = out[out.length - 1];
      const nextChar = str[0];
      const bothArabic = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(prevChar) &&
        /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(nextChar);
      if (bothArabic && str.length <= 2) {
        out += str;
      } else {
        out += ' ' + str;
      }
    }
    if (item?.hasEOL && !out.endsWith('\n')) {
      out += '\n';
    }
  }
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

const PDF_CMAP_CONFIG = {
  cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
};

async function extractPdfTextClient(fileOrBuffer, onProgress) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer.slice(0)
    : await fileOrBuffer.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    ...PDF_CMAP_CONFIG,
    useSystemFonts: true,
    disableFontFace: false,
    isEvalSupported: false,
  });

  const pages = [];

  try {
    const pdf = await loadingTask.promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = joinPdfTextItems(content.items);
      if (text.length > 10) pages.push(`[صفحة ${i}]\n${text}`);
      page.cleanup();
      onProgress?.({ current: i, total: pdf.numPages, phase: 'extract' });
    }
  } finally {
    await loadingTask.destroy().catch(() => {});
  }

  if (!pages.length) throw new Error('scanned_pdf');
  return pages.join('\n\n');
}

async function extractDocxTextClient(fileOrBuffer) {
  const mammoth = await import('mammoth');
  const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer.slice(0)
    : await fileOrBuffer.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

async function extractPptxTextClient(fileOrBuffer, onProgress) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(fileOrBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0));

  const slides = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const name = slideFiles[i];
    const xml = await zip.files[name].async('string');
    const parts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => decodeXmlText(m[1]).trim()).filter(Boolean);
    if (parts.length) slides.push(`[Slide ${slides.length + 1}]\n${parts.join('\n')}`);
    onProgress?.({ current: i + 1, total: slideFiles.length, phase: 'extract' });
  }
  return slides.join('\n\n').trim();
}

export async function extractTextFromFile(file, { onProgress } = {}) {
  if (!file) throw new Error('اختار ملف الأول');
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('حجم الملف كبير جداً (الحد الأقصى هو 50 ميجابايت). يُرجى اختيار ملف أصغر حجماً لضمان سرعة واستقرار المعالجة.');
  }

  const cacheKey = getFileCacheKey(file);
  if (cacheKey && EXTRACTION_CACHE.has(cacheKey)) {
    const cachedText = EXTRACTION_CACHE.get(cacheKey);
    onProgress?.({ current: 100, total: 100, phase: 'cached' });
    return cachedText;
  }

  if (cacheKey && IN_FLIGHT_EXTRACTIONS.has(cacheKey)) {
    return IN_FLIGHT_EXTRACTIONS.get(cacheKey);
  }

  const extractionPromise = (async () => {
    const ext = getExt(file.name);
    let resultText = '';

    if (TEXT_EXTENSIONS.includes(ext)) {
      resultText = await file.text();
      onProgress?.({ current: 100, total: 100, phase: 'extract' });
      if (!resultText?.trim()) throw new Error('الملف النصي فاضي');
    } else if (IMAGE_EXTENSIONS.includes(ext) || file.type?.startsWith('image/')) {
      const { recognizeImageFile } = await import('./ocr');
      resultText = await recognizeImageFile(file, {
        onProgress: (percent) => onProgress?.({ current: percent, total: 100, phase: 'ocr' }),
      });
      if (!resultText?.trim()) throw new Error('معرفناش نقرأ نص واضح من الصورة — جرّب صورة أوضح أو الصق النص مباشرة');
    } else if (!EXTRACTABLE_EXTENSIONS.includes(ext)) {
      throw new Error(`نوع الملف .${ext} مش مدعوم للقراءة النصية`);
    } else {
      // Read the binary buffer ONCE and reuse it across worker or fallback paths
      const sharedBuffer = await file.arrayBuffer();

      try {
        if (supportsFileWorker()) {
          try {
            resultText = await extractFileInWorker(sharedBuffer, ext, onProgress);
          } catch (workerError) {
            if (workerError.message === 'scanned_pdf') throw workerError;
            console.warn('File worker failed; using the compatibility path:', workerError);
          }
        }
        if (!resultText) {
          if (ext === 'pdf') {
            resultText = await extractPdfTextClient(sharedBuffer, onProgress);
          } else if (ext === 'docx') {
            resultText = await extractDocxTextClient(sharedBuffer);
          } else if (ext === 'pptx') {
            resultText = await extractPptxTextClient(sharedBuffer, onProgress);
          }
        }

        // Only trigger OCR fallback when PDF genuinely lacks digital text or has corrupted CID fonts
        const { isGarbledOrCorruptedText } = await import('./imageFilter');
        if (ext === 'pdf' && (!resultText || resultText.trim().length < 40 || isGarbledOrCorruptedText(resultText))) {
          throw new Error('scanned_pdf');
        }
      } catch (clientErr) {
        if (clientErr.message === 'scanned_pdf' && ext === 'pdf') {
          const { recognizePdfFile } = await import('./ocr');
          resultText = await recognizePdfFile(file, {
            onProgress: (percent, page, totalPages) => onProgress?.({
              current: page || percent,
              total: totalPages || 100,
              phase: 'ocr',
            }),
          });
          if (!resultText?.trim()) {
            throw new Error('الملف ممسوح ضوئياً (Scanned) أو صوره غير واضحة للتعرف البصري — جرّب نسخة واضحة رقمية أو الصق النص مباشرة.');
          }
        } else {
          throw new Error(clientErr?.message?.includes('password')
            ? 'الملف محمي بكلمة مرور — يُرجى إزالة الحماية أولاً.'
            : 'تعذر استخراج النص تلقائياً من الملف — تأكد أن الملف سليم أو استخدم خيار لصق النص يدوياً.');
        }
      }
    }

    // Enforce 50,000 characters limit safely without crashing
    if (resultText && resultText.length > 50000) {
      resultText = resultText.slice(0, 50000);
    }

    if (cacheKey && resultText) {
      if (EXTRACTION_CACHE.size >= 15) {
        const oldestKey = EXTRACTION_CACHE.keys().next().value;
        if (oldestKey) EXTRACTION_CACHE.delete(oldestKey);
      }
      EXTRACTION_CACHE.set(cacheKey, resultText);
    }

    return resultText;
  })();

  if (cacheKey) {
    IN_FLIGHT_EXTRACTIONS.set(cacheKey, extractionPromise);
  }

  try {
    return await extractionPromise;
  } finally {
    if (cacheKey) {
      IN_FLIGHT_EXTRACTIONS.delete(cacheKey);
    }
  }
}

function parsePageRanges(input, pageCount) {
  if (!input?.trim()) return Array.from({ length: pageCount }, (_, i) => i);
  const selected = new Set();
  for (const rawPart of input.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error('صيغة الصفحات غلط — مثال صحيح: 1-3,5');
    const start = Number(m[1]);
    const end = Number(m[2] || m[1]);
    if (start < 1 || end < start || end > pageCount) {
      throw new Error(`أرقام الصفحات لازم تكون بين 1 و ${pageCount}`);
    }
    for (let p = start; p <= end; p++) selected.add(p - 1);
  }
  return [...selected].sort((a, b) => a - b);
}

async function canvasJpeg(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) return reject(new Error('فشل تحويل الصفحة لصورة'));
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, 'image/jpeg', quality));
}

async function rasterizePdf(file, { scale, quality, onProgress }) {
  const [{ PDFDocument }, pdfjsLib] = await Promise.all([import('pdf-lib'), import('pdfjs-dist')]);
  (await import('./pdfWorkerSetup.js')).ensurePdfWorker(pdfjsLib);
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
  const out = await PDFDocument.create();
  try {
    for (let index = 1; index <= pdf.numPages; index++) {
      const sourcePage = await pdf.getPage(index);
      const natural = sourcePage.getViewport({ scale: 1 });
      const viewport = sourcePage.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await sourcePage.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport, background: 'white' }).promise;
      const jpg = await out.embedJpg(await canvasJpeg(canvas, quality));
      const target = out.addPage([natural.width, natural.height]);
      target.drawImage(jpg, { x: 0, y: 0, width: natural.width, height: natural.height });
      canvas.width = 1; canvas.height = 1;
      sourcePage.cleanup();
      onProgress?.({ current: index, total: pdf.numPages });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return await out.save({ useObjectStreams: true });
  } finally {
    await pdf.destroy();
  }
}

export async function runPdfOperation({ operation, files, pages = '', angle = 90, compressionMode = 'preserve', watermark = '', onProgress }) {
  const { PDFDocument, degrees } = await import('pdf-lib');

  if (!files?.length) throw new Error('اختار ملف الأول');

  if (operation === 'imagePdf') {
    const out = await PDFDocument.create();
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = getExt(file.name);
      const img = ext === 'png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
      const maxW = 595.28, maxH = 841.89; // A4 points
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      const page = out.addPage([Math.max(w, 1), Math.max(h, 1)]);
      page.drawImage(img, { x: 0, y: 0, width: w, height: h });
    }
    return [{ filename: 'images.pdf', bytes: await out.save({ useObjectStreams: true }) }];
  }

  if (operation === 'pdfToImages') {
    const pdfjsLib = (await import('./pdfWorkerSetup.js')).ensurePdfWorker(await import('pdfjs-dist'));
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(await files[0].arrayBuffer()),
      disableWorker: true,
      isEvalSupported: false,
    }).promise;
    const outputs = [];
    try {
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport, background: 'white' }).promise;
        outputs.push({ filename: `page-${index}.jpg`, bytes: await canvasJpeg(canvas, 0.82), type: 'image/jpeg' });
        page.cleanup();
        onProgress?.({ current: index, total: pdf.numPages });
      }
      return outputs;
    } finally {
      await pdf.destroy();
    }
  }

  if (operation === 'merge') {
    if (files.length < 2) throw new Error('اختار ملفين PDF على الأقل للدمج');
    const out = await PDFDocument.create();
    for (const file of files) {
      if (getExt(file.name) !== 'pdf') throw new Error('الدمج يدعم PDF فقط');
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const copied = await out.copyPages(src, src.getPageIndices());
      copied.forEach(p => out.addPage(p));
    }
    return [{ filename: 'merged.pdf', bytes: await out.save({ useObjectStreams: true }) }];
  }

  const file = files[0];
  if (getExt(file.name) !== 'pdf') throw new Error('الأداة دي تحتاج ملف PDF');
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const pageCount = src.getPageCount();
  const selected = parsePageRanges(pages, pageCount);

  if (operation === 'split') {
    const outputs = [];
    for (let i = 0; i < pageCount; i++) {
      const out = await PDFDocument.create();
      const [page] = await out.copyPages(src, [i]);
      out.addPage(page);
      outputs.push({ filename: `page-${i + 1}.pdf`, bytes: await out.save({ useObjectStreams: true }) });
    }
    return outputs;
  }

  if (operation === 'extract') {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, selected);
    copied.forEach(p => out.addPage(p));
    return [{ filename: 'extracted-pages.pdf', bytes: await out.save({ useObjectStreams: true }) }];
  }

  if (operation === 'remove') {
    const remove = new Set(selected);
    const keep = src.getPageIndices().filter(i => !remove.has(i));
    if (!keep.length) throw new Error('مينفعش تحذف كل الصفحات');
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, keep);
    copied.forEach(p => out.addPage(p));
    return [{ filename: 'pages-removed.pdf', bytes: await out.save({ useObjectStreams: true }) }];
  }

  if (operation === 'rotate') {
    const rotateSet = new Set(pages?.trim() ? selected : src.getPageIndices());
    src.getPages().forEach((page, i) => {
      if (rotateSet.has(i)) page.setRotation(degrees(Number(angle) || 90));
    });
    return [{ filename: 'rotated.pdf', bytes: await src.save({ useObjectStreams: true }) }];
  }

  if (operation === 'reorder') {
    const requested = String(pages || '').split(',').map((value) => Number(value.trim()) - 1);
    if (requested.length !== pageCount || requested.some((value) => !Number.isInteger(value) || value < 0 || value >= pageCount) || new Set(requested).size !== pageCount) {
      throw new Error(`اكتب ترتيب كل الصفحات مرة واحدة من 1 إلى ${pageCount}، مثال: 3,1,2`);
    }
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, requested);
    copied.forEach((page) => out.addPage(page));
    return [{ filename: 'reordered.pdf', bytes: await out.save({ useObjectStreams: true }) }];
  }

  if (operation === 'pageNumbers') {
    const pagesList = src.getPages();
    pagesList.forEach((page, index) => {
      const { width } = page.getSize();
      page.drawText(String(index + 1), { x: width / 2 - 4, y: 18, size: 10, opacity: 0.7 });
      if (watermark?.trim()) page.drawText(watermark.trim().replace(/[^\x20-\x7E]/g, ''), { x: 24, y: 18, size: 8, opacity: 0.45 });
    });
    return [{ filename: 'numbered.pdf', bytes: await src.save({ useObjectStreams: true }) }];
  }

  if (operation === 'compress') {
    if (compressionMode === 'preserve') {
      return [{ filename: 'optimized-text.pdf', bytes: await src.save({ useObjectStreams: true, addDefaultPage: false }) }];
    }
    let bytes = await rasterizePdf(file, { scale: 1.2, quality: 0.62, onProgress });
    if (bytes.length > 3 * 1024 * 1024) {
      bytes = await rasterizePdf(file, { scale: 0.9, quality: 0.45, onProgress });
    }
    return [{ filename: 'compressed-under-3mb.pdf', bytes }];
  }

  throw new Error(`أداة غير معروفة: ${operation}`);
}

export function downloadBytes(bytes, filename, type = 'application/pdf') {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
