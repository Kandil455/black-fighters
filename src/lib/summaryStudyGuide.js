/**
 * summaryStudyGuide.js — the HTML study-guide template engine.
 *
 * TWO SEPARATE AXES:
 *   layout  — the actual DOM structure and reading flow:
 *               modules  · header + index + module cards (the reference file design)
 *               cram     · dense two-column revision sheet, no index, print 2-up
 *               cards    · a responsive grid of tiles, for scanning not reading
 *               outline  · a numbered checklist outline, minimal chrome
 *               tables   · comparison-first: each section is a table with notes
 *   palette — colour identity (emergency red / clinical navy / pharma green /
 *             exam amber), including the owner's two reference palettes.
 *
 * Includes automatic bidirectional (LTR/RTL) alignment, paired English+Arabic
 * concept cards, and smart academic auto-bolding & clinical/numerical highlighting.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Detects whether a piece of text is predominantly English (LTR) or Arabic (RTL). */
export function detectTextDir(raw = "", role = "") {
  if (role === "english_points") return "ltr";
  if (role === "arabic_explanation") return "rtl";
  const str = String(raw || "");
  const arMatches = str.match(/[\u0600-\u06FF]/g);
  const enMatches = str.match(/[A-Za-z]/g);
  const arCount = arMatches ? arMatches.length : 0;
  const enCount = enMatches ? enMatches.length : 0;
  if (arCount === 0 && enCount > 0) return "ltr";
  if (enCount > arCount * 1.35) return "ltr";
  return "rtl";
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

// ── rich text → HTML (annotation spans + smart academic bold/highlight engine) ───
const ANNOTATION_CLASS = {
  green: "hl-green",
  yellow: "hl-yellow",
  cyan: "hl-blue",
  blue: "hl-blue",
  orange: "hl-orange",
  red: "hl-red",
};

/**
 * Enhances an already HTML-escaped string with:
 * 1. Explicit inline markers (`==color:text==`, `**bold**`, `` `code` ``)
 * 2. Automatic bolding of lead terms/clauses (before `:`, `—`, `,`, `،`, or key verbs)
 * 3. Automatic bolding of English medical/scientific terms inside parentheses
 * 4. Automatic highlighting of clinical dosages, numbers+units, cutoffs, and high-yield exam words
 */
export function enhanceAcademicHtml(escapedHtml = "") {
  let out = String(escapedHtml || "");
  if (!out) return "";

  // 1. Convert explicit inline markup if present in text
  out = out
    .replace(
      /==(green|yellow|cyan|blue|orange|red):([^=]+)==/g,
      (_, color, body) => `<span class="${ANNOTATION_CLASS[color] || "hl-yellow"}">${body}</span>`
    )
    .replace(/==([^=]+)==/g, '<span class="hl-yellow">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>');

  const alreadyHasLeadBold = /^\s*<(?:b|strong|span|code)\b/i.test(out);

  // 2. Auto-bold lead topic/clause when not already bolded
  if (!alreadyHasLeadBold) {
    if (/^([^:—<]{2,78})(\s*[:—]\s*)(.+)$/s.test(out)) {
      out = out.replace(/^([^:—<]{2,78})(\s*[:—]\s*)(.+)$/s, "<b>$1</b>$2$3");
    } else if (/^([A-Z][A-Za-z0-9\s/-]{3,60})(,\s+)(.+)$/s.test(out)) {
      out = out.replace(/^([A-Z][A-Za-z0-9\s/-]{3,60})(,\s+)(.+)$/s, "<b>$1</b>$2$3");
    } else if (
      /^([A-Z][A-Za-z0-9\s/-]{2,55}?)(\s+(?:is|are|was|were|must|should|can|will|requires?|indicates?|causes?|leads?\s+to|results?\s+in|prevents?|maintains?|controls?|defines?|represents?|occurs?)\b)/i.test(
        out
      )
    ) {
      out = out.replace(
        /^([A-Z][A-Za-z0-9\s/-]{2,55}?)(\s+(?:is|are|was|were|must|should|can|will|requires?|indicates?|causes?|leads?\s+to|results?\s+in|prevents?|maintains?|controls?|defines?|represents?|occurs?)\b)/i,
        "<b>$1</b>$2"
      );
    } else if (/^([^،<]{4,68})(،\s+)(.+)$/s.test(out)) {
      out = out.replace(/^([^،<]{4,68})(،\s+)(.+)$/s, "<b>$1</b>$2$3");
    } else if (
      /^((?:في حالة|عند|يجب|يتم|تعتبر|يعتبر|إن|أن|تؤدي|يؤدي|الهدف من|أهم|أبكر|أول)\s+[\u0600-\u06FF\s]{3,42})(\s+)/.test(
        out
      )
    ) {
      out = out.replace(
        /^((?:في حالة|عند|يجب|يتم|تعتبر|يعتبر|إن|أن|تؤدي|يؤدي|الهدف من|أهم|أبكر|أول)\s+[\u0600-\u06FF\s]{3,42})(\s+)/,
        "<b>$1</b>$2"
      );
    }
  }

  // 3. Bold English technical/medical terms inside parentheses: e.g. (Circulation), (Tachycardia)
  out = out.replace(
    /\(([A-Za-z][A-Za-z0-9\s/-]{1,42})\)/g,
    (_, term) => `(<b>${term}</b>)`
  );

  // 4. Highlight numbers with clinical/scientific units, thresholds, time windows, or percentages
  if (!out.includes('class="hl-')) {
    out = out.replace(
      /(\b(?:GCS\s*(?:&lt;|&gt;|≤|≥|=)?\s*\d+|C\d\s*[-–]\s*C\d|\d+(?:\.\d+)?\s*(?:mmHg|mg\/dL|mg\/kg|mg|g|mcg|mL|ml|L|%|bpm|min|minutes|hrs|hours|sec|seconds|cm|mm|mEq\/L|mmol\/L|IU|مم زئبق|دقائق|دقيقة|ساعات|ساعة|ثواني|ثانية|ملجم|جم|جرام|مل|لتر))(?![A-Za-z\u0600-\u06FF]))/gi,
      '<span class="hl-yellow">$1</span>'
    );
  }

  // 5. Highlight critical exam warning/priority phrases
  out = out.replace(
    /(\b(?:earliest measurable sign|definitive airway|gold standard|first-line|contraindicated|life-threatening|mandatory|immediately)\b|أبكر علامة|القاعدة الذهبية|الخط الأول|ممنوع|فوراً|حتمي)/gi,
    (match) => `<span class="hl-red">${match}</span>`
  );

  return out;
}

function renderRich(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return enhanceAcademicHtml(escapeHtml(value));
  }
  const text = String(value.text || "");
  const annotations = (Array.isArray(value.annotations) ? value.annotations : [])
    .filter((a) => Number(a?.end) > Number(a?.start));
  if (!annotations.length) {
    return enhanceAcademicHtml(escapeHtml(text));
  }

  const bounds = [...new Set([0, text.length, ...annotations.flatMap((a) => [Number(a.start), Number(a.end)])])]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= text.length)
    .sort((a, b) => a - b);

  const annotatedHtml = bounds.slice(0, -1).map((start, index) => {
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

  return enhanceAcademicHtml(annotatedHtml);
}

function itemPlainText(item) {
  if (item == null) return "";
  if (typeof item === "string" || typeof item === "number") return String(item);
  return String(item.text || item.content?.text || item.content || "");
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

/** One block → the layout's shared content vocabulary with explicit LTR/RTL direction. */
function renderBlock(block) {
  if (!block) return "";
  const type = String(block.type || "paragraph");
  const role = String(block.role || "body");
  const rawText = blockText(block);
  const blockDir = detectTextDir(rawText, role);

  if (type === "heading") {
    return `<div class="section-header" dir="${blockDir}">${renderRich(block.content) || enhanceAcademicHtml(escapeHtml(rawText))}</div>`;
  }

  if (type === "table") {
    const table = block.table && typeof block.table === "object" ? block.table : block;
    const headers = Array.isArray(table.headers) ? table.headers : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    if (!headers.length && !rows.length) return "";
    return `<table>
      ${headers.length ? `<thead><tr>${headers.map((h) => `<th dir="${detectTextDir(itemPlainText(h))}">${renderRich(h)}</th>`).join("")}</tr></thead>` : ""}
      <tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td dir="${detectTextDir(itemPlainText(cell))}">${renderRich(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  }

  if (type === "bullet_list" || type === "ordered_list") {
    const items = Array.isArray(block.items) ? block.items : [];
    const tag = type === "ordered_list" ? "ol" : "ul";
    const listDir = role === "english_points" ? "ltr" : role === "arabic_explanation" ? "rtl" : blockDir;
    const listCls = listDir === "ltr" ? "list-ltr" : "list-rtl";
    const listHtml = `<${tag} class="${listCls}" dir="${listDir}">${items
      .map((item) => {
        const iDir = detectTextDir(itemPlainText(item), role);
        return `<li dir="${iDir}">${renderRich(item)}</li>`;
      })
      .join("")}</${tag}>`;

    if (role === "english_points") {
      return `<div class="section-header-eng" dir="ltr">📋 Key English Concepts</div>${listHtml}`;
    }
    if (role === "arabic_explanation") {
      return `<div class="section-header-ar" dir="rtl">🇪🇬 الشرح والتفصيل بالعربي</div>${listHtml}`;
    }
    return listHtml;
  }

  if (type === "equation" || type === "code") return `<div class="eq" dir="ltr">${escapeHtml(rawText)}</div>`;
  if (type === "quote" || type === "callout") {
    return `<div class="trick" dir="${blockDir}">${renderRich(block.content) || enhanceAcademicHtml(escapeHtml(rawText))}</div>`;
  }
  if (type === "divider") return "<hr>";

  const box = BOX_FOR_ROLE[role];
  const body = renderRich(block.content) || enhanceAcademicHtml(escapeHtml(rawText));
  if (box) return `<div class="${box.cls}" dir="${blockDir}"><span class="box-title">${box.title}</span>${body}</div>`;
  if (role === "english_points") return `<div class="section-header-eng" dir="ltr">📋 ${body}</div>`;
  return `<p dir="${blockDir}">${body}</p>`;
}

/**
 * Renders a sequence of blocks inside a section, automatically pairing adjacent
 * `english_points` and `arabic_explanation` bullet lists into numbered Bilingual Study Cards
 * so English points are never separated from their Arabic explanations.
 */
function renderBlocksSequence(blocks = [], customRenderer = renderBlock) {
  const list = Array.isArray(blocks) ? blocks : [];
  const out = [];

  for (let i = 0; i < list.length; i++) {
    const cur = list[i];
    const next = list[i + 1];
    if (
      cur &&
      next &&
      (cur.type === "bullet_list" || cur.type === "ordered_list") &&
      (next.type === "bullet_list" || next.type === "ordered_list") &&
      cur.role === "english_points" &&
      next.role === "arabic_explanation"
    ) {
      const enItems = Array.isArray(cur.items) ? cur.items : [];
      const arItems = Array.isArray(next.items) ? next.items : [];
      const maxLen = Math.max(enItems.length, arItems.length);
      const pairsHtml = [];

      for (let idx = 0; idx < maxLen; idx++) {
        const enItem = enItems[idx];
        const arItem = arItems[idx];
        const num = String(idx + 1).padStart(2, "0");
        pairsHtml.push(`
          <div class="bilingual-pair">
            ${
              enItem
                ? `<div class="bilingual-en" dir="ltr">
                    <span class="pair-badge pair-badge-en">${num} · EN</span>
                    <div class="pair-content">${renderRich(enItem)}</div>
                  </div>`
                : ""
            }
            ${
              arItem
                ? `<div class="bilingual-ar" dir="rtl">
                    <span class="pair-badge pair-badge-ar">الشرح بالعربي</span>
                    <div class="pair-content">${renderRich(arItem)}</div>
                  </div>`
                : ""
            }
          </div>`);
      }

      out.push(
        `<div class="section-header-eng" dir="ltr">📋 Key Concepts &amp; Bilingual Explanation</div>
         <div class="bilingual-stack">${pairsHtml.join("")}</div>`
      );
      i++; // skip `next` because we paired it
      continue;
    }

    out.push(customRenderer(cur, i));
  }

  return out.join("");
}

/** Markdown fallback for legacy (non-v3) summaries — preserves **bold** and ==highlights==. */
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
    if (bullet) { listBuffer.push(bullet[1].trim()); continue; }
    flushList();
    if (!current) { current = { title: { text: "المحتوى" }, blocks: [] }; sections.push(current); }
    current.blocks.push({ type: "paragraph", role: "body", content: { text: line } });
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
p[dir="ltr"] { direction:ltr; text-align:left; }
p[dir="rtl"] { direction:rtl; text-align:right; }
ul, ol { margin:10px 24px 10px 0; }
ul.list-ltr, ol.list-ltr, ul[dir="ltr"], ol[dir="ltr"] { direction:ltr; text-align:left; margin:10px 0 10px 24px; }
ul.list-rtl, ol.list-rtl, ul[dir="rtl"], ol[dir="rtl"] { direction:rtl; text-align:right; margin:10px 24px 10px 0; }
li { margin-bottom:8px; line-height:1.85; }
li[dir="ltr"] { direction:ltr; text-align:left; }
li[dir="rtl"] { direction:rtl; text-align:right; }
b, strong { color:${palette.accentDark}; font-weight:800; }
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
.section-header-ar { background:linear-gradient(90deg, ${palette.accentDark}, ${palette.accent}); color:#fff; padding:10px 16px; border-radius:10px; font-size:1em; font-weight:bold; margin:16px 0 10px; direction:rtl; text-align:right; }
.bilingual-stack { display:flex; flex-direction:column; gap:14px; margin:14px 0 18px; }
.bilingual-pair { border:1px solid #dbe3ee; border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 3px 12px rgba(15,52,96,0.06); }
.bilingual-en { direction:ltr; text-align:left; padding:14px 18px; background:#f8fafc; border-bottom:1px dashed #cbd5e1; display:flex; align-items:flex-start; gap:12px; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; }
.bilingual-ar { direction:rtl; text-align:right; padding:14px 18px; background:#fffdf9; display:flex; align-items:flex-start; gap:12px; }
.pair-badge { flex:0 0 auto; font-size:.74em; font-weight:800; padding:3px 9px; border-radius:7px; margin-top:3px; letter-spacing:.03em; }
.pair-badge-en { background:${palette.railTo}; color:#fff; font-family:ui-monospace,Menlo,monospace; }
.pair-badge-ar { background:${palette.accent}; color:#fff; }
.pair-content { flex:1; min-width:0; line-height:1.85; }
.trick { background:linear-gradient(135deg,#f39c12,#e67e22); color:#fff; padding:15px 20px 15px 66px; border-radius:12px; margin:15px 0; position:relative; box-shadow:0 4px 14px rgba(230,126,34,.35); }
.trick::before { content:"تريكة"; position:absolute; left:11px; top:50%; transform:translateY(-50%); background:#fff; color:#ca6f1e; font-weight:bold; font-size:.78em; padding:4px 9px; border-radius:12px; }
.trick b, .trick strong { color:#fffbe6; }
table { width:100%; border-collapse:collapse; margin:14px 0; border-radius:10px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.1); }
th { background:${palette.tableHead}; color:#fff; padding:10px 12px; text-align:right; font-size:.93em; }
th[dir="ltr"], td[dir="ltr"] { direction:ltr; text-align:left; }
td { padding:9px 12px; border-bottom:1px solid #e5e8ec; vertical-align:top; }
tr:nth-child(even) td { background:#f8fafc; }
.eq { background:#16213e; color:#fff; direction:ltr; text-align:left; padding:13px 16px; border-radius:10px; margin:13px 0; font-family:ui-monospace,Menlo,monospace; overflow-x:auto; }
code { background:#eaecee; padding:2px 6px; border-radius:5px; font-family:ui-monospace,Menlo,monospace; direction:ltr; display:inline-block; }
.hl-red { background:#fee2e2; color:#991b1b; font-weight:800; padding:1px 6px; border-radius:5px; }
.hl-blue { background:#dbeafe; color:#1e40af; font-weight:800; padding:1px 6px; border-radius:5px; }
.hl-green { background:#dcfce7; color:#166534; font-weight:800; padding:1px 6px; border-radius:5px; }
.hl-purple { background:#f3e8ff; color:#6b21a8; font-weight:800; padding:1px 6px; border-radius:5px; }
.hl-yellow { background:#fef08a; color:#854d0e; font-weight:800; padding:1px 6px; border-radius:5px; }
.hl-orange { background:#ffedd5; color:#9a3412; font-weight:800; padding:1px 6px; border-radius:5px; }
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
  ${overview.length ? `<div class="module"><div class="module-title">نظرة سريعة</div>${renderBlocksSequence(overview)}</div>` : ""}
  ${sections.map((section, i) => `
    <div class="module" id="s${i + 1}">
      <div class="module-title" dir="${detectTextDir(itemPlainText(section.title))}">${i + 1}. ${renderRich(section.title) || `القسم ${i + 1}`}</div>
      ${renderBlocksSequence(section.blocks)}
    </div>`).join("")}
  ${conclusion.length ? `<div class="module"><div class="module-title">الخلاصة</div>${renderBlocksSequence(conclusion)}</div>` : ""}
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
  return `
  <div class="header" style="text-align:center; padding:30px 22px">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">⚡ برشامة مراجعة سريعة — ${sections.length} محور</div>
  </div>
  ${overview.length ? `<div class="crambox">${renderBlocksSequence(overview)}</div>` : ""}
  <div class="cramgrid">
    ${sections.map((section, i) => `
      <div class="cramcard">
        <div class="cramhead"><span class="num">${String(i + 1).padStart(2, "0")}</span>${renderRich(section.title) || `محور ${i + 1}`}</div>
        ${renderBlocksSequence(section.blocks)}
      </div>`).join("")}
  </div>
  ${conclusion.length ? `<div class="crambox" style="border-color:${palette.accent}"><div class="cramhead">🏁 آخر حاجة قبل الامتحان</div>${renderBlocksSequence(conclusion)}</div>` : ""}
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
  const tile = (block) => {
    const role = String(block?.role || "body");
    const box = BOX_FOR_ROLE[role];
    const label = box ? box.title : (block.type === "table" ? "📊 جدول" : "📝 ملاحظة");
    const tone = box ? box.cls : "box-dark";
    const raw = blockText(block);
    const dir = detectTextDir(raw, role);
    const body = block.type === "table" || block.type === "bullet_list" || block.type === "ordered_list"
      ? renderBlock(block)
      : `<p dir="${dir}">${renderRich(block.content) || enhanceAcademicHtml(escapeHtml(raw))}</p>`;
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
  const line = (block) => {
    const type = String(block?.type || "paragraph");
    const role = String(block?.role || "body");
    if (type === "bullet_list" || type === "ordered_list") {
      return renderBlock(block);
    }
    if (type === "table") return renderBlock(block);
    const raw = blockText(block);
    const dir = detectTextDir(raw, role);
    const tag = role === "warning" ? "⚠️" : role === "definition" ? "📘" : role === "example" ? "💡" : "•";
    return `<p class="line" dir="${dir}"><span class="tag">${tag}</span><span>${renderRich(block.content) || enhanceAcademicHtml(escapeHtml(raw))}</span></p>`;
  };
  return `
  <div class="header" style="text-align:center; padding:26px 20px">
    <h1>${escapeHtml(heading)}</h1>
    <div class="subtitle">📋 مخطط مرقّم — ${sections.length} محور</div>
  </div>
  ${overview.length ? `<div class="outblock">${renderBlocksSequence(overview, line)}</div>` : ""}
  <ol class="outline">
    ${sections.map((section, i) => `
      <li>
        <div class="outtitle">${renderRich(section.title) || `محور ${i + 1}`}</div>
        <div class="outbody">${renderBlocksSequence(section.blocks, line)}</div>
      </li>`).join("")}
  </ol>
  ${conclusion.length ? `<div class="outblock"><div class="outtitle">🏁 الخلاصة</div>${renderBlocksSequence(conclusion, line)}</div>` : ""}
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
    .outline ul.list-ltr, .outblock ul.list-ltr { margin:8px 0 8px 22px; }
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
  ${overview.length ? `<div class="tsection">${renderBlocksSequence(overview)}</div>` : ""}
  ${sections.map((section, i) => {
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    const tables = blocks.filter((b) => b.type === "table");
    const rest = blocks.filter((b) => b.type !== "table");
    return `
      <div class="tsection">
        <div class="theader"><span class="num">${String(i + 1).padStart(2, "0")}</span>${renderRich(section.title) || `محور ${i + 1}`}</div>
        ${tables.map(renderBlock).join("")}
        ${rest.length ? `<div class="tnotes">${renderBlocksSequence(rest)}</div>` : ""}
      </div>`;
  }).join("")}
  ${conclusion.length ? `<div class="tsection"><div class="theader">🏁 الخلاصة</div>${renderBlocksSequence(conclusion)}</div>` : ""}
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
