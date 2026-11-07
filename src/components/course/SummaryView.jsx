import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Printer,
  Trash2,
  ZoomIn,
  ZoomOut,
  Layers,
  Hash,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";
import { resolveDesignIdFromTemplate } from "@/lib/summaryDesigns";
import InfographicSummary from "@/components/course/InfographicSummary";
import {
  getLegacySummaryMarkdown,
  getSummaryDocumentV3,
  summaryDocumentToMarkdown,
  summaryPlainText,
} from "@/lib/summaryDocument";
import StudyGuideViewer from "@/components/course/StudyGuideViewer";
import { detectTextDir, renderStudyGuideHtml, STUDY_GUIDE_TEMPLATES } from "@/lib/summaryStudyGuide";
import { downloadHtmlFile, printHtmlFile, readStoredTemplate } from "@/lib/summary/exportGuide";
import { downloadSummaryPptx } from "@/lib/summaryExport";
import {
  buildPostMortemFromCourseSummary,
  downloadPostMortemStudyHtml,
  printPostMortemStudyHtml,
} from "@/features/lectures/export/postMortemStudyHtml";

/** Valid template ids, so a stale/unknown stored id cannot render a blank guide. */
const STUDY_GUIDE_TEMPLATE_IDS = STUDY_GUIDE_TEMPLATES.map((template) => template.id);
import AtlasSummaryReader from "@/components/atlas/AtlasSummaryReader";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { recordMistake } from "@/lib/mistakeVault";
import MermaidDiagram from "@/components/course/MermaidDiagram";
import { AI_SUMMARY_EDIT_COST } from "@/lib/creditCosts";
import { useAuth } from "@/lib/AuthContext";
import { useOptimisticCharge } from "@/lib/useOptimisticCharge";
import { deleteSummaryDocument } from "@/lib/summaryJobs";
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
  Flame,
  Siren,
  Scale,
  EyeOff,
  GraduationCap,
  BookOpenCheck,
  SlidersHorizontal,
  Image as ImageIcon,
} from "lucide-react";
import {
  SUMMARY_DEPTHS,
  filterSectionsByDepth,
  mergeEnrichments,
  loadEnrichmentCache,
  simpleTextHash,
  wrapBlurTargets,
  wrapGlossaryTerms,
  applyOutsideTags,
  lookupGlossaryDefinition,
  buildCramSheetPlain,
  sectionToPlainText,
} from "@/lib/summaryEnhance";

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

/** Blur-mode / hover-glossary flags shared with every FormattedInlineText. */
const SummaryEnhanceCtx = React.createContext({ blur: false, glossary: true });

/**
 * Renders inline highlights (`==color:text==`, `**bold**`, `` `code` ``) AND
 * automatic academic lead-term bolding, parenthetical medical term bolding,
 * and dosage/threshold/exam keyword highlights in both Light and Dark mode.
 * Enhancement layer: blur (active recall) + hover glossary wrap as final pass.
 */
