import { base44 } from '@/api/base44Client';
import { queueOfflineAction } from '@/lib/offlineDb';

// ── XP Rewards ────────────────────────────────────────────────────────────────
export const XP_REWARDS = {
  create_course:      25,
  complete_quiz:      20,
  perfect_quiz:       60,
  flashcard_session:  12,
  generate_summary:   8,
  generate_flashcards:8,
  daily_streak:       35,
  practice_complete:  15,
  study_session:      5,
  note_created:       5,
  review_card:        3,
  first_login_today:  10,
};

// ── Levels ────────────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, title: "مبتدئ",         icon: "📖", minXP: 0,     maxXP: 150,   color: "text-gray-400"  },
  { level: 2, title: "متعلم",          icon: "📚", minXP: 150,   maxXP: 400,   color: "text-blue-400"  },
  { level: 3, title: "نشيط",           icon: "⚡", minXP: 400,   maxXP: 900,   color: "text-yellow-400"},
  { level: 4, title: "متقدم",          icon: "🎯", minXP: 900,   maxXP: 1800,  color: "text-orange-400"},
  { level: 5, title: "محترف",          icon: "🏆", minXP: 1800,  maxXP: 3500,  color: "text-purple-400"},
  { level: 6, title: "خبير",           icon: "💎", minXP: 3500,  maxXP: 7000,  color: "text-cyan-400"  },
  { level: 7, title: "نخبة",           icon: "🔥", minXP: 7000,  maxXP: 14000, color: "text-red-400"   },
  { level: 8, title: "أسطورة",         icon: "⭐", minXP: 14000, maxXP: 28000, color: "text-yellow-300"},
  { level: 9, title: "إله المذاكرة",   icon: "👑", minXP: 28000, maxXP: Infinity, color: "text-amber-400"},
];

export function getLevelInfo(xp = 0) {
  const current = [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
  const next = LEVELS.find(l => l.level === current.level + 1) || null;
  const progress = next
    ? Math.min(100, Math.round(((xp - current.minXP) / (next.minXP - current.minXP)) * 100))
    : 100;
  const xpToNext = next ? next.minXP - xp : 0;
  return { current, next, progress, xp, xpToNext };
}

// المصدر الوحيد الآمن لمنح XP + كريدتس — يتم الحساب على السيرفر بالكامل.
// action: مفتاح من ACTIONS في functions/awardProgress.js
// units: عدد الوحدات (للمراجعة مثلاً) — اختياري.
export async function awardProgress(action, units = 1) {
  try {
    const { data } = await base44.functions.invoke('awardProgress', { action, units });
    if (data?.error) return { newXP: 0, levelUp: false };
    return {
      newXP: data.total_xp,
      credits: data.credits,
      creditGain: data.creditGain,
      xpGain: data.xpGain,
      levelUp: !!data.levelUp,
      newLevelInfo: getLevelInfo(data.total_xp),
    };
  } catch (e) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueOfflineAction({ kind: "xp", payload: { action, units } }).catch(() => {});
    }
    console.error('awardProgress:', e);
    return { newXP: 0, levelUp: false };
  }
}

// توافقية: استدعاءات awardXP القديمة تُترجَم لنشاط سيرفري آمن.
// تستقبل اسم النشاط (string) — الاستدعاءات القديمة بمبلغ رقمي تُتجاهَل بأمان.
export async function awardXP(action, reason = "") {
  if (typeof action === 'string') return awardProgress(action);
  // تجاهل المبالغ الرقمية القديمة (لم تعد المكافأة من الفرونت)
  return { newXP: 0, levelUp: false };
}
