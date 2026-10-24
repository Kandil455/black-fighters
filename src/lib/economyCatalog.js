import { PLANS, planCredits, planPrice } from "./plans.js";

/**
 * Unified Credit Refill Packs — aligned with the Strictly Monotonic Progressive Pricing Curve:
 * - 100 cr  -> 50 EGP  (0.50 EGP/cr · Base)
 * - 250 cr  -> 125 EGP (0.50 EGP/cr · Entry)
 * - 500 cr  -> 235 EGP (0.47 EGP/cr · Save 6%)
 * - 1000 cr -> 425 EGP (0.425 EGP/cr · Save 15%)
 * - 2500 cr -> 905 EGP (0.362 EGP/cr · Save 28%)
 */
export const CREDIT_PACKS = [
  { key: "credits_50", name: "شحن 100 كريدت", nameEn: "100 Credits Pack", credits: 100, price: 50, discount: 0, popular: false },
  { key: "credits_150", name: "شحن 250 كريدت", nameEn: "250 Credits Pack", credits: 250, price: 120, discount: 4, popular: false },
  { key: "credits_400", name: "شحن 500 كريدت ⭐ (الباقة الطلابية)", nameEn: "500 Credits Pack ⭐ (Student Choice)", credits: 500, price: 235, discount: 6, popular: true },
  { key: "credits_1000", name: "شحن 1,000 كريدت 👑", nameEn: "1,000 Credits Pack 👑", credits: 1000, price: 425, discount: 15, popular: false },
  { key: "credits_2500", name: "شحن 2,500 كريدت 🔥", nameEn: "2,500 Credits Pack 🔥", credits: 2500, price: 905, discount: 28, popular: false },
];

/**
 * YouTube Pricing Formula:
 * - 1 hour (60 min) = 20 credits -> Exactly 3 minutes per 1 credit (Math.max(5, Math.ceil(minutes / 3)))
 * - Quiz Questions: 10 questions = 5 credits -> 0.5 credit per question (Math.ceil(quizCount * 0.5))
 */
export function calculateYouTubeCost({ durationSeconds, transcriptChars, mode = "both", quizCount = 10 } = {}) {
  let minutes = 0;
  if (durationSeconds && Number(durationSeconds) > 0) {
    minutes = Math.ceil(Number(durationSeconds) / 60);
  } else {
    // Fallback: estimate from transcript text (~850 chars/min)
    const chars = Math.max(0, Number(transcriptChars) || 0);
    minutes = Math.max(15, Math.ceil(chars / 850));
  }

  // 1 hour = 20 credits (1 credit per 3 min, min 5 credits)
  const durationCost = Math.max(5, Math.ceil(minutes / 3));

  // 10 questions = 5 credits (0.5 credit per question, min 3 credits if requested)
  const count = Math.max(0, Number(quizCount) || 0);
  const quizCost = count > 0 ? Math.max(3, Math.ceil(count * 0.5)) : 0;

  if (mode === "summary_only") return durationCost;
  if (mode === "quiz_only") return Math.max(5, quizCost);
  return durationCost + quizCost;
}

export function calculateSummaryCost(input = 0) {
  let chars = 0;
  let pages = 0;
  let style = "";
  let maxPages = 0;

  if (typeof input === "object" && input !== null) {
    chars = Number(input.charCount || input.chars || 0);
    pages = Number(input.pageCount || input.pages || 0);
    style = String(input.summaryStyle || "");
    maxPages = Number(input.maxPages || 0);
  } else {
    chars = Math.max(0, Number(input) || 0);
  }

  // Progressive credit scaling by volume
  let cost = 2;
  if (chars > 120_000) cost = 35;
  else if (chars > 80_000) cost = 25;
  else if (chars > 50_000) cost = 18;
  else if (chars > 30_000) cost = 12;
  else if (chars > 15_000) cost = 8;
  else if (chars > 6_000) cost = 5;
  else if (chars > 2_000) cost = 3;
  else cost = 2;

  // Page-based scaling for PDFs/slides if available
  if (pages > 0) {
    const pageCost = Math.ceil(pages * 0.6);
    cost = Math.max(cost, pageCost);
  }

  // Summary depth modifier
  if (style === "ultra_multi_agent") {
    cost += 10;
  } else if (style === "deep" || style === "comprehensive" || maxPages > 5) {
    cost += 4;
  } else if (style === "flash" || style === "bullet") {
    cost = Math.max(2, cost - 1);
  }

  return Math.min(50, Math.max(2, cost));
}

/**
 * OCR in PDF Tools is 100% Free (0 Credits)
 */
