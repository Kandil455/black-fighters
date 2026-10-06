/**
 * BLACK FIGHTERS V5 «الأطلس» — FSRS v4.5 Spaced Repetition & Declassify Engine
 * Implements:
 * - FSRS v4.5 scheduling (Again=1, Hard=2, Good=3, Easy=4)
 * - Leech detection after 5 failures (lapses >= 5) -> flags for simpler explanation / prerequisite review
 * - Auto-conversion of Declassify redacted items (`[███]`) into ReviewItems
 */

export const FSRS_RATINGS = Object.freeze({
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
});

export const FSRS_DEFAULT_WEIGHTS = Object.freeze([
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
]);

export const LEECH_THRESHOLD = 5;

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Initial difficulty for first rating
 */
function initDifficulty(rating, w = FSRS_DEFAULT_WEIGHTS) {
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10);
}

/**
 * Initial stability (in days) for first rating
 */
function initStability(rating, w = FSRS_DEFAULT_WEIGHTS) {
  return Math.max(0.1, w[clamp(rating - 1, 0, 3)]);
}

/**
 * Next difficulty after review
 */
function nextDifficulty(d, rating, w = FSRS_DEFAULT_WEIGHTS) {
  const deltaD = -w[6] * (rating - 3);
  const damped = d + (deltaD * (10 - d)) / 9;
  const meanReverted = w[7] * initDifficulty(4, w) + (1 - w[7]) * damped;
  return clamp(meanReverted, 1, 10);
}

/**
 * Retrievability after elapsed days
 */
export function computeRetrievability(elapsedDays, stability) {
  if (!stability || stability <= 0) return 0;
  const factor = 19 / 81;
  const decay = -0.5;
  return Math.pow(1 + factor * (Math.max(0, elapsedDays) / stability), decay);
}

/**
 * Next stability on recall (Hard / Good / Easy) or lapse (Again)
 */
function nextStability(d, s, r, rating, w = FSRS_DEFAULT_WEIGHTS) {
  if (rating === FSRS_RATINGS.AGAIN) {
    return clamp(
      w[11] *
        Math.pow(d, -w[12]) *
        (Math.pow(s + 1, w[13]) - 1) *
        Math.exp(w[14] * (1 - r)),
      0.1,
      s
    );
  }
  const hardPenalty = rating === FSRS_RATINGS.HARD ? w[15] : 1;
  const easyBonus = rating === FSRS_RATINGS.EASY ? w[16] : 1;
  const growth =
    1 +
    Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) *
      hardPenalty *
      easyBonus;
  return clamp(s * growth, 0.1, 3650);
}

/**
 * Convert stability to target interval in days for desired retention (default 0.9)
 */
export function stabilityToIntervalDays(stability, desiredRetention = 0.9) {
  const factor = 19 / 81;
  const decay = -0.5;
  const raw = (stability / factor) * (Math.pow(desiredRetention, 1 / decay) - 1);
  return clamp(Math.round(raw * 10) / 10, 0.05, 3650);
}

/**
 * Create a new ReviewItem from a Declassify redaction or concept
 */
export function createReviewItem({
  id,
  docId,
  chapterIndex = 1,
  plateNumber = 1,
  promptAr,
  answerTerm,
  contextSentence = '',
  sourcePages = [],
  now = Date.now(),
}) {
  return {
    id: id || `rv_${docId || 'doc'}_${chapterIndex}_${plateNumber}_${ String(answerTerm || '').slice(0, 24) }`,
    docId: docId || 'doc',
    chapterIndex,
    plateNumber,
    promptAr: String(promptAr || ''),
    answerTerm: String(answerTerm || ''),
    contextSentence: String(contextSentence || ''),
    sourcePages: Array.isArray(sourcePages) ? sourcePages : [],
    state: 'new', // 'new' | 'learning' | 'review' | 'relearning'
    stability: 0,
    difficulty: 5,
    reps: 0,
    lapses: 0,
    isLeech: false,
    leechAdviceAr: null,
    lastReviewAt: null,
    dueAt: now,
    intervalDays: 0,
  };
}

/**
 * Schedule next review of a ReviewItem given rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 */
export function scheduleFsrsReview(item, rating, now = Date.now()) {
  const validRating = clamp(Number(rating) || FSRS_RATINGS.GOOD, 1, 4);
  const prevReps = Number(item?.reps || 0);
  const prevLapses = Number(item?.lapses || 0);
  const elapsedDays = item?.lastReviewAt
    ? Math.max(0, (now - item.lastReviewAt) / 86_400_000)
    : 0;

  let stability;
  let difficulty;
  let state = item?.state || 'new';
  let lapses = prevLapses;

  if (prevReps === 0 || !item?.stability) {
    difficulty = initDifficulty(validRating);
    stability = initStability(validRating);
    state = validRating === FSRS_RATINGS.AGAIN ? 'learning' : 'review';
    if (validRating === FSRS_RATINGS.AGAIN) {
      lapses += 1;
    }
  } else {
    const r = computeRetrievability(elapsedDays, item.stability);
    difficulty = nextDifficulty(item.difficulty || 5, validRating);
    stability = nextStability(difficulty, item.stability, r, validRating);
    if (validRating === FSRS_RATINGS.AGAIN) {
      lapses += 1;
      state = 'relearning';
    } else {
      state = 'review';
    }
  }

  const intervalDays =
    validRating === FSRS_RATINGS.AGAIN
      ? 0.04 // ~1 hour
      : stabilityToIntervalDays(stability, 0.9);

  const dueAt = Math.round(now + intervalDays * 86_400_000);
  const isLeech = lapses >= LEECH_THRESHOLD;

  return {
    ...item,
    state,
    stability: Number(stability.toFixed(4)),
    difficulty: Number(difficulty.toFixed(4)),
    reps: prevReps + 1,
    lapses,
    isLeech,
    leechAdviceAr: isLeech
      ? `هذه البطاقة تعثّرت ${lapses} مرات (Leech). راجع صندوق «قبل ما تقرا» في اللوحة ${item?.plateNumber || 1} أو اطلب تبسيط المفهوم من الجسر التأسيسي.`
      : null,
    lastReviewAt: now,
    dueAt,
    intervalDays: Number(intervalDays.toFixed(2)),
    lastRating: validRating,
  };
}

/**
 * Extract Declassify redaction items from a normalized chapter or plate array
 */
export function extractDeclassifyItemsFromChapter(chapter, docId = 'doc') {
  const plates = Array.isArray(chapter?.plates) ? chapter.plates : [];
  const items = [];

  plates.forEach((plate, idx) => {
    const plateNumber = plate.plateNumber || idx + 1;
    const redactions = Array.isArray(plate.redactions) ? plate.redactions : [];
    redactions.forEach((redaction, rIdx) => {
      items.push(
        createReviewItem({
          id: `${docId}_ch${chapter?.chapterIndex || 1}_p${plateNumber}_r${rIdx}`,
          docId,
          chapterIndex: chapter?.chapterIndex || 1,
          plateNumber,
          promptAr: redaction.promptAr || plate.titleAr || 'اكشف المصطلح المحجوب',
          answerTerm: redaction.term || redaction.answerTerm || '',
          contextSentence: redaction.contextAr || plate.summaryAr || '',
          sourcePages: plate.sourcePages || [],
        })
      );
    });
  });

  return items;
}
