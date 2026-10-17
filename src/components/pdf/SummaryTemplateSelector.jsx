import React from "react";
import {
  BookOpen,
  Zap,
  Table2,
  Check,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const CORE_TEMPLATES = [
  {
    id: "foundational_bilingual",
    badgeAr: "الأكثر اختياراً ✨",
    badgeEn: "Recommended ✨",
    titleAr: "شامل ومنظم (تغطية 100%)",
    titleEn: "Comprehensive & Structured (100%)",
    descAr: "يشرح كل فكرة وتعريف وآلية في المحاضرة بتسلسل منظم مع جداول مقارنة بدون ترك أي تفصيلة.",
    descEn: "Covers every concept, definition, mechanism, and comparison table without omitting any detail.",
    icon: BookOpen,
    ring: "border-cyan-500/60 bg-cyan-500/10",
    iconCls: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  },
  {
    id: "atlas_cram",
    badgeAr: "سريع ومركز ⚡",
    badgeEn: "High-Yield ⚡",
    titleAr: "كبسولات ليلة الامتحان",
    titleEn: "Exam Night Cram Capsules",
    descAr: "يركز مباشرة على مواضع الأسئلة المتكررة، الأرقام الهامة، الفخاخ الامتحانية، والزبدة المركزة.",
    descEn: "Focuses directly on high-yield exam questions, key numbers, clinical pearls, and common traps.",
    icon: Zap,
    ring: "border-amber-500/60 bg-amber-500/10",
    iconCls: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  },
  {
    id: "comparison_classification",
    badgeAr: "مقارنات 📊",
    badgeEn: "Tables 📊",
    titleAr: "جداول وتصنيفات ومقارنات",
    titleEn: "Comparison Tables & Classifications",
    descAr: "يحوّل الفروقات والتقسيمات والتشخيص التفريقي والقوانين إلى جداول منظمة سهلة الحفظ.",
    descEn: "Transforms differentials, classifications, and formulas into structured, easy-to-memorize tables.",
    icon: Table2,
    ring: "border-purple-500/60 bg-purple-500/10",
    iconCls: "bg-purple-500/15 text-purple-300 border-purple-400/30",
  },
];

export default function SummaryTemplateSelector({
  value,
  selectedTemplate,
  onChange,
  onSelectTemplate,
}) {
  const { locale } = useLocale();
  const isEn = locale === "en";

  const rawActive = value || selectedTemplate || "foundational_bilingual";
  // Map any legacy auto-detected template id onto one of the 3 clear choices for visual clarity
  const activeTemplate = CORE_TEMPLATES.some((t) => t.id === rawActive)
    ? rawActive
    : rawActive === "exam_revision_sheet"
      ? "atlas_cram"
      : "foundational_bilingual";
  const handleTemplateChange = onChange || onSelectTemplate;

  return (
    <div className="space-y-3" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-muted-foreground">
          {isEn ? "2. Choose Summary Focus:" : "٢. اختر طريقة التلخيص:"}
        </span>
        <span className="text-[11px] font-bold text-primary/90">
          {isEn ? "Pages & specialty auto-configured ⚡" : "عدد الصفحات والتخصص يُضبط تلقائياً ⚡"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {CORE_TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          const active = activeTemplate === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTemplateChange?.(tpl.id)}
              className={`group relative flex flex-col justify-between gap-2.5 rounded-2xl border p-3.5 text-start transition-colors cursor-pointer ${
                active
                  ? tpl.ring
                  : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tpl.iconCls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-foreground/80">
                  {isEn ? tpl.badgeEn : tpl.badgeAr}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-xs sm:text-sm font-black text-foreground">
                    {isEn ? tpl.titleEn : tpl.titleAr}
                  </p>
                  {active && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {isEn ? tpl.descEn : tpl.descAr}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
