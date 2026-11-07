/**
 * InfographicSummary — renders an AI medical summary document (summaryV3 /
 * summaryDocument normalizeV3Blocks shape) as a premium visual infographic.
 *
 * ── Props contract ────────────────────────────────────────────────────────────
 * <InfographicSummary
 *   document={documentV3}     // { title?, sections:[{id,title,sourceRefs?,blocks|items}], overview?, conclusion?, meta? }
 *   figures={[]}              // [{ page, url, caption }]
 *   isEn={false}              // UI language: false => Arabic RTL (default), true => English LTR
 *   onOpenImage={(url)=>void} // optional: enables figure lightbox / page-ref buttons
 * />
 *
 * ── Detection rules ───────────────────────────────────────────────────────────
 * • Two adapters accept BOTH shapes:
 *   – section.items  : normalizeV3Blocks() output from src/lib/summaryDocument.js
 *     (kind: table | list | callout | concepts | card | subheading | figure | bilingual_pairs)
 *   – section.blocks : raw v3 blocks (type: paragraph | bullet_list | ordered_list |
 *     table | callout | heading | concept_map | image | quote, with rich `content`/`items`/`table`)
 * • Mind map  : up to 8 axes = section titles (overview + sections + conclusion).
 * • Cards     : every `table` item → pastel comparison card; every `concepts` /
 *               `bilingual_pairs` item → emerald-term definition card.
 * • Flow      : best of (a) ordered list, (b) list whose bullets start with
 *               خطوة/أولاً/First/Secondly…, (c) such numbered paragraphs, and
 *               finally the callouts of the first section that has ≥2 — always one section.
 * • Tables    : one classic data table per table item (dark-blue header + zebra rows).
 * • Axes      : remaining non-table/non-concept text sections as readable cards.
 *
 * Self-contained: only react + lucide-react, no design tokens or CSS classes are
 * required from the host. Root sets `dir` from isEn; every text node is dir="auto"
 * so mixed Arabic/English lines align inside their own direction. No new CSS is
 * needed — all dynamic colors are inline styles, all classes are literal.
 */

import { useMemo } from "react";
import {
  Brain,
  ChevronLeft,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  Network,
  Table2,
} from "lucide-react";
// ONE emphasis engine (v2). cleanText() used to strip ** and == here, so the
// default landing view showed NO emphasis at all — the opposite of a study aid.
import { richToHtml } from "@/lib/summary/richText.js";

/**
 * Dark-surface inline emphasis for the infographic.
 * The shared engine emits `.bf-t-*` classes with light-surface colours, so the
 * infographic remaps them for the dark card background (see BF_RICH_CSS).
 */
