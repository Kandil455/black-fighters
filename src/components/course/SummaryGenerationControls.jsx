import React, { useEffect } from "react";
import {
  FileText,
  Sparkles,
  Table2,
  Stethoscope,
  Cpu,
  GraduationCap,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SUMMARY_STYLE_LIST = [
  {
    id: "standard",
    label: "متوازن وشامل",
    hint: "تغطية متوازنة لكل أفكار المحاضرة في بطاقات وجداول",
    badge: "الموصى به",
  },
  {
    id: "condensed",
    label: "مختصر ومركز",
    hint: "أهم النقاط والتعريفات بدون إطالة",
    badge: "سريع",
  },
  {
    id: "detailed",
    label: "تفصيلي عميق",
    hint: "شرح وافٍ لكل فقرة مع أمثلة وتفسيرات",
    badge: "شامل",
  },
  {
    id: "exam_capsules",
    label: "كبسولات امتحانية",
    hint: "مواضع الأسئلة المتكررة والأرقام والتركات",
    badge: "امتحان",
  },
  {
    id: "comparisons",
    label: "جداول ومقارنات",
    hint: "يركز على الفروقات والتصنيفات في جداول",
    badge: "مقارنات",
  },
];

export function estimateSmartPages(textLength = 0, style = "standard") {
  const chars = Math.max(800, Number(textLength) || 2400);
  const base = Math.max(2, Math.min(80, Math.round(chars / 2000)));
  if (style === "condensed" || style === "exam_capsules") return Math.max(2, Math.round(base * 0.7));
  if (style === "detailed") return Math.min(100, Math.round(base * 1.35));
  return base;
}

export const SUMMARY_DOMAINS = [
  {
    id: "clinical",
    label: "طبي وسريري (Clinical & OSCE)",
    hint: "يركز على الأعراض، التشخيص التفريقي، الأدوية، وتركات الامتحانات السريرية",
    icon: Stethoscope,
    promptAddon:
      "ركز على الجوانب السريرية والتشخيص التفريقي (Differential Diagnosis) والعلاج (Management) والتنبيهات الحرجة (Red Flags) مع إبراز المصطلحات الطبية الإنجليزية.",
  },
  {
    id: "engineering",
    label: "هندسي وقوانين (Formulas & Systems)",
    hint: "يبرز المعادلات، خطوات الحل، المقارنات الهندسية، والمخططات",
    icon: Cpu,
    promptAddon:
      "أبرز جميع القوانين والمعادلات الرياضية والوحدات وخطوات الاستنتاج والتطبيق العملي في بطاقات وجداول منظمة.",
  },
  {
    id: "academic",
    label: "أكاديمي شامل (Comprehensive)",
    hint: "تغطية كاملة لكل فقرات المحاضرة مع جداول مقارنة وفهرس منظم",
    icon: GraduationCap,
    promptAddon:
      "قدم تغطية أكاديمية شاملة لكل المفاهيم والتعريفات مع تنظيمها في بطاقات وجداول مقارنة واضحة.",
  },
  {
    id: "exam_cram",
    label: "مكثف ليلة الامتحان (High-Yield Cram)",
    hint: "كبسولات سريعة لأهم مواضع الأسئلة والأرقام والنسب",
    icon: Flame,
    promptAddon:
      "كثف المحتوى في كبسولات امتحانية سريعة تركز على مواضع الأسئلة المتكررة، الأرقام الهامة، والاستثناءات.",
  },
];

export function getSelectedSummaryDomain() {
  try {
    const id = localStorage.getItem("bf_summary_domain") || "clinical";
    return SUMMARY_DOMAINS.find((d) => d.id === id) || SUMMARY_DOMAINS[0];
  } catch {
    return SUMMARY_DOMAINS[0];
  }
}

const QUICK_STYLES = [
  {
    id: "standard",
    label: "شامل ومنظم (تغطية 100%)",
    hint: "تغطية متكاملة لكل أفكار المحاضرة في بطاقات وجداول مقارنة",
    badge: "الموصى به ✨",
    icon: FileText,
  },
  {
    id: "exam_capsules",
    label: "كبسولات ليلة الامتحان",
    hint: "يركز على مواضع الأسئلة المتكررة، الأرقام الهامة، والتركات",
    badge: "سريع ⚡",
    icon: Sparkles,
  },
  {
    id: "comparisons",
    label: "جداول ومقارنات",
    hint: "يحوّل الفروقات والتقسيمات والتشخيص التفريقي إلى جداول",
    badge: "مقارنات 📊",
    icon: Table2,
  },
];

export default function SummaryGenerationControls({
  summaryStyle,
  setSummaryStyle,
  setMaxPages,
  textLength = 0,
  action,
}) {
  const recommended = estimateSmartPages(textLength, summaryStyle);

  useEffect(() => {
    setMaxPages?.(recommended);
  }, [recommended, setMaxPages]);

  const activeStyle = QUICK_STYLES.some((s) => s.id === summaryStyle)
    ? summaryStyle
    : summaryStyle === "condensed"
      ? "exam_capsules"
      : "standard";

  return (
    <div className="glass rounded-[1.25rem] p-4 sm:p-5 mb-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-[#f5f7fa]">
            اختر طريقة التلخيص المطلوبة ⚡
          </h4>
          <p className="text-xs text-[#9aa4b2] mt-0.5">
            يتم ضبط عدد الصفحات والتخصص تلقائياً لتغطية المحاضرة بالكامل (~
            <strong className="text-primary font-mono">{recommended} صفحة</strong>)
          </p>
        </div>
        {action && <div className="ms-auto">{action}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {QUICK_STYLES.map((s) => {
          const Icon = s.icon;
          const active = activeStyle === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSummaryStyle?.(s.id);
                setMaxPages?.(estimateSmartPages(textLength, s.id));
              }}
              className={cn(
                "text-start p-3.5 rounded-xl border transition-colors cursor-pointer",
                active
                  ? "border-primary bg-primary/10"
                  : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-[#9aa4b2]")}
                />
                <span className="font-bold text-xs text-[#f5f7fa]">{s.label}</span>
                {s.badge && (
                  <span className="ms-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                    {s.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#9aa4b2] leading-snug">{s.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
