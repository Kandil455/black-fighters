import { adminAuth, adminDb, FieldValue } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  buildOtpEmailHtml,
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  otpDocId,
} from "./_shared/email-otp-lib.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * POST /api/email-otp
 *  { action:"send", email }        → generates a 6-digit code and emails it.
 *  { action:"verify", email, code, password, displayName }
 *    → validates, THEN creates the Firebase user (emailVerified:true) and
 *      returns a customToken. Accounts are never created pre-verification —
 *      dodges ghost users with faked inboxes.
 *
 * Mail provider: Resend (RESEND_API_KEY). From address: OTP_FROM, defaulting
 * to the shared sandbox sender until the domain is verified.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const body = parseBody(event);
    const action = String(body?.action || "send");
    const email = normalizeEmail(body?.email);
    if (!EMAIL_RE.test(email)) {
      return json(400, { ok: false, error: "BAD_EMAIL", message: "اكتب بريد إلكتروني صحيح" });
    }

    if (action === "send") return await sendOtp(email, String(body?.displayName || "").slice(0, 80));
    if (action === "verify") return await verifyOtp(email, body);
    return json(400, { ok: false, error: "UNKNOWN_ACTION" });
  } catch (err) {
    if (err?.code) {
      // Structured business failure (unsigned sandbox recipient, provider
      // transient, etc.) — uniform envelope so the client branches on `error`,
      // and the browser console stays quiet (no raw 500 noise to scare users).
      return json(200, { ok: false, error: err.code, message: err.message });
    }
    return handleError(err);
  }
};

async function emailAlreadyRegistered(email) {
  try {
    await adminAuth.getUserByEmail(email);
    return true;
  } catch (err) {
    return err?.code === "auth/user-not-found" ? false : false;
  }
}

async function deliverOtpEmail(email, code, name) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("باقة البريد غير مهيأة — جارٍ تفعيلها");
    err.code = "MAIL_NOT_CONFIGURED";
    throw err;
  }
  const from = process.env.OTP_FROM || "Black Fighters <onboarding@resend.dev>";
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "🔐 كود تأكيد الحساب — Black Fighters",
      html: buildOtpEmailHtml({ code, name }),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[email-otp] Resend failed:", res.status, detail.slice(0, 300));
    const err = new Error("تعذر إرسال كود التأكيد — جرّب بعد دقيقة");
    err.code = "MAIL_DELIVERY_FAILED";
    throw err;
  }
}

async function sendOtp(email, name) {
  if (await emailAlreadyRegistered(email)) {
    return json(200, {
      ok: false,
      error: "EMAIL_EXISTS",
      message: "البريد ده مسجّل عندنا بالفعل ✅ — سجّل دخولك على طول",
    });
  }

  const ref = adminDb.collection("email_otps").doc(otpDocId(email));
  const snap = await ref.get();
  const nowMs = Date.now();
  const prev = snap.exists ? snap.data() : null;
  const lastSentMs = Number(prev?.sent_at_ms || 0);
  if (lastSentMs && nowMs - lastSentMs < OTP_RESEND_COOLDOWN_MS) {
    return json(429, {
      ok: false,
      error: "RESEND_TOO_SOON",
      message: "اتبع الكود اللي وصلك — وجرب إعادة الإرسال بعد دقيقة 🕐",
      retry_after_seconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - (nowMs - lastSentMs)) / 1000),
    });
  }

  const code = generateOtpCode();
  await deliverOtpEmail(email, code, name);
  await ref.set(
    {
      code_hash: hashOtp(email, code),
      attempts: 0,
      sent_at_ms: nowMs,
      expires_at_ms: nowMs + OTP_TTL_MS,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return json(200, { ok: true, sent: true, expires_in: Math.floor(OTP_TTL_MS / 1000) });
}

async function verifyOtp(email, body) {
  const code = String(body?.code || "").trim();
  const password = String(body?.password || "");
  const displayName = String(body?.displayName || "").slice(0, 80);
  if (!/^\d{6}$/.test(code)) {
    return json(400, { ok: false, error: "BAD_CODE", message: "الكود 6 أرقام" });
  }
  if (password.length < 8) {
    return json(400, { ok: false, error: "WEAK_PASSWORD", message: "الباسورد لازم 8 حروف على الأقل" });
  }

  const ref = adminDb.collection("email_otps").doc(otpDocId(email));
  const snap = await ref.get();
  if (!snap.exists) {
    return json(400, { ok: false, error: "NO_OTP", message: "اطلب كود جديد من صفحة التسجيل" });
  }
  const rec = snap.data() || {};
  const nowMs = Date.now();
  if (!rec.expires_at_ms || Number(rec.expires_at_ms) < nowMs) {
    return json(400, { ok: false, error: "OTP_EXPIRED", message: "الكود خلص مفعوله — اطلب كود جديد" });
  }
  const attempts = Number(rec.attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    return json(400, { ok: false, error: "TOO_MANY_ATTEMPTS", message: "محاولات كتيرة — اطلب كود جديد" });
  }
  if (hashOtp(email, code) !== rec.code_hash) {
    await ref.set({ attempts: attempts + 1, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    const left = OTP_MAX_ATTEMPTS - attempts - 1;
    return json(400, {
      ok: false,
      error: "WRONG_CODE",
      message: `كود غلط — فاضل ${left} ${left === 1 ? "محاولة" : "محاولات"}`,
    });
  }

  // Correct code — now create the account, exactly once.
  let uid;
  try {
    const created = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || undefined,
      emailVerified: true,
    });
    uid = created.uid;
  } catch (err) {
    if (err?.code === "auth/email-already-exists") {
      return json(200, {
        ok: false,
        error: "EMAIL_EXISTS",
        message: "البريد ده مسجّل عندنا بالفعل ✅ — سجّل دخولك على طول",
      });
    }
    console.error("[email-otp] createUser failed:", err.message);
    return json(500, { ok: false, error: "CREATE_FAILED", message: "تعذر إنشاء الحساب — جرّب تاني" });
  }

  await ref.delete().catch(() => {});
  const customToken = await adminAuth.createCustomToken(uid, { signup_method: "email_otp" });
  return json(200, { ok: true, customToken, uid });
}
