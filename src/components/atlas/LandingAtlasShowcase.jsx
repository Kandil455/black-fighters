import React, { useState } from "react";
import { BookOpen, Eye, CheckCircle2, XCircle } from "lucide-react";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { cn } from "@/lib/utils";

export const DEMO_TABS = [
  { id: "plate", labelAr: "قارئ الملخصات", labelEn: "Summary Reader" },
  { id: "declassify", labelAr: "اختبر ذاكرتك", labelEn: "Self-Test Mode" },
];

// Uses Cross-Family Verifier behind the scenes while presenting clear, simple student language
const COMPARISON_ROWS = [
  {
    criteriaAr: "تلخيص المحاضرات والكتب الكبيرة (حتى 1,000 صفحة)",
    criteriaEn: "Summarizing Large Lectures & Books (up to 1,000 pages)",
    bfAr: "يلخص المحاضرة أو الكتاب فصل بفصل بالكامل من غير ما يطير أي معلومة أو فقرة في النص",
    bfEn: "Summarizes every chapter in full without skipping middle pages",
    notesAr: "ورق كتير متكدس وصعب تلاقي فيه المعلومة وقت الزنقة",
    notesEn: "Hundreds of cluttered pages with no interactive search",
    chatgptAr: "بيختصر الكلام المهم ويطير نص الفصول الطويلة من غير ما يقولك",
    chatgptEn: "Skips middle chapters and oversimplifies long files",
  },
  {
    criteriaAr: "دقة الأرقام والجرعات الطبية",
    criteriaEn: "Medical Dosage & Number Accuracy",
    bfAr: "مراجعة مزدوجة لكل رقم وجرعة طبية مع كتابة رقم الصفحة الأصلية عشان تذاكر وانت مطمن",
    bfEn: "Double-checked dosages and numbers with exact source page numbers",
    notesAr: "ممكن يكون فيها أخطاء نقل أو كتابة يدوية",
    notesEn: "Prone to manual typing and copying mistakes",
    chatgptAr: "ممكن يألف أرقام أو جرعات مش موجودة في محاضرتك أصلاً",
    chatgptEn: "Can hallucinate numbers not in your lecture",
  },
  {
    criteriaAr: "طريقة الشرح وتثبيت المعلومة للامتحان",
    criteriaEn: "Clear Explanation & Exam Retention",
    bfAr: "شرح مبسّط من الصفر بالعربي مع حفظ المصطلحات الإنجليزية + زرار إخفاء الإجابات عشان تسمّع لنفسك",
    bfEn: "Simple Arabic explanation with English terms + one-click answer masking for self-testing",
    notesAr: "قراءة عادية بتتنسي بسرعة قبل الامتحان",
    notesEn: "Passive reading that fades before exam day",
    chatgptAr: "ترجمة حرفية مملة ومفيش نظام مراجعة أو تسميع",
    chatgptEn: "Literal translation with no self-testing or review schedule",
  },
];

