/**
 * BLACK FIGHTERS V5 — المصدّر المستقل للـ HTML وحزم الكتب الضخمة (Section 2.3 & V4 7.5/22.4)
 * - Pure HTML renderer with strict entity escaping (zero XSS).
 * - <= 60 pages: Single standalone `.html` file (<= 400KB).
 * - > 60 pages: Multi-chapter ZIP bundle (`index.html` + `chapters/NN.html` + shared assets + search index)
 *   with relative offline links and no single file > 8MB.
 * - Reading works 100% with JS disabled; lightweight vanilla JS adds Declassify & Arabic search.
 */

import JSZip from "jszip";

export function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

export const ATLAS_STANDALONE_CSS = `
:root[data-theme='plate'], :root {
  --paper:#ECE7DC; --paper-2:#E2DCCD; --ink:#141414; --ink-2:#4A463E;
  --stamp:#B8121F; --rule:rgba(20,20,20,.18); --hl:#F2D24B55;
  --ink-def:#0F5934; --ink-imp:#6E4200; --ink-term:#0B4A73; --ink-ex:#7D2E06; --ink-warn:#B8121F;
}
:root[data-theme='night'] {
  --paper:#0C0C0D; --paper-2:#151517; --ink:#EDE8DC; --ink-2:#A9A397;
  --stamp:#FF3B4E; --rule:rgba(237,232,220,.16); --hl:#F2D24B33;
  --ink-def:#4CE095; --ink-imp:#F7C95C; --ink-term:#66B8FF; --ink-ex:#FF9F59; --ink-warn:#FF3B4E;
}
:root[data-theme='focus'] {
  --paper:#FFFFFF; --paper-2:#F2F2F2; --ink:#000000; --ink-2:#1F1F1F;
  --stamp:#990000; --rule:rgba(0,0,0,.42); --hl:#FFEB3B88;
}
:root[data-theme='cram'] .bf-doc { column-count:2; column-gap:24px; column-rule:1px solid var(--rule); font-size:14.5px; }
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.85 'Newsreader','Noto Naskh Arabic',Georgia,serif;}
h1,h2,h3{font-family:'Reem Kufi',system-ui,sans-serif;line-height:1.3;}
code,.mono,.bf-ref{font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-variant-numeric:tabular-nums;}
.bf-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:12px 20px;background:var(--paper-2);border-block-end:1.5px solid var(--ink);}
.bf-doc{max-width:1040px;margin-inline:auto;padding:28px 20px 80px;}
.bf-plate{position:relative;border:1px solid var(--rule);padding:24px;margin-block-end:22px;background:var(--paper);content-visibility:auto;contain-intrinsic-size:1px 780px;}
.bf-prereq{background:var(--paper-2);border:1px solid var(--rule);border-inline-start:3.5px solid var(--ink);padding:12px 16px;margin-block-end:16px;}
.m-definition{color:var(--ink-def);font-weight:700;border-block-end:2px solid var(--ink-def);}
.m-important{background:var(--hl);border-block-end:1.5px solid var(--ink-imp);padding-inline:2px;}
.m-term{color:var(--ink-term);font-weight:700;border-block-end:1.5px dashed var(--ink-term);}
.m-example{color:var(--ink-ex);border-block-end:1.5px dotted var(--ink-ex);}
.m-warning{color:var(--ink-warn);font-weight:700;border-block-end:2px double var(--ink-warn);}
.declassify{appearance:none;font:inherit;font-weight:600;padding:0 6px;border:1px solid var(--ink);background:var(--ink);color:var(--ink);cursor:pointer;transition:opacity 160ms ease-out,transform 160ms ease-out;}
.declassify.off,.declassify[aria-pressed="true"]{background:var(--hl);color:var(--ink);border-color:var(--stamp);}
@media print{.bf-top,script{display:none!important}.bf-plate,table,aside{break-inside:avoid-page}h2,h3{break-after:avoid}}
`.trim();

