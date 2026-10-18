import React from "react";
import { Check, Sparkles } from "lucide-react";
import { planPrice, planCredits } from "@/lib/plans";
import { useLocale } from "@/lib/LocaleContext";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PlanCard({
  plan,
  billing = "monthly",
  selected = false,
  isCurrentPlan = false,
  onSelect,
}) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const price = planPrice(plan, billing);
  const credits = planCredits(plan, billing);

  const displayBadge = isEn ? plan.badgeEn || plan.badge : plan.badge;
  const displayTitle = isEn
    ? plan.nameEn || plan.name
    : plan.nameAr
    ? `${plan.name} (${plan.nameAr})`
    : plan.name;
  const displayTagline = isEn ? plan.taglineEn || plan.tagline : plan.tagline;
  const displayHighlights = isEn
    ? plan.highlightsEn || plan.highlights || []
    : plan.highlights || [];

  return (
    <LVCard
      interactive
      highlight={selected || plan.popular}
      padding="p-5 sm:p-6"
      onClick={() => onSelect?.(plan)}
      className={cn(
        "relative flex flex-col justify-between h-full transition-colors duration-150",
        selected && "border-[#19f08c] ring-1 ring-[#19f08c]/40"
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          {displayBadge ? (
            <LVBadge variant={plan.popular ? "accent" : "neutral"}>
              {plan.popular && <Sparkles className="w-3 h-3" />}
              <span>{displayBadge}</span>
            </LVBadge>
          ) : (
            <span />
          )}

          {isCurrentPlan && (
            <LVBadge variant="accent">
              {isEn ? "Active Plan" : "باقتك الحالية"}
            </LVBadge>
          )}
        </div>

        <h3 className="text-lg font-bold text-[#F2F3F5]">{displayTitle}</h3>
        <p className="text-xs text-[#9AA0AE] mt-1 leading-relaxed">
          {displayTagline}
        </p>

        <div className="my-5 pb-4 border-b border-[#1E222B]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono tabular-nums text-[#F2F3F5]">
              {price === 0 ? (isEn ? "Free" : "مجاناً") : price}
            </span>
            {price > 0 && (
              <span className="text-xs text-[#9AA0AE]">
                {isEn ? "EGP /" : "ج.م /"}{" "}
                {billing === "yearly"
                  ? isEn
                    ? "year"
                    : "سنة"
                  : isEn
                  ? "month"
                  : "شهر"}
              </span>
            )}
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-[#3DDC97]">
            <span>+{credits.toLocaleString()}</span>
            <span>{isEn ? "Credits" : "كريدت"}</span>
          </div>
        </div>

        <ul className="space-y-2.5 mb-6">
          {displayHighlights.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs text-[#F2F3F5]"
            >
              <Check className="w-4 h-4 text-[#3DDC97] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        variant={selected ? "default" : "outline"}
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(plan);
        }}
      >
        {selected
          ? isEn
            ? "Selected ✓"
            : "محددة حالياً ✓"
          : isEn
          ? plan.ctaEn || "Select Plan"
          : plan.cta || "اختيار الباقة"}
      </Button>
    </LVCard>
  );
}
