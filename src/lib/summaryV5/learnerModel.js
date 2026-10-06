/**
 * BLACK FIGHTERS V5 «الأطلس» — Learner Model, Territory Mastery & Daily Order Sheet Engine
 * Replaces noisy multi-currency gamification with:
 * - Single Mastery Metric per Territory/Course (0..100% ink fill)
 * - Rank Progression by real mastery milestones («مبتدئ» -> «مقاتل» -> «نخبة» -> «قائد أطلس»)
 * - Daily Order Sheet («أمر اليوم»): strictly 3 to 5 high-leverage actions
 * - Exam Readiness Predictor based on FSRS retrievability + uncovered plates
 */

import { computeRetrievability } from './fsrsEngine.js';

export const ATLAS_RANKS = Object.freeze([
  { id: 'initiate', titleAr: 'مبتدئ ميداني', titleEn: 'FIELD INITIATE', minMastery: 0, stampCode: 'BF-R1' },
  { id: 'fighter', titleAr: 'مقاتل أطلس', titleEn: 'ATLAS FIGHTER', minMastery: 35, stampCode: 'BF-R2' },
  { id: 'elite', titleAr: 'نخبة العمليات', titleEn: 'OPS ELITE', minMastery: 70, stampCode: 'BF-R3' },
  { id: 'commander', titleAr: 'قائد الأطلس', titleEn: 'ATLAS COMMANDER', minMastery: 90, stampCode: 'BF-R4' },
]);

/**
 * Compute ink mastery status for a plate or territory:
 * - 'empty': 0% (raw paper)
 * - 'partial': 1..84% (cross-hatched ink)
 * - 'mastered': >= 85% (solid ink + red stamp)
 */
export function classifyInkCoverage(masteryPercent) {
  const pct = Math.max(0, Math.min(100, Number(masteryPercent) || 0));
  if (pct >= 85) return 'mastered';
  if (pct > 0) return 'partial';
  return 'empty';
}

/**
 * Determine current Atlas Rank from overall mastery percentage
 */
export function resolveAtlasRank(overallMasteryPercent) {
  const pct = Math.max(0, Math.min(100, Number(overallMasteryPercent) || 0));
  let matched = ATLAS_RANKS[0];
  for (const rank of ATLAS_RANKS) {
    if (pct >= rank.minMastery) {
      matched = rank;
    }
  }
  const nextIdx = ATLAS_RANKS.indexOf(matched) + 1;
  const nextRank = nextIdx < ATLAS_RANKS.length ? ATLAS_RANKS[nextIdx] : null;
  return {
    current: matched,
    next: nextRank,
    progressToNext: nextRank
      ? Math.round(((pct - matched.minMastery) / (nextRank.minMastery - matched.minMastery)) * 100)
      : 100,
  };
}

/**
 * Compute Territory Map regions from courses/chapters and review items
 */
export function buildTerritoryMapState(territories = [], reviewItems = [], now = Date.now()) {
  const normalizedTerritories = territories.map((t, index) => {
    const id = t.id || `territory_${index + 1}`;
    const matchingReviews = reviewItems.filter((item) => item.docId === id || item.territoryId === id);

    let masteryPercent = Number(t.masteryPercent ?? 0);
    if (matchingReviews.length > 0) {
      const avgR =
        matchingReviews.reduce((acc, item) => {
          if (!item.lastReviewAt || !item.stability) return acc;
          const elapsedDays = Math.max(0, (now - item.lastReviewAt) / 86_400_000);
          return acc + computeRetrievability(elapsedDays, item.stability);
        }, 0) / matchingReviews.length;
      masteryPercent = Math.round(avgR * 100);
    }

    const inkState = classifyInkCoverage(masteryPercent);
    const dueCount = matchingReviews.filter((item) => (item.dueAt || 0) <= now).length;
    const leechCount = matchingReviews.filter((item) => item.isLeech).length;

    return {
      id,
      code: t.code || `PLATE-0${index + 1}`,
      titleAr: t.titleAr || t.name || `قطاع ${index + 1}`,
      titleEn: t.titleEn || t.code || `SECTOR 0${index + 1}`,
      totalPages: Number(t.totalPages || 40),
      completedPages: Number(t.completedPages || Math.round(((t.totalPages || 40) * masteryPercent) / 100)),
      masteryPercent,
      inkState,
      dueCount,
      leechCount,
      examDate: t.examDate || null,
    };
  });

  const overallMasteryPercent =
    normalizedTerritories.length > 0
      ? Math.round(
          normalizedTerritories.reduce((sum, t) => sum + t.masteryPercent, 0) /
            normalizedTerritories.length
        )
      : 0;

  return {
    territories: normalizedTerritories,
    overallMasteryPercent,
    rank: resolveAtlasRank(overallMasteryPercent),
  };
}

