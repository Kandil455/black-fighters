import React from "react";
import { Loader2, CheckCircle2 } from "@/components/ui/animatedIcons";

export default function YouTubeProgressStep({
  isProcessing,
  processStep,
  stepLabels,
  isEn,
}) {
  if (!isProcessing) return null;

  return (
    <div className="border border-primary/30 rounded-3xl p-6 sm:p-8 bg-card space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span>{isEn ? "Autonomous Clinical Analysis Engine Active" : "محرك التحليل الطبي الذاتي نشط"}</span>
        </h3>
        <span className="text-xs font-mono text-primary font-bold">
          {Math.min(100, Math.round(((processStep + 1) / 4) * 100))}%
        </span>
      </div>

      <div className="space-y-3">
        {stepLabels.map((label, idx) => {
          const isPast = idx < processStep;
          const isCurrent = idx === processStep;
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors duration-300 ${
                isPast
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : isCurrent
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/30 border-border text-muted-foreground"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                  isPast
                    ? "bg-emerald-500 text-black"
                    : isCurrent
                    ? "bg-primary text-primary-foreground animate-pulse"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span className="text-xs sm:text-sm font-semibold">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
