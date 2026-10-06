import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, 
  X, ShieldCheck, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MagneticButton from "@/components/ui/MagneticButton";
import { LottieUpload, LottieLightning, LottieBrain, LottieDoc } from "@/components/ui/LottieIcons";
import { PdfIcon, PptxIcon, DocxIcon, TextFileIcon, SmartFileIcon } from "@/components/ui/FileTypeIcons";
import { useLocale } from "@/lib/LocaleContext";

const SUPPORTED_TYPES = [
  { ext: "PDF", labelAr: "مذكرات وكتب", labelEn: "Notes & Books", icon: PdfIcon, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
  { ext: "PPTX", labelAr: "سلايدات المحاضرة", labelEn: "Lecture Slides", icon: PptxIcon, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  { ext: "DOCX", labelAr: "ملفات Word", labelEn: "Word Documents", icon: DocxIcon, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
  { ext: "TXT / صور", labelAr: "نصوص وملاحظات", labelEn: "Notes & Text", icon: TextFileIcon, color: "text-[hsl(152,100%,50%)]", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
];

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function PremiumUploadDropzone({ onFile, maxSize = 50 * 1024 * 1024 }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const internalRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > maxSize) {
      toast.error(isEn ? `File too large — Maximum size ${formatSize(maxSize)}` : `حجم الملف كبير جداً — الحد الأقصى ${formatSize(maxSize)}`);
      return;
    }
    setSelectedFile(file);
  };

  const dropHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer?.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (internalRef.current) internalRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile || submitting) return;
    setSubmitting(true);
    try {
      await onFile(selectedFile);
    } catch (e) {
      toast.error(e.message || "حدث خطأ أثناء معالجة الملف");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full select-none">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          /* File ready card with Laser Glow */
          <motion.div
            key="selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="ios-glass-card rounded-3xl p-6 sm:p-8 border border-primary/40 shadow-[0_20px_50px_rgba(0,245,255,0.2)] relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-accent" />

            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/10 mb-6">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <SmartFileIcon filename={selectedFile.name} size={32} />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-foreground truncate font-heading">{selectedFile.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{formatSize(selectedFile.size)}</span>
                    <span>•</span>
                    <span className="text-[hsl(152,100%,50%)] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {isEn ? "Ready for analysis" : "جاهز للتحليل"}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={clearFile} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <MagneticButton strength={0.3} className="w-full">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                size="lg"
                className="w-full h-14 font-black text-base gap-2 rounded-2xl shadow-[0_8px_30px_rgba(0,245,255,0.4)]"
              >
                <Sparkles className={cn("w-5 h-5", submitting && "animate-spin")} />
                {submitting 
                  ? (isEn ? "Summarizing and building course..." : "جاري التلخيص وبناء المحتوى...") 
                  : (isEn ? "Start Lecture Summary Now" : "بدء تلخيص المحاضرة الآن (Summarize)")}
                {!submitting && <ArrowUpRight className="w-4 h-4" />}
              </Button>
            </MagneticButton>

            <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {isEn ? "Strict Privacy — High-precision rapid analysis" : "خصوصية تامة — التحليل يتم بسرعة ودقة فائقة"}
            </p>
          </motion.div>

        ) : (
          /* Animated Hologram Portal & Laser Scanner */
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="button"
            tabIndex={0}
            onClick={() => internalRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
            onDrop={dropHandler}
            className={cn(
              "group relative ios-glass-card rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-colors duration-300 overflow-hidden border-2",
              dragOver
                ? "border-primary shadow-[0_0_50px_rgba(0,245,255,0.35)] scale-[1.01]"
                : "border-dashed border-white/20 hover:border-primary/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            )}
          >
            {/* Animated Laser Scanning Beam */}
            <motion.div
              className="absolute inset-x-0 h-28 bg-gradient-to-b from-primary/0 via-primary/10 to-primary/0 pointer-events-none"
              animate={{ y: ["-100%", "300%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none opacity-60"
              animate={{ y: ["-100%", "300%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Glowing Hologram Upload Core */}
            <div className="relative mb-6 inline-flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute inset-0 bg-primary/25 rounded-full blur-2xl pointer-events-none"
              />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary/20 via-cyan-400/10 to-accent/20 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300"
              >
                <LottieUpload className={cn("w-14 h-14 transition-transform duration-300", dragOver && "scale-110")} />
              </motion.div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black mb-2 font-heading text-foreground tracking-tight">
              {dragOver 
                ? (isEn ? "Drop file here immediately! 🎯" : "أفلت الملف هنا فوراً! 🎯") 
                : (isEn ? "Drag & drop lecture file here, or click to browse" : "اسحب ملف المحاضرة هنا أو اضغط للاختيار")}
            </h3>
            
            <p className="text-xs sm:text-sm text-muted-foreground mb-8 font-medium">
              {isEn 
                ? `Supports PDF • PowerPoint • Word • TXT • Notes Images (up to ${formatSize(maxSize)})`
                : `يدعم ملفات PDF • PowerPoint • Word • TXT • صور المذكرات (لغاية ${formatSize(maxSize)})`}
            </p>

            {/* Supported Badges */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {SUPPORTED_TYPES.map(({ ext, labelAr, labelEn, icon: IconComponent, color, bg, border }) => (
                <span key={ext} className={cn("inline-flex items-center gap-2 text-xs font-bold rounded-xl px-3.5 py-1.5 border backdrop-blur-md shadow-sm", bg, border, color)}>
                  <IconComponent size={18} />
                  <span>{ext} — {isEn ? labelEn : labelAr}</span>
                </span>
              ))}
            </div>

            {/* Micro Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-center">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <LottieLightning className="w-5 h-5 mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{isEn ? "Instant Deep Summary" : "تلخيص فوري مكثف"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isEn ? "Key concepts extraction" : "استخراج أهم المفاهيم"}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <LottieBrain className="w-5 h-5 mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{isEn ? "Smart MCQ Quizzes" : "كويزات MCQ ذكية"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isEn ? "Questions with explanations" : "أسئلة مع شروحات"}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <LottieDoc className="w-5 h-5 mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{isEn ? "Spaced Flashcards" : "بطاقات مراجعة"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isEn ? "Fast active recall" : "حفظ وتثبيت سريع"}</p>
              </div>
            </div>

            <input
              ref={internalRef}
              type="file"
              accept=".pdf,.pptx,.docx,.txt,.csv,.html,.htm,.md,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