export default function LandingAtlasShowcase({ locale = "ar" }) {
  const isAr = locale !== "en";
  const [declassifyActive, setDeclassifyActive] = useState(false);
  const [revealedItems, setRevealedItems] = useState({ d1: false, d2: false });

  return (
    <div className="space-y-8">
      {/* Live Interactive Reader Preview Card */}
      <LVCard padding="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <BookOpen className="w-4 h-4 text-[#19f08c]" />
              <h3 className="text-base font-semibold text-[#f5f7fa]">
                {isAr
                  ? "شوف شكل الملخص التفاعلي بنفسك"
                  : "Live Interactive Summary Preview"}
              </h3>
              <LVBadge variant="emerald">
                {isAr ? "مراجع بالكامل 100%" : "100% Verified"}
              </LVBadge>
            </div>
            <p className="text-xs text-[#9aa4b2]">
              {isAr
                ? "شرح تمهيدي بسيط بالعربي + المصطلحات الإنجليزية في مكانها + زرار إخفاء المعلومات عشان تختبر نفسك"
                : "Simple foundational explanation + English terms preserved + interactive self-testing"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeclassifyActive((v) => !v);
              setRevealedItems({ d1: false, d2: false });
            }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 border transition-colors duration-150 shrink-0 cursor-pointer",
              declassifyActive
                ? "bg-[#19f08c] text-[#03150c] border-[#19f08c]"
                : "bg-white/[0.04] text-[#f5f7fa] border-white/10 hover:border-[#19f08c]/45"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {declassifyActive
                ? isAr
                  ? "إظهار كل المعلومات"
                  : "Show All Answers"
                : isAr
                ? "جرّب تخفي المعلومات وتسمّع لنفسك"
                : "Hide Key Terms to Test Yourself"}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Prerequisite Box */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
            <div className="text-xs font-semibold text-[#19f08c] mb-1.5">
              {isAr
                ? "فكرة أساسية سريعة قبل ما تبدأ:"
                : "Quick Foundation Before You Read:"}
            </div>
            <p className="text-xs sm:text-sm text-[#f5f7fa]/90 leading-relaxed">
              خلية عضلة القلب في وقت الراحة بتكون شحنتها سالبة من الداخل (
              <span dir="ltr" className="font-mono text-[#19f08c] font-semibold">
                -90 mV
              </span>
              ). أول ما تدخل أيونات موجبة زي الصوديوم{" "}
              <span dir="ltr" className="font-mono text-[#f5f7fa]">
                Na+
              </span>{" "}
              أو الكالسيوم{" "}
              <span dir="ltr" className="font-mono text-[#f5f7fa]">
                Ca2+
              </span>{" "}
              الكهرباء بتعلى وتبدأ عضلة القلب تنقبض.
            </p>
          </div>

          {/* Main Summary Paragraph with Interactive Recall */}
          <div className="rounded-xl bg-[#05070a]/80 border border-white/[0.08] p-4 sm:p-5 space-y-3 text-sm leading-loose text-[#f5f7fa]">
            <p className="text-[#f5f7fa]">
              1. يتميز{" "}
              <span className="text-[#19f08c] font-semibold">
                طور الهضبة (Phase 2 Plateau)
              </span>{" "}
              في البطين بـ{" "}
              {declassifyActive && !revealedItems.d1 ? (
                <button
                  type="button"
                  onClick={() => setRevealedItems((p) => ({ ...p, d1: true }))}
                  className="px-2.5 py-0.5 mx-1 rounded-md bg-[#19f08c]/10 border border-dashed border-[#19f08c]/50 text-xs font-mono text-[#19f08c] hover:bg-[#19f08c]/20 transition-colors cursor-pointer"
                >
                  [اضغط هنا لإظهار الإجابة]
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-[#19f08c]/12 text-[#19f08c] font-mono text-xs font-semibold">
                  دخول الكالسيوم البطيء عبر قنوات L-type Ca2+
                </span>
              )}{" "}
              وهي النقطة اللي بتشتغل عليها أدوية{" "}
              <span dir="ltr" className="font-mono text-[#f5f7fa] font-semibold">
                Calcium Channel Blockers
              </span>
              .
            </p>

            <p className="text-[#f5f7fa]">
              2. الجرعة الوريدية المعتادة لدواء{" "}
              <strong className="font-mono text-[#f5f7fa]">Amiodarone</strong> في
              الطوارئ هي{" "}
              {declassifyActive && !revealedItems.d2 ? (
                <button
                  type="button"
                  onClick={() => setRevealedItems((p) => ({ ...p, d2: true }))}
                  className="px-2.5 py-0.5 mx-1 rounded-md bg-[#19f08c]/10 border border-dashed border-[#19f08c]/50 text-xs font-mono text-[#19f08c] hover:bg-[#19f08c]/20 transition-colors cursor-pointer"
                >
                  [اضغط هنا لإظهار الجرعة]
                </button>
              ) : (
                <span
                  dir="ltr"
                  className="px-2 py-0.5 rounded-md bg-[#f5b83d]/15 text-[#f5b83d] font-mono text-xs font-semibold"
                >
                  150–300 mg IV bolus (صفحة 13)
                </span>
              )}
              .
            </p>
          </div>
        </div>
      </LVCard>

      {/* Clean Comparison Table */}
      <LVCard padding="p-6 sm:p-8" className="overflow-x-auto">
        <div className="mb-5">
          <h3 className="text-lg sm:text-xl font-semibold text-[#f5f7fa]">
            {isAr
              ? "ليه الطلاب بيفضّلوا Black Fighters عن المذكرات العادية و ChatGPT؟"
              : "Why Students Choose Black Fighters Over Static Notes & ChatGPT"}
          </h3>
        </div>

        <table className="w-full text-xs sm:text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-start">
              <th className="py-3 px-3 text-[#9aa4b2] font-medium text-start">
                {isAr ? "وجه المقارنة" : "Feature"}
              </th>
              <th className="py-3 px-4 text-[#19f08c] font-semibold bg-[#19f08c]/[0.06] rounded-t-xl text-start">
                {isAr ? "منصة Black Fighters" : "Black Fighters"}
              </th>
              <th className="py-3 px-3 text-[#9aa4b2] font-medium text-start">
                {isAr ? "المذكرات العادية" : "Traditional Notes"}
              </th>
              <th className="py-3 px-3 text-[#9aa4b2] font-medium text-start">
                {isAr ? "ChatGPT العادي" : "Generic ChatGPT"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.07]">
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={i}>
                <td className="py-3.5 px-3 font-semibold text-[#f5f7fa]">
                  {isAr ? row.criteriaAr : row.criteriaEn}
                </td>
                <td className="py-3.5 px-4 bg-[#19f08c]/[0.03] text-[#f5f7fa] font-medium">
                  <span className="inline-flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#19f08c] shrink-0 mt-0.5" />
                    <span>{isAr ? row.bfAr : row.bfEn}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-[#9aa4b2]">
                  <span className="inline-flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#ff5d6c]/75 shrink-0 mt-0.5" />
                    <span>{isAr ? row.notesAr : row.notesEn}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-[#9aa4b2]">
                  <span className="inline-flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#ff5d6c]/75 shrink-0 mt-0.5" />
                    <span>{isAr ? row.chatgptAr : row.chatgptEn}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </LVCard>
    </div>
  );
}

