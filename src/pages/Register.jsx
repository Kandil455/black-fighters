import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Loader2, Eye, EyeOff, MailCheck } from "@/components/ui/animatedIcons";
import { toast } from "sonner";
import { authErrorMessage } from "@/lib/authErrors";
import OtpVerify from "@/components/auth/OtpVerify";

export default function Register() {
  const { register, verifyOtp, resendOtp, resendVerificationLink } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [verificationMode, setVerificationMode] = useState(null);

  const handleRegister = async (e) => {
    e?.preventDefault?.();
    const currentName =
      name ||
      document.querySelector('input[name="fullName"]')?.value?.trim() ||
      "";
    const currentEmail =
      email ||
      document.querySelector('input[name="email"]')?.value?.trim() ||
      "";
    const currentPassword =
      password || document.querySelector('input[name="password"]')?.value || "";
    if (!currentEmail || !currentPassword || !currentName) {
      return toast.error(isEn ? "Please fill all fields" : "اكمل كل الحقول");
    }
    if (currentPassword.length < 8) {
      return toast.error(
        isEn
          ? "Password must be at least 8 characters"
          : "الباسورد لازم 8 حروف على الأقل"
      );
    }
    setEmail(currentEmail);
    setName(currentName);
    setPassword(currentPassword);
    setLoading(true);
    try {
      const result = await register({
        email: currentEmail,
        password: currentPassword,
        fullName: currentName,
      });
      setVerificationMode(result?.mode || "link");
      toast.success(
        result?.mode === "otp"
          ? isEn
            ? "Verification code sent to your email"
            : "تم إرسال كود التأكيد إلى بريدك الإلكتروني"
          : isEn
          ? "Verification link sent to your email"
          : "تم إرسال رابط التأكيد إلى بريدك الإلكتروني"
      );
      setOtpStep(true);
    } catch (err) {
      toast.error(
        authErrorMessage(
          err,
          err.message || (isEn ? "Registration error" : "حصل خطأ في التسجيل")
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otpCode) => {
    await verifyOtp({ email, otpCode, password, fullName: name });
    toast.success(isEn ? "Account verified successfully!" : "تم تأكيد حسابك!");
    window.location.href = "/dashboard";
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}
      dir={dir}
    >
      {/* Editorial Header */}
      <div className="hd text-center mb-6">
        <span className="mono">{isEn ? "ACCOUNT" : "الحساب"}</span>
        <h1 className="serif">
          {isEn ? "Join & " : "سجل "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "Get Started." : "وابدأ."}</em>
        </h1>
      </div>

      {/* Auth Card */}
      <div className="card w-full max-w-md p-6 sm:p-8">
        {otpStep && verificationMode === "link" ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-[color-mix(in_srgb,var(--sig)_15%,transparent)] border border-[var(--sig)]">
              <MailCheck className="w-6 h-6" style={{ color: "var(--sig)" }} animated={false} />
            </div>
            <h2 className="serif text-2xl font-bold mb-2">
              {isEn ? "Confirm Your Email" : "أكد بريدك الإلكتروني"}
            </h2>
            <p className="text-xs mb-6 leading-relaxed" style={{ color: "var(--mute)" }}>
              {isEn ? (
                <>
                  We sent a confirmation link to{" "}
                  <span className="mono font-semibold" dir="ltr" style={{ color: "var(--ink)" }}>
                    {email}
                  </span>
                  . Open the email and click the link.
                </>
              ) : (
                <>
                  أرسلنا رابط تأكيد إلى{" "}
                  <span className="mono font-semibold" dir="ltr" style={{ color: "var(--ink)" }}>
                    {email}
                  </span>
                  . افتح الرسالة واضغط على الرابط، ثم سجل دخولك.
                </>
              )}
            </p>

            <Link to="/login" className="btn w-full mb-3 block text-center">
              {isEn ? "Go to Sign In" : "الذهاب لتسجيل الدخول"}
            </Link>

            <button
              type="button"
              className="btn line sm w-full"
              onClick={async () => {
                try {
                  const result = await resendVerificationLink(email, password);
                  toast.success(
                    result?.alreadyVerified
                      ? isEn
                        ? "Email already verified — please sign in"
                        : "البريد مؤكد بالفعل — سجل دخولك"
                      : isEn
                      ? "New link sent"
                      : "تم إرسال رابط جديد"
                  );
                } catch (error) {
                  toast.error(error.message || (isEn ? "Could not resend link" : "تعذر إعادة الإرسال"));
                }
              }}
            >
              {isEn ? "Resend Link" : "إعادة إرسال الرابط"}
            </button>
          </div>
        ) : otpStep ? (
          <OtpVerify
            email={email}
            onVerify={handleVerify}
            onResend={() => resendOtp(email)}
            onBack={() => {
              setOtpStep(false);
              setVerificationMode(null);
            }}
          />
        ) : (
          <>
            {/* Auth Mode Switch */}
            <div className="tabs justify-center mb-4">
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                <button aria-selected="false">
                  {isEn ? "Sign In" : "تسجيل الدخول"}
                </button>
              </Link>
              <button aria-selected="true" className="font-bold">
                {isEn ? "New Account" : "حساب جديد"}
              </button>
            </div>

            <form onSubmit={handleRegister} style={{ display: "grid", gap: 12 }}>
              <div className="comp">
                <input
                  name="fullName"
                  placeholder={isEn ? "Full Name" : "الاسم الكامل"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="comp">
                <input
                  name="email"
                  dir="ltr"
                  type="email"
                  placeholder={isEn ? "Email Address" : "البريد الإلكتروني"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="comp">
                <input
                  name="password"
                  dir="ltr"
                  type={showPass ? "text" : "password"}
                  placeholder={isEn ? "Password (min 8 chars)" : "كلمة السر (8 حروف على الأقل)"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="p-2"
                  style={{ color: "var(--mute)" }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" animated={false} /> : <Eye className="w-4 h-4" animated={false} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-full mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" animated={false} /> : (isEn ? "Create Account" : "تسجيل حساب")}
              </button>
            </form>

            <p className="text-center text-xs mt-4" style={{ color: "var(--mute)" }}>
              {isEn ? "Already have an account? " : "عندك حساب بالفعل؟ "}
              <Link to="/login" className="font-bold underline" style={{ color: "var(--sig)" }}>
                {isEn ? "Sign In" : "تسجيل الدخول"}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