function FormattedInlineText({ text = "" }) {
  const { blur, glossary } = React.useContext(SummaryEnhanceCtx);
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

    // Medical ALL-CAPS lexical terms (EDV, ESV, ATP, DNA, GFR…) auto-bold.
    // No lookbehind (Safari-ready); runs only outside existing strong/mark tags.
    out = applyOutsideTags(out, (html) =>
      html.replace(
        /(^|[^A-Za-z0-9&])([A-Z][A-Z0-9]{2,6})(?![A-Za-z0-9])/g,
        (_m, pre, term) => `${pre}<strong class="font-extrabold text-foreground">${term}</strong>`
      )
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

    // Enhancement layer — applied last, only to text outside tags: active
    // recall blur tokens and/or hover glossary med-terms.
    if (blur) out = applyOutsideTags(out, wrapBlurTargets);
    if (glossary) out = applyOutsideTags(out, wrapGlossaryTerms);

    return out;
  }, [text, blur, glossary]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SummaryView({
  summary,
  course,
  onGenerateFromSummary,
  onSwitchTab,
  generatingType,
  showSummaryRegen,
  onToggleSummaryRegen,
  onExportTelegram,
  exportingTelegram,
}) {
  const { isEn } = useLocale();
  const { refreshProfile } = useAuth();
  const { applyOptimisticCharge, applyOptimisticRefund } = useOptimisticCharge();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiUpdating, setAiUpdating] = useState(false);
  const [activeAiSection, setActiveAiSection] = useState("");
  const [fontSize, setFontSize] = useState(17);
  // Deep-link from a wrong quiz answer: /course/:id?q=term → focus that topic instantly.
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q") || "";
      return q.slice(0, 120);
    } catch {
      return "";
    }
  });
  const [activeSectionId, setActiveSectionId] = useState("all");
  const [viewMode, setViewMode] = useState("smart_cards"); // "smart_cards" | "infographic" | "atlas_v5" | "print_template"
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [activeStudioDrawer, setActiveStudioDrawer] = useState(null); // "quiz" | "flashcards" | null
  const [studioQuizCount, setStudioQuizCount] = useState(15);
  const [studioQuizProfile, setStudioQuizProfile] = useState("exam");
  const [instantQuizAnswers, setInstantQuizAnswers] = useState({});
  const [activeFlashcardIdx, setActiveFlashcardIdx] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  // ── ⭐ Summary Enhancement Suite (depth / blur / glossary / cram) ──
  const [depthLevel, setDepthLevel] = useState("full");
  const [blurMode, setBlurMode] = useState(false);
  const [glossaryMode, setGlossaryMode] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [enrichments, setEnrichments] = useState({});
  const [glossTip, setGlossTip] = useState(null);

  // 🗑️ Owner control: full data delete — document + revisions + mirror + cancels
  // any in-flight generation job. Parent refetches contents so the empty state returns.
  const [deletingSummary, setDeletingSummary] = useState(false);
  const handleDeleteSummary = async () => {
    if (!course?.id || deletingSummary) return;
    const confirmed = window.confirm(
      isEn
        ? "Delete this summary permanently? The document and all its revision history will be removed. You can generate a fresh one any time."
        : "حذف التلخيص نهائيًا؟ المستند وكل مراجعاته هيشيلوا من حسابك تمامًا — تقدر تطلّبه من أول وجديد بعدين."
    );
    if (!confirmed) return;
    setDeletingSummary(true);
    try {
      const result = await deleteSummaryDocument(course.id);
      if (result?.ok === false) throw new Error(result.error || "DELETE_FAILED");
      await queryClient.invalidateQueries({ queryKey: ["contents", course.id] });
      toast.success(isEn
        ? "Summary deleted — document & history wiped"
        : "🗑️ اتمسح بسلام — المستند وتاريخه راحوا");
    } catch (error) {
      toast.error(error?.message || (isEn ? "Could not delete the summary" : "تعذر حذف التلخيص — جرّب تاني"));
    } finally {
      setDeletingSummary(false);
    }
  };
  const [cramOpen, setCramOpen] = useState(false);
  const [figLightbox, setFigLightbox] = useState(null); // open lecture figure {url, page}
  const [showSourceFigures, setShowSourceFigures] = useState(() => {
    try {
      return localStorage.getItem("bf_include_source_images") !== "false";
    } catch {
      return true;
    }
  });
  const toggleSourceFigures = () => {
    setShowSourceFigures((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bf_include_source_images", next ? "true" : "false");
      } catch {
        // ignore storage errors
      }
      toast.info(
        next
          ? "🖼️ تم تفعيل عرض ودمج صور الملف الأصلي في التلخيص"
          : "⭕ تم إخفاء صور الملف الأصلي من التلخيص"
      );
      return next;
    });
  };
  const contentRef = useRef(null);
  const [expandingSectionId, setExpandingSectionId] = useState(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen]);

  const utterRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  const documentV3 = useMemo(() => getSummaryDocumentV3(summary), [summary]);

  // Visual skin picked at upload time (owner system). Drives accent swap for
  // chapter chips, hairlines, list markers, tables — royal is the default.
  const docSkin = resolveDesignIdFromTemplate(
    documentV3?.templateId
    || documentV3?.meta?.templateId
    || summary?.summary_design
    || course?.summary_design
  );
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

  // ── Enhancement suite derived data ──
  const textHash = useMemo(() => simpleTextHash(text), [text]);
  useEffect(() => {
    setEnrichments(loadEnrichmentCache(course?.id, textHash));
  }, [course?.id, textHash]);

  const enhancedSections = useMemo(
    () => mergeEnrichments(smartSections, enrichments),
    [smartSections, enrichments]
  );

  // Delegated handlers for blur tokens and glossary tooltips.
  const handleContentClick = (e) => {
    const tok = e.target.closest?.(".bf-blur-token");
    if (tok) {
      tok.classList.add("bf-revealed");
      e.preventDefault();
    }
  };
  const handleContentMouseOver = (e) => {
    const termEl = e.target.closest?.(".bf-glossary-term");
    if (!termEl) return;
    const term = termEl.getAttribute("data-bf-term");
    const def = lookupGlossaryDefinition(term);
    if (!def) return;
    const rect = termEl.getBoundingClientRect();
    setGlossTip({
      x: Math.max(8, Math.min(rect.left, window.innerWidth - 316)),
      y: rect.bottom + 8,
      term,
      def,
    });
  };
  const handleContentMouseOut = (e) => {
    if (e.target.closest?.(".bf-glossary-term")) setGlossTip(null);
  };

  // 📸 Lecture figures lifted from the source PDF — pinned to the sections that
  // discuss them (via sourceRefs pages), or distributed inline across sections.
  const rawSummaryFigures = useMemo(() => {
    const list = Array.isArray(summary?.figures) ? summary.figures : [];
    return list.filter((f) => f?.url && Number(f.page) > 0);
  }, [summary?.figures]);

  const summaryFigures = useMemo(
    () => (showSourceFigures ? rawSummaryFigures : []),
    [rawSummaryFigures, showSourceFigures]
  );

  const figuredSections = useMemo(() => {
    // First deduplicate repetitive 2-column term/meaning tables if the section already has rich bullets/pairs or paragraphs
    const cleanedSections = enhancedSections.map((sec) => {
      const hasContentItems = (sec.items || []).some(
        (it) => it.kind === "bilingual_pairs" || it.kind === "list" || it.kind === "paragraph"
      );
      if (!hasContentItems) return sec;
      const filteredItems = (sec.items || []).filter((it) => {
        if (it.kind !== "table" && it.kind !== "compare") return true;
        const hdrs = Array.isArray(it.headers) ? it.headers.map((h) => String(h || "").trim()) : [];
        const isGenericTwoCol =
          hdrs.length <= 2 &&
          hdrs.some((h) => /المصطلح|المفهوم|الكلمة|Term|Concept|Word/i.test(h)) &&
          hdrs.some((h) => /المعنى|التوضيح|الشرح|البيان|Meaning|Explanation|Description/i.test(h));
        return !isGenericTwoCol;
      });
      return { ...sec, items: filteredItems.length ? filteredItems : sec.items };
    });

    if (!summaryFigures.length) return cleanedSections;
    const usedPages = new Set();
    const out = cleanedSections.map((sec) => {
      const refs = Array.isArray(sec.sourceRefs) ? sec.sourceRefs.map(Number) : [];
      const hits = summaryFigures.filter((f) => refs.includes(Number(f.page)) && !usedPages.has(Number(f.page)));
      if (!hits.length) return { ...sec, items: [...(sec.items || [])] };
      hits.forEach((h) => usedPages.add(Number(h.page)));
      return {
        ...sec,
        items: [
          ...(sec.items || []),
          ...hits.map((f, i) => ({
            kind: "figure",
            id: `fig-${sec.id}-${i}`,
            text: f.caption || "",
            figure: { url: f.url, page: f.page, width: f.width, height: f.height },
          })),
        ],
      };
    });
    const orphans = summaryFigures.filter((f) => !usedPages.has(Number(f.page)));
    if (orphans.length) {
      if (out.length > 0) {
        orphans.forEach((f, idx) => {
          const targetIdx = Math.min(out.length - 1, Math.floor((idx * out.length) / orphans.length));
          out[targetIdx] = {
            ...out[targetIdx],
            items: [
              ...(out[targetIdx].items || []),
              {
                kind: "figure",
                id: `fig-inline-${idx}`,
                text: f.caption || "",
                figure: { url: f.url, page: f.page, width: f.width, height: f.height },
              },
            ],
          };
        });
      } else {
        out.push({
          id: "bf-figures-gallery",
          title: isEn ? "📸 Lecture Figures" : "📸 أشكال وصور المحاضرة",
          sourceRefs: orphans.map((f) => f.page),
          items: orphans.map((f, i) => ({
            kind: "figure",
            id: `fig-gal-${i}`,
            text: f.caption || "",
            figure: { url: f.url, page: f.page, width: f.width, height: f.height },
          })),
        });
      }
    }
    return out;
  }, [enhancedSections, summaryFigures, isEn]);

  const filteredSections = useMemo(() => {
    // The reading surface is one continuous document — the TOC rail scrolls
    // to a section instead of hiding the others; only search narrows content.
    const list = figuredSections;
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
  }, [figuredSections, searchTerm]);

  // Depth toggle applies AFTER filtering so search still hits hidden layers.
  const displaySections = useMemo(
    () => filterSectionsByDepth(filteredSections, depthLevel),
    [filteredSections, depthLevel]
  );

  const cramPlainText = useMemo(
    () => buildCramSheetPlain(filterSectionsByDepth(enhancedSections, "exam"), course?.title || ""),
    [enhancedSections, course?.title]
  );

  useEffect(() => {
    setDraft(text);
  }, [text]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // 📑 Unified document navigation: TOC rail scrolls to the chapter and a
  // scroll-spy keeps the active entry highlighted — nothing is ever hidden.
  const scrollToSection = (id) => {
    setActiveSectionId(id);
    if (id === "all") {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const root = contentRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll("article[id]"));
    if (targets.length < 2) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit?.target?.id) setActiveSectionId(hit.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [displaySections]);

  // 🖨 Print routing: while the cram overlay is open it owns window.print();
  // otherwise the unified document (.bf-print-scope) is the print target.
  useEffect(() => {
    document.body.classList.toggle("bf-print-cram", cramOpen);
    return () => document.body.classList.remove("bf-print-cram");
  }, [cramOpen]);

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

  // 🎧 Per-unit audio review — the "walking revision podcast", one unit at a time.
  const [speakingSectionId, setSpeakingSectionId] = useState(null);
  const speakSection = (section) => {
    if (!("speechSynthesis" in window)) return;
    if (speakingSectionId === section.id) {
      window.speechSynthesis.cancel();
      setSpeakingSectionId(null);
      return;
    }
    const body = `${section.title}. ${sectionToPlainText(section)}`.replace(/[#*>_`~\-]/g, " ");
    if (!body.trim()) return;
    const u = new SpeechSynthesisUtterance(body);
    u.lang = /[\u0600-\u06FF]/.test(body) ? "ar-SA" : "en-US";
    u.rate = 0.95;
    u.onend = () => setSpeakingSectionId(null);
    u.onerror = () => setSpeakingSectionId(null);
    window.speechSynthesis.cancel();
    setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeakingSectionId(section.id);
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
      // Optimistic: the balance chip drops the same second, then the server
      // response reconciles it to the authoritative value.
      const chargeRes = await applyOptimisticCharge(
        () => base44.functions.invoke("chargeAiJob", {
          action: "charge",
          jobKey,
          task: "summary_edit",
          cost: AI_SUMMARY_EDIT_COST,
          charCount: baseText.length,
          courseId: course?.id || "",
        }),
        { cost: AI_SUMMARY_EDIT_COST }
      );
      if (!chargeRes?.data?.ok && !chargeRes?.data?.success) {
        const errMsg =
          chargeRes?.data?.error === "INSUFFICIENT_CREDITS"
            ? `رصيد الكريدتس غير كافٍ لتعديل الملخص بالذكاء الاصطناعي (مطلوب ${AI_SUMMARY_EDIT_COST} كريدت)`
            : chargeRes?.data?.message ||
              chargeRes?.data?.error ||
              "تعذر خصم الكريدتس لتعديل الملخص";
        throw new Error(errMsg);
      }
      chargedCost = Number(chargeRes?.data?.charged ?? chargeRes?.data?.cost ?? AI_SUMMARY_EDIT_COST);

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
          ? "Summary updated by AI ✨"
          : "تم تحديث الملخص بالذكاء الاصطناعي ✨"
      );
    } catch (err) {
      if (chargedCost > 0) {
        await applyOptimisticRefund(
          () =>
            base44.functions.invoke("chargeAiJob", {
              action: "refund",
              jobKey,
              task: "summary_edit",
              cost: chargedCost,
            }),
          { cost: chargedCost }
        ).catch(() => {});
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
    const exportHtml = renderStudyGuideHtml({
      document: documentV3 || undefined,
      markdown: text,
      title: course?.title || "الملخص الذكي",
      templateId: readStoredTemplate(STUDY_GUIDE_TEMPLATE_IDS),
      forExport: true,
      figures: summaryFigures,
    });
    if (downloadHtmlFile(exportHtml, course?.title || "الملخص الذكي", "study-guide")) {
      toast.success("تم تحميل ملف المذكرة (HTML) بتصميم البطاقات والألوان جاهز للفتح والطباعة 📄✨");
    } else {
      toast.error("تعذر تحميل ملف الملخص");
    }
  };
  const printGuideDirect = () => {
    const exportHtml = renderStudyGuideHtml({
      document: documentV3 || undefined,
      markdown: text,
      title: course?.title || "الملخص الذكي",
      templateId: readStoredTemplate(STUDY_GUIDE_TEMPLATE_IDS),
      forExport: true,
      figures: summaryFigures,
    });
    if (!printHtmlFile(exportHtml)) {
      toast.error("تعذر فتح نافذة الطباعة");
    }
  };
  const downloadPptxDirect = async () => {
    try {
      toast.info(isEn ? "Preparing PowerPoint deck..." : "جاري تجهيز عرض البوربوينت (.pptx)... 📊");
      await downloadSummaryPptx({
        document: documentV3 || undefined,
        markdown: text,
        title: course?.title || "الملخص الذكي",
      });
      toast.success(isEn ? "PowerPoint downloaded!" : "تم تحميل عرض البوربوينت (.pptx) بنجاح! 📊✨");
    } catch {
      toast.error(isEn ? "Failed to export PowerPoint" : "تعذر تصدير ملف البوربوينت");
    }
  };

  const downloadPostMortemDirect = () => {
    const pmModel = buildPostMortemFromCourseSummary({
      title: course?.title || "الملخص الذكي",
      markdown: text,
      figures: summaryFigures,
      includeFigures: showSourceFigures,
    });
    downloadPostMortemStudyHtml(pmModel, {
      title: course?.title || "study-sheet",
      figures: summaryFigures,
      includeFigures: showSourceFigures,
    });
    toast.success("تم تحميل مذكرة Post-Mortem الاحترافية (جداول + إنجليزي/عربي + رسومات SVG) بنجاح! 📄✨");
  };

  const printPostMortemDirect = () => {
    const pmModel = buildPostMortemFromCourseSummary({
      title: course?.title || "الملخص الذكي",
      markdown: text,
      figures: summaryFigures,
      includeFigures: showSourceFigures,
    });
    printPostMortemStudyHtml(pmModel, {
      title: course?.title || "study-sheet",
      figures: summaryFigures,
      includeFigures: showSourceFigures,
    });
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

  const mainContent = (
    <div className={cn("space-y-4", isFullscreen ? "min-h-screen text-[#f5f7fa] pb-16" : "")}>
      {/* Fullscreen Summary-Only Distraction-Free Header Bar */}
      {isFullscreen ? (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.12] bg-[#0c1017] px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#19f08c]/15 text-[#19f08c] border border-[#19f08c]/30">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-sm font-extrabold text-[#f5f7fa] truncate block">
                {course?.title || (isEn ? "Focused Summary Reader" : "وضع عرض الملخص المكبّر فقط")}
              </span>
              <span className="inline-block rounded-md border border-[#19f08c]/30 bg-[#19f08c]/10 px-2 py-0.5 text-[10px] font-bold text-[#19f08c]">
                {isEn ? "Distraction-Free Mode" : "وضع القراءة الخالي من التشتيت"}
              </span>
            </div>
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
                  "gap-1.5 rounded-xl text-xs h-8 border-white/10 hover:border-white/20 transition-colors",
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
              onClick={downloadHtmlDirect}
              className="gap-1.5 rounded-xl text-xs h-8 border-white/10 hover:border-white/20 text-[#f5f7fa] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{isEn ? "Download HTML" : "تحميل HTML"}</span>
            </Button>

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
      /* Compact Single Top Reader Bar */
      <div className="glass rounded-2xl px-3.5 py-2.5 space-y-3 border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* View Mode Toggle: Structured Text first */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => setViewMode("smart_cards")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                viewMode === "smart_cards"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="size-3.5" />
              <span>{isEn ? "Structured Text" : "النص المنسّق"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("infographic")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                viewMode === "infographic"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="size-3.5" />
              <span>{isEn ? "Visual Summary" : "التلخيص البصري"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("atlas_v5")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                viewMode === "atlas_v5"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-3.5" />
              <span>{isEn ? "Review Mode" : "المراجعة"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("print_template")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                viewMode === "print_template"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Printer className="size-3.5" />
              <span>{isEn ? "Print & Download" : "الطباعة والتحميل"}</span>
            </button>
          </div>

          {/* Essential Reader Controls + Side Drawer Trigger */}
          <div className="flex flex-wrap items-center gap-1.5">
            {viewMode === "smart_cards" && !editing && (
              <>
                <div className="inline-flex items-center rounded-xl border border-border bg-secondary/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.max(13, f - 1))}
                    title={isEn ? "Smaller text" : "تصغير الخط"}
                    className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] font-bold text-foreground tabular">
                    {fontSize}px
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.min(26, f + 1))}
                    title={isEn ? "Larger text" : "تكبير الخط"}
                    className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsWideLayout((w) => !w)}
                  title={isEn ? "Toggle Wide Reader" : "توسيع عرض القراءة (إخفاء/إظهار الفهرس الجانبي)"}
                  className="gap-1.5 rounded-xl text-xs h-8"
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
              className="gap-1.5 rounded-xl text-xs h-8 font-bold"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>{isEn ? "Exit" : "تصغير"}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isEn ? "Fullscreen" : "ملء الشاشة"}</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={toggleSourceFigures}
              className={cn(
                "gap-1.5 rounded-xl text-xs h-8 font-bold transition-colors",
                showSourceFigures
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "text-muted-foreground"
              )}
              title="تشغيل أو إيقاف دمج صور وأشكال الملف الأصلي داخل التلخيص"
            >
              <span>🖼️</span>
              <span className="hidden sm:inline">
                {showSourceFigures
                  ? `صور الملف: مفعّلة${rawSummaryFigures.length ? ` (${rawSummaryFigures.length})` : ""}`
                  : "صور الملف: مخفية"}
              </span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={downloadPostMortemDirect}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors"
              title="تحميل مذكرة المذاكرة المنظمة بنمط Post-Mortem (HTML)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{isEn ? "Post-Mortem HTML" : "مذكرة منظمة HTML"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={printPostMortemDirect}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold border-amber-400/30 hover:bg-amber-400/15 transition-colors"
              title="طباعة أو حفظ مذكرة Post-Mortem كملف PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{isEn ? "Post-Mortem PDF" : "PDF منظم"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={printGuideDirect}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold"
              title={isEn ? "Print or Save as PDF" : "طباعة أو حفظ PDF"}
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{isEn ? "PDF / Print" : "طباعة PDF"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={downloadHtmlDirect}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold"
              title={isEn ? "Download Interactive HTML Study Book" : "تحميل مذكرة HTML تفاعلية"}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{isEn ? "HTML Book" : "تحميل كتاب HTML"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={downloadPptxDirect}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold"
              title={isEn ? "Download PowerPoint (.pptx)" : "تحميل عرض PowerPoint (.pptx)"}
            >
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">{isEn ? "PowerPoint" : "PowerPoint"}</span>
            </Button>

            {editing && (
              <>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="gap-1.5 rounded-xl text-xs h-8 font-bold"
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
                  className="gap-1 rounded-xl text-xs h-8"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{isEn ? "Cancel" : "إلغاء"}</span>
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="default"
              onClick={() => setToolsDrawerOpen(true)}
              className="gap-1.5 rounded-xl text-xs h-8 font-bold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isEn ? "Summary Tools & Settings" : "أدوات وإعدادات الملخص"}</span>
            </Button>
          </div>
        </div>

        {/* 🎯 Interactive Quiz Studio Drawer (Generate Full AI Quiz OR Solve Instant Summary Quiz) */}
        {activeStudioDrawer === "quiz" && (
          <div className="rounded-2xl border border-sky-400/35 bg-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-primary flex items-center gap-2">
                  <Brain className="size-4" />
                  {isEn
                    ? "Quiz Generator & Instant Exam from Summary"
                    : "🎯 استوديو الاختبارات من الملخص"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEn
                    ? "Generate a full AI exam tab or solve instant questions extracted from your summary units below"
                    : "ولّد اختباراً كاملاً بالذكاء الاصطناعي بالعدد والمستوى المطلوب، أو حل الأسئلة الفورية بالأسفل مباشرة"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStudioDrawer(null)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {onGenerateFromSummary && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
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
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
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
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:text-foreground"
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
                  className="font-extrabold rounded-xl gap-1.5 cursor-pointer"
                >
                  {generatingType ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span>
                    {generatingType
                      ? "جاري توليد الاختبار..."
                      : `توليد اختبار كامل (${studioQuizCount} سؤال)`}
                  </span>
                </Button>
              </div>
            )}

            {/* Instant In-Summary Multi-Unit Quiz */}
            {instantSummaryQuiz.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    ⚡ اختبار سريع فوري من وحدات الملخص ({instantSummaryQuiz.length} سؤال):
                  </span>
                  {Object.keys(instantQuizAnswers).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInstantQuizAnswers({})}
                      className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                        className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                            {mq.topic}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            #{mqIdx + 1}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
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
                                    "border-border bg-card text-foreground hover:border-primary/40",
                                  isAnswered &&
                                    isCorrect &&
                                    "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold",
                                  isAnswered &&
                                    isChosen &&
                                    !isCorrect &&
                                    "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300",
                                  isAnswered &&
                                    !isCorrect &&
                                    !isChosen &&
                                    "border-border/60 text-muted-foreground"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && (
                          <p className="text-[11px] text-primary pt-1">
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
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-primary flex items-center gap-2">
                  <Layers className="size-4" />
                  {isEn
                    ? "Interactive Summary Flashcards"
                    : "🃏 بطاقات التسميع السريع من الملخص"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
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
                    className="font-extrabold rounded-xl text-xs gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                    <span>توليد بنك بطاقات إضافي بالـ AI</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveStudioDrawer(null)}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
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
                          "min-h-[160px] rounded-2xl border p-6 flex flex-col justify-between cursor-pointer select-none transition-colors",
                          isFlashcardFlipped
                            ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                            : "border-primary/40 bg-primary/[0.06]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                          <span className="px-2.5 py-0.5 rounded-md bg-secondary text-foreground">
                            {card.topic}
                          </span>
                          <span className="font-mono text-primary">
                            {safeIdx + 1} / {summaryFlashcards.length} ·{" "}
                            {isFlashcardFlipped
                              ? "الشرح والإجابة (اضغط للقلب)"
                              : "المفهوم / السؤال (اضغط لإظهار الشرح)"}
                          </span>
                        </div>

                        <p
                          className={cn(
                            "text-base sm:text-lg font-bold text-foreground my-4 leading-relaxed",
                            sideDir === "ltr" ? "text-left" : "text-right"
                          )}
                        >
                          <FormattedInlineText text={sideText} />
                        </p>

                        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>🔄 اضغط على البطاقة لقلبها</span>
                          <span>
                            {isFlashcardFlipped ? "الوجه الخلفي" : "الوجه الأمامي"}
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
                          className="rounded-xl text-xs"
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
      </div>
      )}

      {/* Editor Mode */}
      {editing ? (
        <div className="glass rounded-[1.25rem] border border-primary/35 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-primary">
              {isEn
                ? "Markdown & Highlight Editor"
                : "محرر المذكرة الذكية — ظلل أي جملة واضغط على اللون لتمييزها"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                ["yellow", "أصفر", "bg-amber-400/25 border-amber-500/40 text-amber-700 dark:text-amber-300"],
                ["green", "أخضر", "bg-emerald-400/25 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"],
                ["cyan", "سماوي", "bg-sky-400/25 border-sky-500/40 text-sky-700 dark:text-sky-300"],
                ["red", "هام جداً", "bg-rose-400/25 border-rose-500/40 text-rose-700 dark:text-rose-300"],
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
                className="text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 cursor-pointer"
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
            className="font-mono text-sm leading-7 bg-card border-border rounded-xl"
          />
        </div>
      ) : viewMode === "infographic" ? (
        <InfographicSummary
          document={documentV3}
          figures={summaryFigures}
          isEn={isEn}
          onOpenImage={(url) => setFigLightbox({ url, page: "" })}
        />
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
          figures={summaryFigures}
        />
      ) : (
        /* Smart Study Notes Studio: Sidebar TOC + Color-Coded Cards & Tables */
        <SummaryEnhanceCtx.Provider value={{ blur: blurMode, glossary: glossaryMode }}>
        <div className="space-y-4">
          {blurMode && (
            <p className="text-[11px] text-primary flex items-center gap-1.5 px-2">
              <EyeOff className="size-3.5 shrink-0" />
              {isEn
                ? "Active Recall is ON — key terms & numbers are blurred. Tap any blurred chunk to reveal it."
                : "الاستدعاء النشط مفعّل — المصطلحات والأرقام مغبّشة. اضغط على أي جزء مغبّش لإظهاره."}
            </p>
          )}


        <div className={cn("grid gap-5 lg:grid-cols-12 items-start", focusMode && "bf-focus-summary")}>
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

              {/* Section Navigation List — scrolls inside the unified document */}
              <div className="bf-doc-toc space-y-1 pt-1 pe-1">
                <button
                  type="button"
                  onClick={() => scrollToSection("all")}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-xs font-bold transition-colors cursor-pointer",
                    activeSectionId === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span>{isEn ? "Top of Document" : "بداية المستند"}</span>
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
                      onClick={() => scrollToSection(sec.id)}
                      title={isEn ? `Jump to ${sec.title}` : `انتقل إلى: ${sec.title}`}
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

          {/* Unified study-paper document — one continuous editorial surface */}
          <div
            ref={contentRef}
            onClick={handleContentClick}
            onMouseOver={glossaryMode ? handleContentMouseOver : undefined}
            onMouseOut={glossaryMode ? handleContentMouseOut : undefined}
            className={cn(isWideLayout ? "lg:col-span-12" : "lg:col-span-8 xl:col-span-9")}
            style={{ fontSize: `${fontSize}px` }}
          >
            {displaySections.length === 0 ? (
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
              <div className={`bf-doc bf-print-scope bf-skin-${docSkin}`}>
              {displaySections.map((section, sIdx) => (
                <article
                  key={section.id}
                  id={section.id}
                  className="bf-section-enter bf-doc-section"
                  style={{ animationDelay: `${Math.min(sIdx * 40, 320)}ms` }}
                >
                  {/* Editorial chapter heading — part/unit scaffolding is just a styled H2 */}
                  <div className="bf-doc-h2 flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span aria-hidden="true" className="bf-doc-h2-num mt-1">
                        <span className="opacity-80">§</span>{String(section.index || sIdx + 1).padStart(2, "0")}
                      </span>
                      <h2 dir="auto" className="bf-doc-h2-title">
                        {section.title}
                      </h2>
                    </div>

                    <div className="bf-doc-actions no-print flex shrink-0 flex-wrap items-center gap-1.5">
                      {Array.isArray(section.sourceRefs) && section.sourceRefs.length > 0 && (
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground px-1.5">
                          p. {section.sourceRefs.slice(0, 3).join(", ")}
                        </span>
                      )}
                      {!isFullscreen && (
                        <>
                          <button
                            type="button"
                            onClick={() => speakSection(section)}
                            className={cn(
                              "rounded-lg border p-2 transition-colors cursor-pointer inline-flex items-center gap-1",
                              speakingSectionId === section.id
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                            )}
                            title={
                              speakingSectionId === section.id
                                ? isEn
                                  ? "Stop listening"
                                  : "إيقاف الاستماع"
                                : isEn
                                ? "Listen to this unit (audio revision)"
                                : "اسمع هذه الجزئية (مراجعة صوتية)"
                            }
                          >
                            {speakingSectionId === section.id ? (
                              <Square className="size-3.5 fill-current" />
                            ) : (
                              <Volume2 className="size-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => copySectionText(section)}
                            className="rounded-lg border border-border bg-secondary/40 p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                            title={isEn ? "Copy unit text" : "نسخ نص هذه الوحدة"}
                          >
                            <Copy className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendSectionToTelegram(section)}
                            disabled={sendingSectionId === section.id}
                            className="rounded-lg border border-border bg-secondary/40 p-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                            title={isEn ? "Send this unit to the Telegram bot" : "إرسال هذه الجزئية لبوت التليجرام"}
                          >
                            {sendingSectionId === section.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
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
                        className="rounded-lg border border-border bg-secondary/40 p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronUp className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Section Content Blocks */}
                  {!collapsedSections[section.id] && (
                  <div className="space-y-5">
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
                                  ? "Important Academic Note"
                                  : "ملاحظة علمية مهمة"}
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
                            className="bf-table-shell overflow-hidden my-3"
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
                          <div key={item.id} className="space-y-1.5">
                            {item.pairs.map((pair, pIdx) => {
                              const [head, ...rest] = pair.split(/\s*(?:→|->|:)\s*/);
                              const body = rest.join(" : ");
                              return (
                                <div
                                  key={pIdx}
                                  dir="auto"
                                  className="bf-def-strip"
                                >
                                  <span className="font-black text-primary text-[0.95em]">
                                    <FormattedInlineText text={head} />
                                  </span>
                                  {body && (
                                    <>
                                      {" — "}
                                      <span className="text-foreground text-[0.95em] leading-loose">
                                        <FormattedInlineText text={body} />
                                      </span>
                                    </>
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
                                    <span className="mt-0.5 shrink-0 rounded-md bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300">
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
                                    className="px-4 py-3.5 bg-emerald-500/[0.05] flex items-start gap-3 text-right"
                                  >
                                    <span className="mt-0.5 shrink-0 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
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
                              <span className="inline-block mb-1 rounded-md bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300">
                                📋 Key English Concepts
                              </span>
                            )}
                            {item.role === "arabic_explanation" && (
                              <span className="inline-block mb-1 rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                الشرح والتفصيل بالعربي
                              </span>
                            )}
                            <ul className="space-y-1.5">
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
                                    {item.ordered ? (
                                      <span
                                        aria-hidden="true"
                                        className="bf-olnum"
                                      >
                                        {pIdx + 1}
                                      </span>
                                    ) : (
                                      <span
                                        aria-hidden="true"
                                        className="bf-uldiamond"
                                      >
                                        ◆
                                      </span>
                                    )}
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

                      // 📸 Lecture figure lifted from the source PDF (click → lightbox)
                      if (item.kind === "figure" && item.figure?.url) {
                        return (
                          <figure
                            key={item.id}
                            className="group rounded-xl overflow-hidden border border-border bg-card my-3 cursor-zoom-in shadow-xs"
                            onClick={() => setFigLightbox(item.figure)}
                          >
                            <img
                              src={item.figure.url}
                              alt={item.text || `صورة من الصفحة ${item.figure.page}`}
                              loading="lazy"
                              className="w-full max-h-[420px] object-contain bg-secondary/40 transition-transform duration-300 group-hover:scale-[1.01]"
                            />
                            <figcaption className="flex items-center gap-2 px-4 py-2 text-[11px] text-primary border-t border-border bg-secondary/30">
                              <ImageIcon className="size-3.5 shrink-0" />
                              <span className="truncate font-semibold">
                                {isEn
                                  ? `Lecture figure — page ${item.figure.page}`
                                  : `شكل توضيحي من المحاضرة — صفحة ${item.figure.page}`}
                                {item.text ? ` · ${item.text}` : ""}
                              </span>
                              <span className="ms-auto shrink-0 inline-flex items-center gap-1 text-primary font-bold">
                                <Maximize2 className="size-3" />
                                {isEn ? "Zoom" : "تكبير"}
                              </span>
                            </figcaption>
                          </figure>
                        );
                      }

                      if (item.kind === "diagram" && item.mermaid) {
                        return (
                          <MermaidDiagram
                            key={item.id}
                            code={item.mermaid}
                            title={item.text}
                          />
                        );
                      }

                      if (item.kind === "pearl") {
                        return (
                          <div key={item.id} className="bf-pearl-card" dir="auto">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Sparkles className="size-4 text-amber-500 shrink-0" />
                              <span className="text-[11px] font-black tracking-wide text-amber-600 dark:text-amber-300">
                                {isEn ? "KEY ACADEMIC SUMMARY — MODEL ANSWER" : "📌 خلاصة علمية مركزة — إجابة نموذجية"}
                              </span>
                            </div>
                            <p className="text-foreground leading-8 font-semibold">
                              <FormattedInlineText text={item.text} />
                            </p>
                          </div>
                        );
                      }

                      if (item.kind === "mnemonic") {
                        return (
                          <div key={item.id} className="bf-mnemonic-card" dir="auto">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Brain className="size-4 text-violet-500 shrink-0" />
                              <span className="text-[11px] font-black tracking-wide text-violet-600 dark:text-violet-300">
                                {isEn ? "MEMORY ANCHOR" : "🧠 ربط ذهني للحفظ السريع"}
                              </span>
                            </div>
                            <p className="text-foreground leading-8 font-semibold">
                              <FormattedInlineText text={item.text} />
                            </p>
                          </div>
                        );
                      }

                      if (item.kind === "danger") {
                        return (
                          <div key={item.id} className="bf-danger-card" dir="auto">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Siren className="size-4 text-red-500 shrink-0" />
                              <span className="text-[11px] font-black tracking-wide text-red-600 dark:text-red-300">
                                {isEn ? "CRITICAL EXAM POINT" : "🚨 تنبيه امتحاني بالغ الأهمية"}
                              </span>
                            </div>
                            <p className="text-foreground leading-8 font-black">
                              <FormattedInlineText text={item.text} />
                            </p>
                          </div>
                        );
                      }

                      if (item.kind === "compare") {
                        const cmpHeaders = Array.isArray(item.headers) ? item.headers : [];
                        const cmpRows = Array.isArray(item.rows) ? item.rows : [];
                        return (
                          <div key={item.id} className="rounded-xl border border-amber-500/35 overflow-hidden my-3">
                            <div className="bg-amber-500/[0.09] px-4 py-2 border-b border-amber-500/25 flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-300">
                              <Scale className="size-4 shrink-0" />
                              <span>
                                {isEn ? `Comparison: ${item.text}` : `مقارنة علمية: ${item.text}`}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-start text-[0.92em]">
                                <thead>
                                  <tr className="bg-secondary/40 border-b border-border">
                                    {cmpHeaders.map((h, hIdx) => (
                                      <th
                                        key={hIdx}
                                        dir="auto"
                                        className={cn(
                                          "px-4 py-2.5 text-start font-black border-e border-border last:border-e-0",
                                          hIdx === 0 ? "text-muted-foreground" : "text-red-600 dark:text-red-300"
                                        )}
                                      >
                                        <FormattedInlineText text={h} />
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {cmpRows.map((row, rIdx) => (
                                    <tr key={rIdx} className="even:bg-secondary/20">
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          dir="auto"
                                          className={cn(
                                            "px-4 py-2.5 align-top leading-relaxed border-e border-border last:border-e-0",
                                            cIdx === 0 ? "font-bold text-primary" : "text-foreground"
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

                      if (item.kind === "exam_hook") {
                        return (
                          <div key={item.id} className="bf-exam-hook flex items-center gap-2" dir="auto">
                            <Target className="size-4 shrink-0" />
                            <span>
                              <FormattedInlineText text={item.text} />
                            </span>
                          </div>
                        );
                      }

                      // Default: plain editorial paragraph
                      return (
                        <p
                          key={item.id}
                          dir="auto"
                          className="bf-doc-p my-2 leading-[1.85] text-foreground"
                        >
                          <FormattedInlineText text={item.text} />
                        </p>
                      );
                    })}
                  </div>
                  )}
                </article>
              ))}
              </div>
            )}
          </div>
        </div>
        </div>
        </SummaryEnhanceCtx.Provider>
      )}

      {/* ⚙️ Collapsible Side Drawer for Secondary Summary Tools & Settings */}
      {typeof document !== "undefined" && toolsDrawerOpen && createPortal(
        <div
          className="fixed inset-0 z-[140] bg-black/45 flex justify-end"
          onClick={() => setToolsDrawerOpen(false)}
          role="presentation"
        >
          <aside
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-card text-foreground border-s border-border shadow-2xl overflow-y-auto p-5 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h3 className="font-display text-base font-extrabold text-foreground">
                  {isEn ? "Summary Tools & Study Settings" : "أدوات وإعدادات الملخص الأكاديمي"}
                </h3>
              </div>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => setToolsDrawerOpen(false)}
                aria-label={isEn ? "Close" : "إغلاق"}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* 1. Study Depth & Active Recall */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-secondary/35 p-3.5">
              <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <GraduationCap className="size-4" />
                {isEn ? "Study Depth & Reading Modes" : "مستوى العمق وأوضاع القراءة"}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(SUMMARY_DEPTHS).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDepthLevel(key)}
                    className={cn(
                      "px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                      depthLevel === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {isEn ? cfg.labelEn : cfg.labelAr}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  variant={blurMode ? "default" : "outline"}
                  onClick={() => setBlurMode((v) => !v)}
                  className="justify-start gap-1.5 text-xs"
                >
                  {blurMode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{isEn ? "Active Recall Blur" : "تغبيش المصطلحات"}</span>
                </Button>

                <Button
                  size="sm"
                  variant={glossaryMode ? "default" : "outline"}
                  onClick={() => setGlossaryMode((v) => !v)}
                  className="justify-start gap-1.5 text-xs"
                >
                  <BookOpenCheck className="size-3.5" />
                  <span>{isEn ? "Instant Glossary" : "القاموس الفوري"}</span>
                </Button>

                <Button
                  size="sm"
                  variant={focusMode ? "default" : "outline"}
                  onClick={() => setFocusMode((v) => !v)}
                  className="justify-start gap-1.5 text-xs"
                >
                  <BookOpen className="size-3.5" />
                  <span>{isEn ? "Focus Paper Mode" : "وضع التركيز الورقي"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    setCramOpen(true);
                  }}
                  className="justify-start gap-1.5 text-xs"
                >
                  <Flame className="size-3.5 text-amber-500" />
                  <span>{isEn ? "Exam-Night Sheet" : "ورقة ليلة الامتحان"}</span>
                </Button>
              </div>
            </div>

            {/* 2. Practice & Study Generators from Summary */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-secondary/35 p-3.5">
              <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <Brain className="size-4" />
                {isEn ? "Practice & Revision Studio" : "إنشاء تدريبات ومراجعات من الملخص"}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    setActiveStudioDrawer("quiz");
                  }}
                  className="justify-start gap-2 text-xs font-bold"
                >
                  <Brain className="size-4 text-primary" />
                  <span>{isEn ? "Create Quiz from Summary" : "إنشاء اختبار تفاعلي من الملخص"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    setActiveFlashcardIdx(0);
                    setIsFlashcardFlipped(false);
                    setActiveStudioDrawer("flashcards");
                  }}
                  className="justify-start gap-2 text-xs font-bold"
                >
                  <Layers className="size-4 text-primary" />
                  <span>
                    {isEn
                      ? `Flashcards Deck (${summaryFlashcards.length})`
                      : `بطاقات التسميع والمراجعة (${summaryFlashcards.length})`}
                  </span>
                </Button>

                {onGenerateFromSummary && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(generatingType)}
                    onClick={() => {
                      setToolsDrawerOpen(false);
                      onGenerateFromSummary("study_sheet");
                    }}
                    className="justify-start gap-2 text-xs font-bold"
                  >
                    <FileText className="size-4 text-primary" />
                    <span>{isEn ? "Generate Quick Revision Sheet" : "توليد ورقة مراجعة مركزة"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 3. Smart AI Refinement */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-secondary/35 p-3.5">
              <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                <Sparkles className="size-4" />
                {isEn
                  ? `Smart AI Refinement (${AI_SUMMARY_EDIT_COST} credits)`
                  : `تطوير وتعديل الملخص بالذكاء الاصطناعي (${AI_SUMMARY_EDIT_COST} كريدت)`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  isEn ? "Expand & explain deeply" : "كبّر واشرح كل نقطة بالتفصيل والأمثلة",
                  isEn ? "Add comparison table" : "أضف جدول مقارنات شامل",
                  isEn ? "Highlight exam questions" : "أبرز مواضع وتريكات أسئلة الامتحان",
                  isEn ? "Simplify explanation" : "بسّط الشرح بالعربي",
                ].map((qPrompt) => (
                  <button
                    key={qPrompt}
                    type="button"
                    disabled={aiUpdating}
                    onClick={() => {
                      setToolsDrawerOpen(false);
                      handleAiEdit(qPrompt);
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-card border border-border text-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {qPrompt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setToolsDrawerOpen(false);
                      handleAiEdit();
                    }
                  }}
                  placeholder={
                    isEn
                      ? "Write custom AI instruction..."
                      : "اكتب أي تعديل مخصص للملخص..."
                  }
                  className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    handleAiEdit();
                  }}
                  disabled={!aiInstruction.trim() || aiUpdating}
                  className="h-9 px-3 rounded-xl text-xs font-bold shrink-0"
                >
                  {aiUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {/* 4. Document Actions (Audio, Copy, Edit, Export, Regenerate, Delete) */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-secondary/35 p-3.5">
              <p className="text-xs font-extrabold text-foreground">
                {isEn ? "Document Actions & Export" : "إدارة وتصدير المستند"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSpeak}
                  className="justify-start gap-1.5 text-xs"
                >
                  {speaking ? (
                    <>
                      <Square className="w-3.5 h-3.5 text-destructive" />
                      <span>{isEn ? "Stop Audio" : "إيقاف القراءة"}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-primary" />
                      <span>{isEn ? "Audio Listen" : "استماع صوتي"}</span>
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={copy}
                  className="justify-start gap-1.5 text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isEn ? "Copied" : "تم النسخ") : isEn ? "Copy Text" : "نسخ الملخص"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    setEditing(true);
                  }}
                  className="justify-start gap-1.5 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? "Manual Edit" : "تعديل يدوي"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadHtmlDirect}
                  className="justify-start gap-1.5 text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? "Download HTML" : "تحميل HTML"}</span>
                </Button>

                {onToggleSummaryRegen && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setToolsDrawerOpen(false);
                      onToggleSummaryRegen();
                    }}
                    className="justify-start gap-1.5 text-xs"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Regenerate Style" : "إعادة التوليد بنمط آخر"}</span>
                  </Button>
                )}

                {onExportTelegram && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exportingTelegram}
                    onClick={onExportTelegram}
                    className="justify-start gap-1.5 text-xs"
                  >
                    {exportingTelegram ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>{isEn ? "Send to Telegram" : "إرسال إلى تليجرام"}</span>
                  </Button>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setToolsDrawerOpen(false);
                    handleDeleteSummary();
                  }}
                  disabled={deletingSummary}
                  className="w-full justify-center gap-1.5 text-xs"
                >
                  {deletingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isEn ? "Delete Summary Permanently" : "حذف الملخص نهائياً"}</span>
                </Button>
              </div>
            </div>
          </aside>
        </div>,
        document.body
      )}

      {/* ⭐ Enhancement floating UI — rendered via portals so they survive mode switches */}
      {typeof document !== "undefined" && figLightbox && createPortal(
        <div
          className="fixed inset-0 z-[145] bg-black/85 overflow-auto p-4 sm:p-10 grid place-items-center"
          onClick={() => setFigLightbox(null)}
          role="presentation"
        >
          <button
            type="button"
            onClick={() => setFigLightbox(null)}
            className="fixed top-4 end-4 z-10 w-10 h-10 rounded-xl grid place-items-center bg-white/10 border border-white/20 text-white hover:bg-white/20 cursor-pointer"
            aria-label={isEn ? "Close" : "إغلاق"}
          >
            <X className="size-5" />
          </button>
          <div className="max-w-4xl w-full rounded-2xl border border-border bg-card p-3 sm:p-5" onClick={(e) => e.stopPropagation()} role="presentation">
            <img
              src={figLightbox.url}
              alt={isEn ? `Lecture figure — page ${figLightbox.page}` : `شكل توضيحي — صفحة ${figLightbox.page}`}
              className="w-full max-h-[78vh] object-contain bg-black/20 rounded-lg"
            />
            <p className="mt-3 text-center text-xs font-bold text-primary">
              📸 {isEn ? `Lecture figure — page ${figLightbox.page}` : `شكل توضيحي من المحاضرة — صفحة ${figLightbox.page}`}
            </p>
          </div>
        </div>,
        document.body
      )}

      {typeof document !== "undefined" && glossTip && createPortal(
        <div className="bf-glossary-tip" style={{ left: glossTip.x, top: glossTip.y }} dir="rtl">
          <p className="bf-glossary-word">{glossTip.term}</p>
          <p className="bf-glossary-def">{glossTip.def}</p>
        </div>,
        document.body
      )}

      {typeof document !== "undefined" && cramOpen && createPortal(
        <div className="fixed inset-0 z-[110] bg-black/80 overflow-y-auto p-3 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-black text-amber-300">
                <Flame className="size-4" />
                {isEn ? "Exam-Night Sheet — high-yield only" : "ورقة ليلة الامتحان — النقاط الأساسية"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cramPlainText);
                    toast.success(isEn ? "Sheet copied!" : "تم نسخ الورقة!");
                  }}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                >
                  {isEn ? "Copy" : "نسخ"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-amber-400/40 bg-amber-400/20 px-3 py-1.5 text-xs font-black text-amber-200 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Printer className="size-3.5" />
                  {isEn ? "Print / PDF" : "طباعة / PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setCramOpen(false)}
                  className="w-8 h-8 rounded-lg grid place-items-center text-white bg-white/10 cursor-pointer"
                  aria-label={isEn ? "Close" : "إغلاق"}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="bf-cram-print-root rounded-2xl border border-border bg-white text-black p-6 sm:p-8" style={{ display: "block" }} dir="rtl">
              <pre className="whitespace-pre-wrap font-body text-[13px] leading-7 text-gray-900" style={{ fontFamily: "inherit" }}>
                {cramPlainText || (isEn ? "No high-yield points extracted yet." : "لا توجد نقاط عالية الأهمية مستخرجة بعد.")}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(
      <div
        id="fullscreen-summary-reader-portal"
        className="fixed inset-0 z-[999999] w-screen h-screen bg-background text-foreground overflow-y-auto p-3 sm:p-6 md:p-8 antialiased"
      >
        <div className="max-w-7xl mx-auto w-full">
          {mainContent}
        </div>
      </div>,
      document.body
    );
  }

  return mainContent;
}
