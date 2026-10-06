import React from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, X, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseGenerationLoader({ fileName, statusText, progress, onCancel }) {
  const safeProgress = Math.max(1, Math.min(100, Number(progress) || 1));
  const remaining = safeProgress >= 95 ? "أقل من دقيقة" : safeProgress >= 50 ? "حوالي دقيقة" : "1-3 دقائق";

  return (
    <motion.section
      key="processing"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="surface-card mx-auto max-w-2xl overflow-hidden rounded-3xl border border-primary/20"
      aria-live="polite"
    >
      <div className="h-1 w-full bg-secondary">
        <motion.div className="h-full bg-gradient-to-l from-primary via-cyan-400 to-accent" animate={{ clipPath: `inset(0% ${100 - safeProgress}% 0% 0%)` }} />
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/8 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="absolute -bottom-1 -left-1 rounded-full bg-background px-1.5 text-[10px] font-black text-primary">{safeProgress}%</span>
          </div>
          <div className="min-w-0 flex-1 text-start">
            <p className="text-xs font-bold text-primary">جاري بناء الملخص</p>
            <h2 className="mt-1 text-lg font-black leading-snug">{statusText || "الـ AI بيقرأ المحتوى وينظمه"}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5"><FileText className="h-3.5 w-3.5" /><span className="max-w-[220px] truncate">{fileName}</span></span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{remaining}</span>
            </div>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onCancel} aria-label="إلغاء التلخيص" className="shrink-0 text-muted-foreground hover:text-destructive">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-primary via-cyan-400 to-accent"
            animate={{ clipPath: `inset(0% ${100 - safeProgress}% 0% 0%)` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">تقدر تسيب الصفحة مفتوحة. الأجزاء المكتملة محفوظة، ولو الشبكة قطعت هنكمل من آخر نقطة.</p>
      </div>
    </motion.section>
  );
}
