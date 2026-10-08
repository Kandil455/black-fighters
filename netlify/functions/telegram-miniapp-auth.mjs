import { adminAuth, adminDb, FieldValue } from "./_shared/firebase-admin.mjs";
import { getBotToken } from "./_shared/telegram-engine.mjs";
import { verifyTelegramMiniAppInitData } from "./_shared/telegram-v5.mjs";
import { json, parseBody } from "./_shared/http.mjs";

/**
 * BLACK FIGHTERS V5 «Al-Atlas» — Telegram Mini App Auth Endpoint
 * Implements V4 Section 9.3 / 22.8 & V5 4.4:
 * Verifies Telegram WebApp.initData via HMAC-SHA256 (`WebAppData` key) + 24h TTL,
 * resolves or links the user in Firestore, and issues a Firebase Custom Token.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const body = parseBody(event);
    const initData = String(body?.initData || "").trim();
    const botToken = getBotToken();

    // NOTE: the third argument is the verifier's OPTIONS OBJECT, not a TTL.
    // Passing `86400` here was silently ignored (options.maxAgeSeconds stayed
    // undefined) so Mini App sessions expired after 5 minutes, not a day.
    const verification = verifyTelegramMiniAppInitData(initData, botToken, { maxAgeSeconds: 86400 });
    if (!verification.valid || !verification.user?.id) {
      // The verifier reports `error`; reading `reason` always yielded undefined,
      // so every distinct failure looked identical in logs and to the client.
      return json(401, {
        ok: false,
        error: verification.error || "INVALID_TELEGRAM_INIT_DATA",
      });
    }

    const tgUser = verification.user;
    const tgIdStr = String(tgUser.id);
    let uid = `tg_${tgIdStr}`;

    try {
      const snap = await adminDb
        .collection("users")
        .where("telegram_id", "==", tgIdStr)
        .limit(1)
        .get();

      if (!snap.empty) {
        uid = snap.docs[0].id;
      } else {
        await adminDb
          .collection("users")
          .doc(uid)
          .set(
            {
              telegram_id: tgIdStr,
              telegram_username: tgUser.username || "",
              full_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "Fighter",
              updated_date: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      }
    } catch (dbErr) {
      console.warn("[TelegramMiniAppAuth] Firestore lookup fallback:", dbErr.message);
    }

    let customToken = null;
    try {
      customToken = await adminAuth.createCustomToken(uid, {
        telegram_id: tgIdStr,
        telegram_username: tgUser.username || "",
      });
    } catch (tokenErr) {
      console.warn("[TelegramMiniAppAuth] Custom token signing fallback:", tokenErr.message);
    }

    return json(200, {
      ok: true,
      uid,
      customToken,
      telegramUser: tgUser,
      authDate: verification.authDate,
    });
  } catch (error) {
    console.error("[TelegramMiniAppAuth] Error:", error);
    return json(500, { ok: false, error: error.message || "INTERNAL_ERROR" });
  }
};
