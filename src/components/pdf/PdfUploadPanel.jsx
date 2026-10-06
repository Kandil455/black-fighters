import React from "react";
import { Upload, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/LocaleContext";

export default function PdfUploadPanel({ fileRef, files, tool, accept, multiple, pages, setPages, angle, setAngle, compressionMode, setCompressionMode, watermark, setWatermark, onFiles }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const needsPages = tool?.id === "extract" || tool?.id === "remove" || tool?.id === "split" || tool?.id === "reorder";
  const isRotate = tool?.id === "rotate";

  const placeholderText = tool?.id === "split" 
    ? (isEn ? "Optional: 1-3,4-6 or leave empty to split each page" : "اختياري: 1-3,4-6 أو سيبه فاضي لتقسيم كل صفحة")
    : tool?.id === "reorder" 
    ? (isEn ? "Sequence of all pages, e.g. 3,1,2,4" : "ترتيب كل الصفحات، مثال: 3,1,2,4")
    : (isEn ? "Page numbers, e.g. 1-3,5,8" : "أرقام الصفحات مثلاً: 1-3,5,8");

  return (
    <div className="space-y-5" dir={dir}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFiles(Array.from(e.dataTransfer.files || [])); }}
        className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        {files.length > 0 ? (
          <div className="space-y-1">
            {files.map((f, i) => (
              <p key={`${f.name}-${i}`} className="flex items-center justify-center gap-2 font-semibold text-sm">
                <FileText className="w-4 h-4 text-primary" /> {f.name}
              </p>
            ))}
          </div>
        ) : (
          <>
            <Upload className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {tool?.uploadHint || (isEn ? "Click or drag files here" : "اضغط أو اسحب الملفات هنا")}
            </p>
          </>
        )}
        <input ref={fileRef} type="file" multiple={multiple} accept={accept} className="hidden" onChange={(e) => onFiles(Array.from(e.target.files || []))} />
      </div>

      {needsPages && (
        <Input dir="ltr" placeholder={placeholderText} value={pages} onChange={(e) => setPages(e.target.value)} className="text-center" />
      )}

      {tool?.id === "compress" && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setCompressionMode("preserve")} className={`rounded-xl border p-3 text-start ${compressionMode === "preserve" ? "border-primary bg-primary/10" : "border-border"}`}>
            <p className="text-sm font-black">{isEn ? "Preserve Text" : "حافظ على النص"}</p>
            <p className="text-[10px] text-muted-foreground">{isEn ? "Searchable text, moderate reduction" : "نص قابل للبحث، تقليل محدود"}</p>
          </button>
          <button type="button" onClick={() => setCompressionMode("smallest")} className={`rounded-xl border p-3 text-start ${compressionMode === "smallest" ? "border-primary bg-primary/10" : "border-border"}`}>
            <p className="text-sm font-black">{isEn ? "Smallest Size" : "أصغر حجم"}</p>
            <p className="text-[10px] text-muted-foreground">{isEn ? "Targets ~3MB for mobile reading" : "يستهدف 3MB بجودة موبايل"}</p>
          </button>
        </div>
      )}

      {tool?.id === "pageNumbers" && (
        <Input 
          value={watermark} 
          onChange={(e) => setWatermark(e.target.value)} 
          placeholder={isEn ? "Optional footer signature / watermark" : "توقيع إنجليزي اختياري أسفل الصفحات"} 
          maxLength={40} 
        />
      )}

      {isRotate && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[90, 180, 270].map((a) => (
              <button key={a} onClick={() => setAngle(a)} className={`glass-card rounded-xl py-3 font-bold border transition-colors ${angle === a ? "border-accent text-accent neon-glow-purple" : "border-border text-muted-foreground"}`}>
                {a}°
              </button>
            ))}
          </div>
          <Input 
            dir="ltr" 
            placeholder={isEn ? "Specific pages (optional) — blank means all" : "صفحات معينة (اختياري) — فاضي يعني كله"} 
            value={pages} 
            onChange={(e) => setPages(e.target.value)} 
            className="text-center" 
          />
        </div>
      )}
    </div>
  );
}
