import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileCheck2,
  FolderOpen,
  LayoutGrid,
  List,
  RefreshCw,
  Rows3,
  ShieldAlert,
  Upload,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { UploadIcon, LightningIcon, BrainIcon, DocumentIcon } from "@/components/ui/icons";
import { PdfIcon, PptxIcon, DocxIcon, TextFileIcon } from "@/components/ui/FileTypeIcons";
import { AnimatedNumber } from "@/components/ui/linevault";
import { scanFileSecurity } from "@/lib/fileSecurityScanner";

/**
 * PremiumUploadDropzone — Single-pass lecture upload & extraction control.
 * Performs file validation + text/OCR extraction in one unified progress pass
 * and stays in a clean "Ready" state without flashing or re-showing the upload box.
 */

const LAYOUTS = [
  { id: "hero", nameAr: "كبير", nameEn: "Hero", Icon: LayoutGrid },
  { id: "split", nameAr: "جنب بعضه", nameEn: "Split", Icon: Rows3 },
  { id: "compact", nameAr: "سطر واحد", nameEn: "Compact", Icon: List },
];

const ACCEPT = ".pdf,.pptx,.docx,.txt,.csv,.html,.htm,.md,.png,.jpg,.jpeg,.webp";
const STORAGE_KEY = "bf_upload_layout";

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const FORMATS = [
  { ext: "PDF", labelAr: "مذكرات وكتب", labelEn: "Notes & books", Icon: PdfIcon, tone: "text-rose-300 border-rose-400/30 bg-rose-400/10" },
  { ext: "PPTX", labelAr: "سلايدات", labelEn: "Slides", Icon: PptxIcon, tone: "text-orange-300 border-orange-400/30 bg-orange-400/10" },
  { ext: "DOCX", labelAr: "ملفات Word", labelEn: "Word", Icon: DocxIcon, tone: "text-sky-300 border-sky-400/30 bg-sky-400/10" },
  { ext: "TXT", labelAr: "نصوص وملاحظات", labelEn: "Text & notes", Icon: TextFileIcon, tone: "text-slate-300 border-slate-400/30 bg-slate-400/10" },
];

const BENEFITS = [
  { Icon: LightningIcon, ar: "تلخيص فوري منظم", en: "Instant structured summary" },
  { Icon: BrainIcon, ar: "كويزات MCQ ذكية", en: "Smart MCQ quizzes" },
  { Icon: DocumentIcon, ar: "بطاقات مراجعة", en: "Spaced flashcards" },
];

