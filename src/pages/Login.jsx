import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LVCard } from "@/components/ui/linevault";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authErrorMessage } from "@/lib/authErrors";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const currentEmail =
      email || document.querySelector('input[name="email"]')?.value || "";
    const currentPassword =
      password || document.querySelector('input[name="password"]')?.value || "";
    if (!currentEmail || !currentPassword) {
      return toast.error(
        isEn ? "Please enter email and password" : "اكتب الإيميل والباسورد"
      );
    }
    setLoading(true);
    try {
      await login(currentEmail, currentPassword);
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        authErrorMessage(
          err,
          err.message || (isEn ? "Login failed" : "حصل خطأ في تسجيل الدخول")
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      toast.error(
        authErrorMessage(
          err,
          err.message ||
            (isEn ? "Google login failed" : "حصل خطأ في تسجيل الدخول بـ Google")
        )
      );
    }
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#F2F4F7]">
              {isEn ? "Sign In" : "تسجيل الدخول"}
            </h1>
            <p className="text-xs text-[#8B94A3] mt-1">
              {isEn
                ? "Sign in to access your courses and summaries"
                : "سجل دخولك للوصول إلى كورساتك وملخصاتك"}
            </p>
          </div>

          <Button
            type="button"
            onClick={handleGoogle}
            variant="outline"
            className="w-full h-11 gap-2.5 mb-5 font-semibold"
          >
            <GoogleIcon className="w-4 h-4" />
            {isEn ? "Continue with Google" : "دخول سريع بـ Google"}
          </Button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#1C222B]" />
            <span className="text-xs text-[#8B94A3]">
              {isEn ? "Or with email" : "أو عبر البريد"}
            </span>
            <div className="flex-1 h-px bg-[#1C222B]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#8B94A3]">
                  {isEn ? "Password" : "كلمة المرور"}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#22E58B] hover:underline font-medium"
                >
                  {isEn ? "Forgot password?" : "نسيت كلمة المرور؟"}
                </Link>
              </div>
              <div className="relative">
                <Input
                  name="password"
                  dir="ltr"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
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
              {isEn ? "Sign In" : "تسجيل الدخول"}
            </Button>
          </form>

          <p className="text-center text-xs text-[#8B94A3] mt-6">
            {isEn ? "Don't have an account? " : "ليس لديك حساب؟ "}
            <Link
              to="/register"
              className="text-[#22E58B] font-semibold hover:underline"
            >
              {isEn ? "Create new account" : "إنشاء حساب جديد"}
            </Link>
          </p>
        </LVCard>
      </div>
    </div>
  );
}
