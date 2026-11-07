import crypto from "node:crypto";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const FALLBACK_PEPPER = "bf-email-otp-pepper-v1";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function otpDocId(email) {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(email, code, pepper = "") {
  const p = pepper || process.env.OTP_PEPPER || FALLBACK_PEPPER;
  return crypto
    .createHash("sha256")
    .update(`${p}|${normalizeEmail(email)}|${String(code)}`)
    .digest("hex");
}

export function buildOtpEmailHtml({ code, name = "" }) {
  const safeCode = String(code).replace(/[^\d]/g, "");
  return `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="margin:0;padding:0;background:#07080C;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
    <div style="max-width:480px;margin:24px auto;background:#0E1017;border:1px solid #1E222B;border-radius:18px;overflow:hidden;">
      <div style="padding:26px 28px 18px;background:linear-gradient(135deg,#0E1017,#111827);border-bottom:1px solid #1E222B;">
        <div style="font-size:20px;font-weight:800;color:#F2F3F5;">⚔️ Black Fighters</div>
        <div style="font-size:12px;color:#9AA0AE;margin-top:4px;">تأكيد إنشاء الحساب</div>
      </div>
      <div style="padding:28px;">
        <p style="color:#F2F3F5;font-size:14px;line-height:1.9;margin:0 0 18px;">
          أهلاً${name ? ` يا <b>${String(name).replace(/[<>&"]/g, "")}</b>` : ""}! 👋<br/>
          ده كود تأكيد البريد بتاعك — حطه في صفحة التسجيل خلال 10 دقائق:
        </p>
        <div style="text-align:center;letter-spacing:10px;font-size:34px;font-weight:900;color:#19f08c;background:#0A0D14;border:1px dashed #19f08c55;border-radius:14px;padding:18px 10px;direction:ltr;">
          ${safeCode}
        </div>
        <p style="color:#9AA0AE;font-size:11.5px;line-height:1.8;margin:18px 0 0;">
          الكود بيبطّل خلال 10 دقائق وبيشتغل 5 محاولات بس.<br/>
          لو مش إنت اللي حاولت تسجّل — تجاهل الرسالة دي، مفيش حساب هيتعمل.
        </p>
      </div>
    </div>
  </body>
</html>`;
}
