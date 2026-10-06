import React, { useState } from "react";
import { BookOpen, Eye, CheckCircle2, XCircle } from "lucide-react";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { cn } from "@/lib/utils";

export const DEMO_TABS = [
  { id: "plate", labelAr: "قارئ الملخصات", labelEn: "Summary Reader" },
  { id: "declassify", labelAr: "الاستدعاء النشط", labelEn: "Active Recall" },
];

const COMPARISON_ROWS = [
  {
    criteriaAr: "تغطية ملفات المحاضرات الضخمة (100–500 صفحة)",
    criteriaEn: "100–500 Page Lecture Coverage",
    bfAr: "معمارية هرمية (Map-Reduce + قفل مصطلحات) بضمان تغطية >= 95%",
    bfEn: "Hierarchical Map-Reduce + Glossary Lock (>= 95% coverage)",
    notesAr: "تكدس مئات الصفحات بدون فهرسة تفاعلية",
    chatgptAr: "يقتطع منتصف الملف ويختصر الفصول الطويلة بصمت",
  },
  {
    criteriaAr: "تدقيق الأرقام والجرعات الطبية (Dosage Safety)",
    criteriaEn: "Medical Dosage & Number Verification",
    bfAr: "مدقق مزدوج من عائلة نماذج ثانية (Cross-Family Verifier) + توثيق الصفحة",
    bfEn: "Cross-Family Verifier + Source Page Reference",
    notesAr: "يدوي وعرضة لأخطاء النقل",
    chatgptAr: "عرضة للهلوسة الرقمية بدون مطابقة المصدر",
  },
  {
    criteriaAr: "طريقة الشرح للمفاهيم الصعبة",
    criteriaEn: "Foundational Pedagogy",
    bfAr: "شرح من الأساس بصندوق تمهيدي بالعربي + المصطلح الإنجليزي في مكانه",
    bfEn: "Foundational Bilingual with Prerequisite Box",
    notesAr: "سرد جاف يفترض أنك حافظ الأساسيات مسبقاً",
    chatgptAr: "ترجمة حرفية أو نقاط سطحية عامة",
  },
  {
    criteriaAr: "الاستدعاء النشط والذاكرة طويلة المدى",
    criteriaEn: "Active Recall & Long-Term Memory",
    bfAr: "إخفاء تفاعلي للمعلومات داخل الملخص + خوارزمية FSRS v4.5 للمراجعة",
    bfEn: "Interactive Active Recall + FSRS v4.5 Spaced Repetition",
    notesAr: "قراءة سلبية تتبخر قبل الامتحان",
    chatgptAr: "لا يوجد جدول مراجعة متباعدة أو تتبع نسيان",
  },
];

