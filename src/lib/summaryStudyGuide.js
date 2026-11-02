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

// ONE emphasis engine shared with the reader and the infographic (v2).
import { richToHtml, detectRichLang } from "./summary/richText.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

const DIR_ARABIC_CHAR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const DIR_LATIN_CHAR = /[A-Za-z]/;

/**
 * Direction detector kept here because SummaryView reads study-guide blocks
 * through this module. Returns only "rtl" | "ltr"/"rtl" regardless of the
 * arbitrary hint passed as fallback (e.g. a block role name).
 */
export function detectTextDir(value, fallback = "rtl") {
  const text = String(value ?? "");
  for (const character of text) {
    if (DIR_ARABIC_CHAR.test(character)) return "rtl";
    if (DIR_LATIN_CHAR.test(character)) return "ltr";
  }
  return fallback === "ltr" ? "ltr" : "rtl";
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
    id: "modules_green",
    layout: "modules",
    palette: "pharma_green",
    nameAr: "ملف المذاكرة",
    nameEn: "Study guide",
    descAr: "فهرس + وحدات مرقّمة + صناديق ملوّنة — الأخضر الأكاديمي",
    descEn: "Index + numbered modules + colour boxes — academic green",
  },
  {
    id: "cram_amber",
    layout: "cram",
    palette: "exam_amber",
    nameAr: "مراجعة ليلة الامتحان المركزة",
    nameEn: "Cram sheet",
    descAr: "عمودين كثيفين بدون فهرس — أسرع مراجعة قبل الامتحان",
    descEn: "Two dense columns, no index — fastest pre-exam review",
  },
  {
    id: "cards_navy",
    layout: "cards",
    palette: "clinical_navy",
    nameAr: "بطاقات المراجعة",
    nameEn: "Cards",
    descAr: "كل جزء في كارت لوحده في شبكة — للمسح السريع",
    descEn: "One card per section in a grid — built for fast scanning",
  },
  {
    id: "outline_red",
    layout: "outline",
    palette: "emergency_red",
    nameAr: "المخطط المرقّم",
    nameEn: "Outline",
    descAr: "نقاط مرقّمة بإيجاز بالأحمر المرجعي — للمراجعة النهائية",
    descEn: "Numbered concise outline in reference red — final revision",
  },
  {
    id: "tables_navy",
    layout: "tables",
    palette: "clinical_navy",
    nameAr: "المقارنات",
    nameEn: "Comparisons",
    descAr: "الجداول هي الأساس — لمواد الفروقات والتصنيفات",
    descEn: "Tables first — for differentials and classifications",
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
  orange: "hl-orange", red: "hl-red", purple: "hl-purple", violet: "hl-purple",
};

/**
 * Inline markup → HTML for plain-string leaves.
 *
 * v2: routed through the ONE shared emphasis engine (src/lib/summary/richText.js)
 * so the study guide, the reader and the infographic finally agree. That engine
 * adds what this file used to miss: lead terms, (parenthetical) terms, dose and
 * vital-sign values (5 mg/kg, BP < 90/60), exam words, per-run bidi isolation,
 * density caps, and `purple` (which used to render as literal text).
 */
function inlineMarkup(rawText, { auto = true } = {}) {
  const text = String(rawText ?? "");
  return richToHtml(text, { auto, lang: detectRichLang(text) });
}

function renderRich(value, opts = {}) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return inlineMarkup(String(value), opts);
  const text = String(value.text || "");
  const annotations = (Array.isArray(value.annotations) ? value.annotations : [])
    .filter((a) => Number(a?.end) > Number(a?.start));
  if (!annotations.length) return inlineMarkup(text, opts);

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

/** One block → the layout's shared content vocabulary. Every text node gets
 * an explicit dir so English runs LTR and Arabic runs RTL (owner directive,
 * no "reversed text" in exports). */
