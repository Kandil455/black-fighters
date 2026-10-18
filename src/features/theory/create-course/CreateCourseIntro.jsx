import React from "react";
import { Sparkles, Check, Zap } from "lucide-react";
import { calculateSummaryCost } from "@/lib/economyCatalog";

export default function CreateCourseIntro({ isEn, step, pendingTextLength }) {
  const steps = isEn
    ? ["1. Upload Lecture", "2. AI Summarization", "3. Review & Save"]
    : ["١. رفع المحاضرة", "٢. التلخيص الذكي", "٣. المراجعة والحفظ"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isEn
                ? "Smart Lecture Summarizer"
                : "ملخص المحاضرات الذكي"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            {isEn
              ? "Upload Your Lecture & Summarize"
              : "ارفع محاضرتك وابدأ التلخيص"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isEn
              ? "Choose your summary language (Bilingual, English, or Arabic) and size (Small, Medium, or Large) — every key feature preserved."
              : "حدد لغة الملخص (ثنائي اللغة، إنجليزي، أو عربي) وحجم التلخيص (صغير، متوسط، أو كبير) — مع الحفاظ على كل المهم والفيتشرز."}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
          <Zap className="w-4 h-4" />
          <span>
            {pendingTextLength
              ? isEn
                ? `Cost: ${calculateSummaryCost(pendingTextLength)} Credits`
                : `التكلفة: ${calculateSummaryCost(pendingTextLength)} كريدت`
              : isEn
              ? "2 – 15 Credits by lecture size"
              : "من 2 إلى 15 كريدت حسب حجم المحاضرة"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                step === i
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : step > i
                  ? "bg-green-500/15 text-green-400 border border-green-500/25"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              {step > i ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{label}</span>
            </div>
            {i < 2 && (
              <div
                className={`flex-1 h-0.5 rounded ${
                  step > i ? "bg-green-500/40" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
