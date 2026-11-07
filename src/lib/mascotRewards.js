import { base44 } from "@/api/base44Client";

/**
 * Daily credit reward.
 *
 * Mascot skins were removed (owner decision, Nov 2026), but students who were
 * already collecting a daily credit must keep it. The reward is now a flat
 * value instead of a per-skin amount, and it is still granted server-side
 * exactly once per calendar day.
 */
const DAILY_REWARD = 1;

const today = () => new Date().toISOString().slice(0, 10);

/** Is today's reward still unclaimed? */
export function canClaimDaily(profile) {
  if (DAILY_REWARD <= 0) return false;
  return profile?.last_skin_daily_reward !== today();
}

/** Claim today's reward (once per day) — executed atomically on the server. */
export async function claimDailyReward() {
  const user = await base44.auth.me();
  if (user?.last_skin_daily_reward === today()) return 0;

  const { data } = await base44.functions.invoke("mascotDailyReward", {
    action: "mascotDailyReward",
  });
  if (!data?.success) return 0;
  return data.granted || 0;
}
