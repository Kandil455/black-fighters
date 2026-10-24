import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Check,
  Volume2,
  Square,
  Pencil,
  Save,
  X,
  Plus,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  Search,
  ListFilter,
  Table2,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ZoomIn,
  ZoomOut,
  Layers,
  Hash,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";
import {
  getLegacySummaryMarkdown,
  getSummaryDocumentV3,
  summaryDocumentToMarkdown,
  summaryPlainText,
} from "@/lib/summaryDocument";
import StudyGuideViewer from "@/components/course/StudyGuideViewer";
import { detectTextDir, renderStudyGuideHtml } from "@/lib/summaryStudyGuide";
import AtlasSummaryReader from "@/components/atlas/AtlasSummaryReader";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { recordMistake } from "@/lib/mistakeVault";
import { AI_SUMMARY_EDIT_COST } from "@/lib/creditCosts";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import {
  Eye,
  Target,
  Maximize2,
  Minimize2,
  Download,
  Brain,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Columns2,
} from "lucide-react";

function cleanSummaryMarkup(s = "") {
  return String(s || "")
    .replace(/==(green|yellow|cyan|blue|orange|red):([^=]+)==/g, "$2")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/[*_`#>]/g, "")
    .trim();
}

function buildMicroQuizForSection(section, allSections = [], maxCount = 4) {
  const clean = cleanSummaryMarkup;

  const facts = [];
  for (const item of section?.items || []) {
    if (item.kind === "bilingual_pairs" && Array.isArray(item.pairs)) {
      for (const pair of item.pairs) {
        const enText = clean(pair?.en || "");
        const arText = clean(pair?.ar || "");
        if (enText && arText) {
          facts.push({
            term: enText.split(/[:—,.]/)[0]?.slice(0, 70) || section.title,
            detail: `${arText} (${enText.slice(0, 110)})`,
          });
        } else if (arText.length > 18 || enText.length > 18) {
          facts.push({
            term: section.title,
            detail: arText || enText,
          });
        }
      }
    } else if (item.kind === "concepts" && Array.isArray(item.pairs)) {
      for (const p of item.pairs) {
        const [term, ...rest] = String(p).split(/\s*(?:→|->|:)\s*/);
        if (term && rest.length) {
          facts.push({ term: clean(term), detail: clean(rest.join(" : ")) });
        }
      }
    } else if (item.kind === "list" && Array.isArray(item.points)) {
      for (const pt of item.points) {
        const cleaned = clean(pt);
        if (cleaned.length > 18) {
          const lead = cleaned.includes(":") ? cleaned.split(":")[0].slice(0, 55) : section.title;
          facts.push({ term: lead, detail: cleaned });
        }
      }
    } else if (item.kind === "table" && Array.isArray(item.rows)) {
      for (const row of item.rows) {
        if (Array.isArray(row) && row.length >= 2) {
          const key = clean(row[0]);
          const val = clean(row.slice(1).join(" — "));
          if (key && val.length > 10) {
            facts.push({ term: key, detail: `${key}: ${val}` });
          }
        }
      }
    } else if (item.text) {
      const cleaned = clean(item.text);
      if (cleaned.length > 20) {
        facts.push({
          term: item.kind === "callout" ? `تنبيه هام (${section.title})` : section.title,
          detail: cleaned,
        });
      }
    }
  }

  const otherDetails = allSections
    .filter((s) => s.id !== section?.id)
    .flatMap((s) =>
      (s.items || []).flatMap((i) => {
        if (i.kind === "bilingual_pairs" && Array.isArray(i.pairs)) {
          return i.pairs.map((p) => clean(p?.ar || p?.en || ""));
        }
        if (Array.isArray(i.points)) return i.points.map(clean);
        return [clean(i.text || "")];
      })
    )
    .filter((t) => t.length > 20 && t.length < 180);

  const fallbackDistractors = [
    "لا يرتبط هذا المفهوم بالآلية الأساسية المذكورة في هذه الوحدة",
    "يحدث فقط في الحالات المزمنة المتأخرة وليس كعلامة أولية",
    "يعتمد على مسار معاكس تماماً لما ورد في المحاضرة",
  ];

  const questions = [];
  const targetFacts = facts.slice(0, maxCount);
  targetFacts.forEach((f, idx) => {
    const correctText = f.detail.slice(0, 165);
    const d1 = otherDetails[(idx * 2) % Math.max(1, otherDetails.length)] || fallbackDistractors[0];
    const d2 = otherDetails[(idx * 2 + 1) % Math.max(1, otherDetails.length)] || fallbackDistractors[1];
    const d3 = fallbackDistractors[idx % fallbackDistractors.length];
    const rawOpts = [
      correctText,
      d1 === correctText ? fallbackDistractors[0] : d1,
      d2 === correctText ? fallbackDistractors[1] : d2,
      d3,
    ];
    const correctIndex = idx % 4;
    const rotated = [...rawOpts];
    const temp = rotated[0];
    rotated[0] = rotated[correctIndex];
    rotated[correctIndex] = temp;

    questions.push({
      id: `${section.id}_mq_${idx}`,
      question:
        f.term && f.term !== section.title
          ? `ما هي العبارة الأدق علمياً بخصوص «${f.term}» في قسم (${section.title})؟`
          : `أي من النقاط التالية صحيحة وتنطبق على «${section.title}»؟`,
      options: rotated,
      correct_index: correctIndex,
      explanation: `النقطة الصحيحة من الملخص: ${correctText}`,
      topic: section.title,
    });
  });

  return questions;
}

function buildFullSummaryInstantQuiz(allSections = [], maxTotal = 12) {
  const all = [];
  for (const sec of allSections) {
    const secQs = buildMicroQuizForSection(sec, allSections, 3);
    all.push(...secQs);
    if (all.length >= maxTotal) break;
  }
  return all.slice(0, maxTotal);
}

function buildFlashcardsFromSections(sections = []) {
  const clean = cleanSummaryMarkup;
  const cards = [];
  for (const sec of sections) {
    for (const item of sec?.items || []) {
      if (item.kind === "bilingual_pairs" && Array.isArray(item.pairs)) {
        for (const p of item.pairs) {
          const en = clean(p?.en || "");
          const ar = clean(p?.ar || "");
          if (en && ar) {
            cards.push({
              front: en,
              back: ar,
              topic: sec.title,
            });
          }
        }
      } else if (item.kind === "concepts" && Array.isArray(item.pairs)) {
        for (const p of item.pairs) {
          const [head, ...rest] = String(p).split(/\s*(?:→|->|:)\s*/);
          if (head && rest.length) {
            cards.push({
              front: clean(head),
              back: clean(rest.join(" : ")),
              topic: sec.title,
            });
          }
        }
      } else if (item.kind === "table" && Array.isArray(item.rows)) {
        for (const row of item.rows) {
          if (Array.isArray(row) && row.length >= 2) {
            const front = clean(row[0]);
            const back = clean(row.slice(1).join(" · "));
            if (front && back) {
              cards.push({ front, back, topic: sec.title });
            }
          }
        }
      } else if (item.kind === "list" && Array.isArray(item.points)) {
        for (const pt of item.points) {
          const c = clean(pt);
          if (c.includes(":")) {
            const [head, ...rest] = c.split(":");
            if (head && rest.length) {
              cards.push({ front: head.trim(), back: rest.join(":").trim(), topic: sec.title });
            }
          } else if (c.length > 25) {
            cards.push({ front: `${sec.title} — نقطة أساسية`, back: c, topic: sec.title });
          }
        }
      }
    }
  }
  return cards.slice(0, 40);
}

/**
 * Parses either a v3 structured summary document or legacy markdown into
 * structured, color-coded Smart Study Sections:
 *   - Concept Cards (English key points & Arabic explanations)
 *   - High-Yield Alerts / Callouts
 *   - Comparison Tables
 *   - Bullet Takeaways
 */
function buildSmartSections(documentV3, markdownText, courseTitle) {
  if (documentV3 && Array.isArray(documentV3.sections) && documentV3.sections.length > 0) {
    const out = [];

    if (Array.isArray(documentV3.overview) && documentV3.overview.length > 0) {
      out.push({
        id: "section-overview",
        index: 0,
        title: "نظرة عامة سريعة · Quick Overview",
        isOverview: true,
        items: normalizeV3Blocks(documentV3.overview),
      });
    }

    documentV3.sections.forEach((sec, idx) => {
      const rawTitle =
        typeof sec?.title === "object"
          ? sec.title.text || `الوحدة ${idx + 1}`
          : String(sec?.title || `الوحدة ${idx + 1}`);
      out.push({
        id: sec?.id || `section-${idx + 1}`,
        index: idx + 1,
        title: rawTitle,
        sourceRefs: sec?.sourceRefs || [],
        items: normalizeV3Blocks(sec?.blocks || []),
      });
    });

    if (Array.isArray(documentV3.conclusion) && documentV3.conclusion.length > 0) {
      out.push({
        id: "section-conclusion",
        index: out.length,
        title: "الخلاصة والمراجعة النهائية · Key Takeaways",
        isConclusion: true,
        items: normalizeV3Blocks(documentV3.conclusion),
      });
    }

    return out;
  }

  // Fallback: Parse markdown into structured sections
  return parseMarkdownIntoSmartSections(markdownText, courseTitle);
}

function richValueToMarkedString(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  const text = String(val.text || "");
  const annotations = (Array.isArray(val.annotations) ? val.annotations : []).filter(
    (a) => Number(a?.end) > Number(a?.start)
  );
  if (!annotations.length) return text;
  const bounds = [
    ...new Set([
      0,
      text.length,
      ...annotations.flatMap((a) => [Number(a.start), Number(a.end)]),
    ]),
  ]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= text.length)
    .sort((a, b) => a - b);

  return bounds
    .slice(0, -1)
    .map((start, idx) => {
      const end = bounds[idx + 1];
      const slice = text.slice(start, end);
      if (!slice) return "";
      const active = annotations.filter((a) => Number(a.start) <= start && Number(a.end) >= end);
      if (active.some((a) => a.code)) return `\`${slice}\``;
      const hl = active.find((a) => a.highlight);
      if (hl) {
        const col = hl.color === "blue" ? "cyan" : hl.color || "yellow";
        return `==${col}:${slice}==`;
      }
      if (active.some((a) => a.bold)) return `**${slice}**`;
      return slice;
    })
    .join("");
}

