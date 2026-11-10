import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { bootstrapTelegramSession, getTelegramWebApp, loadTelegramSdk } from "@/lib/telegramMiniApp";
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
  const { login, loginWithGoogle, loginWithTelegram, isAuthenticated } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  // Redirect-return fallback: when a browser blocks the OAuth popup's
  // postMessage back to this page (Shields/ITP/etc.), Telegram returns the
  // user to return_to with the payload in the URL fragment as
  // #tgAuthResult=<base64url JSON>. Without this parser the page just reloads
  // and nothing happens — exactly the "popup closes, still on login" symptom.
  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const m = hash.match(/tgAuthResult=([A-Za-z0-9_-]+)/);
      if (!m) return;
      const json = decodeURIComponent(
        window.atob(m[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      const user = JSON.parse(json);
      // Clean the fragment immediately so a refresh can't replay it.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (!user || !user.id || !user.hash) return;
      toast.info(isEn ? "Completing Telegram sign-in…" : "جاري إتمام تسجيل دخولك بالتيليجرام… ⏳");
      loginWithTelegram(user)
        .then(() => {
          toast.success(isEn ? "Signed in with Telegram! 🚀" : "تم تسجيل دخولك بالتيليجرام! 🚀");
        })
        .catch((err) => {
          toast.error(err?.message || (isEn ? "Telegram sign-in failed" : "تعذر تسجيل الدخول عبر التيليجرام"));
        });
    } catch (err) {
      console.warn("[Login] tgAuthResult parse failed:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto sign-in inside Telegram's WebView: the Login Widget popup flow can
  // never complete there (postMessage between the OAuth popup and the webview
  // dies), so users coming from the bot's web_app button look "stuck on the
  // login page". The signed initData path completes instantly instead.
  const [tgBooting, setTgBooting] = useState(() => Boolean(getTelegramWebApp()?.initData));
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (loadTelegramSdk) await loadTelegramSdk(1200).catch(() => false);
        if (!getTelegramWebApp()?.initData) return;
        const [{ signInWithCustomToken }, { auth }] = await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase"),
        ]);
        const res = await bootstrapTelegramSession({ signInWithCustomToken, auth });
        if (cancelled) return;
        if (res.status === "authenticated") {
          toast.success(isEn ? "Signed in with Telegram! 🚀" : "تم تسجيل دخولك بالتيليجرام! 🚀");
        } else if (res.status === "unlinked" || res.status === "error") {
          toast.info(
            isEn
              ? "This Telegram isn't linked to a Black Fighters account yet: sign in with Google/email first, then link Telegram from Settings."
              : "التيليجرام ده لسه مش مرتبط بحساب 🧩 — سجّل بجوجل أو الإيميل من تحت، وبعد الدخول روح الإعدادات واربط التيليجرام (الربط بينقل كل رصيدك أوتوماتيك).",
            { duration: 9000 }
          );
        }
      } catch {
        /* widget fallback below still works on normal browsers */
      } finally {
        if (!cancelled) setTgBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {isEn ? "Sign In" : "تسجيل الدخول"}
            </h1>
            <p className="text-xs text-[#9AA0AE] mt-1">
              {isEn
                ? "Sign in to access your courses and summaries"
                : "سجل دخولك للوصول إلى كورساتك وملخصاتك"}
            </p>
          </div>

          <Button
            type="button"
            onClick={handleGoogle}
            variant="outline"
            className="w-full h-11 gap-2.5 mb-3 font-semibold"
          >
            <GoogleIcon className="w-4 h-4" />
            {isEn ? "Continue with Google" : "دخول سريع بـ Google"}
          </Button>

          <a
            href="/walkthrough/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-10 mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-colors flex items-center justify-center gap-2 text-xs font-bold"
          >
            <span>🎬</span>
            <span>
              {isEn
                ? "Watch 5-Min Animated Platform Guide (With Voiceover)"
                : "شاهد فيديو شرح المنصة بالصوت والأنيميشن (5 دقائق)"}
            </span>
          </a>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#1E222B]" />
            <span className="text-xs text-[#9AA0AE]">
              {isEn ? "Or with email" : "أو عبر البريد"}
            </span>
            <div className="flex-1 h-px bg-[#1E222B]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#9AA0AE] mb-1.5 block">
                {isEn ? "Email Address" : "البريد الإلكتروني"}
              </label>
              <Input
                name="email"
                dir="ltr"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-[#07080C] border-[#1E222B] rounded-xl focus-visible:border-[#3DDC97] text-[#F2F3F5]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#9AA0AE]">
                  {isEn ? "Password" : "كلمة المرور"}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#3DDC97] hover:underline font-medium"
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
                  className={`h-11 bg-[#07080C] border-[#1E222B] rounded-xl focus-visible:border-[#3DDC97] text-[#F2F3F5] ${
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
                  className={`absolute top-0 h-11 w-11 flex items-center justify-center text-[#9AA0AE] hover:text-[#F2F3F5] transition-colors ${
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

          <p className="text-center text-xs text-[#9AA0AE] mt-6">
            {isEn ? "Don't have an account? " : "ليس لديك حساب؟ "}
            <Link
              to="/register"
              className="text-[#3DDC97] font-semibold hover:underline"
            >
              {isEn ? "Create new account" : "إنشاء حساب جديد"}
            </Link>
          </p>
        </LVCard>
      </div>
    </div>
  );
}
