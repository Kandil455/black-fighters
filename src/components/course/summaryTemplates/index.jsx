import React from "react";
import { BookOpenCheck, GraduationCap, ListChecks, Microscope, Target, Trophy } from "lucide-react";
import { Block, BlockList, Bidi, Rich, SectionNumber } from "./primitives";

/**
 * The four designed summary templates.
 *
 * Each is a LAYOUT over the same v3 document model — no schema change, so the
 * pipeline, validators, revision history and exports are untouched.
 *
 * Shared shell: a cover (title + one-line meta), the overview, numbered sections,
 * then the conclusion. What differs is how a section reads:
 *   foundational_bilingual → teaching: prerequisite bridge, English rail, Arabic
 *                            explanation, glossary chips
 *   atlas_cram             → cram sheet: dense, warnings first, tight tables
 *   comparison_classification → contrast: tables lead, prose supports
 *   qa_tutor               → active recall: question cards with answers
 */

function Cover({ document: doc, Icon, kicker, accent = "text-primary", children }) {
  const sourcePages = Array.isArray(doc?.metadata?.sourceRefs) ? doc.metadata.sourceRefs : [];
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border bg-[#0E1117] p-6 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.07] blur-2xl"
      />
      <div className="relative flex items-start gap-4">
        <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#131820] ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">{kicker}</p>
          <h1 className="mt-1.5 text-xl font-black leading-snug text-foreground sm:text-2xl">
            <Rich value={doc?.title} />
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpenCheck className="h-3.5 w-3.5" />
              {(doc?.sections || []).length} قسم
            </span>
            {sourcePages.length > 0 && (
              <span className="font-mono">
                المصادر: {sourcePages.slice(0, 10).join(" · ")}{sourcePages.length > 10 ? " …" : ""}
              </span>
            )}
          </div>
          {children}
        </div>
      </div>
    </header>
  );
}

function Conclusion({ blocks, label = "الخلاصة" }) {
  if (!Array.isArray(blocks) || !blocks.length) return null;
  return (
    <section className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-primary">
        <Trophy className="h-4 w-4" /> {label}
      </h2>
      <BlockList blocks={blocks} />
    </section>
  );
}

// ───────────────────────────── 1. Foundational bilingual ────────────────────
export function FoundationalTemplate({ document: doc }) {
  return (
    <div className="space-y-5" dir="rtl">
      <Cover document={doc} Icon={BookOpenCheck} kicker="شرح من الأساس · الأطلس V5">
        <p className="mt-3 text-[12.5px] leading-7 text-muted-foreground">
          كل قسم بيبدأ بمقدمة تأسيسية، بعدها نقاط بالإنجليزي، ثم شرح عربي مفصّل وقاموس مصطلحات.
        </p>
      </Cover>

      {(doc?.overview || []).length > 0 && (
        <section className="rounded-3xl border border-border bg-[#0E1117] p-5">
          <h2 className="mb-3 text-sm font-black text-foreground">نظرة سريعة</h2>
          <BlockList blocks={doc.overview} />
        </section>
      )}

      {(doc?.sections || []).map((section, index) => {
        const blocks = Array.isArray(section.blocks) ? section.blocks : [];
        const bridge = blocks.filter((b) => b.role === "example" || b.type === "quote");
        const english = blocks.filter((b) => b.role === "english_points");
        const arabic = blocks.filter((b) => b.role === "arabic_explanation");
        const glossary = blocks.filter((b) => b.role === "definition" || b.type === "table");
        const rest = blocks.filter(
          (b) => ![...bridge, ...english, ...arabic, ...glossary].includes(b),
        );
        return (
          <section key={section.id || index} className="rounded-3xl border border-border bg-[#0E1117] p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
              <SectionNumber index={index} />
              <h2 className="min-w-0 flex-1 text-base font-black leading-snug text-foreground">
                <Rich value={section.title} />
              </h2>
            </div>
            <div className="space-y-4">
              <BlockList blocks={bridge} />
              {english.length > 0 && (
                <div className="rounded-2xl border border-sky-400/25 bg-sky-400/[0.05] p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-sky-300">Study points</p>
                  <div dir="ltr" className="text-start">
                    <BlockList blocks={english} />
                  </div>
                </div>
              )}
              <BlockList blocks={arabic} />
              <BlockList blocks={rest} />
              {glossary.length > 0 && (
                <div className="rounded-2xl border border-violet-400/25 bg-violet-400/[0.04] p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">قاموس المصطلحات</p>
                  <BlockList blocks={glossary} />
                </div>
              )}
            </div>
          </section>
        );
      })}

      <Conclusion blocks={doc?.conclusion} />
    </div>
  );
}

