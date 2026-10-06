import { adminDb, requireUser, FieldValue } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

// Canonical XP constants — kept in sync with src/lib/xpSystem.js (XP_REWARDS + LEVELS).
// Server-only file, so no client imports (@base44) are required.
const XP_REWARDS = {
  create_course: 25,
  complete_quiz: 20,
  perfect_quiz: 60,
  flashcard_session: 12,
  generate_summary: 8,
  generate_flashcards: 8,
  daily_streak: 35,
  practice_complete: 15,
  study_session: 5,
  note_created: 5,
  review_card: 3,
  first_login_today: 10,
};

const LEVELS = [
  { level: 1, title: "مبتدئ",         icon: "\ud83d\udccc", minXP: 0,      maxXP: 150,   color: "text-gray-400"   },
  { level: 2, title: "متعلم",          icon: "\ud83d\udce5", minXP: 150,    maxXP: 400,   color: "text-blue-400"   },
  { level: 3, title: "نشيط",           icon: "\u26a1",       minXP: 400,    maxXP: 900,   color: "text-yellow-400" },
  { level: 4, title: "متقدم",          icon: "\ud83d\udee1", minXP: 900,    maxXP: 1800,  color: "text-orange-400" },
  { level: 5, title: "محترف",          icon: "\ud83c\udfc6", minXP: 1800,   maxXP: 3500,  color: "text-purple-400" },
  { level: 6, title: "خبير",           icon: "\ud83d\udca5", minXP: 3500,   maxXP: 7000,  color: "text-cyan-400"   },
  { level: 7, title: "نخبة",          icon: "\ud83d\udd25", minXP: 7000,   maxXP: 14000, color: "text-red-400"    },
  { level: 8, title: "أسطورة",         icon: "\u2b50",       minXP: 14000,  maxXP: 28000, color: "text-yellow-300" },
  { level: 9, title: "\u0625\u0644\u0647 \u0627\u0644\u0645\u0630\u0627\u0643\u0631\u0629", icon: "\ud83d\udc51", minXP: 28000, maxXP: Infinity, color: "text-amber-400" },
];

function computeLevel(xp = 0) {
  const current = [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
  return current.level;
}

function xpForAction(action, units = 1) {
  const base = Number(XP_REWARDS[action]) || 0;
  return Math.max(0, base * Math.max(1, Number(units) || 1));
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const action = String(body.action || "").trim();
    const units = body.units != null ? Number(body.units) : 1;
    if (!action) throw new Error("INVALID_ACTION");

    const userRef = adminDb.collection("users").doc(user.uid);
    const xpGained = xpForAction(action, units);
    const today = new Date().toISOString().slice(0, 10);

    const result = await adminDb.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      if (!snap.exists) throw new Error("USER_NOT_FOUND");
      const profile = snap.data() || {};
      const totalXPBefore = Number(profile.total_xp || 0);
      const levelBefore = computeLevel(totalXPBefore);

      const totalXP = totalXPBefore + xpGained;
      const levelNow = computeLevel(totalXP);

      const update = {
        total_xp: totalXP,
        last_active_date: today,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Streak-friendly: keep current_streak writable-by-server behavior consistent
      // (users can still write current_streak under current rules until awardProgress migration)
      if (profile.current_streak != null) {
        const lastActive = profile.last_active_date || today;
        if (lastActive !== today) {
          const lastActiveDate = new Date(lastActive);
          const oneDayMs = 86400000;
          const diffDays = Math.round((Date.UTC(
            Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10))
          ) - lastActiveDate.getTime()) / oneDayMs);
          if (diffDays <= 1) {
            if (diffDays === 1) update.current_streak = (Number(profile.current_streak) || 0) + 1;
            else update.current_streak = 1;
          }
        }
      }

      t.update(userRef, update);

      const id = action.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) + "_" + user.uid + "_" + Date.now().toString(36);
      t.set(adminDb.collection("xpLogs").doc(id), {
        user_id: user.uid,
        action,
        units,
        xp_gained: xpGained,
        total_xp: totalXP,
        level_before: levelBefore,
        level_now: levelNow,
        created_at: FieldValue.serverTimestamp(),
      }, { merge: false });

      return {
        total_xp: totalXP,
        xp_gained: xpGained,
        action,
        units,
        level_before: levelBefore,
        level_now: levelNow,
        level_up: levelNow > levelBefore,
        awarded_at: today,
      };
    });

    return json(200, { success: true, ...result });
  } catch (error) {
    return handleError(error);
  }
};
