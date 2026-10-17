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
    criteriaAr: "تغطية ملفات المحاضرات الضخمة (100–1,000 صفحة)",
    criteriaEn: "100–1,000 Page Lecture Coverage",
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <BookOpen className="w-4 h-4 text-[#19f08c]" />
              <h3 className="text-base font-semibold text-[#f5f7fa]">
                {isAr
                  ? "معاينة حية لقارئ الأطلس V5 الذكي"
                  : "Live Interactive Atlas V5 Reader Preview"}
              </h3>
              <LVBadge variant="emerald">
                {isAr ? "مدقق رقمياً 100%" : "100% Verified"}
              </LVBadge>
            </div>
            <p className="text-xs text-[#9aa4b2]">
              {isAr
                ? "شرح تمهيدي من الأساس + الاحتفاظ بالمصطلحات الإنجليزية + وضع تسميع تفاعلي (Declassify)"
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
                  ? "إيقاف وضع التسميع"
                  : "Exit Recall Mode"
                : isAr
                ? "جرّب وضع التسميع الذاتي (Declassify)"
                : "Try Active Recall Mode"}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Prerequisite Box */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
            <div className="text-xs font-semibold text-[#19f08c] mb-1.5">
              {isAr
                ? "قبل ما تقرا (شرح تمهيدي من الأساس):"
                : "Prerequisite Foundation:"}
            </div>
            <p className="text-xs sm:text-sm text-[#f5f7fa]/90 leading-relaxed">
              خلية عضلة القلب في وقت الراحة تكون سالبة الشحنة من الداخل (
              <span dir="ltr" className="font-mono text-[#19f08c] font-semibold">
                -90 mV
              </span>
              ). أي دخول لأيونات موجبة مثل الصوديوم{" "}
              <span dir="ltr" className="font-mono text-[#f5f7fa]">
                Na+
              </span>{" "}
              أو الكالسيوم{" "}
              <span dir="ltr" className="font-mono text-[#f5f7fa]">
                Ca2+
              </span>{" "}
              يرفع الجهد الكهربائي ويطلق الانقباض.
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
                  [اضغط لكشف المعلومة]
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-[#19f08c]/12 text-[#19f08c] font-mono text-xs font-semibold">
                  دخول الكالسيوم البطيء عبر قنوات L-type Ca2+
                </span>
              )}{" "}
              وهي النقطة التي تستهدفها أدوية{" "}
              <span dir="ltr" className="font-mono text-[#f5f7fa] font-semibold">
                Calcium Channel Blockers
              </span>
              .
            </p>

            <p className="text-[#f5f7fa]">
              2. جرعة التحميل الوريدية القياسية لعقار{" "}
              <strong className="font-mono text-[#f5f7fa]">Amiodarone</strong> في
              الطوارئ هي{" "}
              {declassifyActive && !revealedItems.d2 ? (
                <button
                  type="button"
                  onClick={() => setRevealedItems((p) => ({ ...p, d2: true }))}
                  className="px-2.5 py-0.5 mx-1 rounded-md bg-[#19f08c]/10 border border-dashed border-[#19f08c]/50 text-xs font-mono text-[#19f08c] hover:bg-[#19f08c]/20 transition-colors cursor-pointer"
                >
                  [اضغط لكشف الجرعة]
                </button>
              ) : (
                <span
                  dir="ltr"
                  className="px-2 py-0.5 rounded-md bg-[#f5b83d]/15 text-[#f5b83d] font-mono text-xs font-semibold"
                >
                  150–300 mg IV bolus (✓ p.13)
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
          <h3 className="text-lg sm:text-xl font-semibold text-[#f5f7fa]">
            {isAr
              ? "مقارنة مع المذكرات التقليدية و ChatGPT العادي"
              : "How Black Fighters Compares to Static Notes & Generic ChatGPT"}
          </h3>
        </div>

        <table className="w-full text-xs sm:text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-white/[0.08] text-start">
              <th className="py-3 px-3 text-[#9aa4b2] font-medium text-start">
                {isAr ? "المعيار" : "Criterion"}
              </th>
              <th className="py-3 px-4 text-[#19f08c] font-semibold bg-[#19f08c]/[0.06] rounded-t-xl text-start">
                Black Fighters × LineVault
              </th>
              <th className="py-3 px-3 text-[#9aa4b2] font-medium text-start">
                {isAr ? "المذكرة التقليدية" : "Static Notes"}
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
                    <span>{row.notesAr}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-[#9aa4b2]">
                  <span className="inline-flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-[#ff5d6c]/75 shrink-0 mt-0.5" />
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
