import { processTelegramWebhookUpdate } from "./_shared/telegram-engine.mjs";
import { dedupeTelegramUpdateId } from "./_shared/telegram-v5.mjs";
import { adminDb } from "./_shared/firebase-admin.mjs";
import { json, parseBody } from "./_shared/http.mjs";
import crypto from "node:crypto";

/**
 * Telegram webhook with secret-token verification.
 * Setup (one-time): set the webhook with the SAME secret:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram-webhook&secret_token=<SECRET>
 * Then configure TELEGRAM_WEBHOOK_SECRET=<SECRET> in the hosting env (Vercel/Netlify).
 *
 * HARDENING (was: "if the secret is not configured the webhook stays open"):
 *  * The secret is now MANDATORY — without it we fail closed with 503 instead of
 *    executing whatever the internet posts at us.
 *  * Idempotency is persisted in Firestore (`telegram_processed_updates`, already
 *    declared server-only in firestore.rules). The old in-memory Map only
 *    deduplicated updates within a single warm lambda instance.
 */

const PROCESSED_UPDATES_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Firestore-backed store consumed by dedupeTelegramUpdateId(updateId, store). */
const firestoreUpdateStore = {
  async checkAndMark(updateId) {
    const ref = adminDb.collection("telegram_processed_updates").doc(String(updateId));
    try {
      // create() fails if the doc already exists → that IS the duplicate signal,
      // and it is atomic across concurrent lambda instances.
      await ref.create({ processed_at: new Date().toISOString(), expires_at: Date.now() + PROCESSED_UPDATES_TTL_MS });
      return false;
    } catch (err) {
      if (Number(err?.code) === 6 || /already exists/i.test(String(err?.message))) return true;
      // A Firestore hiccup must not drop a student's command.
      console.warn("[TelegramWebhook] idempotency store unavailable:", err?.message);
      return false;
    }
  },
};

function secretTokenMatches(event, expected) {
  const received =
    event.headers?.["x-telegram-bot-api-secret-token"] ||
    event.headers?.["X-Telegram-Bot-Api-Secret-Token"] ||
    "";
  const a = Buffer.from(String(received));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    // Health probe only — it never reveals whether the secret is configured.
    return json(200, { ok: true, message: "Black Fighters Telegram Webhook Active" });
  }

  const expected = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!expected) {
    console.error("[TelegramWebhook] TELEGRAM_WEBHOOK_SECRET is not configured — refusing all updates (fail closed).");
    return json(503, { ok: false, error: "WEBHOOK_NOT_CONFIGURED" });
  }
  if (!secretTokenMatches(event, expected)) {
    return json(401, { ok: false, error: "INVALID_WEBHOOK_SECRET" });
  }

  try {
    const body = parseBody(event);
    const dedupe = await dedupeTelegramUpdateId(body?.update_id, firestoreUpdateStore);
    if (dedupe.duplicate) {
      return json(200, { ok: true, duplicate: true, update_id: dedupe.updateId });
    }
    const result = await processTelegramWebhookUpdate(body);
    return json(200, { ok: true, result });
  } catch (error) {
    console.error("[TelegramWebhook] Error processing update:", error);
    return json(200, { ok: false, error: error.message });
  }
};
