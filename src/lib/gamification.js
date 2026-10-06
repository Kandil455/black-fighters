import { base44 } from '@/api/base44Client';
import { queueOfflineAction } from '@/lib/offlineDb';
import { BADGE_MILESTONE_REWARDS, TIER_FAMILIES as TIER_FAMILIES_DATA } from '@/lib/badgeLadderData';

export function nextReviewState(card, isCorrect) {
  let box = card.box || 1;
  if (isCorrect) box++;
  else box = 1;
  const days = [1, 2, 4, 7, 14, 30][box - 1] || 30;
  const next_review = new Date(Date.now() + days * 86400000).toISOString();
  return { box, next_review };
}

// ── Badges ────────────────────────────────────────────────────────────────────
// Legacy hand-written badges (kept forever — existing users' unlocks stay valid).
export const BADGES = {
  first_course:    { key: 'first_course',    title: 'أول خطوة 🎉',        desc: 'أنشأت أول كورس',              icon: '🎉' },
  five_courses:    { key: 'five_courses',    title: 'مجتهد 📚',            desc: 'أنشأت 5 كورسات',              icon: '📚' },
  ten_courses:     { key: 'ten_courses',     title: 'محترف المحتوى 💼',    desc: 'أنشأت 10 كورسات',             icon: '💼' },
  quiz_master:     { key: 'quiz_master',     title: 'ملك الكويزات 🏆',     desc: 'أكملت 10 كويزات',             icon: '🏆' },
  quiz_legend:     { key: 'quiz_legend',     title: 'أسطورة الكويزات 👑',  desc: 'أكملت 50 كويزات',             icon: '👑' },
  perfect_score:   { key: 'perfect_score',   title: 'علامة كاملة ⭐',      desc: 'حصلت على 100% في كويز',       icon: '⭐' },
  three_perfects:  { key: 'three_perfects',  title: 'عبقري 🧠',            desc: '3 كويزات 100%',               icon: '🧠' },
  streak_3:        { key: 'streak_3',        title: '3 أيام متتالية 🔥',   desc: 'استذاكرت 3 أيام متتالية',    icon: '🔥' },
  streak_7:        { key: 'streak_7',        title: 'أسبوع كامل 💎',       desc: 'استذاكرت 7 أيام متتالية',    icon: '💎' },
  streak_30:       { key: 'streak_30',       title: 'شهر صمود 🗓️',         desc: 'استذاكرت 30 يوم متتالي',     icon: '🗓️' },
  speed_learner:   { key: 'speed_learner',   title: 'متعلم سريع ⚡',       desc: '5 كورسات في نفس اليوم',       icon: '⚡' },
  note_taker:      { key: 'note_taker',      title: 'كاتب النوتس 📝',      desc: 'كتبت 10 ملاحظات',             icon: '📝' },
  night_owl:       { key: 'night_owl',       title: 'بومة الليل 🦉',       desc: 'ذاكرت بعد منتصف الليل',      icon: '🦉' },
  early_bird:      { key: 'early_bird',      title: 'الصاحي المبكر 🌅',   desc: 'ذاكرت قبل 7 الصبح',           icon: '🌅' },
  summarizer:      { key: 'summarizer',      title: 'ملخص محترف 📄',       desc: 'عملت 10 تلخيصات',             icon: '📄' },
  flashcard_fan:   { key: 'flashcard_fan',   title: 'عاشق البطاقات 🃏',   desc: 'راجعت 100 بطاقة',              icon: '🃏' },
};

// ── Tiered badge ladder (16 → 100+) ───────────────────────────────────────────
// Data-driven: each family generates one badge per tier. Tiers chosen so the
// long tail stays reachable but 500-course legends have something to chase.
const TIER_FAMILIES = TIER_FAMILIES_DATA;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX'];

for (const family of TIER_FAMILIES) {
  family.tiers.forEach((threshold, idx) => {
    const key = `${family.field}_t${threshold}`;
    BADGES[key] = {
      key,
      title: `${family.name} ${ROMAN[idx + 1] || idx + 1} ${family.icon}`,
      desc: family.label(threshold),
      icon: family.icon,
      family: family.field,
      threshold,
    };
  });
}

export const BADGE_COUNT = Object.keys(BADGES).length;

// ── Achievement credit milestones ─────────────────────────────────────────────
// Crossing N unlocked badges pays credits ONCE (tracked in badge_milestones).
export { BADGE_MILESTONE_REWARDS } from './badgeLadderData.js';

/** Pure: which ladder badges has this user earned? (no side effects — unit-tested) */
export function evaluateBadgeLadder(user, badges = BADGES) {
  const earned = [];
  if (!user) return earned;
  for (const key of Object.keys(badges)) {
    const b = badges[key];
    if (!b.family) continue; // legacy badges keep their existing award paths
    if (Number(user[b.family] || 0) >= b.threshold) earned.push(key);
  }
  return earned;
}

/** Pure: which milestone rewards apply for a given unlocked-badge count? */
export function evaluateBadgeMilestones(unlockedCount, alreadyClaimed = []) {
  return BADGE_MILESTONE_REWARDS.filter(
    (m) => unlockedCount >= m.badges && !alreadyClaimed.includes(m.badges)
  );
}

/**
 * Bump an activity counter on the user doc (courses_created, summaries_created,
 * ai_messages, …). The ladder reads these counters to unlock tier badges.
 */
export async function bumpCounter(field, by = 1) {
  try {
    const user = await base44.auth.me();
    if (!user) return null;
    const next = Number(user[field] || 0) + by;
    await base44.auth.updateMe({ [field]: next });
    return next;
  } catch { return null; }
}

