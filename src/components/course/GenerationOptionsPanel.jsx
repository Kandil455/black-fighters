import React from "react";
import { Button } from "@/components/ui/button";
import { Languages, BookOpen, ListChecks, Table2, CircleHelp, Sigma, Sparkles, Zap } from "lucide-react";
import { CreditCoin3D } from "@/components/ui/Custom3DIcons";

const LANGUAGE_OPTIONS = [
  { value: "ar", label: "عربي فقط", desc: "كل الملخص بالعربي حتى لو الملف إنجليزي" },
  { value: "en", label: "English only", desc: "The whole summary will be in English" },
  { value: "bilingual", label: "عربي + English", desc: "المصطلح/النص المهم بالإنجليزي وتحته شرح عربي" },
];

const STYLE_OPTIONS = [
  { value: "ultra_multi_agent", label: "👑 مِسطرة المذكرات (Ultra 5-Agent)", desc: "أعلى دقة، 5 وكلاء ذكاء اصطناعي، صناديق ذهبية وسريرية وشيت غش", icon: Zap },
  { value: "bilingual_lecture", label: "Bilingual Lecture", desc: "English points ونقاط شرح عربي منظمة لكل قسم", icon: Languages },
  { value: "complete_study_guide", label: "Complete Study Guide", desc: "شرح شامل وتعريفات وأمثلة مرتبة", icon: BookOpen },
  { value: "exam_revision_sheet", label: "Exam Revision Sheet", desc: "نقاط مركزة وتحذيرات للمراجعة السريعة", icon: ListChecks },
  { value: "comparison_classification", label: "Comparison & Classification", desc: "مقارنات وتصنيفات في جداول", icon: Table2 },
  { value: "qa_tutor", label: "Q&A Tutor", desc: "سؤال وجواب من نفس المصدر", icon: CircleHelp },
  { value: "visual_concepts_formulas", label: "Visual Concepts & Formulas", desc: "معادلات وعلاقات وخرائط مفاهيم", icon: Sigma },
];

export default function GenerationOptionsPanel({ languageMode, setLanguageMode, summaryStyle, setSummaryStyle, onStart, fileName }) {
  const cost = summaryStyle === "ultra_multi_agent" ? 12 : 2;

  return (
    <div className="glass-card rounded-3xl p-5 md:p-6 border border-primary/25 mt-5 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">جاهز للتلخيص</p>
          <h3 className="font-black text-lg truncate">{fileName || "النص اللي دخلته"}</h3>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-400">
          <CreditCoin3D size={16} /> التكلفة {cost} كريدت
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-primary" />
          <h4 className="font-black">عايز الملخص بأي لغة؟</h4>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = languageMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguageMode(opt.value)}
                className={`rounded-2xl border p-4 text-start transition-colors ${active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40 text-muted-foreground"}`}
              >
                <p className="font-black text-sm mb-1">{opt.label}</p>
                <p className="text-xs leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h4 className="font-black">شكل الملخص عامل إزاي؟</h4>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {STYLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => {
            const active = summaryStyle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSummaryStyle(value)}
                className={`rounded-2xl border p-4 text-start transition-colors ${active ? "border-accent bg-accent/10 text-accent ring-1 ring-accent/40" : "border-border hover:border-accent/40 text-muted-foreground"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 shrink-0" />
                  <p className="font-black text-sm">{label}</p>
                </div>
                <p className="text-xs leading-relaxed">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={onStart} size="lg" className="w-full h-12 font-black gap-2">
        <Sparkles className="w-4 h-4" />
        ابدأ التلخيص — {cost} كريدت
      </Button>
    </div>
  );
}
