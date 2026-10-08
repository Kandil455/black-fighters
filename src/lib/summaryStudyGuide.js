/**
 * summaryStudyGuide.js — the HTML study-guide template engine.
 *
 * TWO SEPARATE AXES. The first attempt at this shipped four *colours* of the same
 * layout and the owner rightly rejected it — "انت بتغير لي الألوان، أنا بتكلم
 * قوالب مختلفة". So a template is now a LAYOUT plus a PALETTE:
 *
 *   layout  — the actual DOM structure and reading flow:
 *               modules  · header + index + module cards (the reference file design)
 *               cram     · dense two-column revision sheet, no index, print 2-up
 *               cards    · a responsive grid of tiles, for scanning not reading
 *               outline  · a numbered checklist outline, minimal chrome
 *               tables   · comparison-first: each section is a table with notes
 *   palette — colour identity (emergency red / clinical navy / pharma green /
 *             exam amber), including the owner's two reference palettes.
 *
 * ONE generator serves the reader, the picker previews and the exported file, so
 * what a student picks is exactly what they read and exactly what they download.
 * Input is the existing v3 summary document (`sections[].blocks[]` with a semantic
 * `role`) — no schema change.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Colour identity. `emergency_red` and `clinical_navy` come from the owner's files. */
export const GUIDE_PALETTES = {
  emergency_red: {
    accent: "#c0392b",
    accentDark: "#8b0000",
    headerFrom: "#8b0000",
    headerTo: "#e74c3c",
    headerShadow: "rgba(139,0,0,0.35)",
    subtitle: "#ffeaa7",
    english: "#fadbd8",
    railFrom: "#16213e",
    railTo: "#0f3460",
    tableHead: "#8b0000",
  },
  clinical_navy: {
    accent: "#0f3460",
    accentDark: "#16213e",
    headerFrom: "#1a1a2e",
    headerTo: "#0f3460",
    headerShadow: "rgba(0,0,0,0.3)",
    subtitle: "#e94560",
    english: "#a8d8ea",
    railFrom: "#16213e",
    railTo: "#0f3460",
    tableHead: "#0f3460",
  },
  pharma_green: {
    accent: "#1e8449",
    accentDark: "#0e5b2f",
    headerFrom: "#0e5b2f",
    headerTo: "#27ae60",
    headerShadow: "rgba(14,91,47,0.3)",
    subtitle: "#d5f5e3",
    english: "#a9dfbf",
    railFrom: "#145a32",
    railTo: "#1e8449",
    tableHead: "#1e8449",
  },
  exam_amber: {
    accent: "#b9770e",
    accentDark: "#7e5109",
    headerFrom: "#7e5109",
    headerTo: "#f39c12",
    headerShadow: "rgba(126,81,9,0.3)",
    subtitle: "#fef9e7",
    english: "#fdebd0",
    railFrom: "#7e5109",
    railTo: "#b9770e",
    tableHead: "#b9770e",
  },
};

/**
 * The designs a student picks between. Each pairs a genuinely different layout
 * with its colour identity, and `id` is what gets persisted.
 */
export const STUDY_GUIDE_TEMPLATES = [
  {
    id: "modules_red",
    layout: "modules",
    palette: "emergency_red",
    nameAr: "ملف المذاكرة",
    nameEn: "Study guide",
    descAr: "فهرس + وحدات مرقّمة + صناديق ملوّنة — زي ملف الطوارئ",
  },
  {
    id: "cram_amber",
    layout: "cram",
    palette: "exam_amber",
    nameAr: "برشامة ليلة الامتحان",
    nameEn: "Cram sheet",
    descAr: "عمودين كثيفين بدون فهرس — أسرع مراجعة قبل الامتحان",
  },
  {
    id: "cards_navy",
    layout: "cards",
    palette: "clinical_navy",
    nameAr: "بطاقات المراجعة",
    nameEn: "Cards",
    descAr: "كل جزء في كارت لوحده في شبكة — للمسح السريع",
  },
  {
    id: "outline_green",
    layout: "outline",
    palette: "pharma_green",
    nameAr: "المخطط المرقّم",
    nameEn: "Outline",
    descAr: "نقاط مرقّمة بإيجاز بدون زخرفة — للمراجعة النهائية",
  },
  {
    id: "tables_navy",
    layout: "tables",
    palette: "clinical_navy",
    nameAr: "المقارنات",
    nameEn: "Comparisons",
    descAr: "الجداول هي الأساس — لمواد الفروقات والتصنيفات",
  },
];

