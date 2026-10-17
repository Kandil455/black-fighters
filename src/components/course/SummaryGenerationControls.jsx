import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Zap,
  Sparkles,
  BookOpen,
  Table2,
  Send,
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
  const base = Math.max(1, Math.min(18, Math.round(chars / 2200)));
  if (style === "condensed" || style === "exam_capsules") return Math.max(1, Math.round(base * 0.65));
  if (style === "detailed") return Math.min(20, Math.round(base * 1.35));
  return base;
}

const ICONS = {
  standard: FileText,
  condensed: Zap,
  detailed: BookOpen,
  exam_capsules: Sparkles,
  comparisons: Table2,
};

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

export default function SummaryGenerationControls({
  summaryStyle,
  setSummaryStyle,
  maxPages,
  setMaxPages,
  textLength = 0,
  autoSendTelegram,
  setAutoSendTelegram,
  action,
}) {
  const recommended = estimateSmartPages(textLength, summaryStyle);
  const [selectedDomain, setSelectedDomain] = useState(() => getSelectedSummaryDomain().id);

  const [localAutoSend, setLocalAutoSend] = useState(() => {
    try {
      return localStorage.getItem("bf_tg_auto_send") === "true";
    } catch {
      return false;
    }
  });

  const effectiveAutoSend =
    typeof autoSendTelegram === "boolean" ? autoSendTelegram : localAutoSend;

  const handleToggleAutoSend = () => {
    const next = !effectiveAutoSend;
    try {
      localStorage.setItem("bf_tg_auto_send", String(next));
    } catch {}
    setLocalAutoSend(next);
    setAutoSendTelegram?.(next);
  };

  useEffect(() => {
    try {
      localStorage.setItem("bf_summary_domain", selectedDomain);
    } catch {}
  }, [selectedDomain]);

  return (
    <div className="glass rounded-[1.25rem] p-5 mb-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-sm text-[#f5f7fa]">
            إعدادات التلخيص الذكي (Smart Summary Studio)
          </h4>
          <p className="text-xs text-[#9aa4b2] mt-0.5">
            موصى به لطول المحاضرة:{" "}
            <strong className="text-primary font-mono">{recommended} صفحة</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAutoSend}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer",
              effectiveAutoSend
                ? "border-primary bg-primary/15 text-primary"
                : "border-white/[0.08] bg-white/[0.03] text-[#9aa4b2] hover:text-[#f5f7fa]",
            )}
          >
            <Send className="w-3.5 h-3.5" />
            {effectiveAutoSend ? "إرسال تلقائي لتليجرام: مفعّل ✓" : "إرسال تلقائي لتليجرام"}
          </button>
        </div>
      </div>

      {/* Domain Specialty Selector */}
      <div>
        <p className="text-xs font-bold text-[#9aa4b2] mb-2">
          التخصص ونوع القالب المعرفي:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SUMMARY_DOMAINS.map((dom) => {
            const DomIcon = dom.icon;
            const active = selectedDomain === dom.id;
            return (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                className={cn(
                  "text-start p-3 rounded-xl border transition-colors cursor-pointer",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DomIcon
                    className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-[#9aa4b2]")}
                  />
                  <span className="font-bold text-xs text-[#f5f7fa]">{dom.label}</span>
                </div>
                <p className="text-[11px] text-[#9aa4b2] leading-snug">{dom.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Style Selector */}
      <div>
        <p className="text-xs font-bold text-[#9aa4b2] mb-2">عمق التلخيص وطريقة العرض:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SUMMARY_STYLE_LIST.map((s) => {
            const Icon = ICONS[s.id] || FileText;
            const active = summaryStyle === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSummaryStyle(s.id);
                  setMaxPages(estimateSmartPages(textLength, s.id));
                }}
                className={cn(
                  "text-start p-3 rounded-xl border transition-colors cursor-pointer",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={cn("w-4 h-4", active ? "text-primary" : "text-[#9aa4b2]")}
                  />
                  <span className="font-bold text-xs text-[#f5f7fa]">{s.label}</span>
                  {s.badge && (
                    <span className="ms-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
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

      {/* Max pages + action */}
      <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-white/[0.07]">
        <div className="w-36">
          <label className="text-xs font-semibold mb-1 block text-[#9aa4b2]">
            حد أقصى صفحات
          </label>
          <Input
            type="number"
            min="1"
            max="500"
            value={maxPages}
            onChange={(e) =>
              setMaxPages(Math.max(1, Math.min(500, Number(e.target.value) || 30)))
            }
            className="font-mono font-bold bg-[#05070a] border-white/[0.1]"
          />
        </div>
        <p className="text-xs text-[#9aa4b2] flex-1 leading-relaxed">
          ارفع الرقم للملفات الضخمة — الذكاء الاصطناعي يقسم المحاضرة تلقائياً ويدقق كل قسم.
        </p>
        <div className="ms-auto">{action}</div>
      </div>
    </div>
  );
}