// ───────────────────────────── 2. Atlas cram sheet ──────────────────────────
export function CramTemplate({ document: doc }) {
  return (
    <div className="space-y-4" dir="rtl">
      <Cover document={doc} Icon={Target} kicker="برشامة ليلة الامتحان · الأطلس Cram">
        <p className="mt-3 text-[12.5px] leading-7 text-muted-foreground">
          كثافة عالية: الأرقام والجرعات والتحذيرات الأول، وبعدها جداول المقارنة والمفاهيم.
        </p>
      </Cover>

      {(doc?.overview || []).length > 0 && (
        <section className="rounded-2xl border border-border bg-[#0E1117] p-4">
          <BlockList blocks={doc.overview} compact />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(doc?.sections || []).map((section, index) => (
          <section key={section.id || index} className="rounded-2xl border border-border bg-[#0E1117] p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
              <SectionNumber index={index} className="h-7 w-7" />
              <h2 className="min-w-0 flex-1 truncate text-[13.5px] font-black text-foreground">
                <Rich value={section.title} />
              </h2>
            </div>
            <div className="space-y-2.5">
              <BlockList blocks={section.blocks} compact />
            </div>
          </section>
        ))}
      </div>

      <Conclusion blocks={doc?.conclusion} label="آخر حاجة قبل الامتحان" />
    </div>
  );
}

// ───────────────────────────── 3. Comparison & classification ───────────────
export function ComparisonTemplate({ document: doc }) {
  return (
    <div className="space-y-5" dir="rtl">
      <Cover document={doc} Icon={ListChecks} kicker="مقارنات وتصنيفات" accent="text-sky-300">
        <p className="mt-3 text-[12.5px] leading-7 text-muted-foreground">
          الفروق جنب بعض في جداول واضحة — مناسب للمواد اللي الامتحان فيها بيسأل «إيه الفرق بين…».
        </p>
      </Cover>

      {(doc?.sections || []).map((section, index) => {
        const blocks = Array.isArray(section.blocks) ? section.blocks : [];
        const tables = blocks.filter((b) => b.type === "table");
        const rest = blocks.filter((b) => b.type !== "table");
        return (
          <section key={section.id || index} className="rounded-3xl border border-border bg-[#0E1117] p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <SectionNumber index={index} className="border-sky-400/30 bg-sky-400/10 text-sky-300" />
              <h2 className="min-w-0 flex-1 text-base font-black text-foreground">
                <Rich value={section.title} />
              </h2>
            </div>
            <BlockList blocks={tables} />
            <BlockList blocks={rest} className="mt-3" />
          </section>
        );
      })}

      <Conclusion blocks={doc?.conclusion} />
    </div>
  );
}

// ───────────────────────────── 4. Q&A tutor (active recall) ─────────────────
export function QaTemplate({ document: doc }) {
  let questionIndex = 0;
  return (
    <div className="space-y-5" dir="rtl">
      <Cover document={doc} Icon={GraduationCap} kicker="استدعاء نشط · سؤال وجواب" accent="text-emerald-300">
        <p className="mt-3 text-[12.5px] leading-7 text-muted-foreground">
          غطّي الإجابة وحاول تفتكرها الأول، وبعدين اكشفها — دي أسرع طريقة لتثبيت المعلومة.
        </p>
      </Cover>

      {(doc?.sections || []).map((section, index) => {
        const blocks = Array.isArray(section.blocks) ? section.blocks : [];
        const pairs = [];
        for (let i = 0; i < blocks.length; i += 1) {
          const block = blocks[i];
          if (block?.role === "question") {
            const next = blocks[i + 1];
            pairs.push({ q: block, a: next?.role === "answer" ? next : null });
            if (next?.role === "answer") i += 1;
          }
        }
        const leftovers = blocks.filter((b) => b.role !== "question" && b.role !== "answer");
        return (
          <section key={section.id || index} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-muted-foreground">
              <SectionNumber index={index} className="h-7 w-7" />
              <Rich value={section.title} />
            </h2>
            {pairs.map((pair, pairIndex) => {
              questionIndex += 1;
              return (
                <details
                  key={pair.q?.id || pairIndex}
                  className="group rounded-2xl border border-border bg-[#0E1117] p-4 open:border-primary/30"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 font-mono text-[11px] font-black text-emerald-300">
                      {questionIndex}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-bold leading-7 text-foreground">
                      <Rich value={pair.q?.content ?? pair.q} />
                    </span>
                    <span className="shrink-0 rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground group-open:hidden">
                      اكشف
                    </span>
                  </summary>
                  {pair.a && (
                    <div className="mt-3 border-t border-border pt-3 text-[13.5px] leading-7 text-muted-foreground">
                      <Block block={pair.a} />
                    </div>
                  )}
                </details>
              );
            })}
            <BlockList blocks={leftovers} />
          </section>
        );
      })}

      <Conclusion blocks={doc?.conclusion} />
    </div>
  );
}

// ───────────────────────────── 5. Complete study guide ──────────────────────
export function CompleteGuideTemplate({ document: doc }) {
  return (
    <div className="space-y-5" dir="rtl">
      <Cover document={doc} Icon={Microscope} kicker="دليل شامل" accent="text-cyan-300">
        <p className="mt-3 text-[12.5px] leading-7 text-muted-foreground">
          تغطية كاملة: حقائق، تعريفات، أمثلة وقوانين بترتيب منطقي.
        </p>
      </Cover>

      {(doc?.overview || []).length > 0 && (
        <section className="rounded-3xl border border-border bg-[#0E1117] p-5">
          <h2 className="mb-3 text-sm font-black text-foreground">نظرة عامة</h2>
          <BlockList blocks={doc.overview} />
        </section>
      )}

      {(doc?.sections || []).map((section, index) => (
        <section key={section.id || index} className="rounded-3xl border border-border bg-[#0E1117] p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <SectionNumber index={index} className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300" />
            <h2 className="min-w-0 flex-1 text-base font-black text-foreground">
              <Rich value={section.title} />
            </h2>
          </div>
          <BlockList blocks={section.blocks} />
        </section>
      ))}

      <Conclusion blocks={doc?.conclusion} />
    </div>
  );
}

export { Bidi };
