import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SummaryTemplateSelector from "@/components/pdf/SummaryTemplateSelector";
import {
  FileText,
  Zap,
  Globe,
  Languages,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { PaymentIcon } from "@/components/ui/icons";

const LANG_OPTIONS = [
  {
    id: "bilingual",
    title: "ثنائي اللغة (إنجليزي + عربي)",
    desc: "المصطلحات العلمية بالإنجليزي مع شرح عربي واضح ومبسط تحت كل نقطة.",
    icon: Languages,
  },
  {
    id: "ar",
    title: "عربي فقط",
    desc: "كل الشرح والتعريفات والأمثلة بالعربي الواضح بالكامل.",
    icon: BookOpen,
  },
  {
    id: "en",
    title: "English Only",
    desc: "Full summary, definitions, and high-yield notes in clean English.",
    icon: Globe,
  },
];

/**
 * AssistantLanguagePopup — Unified, single-window summary configuration studio.
 * Supports `inline` mode for rendering inside the unified CreateCourse window
 * without opening a separate popup dialog, with zero coloring pickers and zero green side text.
 */
export default function AssistantLanguagePopup({
  open,
  inline = false,
  fileName,
  onConfirm,
  onClose,
  onChangeFile,
  creditCost = 2,
  analysis = null,
}) {
  const [selectedLang, setSelectedLang] = useState("bilingual");
  const [selectedStyle, setSelectedStyle] = useState("foundational_bilingual");
  const [subjectType, setSubjectType] = useState("auto");
  const [maxPages, setMaxPages] = useState(12);

  useEffect(() => {
    if (!analysis) return;
    if (analysis.language) setSelectedLang(analysis.language);
    const rec = analysis.recommendation || {};
    const styleCandidate = rec.templateId || analysis.recommendedStyle || "foundational_bilingual";
    setSelectedStyle(
      styleCandidate === "exam_revision_sheet" || styleCandidate === "atlas_cram"
        ? "atlas_cram"
        : styleCandidate === "comparison_classification"
          ? "comparison_classification"
          : "foundational_bilingual"
    );
    setSubjectType(rec.subjectType || analysis.subjectType || "auto");
    const estPages = Number(rec.suggestedMaxPages || analysis.estimatedPages || analysis.pages || 12);
    setMaxPages(Math.max(6, Math.min(80, Math.ceil(estPages * 0.45) * 2 || 12)));
  }, [analysis]);

  const handleStart = () => {
    onConfirm?.({
      language: selectedLang,
      style: selectedStyle,
      subjectType,
      colorLevel: "none",
      maxPages,
      includeImages: true,
    });
  };

  const detectedPages = analysis?.estimatedPages || analysis?.pages || 0;
  const subjectNames = {
    medical: "طبي وسريري",
    engineering: "هندسي وعلمي",
    law: "قانوني",
    business: "إدارة وأعمال",
    languages: "لغات",
    humanities: "نظري وأدبي",
    auto: "أكاديمي شامل",
  };
  const autoSubjectLabel = subjectNames[subjectType] || "أكاديمي شامل";

  const content = (
    <div
      dir="rtl"
      className={
        inline
          ? "w-full flex flex-col overflow-hidden border border-white/10 bg-[#080C14] rounded-3xl shadow-2xl"
          : "flex-1 flex flex-col overflow-hidden"
      }
    >
      {/* Top Header */}
      <div className="shrink-0 p-5 pb-4 border-b border-white/10 bg-[#0B101B]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              إعداد التلخيص الذكي (خطوتين فقط ⚡)
            </h2>
            {fileName && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground max-w-full flex-wrap">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate font-semibold text-foreground/90">{fileName}</span>
                {detectedPages > 0 && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    (~{detectedPages} صفحة مصدر)
                  </span>
                )}
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  ضبط تلقائي: {autoSubjectLabel} • ~{maxPages} صفحة ملخص
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
              <PaymentIcon size={14} />
              <span>{creditCost} كريدت</span>
            </span>

            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow hover:opacity-95 transition-opacity cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>تلخيص فوري ⚡</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Single Body — Only 2 clear questions */}
      <div className={inline ? "p-5 space-y-5" : "flex-1 overflow-y-auto overscroll-contain p-5 space-y-5"}>
        {/* 1. Language Selection */}
        <div>
          <p className="text-xs font-black text-muted-foreground mb-2.5">
            ١. اختر لغة الملخص:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {LANG_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = selectedLang === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedLang(opt.id)}
                  className={`text-right p-3.5 rounded-2xl border transition-colors flex flex-col gap-1 cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      {opt.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Summary Focus (3 clear options) */}
        <SummaryTemplateSelector
          value={selectedStyle}
          onChange={setSelectedStyle}
        />
      </div>

      {/* Static Footer Action */}
      <div className="shrink-0 p-4 border-t border-white/10 bg-[#0B101B] flex items-center justify-between gap-3">
        {inline && onChangeFile ? (
          <button
            type="button"
            onClick={onChangeFile}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تغيير الملف</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        )}

        <button
          type="button"
          onClick={handleStart}
          className="flex-1 sm:flex-initial min-w-[200px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-lg hover:opacity-95 transition-opacity cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>ابدأ التلخيص الآن ({creditCost} كريدت)</span>
        </button>
      </div>
    </div>
  );

  if (inline) {
    if (!open) return null;
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        dir="rtl"
        className="w-[calc(100vw-1rem)] max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden border border-white/10 bg-[#080C14] p-0 rounded-3xl shadow-2xl"
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
