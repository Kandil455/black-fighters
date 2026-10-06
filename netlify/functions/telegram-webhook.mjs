import { processTelegramWebhookUpdate } from "./_shared/telegram-engine.mjs";
import { dedupeTelegramUpdateId } from "./_shared/telegram-v5.mjs";
import { json, parseBody } from "./_shared/http.mjs";
import crypto from "node:crypto";

/**
 * Telegram webhook with secret-token verification.
 * Setup (one-time): set the webhook with the SAME secret:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram-webhook&secret_token=<SECRET>
 * Then configure TELEGRAM_WEBHOOK_SECRET=<SECRET> in the hosting env (Vercel/Netlify).
 * If TELEGRAM_WEBHOOK_SECRET is not configured, the webhook stays open (legacy behavior).
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(200, { ok: true, message: "Black Fighters Telegram Webhook Active" });
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (expected) {
    const received =
      event.headers?.["x-telegram-bot-api-secret-token"] ||
      event.headers?.["X-Telegram-Bot-Api-Secret-Token"] ||
      "";
    const a = Buffer.from(String(received));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return json(401, { ok: false, error: "INVALID_WEBHOOK_SECRET" });
    }
  }

  try {
    const body = parseBody(event);
    const dedupe = await dedupeTelegramUpdateId(body?.update_id);
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
