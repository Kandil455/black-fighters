import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, LayoutGrid, List, Rows3, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { UploadIcon, LightningIcon, BrainIcon, DocumentIcon } from "@/components/ui/icons";
import { PdfIcon, PptxIcon, DocxIcon, TextFileIcon } from "@/components/ui/FileTypeIcons";

/**
 * The lecture-upload control, in THREE layouts.
 *
 * The owner's feedback on the previous version: "الحتة بتاع الرفع دي واخدة مكان
 * كبير وشكلها مقرف… اعملّي كذا شكل أختار منهم". The *action* is unchanged; the
 * *presentation* is now a choice:
 *
 *   hero    — one big inviting target (calmer than before)
 *   split   — drop area beside the format/benefit list
 *   compact — a single slim row, the least vertical space
 *
 * The choice is remembered per browser. Every layout keeps the same drag, click,
 * keyboard and paste-to-upload paths, so switching never removes a capability.
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
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const FORMATS = [
  { ext: "PDF", labelAr: "مذكرات وكتب", labelEn: "Notes & books", Icon: PdfIcon, tone: "text-rose-300 border-rose-400/30 bg-rose-400/10" },
  { ext: "PPTX", labelAr: "سلايدات", labelEn: "Slides", Icon: PptxIcon, tone: "text-orange-300 border-orange-400/30 bg-orange-400/10" },
  { ext: "DOCX", labelAr: "ملفات Word", labelEn: "Word", Icon: DocxIcon, tone: "text-sky-300 border-sky-400/30 bg-sky-400/10" },
  { ext: "TXT", labelAr: "نصوص وملاحظات", labelEn: "Text & notes", Icon: TextFileIcon, tone: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
];

const BENEFITS = [
  { Icon: LightningIcon, ar: "تلخيص فوري مكثف", en: "Instant deep summary" },
  { Icon: BrainIcon, ar: "كويزات MCQ ذكية", en: "Smart MCQ quizzes" },
  { Icon: DocumentIcon, ar: "بطاقات مراجعة", en: "Spaced flashcards" },
];

export default function PremiumUploadDropzone({ onFile, maxSize = 50 * 1024 * 1024 }) {
  const { locale } = useLocale();
  const { isLite, isPowerSaver } = usePerformanceMode();
  const isEn = locale === "en";
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "hero"; } catch { return "hero"; }
  });

  const chooseLayout = useCallback((id) => {
    setLayout(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ }
  }, []);

  // Paste-to-upload works in every layout.
  useEffect(() => {
    const onPaste = (event) => {
      const file = event.clipboardData?.files?.[0];
      if (file) onFile?.(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  const openPicker = () => inputRef.current?.click();

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) onFile?.(file);
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
    <div className="flex items-center gap-1" role="group" aria-label={isEn ? "Upload box style" : "شكل صندوق الرفع"}>
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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] font-bold text-muted-foreground">
        {isEn ? `Up to ${formatSize(maxSize)} per file` : `لغاية ${formatSize(maxSize)} للملف`}
      </span>
      {LayoutSwitcher}
    </div>
  );

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => e.target.files?.[0] && onFile?.(e.target.files[0])}
    />
  );

  // ── compact — one slim row ─────────────────────────────────────────────────
  if (layout === "compact") {
    return (
      <div className="space-y-2">
        {header}
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
        {header}
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
      {header}
      <div
        {...dropProps}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/45",
        )}
      >
        {/* A single soft wash. The previous version layered two infinite "laser"
            beams and three pulsing glows, which is most of why it read as heavy. */}
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