/**
 * Sync pass: award every ladder badge the user's counters now qualify for,
 * then pay any freshly-crossed badge-count milestone rewards.
 * Returns { newBadges, creditsEarned } for the UI to celebrate.
 * Called from BadgeSyncWatcher on every profile load.
 */
export async function syncBadgeLadder(user) {
  const newBadges = [];
  let creditsEarned = 0;
  if (!user?.id) return { newBadges, creditsEarned };
  try {
    const owned = Array.isArray(user.badges) ? user.badges : [];
    const earned = evaluateBadgeLadder(user).filter((k) => !owned.includes(k));

    if (earned.length) {
      await base44.auth.updateMe({ badges: [...owned, ...earned] });
      newBadges.push(...earned);
    }

    const unlockedCount = owned.length + earned.length;
    const claimed = Array.isArray(user.badge_milestones) ? user.badge_milestones : [];
    const milestones = evaluateBadgeMilestones(unlockedCount, claimed);
    if (milestones.length) {
      // Milestone credits are paid by the SERVER (atomic + idempotent). The
      // old client-side `updateMe({ credits })` was rejected by the security
      // rules, so users never actually received milestone rewards.
      const { invokeSecureFunction } = await import('@/lib/secureFunctions');
      const res = await invokeSecureFunction('economy-actions', {
        action: 'claimBadgeMilestones',
        milestones: milestones.map((m) => m.badges),
      });
      creditsEarned = res?.data?.creditsAwarded || milestones.reduce((s, m) => s + m.credits, 0);
    }
  } catch (e) {
    console.warn('syncBadgeLadder:', e?.message);
  }
  return { newBadges, creditsEarned };
}

// ── Award Badge ───────────────────────────────────────────────────────────────
export async function awardBadge(badgeKey) {
  try {
    const user = await base44.auth.me();
    if (!user) return false;
    const badges = Array.isArray(user.badges) ? user.badges : [];
    if (badges.includes(badgeKey)) return false;
    await base44.auth.updateMe({ badges: [...badges, badgeKey] });
    return true;
  } catch { return false; }
}

// ── Record study session + auto-check badges ──────────────────────────────────
export async function recordStudy({ minutes = 0, questions = 0, courseId = null } = {}, { skipOfflineQueue = false } = {}) {
  const newBadges = [];
  try {
    const user = await base44.auth.me();
    if (!user) {
      if (!skipOfflineQueue && typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOfflineAction({ kind: "study", payload: { minutes, questions, courseId } }).catch(() => {});
      }
      return { newBadges };
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const last = user.last_active_date;
    const newStreak = last === yesterday ? (user.current_streak || 0) + 1 : last === today ? (user.current_streak || 0) : 1;
    const longest = Math.max(newStreak, user.longest_streak || 0);

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) {
      if (await awardBadge('night_owl')) newBadges.push('night_owl');
    }
    if (hour >= 5 && hour < 7) {
      if (await awardBadge('early_bird')) newBadges.push('early_bird');
    }

    if (newStreak >= 30 && await awardBadge('streak_30')) newBadges.push('streak_30');
    else if (newStreak >= 7 && await awardBadge('streak_7')) newBadges.push('streak_7');
    else if (newStreak >= 3 && await awardBadge('streak_3')) newBadges.push('streak_3');

    // ملاحظة: الستريك + last_active_date يديرها السيرفر عبر awardProgress.
    // هنا نحدّث فقط إحصائيات غير حسّاسة (دقائق/إجابات صحيحة).
    await base44.auth.updateMe({
      total_minutes_studied: (user.total_minutes_studied || 0) + minutes,
      total_correct: (user.total_correct || 0) + questions,
    });

    if (minutes > 0 || questions > 0) {
      try {
        await base44.entities.StudyActivity.create({
          course_id: courseId || null,
          activity_type: 'study_session',
          xp_earned: 0,
          date: today,
          minutes,
          questions_answered: questions,
          metadata: {},
        });
      } catch {}
    }

    return { newBadges, streak: newStreak };
  } catch (e) {
    if (!skipOfflineQueue && typeof navigator !== "undefined" && !navigator.onLine) {
      await queueOfflineAction({ kind: "study", payload: { minutes, questions, courseId } }).catch(() => {});
    }
    console.error('recordStudy:', e);
    return { newBadges };
  }
}

export async function recordLeaderboard({ correct = 0, answered = 0 } = {}) {
  try {
    const user = await base44.auth.me();
    if (!user) return;
    const quizzesDone = (user.quizzes_completed || 0) + 1;
    await base44.auth.updateMe({ quizzes_completed: quizzesDone });

    if (quizzesDone >= 50 && await awardBadge('quiz_legend')) return 'quiz_legend';
    if (quizzesDone >= 10 && await awardBadge('quiz_master')) return 'quiz_master';
    if (correct === answered && answered >= 5 && await awardBadge('perfect_score')) return 'perfect_score';
  } catch {}
}

export async function checkDailyLoginReward(user) {
  if (!user) return;
  // السيرفر هو مصدر الحقيقة للتاريخ والستريك والمكافأة (ذرية، مرة واحدة يومياً)
  try {
    const { data } = await base44.functions.invoke("dailyLoginReward", { action: "dailyLoginReward" });
    if (!data?.success || !data.granted) return null;
    const newStreak = data.streak || 1;
    if (newStreak >= 30) await awardBadge('streak_30');
    else if (newStreak >= 7) await awardBadge('streak_7');
    else if (newStreak >= 3) await awardBadge('streak_3');
    return { rewardCredits: data.granted, newStreak };
  } catch (e) {
    console.warn('checkDailyLoginReward:', e?.message);
    return null;
  }
}
