import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Upload, Sliders, 
  CheckCircle2, Loader2, Zap, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/lib/LocaleContext";
import { playClick } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export function ImageExtractorUpload({ onStartExtraction, isProcessing, progress }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [minDimension, setMinDimension] = useState(100);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "pptx", "ppt", "png", "jpg", "jpeg", "webp"].includes(ext)) {
      alert(isEn ? "Please select a PDF, PowerPoint (PPTX), or Image file." : "يرجى اختيار ملف PDF أو عرض PowerPoint (PPTX) أو صورة.");
      return;
    }
    setSelectedFile(file);
    playClick();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleSubmit = () => {
    if (!selectedFile || isProcessing) return;
    playClick();
    onStartExtraction({
      file: selectedFile,
      options: {
        withAiClassify: false,
        minDimension: Number(minDimension) || 100,
        allowDuplicates,
      },
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" dir={dir}>
      {/* No second hero here on purpose: the page already renders the title and
          subtitle, so this panel opened with a near-identical purple badge,
          headline and paragraph — the "why does this page say the same thing
          twice" duplication. It now leads with the action itself. */}

      {/* Main Dropzone Card */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-colors duration-300 backdrop-blur-xl group overflow-hidden",
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01] shadow-[0_0_40px_rgba(0,245,255,0.2)]"
            : selectedFile
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-white/15 bg-[#0a0b12]/80 hover:border-white/30 hover:bg-white/[0.04]"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp"
          className="hidden"
          disabled={isProcessing}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            {selectedFile ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <Upload className="w-8 h-8 text-primary group-hover:text-cyan-300 transition-colors" />
            )}
          </div>

          <div className="space-y-1 text-center">
            {selectedFile ? (
              <>
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  {selectedFile.name}
                </h3>
                <p className="text-xs text-emerald-400 font-bold">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {isEn ? "Click to change file" : "اضغط لتغيير الملف"}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isEn ? "Drag & drop lecture file here or " : "اسحب وأفلت ملف المحاضرة هنا أو "}
                  <span className="text-primary underline">{isEn ? "browse files" : "تصفح جهازك"}</span>
                </h3>
                <p className="text-xs text-white/50">
                  {isEn ? "Supports PDF, PowerPoint (PPTX), and image files for all disciplines" : "ندعم ملفات PDF، عروض PowerPoint (PPTX)، والصور بجميع أنواعها لجميع التخصصات"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Heuristics & AI Options */}
      <div className="p-5 rounded-2xl bg-[#0a0b12]/90 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
          <Sliders className="w-4 h-4" />
          <span>{isEn ? "Smart Filtering & Extraction Settings" : "إعدادات الفلترة الذكية والميزانية"}</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Deduplication Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">
                {isEn ? "Remove Duplicate Slides & Logos" : "استبعاد الصور المكررة والترويسات"}
              </span>
              <p className="text-[11px] text-white/50">
                {isEn ? "Digital perceptual hash (aHash) matching to discard repeated university logos" : "تحليل البصمة الرقمية (aHash) وحذف لوجوهات الجامعة المتكررة عبر السلايدات"}
              </p>
            </div>
            <Switch
              checked={!allowDuplicates}
              onCheckedChange={(val) => setAllowDuplicates(!val)}
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Cost & Transparency Notice */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{isEn ? "Extraction & local filtering is 100% free" : "الاستخراج والفلترة المحلية مجانية 100%"}</strong>{" "}
              {isEn ? "without credit usage. AI quiz generation displays proportional cost before deduction." : "بدون استهلاك كريدت. توليد الكويزات بالذكاء الاصطناعي سيعرض تكلفته التناسبية للموافقة قبل الخصم."}
            </span>
          </div>

          <Button
            type="button"
            disabled={!selectedFile || isProcessing}
            onClick={handleSubmit}
            className="w-full sm:w-auto h-11 px-7 rounded-xl font-black text-xs text-black bg-gradient-to-r from-cyan-400 to-primary hover:opacity-95 transition-colors shadow-lg shrink-0 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? "Processing..." : "جاري المعالجة..."}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>{isEn ? "Start Image Extraction 🚀" : "بدء استخراج الصور والتحليل 🚀"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Real-time Progress Bar */}
      {isProcessing && progress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[#090a10] border border-primary/30 shadow-[0_0_30px_rgba(0,245,255,0.15)] space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span>{progress.stageLabel || (isEn ? "Scanning document..." : "جاري فحص المستند...")}</span>
            </span>
            <span className="text-primary font-bold">{progress.percent || 0}%</span>
          </div>

          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-primary"
              initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
              animate={{ clipPath: `inset(0% ${100 - (progress.percent || 0)}% 0% 0%)` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
            <span>{progress.detail || (isEn ? "Extracting & filtering images..." : "استخراج الصور وفلترتها...")}</span>
            {progress.foundCount !== undefined && (
              <span className="text-emerald-400 font-bold">
                {isEn ? `Found ${progress.foundCount} images so far` : `تم العثور على ${progress.foundCount} صورة حتى الآن`}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default ImageExtractorUpload;
