import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LVCard } from "@/components/ui/linevault";
import { Loader2, Eye, EyeOff, MailCheck } from "lucide-react";
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
      className="min-h-screen bg-[#07090D] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo size={32} linkTo="/" />
        </div>

        <LVCard padding="p-6 sm:p-8">
          {otpStep && verificationMode === "link" ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#131820] border border-[#1C222B]">
                <MailCheck className="w-6 h-6 text-[#22E58B]" />
              </div>
              <h1 className="text-xl font-bold text-[#F2F4F7]">
                {isEn ? "Confirm Your Email" : "أكد بريدك الإلكتروني"}
              </h1>
              <p className="text-xs text-[#8B94A3] mt-2 mb-6 leading-relaxed">
                {isEn ? (
                  <>
                    We sent a confirmation link to{" "}
                    <span className="text-[#F2F4F7] font-mono font-semibold" dir="ltr">
                      {email}
                    </span>
                    . Open the email, click the link, then sign in.
                  </>
                ) : (
                  <>
                    أرسلنا رابط تأكيد إلى{" "}
                    <span className="text-[#F2F4F7] font-mono font-semibold" dir="ltr">
                      {email}
                    </span>
                    . افتح الرسالة واضغط على الرابط، ثم سجل دخولك.
                  </>
                )}
              </p>
              <Button asChild className="w-full h-11 font-bold mb-2.5">
                <Link to="/login">
                  {isEn ? "Go to Sign In" : "الذهاب لتسجيل الدخول"}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
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
                    toast.error(
                      error.message ||
                        (isEn ? "Could not resend link" : "تعذر إعادة الإرسال")
                    );
                  }
                }}
              >
                {isEn ? "Resend Link" : "إعادة إرسال الرابط"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setVerificationMode(null);
                }}
                className="mt-4 text-xs text-[#8B94A3] hover:text-[#F2F4F7] font-medium"
              >
                {isEn ? "← Edit information" : "← تعديل البيانات"}
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
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-[#F2F4F7]">
                  {isEn ? "Create Account" : "إنشاء حساب جديد"}
                </h1>
                <p className="text-xs text-[#8B94A3] mt-1">
                  {isEn
                    ? "Start organizing your lectures and summaries"
                    : "ابدأ تنظيم محاضراتك وملخصاتك في مكان واحد"}
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#8B94A3] mb-1.5 block">
                    {isEn ? "Full Name" : "الاسم الكامل"}
                  </label>
                  <Input
                    name="fullName"
                    placeholder={isEn ? "Your full name" : "اسمك الكامل"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 bg-[#07090D] border-[#1C222B] rounded-xl focus-visible:border-[#22E58B] text-[#F2F4F7]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8B94A3] mb-1.5 block">
                    {isEn ? "Email Address" : "البريد الإلكتروني"}
                  </label>
                  <Input
                    name="email"
                    dir="ltr"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-[#07090D] border-[#1C222B] rounded-xl focus-visible:border-[#22E58B] text-[#F2F4F7]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8B94A3] mb-1.5 block">
                    {isEn ? "Password" : "كلمة المرور"}
                  </label>
                  <div className="relative">
                    <Input
                      name="password"
                      dir="ltr"
                      type={showPass ? "text" : "password"}
                      placeholder={
                        isEn ? "At least 8 characters" : "8 حروف على الأقل"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-11 bg-[#07090D] border-[#1C222B] rounded-xl focus-visible:border-[#22E58B] text-[#F2F4F7] ${
                        isEn ? "pr-11" : "pl-11"
                      }`}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPass
                          ? isEn
                            ? "Hide password"
                            : "إخفاء كلمة المرور"
                          : isEn
                          ? "Show password"
                          : "إظهار كلمة المرور"
                      }
                      onClick={() => setShowPass(!showPass)}
                      className={`absolute top-0 h-11 w-11 flex items-center justify-center text-[#8B94A3] hover:text-[#F2F4F7] transition-colors ${
                        isEn ? "right-0" : "left-0"
                      }`}
                    >
                      {showPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 font-bold text-sm gap-2 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isEn ? "Create Account" : "إنشاء الحساب"}
                </Button>
              </form>

              <p className="text-center text-xs text-[#8B94A3] mt-6">
                {isEn ? "Already have an account? " : "لديك حساب بالفعل؟ "}
                <Link
                  to="/login"
                  className="text-[#22E58B] font-semibold hover:underline"
                >
                  {isEn ? "Sign In" : "تسجيل الدخول"}
                </Link>
              </p>
            </>
          )}
        </LVCard>
      </div>
    </div>
  );
}
