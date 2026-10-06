import {
  createSummaryPdfV2,
  downloadSummaryPdfV2,
  estimateSummaryPdfSize,
} from "./summaryPdfV2.js";

/**
 * Legacy-compatible API used by PdfTextResult. New callers should use
 * createSummaryPdfV2 so they can inspect page count, warnings and estimates.
 */
export async function createSummaryPdf(options = {}) {
  const result = await createSummaryPdfV2(options, options);
  return result.blob;
}

/** Preserves the old numeric size return value. */
export async function downloadSummaryPdf(options = {}) {
  const result = await downloadSummaryPdfV2(options, options);
  return result.size;
}

export {
  createSummaryPdfV2,
  downloadSummaryPdfV2,
  estimateSummaryPdfSize,
};
