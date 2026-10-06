import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { getBotToken, getAlphaChatId } from "./_shared/telegram-engine.mjs";

/**
 * notify-signup — server-side Telegram notification about a new signup.
 * Authenticated by Firebase ID token; rate-limited to 1 message per user ever
 * via a Firestore marker document (no spam, no client-controlled chat id).
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const displayName = String(body.displayName || "").slice(0, 120);
    const email = String(body.email || "").slice(0, 200);

    const markerRef = adminDb.collection("meta").doc(`signup_notified_${user.uid}`);
    const marker = await markerRef.get();
    if (marker.exists) return json(200, { success: true, duplicate: true });

    const botToken = getBotToken();
    const alphaChatId = getAlphaChatId();
    if (botToken && alphaChatId) {
      const msg = `🎉 <b>مستخدم جديد انضم لـ Black Fighters!</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>الاسم:</b> ${displayName}\n📧 <b>البريد:</b> <code>${email}</code>\n🆔 <b>UID:</b> <code>${user.uid}</code>\n🎁 <b>هدية الترحيب:</b> 10 كريدت + 10,000 توكن\n━━━━━━━━━━━━━━━━━━━━\n<i>المنصة تكبر يا قائدنا Alpha! ⚡</i>`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: alphaChatId, text: msg, parse_mode: "HTML" }),
      }).catch(() => {});
    }

    await markerRef.set({ notified_at: FieldValue.serverTimestamp() });
    return json(200, { success: true });
  } catch (error) {
    return handleError(error);
  }
};
