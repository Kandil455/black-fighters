import { adminDb, FieldValue } from "./firebase-admin.mjs";

// ─── SECURITY: server-only AI keys (never hardcoded, never VITE_-exposed) ────
export function serverAiConfig(preferVision = false) {
  const cleanKey = (k) => String(k || "").replace(/["']/g, "").trim();
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "BF_SERVER_MANAGED_GEMINI_KEY");
  const zaiKey = cleanKey(process.env.ZAI_API_KEY || "BF_SERVER_MANAGED_ZAI_KEY");
  const groqKey = cleanKey(process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY);
  const openrouterKey = cleanKey(process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY);

  if (preferVision) {
    if (geminiKey) {
      return { provider: "gemini", api_key: geminiKey, model: process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite" };
    }
    if (zaiKey) {
      return { provider: "zai", api_key: zaiKey, model: "glm-4.6v-flash" };
    }
  }

  // Hierarchy: Gemini 3.5 -> Z.ai (glm-4.7-flash) -> Groq -> OpenRouter
  if (geminiKey) {
    return { provider: "gemini", api_key: geminiKey, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" };
  }
  if (zaiKey) {
    return { provider: "zai", api_key: zaiKey, model: process.env.ZAI_MODEL || "glm-4.7-flash" };
  }
  if (groqKey) {
    return { provider: "groq", api_key: groqKey, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" };
  }
  if (openrouterKey) {
    return { provider: "openrouter", api_key: openrouterKey, model: process.env.OPENROUTER_MODEL || "openrouter/free" };
  }
  throw new Error("NO_API_KEY");
}


// ─── Profile helpers ───
const PREMIUM_PLANS = new Set(["starter", "pro", "supreme", "premium"]);

export function isPremiumProfile(profile) {
  if (!profile) return false;
  const plan = String(profile.subscription_plan || "").toLowerCase();
  if (PREMIUM_PLANS.has(plan)) return true;
  if (profile.subscription_status === "active") return true;
  const expires = Date.parse(profile.subscription_expires_at || "");
  return Number.isFinite(expires) && expires > Date.now();
}

export function isAdminProfile(user, profile) {
  const email = String(user?.email || profile?.email || "").toLowerCase();
  return email === "ibrahimkandil000@gmail.com" || profile?.role === "admin";
}

// ─── Daily AI usage meter (server-authoritative abuse ceiling) ───────────────
// The chat is "free/unlimited" per plan — this is the generous backstop that
// stops scripted flooding of the platform AI keys. Counters live in a
// server-only collection (default-denied in firestore.rules) and reset by UTC day.
export const AI_DAILY_LIMITS = Object.freeze({ free: 100, premium: 1000 });

function aiUsageRef(uid) {
  const today = new Date().toISOString().slice(0, 10);
  return adminDb.collection("usageCounters").doc(`ai_${uid}_${today}`);
}

export async function checkAiDailyQuota(user, profile, kind = "light") {
  if (isAdminProfile(user, profile)) return { unlimited: true };
  const plan = isPremiumProfile(profile) ? "premium" : "free";
  const limit = kind === "heavy" ? Math.floor(AI_DAILY_LIMITS[plan] / 2) : AI_DAILY_LIMITS[plan];
  const ref = aiUsageRef(user.uid);
  let used = 0;
  try {
    const snap = await ref.get();
    used = Number(snap.data()?.[kind] || 0);
  } catch { /* counter read failure must never block a paying user */ }
  if (used >= limit) {
    throw new Error(`RATE_LIMITED: وصلت الحد اليومي لاستخدام الذكاء الاصطناعي (${limit} طلب) — ارجع بكرة أو ترقّ باقتك`);
  }
  try {
    await ref.set(
      { [kind]: FieldValue.increment(1), user_id: user.uid, updated_at: FieldValue.serverTimestamp() },
      { merge: true },
    );
  } catch { /* best-effort telemetry */ }
  return { unlimited: false, used: used + 1, limit };
}

// ─── Give a daily-quota unit back when a charged action fails ────────────────
// The meter is incremented before the work runs, so a server-side failure must
// return it — otherwise the user pays for our outage out of today's ceiling.
// Best-effort: never throw, the counter is an abuse ceiling, not a ledger.
export async function releaseAiDailyQuota(user, profile, kind = "light") {
  if (isAdminProfile(user, profile)) return { released: false };
  try {
    await aiUsageRef(user.uid).set(
      { [kind]: FieldValue.increment(-1), updated_at: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { released: true };
  } catch {
    return { released: false };
  }
}

// ─── Atomic credit spend + ledger entry (single source of truth on the server) ─
export async function spendCreditsAtomic(uid, { cost, reason, referenceId = "" }) {
  const amount = Math.max(0, Math.round(Number(cost) * 10) / 10);
  if (!(amount > 0)) return { charged: false, credits: undefined };
  const userRef = adminDb.collection("users").doc(uid);
  return adminDb.runTransaction(async (transaction) => {
    const fresh = await transaction.get(userRef);
    if (!fresh.exists) throw new Error("المستخدم غير موجود");
    const profile = fresh.data();
    if (isAdminProfile({ email: profile.email }, profile)) {
      return { charged: false, unlimited: true, credits: Number(profile.credits || 0) };
    }
    const before = Number(profile.credits || 0);
    if (before < amount) {
      throw new Error(`رصيدك غير كافي — محتاج ${amount} كريدت ومعاك ${before}`);
    }
    const after = Math.round((before - amount) * 10) / 10;
    transaction.update(userRef, {
      credits: after,
      credits_used: (Number(profile.credits_used) || 0) + amount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const ledgerRef = adminDb.collection("creditTransactions").doc(`${reason}_${uid}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
    transaction.set(ledgerRef, {
      user_id: uid, amount: -amount, balance_before: before, balance_after: after,
      transaction_type: "spend", reason, reference_id: String(referenceId || "").slice(0, 180),
      idempotency_key: ledgerRef.id, created_at: FieldValue.serverTimestamp(),
    });
    return { charged: true, credits: after, cost: amount };
  });
}

// ─── Best-effort refund when a charged server action fails ───────────────────
export async function refundCreditsAtomic(uid, { amount, reason, referenceId = "" }) {
  const refund = Math.max(0, Math.round(Number(amount) * 10) / 10);
  if (!(refund > 0)) return { refunded: false };
  const userRef = adminDb.collection("users").doc(uid);
  try {
    return await adminDb.runTransaction(async (transaction) => {
      const fresh = await transaction.get(userRef);
      if (!fresh.exists) return { refunded: false };
      const before = Number(fresh.data().credits || 0);
      const after = Math.round((before + refund) * 10) / 10;
      transaction.update(userRef, { credits: after, updatedAt: FieldValue.serverTimestamp() });
      const ledgerRef = adminDb.collection("creditTransactions").doc(`refund_${reason}_${uid}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
      transaction.set(ledgerRef, {
        user_id: uid, amount: refund, balance_before: before, balance_after: after,
        transaction_type: "refund", reason: `${reason}_refund`, reference_id: String(referenceId || "").slice(0, 180),
        idempotency_key: ledgerRef.id, created_at: FieldValue.serverTimestamp(),
      });
      return { refunded: true, credits: after };
    });
  } catch (err) {
    console.error("[server-ai] refund failed:", err?.message);
    return { refunded: false, error: err?.message };
  }
}
