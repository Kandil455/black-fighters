// Single place that guarantees pdf.js always knows where its worker lives,
// even when getDocument runs with disableWorker (fake-worker fallback needs it).
export function ensurePdfWorker(pdfjs) {
  const opts = pdfjs?.GlobalWorkerOptions;
  if (opts && !opts.workerSrc) {
    try {
      opts.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    } catch {
      opts.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    }
  }
  return pdfjs;
}
