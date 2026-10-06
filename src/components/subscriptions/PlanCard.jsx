import React from "react";
import { Check, Coins, ArrowRight } from "lucide-react";
import { planCredits, yearlyPrice, yearlyMonthlyEquivalent } from "@/lib/plans";
import { useLocale } from "@/lib/LocaleContext";
import { GlassCard, LVBadge } from "@/components/ui/linevault";
import { Button } from "@/components/ui/button";

export default function PlanCard({
  plan,
  billing,
  selected,
  isCurrentPlan = false,
  onSelect,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const isYearly = billing === "yearly";
  const price = isYearly ? yearlyPrice(plan.monthly) : plan.monthly;
  const perMonth = isYearly
    ? yearlyMonthlyEquivalent(plan.monthly)
    : plan.monthly;
  const credits = planCredits(plan, billing);

  const rawFeatures =
    isEn && plan.featuresEn ? plan.featuresEn : plan.features || [];
  const features = rawFeatures.slice(0, 6);

  const isHighlighted = selected || plan.popular;

  return (
    <GlassCard
      dir={dir}
      accent={isHighlighted}
      interactive
      onClick={() => onSelect(plan)}
      className="flex flex-col justify-between h-full p-6"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-[#eef2f6]">
              {plan.nameAr && !isEn ? `${plan.name} (${plan.nameAr})` : plan.name}
            </h3>
            {isCurrentPlan && (
              <span className="text-xs font-medium text-[#19f08c] block mt-0.5">
                {isEn ? "Current Active Plan" : "باقتك الحالية"}
              </span>
            )}
          </div>

          {plan.popular && (
            <LVBadge variant="accent">
              {isEn ? "Recommended" : "موصى بها"}
            </LVBadge>
          )}
        </div>

        <div className="my-4 pb-4 border-b border-[rgb(255_255_255/0.09)]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold font-mono tabular text-[#eef2f6]">
              {price === 0 ? (isEn ? "Free" : "مجاناً") : price}
            </span>
            {price > 0 && (
              <span className="text-xs text-[#9aa6b4]">
                {isEn
                  ? `EGP / ${isYearly ? "year" : "month"}`
                  : `ج.م / ${isYearly ? "سنة" : "شهر"}`}
              </span>
            )}
          </div>

          {isYearly && price > 0 && (
            <p className="text-xs text-[#19f08c] font-mono tabular mt-1">
              {isEn
                ? `≈ ${perMonth} EGP/mo · 2 months free`
                : `≈ ${perMonth} ج.م شهرياً · شهرين مجاناً`}
            </p>
          )}

          {credits > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#19f08c]/10 border border-[#19f08c]/30 text-xs font-mono tabular text-[#19f08c]">
              <Coins className="w-3.5 h-3.5" />
              <span>
                {credits.toLocaleString()} {isEn ? "Credits" : "نقطة كريدت"}
              </span>
            </div>
          )}
        </div>

        <ul className="divide-y divide-[rgb(255_255_255/0.09)] text-sm mb-6 list-none p-0 m-0">
          {features.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2.5 py-2.5">
              <span className="text-[#eef2f6]/90 text-xs sm:text-sm leading-relaxed">
                {f}
              </span>
              <Check className="w-4 h-4 text-[#19f08c] shrink-0" />
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        variant={isHighlighted ? "default" : "secondary"}
        className="w-full"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(plan);
        }}
      >
        {selected ? (
          <>
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isEn ? "Selected" : "الباقة المحددة"}</span>
          </>
        ) : isCurrentPlan ? (
          <span>{isEn ? "Current Plan" : "خطتك الحالية"}</span>
        ) : (
          <>
            <span>{isEn ? "Select Plan" : "اختر الباقة"}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </>
        )}
      </Button>
    </GlassCard>
  );
}
