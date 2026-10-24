import { adminAuth, adminDb, FieldValue } from "./_shared/firebase-admin.mjs";
import { getBotToken, getBotUsername } from "./_shared/telegram-engine.mjs";
import { createLoginSession, pollLoginSession } from "./_shared/telegram-link.mjs";
import { verifyTelegramMiniAppInitData, verifyTelegramLoginWidget } from "./_shared/telegram-v5.mjs";
import { json, parseBody } from "./_shared/http.mjs";

/**
 * BLACK FIGHTERS V5 «Al-Atlas» — Telegram Auth Endpoint (Mini App + Login Widget + Bot Handshake)
 * Supports:
 * 1) Telegram Bot Handshake login sessions: create_login_session & poll_login_session
 * 2) Telegram WebApp.initData via HMAC-SHA256 (`WebAppData` key)
 * 3) Telegram Login Widget payload via HMAC-SHA256 (`SHA256(botToken)` key)
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
    const action = String(body?.action || "");

    // ── Direct Bot Handshake Session: Create ──
    if (action === "create_login_session") {
      const { code, expiresAt, ttlMs } = await createLoginSession();
      const botUsername = getBotUsername();
      return json(200, {
        ok: true,
        code,
        expiresAt,
        ttlMs,
        botUsername,
        deepLink: `https://t.me/${botUsername}?start=login_${code}`,
        command: `/login ${code}`,
      });
    }

    // ── Direct Bot Handshake Session: Poll ──
    if (action === "poll_login_session") {
      const result = await pollLoginSession(body?.code);
      return json(200, result);
    }

    const initData = String(body?.initData || "").trim();
    const widgetUser = body?.widgetUser && typeof body.widgetUser === "object" ? body.widgetUser : null;
    const botToken = getBotToken();

    const verification = widgetUser
      ? verifyTelegramLoginWidget(widgetUser, botToken, { maxAgeSeconds: 86400 })
      : verifyTelegramMiniAppInitData(initData, botToken, { maxAgeSeconds: 86400 });

    if (!verification.valid || !verification.user?.id) {
      return json(401, {
        ok: false,
        error: verification.error || "INVALID_TELEGRAM_AUTH",
      });
    }

    const tgUser = verification.user;
    const tgIdStr = String(tgUser.id);
    let uid = `tg_${tgIdStr}`;
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || tgUser.username || "Fighter";

    try {
      let snap = await adminDb
        .collection("users")
        .where("telegram_id", "==", tgIdStr)
        .limit(1)
        .get();

      if (snap.empty) {
        snap = await adminDb
          .collection("users")
          .where("telegram_chat_id", "==", tgIdStr)
          .limit(1)
          .get();
      }

      if (!snap.empty) {
        uid = snap.docs[0].id;
        await adminDb
          .collection("users")
          .doc(uid)
          .set(
            {
              telegram_id: tgIdStr,
              telegram_chat_id: tgIdStr,
              telegram_username: tgUser.username || "",
              updated_date: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      } else {
        const docRef = adminDb.collection("users").doc(uid);
        const existingDoc = await docRef.get();
        const baseFields = {
          telegram_id: tgIdStr,
          telegram_chat_id: tgIdStr,
          telegram_username: tgUser.username || "",
          full_name: displayName,
          avatar_url: tgUser.photo_url || "",
          updated_date: FieldValue.serverTimestamp(),
        };
        if (!existingDoc.exists) {
          baseFields.role = "user";
          baseFields.subscription_plan = "free";
          baseFields.subscription_status = "inactive";
          baseFields.credits = 15;
          baseFields.created_date = FieldValue.serverTimestamp();
        }
        await docRef.set(baseFields, { merge: true });
      }
    } catch (dbErr) {
      console.warn("[TelegramAuth] Firestore lookup fallback:", dbErr.message);
    }

    let customToken = null;
    try {
      customToken = await adminAuth.createCustomToken(uid, {
        telegram_id: tgIdStr,
        telegram_username: tgUser.username || "",
      });
    } catch (tokenErr) {
      console.warn("[TelegramAuth] Custom token signing fallback:", tokenErr.message);
    }

    return json(200, {
      ok: true,
      uid,
      customToken,
      telegramUser: tgUser,
      authDate: verification.authDate,
    });
  } catch (error) {
    console.error("[TelegramAuth] Error:", error);
    return json(500, { ok: false, error: error.message || "INTERNAL_ERROR" });
  }
};
