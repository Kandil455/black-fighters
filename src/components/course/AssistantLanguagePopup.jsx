import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AuthMascot from "@/components/auth/AuthMascot";
import SummaryTemplateSelector from "@/components/pdf/SummaryTemplateSelector";
import { ArrowRight, Coins, Languages, Sparkles, Image as ImageIcon, FileText, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { estimateDocumentJob } from "@/lib/summaryV5/hierarchicalPipeline";

const LANGUAGES = [
  { value: "ar", label: "العربية 🇪🇬", desc: "شرح وتلخيص كامل بالعربية مع المصطلحات", descEn: "Comprehensive Arabic summary with terms" },
  { value: "en", label: "English 🇬🇧", desc: "Full study summary in English", descEn: "Full study summary in English" },
];

const DEPTH_MODES = [
  { value: "deep", labelAr: "عميق · شرح من الأساس", labelEn: "Deep · Foundational", descAr: "صندوق «قبل ما تقرا» + قاموس موحد + مدقق عائلات نماذج متقاطع" },
  { value: "balanced", labelAr: "متوازن · الأطلس القياسي", labelEn: "Balanced · Standard Atlas", descAr: "لوحات علمية منظمة مع أشرطة فك التعتيم (Declassify)" },
  { value: "fast", labelAr: "سريع · ليلة الامتحان (Cram)", labelEn: "Fast · Exam Cram", descAr: "أعلى النقاط الامتحانية والجرعات والجداول فقط" },
];

export default function AssistantLanguagePopup({ open, fileName, creditCost = 2, analysis, onConfirm, onClose }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [language, setLanguage] = useState("ar");
  const [template, setTemplate] = useState("foundational_bilingual");
  const [depthMode, setDepthMode] = useState("deep");
  const [subject, setSubject] = useState("auto");
  const [colorLevel, setColorLevel] = useState("medium");
  const [maxPages, setMaxPages] = useState(12);
  const [includeImages, setIncludeImages] = useState(false);

  const v5Estimate = useMemo(() => {
    return estimateDocumentJob({
      totalPages: analysis?.estimatedPages || 28,
      ocrPagesCount: analysis?.ocrPages || 0,
    });
  }, [analysis]);

  useEffect(() => {
    if (!open) return;
    const detectedLanguage = analysis?.language === "en" ? "en" : (locale === "en" ? "en" : "ar");
    setLanguage(detectedLanguage);
    setTemplate(analysis?.recommendedStyle || "foundational_bilingual");
    setDepthMode("deep");
    setSubject(analysis?.subjectType || "auto");
    setColorLevel("medium");
    setMaxPages(Math.max(6, Math.min(30, Math.ceil((analysis?.estimatedPages || 24) * 0.25))));
  }, [open, analysis, locale]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent dir={dir} className="flex max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-3xl border border-primary/30 bg-[#0b0c14] p-0 shadow-2xl">
        <div className="flex items-center gap-4 border-b border-border/50 bg-card px-5 py-3.5 shrink-0">
          <motion.div initial={{ scale: 0.75 }} animate={{ scale: 1 }}><AuthMascot state="happy" className="h-14 w-14" /></motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-sm sm:text-base">{isEn ? "Configure Summary Preferences (Atlas V5)" : "اضبط إعدادات دوسيه الأطلس V5 قبل البدء"}</h2>
            <p className="truncate text-xs text-muted-foreground">{fileName}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-400 shrink-0">
            <Coins className="h-3.5 w-3.5" /> {creditCost} {isEn ? (creditCost === 1 ? "Credit" : "Credits") : "كريدت"}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-none p-5">
          {/* V5 Pre-Start Estimator Banner */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <span className="rounded-full border px-2.5 py-1">
              {analysis?.estimatedPages || v5Estimate.totalPages} {isEn ? "pages approx" : "صفحة تقريبًا"}
            </span>
            <span className="rounded-full border px-2.5 py-1">
              {v5Estimate.estimatedParts} {isEn ? "hierarchical chapters" : "فصل هرمي مستقل"}
            </span>
            <span className="rounded-full border px-2.5 py-1">
              ~{v5Estimate.estimatedMinutes} {isEn ? "min est." : "دقيقة تقديريًا"}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isEn ? "Cross-Family Verifier Active" : "مدقق عائلات النماذج المتقاطع مفعّل"}
            </span>
          </div>

          {/* V4/V5 3-Tier Depth Mode Selector (Replaces 31 raw models) */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-400">
              <Sparkles className="h-4 w-4" /> {isEn ? "Study Depth Mode (Atlas V5)" : "عمق الشرح والتدقيق (الأطلس V5)"}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEPTH_MODES.map((dm) => (
                <button
                  key={dm.value}
                  type="button"
                  onClick={() => {
                    setDepthMode(dm.value);
                    if (dm.value === "fast") setTemplate("atlas_cram");
                    else if (dm.value === "deep") setTemplate("foundational_bilingual");
                  }}
                  className={`rounded-xl border p-3 text-start transition-colors ${depthMode === dm.value ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-border text-muted-foreground"}`}
                >
                  <p className="text-xs font-black">{isEn ? dm.labelEn : dm.labelAr}</p>
                  <p className="mt-1 text-[10px] opacity-80">{dm.descAr}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-primary">
              <Languages className="h-4 w-4" /> {isEn ? "Output Language" : "لغة الناتج"}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LANGUAGES.map((item) => (
                <button 
                  key={item.value} 
                  type="button" 
                  onClick={() => setLanguage(item.value)} 
                  className={`min-h-16 rounded-xl border p-3 text-start ${language === item.value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  <p className="text-sm font-black">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{isEn ? item.descEn : item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-primary">
              <ImageIcon className="h-4 w-4" /> {isEn ? "Practical & Diagram Support" : "شروحات العملي والمخططات التوضيحية"}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIncludeImages(false)}
                className={`min-h-16 rounded-xl border p-3 text-start transition-colors ${!includeImages ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                <div className="flex items-center gap-1.5 text-sm font-black">
                  <FileText className="h-4 w-4" />
                  <span>{isEn ? "Text & Notes Only" : "تلخيص نصي مكثف"}</span>
                </div>
                <p className="mt-1 text-[10px]">{isEn ? "Pure structured text, key concepts, definitions" : "تركيز على النظري، التعريفات، والمفاهيم المركزة"}</p>
              </button>
              <button
                type="button"
                onClick={() => setIncludeImages(true)}
                className={`min-h-16 rounded-xl border p-3 text-start transition-colors ${includeImages ? "border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.15)]" : "border-border text-muted-foreground"}`}
              >
                <div className="flex items-center gap-1.5 text-sm font-black">
                  <ImageIcon className="h-4 w-4" />
                  <span>{isEn ? "Practical & Diagrams (OSCE)" : "تلخيص عملي مدمج بالصور"}</span>
                </div>
                <p className="mt-1 text-[10px]">{isEn ? "Embeds explanatory slides, charts & diagrams" : "استخراج ودمج المخططات والرسومات لشرح العملي والـ OSCE"}</p>
              </button>
            </div>
          </div>

          <SummaryTemplateSelector template={template} setTemplate={setTemplate} subject={subject} setSubject={setSubject} colorLevel={colorLevel} setColorLevel={setColorLevel} />

          <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black">{isEn ? "Max Target Summary Pages" : "حجم الملخص النهائي"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isEn 
                    ? "Target maximum limit; all document sections are still thoroughly processed."
                    : "ده حد أقصى تقريبي، وكل أجزاء الملف ستدخل المراجعة مهما كان حجمه."}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-background rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setMaxPages(p => Math.max(4, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary/50 text-foreground font-black hover:bg-secondary active:scale-95 transition-[background-color,transform]"
                >-</button>
                <div className="w-12 text-center font-black text-sm">
                  {maxPages}
                </div>
                <button
                  type="button"
                  onClick={() => setMaxPages(p => Math.min(120, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary/50 text-foreground font-black hover:bg-secondary active:scale-95 transition-[background-color,transform]"
                >+</button>
              </div>
              <span className="text-xs font-bold text-muted-foreground">{isEn ? "pages" : "صفحة"}</span>
            </div>
          </div>
        </div>

        {/* Pinned Sticky Action Footer */}
        <div className="border-t border-border/50 bg-card px-5 py-4 shrink-0">
          <button 
            type="button" 
            onClick={() => onConfirm({ language, style: template, depthMode, subjectType: subject, colorLevel, maxPages, includeImages })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground btn-lift text-sm sm:text-base cursor-pointer hover:bg-primary/90 active:scale-[0.99] transition-colors shadow-lg shadow-cyan-500/25"
          >
            <Sparkles className="h-4 w-4" /> {isEn ? "Start Summary" : "ابدأ التلخيص"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
