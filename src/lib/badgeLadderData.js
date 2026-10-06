// ── Badge ladder + milestone data (SINGLE SOURCE OF TRUTH) ────────────────────
// Pure data — imported by BOTH the client (gamification.js) and the server
// (economy-actions claimBadgeMilestones), so the two sides can never drift.
// Keep this file free of browser/server-specific imports.

export const TIER_FAMILIES = [
  { field: 'courses_created',      name: 'صانع كورسات',   icon: '📚', label: (n) => `أنشأت ${n} كورسات`,        tiers: [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500] },
  { field: 'quizzes_completed',    name: 'محارب كويزات',  icon: '🏆', label: (n) => `أكملت ${n} كويزات`,        tiers: [1, 5, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500] },
  { field: 'summaries_created',    name: 'ملخِّص',         icon: '📄', label: (n) => `أنشأت ${n} تلخيصات`,       tiers: [1, 5, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500] },
  { field: 'flashcards_reviewed',  name: 'مراجع بطاقات',  icon: '🃏', label: (n) => `راجعت ${n} بطاقة`,         tiers: [10, 50, 100, 250, 500, 1000, 2000, 3000, 4000, 5000] },
  { field: 'notes_written',        name: 'دوّن',           icon: '📝', label: (n) => `كتبت ${n} ملاحظة`,         tiers: [1, 10, 25, 50, 100, 250, 500] },
  { field: 'perfect_scores',       name: 'علامة كاملة',    icon: '⭐', label: (n) => `${n} كويزات بدرجة كاملة`,  tiers: [1, 3, 5, 10, 25, 50, 100] },
  { field: 'current_streak',       name: 'مثابرة',         icon: '🔥', label: (n) => `${n} يوم متتالي`,          tiers: [3, 7, 14, 21, 30, 50, 100, 150, 200, 365] },
  { field: 'total_minutes_studied',name: 'وقت الدراسة',    icon: '⏳', label: (n) => `ذاكرت ${Math.round(n / 60)} ساعة`, tiers: [60, 300, 600, 1200, 3000, 6000, 12000] },
  { field: 'ai_messages',          name: 'صديق الذكاء',    icon: '🤖', label: (n) => `${n} محادثة مع الـ AI`,    tiers: [10, 50, 100, 250, 500, 1000] },
  { field: 'ai_quizzes',           name: 'ممول كويزات',    icon: '🎯', label: (n) => `أنشأت ${n} كويز من الملخص`, tiers: [1, 10, 25, 50, 100] },
  { field: 'summary_edits',        name: 'محرّر الملخصات', icon: '✒️', label: (n) => `عدّلت الملخص بالـ AI ${n} مرة`, tiers: [1, 10, 25, 50, 100] },
];

// Crossing N unlocked badges pays credits ONCE (tracked in badge_milestones).
export const BADGE_MILESTONE_REWARDS = [
  { badges: 10,  credits: 50 },
  { badges: 25,  credits: 100 },
  { badges: 50,  credits: 250 },
  { badges: 75,  credits: 500 },
  { badges: 100, credits: 1000 },
];