export const ATLAS_STANDALONE_JS = `
function bfTheme(t){document.documentElement.setAttribute('data-theme',t);}
function bfToggleDeclassify(on){
  document.querySelectorAll('.declassify').forEach(function(b){
    b.setAttribute('aria-pressed', on ? 'false' : 'true');
  });
}
function bfNormAr(s){
  return String(s||'').replace(/[\\u064B-\\u065F\\u0670\\u0640]/g,'').replace(/[\\u0622\\u0623\\u0625\\u0671]/g,'ا').replace(/[\\u0649\\u0626]/g,'ي').replace(/\\u0629/g,'ه').toLowerCase();
}
function bfSearch(q){
  var n=bfNormAr(q);
  document.querySelectorAll('.bf-plate').forEach(function(sec){
    sec.style.display=(!n||bfNormAr(sec.textContent).indexOf(n)!==-1)?'':'none';
  });
}
`.trim();

export function renderSpanToHtml(span, interactive = true) {
  if (typeof span === "string") return escapeHtml(span);
  if (!span || typeof span !== "object") return "";
  const text = escapeHtml(span.text ?? span.v ?? "");
  const pageRef = span.pageRef || span.page
    ? ` <sup class="bf-ref">[ص${Number(span.pageRef || span.page)}]</sup>`
    : "";

  if (span.declassify && interactive) {
    return `<button type="button" class="declassify off" aria-pressed="true" onclick="this.setAttribute('aria-pressed',this.getAttribute('aria-pressed')==='true'?'false':'true')">${text}</button>${pageRef}`;
  }
  if (span.mark) {
    const safeMark = escapeHtml(span.mark);
    return `<mark class="m-${safeMark}">${text}</mark>${pageRef}`;
  }
  if (span.code) return `<code dir="ltr">${text}</code>${pageRef}`;
  if (span.bold || span.t === "b") return `<strong>${text}</strong>${pageRef}`;
  return `${text}${pageRef}`;
}

