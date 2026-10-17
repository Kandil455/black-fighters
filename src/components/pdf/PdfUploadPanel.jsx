import React from "react";
import { Upload, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/LocaleContext";
import PdfVisualPageGrid from "@/components/pdf/PdfVisualPageGrid";

export default function PdfUploadPanel({
  fileRef,
  files,
  tool,
  accept,
  multiple,
  pages,
  setPages,
  angle,
  setAngle,
  compressionMode,
  setCompressionMode,
  watermark,
  setWatermark,
  onFiles,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const needsPages =
    tool?.id === "extract" ||
    tool?.id === "remove" ||
    tool?.id === "split" ||
    tool?.id === "reorder";
  const isRotate = tool?.id === "rotate";

  const placeholderText =
    tool?.id === "split"
      ? isEn
        ? "Optional: click pages above or type 1-3,4-6"
        : "اختياري: اضغط على الصفحات بالأعلى أو اكتب 1-3,4-6"
      : tool?.id === "reorder"
      ? isEn
        ? "Reorder visually above or type e.g. 3,1,2,4"
        : "رتّب الصفحات بالأسهم بالأعلى أو اكتب مثل: 3,1,2,4"
      : isEn
      ? "Click pages visually above or type e.g. 1-3,5"
      : "اضغط على الصفحات بالأعلى لتحديدها أو اكتب مثلاً: 1-3,5";

  return (
    <div className="space-y-4" dir={dir}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(Array.from(e.dataTransfer.files || []));
        }}
        className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        {files.length > 0 ? (
          <div className="space-y-1">
            {files.map((f, i) => (
              <p
                key={`${f.name}-${i}`}
                className="flex items-center justify-center gap-2 font-semibold text-sm"
              >
                <FileText className="w-4 h-4 text-primary" /> {f.name}
              </p>
            ))}
          </div>
        ) : (
          <>
            <Upload className="w-9 h-9 text-muted-foreground mx-auto mb-2.5" />
            <p className="text-sm text-muted-foreground">
              {tool?.uploadHint ||
                (isEn ? "Click or drag files here" : "اضغط أو اسحب الملفات هنا")}
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={(e) => onFiles(Array.from(e.target.files || []))}
        />
      </div>

      {/* Interactive Visual Page Thumbnail Grid */}
      {files[0] && (
        <PdfVisualPageGrid
          file={files[0]}
          toolId={tool?.id}
          pages={pages}
          setPages={setPages}
          angle={angle}
          setAngle={setAngle}
        />
      )}

      {needsPages && (
        <Input
          dir="ltr"
          placeholder={placeholderText}
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          className="text-center font-mono text-xs"
        />
      )}

      {tool?.id === "compress" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCompressionMode("preserve")}
            className={`rounded-xl border p-3 text-start ${
              compressionMode === "preserve"
                ? "border-primary bg-primary/10"
                : "border-border"
            }`}
          >
            <p className="text-sm font-black">
              {isEn ? "Preserve Text" : "حافظ على النص"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isEn
                ? "Searchable text, moderate reduction"
                : "نص قابل للبحث، تقليل محدود"}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setCompressionMode("smallest")}
            className={`rounded-xl border p-3 text-start ${
              compressionMode === "smallest"
                ? "border-primary bg-primary/10"
                : "border-border"
            }`}
          >
            <p className="text-sm font-black">
              {isEn ? "Smallest Size" : "أصغر حجم"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isEn
                ? "Targets ~3MB for mobile reading"
                : "يستهدف 3MB بجودة موبايل"}
            </p>
          </button>
        </div>
      )}

      {tool?.id === "pageNumbers" && (
        <Input
          value={watermark}
          onChange={(e) => setWatermark(e.target.value)}
          placeholder={
            isEn
              ? "Optional footer signature / watermark"
              : "توقيع إنجليزي اختياري أسفل الصفحات"
          }
          maxLength={40}
        />
      )}

      {isRotate && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[90, 180, 270].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAngle(a)}
                className={`glass-card rounded-xl py-2.5 font-bold border transition-colors ${
                  angle === a
                    ? "border-accent text-accent neon-glow-purple"
                    : "border-border text-muted-foreground"
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
          <Input
            dir="ltr"
            placeholder={
              isEn
                ? "Specific pages (optional) — blank rotates all"
                : "صفحات معينة (اختياري) — فاضي يدوّر كل الصفحات"
            }
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            className="text-center font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
