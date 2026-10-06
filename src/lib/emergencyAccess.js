import { isOwnerEmail } from "./permissions.js";

/**
 * Checks if a profile or user object has access to the Emergency Round.
 * By Alpha's strict rules:
 * - Admin or Owner always has access.
 * - Starter, Pro, and Supreme DO NOT have access to Emergency Round (it's completely standalone).
 * - Only users with subscription_plan_key === "emergency_round" and active subscription have access.
 */
export function hasEmergencyAccess(profileOrUser) {
  if (!profileOrUser) return false;
  if (profileOrUser.role === "admin" || isOwnerEmail(profileOrUser.email)) {
    return true;
  }

  // 1. Independent Emergency Round Add-on (stacks with Pro, Starter, Supreme)
  if (profileOrUser.has_emergency_round === true) {
    const exp = profileOrUser.emergency_expires_at ? Date.parse(profileOrUser.emergency_expires_at) : 0;
    if (!exp || exp > Date.now()) return true;
  }

  // 2. Dedicated Emergency Round Plan Key
  const planKey = String(profileOrUser.subscription_plan_key || "").toLowerCase();
  const planStatus = String(profileOrUser.subscription_status || "").toLowerCase();
  const expiresAt = profileOrUser.subscription_expires_at ? Date.parse(profileOrUser.subscription_expires_at) : 0;
  const isTimeValid = !expiresAt || expiresAt > Date.now();

  return planKey === "emergency_round" && (planStatus === "active" || isTimeValid);
}
