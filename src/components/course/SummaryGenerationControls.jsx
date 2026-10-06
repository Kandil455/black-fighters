import React from "react";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Languages, List, Calculator,
  AlignJustify, FileText, Zap, CheckCircle2, Palette,
} from "lucide-react";
import { SUMMARY_CHUNK_SIZE } from "@/lib/courseChunking";

const COLOR_LEVELS = [
  { value: "none", label: "بدون تلوين", desc: "عناوين + Bold فقط" },
  { value: "medium", label: "تلوين متوسط", desc: "1-4 عبارات قصيرة مهمة" },
  { value: "rich", label: "تلوين مكثف", desc: "ألوان لكل التعريفات" },
];


const STYLES = [
  {
    value: "ultra_multi_agent",
    label: "👑 مِسطرة المذكرات (Ultra 5-Agent)",
    desc: "أقوى مذكرة جامعية بنظام 5 وكلاء ذكاء اصطناعي: استخراج وتدقيق دقيق، صناديق سريرية وقواعد وشيت غش ختامي (+10 كريدت)",
    icon: Zap,
    featured: true,
    tag: "مِسطرة المذكرات VIP 👑",
  },
  {
    value: "bilingual_lecture",
    label: "🌐 Bilingual Lecture",
    desc: "English study points ثم شرح عربي كامل بنقاط منظمة بعد كل قسم — بنفس شكل المذكرة المطلوبة",
    icon: Languages,
    featured: true,
    tag: "الاختيار السريع ⭐",
  },
  {
    value: "complete_study_guide",
    label: "📚 Complete Study Guide",
    desc: "شرح شامل وتعريفات وأمثلة وقوانين مرتبة للمذاكرة",
    icon: BookOpen,
  },
  {
    value: "exam_revision_sheet",
    label: "✅ Exam Revision Sheet",
    desc: "أهم النقاط والاستثناءات والأخطاء الشائعة قبل الامتحان",
    icon: List,
  },
  {
    value: "comparison_classification",
    label: "📊 Comparison & Classification",
    desc: "المقارنات والأنواع والفروق في جداول نظيفة",
    icon: AlignJustify,
  },
  {
    value: "qa_tutor",
    label: "❓ Q&A Tutor",
    desc: "المحتوى في صورة أسئلة وأجوبة موثقة",
    icon: FileText,
  },
  {
    value: "visual_concepts_formulas",
    label: "🔢 Visual Concepts & Formulas",
    desc: "معادلات وخرائط مفاهيم وعلاقات بصرية",
    icon: Calculator,
  },
];

function getStyleTip(style) {
  const tips = {
    ultra_multi_agent: "نظام 5-وكلاء متكامل: استخراج، تحليل، تدقيق، صناديق ذهبية وشيت غش ختامي 👑",
    bilingual_lecture: "Quick Overview ثم English points وشرح عربي بنقاط منظمة بعد كل قسم 🌐",
    complete_study_guide: "تغطية شاملة منظمة للتعريفات والأمثلة والقوانين 📖",
    exam_revision_sheet: "مراجعة مركزة قابلة للحفظ قبل الامتحان ⏰",
    comparison_classification: "أفضل اختيار للأنواع والتشابه والاختلاف في جداول 📊",
    qa_tutor: "سؤال وجواب يراجع كل حقيقة من المصدر ❓",
    visual_concepts_formulas: "يعرض العلاقات والمعادلات ككتل بصرية واضحة 🔢",
  };
  return tips[style] || "";
}

export default function SummaryGenerationControls({
  summaryStyle,
  setSummaryStyle,
  maxPages,
  setMaxPages,
  colorLevel = "medium",
  setColorLevel,
  action,
  textLength = 0,
}) {
  const estimatedPages = Math.ceil(textLength / 3000) || 0;
  const estimatedChunks = Math.ceil(textLength / SUMMARY_CHUNK_SIZE) || 1;

  return (
    <div className="glass-card rounded-2xl p-4 border border-accent/25 mb-4 space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-primary">اختار إيه محتاج من الملف ده؟</p>
          {estimatedPages > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ~{estimatedPages} صفحة
              {estimatedChunks > 1 && (
                <span className="text-accent font-semibold"> · هيتقسم لـ {estimatedChunks} أجزاء تلقائياً ⚙️</span>
              )}
            </p>
          )}
        </div>
        <span className="text-xs rounded-full border border-primary/30 px-3 py-1 text-primary bg-primary/10 shrink-0">
          اختار الأول ✋
        </span>
      </div>

      {/* Style grid */}
      <div className="grid sm:grid-cols-2 gap-2">
        {STYLES.map(({ value, label, desc, icon: Icon, featured, tag }) => {
          const active = summaryStyle === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSummaryStyle(value)}
              className={`text-start rounded-xl border p-3 transition-colors relative ${
                featured ? "sm:col-span-2" : ""
              } ${
                active
                  ? "border-primary text-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {tag && (
                <span className="absolute top-2 left-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                  {tag}
                </span>
              )}
              {active && (
                <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />
              )}
              <div className="flex items-center gap-2 mb-1 mt-1">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-bold text-sm">{label}</span>
              </div>
              <span className="block text-xs leading-relaxed opacity-80">{desc}</span>
            </button>
          );
        })}
      </div>

      {/* Active style tip */}
      {summaryStyle && (
        <div className="rounded-xl bg-accent/5 border border-accent/20 px-3 py-2 text-xs text-accent font-medium flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{getStyleTip(summaryStyle)}</span>
        </div>
      )}

      {/* مستوى التلوين */}
      {setColorLevel && (
        <div className="pt-1 border-t border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-bold text-muted-foreground">مستوى التلوين</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_LEVELS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setColorLevel(item.value)}
                className={`rounded-xl border p-2.5 text-center transition-colors ${
                  colorLevel === item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <p className="text-xs font-black">{item.label}</p>
                <p className="text-[10px] opacity-70 leading-tight mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Max pages + action */}
      <div className="flex flex-wrap items-end gap-3 pt-1">
        <div className="w-36">
          <label className="text-xs font-semibold mb-1 block text-muted-foreground">
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
            className="font-bold"
          />
        </div>
        <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
          رفّع الرقم للملفات الضخمة — الـ AI بيستخدمه كمرجع للحجم المطلوب.
          <br />
          <span className="text-primary/70">💡 الملفات الكبيرة بتتعالج تلقائياً جزء جزء</span>
        </p>
        <div className="ms-auto">{action}</div>
      </div>
    </div>
  );
}
