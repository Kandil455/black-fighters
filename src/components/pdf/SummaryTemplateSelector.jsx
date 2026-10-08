import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StudyGuidePreview } from "@/components/course/StudyGuideViewer";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { SUMMARY_TEMPLATES, SUBJECT_TYPES, COLOR_LEVELS } from "@/lib/summaryTemplates";
import { useLocale } from "@/lib/LocaleContext";

// صور توضيحية للقوالب (SVG مدمج)
/**
 * Which study-guide TEMPLATE (layout) each content template renders as.
 *
 * The picker used to show hand-drawn SVG "wireframes" — grey bars on a dark card
 * that told a student nothing. Each card now renders the REAL template document
 * through the same generator the reader and the export use, so the choice is
 * legible: a cram sheet, a card grid, an outline, a comparison sheet or the
 * classic index + modules guide.
 */
const TEMPLATE_THEME = {
  foundational_bilingual: "modules_red",
  bilingual_lecture: "modules_red",
  ultra_multi_agent: "outline_green",
  atlas_cram: "cram_amber",
  exam_revision_sheet: "cram_amber",
  complete_study_guide: "cards_navy",
  qa_tutor: "cards_navy",
  comparison_classification: "tables_navy",
  visual_concepts_formulas: "tables_navy",
};



export default function SummaryTemplateSelector({ template, setTemplate, subject, setSubject, colorLevel, setColorLevel }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [showPreviews, setShowPreviews] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const SUBJECT_LABELS = {
    auto: { ar: "اختيار ذكي تلقائي", en: "Smart Auto Detect", descAr: "تحديد نوع المادة من المحتوى", descEn: "AI automatically identifies subject" },
    medical: { ar: "طب وعلوم صحية", en: "Medical & Health", descAr: "تعريفات، أعراض، تشخيص وعلاج", descEn: "Symptoms, mechanisms, diagnosis & Rx" },
    engineering: { ar: "هندسة وعلوم", en: "Engineering & Sciences", descAr: "قوانين، وحدات، اشتقاقات وأمثلة", descEn: "Formulas, units, proofs & examples" },
    law: { ar: "قانون وتشريعات", en: "Law & Legislation", descAr: "مواد، شروط، استثناءات وأحكام", descEn: "Articles, clauses, conditions & precedents" },
    humanities: { ar: "تاريخ وأدب", en: "Humanities & Arts", descAr: "تسلسل زمني، شخصيات وأفكار", descEn: "Timeline, figures, causes & impact" },
    business: { ar: "إدارة وأعمال", en: "Business & Management", descAr: "نماذج، قرارات ومؤشرات", descEn: "KPIs, models, decisions & case studies" },
    languages: { ar: "لغات", en: "Languages", descAr: "قواعد، مفردات وأمثلة", descEn: "Grammar, vocabulary & syntax" },
  };

  const COLOR_LABELS = {
    none: { ar: "بدون تلوين", en: "No Colors", descAr: "عناوين وBold فقط", descEn: "Headings and bold only" },
    medium: { ar: "تلوين متوسط", en: "Balanced Colors", descAr: "1-4 Highlights قصيرة لكل قسم", descEn: "1-4 targeted highlights per section" },
    rich: { ar: "تلوين مكثف", en: "Rich Colors", descAr: "ألوان أكثر للتعريفات والأمثلة", descEn: "Vibrant visual memory triggers" },
  };

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-border/40">
      {/* نوع المادة */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-2 block">
          {isEn ? "📚 Subject Domain" : "📚 نوع المادة"}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECT_TYPES.map((item) => {
            const loc = SUBJECT_LABELS[item.value];
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setSubject(item.value)}
                className={`rounded-xl border p-2.5 text-start transition-colors ${
                  subject === item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <p className="text-xs font-black truncate">{isEn && loc ? loc.en : item.label}</p>
                <p className="text-[10px] opacity-70 truncate">{isEn && loc ? loc.descEn : item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* قالب التلخيص */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-muted-foreground">
            {isEn ? "🎨 Summary Architecture" : "🎨 قالب التلخيص"}
          </label>
          <button
            type="button"
            onClick={() => setShowPreviews(!showPreviews)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
          >
            <Eye className="w-3 h-3" />
            {showPreviews ? (isEn ? "Hide Preview" : "إخفاء المعاينة") : (isEn ? "Show Preview" : "اعرض المعاينة")}
            {showPreviews ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <AnimatePresence>
          {showPreviews && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="grid grid-cols-2 gap-2 pb-1">
                {SUMMARY_TEMPLATES.map((t) => (
                  <motion.button
                    key={t.value}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setTemplate(t.value); setPreviewTemplate(t.value); }}
                    className={`relative rounded-xl border overflow-hidden transition-colors ${
                      template === t.value
                        ? "border-primary ring-1 ring-primary/40"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <StudyGuidePreview templateId={TEMPLATE_THEME[t.value] || "modules_red"} className="h-32 w-full" />
                    <div className={`px-2 py-1.5 text-center ${template === t.value ? "bg-primary/10" : "bg-secondary/30"}`}>
                      <p className="text-[10px] font-black leading-tight">{t.label}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight truncate">{isEn && t.descEn ? t.descEn : t.desc}</p>
                    </div>
                    {template === t.value && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* اختيار القالب بدون معاينة */}
        {!showPreviews && (
          <div className="grid grid-cols-2 gap-2">
            {SUMMARY_TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`rounded-xl border p-2.5 text-start transition-colors ${
                  template === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <p className="text-xs font-black truncate">{t.label}</p>
                <p className="text-[10px] opacity-70 truncate">{isEn && t.descEn ? t.descEn : t.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* مستوى التلوين */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-2 block">
          {isEn ? "🎨 Highlights & Colorization" : "🎨 مستوى التلوين"}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_LEVELS.map((item) => {
            const loc = COLOR_LABELS[item.value];
            return (
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
                <p className="text-xs font-black">{isEn && loc ? loc.en : item.label}</p>
                <p className="text-[10px] opacity-70 leading-tight mt-0.5">{isEn && loc ? loc.descEn : item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
