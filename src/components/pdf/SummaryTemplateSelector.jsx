import React from "react";
import {
  BookOpen,
  Zap,
  Table2,
  GitBranch,
  Check,
  Layers,
  FlaskConical,
  Calculator,
  BookMarked,
  Sliders,
  ImagePlus,
  Sparkles,
  CircleHelp,
  Scale,
  Briefcase,
  Globe2,
} from "lucide-react";
import { SUMMARY_TEMPLATES, SUBJECT_TYPES } from "@/lib/summaryTemplates";
import { useLocale } from "@/lib/LocaleContext";

const TEMPLATE_ICONS = {
  foundational_bilingual: BookOpen,
  atlas_cram: Zap,
  ultra_multi_agent: Sparkles,
  bilingual_lecture: Globe2,
  complete_study_guide: BookMarked,
  exam_revision_sheet: Zap,
  comparison_classification: Table2,
  qa_tutor: CircleHelp,
  visual_concepts_formulas: GitBranch,
};

const TEMPLATE_ACCENTS = {
  foundational_bilingual: {
    ring: "border-cyan-500/60 bg-cyan-500/10",
    icon: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  },
  atlas_cram: {
    ring: "border-amber-500/60 bg-amber-500/10",
    icon: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  },
  ultra_multi_agent: {
    ring: "border-violet-500/60 bg-violet-500/10",
    icon: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  },
  bilingual_lecture: {
    ring: "border-sky-500/60 bg-sky-500/10",
    icon: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  },
  complete_study_guide: {
    ring: "border-cyan-500/60 bg-cyan-500/10",
    icon: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  },
  exam_revision_sheet: {
    ring: "border-amber-500/60 bg-amber-500/10",
    icon: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  },
  comparison_classification: {
    ring: "border-purple-500/60 bg-purple-500/10",
    icon: "bg-purple-500/15 text-purple-300 border-purple-400/30",
  },
  qa_tutor: {
    ring: "border-pink-500/60 bg-pink-500/10",
    icon: "bg-pink-500/15 text-pink-300 border-pink-400/30",
  },
  visual_concepts_formulas: {
    ring: "border-indigo-500/60 bg-indigo-500/10",
    icon: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  },
};

const SUBJECT_ICONS = {
  auto: Sliders,
  medical: FlaskConical,
  engineering: Calculator,
  law: Scale,
  humanities: BookMarked,
  business: Briefcase,
  languages: Globe2,
};

export default function SummaryTemplateSelector({
  value,
  selectedTemplate,
  onChange,
  onSelectTemplate,
  subjectType,
  selectedSubject,
  onSubjectTypeChange,
  onSelectSubject,
  maxPages = 12,
  onMaxPagesChange,
  includeImages = false,
  onIncludeImagesChange,
}) {
  const { locale } = useLocale();
  const isEn = locale === "en";

  const activeTemplate = value || selectedTemplate || "foundational_bilingual";
  const handleTemplateChange = onChange || onSelectTemplate;
  const activeSubject = subjectType || selectedSubject || "auto";
  const handleSubjectChange = onSubjectTypeChange || onSelectSubject;

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      {/* 1. Subject Type Row */}
      {handleSubjectChange && (
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {isEn ? "2. Subject Type:" : "٢. طبيعة المادة الدراسية:"}
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUBJECT_TYPES.map((s) => {
              const subjectId = s.value || s.id;
              const subjectLabel = isEn ? (s.nameEn || s.label) : (s.label || s.nameAr);
              const Icon = SUBJECT_ICONS[subjectId] || Sliders;
              const active = activeSubject === subjectId;
              return (
                <button
                  key={subjectId}
                  type="button"
                  onClick={() => handleSubjectChange(subjectId)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-start transition-colors cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <span className="text-xs font-black leading-tight">
                    {subjectLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Template Cards Grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-black text-muted-foreground">
            {isEn ? "3. Summary Style:" : "٣. نظام التلخيص والهيكلة:"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUMMARY_TEMPLATES.map((tpl) => {
            const tplId = tpl.value || tpl.id;
            const tplTitle = isEn ? (tpl.nameEn || tpl.label) : (tpl.label || tpl.nameAr);
            const tplDesc = isEn ? (tpl.descEn || tpl.descriptionEn || tpl.desc) : (tpl.desc || tpl.descriptionAr);
            const Icon = TEMPLATE_ICONS[tplId] || BookOpen;
            const accent = TEMPLATE_ACCENTS[tplId] || TEMPLATE_ACCENTS.foundational_bilingual;
            const active = activeTemplate === tplId;

            return (
              <button
                key={tplId}
                type="button"
                onClick={() => handleTemplateChange?.(tplId)}
                className={`group relative flex items-start gap-3 rounded-2xl border p-3 text-start transition-colors cursor-pointer ${
                  active
                    ? `${accent.ring}`
                    : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accent.icon}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-foreground">
                      {tplTitle}
                    </p>
                    {active && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                    {tplDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Target Page Count & Practical Mode */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {onMaxPagesChange && activeTemplate !== "format_only" && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black text-foreground">
                {isEn ? "Target Summary Length" : "الحجم المستهدف للملخص"}
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-black text-primary">
                ~{maxPages} {isEn ? "pages" : "صفحة"}
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={60}
              step={2}
              value={maxPages}
              onChange={(e) => onMaxPagesChange(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-cyan-400"
            />
          </div>
        )}

        {onIncludeImagesChange && (
          <button
            type="button"
            onClick={() => onIncludeImagesChange(!includeImages)}
            className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-start transition-colors cursor-pointer ${
              includeImages
                ? "border-cyan-400/50 bg-cyan-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                  includeImages
                    ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-300"
                    : "border-white/10 bg-white/5 text-muted-foreground"
                }`}
              >
                <ImagePlus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black text-foreground">
                  {isEn ? "Diagrams & Practical Focus" : "شرح الصور والرسوم والعملي"}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {isEn
                    ? "Explain charts and OSCE steps"
                    : "تفسير المخططات والصور العلمية"}
                </p>
              </div>
            </div>
            <div
              className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                includeImages ? "bg-cyan-500 justify-end" : "bg-white/15 justify-start"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-white shadow" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
