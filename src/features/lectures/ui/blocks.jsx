/**
 * src/features/lectures/ui/blocks.jsx — Reusable semantic block components for Lecture Document (Section 12.3).
 *
 * Security & BiDi Invariant:
 *   • All text is rendered through React text nodes and `<BidiText>` (`splitRuns`),
 *     never `dangerouslySetInnerHTML`.
 */
import React, { useState } from "react";
import { splitRuns } from "../text/bidi.js";
import { formatTimeMarker } from "./buildDocModel.js";

/**
 * Render mixed Arabic + English medical text with `<bdi dir="ltr" className="en">`.
 */
export function BidiText({ text = "", runs = null, className = "" }) {
  const resolvedRuns = Array.isArray(runs) ? runs : splitRuns(String(text || ""));
  return (
    <span className={className}>
      {resolvedRuns.map((run, idx) =>
        run.dir === "ltr" ? (
          <bdi
            key={idx}
            dir="ltr"
            className="en"
            style={{ unicodeBidi: "isolate" }}
          >
            {run.text}
          </bdi>
        ) : (
          <React.Fragment key={idx}>{run.text}</React.Fragment>
        ),
      )}
    </span>
  );
}

export function DefinitionBox({ term, children, text }) {
  return (
    <div className="lecture-block-definition" role="note" aria-label="تعريف">
      <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
        <span className="px-2 py-0.5 rounded-full bg-teal-500/15">تعريف</span>
        {term ? (
          <bdi dir="ltr" className="en">
            {term}
          </bdi>
        ) : null}
      </div>
      <div className="text-sm leading-relaxed">
        {children || <BidiText text={text} />}
      </div>
    </div>
  );
}

export function KeyPoint({ children, text }) {
  return (
    <div className="flex items-start gap-2.5 my-2 p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/20">
      <span className="mt-2 h-2 w-2 rounded-full bg-teal-500 shrink-0" aria-hidden="true" />
      <div className="text-sm leading-relaxed">
        <strong className="font-bold text-teal-700 dark:text-teal-300 ml-1.5">نقطة أساسية:</strong>
        {children || <BidiText text={text} />}
      </div>
    </div>
  );
}

export function ExamPearl({ children, text }) {
  return (
    <div className="lecture-block-exam" role="note" aria-label="موضع امتحان">
      <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-amber-600 dark:text-amber-400">
        <span>⭐</span>
        <span>موضع امتحان</span>
      </div>
      <div className="text-sm leading-relaxed">
        {children || <BidiText text={text} />}
      </div>
    </div>
  );
}

export function Warning({ children, text }) {
  return (
    <div className="lecture-block-warning" role="note" aria-label="تحذير">
      <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-rose-600 dark:text-rose-400">
        <span>⚠️</span>
        <span>تحذير</span>
      </div>
      <div className="text-sm leading-relaxed">
        {children || <BidiText text={text} />}
      </div>
    </div>
  );
}

export function Mnemonic({ children, text }) {
  return (
    <div className="lecture-block-mnemonic" role="note" aria-label="بصمجة / اختصار للحفظ">
      <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-violet-600 dark:text-violet-400">
        <span>🧠</span>
        <span>بصمجة / اختصار للحفظ</span>
      </div>
      <div className="text-sm leading-relaxed">
        {children || <BidiText text={text} />}
      </div>
    </div>
  );
}

export function NumberChip({ value, label }) {
  return (
    <span className="lecture-chip-number inline-flex items-center gap-1 mx-0.5">
      <bdi dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {value}
      </bdi>
      {label ? <span className="text-xs font-normal">{label}</span> : null}
    </span>
  );
}

