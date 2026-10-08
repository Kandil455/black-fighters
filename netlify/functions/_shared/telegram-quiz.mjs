/**
 * telegram-quiz.mjs — REAL quiz scoring for the Telegram bot.
 *
 * WHAT THIS REPLACES (measured defect):
 *   The `run_custom_quiz` handler wrote `score: questions.length`,
 *   `percentage: 100` and awarded `questions.length * 20` XP unconditionally —
 *   it had no way to know which option a student picked, because the webhook
 *   never subscribed to `poll_answer` (`allowed_updates: ["message",
 *   "callback_query"]`). Every bot "graded" quiz was a 100% rubber stamp, and
 *   those fake attempts + XP are what the platform's telemetry then displayed.
 *
 * HOW IT WORKS NOW
 *   1. When a question poll is sent, its Telegram `poll.id` is remembered in
 *      `telegram_quiz_sessions/{chatId}` together with the correct answer index.
 *   2. Telegram posts a `poll_answer` update; we match it by poll id and record
 *      the chosen option + whether it was right.
 *   3. Finishing the quiz reads the session and writes a `quizAttempts` row with
 *      the TRUE score; XP is proportional to correct answers only.
 *
 * Sessions not touched for 6 hours are treated as abandoned.
 */

import { adminDb, FieldValue } from "./firebase-admin.mjs";

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const XP_PER_CORRECT = 20;
const XP_COMPLETION_BONUS = 10;

const sessions = () => adminDb.collection("telegram_quiz_sessions");

function sessionRef(chatId) {
  return sessions().doc(String(chatId));
}

/** Starts (or restarts) a quiz session for a chat. */
export async function startQuizSession({ chatId, uid, quizId, total, userName = "" }) {
  if (!chatId || !quizId) return null;
  const payload = {
    chat_id: String(chatId),
    quiz_id: String(quizId),
    uid: uid || null,
    user_name: userName,
    total: Number(total) || 0,
    index: 0,
    answered: 0,
    correct: 0,
    polls: {},
    answers: [],
    status: "active",
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    await sessionRef(chatId).set(payload, { merge: false });
  } catch (err) {
    console.warn("[telegram-quiz] could not start session:", err.message);
    return null;
  }
  return payload;
}

