import { FieldValue } from "./firebase-admin.mjs";
import { isAdminProfile, isPremiumProfile, spendCreditsAtomic } from "./server-ai.mjs";

// ─── Light usage billing (shared): free users pay 1 credit per small AI call ───
// Premium/Admin: unlimited credits-wise, but ALWAYS bounded by the server-side
// daily usage quota (abuse ceiling on the platform keys). Atomic deduct + ledger.
export async function chargeLightUsage(user, profile) {
  if (isAdminProfile(user, profile) || isPremiumProfile(profile)) {
    await checkQuotaRef(user, profile, "light");
    return { charged: 0, credits: Number(profile.credits || 0), unlimited: true };
  }
  await checkQuotaRef(user, profile, "light");
  const result = await spendCreditsAtomic(user.uid, { cost: 1, reason: "ai_light_usage", referenceId: "api-ai" });
  return { ...result, charged: result.cost ?? 1, unlimited: false };
}

// lazy import to avoid a circular dep at module init (server-ai imports nothing from here)
async function checkQuotaRef(user, profile, kind) {
  const { checkAiDailyQuota } = await import("./server-ai.mjs");
  return checkAiDailyQuota(user, profile, kind);
}