function extractBlockPlainText(block) {
  if (!block) return "";
  if (typeof block === "string") return block;
  if (Array.isArray(block.annotations) && typeof block.text === "string") {
    return richValueToMarkedString(block);
  }
  if (block.content && typeof block.content === "object" && typeof block.content.text === "string") {
    return richValueToMarkedString(block.content);
  }
  if (typeof block.text === "string") return block.text;
  if (typeof block.content === "string") return block.content;
  if (Array.isArray(block.runs)) {
    return block.runs.map((r) => r?.text || "").join("");
  }
  return "";
}

function pairAdjacentBilingualLists(items = []) {
  const paired = [];
  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    const next = items[i + 1];
    const curIsEnList =
      cur?.kind === "list" &&
      (cur.role === "english_points" ||
        (cur.points?.length > 0 && cur.points.every((p) => detectTextDir(p) === "ltr")));
    const nextIsArList =
      next?.kind === "list" &&
      (next.role === "arabic_explanation" ||
        (next.points?.length > 0 && next.points.every((p) => detectTextDir(p) === "rtl")));

    if (curIsEnList && nextIsArList) {
      const maxLen = Math.max(cur.points.length, next.points.length);
      const pairs = [];
      for (let idx = 0; idx < maxLen; idx++) {
        pairs.push({
          en: cur.points[idx] || "",
          ar: next.points[idx] || "",
        });
      }
      paired.push({
        kind: "bilingual_pairs",
        id: `bipair-${cur.id || i}`,
        pairs,
      });
      i++;
      continue;
    }
    paired.push(cur);
  }
  return paired;
}

function normalizeV3Blocks(blocks = []) {
  const items = [];
  blocks.forEach((block, i) => {
    if (!block) return;
    const type = String(block.type || "paragraph").toLowerCase();
    const role = String(block.role || "").toLowerCase();
    const text = extractBlockPlainText(block);

    if (type === "table" || block.table) {
      const tbl = block.table && typeof block.table === "object" ? block.table : block;
      const headers = Array.isArray(tbl.headers)
        ? tbl.headers.map(extractBlockPlainText)
        : Array.isArray(tbl.columns)
        ? tbl.columns.map(extractBlockPlainText)
        : [];
      const rows = (Array.isArray(tbl.rows) ? tbl.rows : []).map((r) =>
        (Array.isArray(r) ? r : r?.cells || []).map(extractBlockPlainText)
      );
      if (headers.length || rows.length) {
        items.push({ kind: "table", id: block.id || `tbl-${i}`, headers, rows });
      }
      return;
    }

    if (type === "list" || Array.isArray(block.items)) {
      const listItems = (block.items || block.children || [])
        .map(extractBlockPlainText)
        .filter(Boolean);
      if (listItems.length) {
        items.push({
          kind: "list",
          id: block.id || `lst-${i}`,
          role,
          ordered: !!block.ordered,
          points: listItems,
        });
      }
      return;
    }

    if (type === "callout" || type === "quote") {
      const tone = String(block.tone || block.variant || "note").toLowerCase();
      if (text) {
        items.push({
          kind: "callout",
          id: block.id || `cal-${i}`,
          tone: /warn|danger|exam|trap|important/.test(tone) ? "warning" : "tip",
          text,
        });
      }
      return;
    }

    if (type === "concept_map" && text) {
      const pairs = text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
      items.push({
        kind: "concepts",
        id: block.id || `cmap-${i}`,
        pairs,
      });
      return;
    }

    if (type === "heading" && text) {
      items.push({
        kind: "subheading",
        id: block.id || `sub-${i}`,
        text,
      });
      return;
    }

    if (text) {
      items.push({
        kind: "card",
        id: block.id || `crd-${i}`,
        role:
          role === "arabic_explanation"
            ? "arabic"
            : role === "english_points"
            ? "english"
            : "general",
        text,
      });
    }
  });
  return pairAdjacentBilingualLists(items);
}

function parseMarkdownIntoSmartSections(markdown = "", defaultTitle = "الملخص الذكي") {
  const lines = String(markdown || "").split("\n");
  const sections = [];
  let current = {
    id: "sec-1",
    index: 1,
    title: defaultTitle || "مقدمة المحاضرة",
    items: [],
  };
  let bulletBuffer = [];
  let tableBuffer = [];

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      current.items.push({
        kind: "list",
        id: `lst-${current.items.length}`,
        points: [...bulletBuffer],
      });
      bulletBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const parsedRows = tableBuffer
        .map((row) =>
          row
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim())
        )
        .filter((r) => !r.every((cell) => /^[-:]+$/.test(cell)));
      if (parsedRows.length > 0) {
        const [headers, ...rows] = parsedRows;
        current.items.push({
          kind: "table",
          id: `tbl-${current.items.length}`,
          headers,
          rows,
        });
      }
    }
    tableBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      flushTable();
      return;
    }

    // Markdown table line
    if (line.startsWith("|") && line.endsWith("|")) {
      flushBullets();
      tableBuffer.push(line);
      return;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Section heading (## or #)
    if (/^#{1,2}\s+/.test(line)) {
      flushBullets();
      if (current.items.length > 0) {
        sections.push(current);
      }
      const cleanTitle = line.replace(/^#{1,2}\s+/, "").replace(/\*\*/g, "").trim();
      current = {
        id: `sec-${sections.length + 1}`,
        index: sections.length + 1,
        title: cleanTitle,
        items: [],
      };
      return;
    }

    // Subheading (###)
    if (/^###+\s+/.test(line)) {
      flushBullets();
      current.items.push({
        kind: "subheading",
        id: `sub-${current.items.length}`,
        text: line.replace(/^###+\s+/, "").replace(/\*\*/g, "").trim(),
      });
      return;
    }

    // Blockquote / Exam Alert
    if (line.startsWith(">")) {
      flushBullets();
      const quoteText = line.replace(/^>\s*/, "").trim();
      current.items.push({
        kind: "callout",
        id: `cal-${current.items.length}`,
        tone: /تنبيه|مهم|امتحان|خطأ|warning|exam|trap|important/i.test(quoteText)
          ? "warning"
          : "tip",
        text: quoteText,
      });
      return;
    }

    // Bullet item
    if (/^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      bulletBuffer.push(line.replace(/^([-•*]|\d+[.)])\s+/, "").trim());
      return;
    }

    flushBullets();
    const isMostlyArabic = /[\u0600-\u06FF]/.test(line);
    current.items.push({
      kind: "card",
      id: `crd-${current.items.length}`,
      role: isMostlyArabic ? "arabic" : "english",
      text: line,
    });
  });

  flushBullets();
  flushTable();
  if (current.items.length > 0 || sections.length === 0) {
    sections.push(current);
  }
  return sections.map((sec) => ({
    ...sec,
    items: pairAdjacentBilingualLists(sec.items),
  }));
}

/**
 * Renders inline highlights (`==color:text==`, `**bold**`, `` `code` ``) AND
 * automatic academic lead-term bolding, parenthetical medical term bolding,
 * and dosage/threshold/exam keyword highlights in both Light and Dark mode.
 */
