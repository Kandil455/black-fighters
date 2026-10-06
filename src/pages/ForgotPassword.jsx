import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LVCard } from "@/components/ui/linevault";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!email) {
      return toast.error(isEn ? "Please enter your email" : "اكتب إيميلك");
    }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success(
        isEn
          ? "Password reset link sent"
          : "تم إرسال رابط إعادة تعيين كلمة المرور"
      );
    } catch (err) {
      toast.error(err.message || (isEn ? "An error occurred" : "حصل خطأ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#07080C] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo size={32} linkTo="/" />
        </div>

        <LVCard padding="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#F2F3F5]">
              {isEn ? "Reset Password" : "استعادة كلمة المرور"}
            </h1>
            <p className="text-xs text-[#9AA0AE] mt-1">
              {isEn
                ? "We will send a password reset link to your email"
                : "سنرسل رابطاً لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني"}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-[#131720] border border-[#1E222B] text-[#3DDC97]">
                <Mail className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[#F2F3F5]">
                {isEn ? "Reset link sent!" : "تم إرسال الرابط بنجاح!"}
              </p>
              <Button asChild className="w-full h-11">
                <Link to="/login">
                  {isEn ? "Back to Sign In" : "رجوع لتسجيل الدخول"}
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#9AA0AE] mb-1.5 block">
                  {isEn ? "Email Address" : "البريد الإلكتروني"}
                </label>
                <Input
                  dir="ltr"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-[#07080C] border-[#1E222B] rounded-xl focus-visible:border-[#3DDC97] text-[#F2F3F5]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-bold gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isEn ? "Send Reset Link" : "إرسال رابط الاستعادة"}
              </Button>
              <Link
                to="/login"
                className="block text-center text-xs text-[#9AA0AE] hover:text-[#F2F3F5] pt-2"
              >
                {isEn ? "Back to Sign In" : "رجوع لتسجيل الدخول"}
              </Link>
            </form>
          )}
        </LVCard>
      </div>
    </div>
  );
}
