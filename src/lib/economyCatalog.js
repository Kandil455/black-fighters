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
  { key: "credits_50", name: "شحن 100 كريدت", credits: 100, price: 50, discount: 0, popular: false },
  { key: "credits_150", name: "شحن 250 كريدت", credits: 250, price: 120, discount: 4, popular: false },
  { key: "credits_400", name: "شحن 500 كريدت ⭐ (الباقة الطلابية)", credits: 500, price: 235, discount: 6, popular: true },
  { key: "credits_1000", name: "شحن 1,000 كريدت 👑", credits: 1000, price: 425, discount: 15, popular: false },
  { key: "credits_2500", name: "شحن 2,500 كريدت 🔥", credits: 2500, price: 905, discount: 28, popular: false },
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

export function getPurchasableProduct({ productType, productKey, billing = "monthly" }) {
  if (productType === "credits") {
    const pack = CREDIT_PACKS.find((item) => item.key === productKey);
    return pack ? { ...pack, productType: "credits", amount: pack.price } : null;
  }
  const plan = PLANS.find((item) => item.key === productKey);
  if (!plan) return null;
  return {
    ...plan,
    productType: "subscription",
    billing,
    amount: planPrice(plan, billing),
    grantedCredits: planCredits(plan, billing),
    durationDays: billing === "yearly" ? 365 : 30,
  };
}

export const AI_COST_RULES = {
  summary: { base: 2, includedChars: 20_000, stepChars: 20_000, cap: 30 },
  quiz: { creditsPerQuestions: 5 },
  ocr: { creditsPerPages: 0, cap: 0 },
};
