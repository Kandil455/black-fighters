import React, { useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PLANS, planPrice, planCredits } from "@/lib/plans";
import { CREDIT_PACKS } from "@/lib/economyCatalog";
import { PAYMENT_INFO } from "@/lib/paymentInfo";
import { optimizeImageToDataUrl } from "@/lib/storage";
import PlanCard from "@/components/subscriptions/PlanCard";
import RedeemCodePanel from "@/components/subscriptions/RedeemCodePanel";
import MyPaymentRequests from "@/components/subscriptions/MyPaymentRequests";
import {
  PageHeader,
  LVCard,
  LVBadge,
  AnimatedNumber,
  CopyField,
  CountdownRing,
  Stepper,
  LVConfigurator,
} from "@/components/ui/linevault";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Zap,
  Headphones,
  Check,
  X,
  Receipt,
  Upload,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const PLAN_COMPARISON_ROWS = [
  {
    featureAr: "رصيد الكريدتس الشهري",
    featureEn: "Monthly AI Credits",
    free: "10",
    starter: "350",
    pro: "900",
    supreme: "2,500",
  },
  {
    featureAr: "تلخيص المحاضرات والكتب PDF (1–1,000 صفحة)",
    featureEn: "PDF Lecture & Book Summaries (1–1,000p)",
    free: "محدود",
    starter: "✔",
    pro: "✔",
    supreme: "✔",
  },
  {
    featureAr: "المدقق الرقمي المزدوج للجرعات (Cross-Family Verifier)",
    featureEn: "Cross-Family Dosage Verifier",
    free: "—",
    starter: "✔",
    pro: "✔",
    supreme: "✔",
  },
  {
    featureAr: "معمل العملي والصور (OSCE / OSPE)",
    featureEn: "Practical Lab & Image Quizzes",
    free: "—",
    starter: "✔",
    pro: "✔",
    supreme: "✔",
  },
  {
    featureAr: "استوديو تلخيص محاضرات يوتيوب",
    featureEn: "YouTube AI Lecture Studio",
    free: "—",
    starter: "—",
    pro: "✔",
    supreme: "✔",
  },
  {
    featureAr: "تصدير PDF للطباعة + HTML بدون إنترنت",
    featureEn: "Printable PDF + Offline HTML Export",
    free: "—",
    starter: "PDF",
    pro: "PDF + HTML",
    supreme: "PDF + HTML",
  },
];