export function ComparisonTable({ headers = [], rows = [], caption = "" }) {
  if (!Array.isArray(headers) || headers.length < 2 || !Array.isArray(rows) || rows.length < 2) {
    return null;
  }
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm text-right border-collapse">
        {caption ? <caption className="p-2 text-xs text-slate-500">{caption}</caption> : null}
        <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0">
          <tr>
            {headers.slice(0, 4).map((h, i) => (
              <th key={i} className="p-3 font-bold border-b border-slate-200 dark:border-slate-700">
                <BidiText text={String(h || "")} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={rIdx % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-900/40" : ""}
            >
              {(Array.isArray(row) ? row : []).slice(0, 4).map((cell, cIdx) => (
                <td key={cIdx} className="p-3 border-b border-slate-100 dark:border-slate-800/60">
                  <BidiText text={String(cell || "")} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SourceChip({ sentenceIds = [], added = false, onClickSentence }) {
  if (added) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-300 mx-1">
        [توضيح إضافي]
      </span>
    );
  }
  const firstId = Array.isArray(sentenceIds) && sentenceIds.length > 0 ? sentenceIds[0] : null;
  const num = firstId ? parseInt(String(firstId).replace(/\D+/g, ""), 10) : null;
  return (
    <button
      type="button"
      onClick={() => firstId && onClickSentence?.(firstId)}
      className="lecture-interactive-btn inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-300 hover:bg-teal-500/20 mx-1"
    >
      [من كلام الدكتور{Number.isFinite(num) ? ` · جملة ${num}` : ""}]
    </button>
  );
}

export function TermPair({ ar = "", en = "" }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium mx-0.5">
      {ar ? <span>{ar}</span> : null}
      {en ? (
        <bdi dir="ltr" className="en" style={{ unicodeBidi: "isolate" }}>
          ({en})
        </bdi>
      ) : null}
    </span>
  );
}

export function OfftopicChip({ sentences = [], defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!Array.isArray(sentences) || sentences.length === 0) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="lecture-interactive-btn inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-full text-xs font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300/70"
      >
        <span>[كلام جانبي — اضغط للعرض]</span>
      </button>
    );
  }

  return (
    <span className="inline bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg text-sm">
      {sentences.map((s) => (
        <span key={s.id} id={`sentence-${s.id}`} className="ml-1">
          <BidiText text={s.text} runs={s.runs} />{" "}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="lecture-interactive-btn text-xs underline text-teal-600 dark:text-teal-400 mr-1"
      >
        إخفاء الكلام الجانبي
      </button>
    </span>
  );
}

export function GapCard({ gap, onRetry }) {
  const fromStr = formatTimeMarker(gap?.fromSec ?? gap?.startSec ?? 0);
  const toStr = formatTimeMarker(gap?.toSec ?? gap?.endSec ?? 0);
  return (
    <div className="lecture-gap-card flex flex-wrap items-center justify-between gap-3" role="alert">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
        <span>⚠️</span>
        <span>
          مقطع غير مفرّغ من <bdi dir="ltr">{fromStr}</bdi> إلى <bdi dir="ltr">{toStr}</bdi>
        </span>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={() => onRetry(gap)}
          className="lecture-interactive-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
        >
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}

function renderAnnotationBadge(ann) {
  if (!ann) return null;
  if (ann.kind === "definition") {
    return <DefinitionBox key={`${ann.id}-${ann.kind}`} term={ann.term} text={ann.sentenceText} />;
  }
  if (ann.kind === "exam" || ann.kind === "exam_pearl") {
    return <ExamPearl key={`${ann.id}-${ann.kind}`} text={ann.sentenceText} />;
  }
  if (ann.kind === "warning") {
    return <Warning key={`${ann.id}-${ann.kind}`} text={ann.sentenceText} />;
  }
  if (ann.kind === "mnemonic") {
    return <Mnemonic key={`${ann.id}-${ann.kind}`} text={ann.sentenceText} />;
  }
  if (ann.kind === "key_point") {
    return <KeyPoint key={`${ann.id}-${ann.kind}`} text={ann.sentenceText} />;
  }
  return null;
}

/**
 * Adaptive SectionCard (Section 12.2):
 *   • `micro` (< 60 words): slim note card, no numbering, no sub-structure
 *   • `compact` (60..249 words): heading + one paragraph group
 *   • `standard` (250..899 words): heading, paragraphs, key-points rail
 *   • `extended` (>= 900 words): heading + subsections, first open, rest behind `اعرض الباقي` button
 */
export function SectionCard({
  section,
  lazy = false,
  showOfftopic = true,
  showAnnotations = true,
  showTimes = true,
  highlightTerms = true,
  searchQuery = "",
  onCopySection,
}) {
  const [expandedParts, setExpandedParts] = useState(() => new Set([1]));
  const [copied, setCopied] = useState(false);

  if (!section) return null;
  if (!showOfftopic && section.isOfftopicOnly) return null;

  const handleCopy = () => {
    const plain = (section.sentences || []).map((s) => s.text).join(" ");
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(plain).catch(() => {});
    }
    onCopySection?.(section, plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const renderParagraph = (p) => (
    <p key={p.id} className="lecture-paragraph">
      {(p.sentences || []).map((s) => {
        if (s.isOfftopic && !showOfftopic) {
          return <OfftopicChip key={s.id} sentences={[s]} defaultExpanded={false} />;
        }
        const isMatch =
          searchQuery &&
          s.text.toLowerCase().includes(String(searchQuery).trim().toLowerCase());
        return (
          <span
            key={s.id}
            id={`sentence-${s.id}`}
            data-sentence-id={s.id}
            className={`inline ${
              isMatch ? "bg-amber-300/40 dark:bg-amber-500/30 rounded px-0.5" : ""
            } ${s.isOfftopic ? "text-slate-400 dark:text-slate-500" : ""}`}
          >
            <BidiText
              text={s.text}
              runs={highlightTerms ? s.runs : [{ dir: "rtl", text: s.text }]}
            />{" "}
          </span>
        );
      })}
    </p>
  );

  // Micro density (< 60 words): slim note card, no numbering, no sub-structure
  if (section.density === "micro") {
    return (
      <section
        id={section.id}
        className={`lecture-section-card py-3 px-4 ${lazy ? "lecture-section-card--lazy" : ""}`}
      >
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {section.title}
        </div>
        {(section.paragraphs || []).map(renderParagraph)}
      </section>
    );
  }

  return (
    <section
      id={section.id}
      className={`lecture-section-card ${lazy ? "lecture-section-card--lazy" : ""}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          {section.showNumber && section.sectionNumber != null ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-300 text-xs font-extrabold">
              {section.sectionNumber}
            </span>
          ) : null}
          <h2 className="lecture-section-heading !mb-0">
            <BidiText text={section.title} />
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {section.kindLabelAr}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          {showTimes ? (
            <span className="font-mono" title="توقيت تقريبي">
              ~<bdi dir="ltr">{formatTimeMarker(section.approxStartSec)}</bdi>
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className="lecture-interactive-btn px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
          >
            {copied ? "تم النسخ ✓" : "نسخ القسم"}
          </button>
        </div>
      </header>

      {/* Extended density (>= 900 words): subsections, first open, rest behind اعرض الباقي */}
      {section.density === "extended" && Array.isArray(section.subsections) && section.subsections.length > 0 ? (
        <div className="space-y-4">
          {section.subsections.map((sub) => {
            const isOpen = sub.defaultExpanded || expandedParts.has(sub.partIndex);
            return (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-100 dark:border-slate-800/70 p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="lecture-subheading !mt-0 !mb-0">
                    <BidiText text={sub.title} />
                  </h3>
                  {!isOpen ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedParts((prev) => new Set([...prev, sub.partIndex]))
                      }
                      className="lecture-interactive-btn px-3 py-1 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-300 text-xs font-bold"
                    >
                      {sub.expandButtonLabel || "اعرض الباقي"}
                    </button>
                  ) : null}
                </div>
                {isOpen ? (sub.paragraphs || []).map(renderParagraph) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div>{(section.paragraphs || []).map(renderParagraph)}</div>
      )}

      {/* Key-points / annotations rail for standard & extended sections */}
      {showAnnotations &&
      Array.isArray(section.keyPointsRail) &&
      section.keyPointsRail.length > 0 ? (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          {section.keyPointsRail.map((ann) => renderAnnotationBadge(ann))}
        </div>
      ) : null}
    </section>
  );
}

export default {
  BidiText,
  SectionCard,
  DefinitionBox,
  KeyPoint,
  ExamPearl,
  Warning,
  Mnemonic,
  NumberChip,
  ComparisonTable,
  SourceChip,
  TermPair,
  OfftopicChip,
  GapCard,
};
