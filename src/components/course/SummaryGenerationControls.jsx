import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Zap,
  Sparkles,
  BookOpen,
  Table2,
  Palette,
  SlidersHorizontal,
  Send,
  Stethoscope,
  Cpu,
  GraduationCap,
  Flame,
} from "lucide-react";
import { STUDY_GUIDE_TEMPLATES } from "@/lib/summaryStudyGuide";
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

const COLOR_LEVELS = [
  { id: "calm", label: "هادئ", hint: "هايلايت خفيف للمهم بس" },
  { id: "balanced", label: "متوازن ✨", hint: "تلوين ذكي حسب الأهمية" },
  { id: "rich", label: "غني 🎨", hint: "ألوان واضحة لكل فكرة" },
];

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
      "قدم تغطية أكاديمية شاملة لكل المفاهيم والتعريفات مع تنظيمها في بطاقات ملونة وجداول مقارنة واضحة.",
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
  colorLevel = "balanced",
  setColorLevel,
  textLength = 0,
  autoSendTelegram,
  setAutoSendTelegram,
  action,
}) {
  const recommended = estimateSmartPages(textLength, summaryStyle);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(() => getSelectedSummaryDomain().id);
  const [guideTemplate, setGuideTemplate] = useState(() => {
    try {
      return localStorage.getItem("bf_guide_template") || "modules_red";
    } catch {
      return "modules_red";
    }
  });

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
      localStorage.setItem("bf_guide_template", guideTemplate);
    } catch {}
  }, [guideTemplate]);

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
            <strong className="text-[#19f08c] font-mono">{recommended} صفحة</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAutoSend}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer",
              effectiveAutoSend
                ? "border-[#19f08c] bg-[#19f08c]/15 text-[#19f08c]"
                : "border-white/[0.08] bg-white/[0.03] text-[#9aa4b2] hover:text-[#f5f7fa]",
            )}
          >
            <Send className="w-3.5 h-3.5" />
            {effectiveAutoSend ? "إرسال تلقائي لتليجرام: مفعّل ✓" : "إرسال تلقائي لتليجرام"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer",
              showAdvanced
                ? "border-[#19f08c]/40 bg-[#19f08c]/10 text-[#19f08c]"
                : "border-white/[0.07] bg-white/[0.03] text-[#9aa4b2] hover:text-[#f5f7fa]",
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showAdvanced ? "إخفاء الخيارات المتقدمة" : "خيارات التصميم والألوان"}
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
                    ? "border-[#19f08c] bg-[#19f08c]/10"
                    : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <DomIcon
                    className={cn("w-4 h-4 shrink-0", active ? "text-[#19f08c]" : "text-[#9aa4b2]")}
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
                    ? "border-[#19f08c] bg-[#19f08c]/10"
                    : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={cn("w-4 h-4", active ? "text-[#19f08c]" : "text-[#9aa4b2]")}
                  />
                  <span className="font-bold text-xs text-[#f5f7fa]">{s.nameAr}</span>
                  {s.badge && (
                    <span className="ms-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#19f08c]/15 text-[#19f08c]">
                      {s.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#9aa4b2] leading-snug">{s.descAr}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 pt-3 border-t border-white/[0.07]">
          {/* Print / Study Guide Template */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#f5f7fa] mb-2">
              <Palette className="w-3.5 h-3.5 text-[#19f08c]" />
              <span>قالب الطباعة والتصدير</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STUDY_GUIDE_TEMPLATES.map((tpl) => {
                const active = guideTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setGuideTemplate(tpl.id)}
                    className={cn(
                      "text-start p-2.5 rounded-xl border transition-colors cursor-pointer",
                      active
                        ? "border-[#19f08c] bg-[#19f08c]/10"
                        : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                        style={{ background: tpl.swatch }}
                      />
                      <span className="font-bold text-xs text-[#f5f7fa] truncate">{tpl.nameAr}</span>
                    </div>
                    <p className="text-[10px] text-[#9aa4b2] leading-snug line-clamp-1">
                      {tpl.descAr}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Highlight Density */}
          {setColorLevel && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#f5f7fa] mb-2">
                <Palette className="w-3.5 h-3.5 text-[#19f08c]" />
                <span>كثافة تلوين المصطلحات</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_LEVELS.map((lvl) => {
                  const active = colorLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setColorLevel(lvl.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-start transition-colors cursor-pointer",
                        active
                          ? "border-[#19f08c] bg-[#19f08c]/10"
                          : "border-white/[0.07] bg-[#05070a]/70 hover:border-white/[0.15]",
                      )}
                    >
                      <p className="text-xs font-bold text-[#f5f7fa]">{lvl.label}</p>
                      <p className="text-[10px] text-[#9aa4b2] mt-0.5 leading-snug">
                        {lvl.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