function RichText({ text, className = "", style }) {
  const html = useMemo(() => richToHtml(String(text ?? "")), [text]);
  return (
    <span
      dir="auto"
      className={`bf-rich ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Dark-theme overrides for the shared emphasis tokens. */
const BF_RICH_CSS = `
.bf-rich .bf-t-term { color:#F3F7FC; font-weight:800; text-decoration:underline dotted #5f7a94; text-underline-offset:3px; }
.bf-rich .bf-t-key { background:#4a3c10; color:#ffe58a; font-weight:800; padding:1px 5px 2px; border-radius:4px; }
.bf-rich .bf-t-value { background:#14304a; color:#8dc7f5; font-weight:800; font-family:ui-monospace,monospace; padding:1px 6px 2px; border-radius:999px; }
.bf-rich .bf-t-danger { background:#3a1c1a; color:#ff8b7e; font-weight:800; padding:1px 5px 2px; border-radius:4px; }
.bf-rich .bf-t-ok { background:#12302a; color:#6ee7b7; font-weight:800; padding:1px 5px 2px; border-radius:4px; }
.bf-rich .bf-t-mech { color:#c4a5f5; font-weight:800; }
.bf-rich .bf-t-code { background:#1b2530; color:#cbd5e1; font-family:ui-monospace,monospace; padding:1px 5px; border-radius:4px; direction:ltr; unicode-bidi:isolate; display:inline-block; }
.bf-rich bdi { unicode-bidi:isolate; }
`;

const EMERALD = "#19f08c";
const AMBER = "#fbbf24";
const SKY = "#60a5fa";
const CARD = "#0a0e15";

/** Reference-image branch palette (cycled through axes, tables and cards). */
const PALETTE = [
  "#f87171",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#fb923c",
];

const RING_SLOTS = [
  "col-start-1 row-start-1",
  "col-start-2 row-start-1",
  "col-start-3 row-start-1",
  "col-start-3 row-start-2",
  "col-start-3 row-start-3",
  "col-start-2 row-start-3",
  "col-start-1 row-start-3",
  "col-start-1 row-start-2",
];

/** Hand-picked symmetric wheel layouts so any branch count still looks drawn. */
const RING_LAYOUTS = {
  0: [],
  1: [1],
  2: [1, 5],
  3: [1, 4, 6],
  4: [1, 3, 5, 7],
  5: [1, 3, 7, 4, 6],
  6: [0, 1, 2, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
  8: [0, 1, 2, 3, 4, 5, 6, 7],
};

const EMPTY_FIGURES = [];

const COPY_AR = {
  eyebrow: "AI · تلخيص بصري",
  core: "جوهر المحاضرة",
  docFallback: "الملخص البصري للمحاضرة",
  axisLabel: (n) => `محور ${n}`,
  axes: (n) => `${n} محور`,
  statAxes: "محور",
  statTables: "جدول",
  statFigures: "صورة",
  legend: (n) => `الخريطة الذهنية — ${n} محور`,
  legendExtra: (tables, figures) => `${tables} جدول · ${figures} صورة`,
  comparisonTitle: "بطاقات المقارنة",
  tableLabel: "جدول",
  tableNo: (n) => `جدول ${pad2(n)}`,
  rowsCount: (n) => `${n} صف`,
  conceptCount: (n) => `${n} مفهوم`,
  definition: "تعريف",
  flowTitle: "مسار الخطوات",
  flowSub: (n) => `${n} خطوة متسلسلة`,
  flowChip: "الخطوات",
  tablesTitle: "الجداول التفاعلية",
  tablesSub: (n) => `${n} جدول`,
  figuresTitle: "صور من المحاضرة",
  figuresSub: (n) => `${n} صورة`,
  figurePage: (n) => `صفحة ${n}`,
  figureCaption: "صورة من المحاضرة",
  axesTitle: "محاور الملخص",
  axesSub: (n) => `${n} محور`,
  warning: "تنبيه",
  tip: "ملاحظة",
  emptyTitle: "لا يوجد محتوى بصري بعد",
  emptyHint: "أضف ملخصاً للمحاضرة ليُبنى الإنفوجرافيك تلقائياً.",
  footer: (a, b, c) => `تلخيص بصري — ${a} محور · ${b} جدول · ${c} صورة`,
  footerNote: "مُولّد آلياً من محتوى المحاضرة — راجع المصدر عند الشك.",
  comparisonSub: (tables, concepts) => {
    const parts = [];
    if (tables) parts.push(`${tables} جدول`);
    if (concepts) parts.push(`${concepts} مفهوم`);
    return parts.join(" · ");
  },
};

const COPY_EN = {
  eyebrow: "AI · Visual Digest",
  core: "Lecture Core",
  docFallback: "Visual Summary",
  axisLabel: (n) => `Axis ${n}`,
  axes: (n) => `${n} axes`,
  statAxes: "axes",
  statTables: "tables",
  statFigures: "figures",
  legend: (n) => `Mind map — ${n} axes`,
  legendExtra: (tables, figures) => `${tables} tables · ${figures} figures`,
  comparisonTitle: "Comparison Cards",
  tableLabel: "Table",
  tableNo: (n) => `Table ${pad2(n)}`,
  rowsCount: (n) => `${n} rows`,
  conceptCount: (n) => `${n} terms`,
  definition: "Definition",
  flowTitle: "Flow Steps",
  flowSub: (n) => `${n} linked steps`,
  flowChip: "Steps",
  tablesTitle: "Interactive Tables",
  tablesSub: (n) => `${n} tables`,
  figuresTitle: "Lecture Figures",
  figuresSub: (n) => `${n} figures`,
  figurePage: (n) => `Page ${n}`,
  figureCaption: "Lecture figure",
  axesTitle: "Summary Axes",
  axesSub: (n) => `${n} axes`,
  warning: "Alert",
  tip: "Note",
  emptyTitle: "No visual content yet",
  emptyHint: "Add a lecture summary to build the infographic automatically.",
  footer: (a, b, c) => `Visual digest — ${a} axes · ${b} tables · ${c} figures`,
  footerNote: "Auto-generated from the lecture content — verify against the source.",
  comparisonSub: (tables, concepts) => {
    const parts = [];
    if (tables) parts.push(`${tables} tables`);
    if (concepts) parts.push(`${concepts} concepts`);
    return parts.join(" · ");
  },
};

/* ══════════════════════════════════════════════════════════════════════════════
   Small pure helpers (kept local so the file is fully self-contained)
   ══════════════════════════════════════════════════════════════════════════════ */

function rgba(hex, alpha) {
  const value = String(hex || "").replace("#", "");
  if (value.length !== 6) return `rgba(25, 240, 140, ${alpha})`;
  const number = Number.parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function pad2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "00";
  return String(Math.max(0, Math.trunc(number))).padStart(2, "0");
}

/** Read plain text out of strings, rich-text runs, v3 `content` and arrays. */
function plainText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((entry) => plainText(entry))
      .filter(Boolean)
      .join(" ");
  }
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (value.content && typeof value.content === "object" && typeof value.content.text === "string") {
    return value.content.text;
  }
  if (typeof value.content === "string") return value.content;
  if (Array.isArray(value.runs)) {
    return value.runs
      .map((run) => plainText(run && typeof run === "object" ? run.text : run))
      .filter(Boolean)
      .join("");
  }
  if (typeof value.body === "string") return value.body;
  if (typeof value.value === "string") return value.value;
  if (typeof value.markdown === "string") return value.markdown;
  return "";
}

/** Strip the summary markdown/rich-text chrome so infographic text stays clean. */
function cleanText(value) {
  const text = plainText(value);
  if (!text) return "";
  return String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/==(?:green|yellow|cyan|orange|red|violet):([^=]+)==/gi, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/^[#>*+-]+\s*/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortWords(value, count = 3) {
  const text = cleanText(value);
  if (!text) return "";
  const words = text.replace(/[·•—–|]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length <= count) return text;
  return `${words.slice(0, count).join(" ")}…`;
}

const STEP_SIGNAL = /^(?:الخطوة|خطوة|المرحلة|مرحلة|النقطة|نقطة|أولاً|أولا|اولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا|سادساً|سادسا|سابعاً|سابعا|ثامناً|ثامنا|تاسعاً|تاسعا|عاشراً|عاشرا|أخيراً|أخيرا|اخيرا|بعد\s+ذلك|ثم|step|first(?:ly)?|second(?:ly)?|third(?:ly)?|fourth(?:ly)?|fifth(?:ly)?|sixth(?:ly)?|seventh(?:ly)?|finally|lastly|next|\d+\s*[.)])/i;

function isStepLike(value) {
  const text = cleanText(value);
  return Boolean(text) && STEP_SIGNAL.test(text);
}

/** "Lead: explanation" → bold lead + body; anything else stays one block. */
function splitLead(value) {
  const text = cleanText(value);
  if (!text) return { lead: "", rest: "" };
  const colon = text.search(/[:：]/);
  if (colon >= 4 && colon <= 72) {
    const lead = text.slice(0, colon).trim();
    const rest = text.slice(colon + 1).trim();
    if (lead && rest) return { lead, rest };
  }
  return { lead: text, rest: "" };
}

function parseConceptPair(raw) {
  if (Array.isArray(raw)) {
    const term = cleanText(raw[0]);
    const explanation = cleanText(raw.slice(1));
    if (!term && !explanation) return null;
    return { term: term || explanation, explanation: term ? explanation : "" };
  }
  if (raw && typeof raw === "object") {
    const term = cleanText(
      raw.term ?? raw.head ?? raw.key ?? raw.name ?? raw.en ?? raw.title
    );
    const explanation = cleanText(
      raw.definition ??
        raw.explanation ??
        raw.body ??
        raw.value ??
        raw.description ??
        raw.ar ??
        raw.text
    );
    if (!term && !explanation) return null;
    return { term: term || explanation, explanation: term ? explanation : "" };
  }
  const text = cleanText(raw);
  if (!text) return null;
  const match = text.match(/^(.{1,90}?)\s*(?:→|⟶|->|—|–|:|\|)\s*(.+)$/);
  if (match) return { term: match[1].trim(), explanation: match[2].trim() };
  return { term: text, explanation: "" };
}

function conceptPairsFrom(raw) {
  const buckets = [];
  if (Array.isArray(raw.pairs)) buckets.push(...raw.pairs);
  else if (Array.isArray(raw.terms)) buckets.push(...raw.terms);
  else if (Array.isArray(raw.definitions)) buckets.push(...raw.definitions);
  else if (raw.terms && typeof raw.terms === "object") {
    Object.entries(raw.terms).forEach(([term, definition]) => {
      buckets.push(Array.isArray(definition) ? [term, ...definition] : { term: term, explanation: definition });
    });
  }
  if (!buckets.length) {
    const text = plainText(raw.content ?? raw.text ?? raw.paragraphs ?? "");
    String(text)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => buckets.push(line));
  }
  return buckets.map(parseConceptPair).filter((pair) => pair && pair.term);
}

/* ══════════════════════════════════════════════════════════════════════════════
   Adapters — accept normalized items *and* raw v3 blocks
   ══════════════════════════════════════════════════════════════════════════════ */

function normalizeItem(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    const text = cleanText(raw);
    return text ? { kind: "text", text: text, role: "" } : null;
  }
  if (typeof raw !== "object") return null;

  const type = String(raw.type || raw.kind || "").toLowerCase().replace(/[-\s]+/g, "_");
  const role = String(raw.role || "").toLowerCase();

  /* 1) Tables — normalized item {headers,rows} or v3 block {table:{headers,rows}} */
  const tableNode = raw.table && typeof raw.table === "object" ? raw.table : null;
  const hasHeaderRows = Array.isArray(raw.headers) && Array.isArray(raw.rows);
  const isTableType = /(^|_)table($|_)/.test(type);
  if (tableNode || hasHeaderRows || isTableType) {
    const headersRaw = raw.headers || tableNode?.headers || tableNode?.columns || raw.columns || [];
    const rowsRaw = raw.rows || tableNode?.rows || [];
    const headers = (Array.isArray(headersRaw) ? headersRaw : [])
      .map((header) => cleanText(header))
      .filter(Boolean);
    const rows = (Array.isArray(rowsRaw) ? rowsRaw : [])
      .map((row) => {
        const cells = Array.isArray(row) ? row : Array.isArray(row?.cells) ? row.cells : [];
        return cells.map((cell) => cleanText(cell));
      })
      .filter((row) => row.some(Boolean));
    if (headers.length || rows.length) {
      return { kind: "table", headers: headers, rows: rows, role: role };
    }
  }

  /* 2) Figures — v3 image block or normalized figure item */
  const figureNode = raw.figure && typeof raw.figure === "object" ? raw.figure : null;
  if (type === "figure" || type === "image" || figureNode) {
    const url =
      figureNode?.url || raw.url || raw.src || raw.image_url || raw.asset_url || raw.thumbnail_url;
    if (url) {
      return {
        kind: "figure",
        url: String(url),
        page: Number(figureNode?.page || raw.page || 0) || 0,
        caption: cleanText(figureNode?.caption || raw.caption || raw.alt || raw.text || raw.content),
        role: role,
      };
    }
  }

  /* 3) Concept strips / definition pairs */
  const hasConceptShape =
    type.includes("concept") ||
    Array.isArray(raw.terms) ||
    Array.isArray(raw.pairs) ||
    (raw.terms && typeof raw.terms === "object");
  if (hasConceptShape) {
    const pairs = conceptPairsFrom(raw);
    if (pairs.length) return { kind: "concepts", pairs: pairs, role: role };
  }

  /* 4) Lists — bullets / ordered steps */
  const pointsRaw = Array.isArray(raw.points)
    ? raw.points
    : Array.isArray(raw.bullets)
    ? raw.bullets
    : Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.children)
    ? raw.children
    : null;
  const isListType = [
    "list",
    "bullet_list",
    "bullets",
    "unordered_list",
    "ordered_list",
    "steps",
    "step_list",
    "sequence",
  ].includes(type);
  if (pointsRaw || isListType) {
    const points = (pointsRaw || []).map((point) => cleanText(point)).filter(Boolean);
    if (points.length) {
      return {
        kind: "list",
        points: points,
        ordered:
          Boolean(raw.ordered) ||
          /ordered|steps|step_list|sequence/.test(type) ||
          role.includes("step") ||
          role.includes("ordered"),
        role: role,
      };
    }
  }

  /* 5) Callouts and quotes */
  const calloutType = [
    "callout",
    "quote",
    "blockquote",
    "note",
    "warning",
    "tip",
    "important",
    "box",
  ].includes(type);
  if (calloutType || raw.calloutTone || raw.tone) {
    const text = cleanText(raw.text ?? raw.content ?? raw.body ?? raw.value);
    if (text) {
      const tone = String(raw.calloutTone || raw.tone || raw.variant || role || "").toLowerCase();
      return {
        kind: type === "quote" || type === "blockquote" ? "quote" : "callout",
        text: text,
        tone: /warn|danger|exam|trap|important|alert|red/.test(tone) ? "warning" : "tip",
        role: role,
      };
    }
  }

  /* 6) Sub-headings */
  if (type.includes("heading") || /^h[1-6]$/.test(type)) {
    const text = cleanText(raw);
    if (text) return { kind: "subheading", text: text, role: role };
  }

  /* 7) Fallback: a paragraph / card */
  const text = cleanText(raw.text ?? raw.content ?? raw.paragraphs ?? raw.value ?? raw.body);
  if (text) return { kind: "text", text: text, role: role };
  return null;
}

export function blocksToItems(blocks = []) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => normalizeItem(block)).filter(Boolean);
}

export function sectionItems(section) {
  if (!section || typeof section !== "object") return [];
  const normalizedItems =
    Array.isArray(section.items) && section.items.length ? section.items : null;
  const blocks = Array.isArray(section.blocks) ? section.blocks : null;
  const source = normalizedItems || blocks || [];
  return source.map((entry) => normalizeItem(entry)).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════════════════════════
   Model building — sections, tables, concepts, figures and the flow pick
   ══════════════════════════════════════════════════════════════════════════════ */

function normalizeFigures(rawFigures) {
  const list = Array.isArray(rawFigures) ? rawFigures : [];
  return list
    .map((figure, index) => {
      if (!figure || typeof figure !== "object") return null;
      const url = figure.url || figure.src || figure.image_url || figure.thumbnail_url;
      if (!url) return null;
      return {
        id: `figure-${index + 1}`,
        url: String(url),
        page: Number(figure.page) || 0,
        caption: cleanText(figure.caption || figure.text || figure.alt),
      };
    })
    .filter(Boolean);
}

function findFlow(sections) {
  const candidates = [];
  sections.forEach((section) => {
    section.items.forEach((item, index) => {
      if (item.kind !== "list") return;
      const stepHits = item.points.filter((point) => isStepLike(point)).length;
      if (item.ordered && item.points.length >= 2) {
        candidates.push({ rank: 3, section: section, indexes: [index], steps: item.points, via: "ordered" });
      } else if (stepHits >= 2) {
        candidates.push({ rank: 2, section: section, indexes: [index], steps: item.points, via: "bullets" });
      }
    });

    const stepIndexes = [];
    section.items.forEach((item, index) => {
      if (item.kind === "text" && isStepLike(item.text)) stepIndexes.push(index);
    });
    if (stepIndexes.length >= 2) {
      candidates.push({
        rank: 1,
        section: section,
        indexes: stepIndexes,
        steps: stepIndexes.map((index) => section.items[index].text),
        via: "paragraphs",
      });
    }
  });

  if (candidates.length) {
    candidates.sort((left, right) => right.rank - left.rank || right.steps.length - left.steps.length);
    const chosen = candidates[0];
    return {
      sectionUid: chosen.section.uid,
      sectionTitle: chosen.section.title,
      itemIndexes: chosen.indexes,
      steps: chosen.steps,
      via: chosen.via,
    };
  }

  for (const section of sections) {
    const calloutIndexes = [];
    section.items.forEach((item, index) => {
      if (item.kind === "callout" && item.text) calloutIndexes.push(index);
    });
    if (calloutIndexes.length >= 2) {
      return {
        sectionUid: section.uid,
        sectionTitle: section.title,
        itemIndexes: calloutIndexes,
        steps: calloutIndexes.map((index) => section.items[index].text),
        via: "callouts",
      };
    }
  }
  return null;
}

function buildModel(document, figuresInput, isEn) {
  const empty = {
    title: "",
    sections: [],
    tables: [],
    conceptCards: [],
    figures: [],
    flow: null,
    textSections: [],
    counts: { axes: 0, tables: 0, concepts: 0, figures: 0 },
  };
  if (!document) return empty;
  const root = Array.isArray(document)
    ? { sections: document }
    : document && typeof document === "object"
    ? document
    : null;
  if (!root) return empty;

  const fallbackTitles = isEn
    ? { overview: "Quick Overview", conclusion: "Key Takeaways", content: "Lecture Content" }
    : { overview: "نظرة عامة سريعة", conclusion: "الخلاصة", content: "محتوى المحاضرة" };

  const sections = [];
  const pushSection = (rawSection, meta = {}) => {
    if (!rawSection) return;
    const raw = typeof rawSection === "object" ? rawSection : { title: rawSection };
    const items = sectionItems(raw);
    const sourceRefs = (Array.isArray(raw.sourceRefs) ? raw.sourceRefs : [])
      .map((page) => Number(page))
      .filter((page) => Number.isFinite(page) && page > 0);
    sections.push({
      uid: `axis-${sections.length + 1}`,
      id: String(raw.id || ""),
      number: 0,
      title: cleanText(raw.title) || meta.fallbackTitle || "",
      items: items,
      sourceRefs: sourceRefs,
      isOverview: Boolean(meta.isOverview),
      isConclusion: Boolean(meta.isConclusion),
    });
  };

  if (Array.isArray(root.overview) && root.overview.length) {
    pushSection(
      { id: "overview", title: fallbackTitles.overview, blocks: root.overview },
      { isOverview: true, fallbackTitle: fallbackTitles.overview }
    );
  }
  (Array.isArray(root.sections) ? root.sections : []).forEach((section) => pushSection(section));
  if (Array.isArray(root.conclusion) && root.conclusion.length) {
    pushSection(
      { id: "conclusion", title: fallbackTitles.conclusion, blocks: root.conclusion },
      { isConclusion: true, fallbackTitle: fallbackTitles.conclusion }
    );
  }
  if (!sections.length && Array.isArray(root.blocks) && root.blocks.length) {
    pushSection(
      { id: "legacy", title: cleanText(root.title) || fallbackTitles.content, blocks: root.blocks },
      { fallbackTitle: fallbackTitles.content }
    );
  }

  const usableSections = sections.filter((section) => section.items.length > 0);
  usableSections.forEach((section, index) => {
    section.number = index + 1;
    if (!section.title) section.title = isEn ? `Axis ${index + 1}` : `محور ${index + 1}`;
  });

  const tables = [];
  const conceptCards = [];
  usableSections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.kind === "table") {
        tables.push({
          id: `${section.uid}-table-${tables.length + 1}`,
          sectionTitle: section.title,
          headers: item.headers,
          rows: item.rows,
        });
      } else if (item.kind === "concepts" && item.pairs.length) {
        conceptCards.push({
          id: `${section.uid}-concepts-${conceptCards.length + 1}`,
          sectionTitle: section.title,
          pairs: item.pairs,
        });
      }
    });
  });

  const flow = findFlow(usableSections);

  const flowConsumed = new Map();
  if (flow) flowConsumed.set(flow.sectionUid, new Set(flow.itemIndexes));

  const textSections = [];
  usableSections.forEach((section) => {
    const consumed = flowConsumed.get(section.uid);
    const restItems = [];
    section.items.forEach((item, index) => {
      if (item.kind === "table" || item.kind === "concepts" || item.kind === "figure") return;
      if (consumed && consumed.has(index)) return;
      restItems.push(item);
    });
    if (restItems.length) {
      textSections.push({
        uid: section.uid,
        number: section.number,
        title: section.title,
        sourceRefs: section.sourceRefs,
        restItems: restItems,
      });
    }
  });

  let figures = normalizeFigures(figuresInput);
  if (!figures.length) {
    const inlineFigures = [];
    const seenUrls = new Set();
    usableSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.kind !== "figure" || !item.url || seenUrls.has(item.url)) return;
        seenUrls.add(item.url);
        inlineFigures.push({
          id: `inline-figure-${inlineFigures.length + 1}`,
          url: item.url,
          page: item.page || 0,
          caption: item.caption || "",
        });
      });
    });
    figures = inlineFigures;
  }
  const title =
    cleanText(root.title) ||
    cleanText(root.meta && typeof root.meta === "object" ? root.meta.title : "") ||
    cleanText(root.source_title) ||
    cleanText(root.course_title) ||
    "";

  return {
    title: title,
    sections: usableSections,
    tables: tables,
    conceptCards: conceptCards,
    figures: figures,
    flow: flow,
    textSections: textSections,
    counts: {
      axes: usableSections.length,
      tables: tables.length,
      concepts: conceptCards.length,
      figures: figures.length,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════════
   Presentational building blocks
   ══════════════════════════════════════════════════════════════════════════════ */

function StatChip({ color, value, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
      style={{ borderColor: rgba(color, 0.32), backgroundColor: rgba(color, 0.08) }}
    >
      <span dir="auto" className="font-mono text-[14px] font-black leading-none" style={{ color: color }}>
        {value}
      </span>
      <span dir="auto" className="text-[14px] font-bold leading-none text-[#c3cddb]">
        {label}
      </span>
    </span>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, color, badge }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border"
          style={{ color: color, backgroundColor: rgba(color, 0.1), borderColor: rgba(color, 0.32) }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 dir="auto" className="text-start text-[14px] font-black leading-tight text-[#F3F7FC]">
            {title}
          </h2>
          {subtitle ? (
            <div dir="auto" className="mt-0.5 text-start text-[14.5px] font-semibold text-[#8b97a8]">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      {badge ? (
        <span
          dir="auto"
          className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-mono text-[14px] font-black text-[#9aa4b2]"
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function HeroMap({ model, copy, title }) {
  const branches = model.sections.slice(0, 8);
  const layout = RING_LAYOUTS[branches.length] || [];
  return (
    <section
      className="relative overflow-hidden rounded-[26px] border border-white/[0.08] p-3.5 sm:p-5"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(25, 240, 140, 0.12), transparent 62%), radial-gradient(90% 70% at 100% 100%, rgba(251, 191, 36, 0.08), transparent 58%), linear-gradient(180deg, #0a0f16, #05070a)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#19f08c]/30 bg-[#19f08c]/[0.07] px-2.5 py-1 text-[14px] font-black text-[#19f08c]">
            <Brain className="size-3.5" aria-hidden="true" />
            <span dir="auto">{copy.eyebrow}</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatChip color={EMERALD} value={model.counts.axes} label={copy.statAxes} />
            <StatChip color={AMBER} value={model.counts.tables} label={copy.statTables} />
            <StatChip color={SKY} value={model.counts.figures} label={copy.statFigures} />
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {branches.map((section, index) => {
            const color = PALETTE[index % PALETTE.length];
            const slot = RING_SLOTS[layout[index] ?? index % RING_SLOTS.length];
            return (
              <div
                key={section.uid}
                className={`${slot} flex min-w-0 items-start gap-1.5 self-center rounded-[13px] border p-1.5 sm:p-2`}
                style={{ borderColor: rgba(color, 0.35), backgroundColor: rgba(color, 0.09) }}
              >
                <span
                  dir="auto"
                  className="mt-px flex size-4 shrink-0 items-center justify-center rounded-[5px] font-mono text-[12px] font-black sm:size-5 sm:text-[12px]"
                  style={{ backgroundColor: rgba(color, 0.2), color: color }}
                >
                  {pad2(section.number)}
                </span>
                <span
                  dir="auto"
                  className="line-clamp-2 min-w-0 flex-1 text-start text-[12px] font-bold leading-tight text-[#E9EEF6] sm:text-[14.5px]"
                >
                  {shortWords(section.title, 3) || copy.axisLabel(section.number)}
                </span>
              </div>
            );
          })}

          <div className="col-start-2 row-start-2 flex items-center justify-center p-1">
            <div
              className="flex aspect-square w-full max-w-[178px] flex-col items-center justify-center rounded-full border border-[#19f08c]/45 px-3 text-center"
              style={{
                background:
                  "radial-gradient(120% 120% at 50% 15%, rgba(25, 240, 140, 0.16), #07110c 70%)",
                boxShadow:
                  "0 0 0 6px rgba(25, 240, 140, 0.05), 0 0 0 13px rgba(25, 240, 140, 0.025), 0 18px 46px rgba(0, 0, 0, 0.5)",
              }}
            >
              <span className="mb-1 flex items-center gap-1 text-[12px] font-black text-[#19f08c]">
                <Network className="size-3" aria-hidden="true" />
                <span dir="auto">{copy.core}</span>
              </span>
              <div
                dir="auto"
                className="line-clamp-2 text-[14.5px] font-black leading-snug text-[#F3F7FC] sm:text-[14px]"
              >
                {title}
              </div>
              <div dir="auto" className="mt-1 text-[14px] font-bold text-[#8b97a8]">
                {copy.axes(model.counts.axes)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#19f08c]" aria-hidden="true" />
            <span dir="auto" className="text-[14.5px] font-bold text-[#c3cddb]">
              {copy.legend(model.counts.axes)}
            </span>
          </span>
          <span className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden="true" />
          <span dir="auto" className="text-[14px] font-semibold text-[#8b97a8]">
            {copy.legendExtra(model.counts.tables, model.counts.figures)}
          </span>
        </div>
      </div>
    </section>
  );
}

function FigureBand({ figures, copy, onOpenImage }) {
  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#080C14] p-3.5 sm:p-4">
      <SectionHeading
        icon={ImageIcon}
        title={copy.figuresTitle}
        subtitle={copy.figuresSub(figures.length)}
        color={SKY}
        badge={String(figures.length)}
      />
      <div className="flex gap-3 overflow-x-auto pb-1.5">
        {figures.map((figure) => {
          const thumb = (
            <img
              src={figure.url}
              alt={figure.caption || copy.figureCaption}
              loading="lazy"
              decoding="async"
              className="h-[112px] w-full object-cover"
            />
          );
          return (
            <figure key={figure.id} className="w-[176px] shrink-0">
              {typeof onOpenImage === "function" ? (
                <button
                  type="button"
                  onClick={() => onOpenImage(figure.url)}
                  className="block w-full overflow-hidden rounded-[14px] border border-white/[0.09] bg-[#05070a]"
                >
                  {thumb}
                </button>
              ) : (
                <div className="block w-full overflow-hidden rounded-[14px] border border-white/[0.09] bg-[#05070a]">
                  {thumb}
                </div>
              )}
              <figcaption className="mt-1.5 flex items-center justify-between gap-2">
                <span
                  dir="auto"
                  className="line-clamp-1 min-w-0 text-start text-[14px] font-semibold text-[#9aa4b2]"
                >
                  {figure.caption || copy.figureCaption}
                </span>
                {figure.page ? (
                  <span
                    dir="auto"
                    className="shrink-0 rounded-full border border-[#60a5fa]/30 bg-[#60a5fa]/[0.08] px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#93c5fd]"
                  >
                    {copy.figurePage(figure.page)}
                  </span>
                ) : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function ComparisonTableCard({ table, color, copy }) {
  const title = table.sectionTitle || copy.tableNo(1);
  const label = table.headers[0] || copy.tableLabel;
  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border"
      style={{ borderColor: rgba(color, 0.4), backgroundColor: rgba(color, 0.1) }}
    >
      <header
        className="flex items-start justify-between gap-2 border-b px-3.5 py-2.5"
        style={{ borderColor: rgba(color, 0.25) }}
      >
        <div className="min-w-0">
          <div dir="auto" className="text-start text-[14px] font-black" style={{ color: color }}>
            {label}
          </div>
          <h3
            dir="auto"
            className="mt-0.5 line-clamp-2 text-start text-[15px] font-black leading-snug text-[#F3F7FC]"
          >
            {title}
          </h3>
        </div>
        <span
          dir="auto"
          className="mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[12px] font-bold"
          style={{ borderColor: rgba(color, 0.3), color: color, backgroundColor: rgba(color, 0.12) }}
        >
          {copy.rowsCount(table.rows.length)}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {table.headers.length ? (
            <thead>
              <tr>
                {table.headers.map((header, index) => (
                  <th
                    key={index}
                    scope="col"
                    dir="auto"
                    className="px-3 py-1.5 text-start text-[14.5px] font-black text-[#F3F7FC]"
                    style={{ backgroundColor: rgba(color, 0.16) }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{ backgroundColor: rowIndex % 2 === 1 ? "rgba(255,255,255,0.045)" : "transparent" }}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    dir="auto"
                    className="whitespace-normal break-words px-3 py-1.5 align-top text-[14.5px] leading-relaxed"
                    style={{
                      color: cellIndex === 0 ? color : "#cfd9e6",
                      fontWeight: cellIndex === 0 ? 800 : 500,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ConceptCard({ card, color, copy }) {
  return (
    <article
      className="min-w-0 rounded-[20px] border p-3.5"
      style={{ borderColor: rgba(color, 0.4), backgroundColor: rgba(color, 0.09) }}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div dir="auto" className="min-w-0 text-start text-[14px] font-black" style={{ color: color }}>
          {card.sectionTitle || copy.definition}
        </div>
        <span
          dir="auto"
          className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[12px] font-bold"
          style={{ borderColor: rgba(color, 0.3), color: color, backgroundColor: rgba(color, 0.12) }}
        >
          {copy.conceptCount(card.pairs.length)}
        </span>
      </header>
      <div className="space-y-1.5">
        {card.pairs.map((pair, index) => (
          <div key={index} className="rounded-[12px] border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
            <div dir="auto" className="text-start text-[14px] font-black leading-relaxed text-[#19f08c]">
              {pair.term}
            </div>
            {pair.explanation ? (
              <div dir="auto" className="mt-0.5 text-start text-[15px] font-medium leading-relaxed text-[#cfd9e6]">
                {pair.explanation}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function ComparisonSection({ tables, conceptCards, copy }) {
  if (!tables.length && !conceptCards.length) return null;
  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#080C14] p-3.5 sm:p-4">
      <SectionHeading
        icon={Table2}
        title={copy.comparisonTitle}
        subtitle={copy.comparisonSub(tables.length, conceptCards.length)}
        color={AMBER}
        badge={String(tables.length + conceptCards.length)}
      />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {tables.map((table, index) => (
          <ComparisonTableCard
            key={table.id}
            table={table}
            color={PALETTE[index % PALETTE.length]}
            copy={copy}
          />
        ))}
        {conceptCards.map((card, index) => (
          <ConceptCard
            key={card.id}
            card={card}
            color={PALETTE[(tables.length + index) % PALETTE.length]}
            copy={copy}
          />
        ))}
      </div>
    </section>
  );
}

function StepCard({ step, number, color }) {
  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-[18px] border border-white/[0.09] p-3.5"
      style={{
        backgroundColor: CARD,
        backgroundImage: `linear-gradient(150deg, ${rgba(color, 0.16)}, rgba(10, 14, 21, 0.96) 62%)`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          dir="auto"
          className="flex size-9 items-center justify-center rounded-[12px] font-mono text-[14.5px] font-black sm:size-10 sm:text-[15px]"
          style={{
            backgroundColor: rgba(color, 0.18),
            color: color,
            border: `1px solid ${rgba(color, 0.38)}`,
          }}
        >
          {pad2(number)}
        </span>
        <span aria-hidden="true" className="text-[14px] leading-none" style={{ color: rgba(color, 0.7) }}>
          ◆
        </span>
      </div>
      <div className="mt-2.5 flex-1">
        <div dir="auto" className="text-start text-[14px] font-black leading-relaxed text-[#F3F7FC]">
          {step.lead}
        </div>
        {step.rest ? (
          <div dir="auto" className="mt-1 text-start text-[14.5px] font-medium leading-relaxed text-[#b9c4d2]">
            {step.rest}
          </div>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="mt-3 h-[3px] w-9 rounded-full"
        style={{ backgroundColor: color, opacity: 0.8 }}
      />
    </div>
  );
}

function FlowSection({ flow, copy, isRtl }) {
  if (!flow || !flow.steps.length) return null;
  const steps = flow.steps.map((step) => splitLead(step));
  const rows = [];
  for (let index = 0; index < steps.length; index += 2) {
    rows.push(steps.slice(index, index + 2));
  }
  const arrowTransform = isRtl ? "none" : "rotate(180deg)";
  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#080C14] p-3.5 sm:p-4">
      <SectionHeading
        icon={ListOrdered}
        title={copy.flowTitle}
        subtitle={copy.flowSub(steps.length)}
        color={AMBER}
        badge={copy.flowChip}
      />
      {flow.sectionTitle ? (
        <div dir="auto" className="mb-3 text-start text-[14.5px] font-semibold text-[#8b97a8]">
          {flow.sectionTitle}
        </div>
      ) : null}
      <div className="space-y-2.5">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex}>
            <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              {row.length === 1 ? (
                <div className="sm:col-span-3">
                  <StepCard
                    step={row[0]}
                    number={rowIndex * 2 + 1}
                    color={PALETTE[(rowIndex * 2) % PALETTE.length]}
                  />
                </div>
              ) : (
                <>
                  <StepCard
                    step={row[0]}
                    number={rowIndex * 2 + 1}
                    color={PALETTE[(rowIndex * 2) % PALETTE.length]}
                  />
                  <span aria-hidden="true" className="hidden sm:flex sm:items-center sm:justify-center">
                    <span className="flex size-7 items-center justify-center rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/[0.08] text-[#fbbf24]">
                      <ChevronLeft className="size-4" style={{ transform: arrowTransform }} />
                    </span>
                  </span>
                  <StepCard
                    step={row[1]}
                    number={rowIndex * 2 + 2}
                    color={PALETTE[(rowIndex * 2 + 1) % PALETTE.length]}
                  />
                </>
              )}
            </div>
            {rowIndex < rows.length - 1 ? (
              <div className="mt-2.5 flex justify-center sm:hidden">
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/[0.08] text-[#fbbf24]"
                >
                  <ChevronLeft className="size-4 rotate-[-90deg]" />
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function TablesSection({ tables, copy }) {
  if (!tables.length) return null;
  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#080C14] p-3.5 sm:p-4">
      <SectionHeading
        icon={Table2}
        title={copy.tablesTitle}
        subtitle={copy.tablesSub(tables.length)}
        color={EMERALD}
        badge={String(tables.length)}
      />
      <div className="space-y-3.5">
        {tables.map((table, index) => (
          <article
            key={table.id}
            className="min-w-0 overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0a0e15]"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.02] px-3.5 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  dir="auto"
                  className="flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-[#1e3a5f] font-mono text-[12px] font-black text-[#dbeafe]"
                >
                  {pad2(index + 1)}
                </span>
                <h3
                  dir="auto"
                  className="truncate text-start text-[14px] font-black text-[#E9EEF6]"
                >
                  {table.sectionTitle || copy.tableNo(index + 1)}
                </h3>
              </div>
              <span
                dir="auto"
                className="shrink-0 rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[12px] font-bold text-[#8b97a8]"
              >
                {copy.rowsCount(table.rows.length)}
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                {table.headers.length ? (
                  <thead>
                    <tr>
                      {table.headers.map((header, headerIndex) => (
                        <th
                          key={headerIndex}
                          scope="col"
                          dir="auto"
                          className="bg-[#1e3a5f] px-3 py-2 text-start text-[14.5px] font-black text-[#e6f0ff]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                ) : null}
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="even:bg-[rgba(96,165,250,0.12)]">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          dir="auto"
                          className={`px-3 py-2 align-top text-[15px] leading-relaxed ${
                            cellIndex === 0
                              ? "font-bold text-[#dbeafe]"
                              : "font-medium text-[#c9d3e0]"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionItem({ item, color, copy }) {
  if (item.kind === "subheading") {
    return (
      <div className="flex items-center gap-1.5 pt-0.5">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h4 dir="auto" className="text-start text-[14.5px] font-black leading-snug" style={{ color: color }}>
          <RichText text={item.text} />
        </h4>
      </div>
    );
  }
  if (item.kind === "text") {
    const split = splitLead(item.text);
    return (
      <div dir="auto" className="text-start text-[14.5px] leading-relaxed text-[#c9d3e0]">
        {split.rest ? (
          <>
            <span dir="auto" className="font-black text-[#F3F7FC]">{split.lead}: </span>
            <RichText text={split.rest} />
          </>
        ) : (
          <RichText text={item.text} />
        )}
      </div>
    );
  }
  if (item.kind === "list") {
    return (
      <div className="space-y-1">
        {item.points.map((point, index) => (
          <div key={index} className="flex items-start gap-2">
            {item.ordered ? (
              <span
                dir="auto"
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-black"
                style={{ backgroundColor: rgba(color, 0.16), color: color }}
              >
                {index + 1}
              </span>
            ) : (
              <span aria-hidden="true" className="mt-[6px] shrink-0 text-[12px] leading-none" style={{ color: color }}>
                ◆
              </span>
            )}
            <span dir="auto" className="min-w-0 flex-1 text-start text-[14px] leading-relaxed text-[#cfd9e6]">
              <RichText text={point} />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (item.kind === "callout") {
    const warning = item.tone === "warning";
    const toneColor = warning ? AMBER : EMERALD;
    return (
      <div
        className="rounded-[12px] border px-3 py-2"
        style={{ borderColor: rgba(toneColor, 0.32), backgroundColor: rgba(toneColor, 0.07) }}
      >
        <div className="mb-0.5 flex items-center gap-1.5 text-[12px] font-black" style={{ color: toneColor }}>
          <span
            dir="auto"
            className="flex size-3.5 items-center justify-center rounded-full text-[12px] font-black"
            style={{ backgroundColor: toneColor, color: "#05070a" }}
          >
            !
          </span>
          <span dir="auto">{warning ? copy.warning : copy.tip}</span>
        </div>
        <div dir="auto" className="text-start text-[15px] leading-relaxed text-[#cfd9e6]">
          <RichText text={item.text} />
        </div>
      </div>
    );
  }
  if (item.kind === "quote") {
    return (
      <div
        className="ps-2.5"
        style={{
          borderInlineStartWidth: 2,
          borderInlineStartStyle: "solid",
          borderInlineStartColor: rgba(AMBER, 0.5),
        }}
      >
        <div dir="auto" className="text-start text-[14px] leading-relaxed text-[#d7e0ec]">
          <RichText text={item.text} />
        </div>
      </div>
    );
  }
  return null;
}

function AxesSection({ textSections, copy, pageFigureMap, onOpenImage }) {
  if (!textSections.length) return null;
  return (
    <section className="rounded-[22px] border border-white/[0.08] bg-[#080C14] p-3.5 sm:p-4">
      <SectionHeading
        icon={Layers}
        title={copy.axesTitle}
        subtitle={copy.axesSub(textSections.length)}
        color={PALETTE[4]}
        badge={String(textSections.length)}
      />
      <div className="grid grid-cols-1 gap-3.5">
        {textSections.map((section, index) => {
          const color = PALETTE[index % PALETTE.length];
          const pageRefs = (section.sourceRefs || [])
            .filter((page) => pageFigureMap.has(page))
            .slice(0, 3);
          return (
            <article
              key={section.uid}
              className="min-w-0 rounded-[18px] border border-white/[0.08] bg-[#0a0e15] p-3.5"
              style={{
                borderInlineStartWidth: 4,
                borderInlineStartStyle: "solid",
                borderInlineStartColor: color,
              }}
            >
              <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    dir="auto"
                    className="flex shrink-0 items-center justify-center rounded-[7px] px-1.5 py-0.5 font-mono text-[14px] font-black"
                    style={{
                      backgroundColor: rgba(color, 0.16),
                      color: color,
                      border: `1px solid ${rgba(color, 0.32)}`,
                    }}
                  >
                    §{pad2(section.number)}
                  </span>
                  <h3 dir="auto" className="text-start text-[14.5px] font-black leading-snug text-[#F3F7FC]">
                    {section.title || copy.axisLabel(section.number)}
                  </h3>
                </div>
                {pageRefs.length ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {pageRefs.map((page) => {
                      const url = pageFigureMap.get(page);
                      const chipClass =
                        "inline-flex items-center gap-1 rounded-full border border-[#60a5fa]/30 bg-[#60a5fa]/[0.08] px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#93c5fd]";
                      return typeof onOpenImage === "function" && url ? (
                        <button
                          key={page}
                          type="button"
                          dir="auto"
                          onClick={() => onOpenImage(url)}
                          className={chipClass}
                        >
                          {copy.figurePage(page)}
                        </button>
                      ) : (
                        <span key={page} dir="auto" className={chipClass}>
                          {copy.figurePage(page)}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </header>
              <div className="space-y-2">
                {section.restItems.map((item, itemIndex) => (
                  <SectionItem key={itemIndex} item={item} color={color} copy={copy} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FooterStrip({ model, copy }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-white/[0.08] bg-[#080C14] px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-[8px] border border-[#19f08c]/30 bg-[#19f08c]/[0.08] text-[#19f08c]">
          <Layers className="size-3.5" aria-hidden="true" />
        </span>
        <span dir="auto" className="text-start text-[14.5px] font-black text-[#19f08c]">
          {copy.footer(model.counts.axes, model.counts.tables, model.counts.figures)}
        </span>
      </div>
      <span dir="auto" className="text-[14px] font-semibold text-[#7f8b9c]">
        {copy.footerNote}
      </span>
    </footer>
  );
}

function EmptyState({ copy }) {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#080C14] px-6 py-10 text-center">
      <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-[#19f08c]/30 bg-[#19f08c]/[0.07] text-[#19f08c]">
        <Brain className="size-5" aria-hidden="true" />
      </span>
      <div dir="auto" className="text-[14px] font-black text-[#F3F7FC]">
        {copy.emptyTitle}
      </div>
      <div dir="auto" className="mt-1 text-[15px] font-medium text-[#8b97a8]">
        {copy.emptyHint}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Public component
   ══════════════════════════════════════════════════════════════════════════════ */

export function InfographicSummary({
  document,
  figures = EMPTY_FIGURES,
  isEn = false,
  onOpenImage,
}) {
  const isRtl = !isEn;
  const copy = isEn ? COPY_EN : COPY_AR;
  const figureList = Array.isArray(figures) ? figures : EMPTY_FIGURES;
  const model = useMemo(
    () => buildModel(document, figureList, isEn),
    [document, figureList, isEn]
  );

  const pageFigureMap = useMemo(() => {
    const map = new Map();
    model.figures.forEach((figure) => {
      if (figure.page && !map.has(figure.page)) map.set(figure.page, figure.url);
    });
    return map;
  }, [model.figures]);

  if (!document || typeof document !== "object") return null;

  const hasContent =
    model.sections.length > 0 || model.tables.length > 0 || model.figures.length > 0;
  if (!hasContent) {
    return (
      <div dir={isRtl ? "rtl" : "ltr"} className="bf-infographic w-full text-start">
        <style>{BF_RICH_CSS}</style>
        <EmptyState copy={copy} />
      </div>
    );
  }

  const heroTitle = model.title || copy.docFallback;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="bf-infographic w-full space-y-4 text-start">
      {/* Dark-surface colours for the unified emphasis tokens. */}
      <style>{BF_RICH_CSS}</style>
      <HeroMap model={model} copy={copy} title={heroTitle} />

      {model.figures.length ? (
        <FigureBand figures={model.figures} copy={copy} onOpenImage={onOpenImage} />
      ) : null}

      <ComparisonSection tables={model.tables} conceptCards={model.conceptCards} copy={copy} />

      <FlowSection flow={model.flow} copy={copy} isRtl={isRtl} />

      <TablesSection tables={model.tables} copy={copy} />

      <AxesSection
        textSections={model.textSections}
        copy={copy}
        pageFigureMap={pageFigureMap}
        onOpenImage={onOpenImage}
      />

      <FooterStrip model={model} copy={copy} />
    </div>
  );
}

export default InfographicSummary;