export default function Subscriptions() {
  const { profile, user, isAdmin } = useAuth();
  const currentAccount = profile || user;
  const isSubscribed =
    isAdmin ||
    Boolean(currentAccount?.is_pro) ||
    currentAccount?.subscription_plan === "starter" ||
    currentAccount?.subscription_plan === "pro" ||
    currentAccount?.subscription_plan === "supreme" ||
    currentAccount?.subscription_plan === "premium" ||
    currentAccount?.subscription_status === "active";

  const activePlanKey = isSubscribed
    ? currentAccount?.subscription_plan_key ||
      (currentAccount?.subscription_plan === "premium"
        ? "pro"
        : currentAccount?.subscription_plan) ||
      (isAdmin ? "supreme" : "pro")
    : "free";

  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [billing, setBilling] = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState(
    PLANS.find((plan) => plan.popular) || PLANS[1] || PLANS[0]
  );
  const [selectedPack, setSelectedPack] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutWindow, setCheckoutWindow] = useState(() => {
    const start = Date.now();
    return {
      startAt: new Date(start).toISOString(),
      expiresAt: new Date(start + 15 * 60 * 1000).toISOString(),
    };
  });

  const [method, setMethod] = useState("vodafone_cash");
  const [senderNumber, setSenderNumber] = useState("");
  const [note, setNote] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const paymentInfo = PAYMENT_INFO[method];

  const selectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const toggleCreditPack = (pack) => {
    setSelectedPack((prev) => (prev?.key === pack.key ? null : pack));
  };

  const handleSelectCustomPack = (customPack) => {
    setSelectedPack(customPack);
    toast.success(
      isEn
        ? `Added ${customPack.credits.toLocaleString()} custom credits to invoice`
        : `تمت إضافة ${customPack.credits.toLocaleString()} نقطة مخصصة إلى الفاتورة`
    );
    document
      .getElementById("smart-terminal")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const rawPlanCost = selectedPlan ? planPrice(selectedPlan, billing) : 0;

  const currentMainPlan = isSubscribed
    ? PLANS.find(
        (p) => p.key === activePlanKey && p.tier !== "free" && !p.isEmergency
      )
    : null;
  const currentPlanCost = currentMainPlan
    ? planPrice(currentMainPlan, billing)
    : 0;

  const isUpgradingMainPlan = Boolean(
    currentMainPlan &&
      selectedPlan &&
      !selectedPlan.isEmergency &&
      selectedPlan.key !== currentMainPlan.key &&
      rawPlanCost > currentPlanCost
  );

  const upgradeDiscount = isUpgradingMainPlan ? currentPlanCost : 0;
  const planCost = Math.max(0, rawPlanCost - upgradeDiscount);
  const packCost = selectedPack ? selectedPack.price : 0;
  const totalPrice = planCost + packCost;
  const includedCredits = selectedPlan ? planCredits(selectedPlan, billing) : 0;
  const totalCredits =
    includedCredits + (selectedPack ? selectedPack.credits : 0);

  const checkoutSteps = useMemo(() => {
    if (done) {
      return [
        { key: "awaiting", label: isEn ? "Awaiting transfer" : "في انتظار التحويل", state: "done" },
        { key: "receipt", label: isEn ? "Receipt attached" : "تم إرفاق الإيصال", state: "done" },
        { key: "verifying", label: isEn ? "Verifying payment" : "مراجعة وتدقيق التحويل", state: "current", sub: isEn ? "Auto-activating upon confirmation" : "يُفعّل الرصيد فور المطابقة" },
        { key: "fulfilling", label: isEn ? "Allocating credits" : "إضافة الرصيد لدفتر الحساب", state: "pending" },
        { key: "delivered", label: isEn ? "Delivered" : "تم التفعيل والتسليم", state: "pending" },
      ];
    }
    return [
      {
        key: "awaiting",
        label: isEn ? "Send exact amount" : "أرسل المبلغ المحدد بالضبط",
        state: screenshot ? "done" : "current",
        sub: `${totalPrice} ${isEn ? "EGP" : "ج.م"} · ${paymentInfo.label}`,
      },
      {
        key: "receipt",
        label: isEn ? "Attach receipt & sender number" : "أرفق صورة الإيصال ورقم المحوّل",
        state: screenshot && senderNumber.length === 11 ? "done" : screenshot ? "current" : "pending",
      },
      {
        key: "verifying",
        label: isEn ? "Confirm & verify order" : "تأكيد الطلب والمراجعة",
        state: "pending",
      },
      {
        key: "delivered",
        label: isEn ? "Credits & plan activated" : "تفعيل الباقة والرصيد",
        state: "pending",
      },
    ];
  }, [done, isEn, paymentInfo.label, screenshot, senderNumber.length, totalPrice]);

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await optimizeImageToDataUrl(file, 960, 0.82);
      setScreenshot(dataUrl);
      toast.success(
        isEn ? "Receipt screenshot attached" : "تم إرفاق صورة التحويل بنجاح"
      );
    } catch {
      toast.error(isEn ? "Failed to optimize image" : "تعذر تجهيز الصورة");
    } finally {
      setUploading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (totalPrice === 0) {
      toast.info(
        isEn
          ? "Select a paid plan or credit pack to proceed."
          : "اختر باقة مدفوعة أو باقة كريدتس إضافية للمتابعة."
      );
      return;
    }
    const start = Date.now();
    setCheckoutWindow({
      startAt: new Date(start).toISOString(),
      expiresAt: new Date(start + 15 * 60 * 1000).toISOString(),
    });
    setCheckoutStep(2);
    if (window.innerWidth < 1024) {
      document
        .getElementById("smart-terminal")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleConfirmTransfer = async () => {
    const cleanedNumber = senderNumber.trim().replace(/\D/g, "");
    if (!cleanedNumber) {
      return toast.error(
        isEn ? "Enter sender phone number" : "اكتب رقم التليفون اللي حوّلت منه"
      );
    }
    if (!/^01\d{9}$/.test(cleanedNumber)) {
      return toast.error(
        isEn
          ? "Phone number must be 11 digits starting with 01"
          : "رقم التليفون يجب أن يتكون من 11 رقماً ويبدأ بـ 01"
      );
    }
    if (!screenshot) {
      return toast.error(
        isEn
          ? "Transfer receipt screenshot is required"
          : "يرجى إرفاق صورة إيصال التحويل"
      );
    }

    setSubmitting(true);
    try {
      const isSub = selectedPlan && selectedPlan.key !== "free";
      const productType = isSub ? "subscription" : "credits";
      const productKey = isSub
        ? selectedPlan.key
        : selectedPack?.key || "credits_50";

      const compositeNote = [
        note.trim(),
        selectedPack && isSub
          ? `+ Extra Pack Add-on: ${selectedPack.name} (${selectedPack.price} EGP)`
          : null,
        `Total: ${totalPrice} EGP (${billing})`,
      ]
        .filter(Boolean)
        .join(" | ");

      await base44.functions.invoke("submitPayment", {
        productType,
        productKey,
        billing,
        method,
        senderNumber: cleanedNumber,
        screenshotUrl: screenshot,
        note: compositeNote,
        idempotencyKey: idempotencyKey.current,
      });

      setDone(true);
      toast.success(
        isEn ? "Transfer request submitted" : "تم إرسال طلبك للمراجعة والتفعيل"
      );
    } catch (e) {
      toast.error(e.message || (isEn ? "An error occurred" : "حدث خطأ"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetTerminal = () => {
    setDone(false);
    setCheckoutStep(1);
    setSenderNumber("");
    setNote("");
    setScreenshot(null);
    idempotencyKey.current = crypto.randomUUID();
  };

  return (
    <div
      className="space-y-10 pb-24 lg:pb-12"
      dir={dir || (isEn ? "ltr" : "rtl")}
    >
      <PageHeader
        badge={
          isEn
            ? "Double-Entry Credit Ledger · Instant Quote"
            : "دفتر رصيد مزدوج القيد · تسعير شفاف حسب الكمية"
        }
        title={isEn ? "Plans & Credit Configurator" : "الرصيد والباقات"}
        description={
          isEn
            ? "Pick a semester plan or configure your exact credit volume. Credits are reserved safely and refunded 100% if any job fails."
            : "اختر باقة فصلية جاهزة أو أعدّ كمية الكريدتس التي تحتاجها بالضبط. الرصيد محمي بالكامل ولا ينتهي."
        }
        action={
          <div className="glass inline-flex items-center gap-1 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                billing === "monthly"
                  ? "bg-[#19f08c] text-[#03150c]"
                  : "text-[#9aa6b4] hover:text-[#eef2f6]"
              )}
            >
              {isEn ? "Monthly" : "شهري"}
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                billing === "yearly"
                  ? "bg-[#19f08c] text-[#03150c]"
                  : "text-[#9aa6b4] hover:text-[#eef2f6]"
              )}
            >
              <span>{isEn ? "Yearly" : "سنوي"}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-mono",
                  billing === "yearly"
                    ? "bg-[#03150c]/20 text-[#03150c]"
                    : "bg-[#19f08c]/15 text-[#19f08c]"
                )}
              >
                {isEn ? "2 mo free" : "شهرين مجاناً"}
              </span>
            </button>
          </div>
        }
      />

      {/* ─── 1) LineVault Interactive Volume Configurator (configurator.tsx) ─── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#eef2f6]">
            {isEn
              ? "Custom Credit Configurator"
              : "حاسبة الكريدتس المخصصة (حسب الكمية)"}
          </h2>
          <p className="text-sm text-[#9aa6b4]">
            {isEn
              ? "Slide or select a quick chip to calculate your volume discount."
              : "اسحب المؤشر أو اختر كمية سريعة للحصول على خصم الشرائح تلقائياً."}
          </p>
        </div>
        <LVConfigurator
          locale={locale}
          onSelectCustomPack={handleSelectCustomPack}
        />
      </section>

      {/* ─── 2) Main Split Layout: Plans (Right) + Sticky Checkout Terminal (Left) ─── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-8">
          {/* Uniform Plan Cards Grid */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#eef2f6]">
              {isEn ? "Semester & Monthly Plans" : "الباقات الشهرية والسنوية"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  billing={billing}
                  selected={selectedPlan?.key === plan.key}
                  isCurrentPlan={plan.key === activePlanKey}
                  onSelect={selectPlan}
                />
              ))}
            </div>
          </div>

          {/* Quick Top-up Credit Packs */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-[#eef2f6]">
                {isEn
                  ? "Quick Top-Up Packs (Optional)"
                  : "شرائح شحن سريعة (اختياري)"}
              </h2>
              <p className="text-xs text-[#9aa6b4]">
                {isEn
                  ? "One-time top-up credits that never expire."
                  : "رصيد إضافي لا ينتهي بانتهاء الشهر ويُضاف مباشرة إلى الفاتورة."}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {CREDIT_PACKS.map((pack) => {
                const isSelected = selectedPack?.key === pack.key;
                return (
                  <button
                    key={pack.key}
                    type="button"
                    onClick={() => toggleCreditPack(pack)}
                    className={cn(
                      "glass rounded-[1.25rem] p-4 text-start transition-colors duration-150 flex flex-col justify-between gap-2.5",
                      isSelected
                        ? "border-[#19f08c]/60 bg-[#19f08c]/[0.08]"
                        : "hover:border-[rgb(255_255_255/0.16)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#eef2f6] truncate">
                        {pack.name}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded-full",
                          isSelected
                            ? "bg-[#19f08c] text-[#03150c] font-semibold"
                            : "bg-white/[0.05] text-[#9aa6b4]"
                        )}
                      >
                        {isSelected
                          ? isEn
                            ? "Added"
                            : "مضاف"
                          : isEn
                          ? "+ Add"
                          : "+ إضافة"}
                      </span>
                    </div>

                    <div className="text-xl font-semibold font-mono tabular text-[#eef2f6]">
                      {pack.credits.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-[#9aa6b4]">
                        {isEn ? "Cr" : "نقطة"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[rgb(255_255_255/0.09)] flex items-center justify-between text-xs font-mono tabular">
                      <span className="text-[#19f08c] font-semibold">
                        {pack.price} {isEn ? "EGP" : "ج.م"}
                      </span>
                      <span className="text-[#6b7785]">
                        {isEn ? "No expiry" : "بلا انتهاء"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan Comparison Table («مقارنة الباقات») */}
          <LVCard className="overflow-x-auto">
            <h3 className="text-lg font-semibold text-[#eef2f6] mb-4">
              {isEn ? "Plan Comparison" : "مقارنة الباقات"}
            </h3>
            <table className="w-full text-xs sm:text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-[rgb(255_255_255/0.09)] text-start">
                  <th className="py-2.5 px-3 text-start text-[#9aa6b4] font-medium">
                    {isEn ? "Feature" : "الميزة"}
                  </th>
                  <th className="py-2.5 px-3 text-center text-[#9aa6b4] font-medium">
                    Free
                  </th>
                  <th className="py-2.5 px-3 text-center text-[#eef2f6] font-semibold">
                    Starter
                  </th>
                  <th className="py-2.5 px-3 text-center text-[#19f08c] font-semibold">
                    Pro
                  </th>
                  <th className="py-2.5 px-3 text-center text-[#eef2f6] font-semibold">
                    Supreme
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(255_255_255/0.09)]">
                {PLAN_COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-3 text-[#eef2f6] font-medium">
                      {isEn ? row.featureEn : row.featureAr}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular text-[#9aa6b4]">
                      {row.free}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular text-[#eef2f6]">
                      {row.starter}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular text-[#19f08c] font-semibold">
                      {row.pro}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular text-[#eef2f6]">
                      {row.supreme}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </LVCard>
        </div>

        {/* ─── Sticky LineVault Checkout & Invoice Terminal (checkout-view.tsx) ─── */}
        <aside
          id="smart-terminal"
          className="w-full lg:w-[400px] shrink-0 lg:sticky lg:top-6 h-fit"
        >
          <LVCard padding="p-5 sm:p-6">
            {checkoutStep === 1 && !done && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-[rgb(255_255_255/0.09)]">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c]">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[#eef2f6]">
                        {isEn ? "Order Summary" : "ملخص الطلبية"}
                      </h3>
                      <span className="text-xs text-[#9aa6b4] block">
                        {isEn ? "Live server quote" : "تسعير فوري مؤكد"}
                      </span>
                    </div>
                  </div>
                  <LVBadge variant="accent">
                    <span className="size-1.5 rounded-full bg-[#19f08c]" />
                    <span>{isEn ? "Live" : "مباشر"}</span>
                  </LVBadge>
                </div>

                {/* Animated Total Display (1:1 LineVault Configurator Aside) */}
                <div>
                  <p className="text-xs font-medium text-[#9aa6b4]">
                    {isEn ? "Total Due" : "الإجمالي المطلوب"}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2 font-mono text-4xl sm:text-5xl font-semibold tracking-tight tabular text-[#eef2f6]">
                    <AnimatedNumber value={totalPrice} />
                    <span className="text-base font-normal text-[#9aa6b4]">
                      {isEn ? "EGP" : "ج.م"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[rgb(255_255_255/0.09)] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-[#eef2f6]">
                        {selectedPlan?.nameAr && !isEn
                          ? `${selectedPlan.name} (${selectedPlan.nameAr})`
                          : selectedPlan?.name}
                      </span>
                      <span className="font-mono tabular font-semibold text-sm text-[#eef2f6]">
                        {planCost === 0
                          ? isEn
                            ? "Free"
                            : "مجاناً"
                          : `${planCost} ${isEn ? "EGP" : "ج.م"}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#9aa6b4] pt-1.5 border-t border-[rgb(255_255_255/0.09)]">
                      <span>
                        {isEn ? "Included Credits" : "رصيد الكريدتس المرفق"}
                      </span>
                      <span className="font-mono tabular text-[#19f08c] font-semibold">
                        +{includedCredits.toLocaleString()}
                      </span>
                    </div>
                    {isUpgradingMainPlan && (
                      <div className="flex items-center justify-between text-xs text-[#19f08c] pt-1.5 border-t border-[rgb(255_255_255/0.09)]">
                        <span>
                          {isEn ? "Upgrade Difference Discount" : "خصم فرق الترقية"}
                        </span>
                        <span className="font-mono tabular">
                          -{upgradeDiscount} {isEn ? "EGP" : "ج.م"}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedPack && (
                    <div className="p-3.5 rounded-2xl bg-[#19f08c]/[0.07] border border-[#19f08c]/35 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-[#eef2f6] block">
                          {selectedPack.name}
                        </span>
                        <span className="text-xs font-mono tabular text-[#19f08c]">
                          +{selectedPack.credits.toLocaleString()}{" "}
                          {isEn ? "Credits" : "نقطة"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono tabular font-semibold text-[#eef2f6]">
                          {selectedPack.price} {isEn ? "EGP" : "ج.م"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedPack(null)}
                          className="p-1 rounded-lg text-[#9aa6b4] hover:text-[#ff5c6c]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[rgb(255_255_255/0.09)] flex items-center justify-between text-xs text-[#9aa6b4]">
                  <span>{isEn ? "Total Credits Delivered" : "إجمالي الكريدتس المستلمة"}</span>
                  <span className="font-mono tabular font-semibold text-base text-[#19f08c]">
                    <AnimatedNumber value={totalCredits} />
                  </span>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToPayment}
                >
                  <span>{isEn ? "Continue to Checkout" : "المتابعة إلى الدفع"}</span>
                  {dir === "rtl" ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px] text-[#9aa6b4]">
                  <div className="p-2.5 rounded-xl bg-white/[0.025] border border-[rgb(255_255_255/0.09)]">
                    <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-[#19f08c]" />
                    <span>{isEn ? "Ledger Safe" : "قيد مزدوج"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.025] border border-[rgb(255_255_255/0.09)]">
                    <Zap className="w-4 h-4 mx-auto mb-1 text-[#19f08c]" />
                    <span>{isEn ? "Fast Setup" : "تفعيل سريع"}</span>
                  </div>
                  <a
                    href="https://wa.me/201009275685"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white/[0.025] border border-[rgb(255_255_255/0.09)] hover:border-[rgb(255_255_255/0.16)] text-[#eef2f6]"
                  >
                    <Headphones className="w-4 h-4 mx-auto mb-1 text-[#19f08c]" />
                    <span>{isEn ? "Support" : "دعم فوري"}</span>
                  </a>
                </div>
              </div>
            )}

            {checkoutStep === 2 && !done && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[rgb(255_255_255/0.09)]">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep(1)}
                    className="text-xs text-[#19f08c] hover:underline font-medium flex items-center gap-1.5"
                  >
                    {dir === "rtl" ? (
                      <ArrowRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    )}
                    <span>{isEn ? "Back to Order Summary" : "العودة لملخص الطلبية"}</span>
                  </button>
                  <LVBadge variant="accent" mono>
                    {totalPrice} {isEn ? "EGP" : "ج.م"}
                  </LVBadge>
                </div>

                {/* LineVault CountdownRing Header (1:1 checkout-view.tsx) */}
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-[rgb(255_255_255/0.09)] bg-white/[0.03] p-3.5">
                  <div>
                    <h3 className="font-semibold text-sm text-[#eef2f6]">
                      {isEn ? "Complete Your Transfer" : "أكمل الدفع والتحويل"}
                    </h3>
                    <p className="text-xs text-[#9aa6b4] mt-0.5">
                      {isEn
                        ? "Send the exact amount and attach your receipt before the timer expires."
                        : "أرسل المبلغ المحدد بالضبط وأرفق صورة الإيصال خلال المهلة."}
                    </p>
                  </div>
                  <CountdownRing
                    startAt={checkoutWindow.startAt}
                    expiresAt={checkoutWindow.expiresAt}
                    size={64}
                  />
                </div>

                {/* Payment Method Picker */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PAYMENT_INFO).map(([key, m]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1.5",
                        method === key
                          ? "bg-[#19f08c]/10 text-[#19f08c] border-[#19f08c]/60"
                          : "bg-white/[0.03] text-[#9aa6b4] border-[rgb(255_255_255/0.09)] hover:text-[#eef2f6]"
                      )}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* LineVault CopyField for Exact Amount & Transfer Number */}
                <CopyField
                  label={isEn ? "Send Exact Amount" : "أرسل بالضبط"}
                  value={String(totalPrice)}
                  unit={isEn ? "EGP" : "ج.م"}
                  big
                  copyLabel={isEn ? "Copy" : "نسخ المبلغ"}
                  copiedLabel={isEn ? "Copied" : "تم النسخ"}
                />

                <CopyField
                  label={
                    isEn
                      ? `Transfer Number (${paymentInfo.label})`
                      : `رقم التحويل (${paymentInfo.label})`
                  }
                  value={paymentInfo.number}
                  copyLabel={isEn ? "Copy" : "نسخ الرقم"}
                  copiedLabel={isEn ? "Copied" : "تم النسخ"}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#9aa6b4] block">
                    {isEn
                      ? "Sender Phone Number (11 digits)"
                      : "رقم الهاتف المحوّل منه (11 رقماً)"}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={senderNumber}
                    onChange={(e) =>
                      setSenderNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 11)
                      )
                    }
                    placeholder="01xxxxxxxxx"
                    maxLength={11}
                    className="w-full h-11 px-3.5 rounded-xl bg-white/[0.035] border border-[rgb(255_255_255/0.09)] focus:border-[#19f08c]/60 focus:outline-none font-mono tabular text-sm text-[#eef2f6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#9aa6b4] flex items-center justify-between">
                    <span>
                      {isEn ? "Transfer Receipt Screenshot" : "صورة إيصال التحويل"}
                    </span>
                    <span className="text-[11px] text-[#ffb547]">
                      {isEn ? "Required" : "مطلوب"}
                    </span>
                  </label>

                  <label
                    className={cn(
                      "w-full p-3.5 rounded-xl border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors",
                      screenshot
                        ? "border-[#19f08c]/60 bg-[#19f08c]/10 text-[#19f08c]"
                        : "border-[rgb(255_255_255/0.16)] bg-white/[0.025] hover:border-[#19f08c]/40 text-[#9aa6b4]"
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#19f08c]" />
                    ) : screenshot ? (
                      <CheckCircle2 className="w-4 h-4 text-[#19f08c]" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium truncate">
                      {uploading
                        ? isEn
                          ? "Attaching..."
                          : "جاري تجهيز الصورة..."
                        : screenshot
                        ? isEn
                          ? "Receipt Attached (click to change)"
                          : "تم إرفاق الإيصال (اضغط للتغيير)"
                        : isEn
                        ? "Upload receipt image"
                        : "اضغط لرفع صورة الإيصال"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isEn ? "Optional note" : "ملاحظة اختيارية (مثل يوزر تيليجرام)"
                  }
                  className="w-full h-10 px-3.5 rounded-xl bg-white/[0.035] border border-[rgb(255_255_255/0.09)] text-xs text-[#eef2f6] placeholder:text-[#6b7785] focus:outline-none focus:border-[#19f08c]/60"
                />

                {/* LineVault Live Stepper (checkout/parts.tsx) */}
                <div className="pt-3 border-t border-[rgb(255_255_255/0.09)]">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#6b7785]">
                    {isEn ? "Order Progress" : "حالة الطلبية"}
                  </p>
                  <Stepper steps={checkoutSteps} />
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={submitting}
                  onClick={handleConfirmTransfer}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isEn ? "Submitting..." : "جاري إرسال الطلب..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {isEn ? "Confirm Transfer" : "تأكيد إرسال التحويل"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {done && (
              <div className="py-4 space-y-5">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#19f08c]/15 border border-[#19f08c]/30 flex items-center justify-center text-[#19f08c] mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-[#eef2f6]">
                      {isEn
                        ? "Transfer Request Received"
                        : "رُصدت دفعتك وجارٍ التأكيد"}
                    </h3>
                    <p className="text-xs text-[#9aa6b4] leading-relaxed">
                      {isEn
                        ? "Your subscription or credits will activate automatically upon verification."
                        : "نؤكّد إيصالك الآن وسيتم شحن الرصيد وتفعيل الباقة فوراً."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgb(255_255_255/0.09)] bg-white/[0.025] p-4">
                  <Stepper steps={checkoutSteps} />
                </div>

                <div className="space-y-2 pt-1">
                  <Button asChild className="w-full">
                    <a href="#my-requests">
                      <Receipt className="w-4 h-4" />
                      <span>{isEn ? "View My Orders" : "متابعة طلباتي"}</span>
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetTerminal}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isEn ? "Start New Order" : "ابدأ طلبية جديدة"}</span>
                  </Button>
                </div>
              </div>
            )}
          </LVCard>
        </aside>
      </div>

      {/* ─── Payment Requests & Promo Code Redemption ─── */}
      <div
        id="my-requests"
        className="pt-8 border-t border-[rgb(255_255_255/0.09)] space-y-6"
      >
        <MyPaymentRequests />
        <RedeemCodePanel />
      </div>
    </div>
  );
}
