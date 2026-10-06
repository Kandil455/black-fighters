import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, ShieldCheck, Zap } from "lucide-react";

const FEATURES = [
  { icon: FileText, label: "PDF / Word / PPT / TXT" },
  { icon: Zap, label: "تحليل وتنظيم تلقائي" },
  { icon: ShieldCheck, label: "مراجعة قبل الحفظ" },
];

export default function UploadDropzone({ fileRef, onFile }) {
  const internalFileRef = useRef(null);
  const inputRef = fileRef || internalFileRef;

  const handlePickFile = () => {
    inputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <div
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
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.pptx,.docx,.txt,.csv,.html,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">النصيحة: لو الملف صور أو PDF ممسوح سكان، ارفع صورة واضحة أو PDF بجودة عالية.</p>
    </div>
  );
}