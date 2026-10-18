import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SummaryTemplateSelector from "@/components/pdf/SummaryTemplateSelector";
import {
  FileText,
  Zap,
  Sparkles,
  RefreshCw,
  Globe,
  Check,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const OUTPUT_LANGUAGES = [
  {
    id: "bilingual",
    titleEn: "Bilingual (English + Arabic)",
    titleAr: "ثنائي اللغة (Bilingual EN + AR)",
    descEn:
      "Preserves English scientific terms, headings & definitions alongside clear Arabic explanation.",
    descAr:
      "يحفظ المصطلحات العلمية والعناوين والتعريفات بالإنجليزية مع شرح عربي واضح ومفصل لكل نقطة.",
  },
  {
    id: "en",
    titleEn: "English Only",
    titleAr: "إنجليزي فقط (English Only)",
    descEn:
      "Generates the entire summary, headings, bullet points, and tables 100% in academic English.",
    descAr:
      "يكتب الملخص بالكامل (العناوين، الشرح، النقاط، والجداول) باللغة الإنجليزية الأكاديمية فقط.",
  },
  {
    id: "ar",
    titleEn: "Arabic Only",
    titleAr: "عربي فقط (Arabic Only)",
    descEn:
      "Generates the entire summary and explanations in clear academic Arabic.",
    descAr:
      "يكتب الملخص والشرح بالكامل باللغة العربية الفصحى الواضحة والسلسة.",
  },
];

export default function AssistantLanguagePopup({
  open,
  onConfirm,
  onClose,
  onChangeFile,
  fileName,
  creditCost = 2,
  analysis = null,
  inline = false,
  initialLanguage = "bilingual",
  initialStyle = "complete_study_guide",
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [selectedLang, setSelectedLang] = useState(
    initialLanguage || "bilingual"
  );
  const [selectedStyle, setSelectedStyle] = useState(
    initialStyle || "complete_study_guide"
  );

  useEffect(() => {
    if (initialLanguage) setSelectedLang(initialLanguage);
  }, [initialLanguage]);

  useEffect(() => {
    if (initialStyle) setSelectedStyle(initialStyle);
  }, [initialStyle]);

  const triggerStart = (styleId = selectedStyle, langId = selectedLang) => {
    onConfirm({
      language: langId,
      style: styleId,
      subjectType: analysis?.subjectType || "auto",
      colorLevel: "none",
      maxPages: Math.max(25, analysis?.estimatedPages || 25),
      includeImages: true,
    });
  };

  const innerContent = (
    <div
      dir={dir}
      className="relative rounded-3xl overflow-hidden border border-primary/30 bg-gradient-to-b from-card via-card to-background shadow-2xl"
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-primary to-emerald-500" />

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header + File pill */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-foreground truncate">
                {isEn
                  ? "Configure Summary Language & Size"
                  : "حدد لغة التلخيص وحجمه للبدء"}
              </h3>
              {fileName && (
                <p className="text-xs text-muted-foreground truncate">
                  {fileName}
                  {analysis?.estimatedPages
                    ? ` · ~${analysis.estimatedPages} ${
                        isEn ? "pages" : "صفحة"
                      }`
                    : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
              <Zap className="w-3.5 h-3.5" />
              {creditCost} {isEn ? "Cr" : "كريدت"}
            </span>
            {inline && onChangeFile && (
              <button
                type="button"
                onClick={onChangeFile}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-xl border border-border hover:border-primary/40 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {isEn ? "Change File" : "تغيير الملف"}
              </button>
            )}
          </div>
        </div>

        {/* 1. Summary Output Language Selection (Bilingual / English / Arabic) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-foreground/90 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              {isEn
                ? "1. Choose Summary Output Language"
                : "١. اختر لغة التلخيص الناتج"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isEn
                ? "Independent of site interface language"
                : "تحدد لغة كتابة الملخص نفسه"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {OUTPUT_LANGUAGES.map((opt) => {
              const active = selectedLang === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedLang(opt.id)}
                  className={`text-start p-3.5 rounded-2xl border transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${
                    active
                      ? "border-primary bg-primary/15 shadow-[0_0_20px_rgba(25,240,140,0.15)]"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-foreground">
                      {isEn ? opt.titleEn : opt.titleAr}
                    </span>
                    {active && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isEn ? opt.descEn : opt.descAr}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Summary Size Cards (Small / Medium / Large) */}
        <SummaryTemplateSelector
          value={selectedStyle}
          onChange={setSelectedStyle}
        />

        {/* Immediate Start CTA */}
        <div className="flex items-center gap-2 pt-1">
          {!inline && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-muted-foreground transition-colors cursor-pointer"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </button>
          )}
          <button
            type="button"
            onClick={() => triggerStart(selectedStyle, selectedLang)}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-primary via-cyan-500 to-emerald-500 hover:opacity-95 text-primary-foreground font-black text-sm shadow-lg shadow-primary/25 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isEn ? "Start Summarizing Now" : "ابدأ التلخيص الآن"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return innerContent;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        dir={dir}
        className="max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-none"
      >
        {innerContent}
      </DialogContent>
    </Dialog>
  );
}