function FormattedInlineText({ text = "" }) {
  const html = useMemo(() => {
    let out = String(text || "").replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
    );

    out = out
      .replace(
        /==(green|yellow|cyan|blue|orange|red):([^=]+)==/g,
        (_, color, body) => `<mark class="bf-hl bf-hl-${color === "blue" ? "cyan" : color}">${body}</mark>`
      )
      .replace(/==([^=]+)==/g, '<mark class="bf-hl bf-hl-yellow">$1</mark>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-foreground">$1</strong>')
      .replace(
        /`([^`]+)`/g,
        '<code dir="ltr" class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.9em] text-primary border border-border">$1</code>'
      );

    const hasLeadFormat = /^\s*<(?:strong|mark|code)\b/i.test(out);
    if (!hasLeadFormat) {
      if (/^([^:—<]{2,78})(\s*[:—]\s*)(.+)$/s.test(out)) {
        out = out.replace(
          /^([^:—<]{2,78})(\s*[:—]\s*)(.+)$/s,
          '<strong class="font-extrabold text-foreground">$1</strong>$2$3'
        );
      } else if (/^([A-Z][A-Za-z0-9\s/-]{3,60})(,\s+)(.+)$/s.test(out)) {
        out = out.replace(
          /^([A-Z][A-Za-z0-9\s/-]{3,60})(,\s+)(.+)$/s,
          '<strong class="font-extrabold text-foreground">$1</strong>$2$3'
        );
      } else if (
        /^([A-Z][A-Za-z0-9\s/-]{2,55}?)(\s+(?:is|are|was|were|must|should|can|will|requires?|indicates?|causes?|leads?\s+to|results?\s+in|prevents?|maintains?|controls?|defines?|represents?|occurs?)\b)/i.test(
          out
        )
      ) {
        out = out.replace(
          /^([A-Z][A-Za-z0-9\s/-]{2,55}?)(\s+(?:is|are|was|were|must|should|can|will|requires?|indicates?|causes?|leads?\s+to|results?\s+in|prevents?|maintains?|controls?|defines?|represents?|occurs?)\b)/i,
          '<strong class="font-extrabold text-foreground">$1</strong>$2'
        );
      } else if (/^([^،<]{4,68})(،\s+)(.+)$/s.test(out)) {
        out = out.replace(
          /^([^،<]{4,68})(،\s+)(.+)$/s,
          '<strong class="font-extrabold text-foreground">$1</strong>$2$3'
        );
      } else if (
        /^((?:في حالة|عند|يجب|يتم|تعتبر|يعتبر|إن|أن|تؤدي|يؤدي|الهدف من|أهم|أبكر|أول)\s+[\u0600-\u06FF\s]{3,42})(\s+)/.test(
          out
        )
      ) {
        out = out.replace(
          /^((?:في حالة|عند|يجب|يتم|تعتبر|يعتبر|إن|أن|تؤدي|يؤدي|الهدف من|أهم|أبكر|أول)\s+[\u0600-\u06FF\s]{3,42})(\s+)/,
          '<strong class="font-extrabold text-foreground">$1</strong>$2'
        );
      }
    }

    out = out.replace(
      /\(([A-Za-z][A-Za-z0-9\s/-]{1,42})\)/g,
      '(<strong class="font-bold text-primary">$1</strong>)'
    );

    if (!out.includes('class="bf-hl')) {
      out = out.replace(
        /(\b(?:GCS\s*(?:&lt;|&gt;|≤|≥|=)?\s*\d+|C\d\s*[-–]\s*C\d|\d+(?:\.\d+)?\s*(?:mmHg|mg\/dL|mg\/kg|mg|g|mcg|mL|ml|L|%|bpm|min|minutes|hrs|hours|sec|seconds|cm|mm|mEq\/L|mmol\/L|IU|مم زئبق|دقائق|دقيقة|ساعات|ساعة|ثواني|ثانية|ملجم|جم|جرام|مل|لتر))(?![A-Za-z\u0600-\u06FF]))/gi,
        '<mark class="bf-hl bf-hl-yellow">$1</mark>'
      );
    }

    out = out.replace(
      /(\b(?:earliest measurable sign|definitive airway|gold standard|first-line|contraindicated|life-threatening|mandatory|immediately)\b|أبكر علامة|القاعدة الذهبية|الخط الأول|ممنوع|فوراً|حتمي)/gi,
      '<mark class="bf-hl bf-hl-red">$1</mark>'
    );

    return out;
  }, [text]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SummaryView({
  summary,
  course,
  onGenerateFromSummary,
  onSwitchTab,
  generatingType,
}) {
  const { isEn } = useLocale();
  const { refreshProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiUpdating, setAiUpdating] = useState(false);
  const [activeAiSection, setActiveAiSection] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("all");
  const [viewMode, setViewMode] = useState("smart_cards"); // "smart_cards" | "print_template"
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [activeStudioDrawer, setActiveStudioDrawer] = useState(null); // "quiz" | "flashcards" | null
  const [studioQuizCount, setStudioQuizCount] = useState(15);
  const [studioQuizProfile, setStudioQuizProfile] = useState("exam");
  const [instantQuizAnswers, setInstantQuizAnswers] = useState({});
  const [activeFlashcardIdx, setActiveFlashcardIdx] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [expandingSectionId, setExpandingSectionId] = useState(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const utterRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const documentV3 = useMemo(() => getSummaryDocumentV3(summary), [summary]);
  const legacyMarkdown = useMemo(() => getLegacySummaryMarkdown(summary), [summary]);
  const text = useMemo(
    () =>
      legacyMarkdown ||
      (documentV3 ? summaryDocumentToMarkdown(documentV3) : "") ||
      summary?.content ||
      "",
    [documentV3, legacyMarkdown, summary]
  );
  const plainText = useMemo(
    () => summaryPlainText(summary) || text,
    [summary, text]
  );

  const smartSections = useMemo(
    () => buildSmartSections(documentV3, text, course?.title),
    [documentV3, text, course?.title]
  );

  const filteredSections = useMemo(() => {
    let list = smartSections;
    if (activeSectionId !== "all") {
      list = list.filter((s) => s.id === activeSectionId);
    }
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;

    return list
      .map((sec) => {
        const titleMatch = sec.title?.toLowerCase().includes(q);
        if (titleMatch) return sec;
        const matchedItems = sec.items.filter((item) => {
          if (item.text?.toLowerCase().includes(q)) return true;
          if (item.points?.some((p) => p.toLowerCase().includes(q))) return true;
          if (
            item.pairs?.some((p) =>
              typeof p === "string"
                ? p.toLowerCase().includes(q)
                : `${p?.en || ""} ${p?.ar || ""}`.toLowerCase().includes(q)
            )
          )
            return true;
          if (item.headers?.some((h) => h.toLowerCase().includes(q))) return true;
          if (item.rows?.some((r) => r.some((c) => c.toLowerCase().includes(q)))) return true;
          return false;
        });
        if (matchedItems.length > 0) {
          return { ...sec, items: matchedItems };
        }
        return null;
      })
      .filter(Boolean);
  }, [smartSections, activeSectionId, searchTerm]);

  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const copy = () => {
    navigator.clipboard.writeText(plainText || text);
    setCopied(true);
    toast.success(isEn ? "Summary copied!" : "تم نسخ الملخص بالكامل!");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeak = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const clean = (plainText || text).replace(/[#*>_`~\-]/g, " ");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = /[\u0600-\u06FF]/.test(clean) ? "ar-SA" : "en-US";
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const applyHighlight = (color) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = draft.slice(start, end).trim() || "نص مهم";
    const wrapped = `==${color}:${selected}==`;
    const next = `${draft.slice(0, start)}${wrapped}${draft.slice(end)}`;
    setDraft(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + wrapped.length);
    }, 0);
  };

  const [sectionDrillId, setSectionDrillId] = useState(null);
  const [sectionDrillAnswers, setSectionDrillAnswers] = useState({});
  const [sendingSectionId, setSendingSectionId] = useState(null);

  const handleSendSectionToTelegram = async (section) => {
    if (!section || sendingSectionId) return;
    setSendingSectionId(section.id);
    try {
      const sectionLines = [`## ${section.title}`];
      for (const item of section.items || []) {
        if (item.text) sectionLines.push(`- ${item.text}`);
        if (Array.isArray(item.points)) {
          item.points.forEach((p) => sectionLines.push(`- ${p}`));
        }
        if (Array.isArray(item.pairs)) {
          item.pairs.forEach((p) => {
            if (typeof p === "string") sectionLines.push(`- ${p}`);
            else {
              if (p.en) sectionLines.push(`- ${p.en}`);
              if (p.ar) sectionLines.push(`- ${p.ar}`);
            }
          });
        }
      }
      const res = await invokeSecureFunction("export-to-telegram", {
        title: `${course?.title || "ملخص"} — ${section.title}`,
        type: "summary",
        summaryText: sectionLines.join("\n"),
      });
      if (res?.data?.success) {
        toast.success(res.data.message || `تم إرسال وحدة "${section.title}" إلى تيليجرام! 🤖`);
      } else {
        toast.error(res?.data?.message || "اربط حسابك بالتيليجرام من الإعدادات لإرسال الجزئية للبوت 🤖");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "تعذر إرسال الجزئية للبوت");
    } finally {
      setSendingSectionId(null);
    }
  };

  const insertSectionBlock = () => {
    const block = `\n\n## عنوان قسم جديد\n- **المصطلح الأساسي**: شرح مبسط وواضح للنقطة\n> معلومة مهمة للامتحان والتركيز\n`;
    setDraft((prev) => `${prev.trim()}${block}`);
  };

  const saveSummaryContent = async (nextText) => {
    if (!course?.id) return;
    const existing = await base44.entities.GeneratedContent.filter({
      course_id: course.id,
      content_type: "summary",
    });
    const payload = JSON.stringify({
      summary_markdown: nextText,
      summary_document_v3: null,
    });
    if (existing[0]) {
      await base44.entities.GeneratedContent.update(existing[0].id, { content: payload });
    } else {
      await base44.entities.GeneratedContent.create({
        course_id: course.id,
        content_type: "summary",
        title: "summary",
        content: payload,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["contents", course.id] });
  };

  const handleSaveEdit = async () => {
    if (!draft.trim()) {
      toast.error(isEn ? "Summary cannot be empty" : "الملخص لا يمكن أن يكون فارغاً");
      return;
    }
    setSaving(true);
    try {
      await saveSummaryContent(draft.trim());
      setEditing(false);
      toast.success(isEn ? "Summary saved ✅" : "تم حفظ التعديلات بنجاح ✅");
    } catch (err) {
      toast.error(err.message || (isEn ? "Error saving" : "حصل خطأ أثناء الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  const handleAiEdit = async (customPrompt = "") => {
    const instruction = (customPrompt || aiInstruction).trim();
    const baseText = (editing ? draft : text).trim();
    if (!instruction || !baseText || aiUpdating) return;
    setAiUpdating(true);
    const jobKey = `summary_edit_${course?.id || "doc"}_${Date.now().toString(36)}`;
    let chargedCost = 0;
    try {
      const chargeRes = await base44.functions.invoke("chargeAiJob", {
        action: "charge",
        jobKey,
        task: "summary_edit",
        cost: AI_SUMMARY_EDIT_COST,
        charCount: baseText.length,
        courseId: course?.id || "",
      });
      if (!chargeRes?.data?.ok) {
        const errMsg =
          chargeRes?.data?.error === "INSUFFICIENT_CREDITS"
            ? `رصيد الكريدتس غير كافٍ لتعديل الملخص بالذكاء الاصطناعي (مطلوب ${AI_SUMMARY_EDIT_COST} كريدت)`
            : chargeRes?.data?.message ||
              chargeRes?.data?.error ||
              "تعذر خصم الكريدتس لتعديل الملخص";
        throw new Error(errMsg);
      }
      chargedCost = Number(chargeRes?.data?.charged || AI_SUMMARY_EDIT_COST);

      const targetNote = activeAiSection
        ? `\nركّز التعديل على القسم المعنون "${activeAiSection}" أولاً مع الحفاظ على باقي الأقسام كما هي ما لم يلزم الربط.`
        : "";
      const prompt = `أنت محرر ملخصات دراسية محترف داخل منصة Black Fighters. عدّل الملخص التالي حسب طلب الطالب مع الحفاظ على الدقة العلمية، المصطلحات الإنجليزية المهمة، العناوين المنظمة، والنقاط الواضحة.${targetNote}

طلب التعديل:
${instruction}

الملخص الحالي:
${baseText.slice(0, 18000)}

أعد الملخص المعدل كاملاً بصيغة Markdown منظمة بدون مقدمات أو تعليقات خارج الملخص.`;

      const res = await base44.functions.invoke("courseAssistant", { prompt });
      const updated = res?.data?.reply?.trim();
      if (!updated) throw new Error(res?.data?.error || "لم يرجع المساعد نصاً معدلاً");
      setDraft(updated);
      await saveSummaryContent(updated);
      await base44.functions
        .invoke("chargeAiJob", {
          action: "finalize",
          jobKey,
          task: "summary_edit",
          cost: chargedCost,
        })
        .catch(() => {});
      refreshProfile?.().catch?.(() => {});
      setAiInstruction("");
      toast.success(
        isEn
          ? `Summary updated by AI ✨ (-${chargedCost} credits)`
          : `تم تحديث الملخص بالذكاء الاصطناعي ✨ (تم خصم ${chargedCost} كريدت)`
      );
    } catch (err) {
      if (chargedCost > 0) {
        await base44.functions
          .invoke("chargeAiJob", {
            action: "refund",
            jobKey,
            task: "summary_edit",
            cost: chargedCost,
          })
          .catch(() => {});
        refreshProfile?.().catch?.(() => {});
      }
      toast.error(err.message || (isEn ? "Failed to edit summary" : "فشل تعديل الملخص"));
    } finally {
      setAiUpdating(false);
    }
  };

  //Stats for header
  const totalTables = useMemo(
    () =>
      smartSections.reduce(
        (acc, s) => acc + s.items.filter((i) => i.kind === "table").length,
        0
      ),
    [smartSections]
  );
  const totalAlerts = useMemo(
    () =>
      smartSections.reduce(
        (acc, s) => acc + s.items.filter((i) => i.kind === "callout").length,
        0
      ),
    [smartSections]
  );

  const instantSummaryQuiz = useMemo(
    () => buildFullSummaryInstantQuiz(smartSections, 12),
    [smartSections]
  );
  const summaryFlashcards = useMemo(
    () => buildFlashcardsFromSections(smartSections),
    [smartSections]
  );

  const downloadHtmlDirect = () => {
    try {
      const tpl = (() => {
        try {
          return localStorage.getItem("bf_guide_template") || "modules_red";
        } catch {
          return "modules_red";
        }
      })();
      const exportHtml = renderStudyGuideHtml({
        document: documentV3 || undefined,
        markdown: text,
        title: course?.title || "الملخص الذكي",
        templateId: tpl,
        forExport: true,
      });
      const blob = new Blob([exportHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      const safeName =
        String(course?.title || "study-guide")
          .replace(/[\\/:*?"<>|]+/g, "-")
          .trim() || "study-guide";
      link.href = url;
      link.download = `${safeName}.html`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("تم تحميل ملف المذكرة (HTML) بتصميم البطاقات والألوان جاهز للفتح والطباعة 📄✨");
    } catch {
      toast.error("تعذر تحميل ملف الملخص");
    }
  };

  const printGuideDirect = () => {
    try {
      const tpl = (() => {
        try {
          return localStorage.getItem("bf_guide_template") || "modules_red";
        } catch {
          return "modules_red";
        }
      })();
      const exportHtml = renderStudyGuideHtml({
        document: documentV3 || undefined,
        markdown: text,
        title: course?.title || "الملخص الذكي",
        templateId: tpl,
        forExport: true,
      });
      const blob = new Blob([exportHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, "_blank");
      if (printWin) {
        printWin.addEventListener("load", () => {
          setTimeout(() => {
            try {
              printWin.focus();
              printWin.print();
            } catch {}
          }, 250);
        });
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("تعذر فتح نافذة الطباعة");
    }
  };

  const handleExpandSection = async (section) => {
    if (!section || aiUpdating || expandingSectionId) return;
    setExpandingSectionId(section.id);
    toast.info(`جاري تكبير وتوسيع شرح وحدة "${section.title}" بالتفصيل... 🔍⚡`);
    try {
      await handleAiEdit(
        `كبّر ووسّع شرح القسم المعنون "${section.title}" بالتفصيل الكامل: أضف شرحاً عربياً معمقاً لكل نقطة إنجليزية، اشرح الآليات والأسباب خطوة بخطوة، أبرز الأرقام والجرعات بـ **Bold**، وأضف أمثلة إكلينيكية/تطبيقية وتنبيهات أسئلة الامتحانات (> تنبيه امتحاني) وجدول مقارنة إن أمكن مع الحفاظ على باقي الأقسام كما هي.`
      );
    } finally {
      setExpandingSectionId(null);
    }
  };

  const copySectionText = (section) => {
    if (!section) return;
    const lines = [`## ${section.title}`];
    for (const item of section.items || []) {
      if (item.text) lines.push(cleanSummaryMarkup(item.text));
      if (Array.isArray(item.points)) {
        item.points.forEach((p) => lines.push(`• ${cleanSummaryMarkup(p)}`));
      }
      if (Array.isArray(item.pairs)) {
        item.pairs.forEach((p) => {
          if (typeof p === "string") lines.push(`• ${cleanSummaryMarkup(p)}`);
          else {
            if (p.en) lines.push(`• [EN] ${cleanSummaryMarkup(p.en)}`);
            if (p.ar) lines.push(`  [AR] ${cleanSummaryMarkup(p.ar)}`);
          }
        });
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success(`تم نسخ وحدة "${section.title}" بنجاح 📋`);
  };

  return (
    <div
      className={cn(
        "space-y-4 transition-all",
        isFullscreen &&
          "fixed inset-0 z-50 bg-background/98 backdrop-blur-md overflow-y-auto p-3 sm:p-6 md:p-8"
      )}
    >
      {/* Fullscreen Summary-Only Distraction-Free Header Bar */}
      {isFullscreen ? (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#19f08c]/30 bg-[#05070a]/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="size-4 text-[#19f08c] shrink-0" />
            <span className="font-display text-sm font-extrabold text-[#f5f7fa] truncate">
              {course?.title || (isEn ? "Focused Summary Reader" : "وضع عرض الملخص المكبّر فقط")}
            </span>
            <span className="hidden sm:inline-block rounded-md border border-[#19f08c]/30 bg-[#19f08c]/10 px-2 py-0.5 text-[10px] font-bold text-[#19f08c]">
              {isEn ? "Summary Only Mode" : "عرض التلخيص فقط بدون أدوات"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] p-0.5">
              <button
                type="button"
                onClick={() => setFontSize((f) => Math.max(13, f - 1))}
                title={isEn ? "Smaller text" : "تصغير الخط"}
                className="p-1.5 text-[#9aa4b2] hover:text-[#f5f7fa] transition-colors cursor-pointer"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] font-bold text-[#f5f7fa] tabular">
                {fontSize}px
              </span>
              <button
                type="button"
                onClick={() => setFontSize((f) => Math.min(26, f + 1))}
                title={isEn ? "Larger text" : "تكبير الخط"}
                className="p-1.5 text-[#9aa4b2] hover:text-[#f5f7fa] transition-colors cursor-pointer"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>

            {viewMode === "smart_cards" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsWideLayout((w) => !w)}
                className={cn(
                  "gap-1.5 rounded-xl text-xs h-8",
                  isWideLayout && "border-[#19f08c]/50 bg-[#19f08c]/10 text-[#19f08c]"
                )}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>
                  {isWideLayout
                    ? isEn
                      ? "Show Index"
                      : "إظهار الفهرس"
                    : isEn
                    ? "Hide Index"
                    : "إخفاء الفهرس"}
                </span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(false)}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25 transition-colors cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{isEn ? "Exit Fullscreen (Esc)" : "✕ إغلاق وضع التلخيص المكبّر (Esc)"}</span>
            </Button>
          </div>
        </div>
      ) : (
      /* Top Smart Reader Toolbar */
      <div className="glass rounded-[1.25rem] p-4 space-y-3 border border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Toggle: Smart Cards vs Active Recall Reader vs Print Template */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.07] bg-[#05070a]/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode("smart_cards")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                viewMode === "smart_cards"
                  ? "bg-[#19f08c] text-[#03150c] shadow-sm"
                  : "text-[#9aa4b2] hover:text-[#f5f7fa]"
              )}
            >
              <Layers className="size-3.5" />
              <span>{isEn ? "Smart Study Cards" : "المذكرة الذكية (بطاقات + فهرس)"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("atlas_v5")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                viewMode === "atlas_v5"
                  ? "bg-[#19f08c] text-[#03150c] shadow-sm"
                  : "text-[#9aa4b2] hover:text-[#f5f7fa]"
              )}
            >
              <Eye className="size-3.5" />
              <span>{isEn ? "Active Recall & FSRS" : "التسميع التفاعلي والقاموس (FSRS)"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("print_template")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                viewMode === "print_template"
                  ? "bg-[#19f08c] text-[#03150c] shadow-sm"
                  : "text-[#9aa4b2] hover:text-[#f5f7fa]"
              )}
            >
              <Printer className="size-3.5" />
              <span>{isEn ? "Print & Export Templates" : "قوالب الطباعة والتحميل (5 قوالب)"}</span>
            </button>
          </div>

          {/* Reader Action Buttons (Zoom, Fullscreen, Wide Mode, Download, Audio, Copy, Edit) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {viewMode === "smart_cards" && !editing && (
              <>
                <div className="inline-flex items-center rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5 me-1">
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.max(13, f - 1))}
                    title={isEn ? "Smaller text" : "تصغير الخط"}
                    className="p-1.5 text-[#9aa4b2] hover:text-[#f5f7fa] cursor-pointer"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] font-bold text-[#f5f7fa] tabular">
                    {fontSize}px
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.min(26, f + 1))}
                    title={isEn ? "Larger text" : "تكبير الخط"}
                    className="p-1.5 text-[#9aa4b2] hover:text-[#f5f7fa] cursor-pointer"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsWideLayout((w) => !w)}
                  title={isEn ? "Toggle Wide Reader" : "توسيع عرض القراءة (إخفاء/إظهار الفهرس الجانبي)"}
                  className={cn(
                    "gap-1.5 rounded-xl text-xs h-9",
                    isWideLayout && "border-[#19f08c]/50 bg-[#19f08c]/10 text-[#19f08c]"
                  )}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isWideLayout
                      ? isEn
                        ? "Show Index"
                        : "إظهار الفهرس"
                      : isEn
                      ? "Wide View"
                      : "توسيع العرض"}
                  </span>
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen((f) => !f)}
              className={cn(
                "gap-1.5 rounded-xl text-xs h-9 font-bold",
                isFullscreen
                  ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                  : "border-[#19f08c]/40 bg-[#19f08c]/10 text-[#19f08c] hover:bg-[#19f08c]/20"
              )}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>{isEn ? "Exit Fullscreen" : "إغلاق ملء الشاشة"}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{isEn ? "Fullscreen" : "تكبير الملخص ⛶"}</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={downloadHtmlDirect}
              className="gap-1.5 rounded-xl text-xs h-9"
              title={isEn ? "Download HTML Study Guide" : "تحميل الملخص كملف HTML منظم"}
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Download HTML" : "تحميل HTML"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={printGuideDirect}
              className="gap-1.5 rounded-xl text-xs h-9"
              title={isEn ? "Print or Save as PDF" : "طباعة أو حفظ PDF"}
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{isEn ? "PDF / Print" : "طباعة PDF"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={toggleSpeak}
              className="gap-1.5 rounded-xl text-xs h-9"
            >
              {speaking ? (
                <>
                  <Square className="w-3.5 h-3.5 text-destructive" />
                  <span>{isEn ? "Stop Audio" : "إيقاف القراءة"}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? "Listen" : "استماع صوتي"}</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={copy}
              className="gap-1.5 rounded-xl text-xs h-9"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isEn ? "Copied" : "تم النسخ"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? "Copy" : "نسخ"}</span>
                </>
              )}
            </Button>

            {!editing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="gap-1.5 rounded-xl text-xs h-9 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isEn ? "Edit Notes" : "تعديل يدوي"}</span>
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="gap-1.5 rounded-xl text-xs h-9 font-bold"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isEn ? "Save" : "حفظ التعديلات"}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setDraft(text);
                  }}
                  className="gap-1 rounded-xl text-xs h-9"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isEn ? "Cancel" : "إلغاء"}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ⚡ Power Actions Bar: Generate Quizzes, Flashcards, Deep Expand, Cheat Sheet Directly from Summary */}
        <div className="pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#19f08c] me-1">
              <Sparkles className="size-4" />
              {isEn ? "Summary Power Studio:" : "أدوات التلخيص الذكية:"}
            </span>

            {/* 1. Deep Expand / Enlarge Summary Content */}
            <button
              type="button"
              disabled={aiUpdating}
              onClick={() =>
                handleAiEdit(
                  "كبّر ووسّع هذا الملخص بالكامل ليكون مرجعاً شاملاً ومفصلاً جداً: اشرح كل نقطة إنجليزية وعربية بعمق، أضف الآليات والأسباب والأمثلة الإكلينيكية/التطبيقية، ضع **Bold** على كل المصطلحات والأرقام المهمة، وأضف جداول مقارنة وتنبيهات امتحانات (> تنبيه امتحاني) في كل قسم."
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#19f08c]/45 bg-[#19f08c]/15 px-3 py-1.5 text-xs font-bold text-[#19f08c] hover:bg-[#19f08c] hover:text-[#03150c] transition-colors cursor-pointer disabled:opacity-50"
            >
              {aiUpdating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ZoomIn className="size-3.5" />
              )}
              <span>
                {isEn
                  ? `Deep Expand Summary (${AI_SUMMARY_EDIT_COST} credits)`
                  : `🔍 تكبير وتوسيع الشرح بالتفصيل (${AI_SUMMARY_EDIT_COST} كريدت)`}
              </span>
            </button>

            {/* 2. Build / Practice Quiz from Summary */}
            <button
              type="button"
              onClick={() =>
                setActiveStudioDrawer((d) => (d === "quiz" ? null : "quiz"))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                activeStudioDrawer === "quiz"
                  ? "border-sky-400 bg-sky-400 text-[#04131d]"
                  : "border-sky-400/40 bg-sky-400/12 text-sky-300 hover:bg-sky-400/20"
              )}
            >
              <Brain className="size-3.5" />
              <span>
                {isEn
                  ? "Create Quiz from Summary 🎯"
                  : "🎯 اعمل كويز من التلخيص ده"}
              </span>
            </button>

            {/* 3. Flashcards Deck from Summary */}
            <button
              type="button"
              onClick={() => {
                setActiveFlashcardIdx(0);
                setIsFlashcardFlipped(false);
                setActiveStudioDrawer((d) =>
                  d === "flashcards" ? null : "flashcards"
                );
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                activeStudioDrawer === "flashcards"
                  ? "border-violet-400 bg-violet-400 text-[#120624]"
                  : "border-violet-400/40 bg-violet-400/12 text-violet-300 hover:bg-violet-400/20"
              )}
            >
              <Layers className="size-3.5" />
              <span>
                {isEn
                  ? `Flashcards (${summaryFlashcards.length})`
                  : `🃏 بطاقات تسميع (${summaryFlashcards.length})`}
              </span>
            </button>

            {/* 4. Cheat Sheet / Study Sheet */}
            {onGenerateFromSummary && (
              <button
                type="button"
                disabled={Boolean(generatingType)}
                onClick={() => onGenerateFromSummary("study_sheet")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/12 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileText className="size-3.5" />
                <span>
                  {isEn ? "Generate Cheat Sheet" : "📋 برشامة مراجعة سريعة"}
                </span>
              </button>
            )}
          </div>

          {/* Expand / Collapse All Sections */}
          {viewMode === "smart_cards" && smartSections.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const allCollapsed = smartSections.every(
                  (s) => collapsedSections[s.id]
                );
                if (allCollapsed) {
                  setCollapsedSections({});
                } else {
                  const next = {};
                  smartSections.forEach((s) => {
                    next[s.id] = true;
                  });
                  setCollapsedSections(next);
                }
              }}
              className="text-[11px] font-bold text-[#9aa4b2] hover:text-[#f5f7fa] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] cursor-pointer"
            >
              {smartSections.every((s) => collapsedSections[s.id]) ? (
                <>
                  <ChevronDown className="size-3.5" />
                  <span>{isEn ? "Expand All Units" : "فرد كل الوحدات"}</span>
                </>
              ) : (
                <>
                  <ChevronUp className="size-3.5" />
                  <span>{isEn ? "Collapse All Units" : "طي كل الوحدات"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 🎯 Interactive Quiz Studio Drawer (Generate Full AI Quiz OR Solve Instant Summary Quiz) */}
        {activeStudioDrawer === "quiz" && (
          <div className="rounded-2xl border border-sky-400/35 bg-[#060b12]/95 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-sky-300 flex items-center gap-2">
                  <Brain className="size-4" />
                  {isEn
                    ? "Quiz Generator & Instant Exam from Summary"
                    : "🎯 استوديو الكويزات من الملخص الذكي"}
                </h4>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  {isEn
                    ? "Generate a full AI exam tab or solve instant questions extracted from your summary units below"
                    : "ولّد امتحان كامل بالذكاء الاصطناعي بالعدد والمستوى اللي تحبه، أو حل الكويز الفوري بالأسفل مباشرة وأنت بتذاكر!"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStudioDrawer(null)}
                className="p-1 text-[#9aa4b2] hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {onGenerateFromSummary && (
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#f5f7fa]">
                      {isEn ? "Questions:" : "عدد الأسئلة:"}
                    </span>
                    {[5, 10, 15, 20, 30].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setStudioQuizCount(cnt)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer",
                          studioQuizCount === cnt
                            ? "bg-sky-400 text-[#04131d] border-sky-400"
                            : "bg-[#05070a] text-[#9aa4b2] border-white/10 hover:text-white"
                        )}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#f5f7fa]">
                      {isEn ? "Style:" : "النمط:"}
                    </span>
                    {[
                      ["balanced", "شامل"],
                      ["exam", "شبه الامتحان"],
                      ["traps", "تريكات وأفخاخ"],
                      ["application", "حالات إكلينيكية"],
                    ].map(([idKey, labelAr]) => (
                      <button
                        key={idKey}
                        type="button"
                        onClick={() => setStudioQuizProfile(idKey)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer",
                          studioQuizProfile === idKey
                            ? "bg-[#19f08c] text-[#03150c] border-[#19f08c]"
                            : "bg-[#05070a] text-[#9aa4b2] border-white/10 hover:text-white"
                        )}
                      >
                        {labelAr}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={Boolean(generatingType)}
                  onClick={() =>
                    onGenerateFromSummary("quiz", {
                      count: studioQuizCount,
                      profile: studioQuizProfile,
                    })
                  }
                  className="bg-sky-400 hover:bg-sky-300 text-[#04131d] font-extrabold rounded-xl gap-1.5 cursor-pointer"
                >
                  {generatingType ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span>
                    {generatingType
                      ? "جاري توليد الامتحان..."
                      : `🚀 توليد امتحان كامل (${studioQuizCount} سؤال)`}
                  </span>
                </Button>
              </div>
            )}

            {/* Instant In-Summary Multi-Unit Quiz */}
            {instantSummaryQuiz.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#19f08c]">
                    ⚡ كويز سريع فوري من وحدات الملخص ({instantSummaryQuiz.length} سؤال) — الإجابات الخاطئة تحفظ في بنك أخطائك:
                  </span>
                  {Object.keys(instantQuizAnswers).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInstantQuizAnswers({})}
                      className="text-[11px] font-bold text-sky-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="size-3" /> إعادة المحاولة
                    </button>
                  )}
                </div>

                <div className="grid gap-3 max-h-[55vh] overflow-y-auto pe-1">
                  {instantSummaryQuiz.map((mq, mqIdx) => {
                    const chosenIdx = instantQuizAnswers[mq.id];
                    const isAnswered = chosenIdx !== undefined;
                    return (
                      <div
                        key={mq.id}
                        className="rounded-xl border border-white/[0.08] bg-[#090c11] p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
                            {mq.topic}
                          </span>
                          <span className="text-[11px] font-mono text-[#9aa4b2]">
                            #{mqIdx + 1}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-[#f5f7fa]">
                          {mq.question}
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {mq.options.map((opt, oIdx) => {
                            const isCorrect = oIdx === mq.correct_index;
                            const isChosen = chosenIdx === oIdx;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => {
                                  setInstantQuizAnswers((prev) => ({
                                    ...prev,
                                    [mq.id]: oIdx,
                                  }));
                                  if (oIdx !== mq.correct_index) {
                                    recordMistake({
                                      question: mq.question,
                                      options: mq.options,
                                      correctIndex: mq.correct_index,
                                      chosenIndex: oIdx,
                                      explanation: mq.explanation,
                                      topic: mq.topic,
                                      courseId: course?.id || "",
                                      courseTitle: course?.title || "ملخص ذكي",
                                      via: "summary_instant_quiz",
                                    });
                                    toast.info("تم حفظ السؤال في بنك الأخطاء الذكي للمراجعة 🧠");
                                  }
                                }}
                                className={cn(
                                  "text-start px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                                  !isAnswered &&
                                    "border-white/[0.07] bg-white/[0.02] text-[#e5e7eb] hover:border-sky-400/40",
                                  isAnswered &&
                                    isCorrect &&
                                    "border-[#19f08c] bg-[#19f08c]/15 text-[#19f08c] font-bold",
                                  isAnswered &&
                                    isChosen &&
                                    !isCorrect &&
                                    "border-[#ef4444] bg-[#ef4444]/15 text-[#ef4444]",
                                  isAnswered &&
                                    !isCorrect &&
                                    !isChosen &&
                                    "border-white/[0.05] text-[#647084]"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && (
                          <p className="text-[11px] text-[#19f08c] pt-1">
                            💡 {mq.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🃏 Interactive Flashcards Deck Drawer */}
        {activeStudioDrawer === "flashcards" && (
          <div className="rounded-2xl border border-violet-400/35 bg-[#080612]/95 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-violet-300 flex items-center gap-2">
                  <Layers className="size-4" />
                  {isEn
                    ? "Interactive Summary Flashcards"
                    : "🃏 بطاقات التسميع السريع من الملخص"}
                </h4>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  {isEn
                    ? "Click the card to flip between the English concept and Arabic explanation"
                    : "اضغط على البطاقة لقلبها بين المصطلح/النقطة الإنجليزية والشرح العربي التفصيلي"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onGenerateFromSummary && (
                  <Button
                    size="sm"
                    disabled={Boolean(generatingType)}
                    onClick={() => onGenerateFromSummary("flashcards")}
                    className="bg-violet-400 hover:bg-violet-300 text-[#120624] font-extrabold rounded-xl text-xs gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                    <span>توليد بنك بطاقات إضافي بالـ AI</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveStudioDrawer(null)}
                  className="p-1 text-[#9aa4b2] hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {summaryFlashcards.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                اضغط على «توليد بنك بطاقات إضافي بالـ AI» بالأعلى لتوليد بطاقات المراجعة.
              </p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const safeIdx = Math.min(
                    activeFlashcardIdx,
                    summaryFlashcards.length - 1
                  );
                  const card = summaryFlashcards[safeIdx];
                  const sideText = isFlashcardFlipped ? card.back : card.front;
                  const sideDir = detectTextDir(sideText);
                  return (
                    <>
                      <div
                        onClick={() => setIsFlashcardFlipped((f) => !f)}
                        dir={sideDir}
                        className={cn(
                          "min-h-[160px] rounded-2xl border p-6 flex flex-col justify-between cursor-pointer select-none transition-all",
                          isFlashcardFlipped
                            ? "border-emerald-400/40 bg-emerald-500/[0.08]"
                            : "border-violet-400/40 bg-violet-500/[0.08]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                          <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-violet-200">
                            {card.topic}
                          </span>
                          <span className="font-mono text-violet-300">
                            {safeIdx + 1} / {summaryFlashcards.length} ·{" "}
                            {isFlashcardFlipped
                              ? "الشرح والإجابة (اضغط للقلب)"
                              : "المفهوم / السؤال (اضغط لإظهار الشرح)"}
                          </span>
                        </div>

                        <p
                          className={cn(
                            "text-base sm:text-lg font-bold text-[#f5f7fa] my-4 leading-relaxed",
                            sideDir === "ltr" ? "text-left" : "text-right"
                          )}
                        >
                          <FormattedInlineText text={sideText} />
                        </p>

                        <div className="text-[11px] text-[#9aa4b2] flex items-center justify-between">
                          <span>🔄 اضغط على الكارت لقلبه</span>
                          <span>
                            {isFlashcardFlipped ? "🇪🇬 الوجه الخلفي" : "🇬🇧 الوجه الأمامي"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={safeIdx === 0}
                          onClick={() => {
                            setActiveFlashcardIdx((i) => Math.max(0, i - 1));
                            setIsFlashcardFlipped(false);
                          }}
                          className="rounded-xl text-xs"
                        >
                          السابق
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsFlashcardFlipped((f) => !f)}
                          className="rounded-xl text-xs border-violet-400/40 text-violet-300"
                        >
                          قلب البطاقة 🔄
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={safeIdx >= summaryFlashcards.length - 1}
                          onClick={() => {
                            setActiveFlashcardIdx((i) =>
                              Math.min(summaryFlashcards.length - 1, i + 1)
                            );
                            setIsFlashcardFlipped(false);
                          }}
                          className="rounded-xl text-xs"
                        >
                          التالي
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Quick AI Refinement Strip */}
        <div className="pt-3 border-t border-white/[0.07] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#19f08c] shrink-0 me-1">
              <Sparkles className="size-3.5" />
              {isEn ? `Smart Refine (${AI_SUMMARY_EDIT_COST} cr):` : `تعديل ذكي (${AI_SUMMARY_EDIT_COST} كريدت):`}
            </span>
            {[
              isEn ? "Expand & explain deeply" : "كبّر واشرح كل نقطة بالتفصيل والأمثلة",
              isEn ? "Add comparison table" : "أضف جدول مقارنات شامل",
              isEn ? "Highlight exam questions" : "أبرز مواضع وتريكات أسئلة الامتحان",
              isEn ? "Simplify explanation" : "بسّط الشرح بالعربي",
              isEn ? "Summarize into quick bullets" : "لخّص في برشامة نقاط سريعة",
            ].map((qPrompt) => (
              <button
                key={qPrompt}
                type="button"
                disabled={aiUpdating}
                onClick={() => handleAiEdit(qPrompt)}
                className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[#f5f7fa] hover:border-[#19f08c]/40 hover:text-[#19f08c] transition-colors cursor-pointer disabled:opacity-50"
              >
                {qPrompt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
            <input
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAiEdit();
                }
              }}
              placeholder={
                isEn
                  ? `Custom AI edit (${AI_SUMMARY_EDIT_COST} credits)...`
                  : `أو اكتب أي تعديل للذكاء الاصطناعي (${AI_SUMMARY_EDIT_COST} كريدت)...`
              }
              className="h-8 flex-1 rounded-lg border border-white/[0.07] bg-[#05070a]/80 px-3 text-xs text-[#f5f7fa] placeholder:text-[#667080] focus:border-[#19f08c] focus:outline-none"
            />
            <Button
              size="sm"
              onClick={() => handleAiEdit()}
              disabled={!aiInstruction.trim() || aiUpdating}
              className="h-8 px-3 rounded-lg text-xs font-bold shrink-0 gap-1"
            >
              {aiUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="text-[10px]">({AI_SUMMARY_EDIT_COST} كريدت)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Editor Mode */}
      {editing ? (
        <div className="glass rounded-[1.25rem] border border-[#19f08c]/35 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#19f08c]">
              {isEn
                ? "Markdown & Highlight Editor"
                : "محرر المذكرة الذكية — ظلل أي جملة واضغط على اللون لتمييزها"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                ["yellow", "أصفر", "bg-amber-400/25 border-amber-500/40 text-amber-300"],
                ["green", "أخضر", "bg-emerald-400/25 border-emerald-500/40 text-emerald-300"],
                ["cyan", "سماوي", "bg-sky-400/25 border-sky-500/40 text-sky-300"],
                ["red", "هام جداً", "bg-rose-400/25 border-rose-500/40 text-rose-300"],
              ].map(([key, label, cls]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyHighlight(key)}
                  className={cn("text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer", cls)}
                >
                  تظليل {label}
                </button>
              ))}
              <button
                type="button"
                onClick={insertSectionBlock}
                className="text-xs font-bold px-2.5 py-1 rounded-lg border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> قسم جديد
              </button>
            </div>
          </div>

          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={18}
            dir="auto"
            className="font-mono text-sm leading-7 bg-[#05070a] border-white/[0.08] rounded-xl"
          />
        </div>
      ) : viewMode === "atlas_v5" ? (
        <AtlasSummaryReader
          document={documentV3}
          fallbackMarkdown={text}
          initialDeclassifyMode={true}
        />
      ) : viewMode === "print_template" ? (
        /* Printable / Exportable HTML Template Mode */
        <StudyGuideViewer
          document={documentV3}
          markdown={text}
          title={course?.title || "الملخص الذكي"}
        />
      ) : (
        /* Smart Study Notes Studio: Sidebar TOC + Color-Coded Cards & Tables */
        <div className="grid gap-5 lg:grid-cols-12 items-start">
          {/* Sticky Sidebar Table of Contents */}
          {!isWideLayout && (
          <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 space-y-3">
            <div className="glass rounded-[1.25rem] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {isEn ? "Smart Notes Index" : "فهرس المذكرة الذكية"}
                  </h3>
                </div>
                <span className="rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                  {smartSections.length} {isEn ? "units" : "وحدات"}
                </span>
              </div>

              {/* Search within summary */}
              <div className="relative">
                <Search className="size-3.5 text-muted-foreground absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isEn ? "Filter notes or terms..." : "ابحث داخل الملخص..."}
                  className="h-9 w-full rounded-xl border border-border bg-secondary/50 ps-8 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute left-2.5 rtl:left-2.5 ltr:right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Stats pills */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-center">
                  <p className="font-mono text-xs font-bold text-primary tabular">
                    {totalTables}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isEn ? "Tables" : "جداول مقارنة"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-center">
                  <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 tabular">
                    {totalAlerts}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isEn ? "Exam Alerts" : "تنبيهات امتحان"}
                  </p>
                </div>
              </div>

              {/* Section Navigation List */}
              <div className="max-h-[52vh] overflow-y-auto space-y-1 pt-1 pe-1">
                <button
                  type="button"
                  onClick={() => setActiveSectionId("all")}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-xs font-bold transition-colors cursor-pointer",
                    activeSectionId === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span>{isEn ? "Show All Units" : "عرض كل الوحدات"}</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({smartSections.length})
                  </span>
                </button>

                {smartSections.map((sec, idx) => {
                  const active = activeSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveSectionId(sec.id === activeSectionId ? "all" : sec.id);
                      }}
                      className={cn(
                        "w-full flex items-start gap-2.5 rounded-xl px-3 py-2 text-start text-xs transition-colors cursor-pointer",
                        active
                          ? "bg-primary/15 text-primary border border-primary/30 font-bold"
                          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground font-medium"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground border border-border"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <span className="line-clamp-2 leading-snug">{sec.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
          )}

          {/* Main Structured Smart Cards Stream */}
          <div
            className={cn(
              "space-y-5",
              isWideLayout ? "lg:col-span-12" : "lg:col-span-8 xl:col-span-9"
            )}
            style={{ fontSize: `${fontSize}px` }}
          >
            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-2">
                <ListFilter className="size-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm font-bold text-foreground">
                  {isEn ? "No matching notes found" : "لا توجد نتائج مطابقة لبحثك داخل الملخص"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveSectionId("all");
                  }}
                >
                  {isEn ? "Reset filter" : "إظهار كل الوحدات"}
                </Button>
              </div>
            ) : (
              filteredSections.map((section, sIdx) => (
                <article
                  key={section.id}
                  id={section.id}
                  className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-colors"
                >
                  {/* Section Banner Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-mono text-xs font-bold shadow-sm">
                        {String(section.index || sIdx + 1).padStart(2, "0")}
                      </span>
                      <h2
                        dir="auto"
                        className="font-display text-base sm:text-lg font-extrabold text-foreground leading-snug"
                      >
                        {section.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {Array.isArray(section.sourceRefs) && section.sourceRefs.length > 0 && (
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          p. {section.sourceRefs.slice(0, 3).join(", ")} ·
                        </span>
                      )}
                      {!isFullscreen && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleExpandSection(section)}
                            disabled={expandingSectionId === section.id}
                            className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-400 hover:bg-sky-500/20 transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                            title={
                              isEn
                                ? `Expand & explain this unit in detail with AI (${AI_SUMMARY_EDIT_COST} credits)`
                                : `كبّر واشرح هذه الجزئية بالتفصيل والأمثلة (${AI_SUMMARY_EDIT_COST} كريدت)`
                            }
                          >
                            {expandingSectionId === section.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Sparkles className="size-3" />
                            )}
                            {isEn
                              ? `Expand Unit (${AI_SUMMARY_EDIT_COST} cr)`
                              : `➕ كبّر واشرح الجزئية (${AI_SUMMARY_EDIT_COST} كريدت)`}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSectionDrillId(sectionDrillId === section.id ? null : section.id)
                            }
                            className={cn(
                              "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1",
                              sectionDrillId === section.id
                                ? "border-[#19f08c] bg-[#19f08c] text-[#03150c]"
                                : "border-[#19f08c]/35 bg-[#19f08c]/10 text-[#19f08c] hover:bg-[#19f08c]/20",
                            )}
                          >
                            <Target className="size-3" />
                            {sectionDrillId === section.id
                              ? isEn
                                ? "Hide Quick Quiz"
                                : "إخفاء أسئلة الجزئية"
                              : isEn
                              ? "Quiz This Unit"
                              : "اختبرني في هذه الجزئية"}
                          </button>

                          <button
                            type="button"
                            onClick={() => copySectionText(section)}
                            className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                            title={isEn ? "Copy unit text" : "نسخ نص هذه الوحدة"}
                          >
                            <Copy className="size-3" />
                            {isEn ? "Copy" : "نسخ"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendSectionToTelegram(section)}
                            disabled={sendingSectionId === section.id}
                            className="rounded-lg border border-white/[0.1] bg-[#05070a]/70 px-2.5 py-1 text-[11px] font-bold text-[#f5f7fa] hover:border-[#19f08c]/40 hover:text-[#19f08c] transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            {sendingSectionId === section.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Send className="size-3" />
                            )}
                            {isEn ? "Send to Bot" : "إرسال للبوت"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveAiSection(
                                activeAiSection === section.title ? "" : section.title
                              );
                              toast.info(
                                isEn
                                  ? `Selected "${section.title}" for AI refinement`
                                  : `تم تحديد قسم "${section.title}" للتعديل الذكي`
                              );
                            }}
                            className={cn(
                              "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer",
                              activeAiSection === section.title
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {activeAiSection === section.title
                              ? isEn
                                ? "✓ Selected for AI"
                                : "✓ محدد للتعديل الذكي"
                              : isEn
                              ? "Refine unit"
                              : "تعديل الوحدة"}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedSections((prev) => ({
                            ...prev,
                            [section.id]: !prev[section.id],
                          }))
                        }
                        className="rounded-lg border border-border bg-card p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={
                          collapsedSections[section.id]
                            ? isEn
                              ? "Expand unit"
                              : "فتح الوحدة"
                            : isEn
                            ? "Collapse unit"
                            : "طي الوحدة"
                        }
                      >
                        {collapsedSections[section.id] ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronUp className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Instant 1-Click Section Micro-Quiz Drawer */}
                  {!isFullscreen && sectionDrillId === section.id && (
                    <div className="border-b border-[#19f08c]/25 bg-[#05070a]/90 p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#19f08c] flex items-center gap-1.5">
                          <Target className="size-3.5" />
                          {isEn
                            ? `Instant Unit Drill: ${section.title}`
                            : `اختبار فوري على جزئية: ${section.title}`}
                        </span>
                        <span className="text-[11px] text-[#9aa4b2]">
                          الإجابات الخاطئة تُحفظ تلقائياً في بنك الأخطاء الذكي
                        </span>
                      </div>

                      <div className="grid gap-3">
                        {buildMicroQuizForSection(section, smartSections).map((mq, mqIdx) => {
                          const chosenIdx = sectionDrillAnswers[mq.id];
                          const isAnswered = chosenIdx !== undefined;
                          return (
                            <div
                              key={mq.id}
                              className="rounded-xl border border-white/[0.08] bg-[#090c11] p-4 space-y-2.5"
                            >
                              <p className="text-xs sm:text-sm font-bold text-[#f5f7fa]">
                                {mqIdx + 1}. {mq.question}
                              </p>
                              <div className="grid gap-1.5 sm:grid-cols-2">
                                {mq.options.map((opt, oIdx) => {
                                  const isCorrect = oIdx === mq.correct_index;
                                  const isChosen = chosenIdx === oIdx;
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      disabled={isAnswered}
                                      onClick={() => {
                                        setSectionDrillAnswers((prev) => ({
                                          ...prev,
                                          [mq.id]: oIdx,
                                        }));
                                        if (oIdx !== mq.correct_index) {
                                          recordMistake({
                                            question: mq.question,
                                            options: mq.options,
                                            correctIndex: mq.correct_index,
                                            chosenIndex: oIdx,
                                            explanation: mq.explanation,
                                            topic: section.title,
                                            courseId: course?.id || "",
                                            courseTitle: course?.title || "ملخص ذكي",
                                            via: "summary_drill",
                                          });
                                          toast.info("تمت إضافة السؤال إلى بنك الأخطاء الذكي للمراجعة 🧠");
                                        }
                                      }}
                                      className={cn(
                                        "text-start px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                                        !isAnswered &&
                                          "border-white/[0.07] bg-white/[0.02] text-[#e5e7eb] hover:border-[#19f08c]/40",
                                        isAnswered &&
                                          isCorrect &&
                                          "border-[#19f08c] bg-[#19f08c]/15 text-[#19f08c] font-bold",
                                        isAnswered &&
                                          isChosen &&
                                          !isCorrect &&
                                          "border-[#ef4444] bg-[#ef4444]/15 text-[#ef4444]",
                                        isAnswered &&
                                          !isCorrect &&
                                          !isChosen &&
                                          "border-white/[0.05] text-[#647084]",
                                      )}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                              {isAnswered && (
                                <p className="text-[11px] text-[#19f08c] pt-1">
                                  💡 {mq.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section Content Blocks */}
                  {!collapsedSections[section.id] && (
                  <div className="p-5 sm:p-6 space-y-4">
                    {section.items.map((item) => {
                      if (item.kind === "subheading") {
                        return (
                          <div
                            key={item.id}
                            dir="auto"
                            className="pt-2 flex items-center gap-2 text-primary font-display font-bold text-[1.05em]"
                          >
                            <Hash className="size-4 shrink-0" />
                            <h3>
                              <FormattedInlineText text={item.text} />
                            </h3>
                          </div>
                        );
                      }

                      if (item.kind === "callout") {
                        const isWarn = item.tone === "warning";
                        return (
                          <div
                            key={item.id}
                            dir="auto"
                            className={cn(
                              "rounded-xl border-s-4 p-4 flex items-start gap-3",
                              isWarn
                                ? "border-s-amber-500 border border-amber-500/30 bg-amber-500/[0.07]"
                                : "border-s-emerald-500 border border-emerald-500/30 bg-emerald-500/[0.07]"
                            )}
                          >
                            {isWarn ? (
                              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <Lightbulb className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-1 flex-1">
                              <span
                                className={cn(
                                  "block text-xs font-bold",
                                  isWarn
                                    ? "text-amber-700 dark:text-amber-300"
                                    : "text-emerald-700 dark:text-emerald-300"
                                )}
                              >
                                {isWarn
                                  ? isEn
                                    ? "Exam Alert & Important Note"
                                    : "تنبيه امتحانات وملاحظة هامة"
                                  : isEn
                                  ? "Key Study Insight"
                                  : "معلومة ذهبية للفهم"}
                              </span>
                              <p className="text-foreground leading-relaxed font-medium">
                                <FormattedInlineText text={item.text} />
                              </p>
                            </div>
                          </div>
                        );
                      }

                      if (item.kind === "table") {
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-border overflow-hidden shadow-xs my-3"
                          >
                            <div className="bg-secondary/60 px-4 py-2 border-b border-border flex items-center gap-2 text-xs font-bold text-primary">
                              <Table2 className="size-4" />
                              <span>
                                {isEn ? "Structured Comparison Table" : "جدول مقارنة وتلخيص منظم"}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-start text-[0.92em]">
                                {item.headers?.length > 0 && (
                                  <thead>
                                    <tr className="bg-secondary/40 border-b border-border">
                                      {item.headers.map((h, hIdx) => (
                                        <th
                                          key={hIdx}
                                          dir="auto"
                                          className="px-4 py-2.5 text-start font-bold text-foreground border-e border-border last:border-e-0"
                                        >
                                          <FormattedInlineText text={h} />
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                )}
                                <tbody className="divide-y divide-border">
                                  {item.rows?.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className="even:bg-secondary/20 hover:bg-primary/[0.04] transition-colors"
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          dir="auto"
                                          className={cn(
                                            "px-4 py-2.5 align-top leading-relaxed border-e border-border last:border-e-0",
                                            cIdx === 0
                                              ? "font-bold text-primary"
                                              : "text-foreground"
                                          )}
                                        >
                                          <FormattedInlineText text={cell} />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      if (item.kind === "concepts") {
                        return (
                          <div key={item.id} className="grid gap-3 sm:grid-cols-2">
                            {item.pairs.map((pair, pIdx) => {
                              const [head, ...rest] = pair.split(/\s*(?:→|->|:)\s*/);
                              const body = rest.join(" : ");
                              return (
                                <div
                                  key={pIdx}
                                  dir="auto"
                                  className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3.5 space-y-1"
                                >
                                  <p className="font-bold text-primary text-[0.95em]">
                                    <FormattedInlineText text={head} />
                                  </p>
                                  {body && (
                                    <p className="text-foreground/90 text-[0.9em] leading-relaxed">
                                      <FormattedInlineText text={body} />
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      if (item.kind === "bilingual_pairs") {
                        return (
                          <div key={item.id} className="space-y-3">
                            {item.pairs.map((pair, pIdx) => (
                              <div
                                key={pIdx}
                                className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs"
                              >
                                {pair.en && (
                                  <div
                                    dir="ltr"
                                    className="px-4 py-3.5 bg-sky-500/[0.06] border-b border-border/70 flex items-start gap-3 text-left"
                                  >
                                    <span className="mt-0.5 shrink-0 rounded-md bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-400">
                                      {String(pIdx + 1).padStart(2, "0")} · EN
                                    </span>
                                    <p className="flex-1 leading-relaxed text-foreground">
                                      <FormattedInlineText text={pair.en} />
                                    </p>
                                  </div>
                                )}
                                {pair.ar && (
                                  <div
                                    dir="rtl"
                                    className="px-4 py-3.5 bg-emerald-500/[0.04] flex items-start gap-3 text-right"
                                  >
                                    <span className="mt-0.5 shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                      الشرح بالعربي
                                    </span>
                                    <p className="flex-1 leading-relaxed text-foreground">
                                      <FormattedInlineText text={pair.ar} />
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      if (item.kind === "list") {
                        const listDir =
                          item.role === "english_points"
                            ? "ltr"
                            : item.role === "arabic_explanation"
                            ? "rtl"
                            : detectTextDir((item.points || []).join(" "));
                        return (
                          <div
                            key={item.id}
                            dir={listDir}
                            className={cn(
                              "rounded-xl border border-border bg-secondary/25 p-4 space-y-2",
                              listDir === "ltr" ? "text-left" : "text-right"
                            )}
                          >
                            {item.role === "english_points" && (
                              <span className="inline-block mb-1 rounded-md bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-400">
                                📋 Key English Concepts
                              </span>
                            )}
                            {item.role === "arabic_explanation" && (
                              <span className="inline-block mb-1 rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                                🇪🇬 الشرح والتفصيل بالعربي
                              </span>
                            )}
                            <ul className="space-y-2.5">
                              {item.points.map((pt, pIdx) => {
                                const ptDir = detectTextDir(pt, item.role);
                                return (
                                  <li
                                    key={pIdx}
                                    dir={ptDir}
                                    className={cn(
                                      "flex items-start gap-2.5 leading-relaxed text-foreground",
                                      ptDir === "ltr" ? "text-left" : "text-right"
                                    )}
                                  >
                                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-1.5" />
                                    <span className="flex-1">
                                      <FormattedInlineText text={pt} />
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      }

                      // Default: Color-coded Smart Concept Card (English / Arabic / General)
                      const cardDir = detectTextDir(
                        item.text,
                        item.role === "english"
                          ? "english_points"
                          : item.role === "arabic"
                          ? "arabic_explanation"
                          : ""
                      );
                      const isArabicExplanation = item.role === "arabic" || cardDir === "rtl";
                      const isEnglishPoint = item.role === "english" || cardDir === "ltr";

                      return (
                        <div
                          key={item.id}
                          dir={cardDir}
                          className={cn(
                            "rounded-xl border p-4 leading-relaxed transition-colors",
                            cardDir === "ltr" ? "text-left" : "text-right",
                            isEnglishPoint
                              ? "border-sky-500/25 bg-sky-500/[0.05]"
                              : isArabicExplanation
                              ? "border-violet-500/25 bg-violet-500/[0.05]"
                              : "border-border bg-secondary/20"
                          )}
                        >
                          {isArabicExplanation && !isEnglishPoint && (
                            <span className="inline-block mb-1.5 rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                              الشرح المبسط بالعربي
                            </span>
                          )}
                          {isEnglishPoint && (
                            <span className="inline-block mb-1.5 rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                              Key Medical / Academic Point
                            </span>
                          )}
                          <p className="text-foreground leading-8">
                            <FormattedInlineText text={item.text} />
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