/**
 * Build the «أمر اليوم» (Daily Order Sheet) — strictly 3 to 5 prioritized missions
 */
export function generateDailyOrderSheet({
  territories = [],
  reviewItems = [],
  activeDoc = null,
  examDate = null,
  now = Date.now(),
} = {}) {
  const orders = [];
  const dueItems = reviewItems.filter((r) => (r.dueAt || 0) <= now);
  const leechItems = reviewItems.filter((r) => r.isLeech);

  // 1. Urgent spaced-repetition Declassify review if any due
  if (dueItems.length > 0) {
    orders.push({
      id: 'order_declassify_due',
      orderCode: 'ORD-01',
      type: 'declassify_review',
      priority: 'critical',
      titleAr: `جلسة فك التعتيم (${Math.min(dueItems.length, 25)} مصطلح مستحق)`,
      subtitleAr: 'استدعاء نشط عبر شرائط الحبر الأسود (FSRS v4.5) قبل هبوط منحنى التذكر',
      estimatedMinutes: Math.max(5, Math.ceil(Math.min(dueItems.length, 25) * 0.6)),
      actionRoute: '/atlas?tab=declassify',
      badgeText: `${dueItems.length} DUE`,
    });
  }

  // 2. Leech remediation if any concept failed >= 5 times
  if (leechItems.length > 0) {
    const firstLeech = leechItems[0];
    orders.push({
      id: 'order_leech_fix',
      orderCode: `ORD-0${orders.length + 1}`,
      type: 'leech_remediation',
      priority: 'high',
      titleAr: `معالجة نقطة تعثّر: ${firstLeech.answerTerm || 'مفهوم حرج'}`,
      subtitleAr: firstLeech.leechAdviceAr || 'فشل الاستدعاء 5 مرات — افتح صندوق «قبل ما تقرا» التأسيسي',
      estimatedMinutes: 8,
      actionRoute: `/atlas?tab=plate&plate=${firstLeech.plateNumber || 1}`,
      badgeText: 'LEECH',
    });
  }

  // 3. Continue reading active document or lowest-ink territory
  const targetTerritory =
    activeDoc ||
    [...territories].sort((a, b) => (a.masteryPercent || 0) - (b.masteryPercent || 0))[0];

  if (targetTerritory) {
    orders.push({
      id: `order_plate_${targetTerritory.id || 'main'}`,
      orderCode: `ORD-0${orders.length + 1}`,
      type: 'plate_study',
      priority: 'standard',
      titleAr: `استكمال لوحة: ${targetTerritory.titleAr || targetTerritory.name || 'المحاضرة الحالية'}`,
      subtitleAr: 'قراءة «شرح من الأساس» مع عدسة المصدر (Source Lens) وتدوين الحواشي',
      estimatedMinutes: 20,
      actionRoute: '/summarize',
      badgeText: `${targetTerritory.masteryPercent ?? 0}% INK`,
    });
  }

  // 4. Quick verification quiz on partial ink sector
  orders.push({
    id: 'order_tactical_quiz',
    orderCode: `ORD-0${orders.length + 1}`,
    type: 'verification_quiz',
    priority: 'standard',
    titleAr: 'اختبار تثبيت سريع (5 أسئلة من اللوحات المفتوحة)',
    subtitleAr: 'تحويل التظليل المتقطع إلى ختم إتقان كامل باللون الأحمر',
    estimatedMinutes: 7,
    actionRoute: '/atlas?tab=declassify',
    badgeText: 'STAMP',
  });

  // 5. Ensure between 3 and 5 items (V4/V5 rule: max 3-5 daily tasks)
  if (orders.length < 3) {
    orders.push({
      id: 'order_upload_dossier',
      orderCode: `ORD-0${orders.length + 1}`,
      type: 'ingest_dossier',
      priority: 'normal',
      titleAr: 'رفع ملف مرجعي جديد إلى محرك الأطلس (1–1000 صفحة)',
      subtitleAr: 'فهرسة هرمية + قاموس مصطلحات موحد + مدقق عائلات نماذج متقاطع',
      estimatedMinutes: 5,
      actionRoute: '/summarize',
      badgeText: 'INGEST',
    });
  }

  const cappedOrders = orders.slice(0, 5);
  const daysToExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - now) / 86_400_000))
    : null;

  return {
    issuedAtIso: new Date(now).toISOString().slice(0, 10),
    orders: cappedOrders,
    totalEstimatedMinutes: cappedOrders.reduce((s, o) => s + (o.estimatedMinutes || 10), 0),
    daysToExam,
    cramModeRecommended: daysToExam !== null && daysToExam <= 3,
  };
}
