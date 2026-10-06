import { base44 } from "@/api/base44Client";
import { getSkin } from "@/lib/mascotSkins";

const today = () => new Date().toISOString().slice(0, 10);

// هل في مكافأة يومية متاحة للمستخدم حسب الشكل المفعّل؟
export function canClaimDaily(profile) {
  const skin = getSkin(profile?.active_mascot_skin);
  if (!skin.dailyCredits) return false;
  return profile?.last_skin_daily_reward !== today();
}

// استلام المكافأة اليومية (مرة في اليوم) — تنفذ ذرياً على السيرفر
export async function claimDailyReward() {
  const user = await base44.auth.me();
  const skin = getSkin(user?.active_mascot_skin);
  if (!skin.dailyCredits || user?.last_skin_daily_reward === today()) return 0;

  const { data } = await base44.functions.invoke("mascotDailyReward", { action: "mascotDailyReward" });
  if (!data?.success) return 0;
  return data.granted || 0;
}
