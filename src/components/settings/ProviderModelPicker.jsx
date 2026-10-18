import React from "react";
import { cn } from "@/lib/utils";
import { PROVIDERS, COLOR_CLASSES, SOLE_MODEL_ID } from "@/lib/models";
import { CheckCircle2 } from "lucide-react";

export default function ProviderModelPicker({
  onProviderChange,
  onModelChange,
}) {
  const providerData = PROVIDERS.deepseek;
  const colors = COLOR_CLASSES[providerData.color] || COLOR_CLASSES.cyan;
  const soleModel = providerData.models[0];

  return (
    <div>
      <label className="text-sm font-semibold mb-2 block">محرك الذكاء الاصطناعي الموحد</label>
      <div
        onClick={() => {
          onProviderChange?.("deepseek");
          onModelChange?.(SOLE_MODEL_ID);
        }}
        className={cn(
          "w-full glass-card text-start rounded-2xl px-5 py-4 border cursor-pointer transition-colors duration-300",
          `${colors.border} ${colors.bg} ring-1 ${colors.border}`
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{providerData.icon}</span>
            <p className={cn("font-black text-sm sm:text-base", colors.text)}>
              {soleModel.name}
            </p>
            <span className="text-[10px] font-mono opacity-75 px-2 py-0.5 rounded bg-white/10">
              Vision + Text
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-black", colors.badge)}>
              المحرك النشط ⭐
            </span>
            <CheckCircle2 className={cn("w-4 h-4 shrink-0", colors.text)} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {soleModel.features}
        </p>
      </div>
    </div>
  );
}