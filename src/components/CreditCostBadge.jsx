import React from "react";
import { PaymentIcon } from "@/components/ui/icons";
import { useLocale } from "@/lib/LocaleContext";

/**
 * شارة موحّدة لعرض تكلفة أي عملية بالكريدت بالأيقونة ثلاثية الأبعاد 3D.
 * variant: "badge" (افتراضي صغير) | "pill" (أوضح وأكبر)
 */
export default function CreditCostBadge({ cost, label, variant = "badge", className = "" }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const defaultLabel = isEn ? "Cost" : "التكلفة";
  const creditUnit = isEn ? (cost === 1 ? "credit" : "credits") : "كريدت";
  const displayLabel = label || defaultLabel;

  if (variant === "pill") {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-yellow-400 font-bold ${className}`}>
        <PaymentIcon size={18} />
        <span className="text-xs font-black">{displayLabel}: {cost} {creditUnit}</span>
      </div>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-bold text-yellow-400 ${className}`}>
      <PaymentIcon size={14} /> {cost} {creditUnit}
    </span>
  );
}