/** Back-compat: earlier code asked for "themes". A theme is now template+palette. */
export const STUDY_GUIDE_THEMES = STUDY_GUIDE_TEMPLATES.map((template) => ({
  id: template.id,
  nameAr: template.nameAr,
  nameEn: template.nameEn,
  descAr: template.descAr,
  ...GUIDE_PALETTES[template.palette],
}));

export function getStudyGuideTemplate(id) {
  return STUDY_GUIDE_TEMPLATES.find((t) => t.id === id)
    || STUDY_GUIDE_TEMPLATES.find((t) => t.palette === id)
    || STUDY_GUIDE_TEMPLATES[0];
}

export function getStudyGuideTheme(id) {
  const template = getStudyGuideTemplate(id);
  return { id: template.id, ...GUIDE_PALETTES[template.palette] };
}

// ── rich text → HTML (annotation spans become the palette's .hl-* classes) ───
const ANNOTATION_CLASS = {
  green: "hl-green", yellow: "hl-yellow", cyan: "hl-blue", blue: "hl-blue",
  orange: "hl-orange", red: "hl-red",
};

function renderRich(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return escapeHtml(value);
  const text = String(value.text || "");
  const annotations = (Array.isArray(value.annotations) ? value.annotations : [])
    .filter((a) => Number(a?.end) > Number(a?.start));
  if (!annotations.length) return escapeHtml(text);

  const bounds = [...new Set([0, text.length, ...annotations.flatMap((a) => [Number(a.start), Number(a.end)])])]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= text.length)
    .sort((a, b) => a - b);

  return bounds.slice(0, -1).map((start, index) => {
    const end = bounds[index + 1];
    const chunk = escapeHtml(text.slice(start, end));
    if (!chunk) return "";
    const active = annotations.filter((a) => Number(a.start) <= start && Number(a.end) >= end);
    if (active.some((a) => a.code)) return `<code dir="ltr">${chunk}</code>`;
    const mark = active.find((a) => a.highlight);
    if (mark) return `<span class="${ANNOTATION_CLASS[mark.color] || "hl-red"}">${chunk}</span>`;
    if (active.some((a) => a.bold)) return `<b>${chunk}</b>`;
    if (active.some((a) => a.italic)) return `<i>${chunk}</i>`;
    return chunk;
  }).join("");
}

function blockText(block) {
  if (!block) return "";
  if (typeof block.content === "string") return block.content;
  if (block.content?.text) return block.content.text;
  if (Array.isArray(block.items)) return block.items.map((i) => (typeof i === "string" ? i : i?.text || "")).join(" ");
  return String(block.text || "");
}

// Labels follow the reference study guides the owner supplied.
const BOX_FOR_ROLE = {
  definition: { cls: "box-red", title: "📘 التعريف بالعربي" },
  example: { cls: "box-blue", title: "💡 الفهم العميق (مش حفظ)" },
  warning: { cls: "box-yellow", title: "⚠️ فخ الامتحان الشهير" },
  formula: { cls: "box-purple", title: "🧪 القانون / المعادلة" },
  question: { cls: "box-dark", title: "❓ سؤال" },
  answer: { cls: "box-green", title: "✅ الإجابة" },
};

