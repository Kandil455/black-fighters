/**
 * 🎁 ZETA REFERRAL & INVITATION SERVICE
 * Manages user invite links and referral tracking.
 * Reward granting is server-atomic via the `economy-actions` function
 * (idempotent: one reward per invited user, computed server-side).
 */

import { REFERRAL_REWARDS } from "./plans";

export function initReferralTracking() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      localStorage.setItem("zeta_referral_code", ref.trim().toUpperCase());
      console.info("[Referral] Captured referral code from URL:", ref.trim().toUpperCase());
    }
  } catch (e) {
    console.warn("[Referral] Failed to read referral code:", e);
  }
}

export function getReferralCode(user) {
  if (!user) return "";
  return user.referral_code || (user.id || "").slice(0, 8).toUpperCase() || "ALPHA";
}

export function getReferralLink(user) {
  if (typeof window === "undefined") return "";
  const code = getReferralCode(user);
  return `${window.location.origin}/register?ref=${code}`;
}

export async function processReferralReward(newUserId, newUserEmail) {
  if (typeof window === "undefined") return null;
  const refCode = localStorage.getItem("zeta_referral_code");
  if (!refCode) return null;

  try {
    const { invokeSecureFunction } = await import("./secureFunctions");
    const result = await invokeSecureFunction("economy-actions", {
      action: "referralReward",
      code: refCode,
      invitedUserId: newUserId,
    });
    const data = result?.data || {};
    localStorage.removeItem("zeta_referral_code");
    if (data.success === false) {
      console.info("[Referral] No reward granted:", data.error || "not found");
      return null;
    }
    if (data.duplicate) {
      console.info("[Referral] Reward already granted for this invitee.");
      return { duplicate: true };
    }
    console.info(`[Referral] Reward granted to referrer for inviting ${newUserId}.`);
    return { granted: true };
  } catch (err) {
    // Keep the stored code on failure so a later retry can grant the reward
    console.warn("[Referral] Error processing referral reward:", err);
    return null;
  }
}

export function shareReferralLink(user, platform = "copy") {
  const link = getReferralLink(user);
  const text = `🚀 انضم لمنصة Black Fighters الذكية للتفوق الطبي والجامعي!\nسجل عبر رابط دعوتي وستحصل على هدية فورية (10,000 توكن و 10 كريدت مجاناً):\n${link}`;

  if (platform === "whatsapp") {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    return true;
  }

  if (platform === "telegram") {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("🚀 انضم لمنصة Black Fighters واحصل على 10,000 توكن و 10 كريدت مجاناً!")}`, "_blank");
    return true;
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(link);
    return true;
  }
  return false;
}
