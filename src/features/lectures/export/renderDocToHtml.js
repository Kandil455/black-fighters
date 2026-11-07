/**
 * src/features/lectures/export/renderDocToHtml.js — Self-contained standalone HTML5 exporter (Section 14.1).
 *
 * Security Invariant:
 *   • Every dynamic string (title, subject, lecturer, section title, sentence text,
 *     term, annotation) passes through `escapeHtml` before insertion into the template.
 */
import { splitRuns } from "../text/bidi.js";
import { formatTimeMarker } from "../ui/buildDocModel.js";
import { buildDynamicStudySheet } from "../ai/dynamicLectureBuilder.js";

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

export function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

function renderBidiEscaped(text = "", runs = null) {
  const list = Array.isArray(runs) ? runs : splitRuns(String(text || ""));
  return list
    .map((r) =>
      r.dir === "ltr"
        ? `<bdi dir="ltr" class="en" style="unicode-bidi:isolate">${escapeHtml(r.text)}</bdi>`
        : escapeHtml(r.text),
    )
    .join("");
}

const STANDALONE_CSS = `
:root, [data-theme="light"] {
  --ink: #0f172a;
  --ink-muted: #475569;
  --paper: #f8fafc;
  --card: #ffffff;
  --border: #e2e8f0;
  --accent: #0d9488;
  --accent-soft: rgba(13, 148, 136, 0.1);
  --gold: #d97706;
  --gold-soft: rgba(245, 158, 11, 0.12);
  --warn: #e11d48;
  --warn-soft: rgba(225, 29, 72, 0.1);
}
[data-theme="dark"] {
  --ink: #f1f5f9;
  --ink-muted: #94a3b8;
  --paper: #090d16;
  --card: #111827;
  --border: #1e293b;
  --accent: #2dd4bf;
  --accent-soft: rgba(45, 212, 191, 0.12);
  --gold: #fbbf24;
  --gold-soft: rgba(251, 191, 36, 0.14);
  --warn: #fb7185;
  --warn-soft: rgba(251, 113, 133, 0.14);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px 16px 64px;
  direction: rtl;
  text-align: right;
  font-family: "Cairo", "Tajawal", "IBM Plex Sans Arabic", system-ui, Tahoma, sans-serif;
  font-size: 17px;
  line-height: 1.95;
  background: var(--paper);
  color: var(--ink);
}
.container {
  max-width: 760px;
  margin: 0 auto;
}
.header-card, .toc-card, .section-card, .summary-card, .glossary-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 28px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}
h1 { font-size: clamp(1.6rem, 2.4vw, 2.2rem); margin: 0 0 12px; line-height: 1.35; }
h2 { font-size: clamp(1.2rem, 1.8vw, 1.45rem); margin: 0 0 12px; line-height: 1.45; }
h3 { font-size: 1.05rem; margin: 16px 0 8px; }
p { margin: 0 0 0.95em; }
bdi.en, .en {
  direction: ltr;
  unicode-bidi: isolate;
  font-family: "Inter", "Plus Jakarta Sans", "JetBrains Mono", system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.95em;
  padding: 0 0.35em;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  display: inline-block;
  line-height: 1.5;
}
.meta-bar { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; color: var(--ink-muted); }
.badge { padding: 2px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 0.8rem; font-weight: 700; }
.callout { border-right: 4px solid var(--accent); background: var(--accent-soft); padding: 12px 16px; border-radius: 10px; margin: 10px 0; font-size: 0.92rem; }
.callout-exam { border-right-color: var(--gold); background: var(--gold-soft); }
.callout-warn { border-right-color: var(--warn); background: var(--warn-soft); }
.en-notes-box { direction: ltr; text-align: left; border-left: 4px solid #3b82f6; background: rgba(59, 130, 246, 0.08); padding: 14px 18px; border-radius: 12px; margin: 12px 0; font-family: "Inter", system-ui, sans-serif; font-size: 0.92rem; line-height: 1.75; }
.ar-notes-box { direction: rtl; text-align: right; border-right: 4px solid var(--accent); background: var(--accent-soft); padding: 14px 18px; border-radius: 12px; margin: 12px 0; font-size: 0.95rem; }
.gap-card { border: 2px dashed var(--gold); background: var(--gold-soft); padding: 14px 18px; border-radius: 12px; margin: 16px 0; font-weight: 700; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 8px; }
.btn { cursor: pointer; border: 1px solid var(--border); background: var(--card); color: var(--ink); padding: 6px 14px; border-radius: 10px; font-family: inherit; font-size: 0.85rem; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.9rem; }
th, td { border-bottom: 1px solid var(--border); padding: 10px; text-align: right; }
@media print {
  @page { size: A4; margin: 18mm 16mm; }
  .no-print { display: none !important; }
  body { background: #ffffff !important; color: #0f172a !important; padding: 0; }
  .container { max-width: 100% !important; }
  .section-card, .header-card, .toc-card, .summary-card, .glossary-card {
    box-shadow: none !important;
    break-inside: avoid-page;
  }
  thead { display: table-header-group; }
}
`;

