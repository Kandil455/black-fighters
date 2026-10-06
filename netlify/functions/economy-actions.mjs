import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { planCredits } from "../../src/lib/plans.js";

/**
 * economy-actions — single atomic server entry point for every client-facing
 * credit movement that used to be computed in the browser:
 *   purchaseCourse       — pay credits to unlock a course (creates enrollment)
 *   dailyLoginReward     — once-per-day streak reward (server date authority)
 *   mascotDailyReward    — once-per-day skin reward (server date authority)
 *   referralReward       — credit/token reward for the referrer (idempotent per invitee)
 *
 * All balance math happens inside Firestore transactions; the client can only
 * choose an action, never amounts.
 */

const OWNER_EMAIL = "ibrahimkandil000@gmail.com";
const PREMIUM_PLANS = new Set(["starter", "pro", "supreme", "premium"]);

function isPremiumProfile(profile) {
  if (!profile) return false;
  const plan = String(profile.subscription_plan || "").toLowerCase();
  if (PREMIUM_PLANS.has(plan)) return true;
  if (profile.subscription_status === "active") return true;
  const expires = Date.parse(profile.subscription_expires_at || "");
  return Number.isFinite(expires) && expires > Date.now();
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function ledgerRef(kind, uid, key) {
  return adminDb.collection("creditTransactions").doc(`${kind}_${uid}_${key}`);
}

async function grantCredits(transaction, userRef, profile, amount, ledger, extra = {}) {
  const before = Number(profile.credits || 0);
  const after = Math.max(0, Math.round((before + amount) * 10) / 10);
  transaction.update(userRef, { credits: after, updatedAt: FieldValue.serverTimestamp(), ...extra });
  transaction.set(ledger.ref, {
    user_id: userRef.id, amount, balance_before: before, balance_after: after,
    transaction_type: amount >= 0 ? "reward" : "spend",
    ...ledger.data, idempotency_key: ledger.ref.id, created_at: FieldValue.serverTimestamp(),
  });
  return after;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const action = String(body.action || "");
    const userRef = adminDb.collection("users").doc(user.uid);

    // ─── purchaseCourse ───
    if (action === "purchaseCourse") {
      const courseId = String(body.courseId || "");
      if (!courseId) throw new Error("الكورس غير محدد");
      const courseSnap = await adminDb.collection("courses").doc(courseId).get();
      if (!courseSnap.exists) throw new Error("الكورس غير موجود");
      const course = courseSnap.data();
      const cost = Math.max(0, Number(course.price_credits ?? course.credit_cost ?? 10) || 10);
      const enrollRef = adminDb.collection("enrollments").doc(`${user.uid}_${courseId}`);
      const result = await adminDb.runTransaction(async (transaction) => {
        const [freshUser, existingEnrollment] = await Promise.all([
          transaction.get(userRef),
          transaction.get(enrollRef),
        ]);
        if (!freshUser.exists) throw new Error("المستخدم غير موجود");
        if (existingEnrollment.exists) return { already: true, credits: Number(freshUser.data().credits || 0) };
        const profile = freshUser.data();
        if (!isPremiumProfile(profile)) {
          const before = Number(profile.credits || 0);
          if (before < cost) throw new Error(`رصيدك غير كافي — محتاج ${cost} كريدت ومعاك ${before}`);
          const after = Math.round((before - cost) * 10) / 10;
          transaction.update(userRef, {
            credits: after,
            credits_used: (Number(profile.credits_used) || 0) + cost,
            updatedAt: FieldValue.serverTimestamp(),
          });
          transaction.set(adminDb.collection("creditTransactions").doc(`course_${user.uid}_${courseId}`), {
            user_id: user.uid, amount: -cost, balance_before: before, balance_after: after,
            transaction_type: "spend", reason: "course_purchase", reference_id: courseId,
            idempotency_key: `course_${user.uid}_${courseId}`, created_at: FieldValue.serverTimestamp(),
          });
        }
        transaction.set(enrollRef, {
          user_id: user.uid, course_id: courseId, enrolled_at: FieldValue.serverTimestamp(),
        });
        return { already: false, credits: cost };
      });
      const fresh = await userRef.get();
      return json(200, { success: true, ...result, credits: Number(fresh.data()?.credits || 0) });
    }

    // ─── dailyLoginReward ───
    if (action === "dailyLoginReward") {
      const today = todayUtc();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const rewardLedger = ledgerRef("daily", user.uid, today);
      const result = await adminDb.runTransaction(async (transaction) => {
        const [freshUser, already] = await Promise.all([transaction.get(userRef), transaction.get(rewardLedger)]);
        if (!freshUser.exists) throw new Error("المستخدم غير موجود");
        if (already.exists) return { granted: 0, duplicate: true };
        const profile = freshUser.data();
        const lastActive = profile.last_active_date;
        let streak = 1;
        if (lastActive === yesterday) streak = (Number(profile.current_streak) || 0) + 1;
        else if (lastActive === today) streak = Number(profile.current_streak) || 1;
        const reward = streak > 0 && streak % 7 === 0 ? 10 : 2;
        const before = Number(profile.credits || 0);
        const after = Math.round((before + reward) * 10) / 10;
        transaction.update(userRef, {
          credits: after,
          current_streak: streak,
          longest_streak: Math.max(streak, Number(profile.longest_streak) || 0),
          last_active_date: today,
          last_login_reward_date: today,
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(rewardLedger, {
          user_id: user.uid, amount: reward, balance_before: before, balance_after: after,
          transaction_type: "reward", reason: "daily_login",
          description: streak % 7 === 0 ? `مكافأة ستريك ${streak} أيام` : "مكافأة تسجيل الدخول اليومي",
          idempotency_key: rewardLedger.id, created_at: FieldValue.serverTimestamp(),
        });
        return { granted: reward, streak, credits: after };
      });
      return json(200, { success: true, ...result });
    }

    // ─── mascotDailyReward ───
    if (action === "mascotDailyReward") {
      const { getSkin } = await import("../../src/lib/mascotSkins.js");
      const today = todayUtc();
      const rewardLedger = ledgerRef("mascot", user.uid, today);
      const result = await adminDb.runTransaction(async (transaction) => {
        const [freshUser, already] = await Promise.all([transaction.get(userRef), transaction.get(rewardLedger)]);
        if (!freshUser.exists) throw new Error("المستخدم غير موجود");
        if (already.exists) return { granted: 0, duplicate: true };
        const profile = freshUser.data();
        const skin = getSkin(profile.active_mascot_skin);
        const reward = Math.max(0, Number(skin?.dailyCredits) || 0);
        if (!reward) throw new Error("الشكل الحالي لا يمنح مكافأة يومية");
        const before = Number(profile.credits || 0);
        const after = Math.round((before + reward) * 10) / 10;
        transaction.update(userRef, {
          credits: after,
          last_skin_daily_reward: today,
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(rewardLedger, {
          user_id: user.uid, amount: reward, balance_before: before, balance_after: after,
          transaction_type: "reward", reason: "mascot_daily",
          description: `مكافأة يومية من شكل: ${skin.name}`,
          idempotency_key: rewardLedger.id, created_at: FieldValue.serverTimestamp(),
        });
        return { granted: reward, credits: after };
      });
      return json(200, { success: true, ...result });
    }

    // ─── referralReward (called by the INVITEE after signup, rewards the referrer) ───
    if (action === "referralReward") {
      const code = String(body.code || "").trim().toUpperCase();
      const invited = String(body.invitedUserId || user.uid);
      if (invited !== user.uid) throw new Error("FORBIDDEN");
      if (!code) throw new Error("لا يوجد كود إحالة");
      // Idempotent: one reward per invitee
      const markRef = adminDb.collection("referrals").doc(`inv_${invited}`);
      const mark = await markRef.get();
      if (mark.exists) return json(200, { success: true, duplicate: true });
      // Find referrer by referral_code, else by uid prefix
      let referrerSnap = null;
      const byCode = await adminDb.collection("users").where("referral_code", "==", code).limit(1).get();
      if (!byCode.empty) referrerSnap = byCode.docs[0];
      if (!referrerSnap) {
        const all = await adminDb.collection("users").limit(500).get();
        referrerSnap = all.docs.find((d) => d.id.toUpperCase().startsWith(code)) || null;
      }
      if (!referrerSnap || referrerSnap.id === invited) {
        return json(200, { success: false, error: "REFERRER_NOT_FOUND" });
      }
      const CREDITS_PER_INVITE = 10;
      await adminDb.runTransaction(async (transaction) => {
        const referrerRef = referrerSnap.ref;
        const [freshReferrer, freshMark] = await Promise.all([transaction.get(referrerRef), transaction.get(markRef)]);
        if (freshMark.exists) return;
        const profile = freshReferrer.data();
        const before = Number(profile.credits || 0);
        const after = before + CREDITS_PER_INVITE;
        const count = (Number(profile.referrals_count) || 0) + 1;
        const updates = {
          credits: after,
          referrals_count: count,
          updatedAt: FieldValue.serverTimestamp(),
        };
        // 40 invites milestone grants 100 EGP Pro subscription
        if (count >= 40 && profile.subscription_plan !== "pro" && profile.subscription_plan !== "supreme") {
          updates.subscription_plan = "pro";
          updates.subscription_status = "active";
          updates.plan_granted_by = "40_invites_reward";
          const expiryDate = new Date(Date.now() + 30 * 86400000).toISOString();
          updates.subscription_expires_at = expiryDate;
          updates.plan_expires_at = expiryDate;
        }
        transaction.update(referrerRef, updates);
        transaction.set(ledgerRef("ref", referrerRef.id, invited).ref, {
          user_id: referrerRef.id, amount: CREDITS_PER_INVITE, balance_before: before, balance_after: after,
          transaction_type: "reward", reason: "referral", reference_id: invited,
          idempotency_key: `ref_${referrerRef.id}_${invited}`, created_at: FieldValue.serverTimestamp(),
        });
        transaction.set(markRef, {
          referrer_id: referrerRef.id, referred_id: invited,
          credits_rewarded: CREDITS_PER_INVITE,
          created_at: FieldValue.serverTimestamp(),
        });
      });
      return json(200, { success: true });
    }

    // ─── claimBadgeMilestones (server-paid, idempotent per milestone) ────────
    // The badge ladder data lives in src/lib/badgeLadderData.js — shared with
    // the client so both sides evaluate identical rules. The server never
    // trusts the client's requested amounts: credits come from the table.
    if (action === "claimBadgeMilestones") {
      const { BADGE_MILESTONE_REWARDS } = await import("../../src/lib/badgeLadderData.js");
      const requested = Array.isArray(body.milestones) ? body.milestones.map(Number).filter(Number.isFinite) : [];
      if (!requested.length) throw new Error("لا يوجد إنجازات للمطالبة");
      const result = await adminDb.runTransaction(async (transaction) => {
        const fresh = await transaction.get(userRef);
        if (!fresh.exists) throw new Error("المستخدم غير موجود");
        const profile = fresh.data();
        const claimed = Array.isArray(profile.badge_milestones) ? profile.badge_milestones : [];
        const unlocked = Number(profile.badges?.length ?? profile.badges_count ?? 0) || 0;
        // Only milestones the table allows AND the user has actually reached
        // AND has not claimed before are paid — anything else is ignored.
        const payable = BADGE_MILESTONE_REWARDS.filter(
          (m) => requested.includes(m.badges) && unlocked >= m.badges && !claimed.includes(m.badges)
        );
        if (!payable.length) return { creditsAwarded: 0, claimed: [...claimed], duplicate: true };
        const total = payable.reduce((s, m) => s + m.credits, 0);
        const before = Number(profile.credits || 0);
        const after = Math.round((before + total) * 10) / 10;
        transaction.update(userRef, {
          credits: after,
          badge_milestones: [...claimed, ...payable.map((m) => m.badges)],
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(ledgerRef("badge", user.uid, payable.map((m) => m.badges).sort((a, b) => a - b).join("_")).ref, {
          user_id: user.uid, amount: total, balance_before: before, balance_after: after,
          transaction_type: "reward", reason: "badge_milestones",
          description: `مكافأة إنجازات: ${payable.map((m) => m.badges).join(" + ")} شارة`,
          idempotency_key: `badge_${user.uid}_${payable.map((m) => m.badges).sort((a, b) => a - b).join("_")}`,
          created_at: FieldValue.serverTimestamp(),
        });
        return { creditsAwarded: total, claimed: [...claimed, ...payable.map((m) => m.badges)] };
      });
      return json(200, { success: true, ...result });
    }

    return json(400, { error: "UNSUPPORTED_ACTION" });
  } catch (error) {
    return handleError(error);
  }
};
