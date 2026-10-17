import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, ShieldCheck, ShieldAlert, CheckCircle2, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/ui/linevault";
import { scanFileSecurity } from "@/lib/fileSecurityScanner";

const FEATURES = [
  { icon: FileText, label: "PDF / Word / PPT / TXT" },
  { icon: Zap, label: "تحليل وتنظيم تلقائي" },
  { icon: ShieldCheck, label: "فحص أمان SHA-256 بالخلفية" },
];

export default function UploadDropzone({ fileRef, onFile, maxSize = 50 * 1024 * 1024 }) {
  const internalFileRef = useRef(null);
  const inputRef = fileRef || internalFileRef;

  const [scanState, setScanState] = useState("idle"); // "idle" | "scanning" | "completed" | "rejected"
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLabel, setScanLabel] = useState("");
  const [activeFileName, setActiveFileName] = useState("");
  const [securityReport, setSecurityReport] = useState(null);

  const handlePickFile = () => {
    if (scanState === "scanning") return;
    inputRef.current?.click();
  };

  const processFile = async (file) => {
    if (!file || scanState === "scanning") return;
    setActiveFileName(file.name);
    setScanState("scanning");
    setScanProgress(10);
    setSecurityReport(null);

    try {
      const report = await scanFileSecurity(file, {
        maxSize,
        onStage: ({ progress, labelAr }) => {
          setScanProgress(progress);
          setScanLabel(labelAr);
        },
      });
      setSecurityReport(report);

      if (!report.safe) {
        setScanState("rejected");
        toast.error(report.reasonAr);
        return;
      }

      setScanProgress(100);
      setScanState("completed");
      await new Promise((r) => setTimeout(r, 550));
      onFile?.(file, report);
      setTimeout(() => {
        setScanState("idle");
        setScanProgress(0);
      }, 300);
    } catch (err) {
      setScanState("rejected");
      const msg = err?.message || "تعذر إكمال الفحص الأمني للملف";
      setSecurityReport({ safe: false, reasonAr: msg });
      toast.error(msg);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {scanState !== "idle" ? (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card relative overflow-hidden rounded-3xl border border-primary/40 p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background/60">
              {scanState === "rejected" ? (
                <ShieldAlert className="h-7 w-7 text-rose-400" />
              ) : scanState === "completed" ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              ) : (
                <ShieldCheck className="h-7 w-7 text-primary" />
              )}
            </div>

            <h4 className="text-base font-black text-foreground">{activeFileName}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {scanState === "rejected"
                ? securityReport?.reasonAr
                : scanState === "completed"
                  ? `تم التحقق الأمني بنجاح (${securityReport?.sha256Short || "SHA-256"}) — جاري المعالجة ✨`
                  : scanLabel}
            </p>

            {scanState !== "rejected" && (
              <div className="mx-auto mt-5 max-w-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">فحص الأمان وتجهيز الملف</span>
                  <span className="font-mono text-primary">
                    <AnimatedNumber value={scanProgress} suffix="%" />
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary p-0.5">
                  <motion.div
                    className="h-full w-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 origin-left rtl:origin-right"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.max(0.05, Math.min(1, scanProgress / 100)) }}
                    transition={{ type: "spring", stiffness: 110, damping: 20 }}
                  />
                </div>
              </div>
            )}

            {scanState === "rejected" && (
              <button
                type="button"
                onClick={() => {
                  setScanState("idle");
                  setScanProgress(0);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/30 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                اختر ملفاً آخر
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            role="button"
            tabIndex={0}
            onClick={handlePickFile}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handlePickFile(); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            className="group relative glass-card border-2 border-dashed border-primary/40 rounded-3xl p-10 md:p-16 text-center cursor-pointer hover:neon-glow-cyan transition-colors duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Upload className="w-14 h-14 text-primary mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">اسحب ملفك هنا أو اضغط للاختيار</h3>
              <p className="text-sm text-muted-foreground mb-6">يدعم PDF • PowerPoint • Word • TXT • صور — بحد أقصى 50MB</p>
              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-border bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                    <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.pptx,.docx,.txt,.csv,.html,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground text-center mt-4">النصيحة: لو الملف صور أو PDF ممسوح سكان، ارفع صورة واضحة أو PDF بجودة عالية.</p>
    </div>
  );
}