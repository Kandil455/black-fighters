// optimisticCredits.js — pure credit-balance arithmetic shared by every
// optimistic charge path. No IO, no framework, no side effects: the reducer
// contract the UI relies on lives here so node:test can pin it exactly:
//
//   1. DEDUCT    — the same render a charge starts: balance - cost (≥ 0).
//   2. RECONCILE — when the server confirms: adopt its authoritative balance.
//   3. ROLLBACK  — when the charge request fails: give the deducted cost back.
//
// The hook that applies this to the live profile is ./useOptimisticCharge.js.

import { calculateOcrCost, calculateSummaryCost } from "./economyCatalog.js";

/** Credits are displayed/stored rounded to 0.1 and never negative. */
export function normalizeCredits(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 10) / 10);
}

/** Optimistic deduction: balance - cost, clamped at 0. */
export function deductCredits(current, cost) {
  const safeCost = Math.max(0, Number(cost) || 0);
  return normalizeCredits(Math.max(0, normalizeCredits(current) - safeCost));
}

/** Optimistic restore (rollback / refund): balance + cost. */
export function restoreCredits(current, cost) {
  const safeCost = Math.max(0, Number(cost) || 0);
  return normalizeCredits(normalizeCredits(current) + safeCost);
}

/**
 * The authoritative balance embedded in a charge/refund response body, or
 * null when the server did not include one (caller falls back to
 * refreshProfile / delta math).
 */
export function extractServerCredits(data) {
  if (!data || typeof data !== "object") return null;
  if (data.credits === undefined || data.credits === null) return null;
  const n = Number(data.credits);
  return Number.isFinite(n) ? normalizeCredits(n) : null;
}

/**
 * Client-side mirror of the server quote — kept in lockstep with
 * `quotedCost` in netlify/functions/charge-ai-job.mjs and the dev fallback in
 * src/api/index.js ("chargeAiJob" case). Used ONLY as the optimistic
 * estimate; the authoritative cost/balance always comes back in the server's
 * charge response.
 */
export function quoteAiJobCost(payload = {}) {
  const body = payload || {};
  if (body.task === "image_ocr") return Math.max(1, Math.ceil((Number(body.imageCount) || 1) / 5));
  if (body.task === "ocr") return calculateOcrCost(body.pageCount);
  if (body.task === "quiz") return Math.max(1, Math.ceil((Number(body.questionCount) || 10) / 5));
  if (body.task === "quiz_audit") return Math.max(1, Math.ceil((Number(body.questionCount) || 10) / 10));
  if (body.task === "flashcards") return Math.max(1, Math.min(10, Math.ceil((Number(body.charCount) || 1) / 40_000)));
  if (Number(body.cost ?? body.amount) > 0) return Number(body.cost ?? body.amount);
  return calculateSummaryCost(body.charCount);
}

/**
 * The balance to display once a charge resolves:
 *  - the server-reported balance always wins (authoritative);
 *  - otherwise fall back to the optimistic deduction of the confirmed cost.
 */
export function resolvePostChargeBalance({ before = 0, serverCredits = null, actualCost = 0 } = {}) {
  const fromServer = extractServerCredits({ credits: serverCredits });
  if (fromServer !== null) return fromServer;
  return deductCredits(before, actualCost);
}

/** Charge confirmation toast copy — Arabic default, English via isEn. */
export function chargeSuccessMessage({ cost, balance, isEn = false } = {}) {
  const c = normalizeCredits(cost);
  const b = normalizeCredits(balance);
  return isEn
    ? `Charged ✅ ${c} credits — your balance is now ${b}`
    : `خصم ✅ ${c} كريدت — رصيدك الآن ${b} كريدت`;
}

/** Rollback toast copy when the charge never landed (deduction restored). */
export function chargeRollbackMessage({ cost, error, isEn = false } = {}) {
  const c = normalizeCredits(cost);
  const reason = String((error && error.message) || error || "").trim();
  const suffix = reason ? ` — ${reason}` : "";
  return isEn
    ? `Charge refunded ✅ ${c} credits restored to your balance${suffix}`
    : `اترجّع الخصم ✅ ${c} كريدت رجعوا لرصيدك${suffix}`;
}
