/**
 * src/features/lectures/export/exportHtml.js — Standalone HTML download helper (Section 14.1).
 */
import { renderDocToHtml } from "./renderDocToHtml.js";

export function sanitizeFilenameSlug(title = "lecture") {
  const cleaned = String(title || "lecture")
    .trim()
    .replace(/[\\/:*?"<>|#%&{}$!'`@+=]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return cleaned || "lecture";
}

export function buildExportFilename(title = "lecture", dateStr = "", ext = "html") {
  const slug = sanitizeFilenameSlug(title);
  const datePart = dateStr || new Date().toISOString().slice(0, 10);
  const cleanExt = String(ext || "html").replace(/^\./, "");
  return `${slug}-${datePart}.${cleanExt}`;
}

export function downloadStandaloneHtml(model, options = {}) {
  const html = renderDocToHtml(model, options);
  const filename = buildExportFilename(
    model?.meta?.title || "lecture",
    options.exportDate || model?.meta?.date,
    "html",
  );

  if (typeof document !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
    const blob = new Blob(["\uFEFF" + html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { filename, html };
}

export default {
  sanitizeFilenameSlug,
  buildExportFilename,
  downloadStandaloneHtml,
};
