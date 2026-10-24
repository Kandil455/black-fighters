import React, { useMemo, useRef, useState } from "react";
import { Check, Download, Printer, LayoutTemplate, Table2, FileSpreadsheet, ListOrdered, Layers, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { renderStudyGuideHtml, STUDY_GUIDE_TEMPLATES, GUIDE_PALETTES } from "@/lib/summaryStudyGuide";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS = {
  modules_red: LayoutTemplate,
  cram_amber: FileSpreadsheet,
  cards_navy: Layers,
  outline_green: ListOrdered,
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
}) {
  const { isEn } = useLocale();
  const [localTemplate, setLocalTemplate] = useState(
    () => templateId || readStoredTemplate() || "modules_red"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeTemplate = templateId || localTemplate;
  const iframeRef = useRef(null);

  const openInNewTab = () => {
    try {
      const exportHtml = renderStudyGuideHtml({
        document: doc,
        markdown,
        title,
        templateId: activeTemplate,
        forExport: false,
      });
      const blob = new Blob([exportHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error(isEn ? "Failed to open in new tab" : "تعذر فتح الملخص في نافذة جديدة");
    }
  };

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
      }),
    [doc, markdown, title, activeTemplate]
  );

  const downloadHtml = () => {
    try {
      const exportHtml = renderStudyGuideHtml({
        document: doc,
        markdown,
        title,
        templateId: activeTemplate,
        forExport: true,
      });
      const blob = new Blob([exportHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      const safeName =
        String(title || "study-guide")
          .replace(/[\\/:*?"<>|]+/g, "-")
          .trim() || "study-guide";
      link.href = url;
      link.download = `${safeName}.html`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(
        isEn
          ? "Study guide downloaded (HTML)"
          : "تم تحميل ملف المذاكرة (HTML) جاهز للفتح والطباعة"
      );
    } catch {
      toast.error(isEn ? "Failed to download file" : "تعذر تحميل الملف");
    }
  };

  const printGuide = () => {
    try {
      const exportHtml = renderStudyGuideHtml({
        document: doc,
        markdown,
        title,
        templateId: activeTemplate,
        forExport: true,
      });
      const blob = new Blob([exportHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, "_blank");
      if (!printWin) {
        iframeRef.current?.contentWindow?.print();
        URL.revokeObjectURL(url);
        return;
      }
      printWin.addEventListener("load", () => {
        setTimeout(() => {
          try {
            printWin.focus();
            printWin.print();
          } catch {}
        }, 250);
      });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error(isEn ? "Failed to open print window" : "تعذر فتح نافذة الطباعة");
    }
  };

  return (
    <div
      className={cn(
        "space-y-4",
        isFullscreen &&
          "fixed inset-0 z-50 bg-background/98 backdrop-blur-md p-3 sm:p-6 overflow-y-auto",
        className
      )}
    >
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
                onClick={() => setIsFullscreen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    {isEn ? "Exit Fullscreen" : "تصغير الشاشة"}
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    {isEn ? "Fullscreen" : "تكبير لملء الشاشة ⛶"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isEn ? "Open Full Page" : "فتح في صفحة مستقلة"}
              </button>
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
          style={{
            height: isFullscreen ? "84vh" : "78vh",
            minHeight: "540px",
            background: "#f0f2f5",
          }}
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
                {t.descAr}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const STORAGE_KEY = "bf_guide_template";
function readStoredTemplate() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function storeTemplate(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function StudyGuidePreview({ templateId = "modules_red", height = 140 }) {
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
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span className="truncate">{tpl.descAr}</span>
      </div>
    </div>
  );
}

