/**
 * src/features/lectures/export/PrintView.jsx — Native A4 Print / PDF view & pre-print dialog (Section 14.2).
 */
import React, { useMemo, useState } from "react";
import { SectionCard, GapCard, BidiText } from "../ui/blocks.jsx";
import { buildDynamicStudySheet } from "../ai/dynamicLectureBuilder.js";
import { downloadStandaloneHtml } from "./exportHtml.js";
import {
  downloadPostMortemStudyHtml,
  printPostMortemStudyHtml,
} from "./postMortemStudyHtml.js";
import "../styles/lecture-doc.css";

export function isIosDevice(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /iPhone|iPad|iPod/i.test(String(userAgent || ""));
}

export async function triggerNativePrint() {
  if (typeof window === "undefined") return;
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // Ignore font readiness errors
  }
  await new Promise((resolve) => {
    const raf =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame
        : (fn) => setTimeout(fn, 16);
    raf(() => raf(resolve));
  });
  if (typeof window.print === "function") {
    window.print();
  }
}

export function PrintView({
  docModel,
  studyNotes = null,
  summary = null,
  figures = [],
  includeFigures = true,
  pdfText = "",
  aiPostMortemSheet = null,
  onClose,
}) {
  const [scope, setScope] = useState("all"); // 'transcript' | 'study' | 'summary' | 'all'
  const [pdfTemplate, setPdfTemplate] = useState("comprehensive"); // 'high_yield_summary' | 'ordered_transcript' | 'comprehensive'
  const [includeOfftopic, setIncludeOfftopic] = useState(false);
  const [fontSize, setFontSize] = useState("md"); // 'sm' | 'md' | 'lg'

  const dynamicSheet = useMemo(
    () => (docModel ? buildDynamicStudySheet(docModel, { studyNotes, summaryData: summary }) : null),
    [docModel, studyNotes, summary],
  );

  const ios = isIosDevice();
  const printHint = ios
    ? "اضغط مشاركة ثم طباعة ثم اسحب بإصبعين لحفظ PDF"
    : "في نافذة الطباعة اختر Save as PDF / حفظ بتنسيق PDF";

  const meta = docModel?.meta || {};
  const sections = Array.isArray(docModel?.sections) ? docModel.sections : [];
  const gaps = Array.isArray(docModel?.gaps) ? docModel.gaps : [];

  return (
    <div
      dir="rtl"
      lang="ar"
      data-font-size={fontSize}
      className="lecture-doc-root min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8"
    >
      {/* Pre-print options bar (hidden during actual print) */}
      <div className="no-print lecture-reading-column mb-6 rounded-2xl border border-teal-500/30 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            إعدادات الطباعة وحفظ PDF
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={triggerNativePrint}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
            >
              🖨️ طباعة / حفظ PDF الآن
            </button>
            <button
              type="button"
              onClick={() =>
                printPostMortemStudyHtml(docModel, {
                  studyNotes,
                  summaryData: summary,
                  aiSheet: aiPostMortemSheet,
                  pdfText,
                  figures,
                  includeFigures,
                })
              }
              className="px-3.5 py-2 rounded-xl border-2 border-black bg-amber-200 hover:bg-amber-300 text-black text-xs font-extrabold cursor-pointer transition-colors"
            >
              📄 طباعة مذكرة Post-Mortem (جداول + SVG)
            </button>
            <button
              type="button"
              onClick={() =>
                downloadPostMortemStudyHtml(docModel, {
                  studyNotes,
                  summaryData: summary,
                  aiSheet: aiPostMortemSheet,
                  pdfText,
                  figures,
                  includeFigures,
                })
              }
              className="px-3.5 py-2 rounded-xl border border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer transition-colors"
            >
              ⬇️ تحميل HTML بنمط Post-Mortem
            </button>
            <button
              type="button"
              onClick={() =>
                downloadStandaloneHtml(docModel, {
                  includeOfftopic,
                  includeAnnotations: true,
                  studyNotes,
                  summary,
                })
              }
              className="px-3.5 py-2 rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold cursor-pointer"
            >
              🌐 تحميل كتاب HTML مستقل
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                رجوع
              </button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-teal-700 dark:text-teal-300 bg-teal-500/10 rounded-xl px-3 py-2 mb-3">
          💡 {printHint}
        </p>

        {/* 3 Printable Study Book Templates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {[
            {
              id: "high_yield_summary",
              title: "⚡ ملخص المذاكرة والامتحان",
              desc: "نقاط الإنجليزي للامتحان + الشرح العربي + الجرعات + قاموس التعريفات",
            },
            {
              id: "ordered_transcript",
              title: "📝 النص الكامل المنظم",
              desc: "كلام الدكتور كامل بعد ترتيب الفقرات وإرجاع المصطلحات الطبية للإنجليزي",
            },
            {
              id: "comprehensive",
              title: "📚 الكتاب الشامل الكامل",
              desc: "يجمع مذكرة المذاكرة المزدوجة + النص الكامل + قاموس التعريفات في النهاية",
            },
          ].map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setPdfTemplate(tpl.id)}
              className={`text-right p-2.5 rounded-xl border transition-colors cursor-pointer ${
                pdfTemplate === tpl.id
                  ? "border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-200"
                  : "border-slate-200 dark:border-slate-800 hover:border-teal-500/40"
              }`}
            >
              <div className="text-xs font-bold">{tpl.title}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{tpl.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <span className="font-semibold">المحتوى:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1"
            >
              <option value="all">الكل (النص + المذاكرة + الخلاصة)</option>
              <option value="transcript">النص الكامل فقط</option>
              <option value="study">وضع المذاكرة فقط</option>
              <option value="summary">الخلاصة فقط</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="font-semibold">حجم الخط:</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1"
            >
              <option value="sm">صغير (15px)</option>
              <option value="md">متوسط (17px)</option>
              <option value="lg">كبير (19px)</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOfftopic}
              onChange={(e) => setIncludeOfftopic(e.target.checked)}
            />
            <span>تضمين الكلام الجانبي</span>
          </label>
        </div>
      </div>

      {/* Printable A4 reading column */}
      <article className="lecture-reading-column">
        <header className="lecture-section-card">
          <h1 className="lecture-doc-title mb-2">
            <BidiText text={meta.title || "محاضرة بدون عنوان"} />
          </h1>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            {meta.subject ? <span>المادة: {meta.subject}</span> : null}
            {meta.lecturer ? <span>المحاضر: {meta.lecturer}</span> : null}
            {meta.date ? <span>التاريخ: {meta.date}</span> : null}
            <span>عدد الكلمات: {meta.totalWords || 0}</span>
          </div>
        </header>

        {gaps.map((g) => (
          <GapCard key={g.id} gap={g} />
        ))}

        {(scope === "summary" || scope === "all") && summary?.main_points?.length ? (
          <section className="lecture-section-card">
            <h2 className="lecture-section-heading">الخلاصة</h2>
            <ul className="space-y-2 pr-4 list-disc text-sm">
              {summary.main_points.map((mp, idx) => (
                <li key={idx}>
                  {mp.title ? <strong className="ml-1">{mp.title}:</strong> : null}
                  <BidiText text={mp.text} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(scope === "study" || scope === "all") && studyNotes?.sections?.length ? (
          <section className="lecture-section-card">
            <h2 className="lecture-section-heading">شرح المذاكرة المبسط</h2>
            <div className="space-y-4">
              {studyNotes.sections.map((sec, idx) => (
                <div key={idx}>
                  <h3 className="lecture-subheading">{sec.title || sec.section_id}</h3>
                  <ul className="space-y-1.5 pr-4 list-disc text-sm">
                    {[...(sec.basics || []), ...(sec.from_lecture || [])].map((b, bIdx) => (
                      <li key={bIdx}>
                        <BidiText text={b.text} />{" "}
                        <span className="text-xs text-teal-600">[{b.sourceLabelAr || "من كلام الدكتور"}]</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(pdfTemplate === "high_yield_summary" || pdfTemplate === "comprehensive") &&
        dynamicSheet?.studySections?.length ? (
          <section className="lecture-section-card">
            <h2 className="lecture-section-heading">
              مذكرة المذاكرة الطبية المزدوجة (English Exam Notes + الشرح العربي)
            </h2>
            {dynamicSheet.executiveSummary?.length ? (
              <div className="mb-4 rounded-xl border border-teal-500/30 bg-teal-500/5 p-3">
                <strong className="block text-xs text-teal-700 dark:text-teal-300 mb-1.5">
                  📌 الخلاصة التنفيذية السريعة:
                </strong>
                <ul className="space-y-1 pr-4 list-disc text-xs">
                  {dynamicSheet.executiveSummary.map((line, i) => (
                    <li key={i}>
                      <BidiText text={line} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-4">
              {dynamicSheet.studySections.map((sec) => (
                <div key={sec.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="lecture-subheading !m-0">
                      <BidiText text={sec.topicTitle} />
                    </h3>
                    {sec.approxTime ? (
                      <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
                        ~{sec.approxTime}
                      </span>
                    ) : null}
                  </div>

                  {sec.englishMedicalNotes?.length ? (
                    <div
                      dir="ltr"
                      className="mb-2.5 rounded-lg border-l-4 border-blue-500 bg-blue-500/5 p-3 text-left font-sans text-xs leading-relaxed"
                    >
                      <strong className="block text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                        1. ENGLISH MEDICAL STUDY NOTES (FOR EXAMS)
                      </strong>
                      <ul className="list-disc pl-4 space-y-1">
                        {sec.englishMedicalNotes.map((en, idx) => (
                          <li key={idx}>{en}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {sec.arabicExplanation?.length ? (
                    <div
                      dir="rtl"
                      className="rounded-lg border-r-4 border-teal-500 bg-teal-500/5 p-3 text-right text-xs leading-relaxed"
                    >
                      <strong className="block text-[11px] font-extrabold text-teal-700 dark:text-teal-300 mb-1">
                        ٢. الشرح والفهم بالعربي
                      </strong>
                      <ul className="list-disc pr-4 space-y-1">
                        {sec.arabicExplanation.map((ar, idx) => (
                          <li key={idx}>
                            <BidiText text={ar} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(pdfTemplate === "ordered_transcript" || pdfTemplate === "comprehensive") &&
        (scope === "transcript" || scope === "all" || scope === "study")
          ? sections.map((sec) => (
              <SectionCard
                key={sec.id}
                section={sec}
                lazy={false}
                showOfftopic={includeOfftopic}
                showAnnotations={true}
                showTimes={true}
              />
            ))
          : null}

        {dynamicSheet?.glossary?.length ? (
          <section className="lecture-section-card">
            <h2 className="lecture-section-heading">
              📖 قاموس التعريفات والمصطلحات الطبية (في نهاية الكتاب)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {dynamicSheet.glossary.map((g, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 flex flex-col gap-1"
                >
                  <span
                    dir="ltr"
                    className="inline-block self-start rounded-md bg-teal-500/10 px-2 py-0.5 font-mono font-bold text-teal-700 dark:text-teal-300"
                  >
                    {g.term}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    <BidiText text={g.ar} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}

export default PrintView;