export default function PremiumUploadDropzone({
  onFile,
  onReopenPopup,
  maxSize = 50 * 1024 * 1024,
}) {
  const { locale } = useLocale();
  const { isLite, isPowerSaver } = usePerformanceMode();
  const isEn = locale === "en";
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "hero"; } catch { return "hero"; }
  });

  // Single-pass state: "idle" | "processing" | "ready" | "rejected"
  const [scanState, setScanState] = useState("idle");
  const [activeFile, setActiveFile] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLabel, setScanLabel] = useState("");
  const [securityReport, setSecurityReport] = useState(null);

  const chooseLayout = useCallback((id) => {
    setLayout(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ }
  }, []);

  const resetScanner = useCallback(() => {
    setScanState("idle");
    setActiveFile(null);
    setScanProgress(0);
    setScanLabel("");
    setSecurityReport(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const processSelectedFile = useCallback(async (file) => {
    if (!file || scanState === "processing") return;
    setActiveFile(file);
    setScanState("processing");
    setScanProgress(8);
    setSecurityReport(null);
    setScanLabel(isEn ? "Checking file integrity..." : "جاري فحص الملف وتجهيزه...");

    try {
      const report = await scanFileSecurity(file, {
        maxSize,
        fast: true,
        onStage: ({ progress }) => {
          // Map security check to 8%..35%
          setScanProgress(Math.min(35, Math.max(8, Math.round(progress * 0.35))));
        },
      });

      setSecurityReport(report);

      if (!report.safe) {
        setScanState("rejected");
        const msg = isEn ? report.reasonEn : report.reasonAr;
        toast.error(msg);
        return;
      }

      setScanProgress(40);
      setScanLabel(isEn ? "Reading lecture pages..." : "جاري استخراج محتوى المحاضرة...");

      // Run text extraction inside the SAME progress bar (40%..98%) without switching steps!
      const ok = await onFile?.(file, {
        report,
        onProgress: ({ current = 1, total = 1, phase }) => {
          const ratio = Math.min(1, Math.max(0, current / Math.max(1, total)));
          const mapped = 40 + Math.round(ratio * 58);
          setScanProgress(mapped);
          if (phase === "ocr") {
            setScanLabel(
              isEn
                ? `Reading scanned pages (${current}%)...`
                : `جاري قراءة الصفحات المصورة (${current}%)...`
            );
          } else {
            setScanLabel(
              isEn
                ? `Reading page ${current} of ${total}...`
                : `جاري قراءة صفحة ${current} من ${total}...`
            );
          }
        },
      });

      if (ok === false) {
        resetScanner();
        return;
      }

      setScanProgress(100);
      setScanState("ready");
      setScanLabel(isEn ? "Lecture ready for summarization" : "تم تجهيز المحاضرة بنجاح");
    } catch (err) {
      setScanState("rejected");
      const fallbackMsg = err?.message || (isEn ? "Failed to read file" : "تعذر قراءة الملف");
      setSecurityReport({
        safe: false,
        code: "SCAN_ERROR",
        reasonAr: fallbackMsg,
        reasonEn: fallbackMsg,
      });
      toast.error(fallbackMsg);
    }
  }, [isEn, maxSize, onFile, resetScanner, scanState]);

  useEffect(() => {
    const onPaste = (event) => {
      const file = event.clipboardData?.files?.[0];
      if (file) processSelectedFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processSelectedFile]);

  const openPicker = () => {
    if (scanState === "processing") return;
    inputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleKey = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const animate = !isLite && !isPowerSaver;

  const dropProps = {
    role: "button",
    tabIndex: 0,
    "aria-label": isEn ? "Upload a lecture file" : "ارفع ملف المحاضرة",
    onClick: openPicker,
    onKeyDown: handleKey,
    onDragOver: (e) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: handleDrop,
  };

  const LayoutSwitcher = (
    <div className="flex items-center justify-end gap-1" role="group" aria-label={isEn ? "Upload box style" : "شكل صندوق الرفع"}>
      {LAYOUTS.map((item) => {
        const Icon = item.Icon;
        const active = layout === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={isEn ? item.nameEn : item.nameAr}
            aria-pressed={active}
            onClick={(e) => { e.stopPropagation(); chooseLayout(item.id); }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-bold transition-colors",
              active ? "border-primary/45 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{isEn ? item.nameEn : item.nameAr}</span>
          </button>
        );
      })}
    </div>
  );

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => e.target.files?.[0] && processSelectedFile(e.target.files[0])}
    />
  );

  // ── Unified Single-Pass Progress / Ready / Rejected View ──
  if (scanState !== "idle") {
    const isReady = scanState === "ready";
    const isRejected = scanState === "rejected";

    return (
      <div className="space-y-2">
        {LayoutSwitcher}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-7 transition-colors",
            isRejected
              ? "border-rose-500/45 bg-rose-950/15"
              : "border-border bg-card",
          )}
          aria-live="polite"
        >
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#0E1117]">
                  {isRejected ? (
                    <ShieldAlert className="h-7 w-7 text-rose-400" />
                  ) : isReady ? (
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  ) : (
                    <FileCheck2 className="h-7 w-7 text-primary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-base font-black text-foreground">
                    {activeFile?.name || (isEn ? "Selected File" : "الملف المختار")}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isRejected
                      ? (isEn ? securityReport?.reasonEn : securityReport?.reasonAr)
                      : scanLabel}
                  </p>
                </div>
              </div>

              {!isRejected && (
                <div className="shrink-0 text-end">
                  <div className="font-mono text-2xl font-black tabular-nums text-primary">
                    <AnimatedNumber value={scanProgress} suffix="%" />
                  </div>
                  <span className="block text-[10px] font-bold text-muted-foreground">
                    {formatSize(activeFile?.size || 0)}
                  </span>
                </div>
              )}
            </div>

            {!isRejected && (
              <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-border bg-[#0A0D12] p-0.5">
                <motion.div
                  className="h-full w-full rounded-full origin-left rtl:origin-right bg-gradient-to-r from-primary to-cyan-400"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: Math.max(0.05, Math.min(1, scanProgress / 100)) }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                />
              </div>
            )}

            {isReady && (
              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-3">
                {onReopenPopup && (
                  <button
                    type="button"
                    onClick={onReopenPopup}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {isEn ? "Summary Options" : "إعدادات التلخيص"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetScanner}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {isEn ? "Change file" : "تغيير الملف"}
                </button>
              </div>
            )}

            {isRejected && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-rose-500/20 pt-3">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/30 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {isEn ? "Choose another file" : "اختر ملفاً آخر"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
        {fileInput}
      </div>
    );
  }

  // ── compact — one slim row ─────────────────────────────────────────────────
  if (layout === "compact") {
    return (
      <div className="space-y-2">
        {LayoutSwitcher}
        <div
          {...dropProps}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/45",
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[#0E1117] text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-foreground">
              {dragOver ? (isEn ? "Drop it now" : "أفلت الملف دلوقتي") : (isEn ? "Upload lecture file" : "ارفع ملف المحاضرة")}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {isEn ? "PDF · PPTX · DOCX · TXT · images" : "PDF · PPTX · DOCX · TXT · صور"}
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[11px] font-black text-[#03150c] sm:flex">
            <FolderOpen className="h-3.5 w-3.5" />
            {isEn ? "Browse" : "اختر ملف"}
          </span>
        </div>
        {fileInput}
      </div>
    );
  }

  // ── split — drop zone beside the details ──────────────────────────────────
  if (layout === "split") {
    return (
      <div className="space-y-2">
        {LayoutSwitcher}
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          <div
            {...dropProps}
            className={cn(
              "flex min-h-[170px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-5 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/45",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-[#0E1117] text-primary">
              <UploadIcon size={24} />
            </span>
            <span className="text-sm font-black text-foreground">
              {dragOver ? (isEn ? "Drop it now" : "أفلت الملف دلوقتي") : (isEn ? "Drag the file here — or click" : "اسحب الملف هنا — أو اضغط")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isEn ? "You can also paste with Ctrl/Cmd+V" : "أو الصقه بـ Ctrl/Cmd+V"}
            </span>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map(({ ext, labelAr, labelEn, Icon, tone }) => (
                <span key={ext} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-bold", tone)}>
                  <Icon size={14} />
                  {ext}
                  <span className="hidden text-muted-foreground sm:inline">· {isEn ? labelEn : labelAr}</span>
                </span>
              ))}
            </div>
            <ul className="space-y-1.5 border-t border-border pt-2.5">
              {BENEFITS.map(({ Icon, ar, en }) => (
                <li key={ar} className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                  <Icon size={14} />
                  {isEn ? en : ar}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {fileInput}
      </div>
    );
  }

  // ── hero — one big inviting target ────────────────────────────────────────
  return (
    <div className="space-y-2">
      {LayoutSwitcher}
      <div
        {...dropProps}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/45",
        )}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.06] to-transparent" />

        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-[#0E1117] text-primary">
          {animate && (
            <motion.span
              aria-hidden="true"
              animate={dragOver ? { scale: 1.15 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="absolute inset-0 rounded-2xl bg-primary/10"
            />
          )}
          <UploadIcon size={30} className="relative" />
        </div>

        <h3 className="relative text-lg font-black text-foreground sm:text-xl">
          {dragOver
            ? (isEn ? "Drop it now 🎯" : "أفلت الملف دلوقتي 🎯")
            : (isEn ? "Drag the lecture file here, or click" : "اسحب ملف المحاضرة هنا أو اضغط للاختيار")}
        </h3>
        <p className="relative mt-1.5 text-[12.5px] text-muted-foreground">
          {isEn
            ? `PDF · PowerPoint · Word · TXT · images — up to ${formatSize(maxSize)}`
            : `PDF · PowerPoint · Word · TXT · صور — لغاية ${formatSize(maxSize)}`}
        </p>

        <div className="relative mt-5 flex flex-wrap justify-center gap-1.5">
          {FORMATS.map(({ ext, labelAr, labelEn, Icon, tone }) => (
            <span key={ext} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold", tone)}>
              <Icon size={15} />
              {ext}
              <span className="hidden text-muted-foreground sm:inline">· {isEn ? labelEn : labelAr}</span>
            </span>
          ))}
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border pt-4 text-[11.5px] text-muted-foreground">
          {BENEFITS.map(({ Icon, ar, en }) => (
            <span key={ar} className="inline-flex items-center gap-1.5">
              <Icon size={14} />
              {isEn ? en : ar}
            </span>
          ))}
        </div>
      </div>
      {fileInput}
    </div>
  );
}

export { LAYOUTS as UPLOAD_LAYOUTS };