export default function LandingAtlasShowcase({ locale = "ar" }) {
  const isAr = locale === "ar";
  const [declassifyActive, setDeclassifyActive] = useState(false);
  const [revealedItems, setRevealedItems] = useState({ d1: false, d2: false });

  return (
    <div className="space-y-8">
      {/* Live Interactive Reader Preview Card */}
      <LVCard padding="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-[#1C222B]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#22E58B]" />
              <h3 className="text-base font-bold text-[#F2F4F7]">
                {isAr
                  ? "معاينة حية لقارئ الملخصات الذكي"
                  : "Live Interactive Summary Reader Preview"}
              </h3>
              <LVBadge variant="accent">مدقق رقمياً 100%</LVBadge>
            </div>
            <p className="text-xs text-[#8B94A3]">
              {isAr
                ? "شرح تمهيدي من الأساس + الاحتفاظ بالمصطلحات الإنجليزية + وضع تسميع تفاعلي"
                : "Foundational explanation + preserved English terminology + interactive active recall"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeclassifyActive((v) => !v);
              setRevealedItems({ d1: false, d2: false });
            }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border transition-colors duration-150 shrink-0",
              declassifyActive
                ? "bg-[#22E58B] text-[#07090D] border-[#22E58B]"
                : "bg-[#131820] text-[#F2F4F7] border-[#1C222B] hover:border-[#28313E]"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {declassifyActive
                ? isAr
                  ? "إيقاف وضع التسميع"
                  : "Exit Recall Mode"
                : isAr
                ? "جرب وضع التسميع الذاتي"
                : "Try Active Recall Mode"}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Prerequisite Box */}
          <div className="rounded-xl bg-[#131820] border border-[#1C222B] p-4">
            <div className="text-xs font-bold text-[#22E58B] mb-1.5">
              {isAr
                ? "قبل ما تقرا (شرح تمهيدي من الأساس):"
                : "Prerequisite Foundation:"}
            </div>
            <p className="text-xs sm:text-sm text-[#F2F4F7]/90 leading-relaxed">
              خلية عضلة القلب في وقت الراحة تكون سالبة الشحنة من الداخل (
              <span dir="ltr" className="font-mono text-[#22E58B] font-semibold">
                -90 mV
              </span>
              ). أي دخول لأيونات موجبة مثل الصوديوم{" "}
              <span dir="ltr" className="font-mono text-[#F2F4F7]">
                Na+
              </span>{" "}
              أو الكالسيوم{" "}
              <span dir="ltr" className="font-mono text-[#F2F4F7]">
                Ca2+
              </span>{" "}
              يرفع الجهد الكهربائي ويطلق الانقباض.
            </p>
          </div>

          {/* Main Summary Paragraph with Interactive Recall */}
          <div className="rounded-xl bg-[#07090D] border border-[#1C222B] p-4 sm:p-5 space-y-3 text-sm leading-loose text-[#F2F4F7]">
            <p className="text-[#F2F4F7]">
              1. يتميز{" "}
              <span className="text-[#22E58B] font-semibold">
                طور الهضبة (Phase 2 Plateau)
              </span>{" "}
              في البطين بـ{" "}
              {declassifyActive && !revealedItems.d1 ? (
                <button
                  type="button"
                  onClick={() => setRevealedItems((p) => ({ ...p, d1: true }))}
                  className="px-2.5 py-0.5 mx-1 rounded-md bg-[#131820] border border-[#22E58B]/40 text-xs font-mono text-[#22E58B] hover:bg-[#22E58B]/10 transition-colors"
                >
                  [اضغط لكشف المعلومة]
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-[#22E58B]/10 text-[#22E58B] font-mono text-xs font-semibold">
                  دخول الكالسيوم البطيء عبر قنوات L-type Ca2+
                </span>
              )}{" "}
              وهي النقطة التي تستهدفها أدوية{" "}
              <span dir="ltr" className="font-mono text-[#F2F4F7] font-semibold">
                Calcium Channel Blockers
              </span>
              .
            </p>

            <p className="text-[#F2F4F7]">
              2. جرعة التحميل الوريدية القياسية لعقار{" "}
              <strong className="font-mono text-[#F2F4F7]">Amiodarone</strong> في
              الطوارئ هي{" "}
              {declassifyActive && !revealedItems.d2 ? (
                <button
                  type="button"
                  onClick={() => setRevealedItems((p) => ({ ...p, d2: true }))}
                  className="px-2.5 py-0.5 mx-1 rounded-md bg-[#131820] border border-[#22E58B]/40 text-xs font-mono text-[#22E58B] hover:bg-[#22E58B]/10 transition-colors"
                >
                  [اضغط لكشف الجرعة]
                </button>
              ) : (
                <span
                  dir="ltr"
                  className="px-2 py-0.5 rounded-md bg-[#F5A524]/15 text-[#F5A524] font-mono text-xs font-bold"
                >
                  150–300 mg IV bolus (ص 13)
                </span>
              )}
              .
            </p>
          </div>
        </div>
      </LVCard>

      {/* Clean Architectural Comparison Table */}
      <LVCard padding="p-6 sm:p-8" className="overflow-x-auto">
        <div className="mb-5">
          <h3 className="text-lg sm:text-xl font-bold text-[#F2F4F7]">
            {isAr
              ? "مقارنة مع المذكرات التقليدية و ChatGPT العادي"
              : "How Black Fighters Compares to Static Notes & Generic ChatGPT"}
          </h3>
        </div>

        <table className="w-full text-xs sm:text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[#1C222B] text-start">
              <th className="py-3 px-3 text-[#8B94A3] font-medium text-start">
                {isAr ? "المعيار" : "Criterion"}
              </th>
              <th className="py-3 px-4 text-[#22E58B] font-bold bg-[#131820] rounded-t-xl text-start">
                Black Fighters
              </th>
              <th className="py-3 px-3 text-[#8B94A3] font-medium text-start">
                {isAr ? "المذكرة التقليدية" : "Static Notes"}
              </th>
              <th className="py-3 px-3 text-[#8B94A3] font-medium text-start">
                {isAr ? "ChatGPT العادي" : "Generic ChatGPT"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C222B]">
            {COMPARISON_ROWS.map((row, i) => (
              <tr key={i}>
                <td className="py-3.5 px-3 font-semibold text-[#F2F4F7]">
                  {isAr ? row.criteriaAr : row.criteriaEn}
                </td>
                <td className="py-3.5 px-4 bg-[#131820]/50 text-[#F2F4F7] font-medium">
                  <span className="inline-flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22E58B] shrink-0 mt-0.5" />
                    <span>{isAr ? row.bfAr : row.bfEn}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-[#8B94A3]">
                  <span className="inline-flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#F0545B]/70 shrink-0 mt-0.5" />
                    <span>{row.notesAr}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-[#8B94A3]">
                  <span className="inline-flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#F0545B]/70 shrink-0 mt-0.5" />
                    <span>{row.chatgptAr}</span>
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