export function renderBlockToHtml(block, interactive = true) {
  if (!block || typeof block !== "object") return "";
  const spans = Array.isArray(block.spans)
    ? block.spans.map((s) => renderSpanToHtml(s, interactive)).join("")
    : escapeHtml(block.text || block.body || "");

  switch (block.type) {
    case "prerequisite":
      return `<div class="bf-prereq"><strong>${escapeHtml(block.heading || "قبل ما تقرا (شرح من الأساس)")}:</strong> <p>${escapeHtml(block.body || "")}</p></div>`;
    case "paragraph":
      return `<p dir="${block.lang === "en" ? "ltr" : "auto"}">${spans}</p>`;
    case "bullets": {
      const items = Array.isArray(block.items) ? block.items : [];
      const lis = items.map((it) => {
        const line = Array.isArray(it)
          ? it.map((s) => renderSpanToHtml(s, interactive)).join("")
          : Array.isArray(it?.spans)
            ? it.spans.map((s) => renderSpanToHtml(s, interactive)).join("")
            : escapeHtml(typeof it === "string" ? it : it?.text || "");
        return `<li>${line}</li>`;
      }).join("");
      return `<ul>${lis}</ul>`;
    }
    case "definition":
      return `<dl class="bf-def"><dt class="m-definition">${escapeHtml(block.term || "")}${block.termAr ? ` — ${escapeHtml(block.termAr)}` : ""}</dt><dd>${spans}</dd></dl>`;
    case "callout":
      return `<aside class="bf-callout"><strong class="m-warning">${escapeHtml(block.title || block.variant || "ملاحظة هامة")}:</strong> ${spans}</aside>`;
    case "table": {
      const cols = (block.columns || block.header || []).map((c) => `<th>${escapeHtml(c)}</th>`).join("");
      const rows = (block.rows || []).map((r) => `<tr>${(Array.isArray(r) ? r : []).map((cell) => `<td>${Array.isArray(cell) ? cell.map((s) => renderSpanToHtml(s, interactive)).join("") : escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
      return `<table><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    case "sidenote":
      return `<details class="bf-sidenote"><summary>[هامش ${escapeHtml(block.number || "01")}] ${escapeHtml(block.title || "")}</summary><p>${spans}</p></details>`;
    default:
      return spans ? `<p>${spans}</p>` : "";
  }
}

export function renderSectionToHtml(section, idx = 0, interactive = true) {
  const secId = escapeHtml(section.id || `s-${idx + 1}`);
  const plateCode = escapeHtml(section.plateCode || `Plate ${String(idx + 1).padStart(2, "0")}`);
  const titleAr = escapeHtml(typeof section.title === "string" ? section.title : section.title?.ar || section.title?.text || `القسم ${idx + 1}`);
  const titleEn = typeof section.title === "object" && section.title?.en ? ` <span dir="ltr" lang="en">(${escapeHtml(section.title.en)})</span>` : "";
  const prereqHtml = section.prerequisite ? renderBlockToHtml(section.prerequisite, interactive) : "";
  const blocksHtml = (section.blocks || []).map((b) => renderBlockToHtml(b, interactive)).join("\n");

  return `<section class="bf-plate" id="${secId}">
  <header><span class="mono" style="color:var(--stamp);font-weight:700">${plateCode}</span><h2>${titleAr}${titleEn}</h2></header>
  ${prereqHtml}
  ${blocksHtml}
</section>`;
}

/**
 * Pure function rendering a SummaryDocument into safe, self-contained Atlas HTML.
 */
export function renderToAtlasHtml(doc, options = {}) {
  const theme = escapeHtml(options.theme || "plate");
  const interactive = options.interactive !== false;
  const rawTitle = typeof doc?.title === "string" ? doc.title : doc?.title?.ar || doc?.title?.en || doc?.meta?.title || "ملخص الأطلس — Black Fighters";
  const safeTitle = escapeHtml(rawTitle);
  const sections = Array.isArray(doc?.sections) ? doc.sections : [];
  const bodyHtml = sections.map((s, i) => renderSectionToHtml(s, i, interactive)).join("\n");
  const tocItems = sections.map((s, i) => ({
    id: escapeHtml(s.id || `s-${i + 1}`),
    title: escapeHtml(typeof s.title === "string" ? s.title : s.title?.ar || s.title?.en || `القسم ${i + 1}`),
  }));

  const html = `<!doctype html>
<html lang="ar" dir="rtl" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>${ATLAS_STANDALONE_CSS}</style>
</head>
<body>
  <header class="bf-top">
    <strong>${safeTitle}</strong>
    <div>
      <input type="search" placeholder="ابحث في الملخص..." oninput="bfSearch(this.value)" aria-label="بحث في الملخص">
      <button type="button" onclick="bfTheme('plate')">Plate</button>
      <button type="button" onclick="bfTheme('night')">Night</button>
      <button type="button" onclick="bfTheme('cram')">Cram</button>
      <button type="button" onclick="bfToggleDeclassify(true)">فك السرية (Declassify)</button>
      <button type="button" onclick="bfToggleDeclassify(false)">إظهار الكل</button>
    </div>
  </header>
  <main class="bf-doc">
    <nav aria-label="فهرس اللوحات"><ul>${tocItems.map((t) => `<li><a href="#${t.id}">${t.title}</a></li>`).join("")}</ul></nav>
    ${bodyHtml}
  </main>
  ${interactive ? `<script>${ATLAS_STANDALONE_JS}</script>` : ""}
</body>
</html>`;

  const byteSize = new TextEncoder().encode(html).length;
  return {
    html,
    body: bodyHtml,
    toc: tocItems,
    byteSize,
    within400KbBudget: byteSize <= 400 * 1024,
  };
}

/**
 * V5 2.3: Exports either a single HTML file (<= 60 pages) or a multi-chapter offline ZIP bundle (> 60 pages).
 */
export async function createStandaloneHtmlExport(bookDoc, options = {}) {
  const sourcePages = Number(bookDoc?.meta?.sourcePages || bookDoc?.sourcePages || 30);
  if (sourcePages <= 60) {
    const single = renderToAtlasHtml(bookDoc, options);
    return {
      mode: "single_html",
      fileName: `${bookDoc?.id || "summary"}.html`,
      html: single.html,
      byteSize: single.byteSize,
      withinBudget: single.within400KbBudget,
    };
  }

  // > 60 pages: Create offline ZIP package with index.html + chapters/NN.html + shared assets + search-index.json
  const zip = new JSZip();
  zip.file("assets/atlas.css", ATLAS_STANDALONE_CSS);
  zip.file("assets/atlas.js", ATLAS_STANDALONE_JS);

  const chapters = Array.isArray(bookDoc?.chapters) && bookDoc.chapters.length
    ? bookDoc.chapters
    : (bookDoc?.sections || []).map((sec, idx) => ({
        id: `ch-${String(idx + 1).padStart(2, "0")}`,
        title: typeof sec.title === "string" ? sec.title : sec.title?.ar || `الفصل ${idx + 1}`,
        sections: [sec],
      }));

  const searchRecords = [];
  let maxSingleFileBytes = 0;

  chapters.forEach((ch, idx) => {
    const chFile = `chapters/${String(idx + 1).padStart(2, "0")}.html`;
    const chTitle = escapeHtml(ch.title || `الفصل ${idx + 1}`);
    const chBody = (ch.sections || []).map((s, sIdx) => renderSectionToHtml(s, sIdx, true)).join("\n");
    const chHtml = `<!doctype html>
<html lang="ar" dir="rtl" data-theme="plate">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${chTitle}</title>
  <link rel="stylesheet" href="../assets/atlas.css">
</head>
<body>
  <header class="bf-top"><a href="../index.html">← الفهرس الرئيسي</a><strong>${chTitle}</strong></header>
  <main class="bf-doc">${chBody}</main>
  <script src="../assets/atlas.js"></script>
</body>
</html>`;
    const bytes = new TextEncoder().encode(chHtml).length;
    if (bytes > maxSingleFileBytes) maxSingleFileBytes = bytes;
    zip.file(chFile, chHtml);
    searchRecords.push({
      chapterNumber: idx + 1,
      title: ch.title || `الفصل ${idx + 1}`,
      href: chFile,
    });
  });

  const indexHtml = `<!doctype html>
<html lang="ar" dir="rtl" data-theme="plate">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(bookDoc?.meta?.title || "أطلس الكتاب الكامل")}</title>
  <link rel="stylesheet" href="assets/atlas.css">
</head>
<body>
  <header class="bf-top"><strong>${escapeHtml(bookDoc?.meta?.title || "أطلس الكتاب الكامل")}</strong></header>
  <main class="bf-doc">
    <h1>فهرس الفصول (${chapters.length} فصل)</h1>
    <ol>${searchRecords.map((r) => `<li><a href="${r.href}">${escapeHtml(r.title)}</a></li>`).join("")}</ol>
  </main>
  <script src="assets/atlas.js"></script>
</body>
</html>`;

  zip.file("index.html", indexHtml);
  zip.file("search-index.json", JSON.stringify(searchRecords));

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return {
    mode: "zip_bundle",
    fileName: `${bookDoc?.id || "atlas-book"}.zip`,
    zipBytes,
    chapterCount: chapters.length,
    maxSingleFileBytes,
    within8MbPerFileBudget: maxSingleFileBytes <= 8 * 1024 * 1024,
  };
}

export function buildSingleFileStandaloneHtml({ title = "ملخص الأطلس", chapters = [], theme = "plate" } = {}) {
  const sections = chapters.map((ch, idx) => ({
    id: `s-${ch.chapterIndex || idx + 1}`,
    title: ch.title || `الفصل ${idx + 1}`,
    blocks: (ch.blocks || []).map((b) => ({
      type: b.type || "paragraph",
      title: b.title || "",
      text: b.text || "",
    })),
  }));
  const res = renderToAtlasHtml({ title, sections }, { theme });
  return res.html;
}

export function buildExportPackagePlan({ docId = "doc", title = "ملخص الأطلس", totalPages = 30, chapters = [] } = {}) {
  if (Number(totalPages) <= 60) {
    const html = buildSingleFileStandaloneHtml({ title, chapters });
    return {
      mode: "single-html",
      docId,
      title,
      chapters,
      html,
      byteSize: new TextEncoder().encode(html).length,
    };
  }
  const files = [
    { path: "manifest.json", content: JSON.stringify({ docId, title, totalPages, totalChapters: chapters.length }) },
    { path: "index.html", content: buildSingleFileStandaloneHtml({ title, chapters: chapters.slice(0, 1) }) },
    { path: "search-index.json", content: JSON.stringify(chapters.map((c) => ({ chapterIndex: c.chapterIndex, title: c.title }))) },
    ...chapters.map((ch, idx) => ({
      path: `chapters/${String(ch.chapterIndex || idx + 1).padStart(2, "0")}.html`,
      content: buildSingleFileStandaloneHtml({ title: ch.title, chapters: [ch] }),
    })),
  ];
  return {
    mode: "multi-chapter-zip",
    docId,
    title,
    chapters,
    files,
  };
}