const STANDALONE_JS = `
(function() {
  var themeBtn = document.getElementById('toggle-theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      var html = document.documentElement;
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
    });
  }
  var tocToggle = document.getElementById('toggle-toc-btn');
  var tocList = document.getElementById('toc-list');
  if (tocToggle && tocList) {
    tocToggle.addEventListener('click', function() {
      var hidden = tocList.style.display === 'none';
      tocList.style.display = hidden ? 'block' : 'none';
    });
  }
})();
`;

/**
 * Render a `docModel` (plus optional `studyNotes` and `summary`) to a standalone HTML5 string.
 *
 * @param {object} model - output of `buildDocModel`
 * @param {object} [options]
 * @returns {string}
 */
export function renderDocToHtml(model = {}, options = {}) {
  const {
    includeOfftopic = false,
    includeAnnotations = true,
    includeTimestamps = true,
    theme = "light",
    scope = "all", // 'transcript' | 'study' | 'summary' | 'all'
    studyNotes = null,
    summary = null,
    exportDate = new Date().toISOString().slice(0, 10),
  } = options;

  const meta = model?.meta || {};
  const title = escapeHtml(meta.title || "محاضرة بدون عنوان");
  const subject = escapeHtml(meta.subject || "");
  const lecturer = escapeHtml(meta.lecturer || "");
  const dateStr = escapeHtml(meta.date || exportDate);
  const safeTheme = theme === "dark" ? "dark" : "light";

  const sections = Array.isArray(model?.sections) ? model.sections : [];
  const gaps = Array.isArray(model?.gaps) ? model.gaps : [];
  const terms = Array.isArray(model?.terms) ? model.terms : [];

  const tocItemsHtml = (model?.toc || [])
    .map(
      (item) =>
        `<li><a href="#${escapeHtml(item.id)}" style="color:var(--accent);text-decoration:none;font-weight:600">${escapeHtml(
          item.sectionNumber ? `${item.sectionNumber}. ` : "",
        )}${escapeHtml(item.title)}</a> <span style="color:var(--ink-muted);font-size:0.8rem">(~${escapeHtml(
          formatTimeMarker(item.approxStartSec),
        )})</span></li>`,
    )
    .join("\n");

  const gapsHtml = gaps
    .map(
      (g) =>
        `<div class="gap-card">⚠️ ${escapeHtml(
          g.labelAr || `مقطع غير مفرّغ من ${formatTimeMarker(g.fromSec)} إلى ${formatTimeMarker(g.toSec)}`,
        )}</div>`,
    )
    .join("\n");

  const showTranscript = scope === "transcript" || scope === "all" || scope === "study";
  const sectionsHtml = showTranscript
    ? sections
        .filter((sec) => includeOfftopic || !sec.isOfftopicOnly)
        .map((sec) => {
          const paragraphsHtml = (sec.paragraphs || [])
            .map((p) => {
              const sents = (p.sentences || []).filter((s) => includeOfftopic || !s.isOfftopic);
              if (sents.length === 0) return "";
              const inner = sents
                .map(
                  (s) =>
                    `<span id="sentence-${escapeHtml(s.id)}">${renderBidiEscaped(
                      s.text,
                      s.runs,
                    )}</span>`,
                )
                .join(" ");
              return `<p>${inner}</p>`;
            })
            .filter(Boolean)
            .join("\n");

          const annotationsHtml =
            includeAnnotations && Array.isArray(sec.keyPointsRail) && sec.keyPointsRail.length > 0
              ? sec.keyPointsRail
                  .map((ann) => {
                    const cls =
                      ann.kind === "exam" || ann.kind === "exam_pearl"
                        ? "callout callout-exam"
                        : ann.kind === "warning"
                        ? "callout callout-warn"
                        : "callout";
                    return `<div class="${cls}"><strong>${escapeHtml(
                      ann.labelAr || ann.kind,
                    )}:</strong> ${renderBidiEscaped(ann.sentenceText || "")}</div>`;
                  })
                  .join("\n")
              : "";

          const timeChip = includeTimestamps
            ? `<span class="badge">~${escapeHtml(formatTimeMarker(sec.approxStartSec))}</span>`
            : "";

          return `<section id="${escapeHtml(sec.id)}" class="section-card">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">
    <h2>${sec.showNumber && sec.sectionNumber ? `${escapeHtml(sec.sectionNumber)}. ` : ""}${renderBidiEscaped(
            sec.title,
          )}</h2>
    <div>
      <span class="badge">${escapeHtml(sec.kindLabelAr || sec.kind || "")}</span>
      ${timeChip}
    </div>
  </div>
  ${paragraphsHtml}
  ${annotationsHtml}
</section>`;
        })
        .join("\n")
    : "";

  const summaryHtml =
    (scope === "summary" || scope === "all") && summary && Array.isArray(summary.main_points)
      ? `<section class="summary-card">
  <h2>الخلاصة والملخص</h2>
  ${(summary.main_points || [])
    .map(
      (mp) =>
        `<div class="callout"><strong>${renderBidiEscaped(mp.title || "")}:</strong> ${renderBidiEscaped(
          mp.text || "",
        )}</div>`,
    )
    .join("\n")}
</section>`
      : "";

  const studyNotesHtml =
    (scope === "study" || scope === "all") && studyNotes && Array.isArray(studyNotes.sections)
      ? `<section class="summary-card">
  <h2>نسخة المذاكرة المبسطة</h2>
  ${studyNotes.sections
    .map(
      (sn) => `<div style="margin-bottom:14px">
    <h3>${renderBidiEscaped(sn.title || sn.section_id || "")}</h3>
    <ul>
      ${[...(sn.basics || []), ...(sn.from_lecture || [])]
        .map(
          (b) =>
            `<li>${renderBidiEscaped(b.text || "")} <small style="color:var(--accent)">[${escapeHtml(
              b.sourceLabelAr || "من كلام الدكتور",
            )}]</small></li>`,
        )
        .join("\n")}
    </ul>
  </div>`,
    )
    .join("\n")}
</section>`
      : "";

  const dynamicSheet =
    scope === "study" || scope === "all"
      ? buildDynamicStudySheet(model, { studyNotes, summaryData: summary })
      : null;

  const bilingualStudyHtml =
    dynamicSheet && Array.isArray(dynamicSheet.studySections) && dynamicSheet.studySections.length > 0
      ? `<section class="summary-card">
  <h2>مذكرة المذاكرة الطبية المزدوجة (English Exam Notes + الشرح العربي)</h2>
  ${dynamicSheet.studySections
    .slice(0, 12)
    .map(
      (sec) => `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
    <h3>${renderBidiEscaped(sec.topicTitle || "")}</h3>
    ${
      Array.isArray(sec.englishMedicalNotes) && sec.englishMedicalNotes.length > 0
        ? `<div class="en-notes-box">
      <strong style="display:block;color:#2563eb;font-size:0.78rem;letter-spacing:0.05em;margin-bottom:6px">1. ENGLISH MEDICAL STUDY NOTES (FOR EXAMS)</strong>
      <ul style="margin:0;padding-left:18px">
        ${sec.englishMedicalNotes.map((en) => `<li>${escapeHtml(en)}</li>`).join("\n")}
      </ul>
    </div>`
        : ""
    }
    ${
      Array.isArray(sec.arabicExplanation) && sec.arabicExplanation.length > 0
        ? `<div class="ar-notes-box">
      <strong style="display:block;color:var(--accent);font-size:0.82rem;margin-bottom:6px">٢. الشرح والفهم بالعربي</strong>
      <ul style="margin:0;padding-right:18px">
        ${sec.arabicExplanation.map((ar) => `<li>${renderBidiEscaped(ar)}</li>`).join("\n")}
      </ul>
    </div>`
        : ""
    }
  </div>`,
    )
    .join("\n")}
</section>`
      : "";

  const glossaryList =
    dynamicSheet?.glossary?.length > 0 ? dynamicSheet.glossary : terms;

  const glossaryHtml =
    glossaryList.length > 0
      ? `<section class="glossary-card">
  <h2>قاموس التعريفات والمصطلحات الطبية (Medical Definitions Glossary)</h2>
  <table>
    <thead><tr><th>المصطلح الطبي (English Term)</th><th>التعريف والشرح بالعربي</th></tr></thead>
    <tbody>
      ${glossaryList
        .map(
          (t) =>
            `<tr><td><bdi dir="ltr" class="en">${escapeHtml(t.en || t.term || "")}</bdi></td><td>${escapeHtml(
              t.ar_hint || t.ar || "",
            )}</td></tr>`,
        )
        .join("\n")}
    </tbody>
  </table>
</section>`
      : "";

  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="${safeTheme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — تفريغ المحاضرة</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
  <style>${STANDALONE_CSS}</style>
</head>
<body>
  <div class="container">
    <div class="toolbar no-print">
      <button type="button" id="toggle-theme-btn" class="btn">تبديل الوضع الليلي/النهاري</button>
      <button type="button" onclick="window.print()" class="btn">طباعة / حفظ PDF</button>
    </div>

    <header class="header-card">
      <h1>${title}</h1>
      <div class="meta-bar">
        ${subject ? `<span>المادة: <strong>${subject}</strong></span>` : ""}
        ${lecturer ? `<span>المحاضر: <strong>${lecturer}</strong></span>` : ""}
        <span>التاريخ: <strong>${dateStr}</strong></span>
        <span>عدد الكلمات: <strong>${escapeHtml(meta.totalWords || 0)}</strong></span>
        ${meta.hasGaps ? `<span style="color:var(--gold)">⚠️ توجد مقاطع غير مفرّغة</span>` : ""}
      </div>
    </header>

    ${gapsHtml}

    ${
      tocItemsHtml
        ? `<nav class="toc-card" aria-label="فهرس المحاضرة">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2 style="margin:0">فهرس المحاضرة</h2>
        <button type="button" id="toggle-toc-btn" class="btn no-print">إظهار / إخفاء</button>
      </div>
      <ol id="toc-list" style="margin:12px 0 0;padding-right:20px;line-height:2">${tocItemsHtml}</ol>
    </nav>`
        : ""
    }

    ${summaryHtml}
    ${studyNotesHtml}
    ${bilingualStudyHtml}
    ${sectionsHtml}
    ${glossaryHtml}

    <footer style="text-align:center;font-size:0.8rem;color:var(--ink-muted);margin-top:32px">
      تم التصدير بتاريخ ${escapeHtml(exportDate)} — تفريغ حرفي مع الحفاظ على المصطلحات الإنجليزية
    </footer>
  </div>
  <script>${STANDALONE_JS}</script>
</body>
</html>`;
}

export default {
  escapeHtml,
  renderDocToHtml,
};
