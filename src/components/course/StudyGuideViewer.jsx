import React, { useMemo, useRef, useState } from "react";
import { Check, Download, Printer, LayoutTemplate, Table2, FileSpreadsheet, ListOrdered, Layers } from "lucide-react";
import { toast } from "sonner";
import { renderStudyGuideHtml, STUDY_GUIDE_TEMPLATES, GUIDE_PALETTES } from "@/lib/summaryStudyGuide";
import { downloadHtmlFile, printHtmlFile, readStoredTemplate, storeTemplate } from "@/lib/summary/exportGuide";
import { downloadSummaryPptx } from "@/lib/summaryExport";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS = {
  modules_green: LayoutTemplate,
  cram_amber: FileSpreadsheet,
  cards_navy: Layers,
  outline_red: ListOrdered,
  tables_navy: Table2,
};

/**
 * StudyGuideViewer — renders a printable/exportable HTML study-guide template.
 * Optimized for performance: uses lightweight CSS swatch cards in the template picker
 * instead of spawning 5 separate iframes on the main thread.
 */
export default function StudyGuideViewer({
  document: doc,
  markdown = "",
  title = "",
  templateId,
  onTemplateChange,
  showToolbar = true,
  className = "",
  figures = [],
}) {
  const { isEn } = useLocale();
  const [localTemplate, setLocalTemplate] = useState(
    () => templateId || readStoredTemplate() || "modules_green"
  );
  const activeTemplate = templateId || localTemplate;
  const iframeRef = useRef(null);

  const selectTemplate = (id) => {
    setLocalTemplate(id);
    storeTemplate(id);
    onTemplateChange?.(id);
  };

  const html = useMemo(
    () =>
      renderStudyGuideHtml({
        document: doc,
        markdown,
        title,
        templateId: activeTemplate,
        forExport: false,
        figures,
      }),
    [doc, markdown, title, activeTemplate, figures]
  );

  const downloadHtml = () => {
    const exportHtml = renderStudyGuideHtml({
      document: doc,
      markdown,
      title,
      templateId: activeTemplate,
      forExport: true,
      figures,
    });
    if (downloadHtmlFile(exportHtml, title, "study-guide")) {
      toast.success(
        isEn
          ? "Study guide downloaded (HTML)"
          : "تم تحميل ملف المذاكرة (HTML) جاهز للفتح والطباعة"
      );
    } else {
      toast.error(isEn ? "Failed to download file" : "تعذر تحميل الملف");
    }
  };

  const printGuide = () => {
    const exportHtml = renderStudyGuideHtml({
      document: doc,
      markdown,
      title,
      templateId: activeTemplate,
      forExport: true,
      figures,
    });
    if (!printHtmlFile(exportHtml)) {
      toast.error(isEn ? "Failed to open print window" : "تعذر فتح نافذة الطباعة");
    }
  };

  const downloadPptx = async () => {
    try {
      await downloadSummaryPptx({
        document: doc,
        markdown,
        title: title || "الملخص الذكي",
      });
      toast.success(isEn ? "PowerPoint downloaded!" : "تم تحميل عرض البوربوينت (.pptx) بنجاح!");
    } catch {
      toast.error(isEn ? "Failed to export PowerPoint" : "تعذر تصدير البوربوينت");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {showToolbar && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">
                {isEn ? "Printable Study Guide Templates" : "قوالب الطباعة والتصدير الجاهزة"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? "Select a print layout before downloading or printing as PDF"
                  : "اختر تخطيط القالب المناسب للطباعة أو التحميل كملف مستقل"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={printGuide}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                {isEn ? "Print / Save PDF" : "طباعة / حفظ PDF"}
              </button>
              <button
                type="button"
                onClick={downloadHtml}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isEn ? "Download HTML" : "تحميل HTML"}
              </button>
              <button
                type="button"
                onClick={downloadPptx}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                {isEn ? "PowerPoint (.pptx)" : "تحميل PowerPoint"}
              </button>
            </div>
          </div>

          <TemplatePicker activeId={activeTemplate} onSelect={selectTemplate} isEn={isEn} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-md">
        <iframe
          ref={iframeRef}
          title={title || "Study Guide"}
          srcDoc={html}
          sandbox="allow-same-origin allow-modals"
          className="block w-full border-0"
          style={{ height: "78vh", minHeight: "540px", background: "#f0f2f5" }}
        />
      </div>
    </div>
  );
}

/**
 * Fast, zero-iframe template selector with instant switching.
 */
export function TemplatePicker({ activeId, onSelect, isEn = false }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
      {STUDY_GUIDE_TEMPLATES.map((t) => {
        const active = t.id === activeId;
        const palette = GUIDE_PALETTES[t.palette] || GUIDE_PALETTES.clinical_navy;
        const Icon = TEMPLATE_ICONS[t.id] || LayoutTemplate;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 text-start transition-all cursor-pointer",
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className="inline-flex size-7 items-center justify-center rounded-lg text-white shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${palette.headerFrom}, ${palette.headerTo})`,
                }}
              >
                <Icon className="size-3.5" />
              </span>
              {active && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground truncate">
                {isEn ? t.nameEn : t.nameAr}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                {isEn ? t.descEn || t.nameEn : t.descAr}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function StudyGuidePreview({ templateId = "modules_green", height = 140 }) {
  const tpl =
    STUDY_GUIDE_TEMPLATES.find((t) => t.id === templateId) || STUDY_GUIDE_TEMPLATES[0];
  const palette = GUIDE_PALETTES[tpl.palette] || GUIDE_PALETTES.clinical_navy;
  const Icon = TEMPLATE_ICONS[tpl.id] || LayoutTemplate;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card p-3 flex flex-col justify-between select-none"
      style={{ height: `${height}px` }}
    >
      <div
        className="rounded-lg px-3 py-2 text-white flex items-center justify-between shadow-xs"
        style={{
          background: `linear-gradient(135deg, ${palette.headerFrom}, ${palette.headerTo})`,
        }}
      >
        <span className="text-[11px] font-bold truncate">{tpl.nameAr}</span>
        <Icon className="size-3.5 shrink-0 opacity-90" />
      </div>
      <div className="space-y-1.5 my-auto px-1">
        <div className="h-2 w-3/4 rounded bg-secondary" />
        <div className="h-2 w-full rounded bg-secondary/70" />
        <div className="h-2 w-2/3 rounded bg-secondary/50" />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span className="truncate">{tpl.descAr}</span>
      </div>
    </div>
  );
}

