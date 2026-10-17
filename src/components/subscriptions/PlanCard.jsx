import React from "react";
import { Check, Coins, ArrowRight } from "@/components/ui/animatedIcons";
import { planCredits, yearlyPrice, yearlyMonthlyEquivalent } from "@/lib/plans";
import { useLocale } from "@/lib/LocaleContext";

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
    <div
      dir={dir}
      onClick={() => onSelect(plan)}
      className={`plan cursor-pointer flex flex-col justify-between ${isHighlighted ? "hot" : ""}`}
      style={{
        borderColor: isHighlighted ? "var(--sig)" : "var(--line)",
        backgroundColor: "var(--paper2)",
        borderRadius: "4px",
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <b className="text-base block">
              {plan.nameAr && !isEn ? `${plan.name} (${plan.nameAr})` : plan.name}
            </b>
            {isCurrentPlan && (
              <span className="mono text-[0.7rem] block mt-0.5" style={{ color: "var(--sig)" }}>
                {isEn ? "Current Active Plan" : "باقتك الحالية"}
              </span>
            )}
          </div>

          {plan.popular && (
            <span className="tag on text-[0.68rem]">
              {isEn ? "Recommended" : "موصى بها"}
            </span>
          )}
        </div>

        <div className="my-3 pb-3 border-b border-[var(--line)]">
          <div className="flex items-baseline gap-1.5">
            <span className="serif text-3xl font-bold" style={{ color: isHighlighted ? "var(--sig)" : "var(--ink)" }}>
              {price === 0 ? (isEn ? "Free" : "مجاناً") : price}
            </span>
            {price > 0 && (
              <span className="mono text-[0.7rem]">
                {isEn
                  ? `EGP / ${isYearly ? "year" : "month"}`
                  : `ج.م / ${isYearly ? "سنة" : "شهر"}`}
              </span>
            )}
          </div>

          {isYearly && price > 0 && (
            <p className="mono text-[0.7rem] mt-1" style={{ color: "var(--sig)" }}>
              {isEn
                ? `≈ ${perMonth} EGP/mo · 2 months free`
                : `≈ ${perMonth} ج.م شهرياً · شهرين مجاناً`}
            </p>
          )}

          {credits > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--line)] text-xs font-mono">
              <Coins className="w-3.5 h-3.5" style={{ color: "var(--sig)" }} animated={false} />
              <span>
                {credits.toLocaleString()} {isEn ? "Credits" : "نقطة كريدت"}
              </span>
            </div>
          )}
        </div>

        <ul className="text-sm mb-4 list-none p-0 m-0 space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: "var(--ink)" }}>{f}</span>
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--sig)" }} animated={false} />
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`btn sm w-full ${isHighlighted ? "" : "line"}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(plan);
        }}
      >
        {selected ? (
          <>
            <Check className="w-3.5 h-3.5" animated={false} />
            <span>{isEn ? "Selected" : "الباقة المحددة"}</span>
          </>
        ) : isCurrentPlan ? (
          <span>{isEn ? "Current Plan" : "خطتك الحالية"}</span>
        ) : (
          <>
            <span>{isEn ? "Select Plan" : "اختر الباقة"}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" animated={false} />
          </>
        )}
      </button>
    </div>
  );
}