export async function getQuizSession(chatId) {
  if (!chatId) return null;
  try {
    const snap = await sessionRef(chatId).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (data.status !== "active") return null;
    const updated = Date.parse(data.updated_at || data.started_at || 0);
    if (updated && Date.now() - updated > SESSION_TTL_MS) {
      await sessionRef(chatId).set({ status: "expired" }, { merge: true }).catch(() => {});
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[telegram-quiz] session read failed:", err.message);
    return null;
  }
}

/**
 * Remembers the poll Telegram just created so its answer can be attributed.
 * Returns the poll id (or null when the send failed).
 */
export async function rememberQuestionPoll({ chatId, index, pollId, correctOptionId, total }) {
  if (!chatId || !pollId) return null;
  try {
    await sessionRef(chatId).set(
      {
        index: Number(index) || 0,
        total: Number(total) || 0,
        [`polls.${pollId}`]: { index: Number(index) || 0, correct_option_id: Number(correctOptionId) || 0 },
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );
    return pollId;
  } catch (err) {
    console.warn("[telegram-quiz] could not remember poll:", err.message);
    return null;
  }
}

/**
 * Records a `poll_answer` update.
 *
 * `option_ids` is an array of chosen option indexes; for quiz polls Telegram
 * sends exactly one. Answering the same poll twice (Telegram allows changing a
 * quiz answer until it closes) must not double-count, so the previous answer for
 * that poll id is replaced.
 */
export async function recordPollAnswer({ chatId, pollId, optionIds = [], telegramUserId = null }) {
  if (!chatId || !pollId) return { recorded: false, reason: "MISSING_IDS" };
  const session = await getQuizSession(chatId);
  if (!session) return { recorded: false, reason: "NO_ACTIVE_SESSION" };

  const poll = session.polls?.[pollId];
  if (!poll) return { recorded: false, reason: "UNKNOWN_POLL" };

  // Ownership guard: only the session owner's answer counts.
  if (session.uid && telegramUserId && session.chat_id && String(session.chat_id) !== String(chatId)) {
    return { recorded: false, reason: "NOT_SESSION_OWNER" };
  }

  const chosen = Array.isArray(optionIds) ? Number(optionIds[0]) : Number(optionIds);
  const correctOptionId = Number(poll.correct_option_id);
  const isCorrect = Number.isFinite(chosen) && chosen === correctOptionId;

  const answers = Array.isArray(session.answers) ? session.answers.filter((a) => a.poll_id !== pollId) : [];
  answers.push({
    poll_id: pollId,
    question_index: Number(poll.index) || 0,
    chosen,
    correct_option_id: correctOptionId,
    is_correct: isCorrect,
    answered_at: new Date().toISOString(),
  });

  const answered = answers.length;
  const correct = answers.filter((a) => a.is_correct).length;

  try {
    await sessionRef(chatId).set(
      { answers, answered, correct, updated_at: new Date().toISOString() },
      { merge: true },
    );
  } catch (err) {
    console.warn("[telegram-quiz] could not record answer:", err.message);
    return { recorded: false, reason: "PERSIST_FAILED" };
  }

  return { recorded: true, isCorrect, answered, correct, total: Number(session.total) || 0 };
}

/**
 * Closes the session and writes a REAL attempt + XP.
 * Returns a summary the bot renders to the student.
 */
export async function finishQuizSession({ chatId, quizTitle = "" }) {
  const session = await getQuizSession(chatId);
  if (!session) return null;

  const total = Number(session.total) || (session.answers?.length ?? 0);
  const answered = Number(session.answered) || 0;
  const correct = Number(session.correct) || 0;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const earnedXp = correct * XP_PER_CORRECT + XP_COMPLETION_BONUS;

  const attempt = {
    quiz_id: session.quiz_id,
    user_id: session.uid || null,
    user_name: session.user_name || "Student",
    score: correct,
    correct,
    total,
    answered,
    unanswered: Math.max(0, total - answered),
    percentage,
    answers: session.answers || [],
    duration_ms: Math.max(0, Date.now() - Date.parse(session.started_at || Date.now())),
    created_at: new Date().toISOString(),
    via: "telegram",
    telegram_chat_id: String(chatId),
  };

  try {
    await adminDb.collection("quizAttempts").add(attempt);
    if (session.uid) {
      await adminDb.collection("users").doc(session.uid).set(
        {
          // XP now reflects answers actually given, not questions merely seen.
          xp: FieldValue.increment(earnedXp),
          total_xp: FieldValue.increment(earnedXp),
        },
        { merge: true },
      );
    }
  } catch (err) {
    console.warn("[telegram-quiz] could not persist attempt:", err.message);
  }

  await sessionRef(chatId).set({ status: "finished", finished_at: new Date().toISOString() }, { merge: true }).catch(() => {});

  return { ...attempt, earnedXp, quizTitle };
}

/** Human-readable result card for the bot. */
export function formatQuizResult({ correct, total, percentage, unanswered = 0, earnedXp, quizTitle = "الكويز" }) {
  const bar = "█".repeat(Math.round(percentage / 10)) + "░".repeat(10 - Math.round(percentage / 10));
  const verdict =
    percentage >= 80 ? "🔥 مستوى ممتاز!" : percentage >= 50 ? "💪 كويس، محتاج مراجعة بسيطة" : "📚 محتاج مذاكرة تانية";
  return [
    `🏆 <b>خلصت كويز: ${quizTitle}</b>`,
    "━━━━━━━━━━━━━━━━━━━━",
    `[${bar}] <b>${percentage}%</b>`,
    `✅ صح: <b>${correct}</b> من <b>${total}</b>`,
    unanswered > 0 ? `⏭️ مفيش إجابة: <b>${unanswered}</b>` : null,
    `⚡ <b>+${earnedXp} XP</b> اتسجلت في حسابك على المنصة`,
    verdict,
  ]
    .filter(Boolean)
    .join("\n");
}

export const QUIZ_XP_PER_CORRECT = XP_PER_CORRECT;
export const QUIZ_SESSION_TTL_MS = SESSION_TTL_MS;
