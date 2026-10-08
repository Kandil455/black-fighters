import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Check, ChevronDown, ChevronUp, Copy, FileDown, Loader2, MoreHorizontal,
  Pause, Pencil, Play, Presentation, Square, ZoomIn, ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SummaryDocumentRenderer from "@/components/course/SummaryDocumentRenderer";
import StudyGuideViewer from "@/components/course/StudyGuideViewer";
import SummaryDocumentStudio from "@/components/course/SummaryDocumentStudio";
import {
  detectTextDirection,
  getLegacySummaryHtml,
  getSummaryDocumentV3,
  shouldRenderSummaryDocumentV3,
  summaryPlainText,
  summaryToEditableMarkdown,
  summaryWordCount,
} from "@/lib/summaryDocument";

const LOGO_URL = "/icons/black-fighters-192.png";

function formatFileSize(bytes) {
  const value = Math.max(0, Number(bytes || 0));
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("IMAGE_READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

async function optimizeImageForExport(blob) {
  if (blob.size <= 430 * 1024 || typeof createImageBitmap !== "function") return blobToDataUrl(blob);
  const bitmap = await createImageBitmap(blob);
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.76));
    return blobToDataUrl(compressed || blob);
  } finally {
    bitmap.close?.();
  }
}

async function hydrateLicensedImagesForExport(source) {
  const original = getSummaryDocumentV3(source);
  if (!original) return source;
  const documentCopy = structuredClone(original);
  const blocks = [
    ...(documentCopy.overview || []),
    ...(documentCopy.conclusion || []),
    ...(documentCopy.sections || []).flatMap((section) => section.blocks || []),
  ];
  const remoteImages = blocks.filter((block) => block?.type === "image" && /^https:\/\//i.test(block.src || "") && block.attribution?.approved === true);
  if (!remoteImages.length) return source;
  const { fetchLicensedImage } = await import("@/lib/summaryJobs");
  await Promise.all(remoteImages.map(async (block) => {
    try {
      const blob = await fetchLicensedImage(block.src);
      block.src = await optimizeImageForExport(blob);
    } catch {
      // The export renderer will report the skipped image without breaking text export.
    }
  }));
  return { ...source, summary_document_v3: documentCopy };
}

export default function SummaryView({ summary, course }) {
  const queryClient = useQueryClient();
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [exportingFormat, setExportingFormat] = useState("");
  const [exportProgress, setExportProgress] = useState(null); // {stage, percent, detail}
  const [exportError, setExportError] = useState("");
  const [exportEstimates, setExportEstimates] = useState({ status: "idle", pdf: 0, pptx: 0 });
  const [showMoreActions, setShowMoreActions] = useState(false);
  // The study-guide design the student picked. Shared with the export path so the
  // file they send to Telegram matches what they were reading.
  const [guideTemplate, setGuideTemplate] = useState(() => {
    try { return localStorage.getItem("bf_guide_template") || "modules_red"; } catch { return "emergency_red"; }
  });
  const chooseGuideTemplate = useCallback((id) => {
    setGuideTemplate(id);
    try { localStorage.setItem("bf_guide_template", id); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (!editing) setCurrentSummary(summary);
  }, [editing, summary]);

  const useDocumentV3 = shouldRenderSummaryDocumentV3(currentSummary);
  const documentV3 = useDocumentV3 ? getSummaryDocumentV3(currentSummary) : null;
  const editableMarkdown = useMemo(() => summaryToEditableMarkdown(currentSummary), [currentSummary]);
  const legacyHtml = useDocumentV3 ? "" : getLegacySummaryHtml(currentSummary);
  const plainText = useMemo(() => summaryPlainText(currentSummary), [currentSummary]);
  const wordCount = useMemo(() => summaryWordCount(currentSummary), [currentSummary]);
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const hasDocumentContent = !!(
    documentV3?.overview?.length
    || documentV3?.sections?.length
    || documentV3?.conclusion?.length
  );
  const hasContent = !!(hasDocumentContent || editableMarkdown || legacyHtml);
  const exportTitle = useMemo(() => {
    const documentTitle = documentV3?.title?.text || documentV3?.title;
    const legacyTitle = typeof currentSummary?.title === "string" ? currentSummary.title : "";
    return String(course?.title || documentTitle || legacyTitle || "Black Fighters Summary");
  }, [course?.title, currentSummary?.title, documentV3?.title]);
  const exportSource = useMemo(
    () => documentV3 ? { summary_document_v3: documentV3 } : currentSummary,
    [currentSummary, documentV3],
  );
  const exportOptions = useMemo(() => ({
    title: exportTitle,
    fileName: `${exportTitle} - Black Fighters`,
    branding: {
      name: "Black Fighters",
      subtitle: `${wordCount.toLocaleString()} كلمة · نحو ${readMinutes} دقيقة قراءة`,
    },
  }), [exportTitle, readMinutes, wordCount]);

  useEffect(() => {
    if (!hasContent || !exportSource) return undefined;
    let cancelled = false;
    let idleId = null;
    let timerId = null;
    const prepareEstimates = async () => {
      setExportEstimates((current) => ({ ...current, status: "loading" }));
      try {
        const { estimateSummaryPdfSize, estimateSummaryPptxSize } = await import("@/lib/summaryExport");
        if (cancelled) return;
        const pdf = estimateSummaryPdfSize(exportSource, exportOptions);
        const pptx = estimateSummaryPptxSize(exportSource, exportOptions);
        if (!cancelled) setExportEstimates({ status: "ready", pdf: pdf.estimatedBytes, pptx: pptx.estimatedBytes });
      } catch {
        if (!cancelled) setExportEstimates({ status: "error", pdf: 0, pptx: 0 });
      }
    };
    if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(prepareEstimates, { timeout: 1200 });
    else timerId = window.setTimeout(prepareEstimates, 0);
    return () => {
      cancelled = true;
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [exportOptions, exportSource, hasContent]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const speak = useCallback(() => {
    if (!window.speechSynthesis || !plainText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = detectTextDirection(plainText, "ltr") === "rtl" ? "ar-SA" : "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => { setSpeaking(false); setPaused(false); };
    utterance.onerror = () => { setSpeaking(false); setPaused(false); };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  }, [plainText]);

  const togglePause = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(editableMarkdown || plainText);
      setCopied(true);
      toast.success("تم نسخ الملخص");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("تعذر نسخ الملخص من المتصفح");
    }
  };

  const downloadExport = useCallback(async (format) => {
    if (exportingFormat) return;
    setExportError("");
    setExportingFormat(format);
    setExportProgress(null);
    try {
      const exporter = await import("@/lib/summaryExport");
      const hydratedSource = await hydrateLicensedImagesForExport(exportSource);
      const progressOptions = {
        ...exportOptions,
        onProgress: (p) => setExportProgress(p),
      };
      const result = format === "pptx"
        ? await exporter.downloadSummaryPptx(hydratedSource, progressOptions)
        : await exporter.downloadSummaryPdfV2(hydratedSource, progressOptions);
      const size = formatFileSize(result.size);
      if (result.warnings?.length) toast.warning(`تم التصدير مع ${result.warnings.length} تنبيه`, { description: result.warnings[0] });
      else toast.success(`تم تنزيل ${format.toUpperCase()}${size ? ` · ${size}` : ""}`);
      if (format === "pdf" && !result.withinTarget) {
        toast.warning("حجم PDF أكبر من الهدف", { description: "الصور الكثيرة أو الكبيرة قد ترفع حجم الملف." });
      }
    } catch (error) {
      const message = error?.message || `تعذر إنشاء ${format.toUpperCase()}`;
      setExportError(message);
      toast.error(message);
    } finally {
      setExportingFormat("");
      setExportProgress(null);
    }
  }, [exportOptions, exportSource, exportingFormat]);

  const handleSaved = useCallback((nextSummary) => {
    setCurrentSummary(nextSummary);
    queryClient.invalidateQueries({ queryKey: ["contents", course?.id] });
  }, [course?.id, queryClient]);

  if (!hasContent) {
    return <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد ملخص بعد. اضغط “ولّد” لإنشاء ملخص.</p>;
  }

  return (
    <div className="summary-view">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-card/80 p-3 shadow-sm">
        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
        <div className="me-auto flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-sm font-semibold leading-tight">
            Document Studio
            {documentV3 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary">V3</span>}
          </span>
          <span className="text-[10px] text-muted-foreground">{wordCount.toLocaleString()} كلمة · نحو {readMinutes} دقيقة</span>
        </div>

        <Button size="sm" variant={editing ? "secondary" : "outline"} onClick={() => setEditing((value) => !value)} className="h-8 gap-1.5 text-xs">
          <Pencil className="h-3.5 w-3.5" /> {editing ? "وضع القراءة" : "تعديل"}
        </Button>
        <Button size="sm" variant="outline" onClick={copyText} className="h-8 gap-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "تم" : "نسخ"}
        </Button>
        {!speaking ? (
          <Button size="sm" onClick={speak} className="h-8 gap-1.5 text-xs"><Play className="h-3.5 w-3.5" /> استمع</Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={togglePause} className="h-8 gap-1.5 text-xs">{paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />} {paused ? "كمّل" : "وقفة"}</Button>
            <Button size="sm" variant="outline" onClick={stop} className="h-8 gap-1.5 border-destructive/40 text-xs text-destructive"><Square className="h-3 w-3" /> وقف</Button>
          </>
        )}
        <Button size="sm" variant={showMoreActions ? "secondary" : "outline"} onClick={() => setShowMoreActions((value) => !value)} className="h-8 gap-1.5 text-xs" aria-expanded={showMoreActions}>
          <MoreHorizontal className="h-3.5 w-3.5" /> المزيد
        </Button>
        {showMoreActions && !editing && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/60 p-1">
            <div className="flex items-center gap-1 rounded-lg border border-border px-1">
              <button type="button" aria-label="تصغير الخط" onClick={() => setFontSize((size) => Math.max(11, size - 1))} className="rounded p-1.5 transition-colors hover:text-primary"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="w-6 text-center text-xs font-bold">{fontSize}</span>
              <button type="button" aria-label="تكبير الخط" onClick={() => setFontSize((size) => Math.min(22, size + 1))} className="rounded p-1.5 transition-colors hover:text-primary"><ZoomIn className="h-3.5 w-3.5" /></button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => downloadExport("pdf")} disabled={!!exportingFormat} aria-busy={exportingFormat === "pdf"} className="h-8 gap-1.5 text-xs">
              {exportingFormat === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF{exportEstimates.pdf ? ` · ~${formatFileSize(exportEstimates.pdf)}` : ""}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => downloadExport("pptx")} disabled={!!exportingFormat} aria-busy={exportingFormat === "pptx"} className="h-8 gap-1.5 text-xs">
              {exportingFormat === "pptx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Presentation className="h-3.5 w-3.5" />} PPTX{exportEstimates.pptx ? ` · ~${formatFileSize(exportEstimates.pptx)}` : ""}
            </Button>
          </div>
        )}
        {!editing && <Button size="sm" variant="ghost" aria-label={expanded ? "طي الملخص" : "فتح الملخص"} onClick={() => setExpanded((value) => !value)} className="h-8 px-2">{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</Button>}
        {exportingFormat && (
          <div className="basis-full min-w-[180px]" aria-live="polite">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold text-muted-foreground">
              <span>{exportProgress?.detail || (exportingFormat === "pdf" ? "جاري تجهيز الـ PDF…" : "جاري تجهيز الـ PPTX…")}</span>
              {exportProgress?.percent != null && <span className="tabular-nums font-mono">{exportProgress.percent}%</span>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/30 border border-white/10">
              <div
                className="h-full w-full origin-left rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-transform duration-300"
                style={{ transform: `scaleX(${(exportProgress?.percent ?? 8) / 100})` }}
              />
            </div>
          </div>
        )}
        {exportError && <p role="alert" className="basis-full text-xs font-semibold text-destructive">{exportError}</p>}
        {!exportError && exportEstimates.status === "error" && <p className="basis-full text-[10px] text-muted-foreground">تعذر تقدير الحجم؛ يمكنك التصدير مباشرة.‏</p>}
      </div>

      {editing ? (
        <SummaryDocumentStudio
          key={course?.id || "summary"}
          courseId={course?.id}
          courseTitle={course?.title}
          courseLanguage={course?.language}
          summary={currentSummary}
          initialValue={editableMarkdown || plainText}
          onSaved={handleSaved}
        />
      ) : expanded && documentV3 ? (
        // A v3 summary is a structured document, so it renders through the
        // study-guide templates (header, index, module cards, semantic boxes and
        // تريكة callouts) instead of a generic markdown sheet. Markdown/legacy
        // summaries keep the article below.
        <StudyGuideViewer
          document={documentV3}
          title={course?.title || "الملخص"}
          templateId={guideTemplate}
          onTemplateChange={chooseGuideTemplate}
        />
      ) : expanded && (
        <article className="summary-sheet page relative overflow-hidden rounded-2xl bg-white text-slate-950 shadow-xl">
          <img src={LOGO_URL} alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.025]" />
          <header className="relative z-[1] flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-10">
            <div dir="auto" className="min-w-0 text-start [unicode-bidi:plaintext]">
              <h1 className="m-0 text-xl font-black leading-relaxed text-slate-950 sm:text-2xl">{course?.title || "الملخص"}</h1>
              <p className="mt-1 text-xs text-slate-500">ملخص منظم بواسطة Black Fighters · {wordCount.toLocaleString()} كلمة · نحو {readMinutes} دقيقة</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black tracking-wide text-slate-600">
              <img src={LOGO_URL} alt="Black Fighters" className="h-11 w-11 rounded-xl object-contain" /> Black Fighters
            </div>
          </header>
          <div className="relative z-[1] px-5 py-6 sm:px-10 sm:py-8">
            <SummaryDocumentRenderer document={documentV3} fallbackMarkdown={editableMarkdown} legacyHtml={legacyHtml} fontSize={fontSize} />
          </div>
        </article>
      )}
    </div>
  );
}