function renderBlock(block) {
  if (!block) return "";
  const type = String(block.type || "paragraph");
  const role = String(block.role || "body");
  const dirOf = (node) => detectTextDir(typeof node === "string" ? node : blockText(node));

  if (type === "heading") return `<div class="section-header" dir="${dirOf(block.content ?? block)}">${renderRich(block.content) || escapeHtml(blockText(block))}</div>`;

  if (type === "table") {
    const table = block.table && typeof block.table === "object" ? block.table : block;
    const headers = Array.isArray(table.headers) ? table.headers : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    if (!headers.length && !rows.length) return "";
    return `<table>
      ${headers.length ? `<thead><tr>${headers.map((h) => `<th dir="${dirOf(h)}">${renderRich(h)}</th>`).join("")}</tr></thead>` : ""}
      <tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td dir="${dirOf(cell)}">${renderRich(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  }

  if (type === "bullet_list" || type === "ordered_list") {
    const items = Array.isArray(block.items) ? block.items : [];
    const tag = type === "ordered_list" ? "ol" : "ul";
    return `<${tag}>${items.map((item) => `<li dir="${dirOf(item)}">${renderRich(item, { leadBold: true })}</li>`).join("")}</${tag}>`;
  }

  if (type === "equation" || type === "code") return `<div class="eq" dir="ltr">${escapeHtml(blockText(block))}</div>`;
  if (type === "quote" || type === "callout") {
    const text = block.content ?? block;
    return `<div class="trick" dir="${dirOf(text)}">${renderRich(block.content) || escapeHtml(blockText(block))}</div>`;
  }
  if (type === "divider") return "<hr>";
  // A lecture figure, placed inside the section that explains it (owner rule).
  if (type === "figure") {
    const src = String(block.url || block.figure?.url || "");
    if (!src) return "";
    const caption = String(block.caption || block.figure?.caption || block.text || "");
    return `<figure class="infigure" dir="auto">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}" loading="lazy">
      ${caption ? `<figcaption dir="auto">${inlineMarkup(caption)}</figcaption>` : ""}
    </figure>`;
  }

  const box = BOX_FOR_ROLE[role];
  const body = renderRich(block.content, { leadBold: true }) || inlineMarkup(blockText(block));
  if (box) return `<div class="${box.cls}" dir="${dirOf(block.content ?? block)}"><span class="box-title">${box.title}</span>${body}</div>`;
  if (role === "english_points") return `<div class="section-header-eng">📋 ${body}</div>`;
  return `<p dir="${dirOf(block.content ?? block)}">${renderRich(block.content, { leadBold: true }) || inlineMarkup(blockText(block))}</p>`;
}

/** Markdown fallback for legacy (non-v3) summaries.
 * Understands pipe tables, ordered lists, bullets, headings, and callouts —
 * a table must never collapse into a paragraph blob (owner directive). */
/**
 * "…جملة. الآلية: نص" → ["…جملة.", "الآلية: نص"]
 * Only splits when the following fragment looks like a labelled lead, so normal
 * prose with a full stop stays in one paragraph.
 */
function splitRunOnLead(line) {
  const text = String(line || "");
  const LEAD = /(?:^|\s)(الآلية|التعريف|الأعراض|التشخيص|العلاج|المضاعفات|الجرعة|الخطوات|المقارنة|الخلاصة|Definition|Mechanism|Treatment|Diagnosis|Complications|Dose|Steps|Summary)\s*[:：]/;
  const match = LEAD.exec(text);
  if (!match || match.index === 0) return [text];
  // Require a sentence end right before the lead to avoid splitting mid-clause.
  const head = text.slice(0, match.index).trim();
  if (!/[.؟!…]\s*$/.test(head)) return [text];
  return [head, text.slice(match.index).trim()];
}

function markdownToSections(markdown) {
  const lines = String(markdown || "").split("\n");
  const sections = [];
  let current = null;
  let listBuffer = [];
  let orderedBuffer = [];
  const flushLists = () => {
    if (listBuffer.length && current) {
      current.blocks.push({ type: "bullet_list", items: listBuffer.map((text) => ({ text })) });
      listBuffer = [];
    }
    if (orderedBuffer.length && current) {
      current.blocks.push({ type: "ordered_list", items: orderedBuffer.map((text) => ({ text })) });
      orderedBuffer = [];
    }
  };
  const ensureSection = () => {
    if (!current) { current = { title: { text: "المحتوى" }, blocks: [] }; sections.push(current); }
  };
  const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const isSeparatorRow = (line) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line.trim());
  const isTableLine = (line) => /^\|.*\|$/.test(line.trim()) && line.trim().split("|").length >= 3;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) { flushLists(); continue; }

    // Pipe-table: header row + separator row trigger a real <table> block.
    if (isTableLine(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flushLists();
      ensureSection();
      const headers = splitRow(line);
      const rows = [];
      i += 2; // skip separator
      while (i < lines.length && isTableLine(lines[i]) ) {
        const row = splitRow(lines[i]);
        rows.push(headers.slice(0, Math.max(headers.length, row.length)).map((_, ci) => row[ci] || ""));
        i += 1;
      }
      i -= 1; // loop increment
      current.blocks.push({ type: "table", table: { headers, rows }, role: "body" });
      continue;
    }

    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading) {
      flushLists();
      current = { title: { text: heading[1].replace(/[*_`#]/g, "").trim() }, blocks: [] };
      sections.push(current);
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) { listBuffer.push(bullet[1].trim()); continue; }
    const numbered = /^(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (numbered) { orderedBuffer.push(numbered[2].trim()); continue; }
    flushLists();
    ensureSection();
    // A line often glues two ideas together ("... قبل الجراحة. الآلية: ...")
    // because the model emits them without a blank line. Split before a
    // "Term:" / "الآلية:" style lead so each idea is its own paragraph.
    for (const piece of splitRunOnLead(line)) {
      if (piece) current.blocks.push({ type: "paragraph", role: "body", content: { text: piece } });
    }
  }
  flushLists();
  return sections.filter((section) => section.blocks.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared CSS (palette-driven). Each layout only adds its own structural rules.
// v2 fixes: print-color-adjust, @page A4, reading measure 820px (was 1150px),
// unified emphasis tokens, and a real @font-face so the Arabic font loads.
// ─────────────────────────────────────────────────────────────────────────────
const FONT_FACE = `
@font-face { font-family:'BF Arabic'; font-style:normal; font-weight:400; font-display:swap;
  src:local('IBM Plex Sans Arabic'), local('IBMPlexSansArabic-Regular'), local('Cairo'), local('Segoe UI'); }
@font-face { font-family:'BF Arabic'; font-style:normal; font-weight:700; font-display:swap;
  src:local('IBM Plex Sans Arabic Bold'), local('IBMPlexSansArabic-Bold'), local('Cairo Bold'), local('Segoe UI Bold'); }
@font-face { font-family:'BF Arabic'; font-style:normal; font-weight:800; font-display:swap;
  src:local('IBM Plex Sans Arabic Bold'), local('IBMPlexSansArabic-Bold'), local('Cairo Black'), local('Segoe UI Bold'); }
`;

const ROLE_CSS = `
.bf-t-term { font-weight:800; color:#101828; text-decoration:underline dotted #94a3b8; text-underline-offset:3px; text-decoration-thickness:1.5px; }
.bf-t-key { background:#fef6d8; color:#6b4e00; font-weight:800; padding:1px 5px 2px; border-radius:4px; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
.bf-t-value { background:#eaf2fa; color:#1b5e93; font-weight:800; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; padding:1px 6px 2px; border-radius:999px; font-size:.94em; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
.bf-t-danger { background:#fdedec; color:#b42318; font-weight:800; padding:1px 5px 2px; border-radius:4px; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
.bf-t-ok { background:#e9f7ef; color:#177245; font-weight:800; padding:1px 5px 2px; border-radius:4px; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
.bf-t-mech { color:#6d28d9; font-weight:800; }
.bf-t-code { background:#eef2f7; color:#1e3a5f; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.92em; padding:1px 5px; border-radius:4px; direction:ltr; unicode-bidi:isolate; display:inline-block; }
bdi { unicode-bidi:isolate; }

/* ── reader controls: pure CSS, no JavaScript (exports stay script-free) ── */
.bf-ctl { position:relative; }
.bf-ctl input { position:absolute; opacity:0; pointer-events:none; }
.bf-ctl label { display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:.85em; font-weight:700;
  border:1px solid #d7dde6; border-radius:999px; padding:5px 12px; background:#fff; color:#3c4a5c; }
.bf-ctl label::before { content:"○"; }
.bf-ctl input:checked + label { background:#e9f7ef; border-color:#9fd8b8; color:#177245; }
.bf-ctl input:checked + label::before { content:"●"; }
/* "إخفاء التظليل" — check the checkbox to dim every highlight. */
body:has(#bf-hide-hl:checked) .bf-t-key,
body:has(#bf-hide-hl:checked) .bf-t-value,
body:has(#bf-hide-hl:checked) .bf-t-danger,
body:has(#bf-hide-hl:checked) .bf-t-ok,
body:has(#bf-hide-hl:checked) .hl-red,
body:has(#bf-hide-hl:checked) .hl-blue,
body:has(#bf-hide-hl:checked) .hl-green,
body:has(#bf-hide-hl:checked) .hl-purple,
body:has(#bf-hide-hl:checked) .hl-yellow,
body:has(#bf-hide-hl:checked) .hl-orange { background:transparent !important; color:inherit !important; }
/* "استرجاع نشط" — blur the important bits until the student touches them. */
body:has(#bf-recall:checked) .bf-t-key,
body:has(#bf-recall:checked) .bf-t-danger,
body:has(#bf-recall:checked) .bf-t-value { filter:blur(4px); transition:filter .15s; }
body:has(#bf-recall:checked) .bf-t-key:hover,
body:has(#bf-recall:checked) .bf-t-danger:hover,
body:has(#bf-recall:checked) .bf-t-value:hover { filter:none; }
`;

function baseCss(palette) {
  return `
${FONT_FACE}
${ROLE_CSS}
* { margin:0; padding:0; box-sizing:border-box; }
html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'BF Arabic','IBM Plex Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif; background:#eef2f7; color:#16213e; line-height:1.85; padding:18px; font-size:17px; }
.wrap { max-width:820px; margin:0 auto; }
.header { background:linear-gradient(135deg, ${palette.headerFrom} 0%, ${palette.accent} 60%, ${palette.headerTo} 100%); color:#fff; padding:46px 28px; border-radius:22px; margin-bottom:26px; box-shadow:0 12px 45px ${palette.headerShadow}; }
.header h1 { font-size:2.5em; margin-bottom:8px; }
.header .subtitle { font-size:1.1em; color:${palette.subtitle}; font-weight:bold; }
.header .meta { font-size:.9em; opacity:.85; margin-top:6px; }
p { margin:11px 0; }
ul, ol { margin:10px 24px 10px 0; }
li { margin-bottom:6px; }
h2, h3 { color:${palette.accentDark}; }
.box-red,.box-blue,.box-green,.box-yellow,.box-purple,.box-dark { padding:14px 18px; border-radius:9px; margin:13px 0; }
.box-red { background:#fdeeec; border-inline-start:5px solid #e74c3c; }
.box-blue { background:#eaf3fd; border-inline-start:5px solid #2980b9; }
.box-green { background:#eafaf1; border-inline-start:5px solid #27ae60; }
.box-yellow { background:#fef9e7; border-inline-start:5px solid #f39c12; }
.box-purple { background:#f5eef8; border-inline-start:5px solid #9b59b6; }
.box-dark { background:#eaecee; border-inline-start:5px solid #16213e; }
.box-title { font-weight:bold; font-size:1.02em; margin-bottom:6px; display:block; }
.section-header { background:linear-gradient(90deg, ${palette.accentDark}, ${palette.accent}); color:#fff; padding:11px 18px; border-radius:10px; font-size:1.06em; font-weight:bold; margin:20px 0 12px; }
.section-header-eng { background:linear-gradient(90deg, ${palette.railFrom}, ${palette.railTo}); color:#fff; padding:11px 18px; border-radius:10px; font-size:1.02em; font-weight:bold; margin:20px 0 12px; direction:ltr; text-align:left; }
.trick { background:linear-gradient(135deg,#f39c12,#e67e22); color:#fff; padding:15px 20px 15px 66px; border-radius:12px; margin:15px 0; position:relative; box-shadow:0 4px 14px rgba(230,126,34,.35); }
.trick::before { content:"تريكة"; position:absolute; inset-inline-start:11px; top:50%; transform:translateY(-50%); background:#fff; color:#ca6f1e; font-weight:bold; font-size:.78em; padding:4px 9px; border-radius:12px; }
.trick b, .trick strong { color:#fffbe6; }
table { width:100%; border-collapse:collapse; margin:14px 0; border-radius:10px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.1); }
th { background:${palette.tableHead}; color:#fff; padding:10px 12px; font-size:.93em; text-align:start; }
td { padding:9px 12px; border-bottom:1px solid #e5e8ec; vertical-align:top; text-align:start; }
[dir=rtl] { direction:rtl; }
[dir=ltr] { direction:ltr; }
th[dir=rtl], td[dir=rtl], li[dir=rtl], p[dir=rtl] { text-align:right; }
th[dir=ltr], td[dir=ltr], li[dir=ltr], p[dir=ltr] { text-align:left; unicode-bidi:isolate; }
ul[dir]:dir(ltr), ol[dir]:dir(ltr), ul, ol { padding-inline-start:0; }
li { unicode-bidi:isolate; }
tr:nth-child(even) td { background:#f8fafc; }
.eq { background:#16213e; color:#fff; direction:ltr; text-align:left; padding:13px 16px; border-radius:10px; margin:13px 0; font-family:ui-monospace,Menlo,monospace; overflow-x:auto; }
code { background:#eaecee; padding:2px 6px; border-radius:5px; font-family:ui-monospace,Menlo,monospace; direction:ltr; display:inline-block; }
/* Keyword color chips — visible color identity for important terms (owner rule). */
.hl-red,.hl-blue,.hl-green,.hl-purple,.hl-yellow,.hl-orange { font-weight:800; border-radius:5px; padding:1px 6px 2px; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
.hl-red { color:#a93226; background:#fdedec; }
.hl-blue { color:#1b5e93; background:#eaf2fa; }
.hl-green { color:#177245; background:#e9f7ef; }
.hl-purple { color:#6c3483; background:#f4ecf7; }
.hl-yellow { color:#8c5e10; background:#fef9e7; }
.hl-orange { color:#a1480f; background:#fbf0e4; }
/* Single bold identity (the palette accent rule was overridden by this one —
   keeping one definition avoids the duplicate that made bold colourless). */
b, strong { color:#101828; font-weight:800; }

/* ── print / PDF: colours must survive, pages must not split badly ── */
@page { size:A4; margin:14mm 13mm 15mm; }
@media print {
  html, body { background:#fff !important; padding:0 !important; }
  .wrap { max-width:none; margin:0; }
  .header { box-shadow:none; border-radius:14px; padding:26px 20px; margin-bottom:18px; }
  .header h1 { font-size:1.9em; }
  .module, .box, .card, .cramcard, .outline li, table, tr, img, figure,
  .modbody > *, .hl-red, .hl-blue, .hl-green, .hl-purple, .hl-yellow, .hl-orange,
  .bf-t-key, .bf-t-value, .bf-t-danger, .bf-t-ok {
    break-inside:avoid; page-break-inside:avoid;
  }
  .module-title, h1, h2, h3, h4, .toc { break-after:avoid; page-break-after:avoid; }
  p { orphans:3; widows:3; }
  a { color:inherit; text-decoration:none; }
  .toc { position:static; background:#fff; border:1px solid #d7dde6; max-height:none; overflow:visible; }
  /* Print always uses the light theme, no sticky chrome. */
  body[data-theme="dark"], body[data-theme="sepia"] { background:#fff !important; color:#101828 !important; }
  .no-print { display:none !important; }
}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT: modules — the reference design (index + numbered module cards)
// ─────────────────────────────────────────────────────────────────────────────
function layoutModules({ sections, overview, conclusion, heading, palette, sourceCount }) {
  const toc = sections.map((s, i) => `<li><a href="#s${i + 1}"><span class="tocnum">${String(i + 1).padStart(2, "0")}</span>${renderRich(s.title) || `القسم ${i + 1}`}</a></li>`).join("");
  return `
  <div class="header" style="text-align:center">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">ملف مذاكرة — ${sections.length} قسم</div>
    ${sourceCount ? `<div class="meta">${sourceCount} صفحة مصدر</div>` : ""}
  </div>
  ${toc ? `<div class="toc"><h3>📑 فهرس المذاكرة (اضغط على أي عنوان للانتقال)</h3><ol>${toc}</ol></div>` : ""}
  ${overview.length ? `<div class="module"><div class="module-title"><span class="modnum">✦</span> نظرة سريعة</div><div class="modbody">${overview.map(renderBlock).join("")}</div></div>` : ""}
  ${sections.map((section, i) => `
    <div class="module" id="s${i + 1}">
      <div class="module-title"><span class="modnum">${String(i + 1).padStart(2, "0")}</span> ${renderRich(section.title) || `القسم ${i + 1}`}</div>
      <div class="modbody">${section.blocks.map(renderBlock).join("")}</div>
    </div>`).join("")}
  ${conclusion.length ? `<div class="module"><div class="module-title"><span class="modnum">🏁</span> الخلاصة</div><div class="modbody">${conclusion.map(renderBlock).join("")}</div></div>` : ""}
  <style>
    .toc { background:#fff; border-radius:16px; padding:20px 28px; margin-bottom:26px; box-shadow:0 4px 18px rgba(0,0,0,.07); border-inline-start:6px solid ${palette.accent}; }
    /* Sticky index on wide screens — jump to any section without scrolling up.
       Print overrides this back to static (see @media print). */
    @media screen and (min-width:1080px) {
      .toc { position:sticky; top:12px; z-index:5; max-height:calc(100vh - 32px); overflow:auto; }
    }
    /* Collapsible sections without JavaScript. */
    details.secfold > summary { cursor:pointer; list-style:none; }
    details.secfold > summary::-webkit-details-marker { display:none; }
    details.secfold > summary::after { content:"▾"; float:inline-end; opacity:.7; font-size:.9em; }
    details.secfold[open] > summary::after { content:"▴"; }
    .toc h3 { margin-bottom:12px; font-size:1.08em; color:${palette.accentDark}; }
    .toc ol { margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:8px; }
    .toc a { display:flex; align-items:center; gap:9px; color:#16213e; text-decoration:none; font-weight:bold; background:#f4f7fa; border:1px solid #e3e9ef; border-radius:11px; padding:9px 12px; font-size:.94em; transition:background .15s ease; }
    .toc a:hover { background:#e9f1f8; }
    .tocnum { flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; min-width:28px; height:28px; border-radius:9999px; background:${palette.accent}; color:#fff; font-family:ui-monospace,monospace; font-size:.78em; font-weight:900; }
    .module { background:#fff; border-radius:18px; margin-bottom:26px; box-shadow:0 6px 24px rgba(0,0,0,.08); overflow:hidden; border:1px solid #e6ebf1; }
    .module-title { display:flex; align-items:center; gap:12px; font-size:1.22em; font-weight:900; color:#fff; background:linear-gradient(120deg, ${palette.headerFrom}, ${palette.accent} 75%); padding:16px 24px; line-height:1.6; }
    .modnum { flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; min-width:36px; height:36px; padding:0 8px; border-radius:12px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.35); font-family:ui-monospace,monospace; font-size:.72em; font-weight:900; }
    .modbody { padding:22px 26px 26px; }
    .modbody ul { margin:6px 0 12px; padding-inline-start:4px; list-style:none; }
    .modbody ul > li { position:relative; padding:7px 24px; padding-inline-start:24px; padding-inline-end:0; border-bottom:1px dashed #eef2f6; line-height:1.8; }
    .modbody ul > li:last-child { border-bottom:0; }
    .modbody ul > li::before { content:"◆"; position:absolute; inset-inline-start:2px; top:9px; font-size:.62em; color:${palette.accent}; }
    /* English bullets: marker and text follow LTR, never overlapping. */
    .modbody ul > li[dir="ltr"] { padding-inline-start:24px; padding-inline-end:0; text-align:left; }
    .modbody p { margin:9px 0; }
    .modbody .section-header { background:linear-gradient(90deg, ${palette.accentDark}, ${palette.accent}); color:#fff; }
    .modbody table { margin:12px 0; }
    .modbody th { background:${palette.tableHead}; }
    @media (max-width:640px) { .modbody { padding:16px 16px 18px; } .module-title { padding:13px 16px; font-size:1.05em; } }
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
    <div class="subtitle">⚡ بطاقة مراجعة سريعة — ${sections.length} محور</div>
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
    .outline > li { background:#fff; border-radius:12px; padding:16px 18px; margin-bottom:12px; box-shadow:0 3px 12px rgba(0,0,0,.06); border-inline-start:4px solid ${palette.accent}; counter-increment:step; position:relative; }
    .outline { counter-reset:step; }
    .outline > li::before { content:counter(step,decimal-leading-zero); position:absolute; inset-inline-start:-6px; top:16px; background:${palette.accent}; color:#fff; border-radius:8px; padding:2px 9px; font-size:.75em; font-family:ui-monospace,monospace; }
    .outtitle { font-weight:bold; font-size:1.12em; color:${palette.accentDark}; margin-bottom:8px; padding-inline-start:34px; }
    .outblock { background:#fff; border-radius:12px; padding:16px 18px; margin-bottom:12px; box-shadow:0 3px 12px rgba(0,0,0,.06); border-inline-start:4px solid ${palette.accentDark}; }
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
  figures = [],
} = {}) {
  const template = getStudyGuideTemplate(templateId || themeId);
  const palette = GUIDE_PALETTES[template.palette];
  const layout = LAYOUTS[template.layout] || layoutModules;

  const sections = Array.isArray(doc?.sections) && doc.sections.length
    ? doc.sections.map((section) => ({
        title: section.title,
        blocks: Array.isArray(section.blocks) ? section.blocks : [],
        // Needed to pin each figure to the section that actually explains it
        // (owner rule: "صور تحت شرحها مباشرة", not one gallery at the end).
        sourceRefs: Array.isArray(section.sourceRefs) ? section.sourceRefs.map(Number).filter(Number.isFinite) : [],
      }))
    : markdownToSections(markdown);

  const heading = title || doc?.title?.text || blockText({ content: doc?.title }) || "ملخص دراسي";
  const overview = Array.isArray(doc?.overview) ? doc.overview : [];
  const conclusion = Array.isArray(doc?.conclusion) ? doc.conclusion : [];
  const sourceCount = Array.isArray(doc?.metadata?.sourceRefs) ? doc.metadata.sourceRefs.length : 0;

  // ── figure placement: under the section that explains them ───────────────
  // A figure whose page appears in a section's sourceRefs is injected right
  // after that section's blocks. Figures with no home fall to the NEAREST
  // section by page order (never a single gallery at the end of the file).
  const allFigures = (Array.isArray(figures) ? figures : [])
    .filter((figure) => figure && figure.url && Number(figure.page) > 0)
    .slice(0, 18);
  const figuresBySection = new Map();
  const claimed = new Set();
  sections.forEach((section, index) => {
    const refs = Array.isArray(section.sourceRefs) ? section.sourceRefs : [];
    const hits = allFigures.filter(
      (figure) => refs.includes(Number(figure.page)) && !claimed.has(Number(figure.page)),
    );
    hits.forEach((figure) => claimed.add(Number(figure.page)));
    if (hits.length) figuresBySection.set(index, hits);
  });
  const leftovers = allFigures.filter((figure) => !claimed.has(Number(figure.page)));
  if (leftovers.length && sections.length) {
    // Nearest section by page number: keeps a figure beside its discussion.
    const pageAnchors = sections.map((section, index) => ({
      index,
      pages: Array.isArray(section.sourceRefs) && section.sourceRefs.length
        ? section.sourceRefs
        : [index + 1],
    }));
    leftovers.forEach((figure) => {
      const target = pageAnchors
        .map((anchor) => ({
          index: anchor.index,
          distance: Math.min(...anchor.pages.map((page) => Math.abs(page - Number(figure.page)))),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
      const list = figuresBySection.get(target.index) || [];
      list.push(figure);
      figuresBySection.set(target.index, list);
    });
  }

  // Put each placed figure INSIDE its section (all five layouts render blocks).
  if (figuresBySection.size) {
    figuresBySection.forEach((list, index) => {
      const target = sections[index];
      if (!target) return;
      target.blocks = [
        ...(target.blocks || []),
        ...list.map((figure) => ({
          type: "figure",
          url: figure.url,
          caption: figure.caption || `صفحة ${figure.page || ""}`,
        })),
      ];
    });
  }

  const body = sections.length
    ? layout({ sections, overview, conclusion, heading, palette, sourceCount })
    : `<div class="header" style="text-align:center"><h1>${escapeHtml(heading)}</h1></div><p style="text-align:center">لسه مفيش محتوى في الملخص ده.</p>`;

  // ── Infographic band: mind-map chips + lecture figure gallery ─────────────
  // Owner directive: an exported summary must LOOK like an infographic and
  // carry the lecture photos — never a wall of text.
  const MIND_COLORS = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#22d3ee", "#fb923c"];
  const mindChips = sections.slice(0, 8).map((section, index) => {
    const chipText = escapeHtml(
      String(blockText(section.title) || `محور ${index + 1}`)
        .split(/\s+/).slice(0, 7).join(" ")
    );
    const color = MIND_COLORS[index % MIND_COLORS.length];
    return `<div class="mm-chip" style="border-color:${color}66;background:${color}14">
      <span class="mm-num" style="background:${color}">${String(index + 1).padStart(2, "0")}</span>
      <span class="mm-txt" dir="auto">${chipText}</span>
    </div>`;
  }).join("");

  // Anything still unplaced (e.g. markdown-only summaries with no sections)
  // becomes a gallery; placed figures are already rendered inline.
  const figItems = (sections.length ? [] : (Array.isArray(figures) ? figures : []))
    .filter((figure) => figure && figure.url)
    .slice(0, 18)
    .map((figure) => `
      <figure class="figcard">
        <img src="${escapeHtml(String(figure.url))}" alt="" loading="lazy" onerror="this.parentNode.style.display='none'">
        <figcaption dir="auto">${escapeHtml(figure.caption || `صفحة ${figure.page || ""}`)}</figcaption>
      </figure>`).join("");

  const infographicBand = (mindChips || figItems) ? `
  <section class="infoband">
    ${mindChips ? `<div class="mm-band">
      <div class="mm-title" dir="rtl">🧠 الخريطة الذهنية — ${sections.length} محور في نظرة واحدة</div>
      <div class="mm-grid">${mindChips}</div>
    </div>` : ""}
    ${figItems ? `<div class="fig-band">
      <div class="mm-title" dir="rtl">📸 صور ومخططات المحاضرة (${(Array.isArray(figures) ? figures : []).length})</div>
      <div class="fig-grid">${figItems}</div>
    </div>` : ""}
  </section>` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(heading)}</title>
<style>${baseCss(palette)}
/* ── infographic band ── */
.infoband { margin: 22px 0; display:grid; gap:18px; }
.mm-band, .fig-band { background:#fff; border-radius:16px; padding:20px 22px; box-shadow:0 5px 20px rgba(0,0,0,.08); }
.mm-title { font-weight:900; font-size:1.05em; color:${palette.accentDark}; margin-bottom:14px; }
.mm-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
.mm-chip { display:flex; align-items:center; gap:8px; border:1px solid; border-radius:12px; padding:9px 11px; }
.mm-num { flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; min-width:26px; height:26px; border-radius:9999px; color:#fff; font-family:ui-monospace,monospace; font-size:.75em; font-weight:900; }
.mm-txt { font-size:.9em; font-weight:700; color:#16213e; line-height:1.5; }
.infigure { margin:14px 0; border:1px solid #e2e6ea; border-radius:12px; overflow:hidden; background:#f8fafc; break-inside:avoid; page-break-inside:avoid; }
.infofigure img, .infigure img { display:block; width:100%; height:auto; }
.infofigure figcaption, .infigure figcaption { padding:9px 12px; font-size:.9em; color:#4c5766; border-top:1px solid #e2e6ea; background:#fff; }
.fig-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
.figcard { margin:0; border:1px solid #e2e6ea; border-radius:12px; overflow:hidden; background:#f8fafc; break-inside:avoid; }
.figcard img { width:100%; height:auto; display:block; object-fit:contain; background:#fff; }
.figcard figcaption { padding:6px 10px; font-size:.78em; color:#475569; border-top:1px solid #e2e6ea; background:#fff; }
@media print { body { background:#fff; padding:0; } .module,.toc,.cramcard,.tile,.tsection,.outline>li,.mm-band,.fig-band,.figcard { box-shadow:none; break-inside:avoid; } }
</style>
</head>
<body>
<!-- Reader controls: checkboxes drive the CSS above, so the exported file needs
     no JavaScript at all (works offline, prints correctly, no sandbox risk). -->
<div class="wrap">
<div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px">
  <span class="bf-ctl"><input type="checkbox" id="bf-hide-hl"><label for="bf-hide-hl">إخفاء التظليل</label></span>
  <span class="bf-ctl"><input type="checkbox" id="bf-recall"><label for="bf-recall">استرجاع نشط — التظليل يتغبّش لحد ما تلمسه</label></span>
</div>
${body}
${infographicBand}
</div>
</body>
</html>`;
}

export default renderStudyGuideHtml;
