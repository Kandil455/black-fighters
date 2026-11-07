/**
 * src/features/lectures/export/exportText.js — Plain text (.txt) and Markdown (.md)
 * verbatim export with approximate ~mm:ss time markers and gap notes (Section 14.3).
 */
import { formatTimeMarker } from "../ui/buildDocModel.js";
import { buildExportFilename } from "./exportHtml.js";

export function renderPlainText(model = {}, options = {}) {
  const { includeOfftopic = true, includeTimestamps = true } = options;
  const meta = model?.meta || {};
  const lines = [];

  lines.push(meta.title || "محاضرة بدون عنوان");
  if (meta.subject) lines.push(`المادة: ${meta.subject}`);
  if (meta.lecturer) lines.push(`المحاضر: ${meta.lecturer}`);
  if (meta.date) lines.push(`التاريخ: ${meta.date}`);
  lines.push("=".repeat(50));
  lines.push("");

  for (const g of model?.gaps || []) {
    lines.push(
      `[⚠️ ${
        g.labelAr ||
        `مقطع غير مفرّغ من ${formatTimeMarker(g.fromSec)} إلى ${formatTimeMarker(g.toSec)}`
      }]`,
    );
  }
  if ((model?.gaps || []).length > 0) lines.push("");

  for (const sec of model?.sections || []) {
    if (!includeOfftopic && sec.isOfftopicOnly) continue;
    const prefix = sec.showNumber && sec.sectionNumber ? `${sec.sectionNumber}. ` : "";
    const timeStr = includeTimestamps ? ` (~${formatTimeMarker(sec.approxStartSec)})` : "";
    lines.push(`${prefix}${sec.title}${timeStr}`);
    lines.push("-".repeat(30));

    for (const p of sec.paragraphs || []) {
      const sents = (p.sentences || []).filter((s) => includeOfftopic || !s.isOfftopic);
      if (sents.length > 0) {
        lines.push(sents.map((s) => s.text).join(" "));
        lines.push("");
      }
    }
  }

  return lines.join("\n").trim() + "\n";
}

export function renderMarkdownText(model = {}, options = {}) {
  const { includeOfftopic = true, includeTimestamps = true } = options;
  const meta = model?.meta || {};
  const lines = [];

  lines.push(`# ${meta.title || "محاضرة بدون عنوان"}`);
  const metaParts = [];
  if (meta.subject) metaParts.push(`**المادة:** ${meta.subject}`);
  if (meta.lecturer) metaParts.push(`**المحاضر:** ${meta.lecturer}`);
  if (meta.date) metaParts.push(`**التاريخ:** ${meta.date}`);
  if (metaParts.length > 0) lines.push(metaParts.join(" | "));
  lines.push("");

  for (const g of model?.gaps || []) {
    lines.push(
      `> ⚠️ **${
        g.labelAr ||
        `مقطع غير مفرّغ من ${formatTimeMarker(g.fromSec)} إلى ${formatTimeMarker(g.toSec)}`
      }**`,
    );
    lines.push("");
  }

  for (const sec of model?.sections || []) {
    if (!includeOfftopic && sec.isOfftopicOnly) continue;
    const prefix = sec.showNumber && sec.sectionNumber ? `${sec.sectionNumber}. ` : "";
    const timeStr = includeTimestamps ? ` \`~${formatTimeMarker(sec.approxStartSec)}\`` : "";
    lines.push(`## ${prefix}${sec.title}${timeStr}`);
    lines.push("");

    for (const p of sec.paragraphs || []) {
      const sents = (p.sentences || []).filter((s) => includeOfftopic || !s.isOfftopic);
      if (sents.length > 0) {
        lines.push(sents.map((s) => s.text).join(" "));
        lines.push("");
      }
    }
  }

  return lines.join("\n").trim() + "\n";
}

export function downloadTextExport(model, { format = "txt", ...options } = {}) {
  const isMd = format === "md" || format === "markdown";
  const content = isMd ? renderMarkdownText(model, options) : renderPlainText(model, options);
  const ext = isMd ? "md" : "txt";
  const filename = buildExportFilename(model?.meta?.title || "lecture", model?.meta?.date, ext);

  if (typeof document !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
    const mime = isMd ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
    const blob = new Blob(["\uFEFF" + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { filename, content };
}

export default {
  renderPlainText,
  renderMarkdownText,
  downloadTextExport,
};
