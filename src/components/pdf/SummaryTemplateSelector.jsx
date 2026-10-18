import React from "react";
import {
  Zap,
  Layers,
  BookOpenCheck,
  Check,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const SIZE_CARDS = [
  {
    id: "atlas_cram",
    tierKey: "small",
    badgeAr: "مركّز وسريع ⚡",
    badgeEn: "Focused & Concise ⚡",
    titleAr: "تلخيص صغير",
    titleEn: "Small Summary",
    descAr:
      "يجيب كل المهم في المحاضرة: يستخرج جميع الفيتشرز، التعريفات، الأرقام، والقوانين في نقاط مركّزة بدون اختصار مخل.",
    descEn:
      "Captures every essential feature, definition, number, and formula in concise, high-yield bullet points.",
    icon: Zap,
    accent: "border-amber-500/40 bg-amber-500/5 text-amber-300",
    activeRing:
      "border-amber-400 bg-amber-500/15 shadow-[0_0_24px_rgba(245,158,11,0.18)]",
    pillBg: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  },
  {
    id: "foundational_bilingual",
    tierKey: "medium",
    badgeAr: "متوازن ومنظم ✨",
    badgeEn: "Balanced & Structured ✨",
    titleAr: "تلخيص متوسط",
    titleEn: "Medium Summary",
    descAr:
      "شرح منظم ومتوازن لكل محاور المحاضرة، الآليات، الخصائص (Features)، والأمثلة في فقرات ونقاط واضحة.",
    descEn:
      "Structured, balanced explanation of all lecture concepts, mechanisms, features, and examples.",
    icon: Layers,
    accent: "border-cyan-500/40 bg-cyan-500/5 text-cyan-300",
    activeRing:
      "border-cyan-400 bg-cyan-500/15 shadow-[0_0_24px_rgba(6,182,212,0.2)]",
    pillBg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
  },
  {
    id: "complete_study_guide",
    tierKey: "large",
    badgeAr: "شامل بالكامل 👑",
    badgeEn: "Comprehensive Guide 👑",
    titleAr: "تلخيص كبير",
    titleEn: "Large Summary",
    descAr:
      "يستوعب المحاضرة بالكامل بطريقة منظمة ومرتبة في أبواب ونقاط وجداول مقارنة بدون ترك أي تفصيلة صغيرة أو كبيرة.",
    descEn:
      "Covers the entire lecture in organized chapters, bullet points, and comparison tables without omitting any detail.",
    icon: BookOpenCheck,
    accent: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300",
    activeRing:
      "border-emerald-400 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.22)]",
    pillBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  },
];

function normalizeSelectedId(val) {
  if (!val) return "complete_study_guide";
  if (
    val === "small" ||
    val === "summary_small" ||
    val === "atlas_cram" ||
    val === "exam_capsule" ||
    val === "quick_review"
  ) {
    return "atlas_cram";
  }
  if (
    val === "medium" ||
    val === "summary_medium" ||
    val === "foundational_bilingual" ||
    val === "standard_study"
  ) {
    return "foundational_bilingual";
  }
  if (
    val === "large" ||
    val === "summary_large" ||
    val === "complete_study_guide" ||
    val === "comprehensive" ||
    val === "exhaustive_200" ||
    val === "ultra_multi_agent"
  ) {
    return "complete_study_guide";
  }
  return "complete_study_guide";
}

export default function SummaryTemplateSelector({
  value,
  onChange,
  template,
  setTemplate,
  onSelectImmediate,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const currentRaw = value ?? template ?? "complete_study_guide";
  const resolvedValue = normalizeSelectedId(currentRaw);

  const handleSelect = (id) => {
    onChange?.(id);
    setTemplate?.(id);
    onSelectImmediate?.(id);
  };

  return (
    <div className="@container space-y-2.5 mt-4" dir={dir}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-black text-foreground/90">
          {isEn ? "2. Choose Summary Size" : "٢. اختر حجم التلخيص المطلوب"}
        </p>
        <span className="text-[11px] font-bold text-primary">
          {isEn ? "Every key feature preserved" : "شامل كل المهم والفيتشرز"}
        </span>
      </div>

      <div className="grid grid-cols-1 @[560px]:grid-cols-3 gap-2.5">
        {SIZE_CARDS.map((tpl) => {
          const Icon = tpl.icon;
          const active = resolvedValue === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelect(tpl.id)}
              className={`relative overflow-hidden text-start p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 cursor-pointer group ${
                active
                  ? tpl.activeRing
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
              }`}
            >
              <div className="space-y-2 w-full min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${tpl.accent}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-black text-foreground leading-tight truncate">
                        {isEn ? tpl.titleEn : tpl.titleAr}
                      </span>
                      <span
                        className={`inline-flex items-center mt-1 text-[10px] leading-none px-2 py-1 rounded-md font-extrabold border max-w-full truncate ${tpl.pillBg}`}
                      >
                        {isEn ? tpl.badgeEn : tpl.badgeAr}
                      </span>
                    </div>
                  </div>

                  {active && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
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