/** One block → the layout's shared content vocabulary. */
function renderBlock(block) {
  if (!block) return "";
  const type = String(block.type || "paragraph");
  const role = String(block.role || "body");

  if (type === "heading") return `<div class="section-header">${renderRich(block.content) || escapeHtml(blockText(block))}</div>`;

  if (type === "table") {
    const table = block.table && typeof block.table === "object" ? block.table : block;
    const headers = Array.isArray(table.headers) ? table.headers : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    if (!headers.length && !rows.length) return "";
    return `<table>
      ${headers.length ? `<thead><tr>${headers.map((h) => `<th>${renderRich(h)}</th>`).join("")}</tr></thead>` : ""}
      <tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td>${renderRich(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  }

  if (type === "bullet_list" || type === "ordered_list") {
    const items = Array.isArray(block.items) ? block.items : [];
    const tag = type === "ordered_list" ? "ol" : "ul";
    return `<${tag}>${items.map((item) => `<li>${renderRich(item)}</li>`).join("")}</${tag}>`;
  }

  if (type === "equation" || type === "code") return `<div class="eq" dir="ltr">${escapeHtml(blockText(block))}</div>`;
  if (type === "quote" || type === "callout") {
    return `<div class="trick">${renderRich(block.content) || escapeHtml(blockText(block))}</div>`;
  }
  if (type === "divider") return "<hr>";

  const box = BOX_FOR_ROLE[role];
  const body = renderRich(block.content) || escapeHtml(blockText(block));
  if (box) return `<div class="${box.cls}"><span class="box-title">${box.title}</span>${body}</div>`;
  if (role === "english_points") return `<div class="section-header-eng">📋 ${body}</div>`;
  return `<p>${body}</p>`;
}

/** Markdown fallback for legacy (non-v3) summaries. */
function markdownToSections(markdown) {
  const lines = String(markdown || "").split("\n");
  const sections = [];
  let current = null;
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length && current) {
      current.blocks.push({ type: "bullet_list", items: listBuffer.map((text) => ({ text })) });
      listBuffer = [];
    }
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushList(); continue; }
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      current = { title: { text: heading[1].replace(/[*_`#]/g, "").trim() }, blocks: [] };
      sections.push(current);
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) { listBuffer.push(bullet[1].replace(/[*_`]/g, "").trim()); continue; }
    flushList();
    if (!current) { current = { title: { text: "المحتوى" }, blocks: [] }; sections.push(current); }
    current.blocks.push({ type: "paragraph", role: "body", content: { text: line.replace(/[*_`]/g, "") } });
  }
  flushList();
  return sections.filter((section) => section.blocks.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared CSS (palette-driven). Each layout only adds its own structural rules.
// ─────────────────────────────────────────────────────────────────────────────
function baseCss(palette) {
  return `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif; background:#eef2f7; color:#16213e; line-height:1.9; padding:18px; }
.wrap { max-width:1150px; margin:0 auto; }
.header { background:linear-gradient(135deg, ${palette.headerFrom} 0%, ${palette.accent} 60%, ${palette.headerTo} 100%); color:#fff; padding:46px 28px; border-radius:22px; margin-bottom:26px; box-shadow:0 12px 45px ${palette.headerShadow}; }
.header h1 { font-size:2.5em; margin-bottom:8px; }
.header .subtitle { font-size:1.1em; color:${palette.subtitle}; font-weight:bold; }
.header .meta { font-size:.9em; opacity:.85; margin-top:6px; }
p { margin:11px 0; }
ul, ol { margin:10px 24px 10px 0; }
li { margin-bottom:6px; }
b, strong { color:${palette.accentDark}; }
h2, h3 { color:${palette.accentDark}; }
.box-red,.box-blue,.box-green,.box-yellow,.box-purple,.box-dark { padding:14px 18px; border-radius:9px; margin:13px 0; }
.box-red { background:#fdeeec; border-right:5px solid #e74c3c; }
.box-blue { background:#eaf3fd; border-right:5px solid #2980b9; }
.box-green { background:#eafaf1; border-right:5px solid #27ae60; }
.box-yellow { background:#fef9e7; border-right:5px solid #f39c12; }
.box-purple { background:#f5eef8; border-right:5px solid #9b59b6; }
.box-dark { background:#eaecee; border-right:5px solid #16213e; }
.box-title { font-weight:bold; font-size:1.02em; margin-bottom:6px; display:block; }
.section-header { background:linear-gradient(90deg, ${palette.accentDark}, ${palette.accent}); color:#fff; padding:11px 18px; border-radius:10px; font-size:1.06em; font-weight:bold; margin:20px 0 12px; }
.section-header-eng { background:linear-gradient(90deg, ${palette.railFrom}, ${palette.railTo}); color:#fff; padding:11px 18px; border-radius:10px; font-size:1.02em; font-weight:bold; margin:20px 0 12px; direction:ltr; text-align:left; }
.trick { background:linear-gradient(135deg,#f39c12,#e67e22); color:#fff; padding:15px 20px 15px 66px; border-radius:12px; margin:15px 0; position:relative; box-shadow:0 4px 14px rgba(230,126,34,.35); }
.trick::before { content:"تريكة"; position:absolute; left:11px; top:50%; transform:translateY(-50%); background:#fff; color:#ca6f1e; font-weight:bold; font-size:.78em; padding:4px 9px; border-radius:12px; }
.trick b, .trick strong { color:#fffbe6; }
table { width:100%; border-collapse:collapse; margin:14px 0; border-radius:10px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.1); }
th { background:${palette.tableHead}; color:#fff; padding:10px 12px; text-align:right; font-size:.93em; }
td { padding:9px 12px; border-bottom:1px solid #e5e8ec; vertical-align:top; }
tr:nth-child(even) td { background:#f8fafc; }
.eq { background:#16213e; color:#fff; direction:ltr; text-align:left; padding:13px 16px; border-radius:10px; margin:13px 0; font-family:ui-monospace,Menlo,monospace; overflow-x:auto; }
code { background:#eaecee; padding:2px 6px; border-radius:5px; font-family:ui-monospace,Menlo,monospace; direction:ltr; display:inline-block; }
.hl-red { color:#c0392b; font-weight:bold; } .hl-blue { color:#2471a3; font-weight:bold; }
.hl-green { color:#1e8449; font-weight:bold; } .hl-purple { color:#7d3c98; font-weight:bold; }
.hl-yellow { color:#b9770e; font-weight:bold; } .hl-orange { color:#ca6f1e; font-weight:bold; }
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: modules — the reference design (index + numbered module cards)
// ─────────────────────────────────────────────────────────────────────────────
function layoutModules({ sections, overview, conclusion, heading, palette, sourceCount }) {
  const toc = sections.map((s, i) => `<li><a href="#s${i + 1}">${renderRich(s.title) || `القسم ${i + 1}`}</a></li>`).join("");
  return `
  <div class="header" style="text-align:center">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">ملف مذاكرة — ${sections.length} قسم</div>
    ${sourceCount ? `<div class="meta">${sourceCount} صفحة مصدر</div>` : ""}
  </div>
  ${toc ? `<div class="toc"><h3>📑 فهرس المذاكرة (اضغط على أي عنوان للانتقال)</h3><ol>${toc}</ol></div>` : ""}
  ${overview.length ? `<div class="module"><div class="module-title">نظرة سريعة</div>${overview.map(renderBlock).join("")}</div>` : ""}
  ${sections.map((section, i) => `
    <div class="module" id="s${i + 1}">
      <div class="module-title">${i + 1}. ${renderRich(section.title) || `القسم ${i + 1}`}</div>
      ${section.blocks.map(renderBlock).join("")}
    </div>`).join("")}
  ${conclusion.length ? `<div class="module"><div class="module-title">الخلاصة</div>${conclusion.map(renderBlock).join("")}</div>` : ""}
  <style>
    .toc { background:#fff; border-radius:16px; padding:20px 28px; margin-bottom:26px; box-shadow:0 4px 18px rgba(0,0,0,.07); border-right:6px solid ${palette.accent}; }
    .toc h3 { margin-bottom:10px; font-size:1.08em; }
    .toc ol { margin-right:22px; } .toc a { color:#16213e; text-decoration:none; font-weight:bold; }
    .module { background:#fff; border-radius:16px; padding:32px; margin-bottom:26px; box-shadow:0 5px 22px rgba(0,0,0,.08); border-right:6px solid ${palette.accent}; }
    .module-title { font-size:1.55em; margin-bottom:16px; padding-bottom:12px; border-bottom:3px solid ${palette.headerTo}55; }
  </style>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: cram — dense two columns, no index, print 2-up
// ─────────────────────────────────────────────────────────────────────────────
function layoutCram({ sections, overview, conclusion, heading, palette }) {
  const compact = (block) => renderBlock(block);
  return `
  <div class="header" style="text-align:center; padding:30px 22px">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">⚡ برشامة مراجعة سريعة — ${sections.length} محور</div>
  </div>
  ${overview.length ? `<div class="crambox">${overview.map(compact).join("")}</div>` : ""}
  <div class="cramgrid">
    ${sections.map((section, i) => `
      <div class="cramcard">
        <div class="cramhead"><span class="num">${String(i + 1).padStart(2, "0")}</span>${renderRich(section.title) || `محور ${i + 1}`}</div>
        ${section.blocks.map(compact).join("")}
      </div>`).join("")}
  </div>
  ${conclusion.length ? `<div class="crambox" style="border-color:${palette.accent}"><div class="cramhead">🏁 آخر حاجة قبل الامتحان</div>${conclusion.map(compact).join("")}</div>` : ""}
  <style>
    .cramgrid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .cramcard { background:#fff; border-radius:12px; padding:16px 18px; box-shadow:0 3px 14px rgba(0,0,0,.07); border-top:4px solid ${palette.accent}; break-inside:avoid; }
    .cramhead { font-weight:bold; font-size:1.05em; margin-bottom:8px; display:flex; align-items:center; gap:8px; color:${palette.accentDark}; }
    .cramhead .num { background:${palette.accent}; color:#fff; border-radius:7px; padding:1px 7px; font-size:.8em; font-family:ui-monospace,monospace; }
    .crambox { background:#fff; border-radius:12px; padding:16px 18px; margin-bottom:14px; box-shadow:0 3px 14px rgba(0,0,0,.07); border-top:4px solid ${palette.accentDark}; }
    .cramcard p, .cramcard li { font-size:.95em; line-height:1.75; }
    .cramcard table { font-size:.9em; }
    @media (max-width:760px) { .cramgrid { grid-template-columns:1fr; } }
  </style>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: cards — a scannable grid of tiles
// ─────────────────────────────────────────────────────────────────────────────
function layoutCards({ sections, overview, conclusion, heading, palette }) {
  const tile = (block, index) => {
    const role = String(block?.role || "body");
    const box = BOX_FOR_ROLE[role];
    const label = box ? box.title : (block.type === "table" ? "📊 جدول" : "📝 ملاحظة");
    const tone = box ? box.cls : "box-dark";
    const body = block.type === "table" || block.type === "bullet_list"
      ? renderBlock(block)
      : `<p>${renderRich(block.content) || escapeHtml(blockText(block))}</p>`;
    return `<div class="tile ${tone}"><span class="tile-label">${label}</span>${body}</div>`;
  };
  return `
  <div class="header" style="text-align:center">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">🃏 بطاقات مراجعة — ${sections.length} مجموعة</div>
  </div>
  ${overview.length ? `<div class="cardsgrid">${overview.map(tile).join("")}</div>` : ""}
  ${sections.map((section, i) => `
    <div class="cardsection">
      <div class="cardsection-head"><span class="chip">${i + 1}</span>${renderRich(section.title) || `مجموعة ${i + 1}`}</div>
      <div class="cardsgrid">${section.blocks.map(tile).join("")}</div>
    </div>`).join("")}
  ${conclusion.length ? `<div class="cardsection"><div class="cardsection-head"><span class="chip">✓</span>الخلاصة</div><div class="cardsgrid">${conclusion.map(tile).join("")}</div></div>` : ""}
  <style>
    .cardsection { margin-bottom:22px; }
    .cardsection-head { display:flex; align-items:center; gap:10px; font-size:1.25em; font-weight:bold; color:${palette.accentDark}; margin:0 0 12px; }
    .cardsection-head .chip { background:${palette.accent}; color:#fff; border-radius:9px; padding:2px 11px; font-size:.78em; font-family:ui-monospace,monospace; }
    .cardsgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:13px; }
    .tile { background:#fff; border-radius:14px; padding:15px 17px; box-shadow:0 4px 16px rgba(0,0,0,.08); border:none; border-top:4px solid ${palette.accent}; margin:0; }
    .tile.box-red { border-top-color:#e74c3c; } .tile.box-blue { border-top-color:#2980b9; }
    .tile.box-yellow { border-top-color:#f39c12; } .tile.box-green { border-top-color:#27ae60; }
    .tile.box-purple { border-top-color:#9b59b6; } .tile.box-dark { border-top-color:#16213e; }
    .tile-label { display:block; font-size:.78em; font-weight:bold; letter-spacing:.04em; color:${palette.accentDark}; margin-bottom:6px; }
    .tile p, .tile li { font-size:.95em; line-height:1.75; margin:6px 0; }
    .tile table { font-size:.88em; box-shadow:none; }
  </style>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: outline — a minimal numbered checklist
// ─────────────────────────────────────────────────────────────────────────────
function layoutOutline({ sections, overview, conclusion, heading, palette }) {
  const line = (block, index) => {
    const type = String(block?.type || "paragraph");
    const role = String(block?.role || "body");
    if (type === "bullet_list" || type === "ordered_list") {
      const items = Array.isArray(block.items) ? block.items : [];
      return `<ul>${items.map((i) => `<li>${renderRich(i)}</li>`).join("")}</ul>`;
    }
    if (type === "table") return renderBlock(block);
    const tag = role === "warning" ? "⚠️" : role === "definition" ? "📘" : role === "example" ? "💡" : "•";
    return `<p class="line"><span class="tag">${tag}</span><span>${renderRich(block.content) || escapeHtml(blockText(block))}</span></p>`;
  };
  return `
  <div class="header" style="text-align:center; padding:26px 20px">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">📋 مخطط مرقّم — ${sections.length} محور</div>
  </div>
  ${overview.length ? `<div class="outblock">${overview.map(line).join("")}</div>` : ""}
  <ol class="outline">
    ${sections.map((section, i) => `
      <li>
        <div class="outtitle">${renderRich(section.title) || `محور ${i + 1}`}</div>
        <div class="outbody">${section.blocks.map(line).join("")}</div>
      </li>`).join("")}
  </ol>
  ${conclusion.length ? `<div class="outblock"><div class="outtitle">🏁 الخلاصة</div>${conclusion.map(line).join("")}</div>` : ""}
  <style>
    .outline { list-style:none; margin:0; padding:0; }
    .outline > li { background:#fff; border-radius:12px; padding:16px 18px; margin-bottom:12px; box-shadow:0 3px 12px rgba(0,0,0,.06); border-right:4px solid ${palette.accent}; counter-increment:step; position:relative; }
    .outline { counter-reset:step; }
    .outline > li::before { content:counter(step,decimal-leading-zero); position:absolute; inset-inline-start:-6px; top:16px; background:${palette.accent}; color:#fff; border-radius:8px; padding:2px 9px; font-size:.75em; font-family:ui-monospace,monospace; }
    .outtitle { font-weight:bold; font-size:1.12em; color:${palette.accentDark}; margin-bottom:8px; padding-inline-start:34px; }
    .outblock { background:#fff; border-radius:12px; padding:16px 18px; margin-bottom:12px; box-shadow:0 3px 12px rgba(0,0,0,.06); border-right:4px solid ${palette.accentDark}; }
    .line { display:flex; gap:9px; margin:7px 0; align-items:flex-start; }
    .line .tag { flex:0 0 auto; opacity:.85; }
    .outline ul, .outblock ul { margin:8px 22px 8px 0; }
    .outline .box-red,.outline .box-blue,.outline .box-yellow,.outline .box-green,.outline .box-dark { margin:8px 0; padding:10px 14px; }
    .outline .box-title { display:none; }
    .outline p { margin:6px 0; }
  </style>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: tables — comparison-first
// ─────────────────────────────────────────────────────────────────────────────
function layoutTables({ sections, overview, conclusion, heading, palette }) {
  return `
  <div class="header" style="text-align:center">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">📊 مقارنات وتصنيفات — ${sections.length} محور</div>
  </div>
  ${overview.length ? `<div class="tsection">${overview.map(renderBlock).join("")}</div>` : ""}
  ${sections.map((section, i) => {
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    const tables = blocks.filter((b) => b.type === "table");
    const rest = blocks.filter((b) => b.type !== "table");
    return `
      <div class="tsection">
        <div class="theader"><span class="num">${String(i + 1).padStart(2, "0")}</span>${renderRich(section.title) || `محور ${i + 1}`}</div>
        ${tables.map(renderBlock).join("")}
        ${rest.length ? `<div class="tnotes">${rest.map(renderBlock).join("")}</div>` : ""}
      </div>`;
  }).join("")}
  ${conclusion.length ? `<div class="tsection"><div class="theader">🏁 الخلاصة</div>${conclusion.map(renderBlock).join("")}</div>` : ""}
  <style>
    .tsection { background:#fff; border-radius:16px; padding:24px 26px; margin-bottom:22px; box-shadow:0 5px 20px rgba(0,0,0,.08); }
    .theader { display:flex; align-items:center; gap:11px; font-size:1.4em; font-weight:bold; color:${palette.accentDark}; margin-bottom:14px; padding-bottom:10px; border-bottom:3px solid ${palette.headerTo}55; }
    .theader .num { background:${palette.accent}; color:#fff; border-radius:9px; padding:1px 10px; font-size:.72em; font-family:ui-monospace,monospace; }
    .tnotes { margin-top:10px; }
    table { box-shadow:none; border:1px solid #e2e6ea; }
  </style>`;
}

const LAYOUTS = {
  modules: layoutModules,
  cram: layoutCram,
  cards: layoutCards,
  outline: layoutOutline,
  tables: layoutTables,
};

/**
 * Builds the complete standalone HTML document.
 *
 * @param {object} options
 * @param {object} [options.document]   v3 summary document (preferred)
 * @param {string} [options.markdown]   legacy markdown fallback
 * @param {string} [options.title]
 * @param {string} [options.templateId] one of STUDY_GUIDE_TEMPLATES ids
 * @param {string} [options.themeId]    legacy alias (template id or palette id)
 */
export function renderStudyGuideHtml({
  document: doc,
  markdown = "",
  title = "",
  templateId = "",
  themeId = "",
  forExport = false,
} = {}) {
  const template = getStudyGuideTemplate(templateId || themeId);
  const palette = GUIDE_PALETTES[template.palette];
  const layout = LAYOUTS[template.layout] || layoutModules;

  const sections = Array.isArray(doc?.sections) && doc.sections.length
    ? doc.sections.map((section) => ({
        title: section.title,
        blocks: Array.isArray(section.blocks) ? section.blocks : [],
      }))
    : markdownToSections(markdown);

  const heading = title || doc?.title?.text || blockText({ content: doc?.title }) || "ملخص دراسي";
  const overview = Array.isArray(doc?.overview) ? doc.overview : [];
  const conclusion = Array.isArray(doc?.conclusion) ? doc.conclusion : [];
  const sourceCount = Array.isArray(doc?.metadata?.sourceRefs) ? doc.metadata.sourceRefs.length : 0;

  const body = sections.length
    ? layout({ sections, overview, conclusion, heading, palette, sourceCount })
    : `<div class="header" style="text-align:center"><h1>${escapeHtml(heading)}</h1></div><p style="text-align:center">لسه مفيش محتوى في الملخص ده.</p>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(heading)}</title>
<style>${baseCss(palette)}
@media print { body { background:#fff; padding:0; } .module,.toc,.cramcard,.tile,.tsection,.outline>li { box-shadow:none; break-inside:avoid; } }
${forExport ? "" : ""}</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

export default renderStudyGuideHtml;