export function calculateOcrCost() {
  return 0;
}

const CUSTOM_CREDIT_TIERS = [
  { min_qty: 100, max_qty: 250, unit_price: 0.5 },
  { min_qty: 250, max_qty: 500, unit_price: 0.44 },
  { min_qty: 500, max_qty: 1000, unit_price: 0.38 },
  { min_qty: 1000, max_qty: 2500, unit_price: 0.32 },
  { min_qty: 2500, max_qty: 5000, unit_price: 0.27 },
  { min_qty: 5000, max_qty: Infinity, unit_price: 0.22 },
];

export function resolveCreditPack(packKey = "") {
  const key = String(packKey || "").trim();
  if (!key) return null;
  const preset = CREDIT_PACKS.find((item) => item.key === key);
  if (preset) return preset;

  const customMatch = key.match(/^custom_(\d+)$/);
  if (!customMatch) return null;
  const rawQty = Number(customMatch[1]);
  if (!Number.isFinite(rawQty) || rawQty < 50 || rawQty > 10000) return null;
  const safeQty = Math.round(rawQty);

  let progressiveTotal = 0;
  for (let i = 0; i < CUSTOM_CREDIT_TIERS.length; i++) {
    const bracketStart = i === 0 ? 0 : CUSTOM_CREDIT_TIERS[i].min_qty;
    const bracketEnd = CUSTOM_CREDIT_TIERS[i].max_qty ?? Infinity;
    if (safeQty > bracketStart) {
      const taxableInBracket = Math.min(safeQty, bracketEnd) - bracketStart;
      progressiveTotal += taxableInBracket * CUSTOM_CREDIT_TIERS[i].unit_price;
    }
  }
  const price = Math.max(1, Math.round(progressiveTotal));
  const baseTotal = Math.round(safeQty * 0.5);
  const discount = baseTotal > 0 ? Math.max(0, Math.round(((baseTotal - price) / baseTotal) * 100)) : 0;

  return {
    key: `custom_${safeQty}`,
    name: `شحن ${safeQty.toLocaleString()} كريدت مخصص`,
    nameEn: `Custom ${safeQty.toLocaleString()} Credits Pack`,
    credits: safeQty,
    price,
    discount,
    popular: false,
  };
}

export function getPurchasableProduct({
  productType,
  productKey,
  billing = "monthly",
  extraPackKey = "",
  upgradeFromPlanKey = "",
} = {}) {
  if (productType === "credits") {
    const pack = resolveCreditPack(productKey);
    if (!pack || Number(pack.price) <= 0) return null;
    return {
      ...pack,
      productType: "credits",
      amount: Number(pack.price),
      grantedCredits: Number(pack.credits),
    };
  }
  const plan = PLANS.find((item) => item.key === productKey);
  if (!plan || plan.key === "free" || plan.tier === "free") return null;

  let baseAmount = Number(planPrice(plan, billing) || 0);
  if (baseAmount <= 0) return null;

  if (upgradeFromPlanKey && !plan.isEmergency) {
    const prevPlan = PLANS.find(
      (p) => p.key === upgradeFromPlanKey && p.tier !== "free" && !p.isEmergency
    );
    if (prevPlan && prevPlan.key !== plan.key) {
      const prevCost = Number(planPrice(prevPlan, billing) || 0);
      if (baseAmount > prevCost && prevCost > 0) {
        baseAmount = Math.max(1, baseAmount - prevCost);
      }
    }
  }

  const extraPack = extraPackKey ? resolveCreditPack(extraPackKey) : null;
  const extraPrice = extraPack ? Number(extraPack.price || 0) : 0;
  const extraCredits = extraPack ? Number(extraPack.credits || 0) : 0;
  const baseCredits = Number(planCredits(plan, billing) || 0);
  const totalCredits = baseCredits + extraCredits;
  const totalAmount = baseAmount + extraPrice;

  return {
    ...plan,
    name: extraPack ? `${plan.name} + ${extraPack.name}` : plan.name,
    productType: "subscription",
    billing,
    amount: totalAmount,
    credits: totalCredits,
    grantedCredits: totalCredits,
    durationDays: billing === "yearly" ? 365 : 30,
    extraPackKey: extraPack?.key || "",
    upgradeFromPlanKey: upgradeFromPlanKey || "",
  };
}

export const AI_COST_RULES = {
  summary: { base: 2, includedChars: 20_000, stepChars: 20_000, cap: 30 },
  quiz: { creditsPerQuestions: 5 },
  ocr: { creditsPerPages: 0, cap: 0 },
};
