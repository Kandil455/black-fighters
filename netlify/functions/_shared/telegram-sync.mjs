/**
 * telegram-sync.mjs — the platform ⇄ bot contract, in ONE place.
 *
 * Both directions of the sync funnel through here so neither side can invent its
 * own rules:
 *
 *   platform → student   notifyUser()   resolves the chat, applies the
 *                                       notification budget, queues the message
 *   student → platform   the bot writes the same Firestore documents the web app
 *                        reads (quizAttempts, summaryDocuments, reviewCards),
 *                        which is why no separate "sync" job is needed
 *
 * Every entry point is intentionally best-effort: a failed notification must never
 * break the user action that triggered it.
 */

import { adminDb } from "./firebase-admin.mjs";
import { getAppBaseUrl } from "./telegram-engine.mjs";
import { enqueueTelegramMessage } from "./telegram-outbox.mjs";
import { evaluateNotification, recordNotificationSent, NOTIFICATION_TYPES } from "./telegram-notify.mjs";

/** Resolves the Telegram chat for a platform user, or null when unlinked. */
export async function resolveChatId(uid) {
  if (!uid) return null;
  try {
    const snap = await adminDb.collection("users").doc(String(uid)).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return data.telegram_chat_id ? String(data.telegram_chat_id) : null;
  } catch (err) {
    console.warn("[telegram-sync] resolveChatId failed:", err.message);
    return null;
  }
}

export async function isUserLinked(uid) {
  return Boolean(await resolveChatId(uid));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sends (or queues) a message to a platform user.
 *
 * @param {object} params
 * @param {string} params.uid
 * @param {string} params.text            plain text; HTML-escaped for you
 * @param {string} [params.type]          one of NOTIFICATION_TYPES
 * @param {string} [params.kind]          outbox event label
 * @param {string} [params.reasonAr]      appended as the "why am I seeing this" footer
 * @param {string} [params.buttonLabel]
 * @param {string} [params.buttonUrl]
 * @param {boolean} [params.explicitlyRequested] bypasses the budget (direct reply)
 * @param {string} [params.dedupeKey]
 */
export async function notifyUser({
  uid,
  text,
  type = "review_due",
  kind = type,
  reasonAr = "",
  buttonLabel = "",
  buttonUrl = "",
  explicitlyRequested = false,
  dedupeKey = null,
}) {
  if (!uid || !text) return { ok: false, error: "MISSING_ARGS" };
  const chatId = await resolveChatId(uid);
  if (!chatId) return { ok: false, error: "NO_TELEGRAM_LINKED" };

  const decision = await evaluateNotification({ uid, type, explicitlyRequested });
  if (!decision.allowed) return { ok: false, error: decision.reason };

  const keyboard = buttonLabel && buttonUrl
    ? { inline_keyboard: [[{ text: buttonLabel, url: buttonUrl }], [{ text: "🔕 إيقاف النوع ده", callback_data: `optout:${type}` }]] }
    : { inline_keyboard: [[{ text: "🔕 إيقاف النوع ده", callback_data: `optout:${type}` }]] };

  const body = reasonAr ? `${text}\n\n—\n📌 ${reasonAr}` : text;

  const result = await enqueueTelegramMessage({
    uid,
    chatId,
    method: "sendMessage",
    kind,
    dedupeKey,
    payload: {
      chat_id: chatId,
      text: body.slice(0, 4096),
      parse_mode: "HTML",
      reply_markup: keyboard,
      disable_web_page_preview: true,
    },
  });

  if (result.ok && !result.duplicate) {
    await recordNotificationSent({ uid });
  }
  return result;
}

// ── Concrete platform events ────────────────────────────────────────────────

/** A summary finished generating — student can open it in the Mini App. */
export async function notifySummaryReady({ uid, documentId, title }) {
  const link = `${getAppBaseUrl()}/course/${encodeURIComponent(documentId || "")}`;
  return notifyUser({
    uid,
    type: "summary_ready",
    kind: "summary_ready",
    text: `📝 <b>ملخصك جاهز: ${escapeHtml(title || "بدون عنوان")}</b>`,
    reasonAr: "طلبت ملخص جديد وخلص.",
    buttonLabel: "📖 افتح الملخص",
    buttonUrl: link,
    dedupeKey: `summary_ready:${documentId}`,
  });
}

/** A quiz was graded (on the web) — the score is worth reporting. */
export async function notifyQuizGraded({ uid, quizId, title, correct, total, percentage }) {
  return notifyUser({
    uid,
    type: "quiz_graded",
    kind: "quiz_graded",
    text: [
      `🏆 <b>نتيجة كويز: ${escapeHtml(title || "الكويز")}</b>`,
      `✅ ${correct}/${total} — <b>${percentage}%</b>`,
    ].join("\n"),
    reasonAr: "خلّصت كويز على المنصة.",
    buttonLabel: "📊 شوف التحليل",
    buttonUrl: `${getAppBaseUrl()}/stats`,
    dedupeKey: quizId ? `quiz_graded:${quizId}` : null,
  });
}

/** FSRS cards are due — the one message designed to bring students back. */
export async function notifyReviewDue({ uid, dueCount }) {
  if (!dueCount) return { ok: false, error: "NOTHING_DUE" };
  return notifyUser({
    uid,
    type: "review_due",
    kind: "review_due",
    text: `🧠 <b>عندك ${dueCount} بطاقة مستحقة للمراجعة النهاردة</b>`,
    reasonAr: "جدول المراجعة المتباعدة بتاعك.",
    buttonLabel: "▶️ ابدأ المراجعة",
    buttonUrl: `${getAppBaseUrl()}/review`,
    dedupeKey: `review_due:${new Date().toISOString().slice(0, 10)}`,
  });
}

/** Subscription/payment approved. */
export async function notifyPaymentApproved({ uid, planName, expiresAt = "" }) {
  return notifyUser({
    uid,
    type: "payment",
    kind: "payment_approved",
    explicitlyRequested: true,
    text: [
      `✅ <b>تم تفعيل باقتك: ${escapeHtml(planName || "الاشتراك")}</b>`,
      expiresAt ? `⏳ صالحة لحد: <b>${escapeHtml(expiresAt.slice(0, 10))}</b>` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    buttonLabel: "🌐 افتح المنصة",
    buttonUrl: getAppBaseUrl(),
  });
}

export { NOTIFICATION_TYPES };
