import crypto from "node:crypto";
import { adminDb } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { consumeLinkCode, unlinkTelegram } from "./_shared/telegram-link.mjs";
import { resolveCorrectOptionIndex } from "./_shared/telegram-engine.mjs";

/**
 * POST /api/telegram-bridge
 *
 * Server-to-server endpoint for the standalone Telegram bot, which has no Firebase
 * credentials of its own. The bot proves itself with a shared secret
 * (`x-bridge-secret`), and can then resolve which site account a Telegram chat
 * belongs to — this is the missing piece that made "link the bot to the site"
 * impossible from the bot side.
 *
 * Actions
 *   { action: "link",   code, chatId, username? } → bind the code's account to chatId
 *   { action: "me",     chatId }                  → the linked profile summary
 *   { action: "unlink", chatId }                  → detach the account
 *
 * Fails closed: with no TELEGRAM_BRIDGE_SECRET configured every call is refused,
 * because this endpoint can read account identity.
 */

const MAX_CHAT_ID_LEN = 32;

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * The expected secret is either the explicit TELEGRAM_BRIDGE_SECRET, or a value
 * derived from the bot token that both sides already share. The derived form means
 * the hosted bot needs no new configuration to link accounts; the explicit form is
 * there if the two sides should not depend on the bot token.
 */
function expectedSecrets() {
  const list = [];
  const explicit = String(process.env.TELEGRAM_BRIDGE_SECRET || "").trim();
  if (explicit) list.push(explicit);
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (botToken) list.push(crypto.createHmac("sha256", botToken).update("bf-bridge-v1").digest("hex"));
  return list;
}

function requireBridgeSecret(event) {
  const expected = expectedSecrets();
  if (!expected.length) {
    const error = new Error("BRIDGE_NOT_CONFIGURED");
    error.statusCode = 503;
    throw error;
  }
  const provided = event.headers?.["x-bridge-secret"] || event.headers?.["X-Bridge-Secret"] || "";
  if (!expected.some((value) => timingSafeEqual(provided, value))) {
    const error = new Error("UNAUTHORIZED");
    error.statusCode = 401;
    throw error;
  }
}

function cleanChatId(raw) {
  const value = String(raw ?? "").trim();
  if (!/^-?\d{1,20}$/.test(value) || value.length > MAX_CHAT_ID_LEN) return "";
  return value;
}

async function findUserByChat(chatId) {
  const snap = await adminDb.collection("users").where("telegram_chat_id", "==", chatId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, data: doc.data() || {} };
}

function profileView(uid, data) {
  return {
    uid,
    name: data.full_name || data.display_name || "",
    plan: data.subscription_plan || "free",
    premium: data.subscription_plan === "premium" || data.subscription_status === "active",
    credits: Number(data.credits) || 0,
    streak: Number(data.current_streak) || 0,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    requireBridgeSecret(event);
    const body = parseBody(event);
    const { action } = body;
    const chatId = cleanChatId(body.chatId);
    if (!chatId && action !== "quiz") return json(400, { ok: false, error: "MISSING_CHAT_ID" });

    if (action === "link") {
      const result = await consumeLinkCode(body.code, chatId, {
        username: String(body.username || "").slice(0, 64),
        first_name: String(body.firstName || "").slice(0, 64),
      });
      if (!result.ok) return json(200, { ok: false, error: result.error || "LINK_FAILED" });
      const uid = String(result.uid || "");
      const snap = uid ? await adminDb.collection("users").doc(uid).get() : null;
      return json(200, {
        ok: true,
        linked: true,
        profile: profileView(uid, snap?.exists ? snap.data() || {} : {}),
      });
    }

    if (action === "me") {
      const found = await findUserByChat(chatId);
      if (!found) return json(200, { ok: true, linked: false });
      return json(200, { ok: true, linked: true, profile: profileView(found.uid, found.data) });
    }

    if (action === "unlink") {
      const found = await findUserByChat(chatId);
      if (!found) return json(200, { ok: true, linked: false });
      const result = await unlinkTelegram(found.uid);
      return json(200, { ok: Boolean(result.ok), linked: false, error: result.ok ? undefined : result.error });
    }

    if (action === "quiz") {
      // Quizzes exported from the site live in Firestore; the hosted bot has no
      // Firebase access, so it asks for one by id when a deep link arrives.
      const quizId = String(body.quizId || "").trim().slice(0, 128);
      if (!quizId) return json(400, { ok: false, error: "MISSING_QUIZ_ID" });
      let data = null;
      const direct = await adminDb.collection("standaloneQuizzes").doc(quizId).get();
      if (direct.exists) data = direct.data();
      if (!data) {
        const byField = await adminDb.collection("standaloneQuizzes").where("id", "==", quizId).limit(1).get();
        if (!byField.empty) data = byField.docs[0].data();
      }
      const raw = Array.isArray(data?.questions) ? data.questions : [];
      if (!raw.length) return json(200, { ok: false, error: "QUIZ_NOT_FOUND" });
      const questions = raw.slice(0, 60).map((q) => {
        const options = Array.isArray(q?.options) ? q.options.map((o) => String(o).slice(0, 160)) : [];
        return {
          q: String(q?.question || q?.q || "").slice(0, 400),
          options,
          answer: resolveCorrectOptionIndex(q, options),
          explanation: String(q?.explanation || "").slice(0, 400),
        };
      }).filter((q) => q.q && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0);
      if (!questions.length) return json(200, { ok: false, error: "QUIZ_NOT_USABLE" });
      return json(200, { ok: true, title: String(data?.title || "Quiz").slice(0, 120), questions });
    }

    return json(400, { ok: false, error: "UNKNOWN_ACTION" });
  } catch (error) {
    const status = error?.statusCode;
    if (status) return json(status, { ok: false, error: error.message });
    if (/BRIDGE_NOT_CONFIGURED/.test(error?.message)) return json(503, { ok: false, error: "BRIDGE_NOT_CONFIGURED" });
    return handleError(error);
  }
};
