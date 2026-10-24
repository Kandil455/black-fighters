import React, { useEffect, useRef, useState } from "react";
import { Loader2, Send, ExternalLink, Copy, Check, X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { toast } from "sonner";

const TELEGRAM_BOT_USERNAME = "Black_Fighters_FREE_bot";
const TELEGRAM_BOT_ID = "8696687714";

export default function TelegramLoginButton({ className = "" }) {
  const { loginWithTelegram } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";
  const widgetContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loginSession, setLoginSession] = useState(null); // { code, deepLink, expiresAt }

  // 1. Process official Telegram Login Widget callback & OAuth #tgAuthResult hash
  useEffect(() => {
    const handleTgAuth = async (tgUser) => {
      if (!tgUser || !tgUser.id) return;
      setLoading(true);
      try {
        await loginWithTelegram(tgUser);
        toast.success(
          isEn
            ? "Signed in with Telegram successfully! 🚀"
            : "تم تسجيل الدخول وربط حساب التيليجرام بنجاح! 🚀"
        );
      } catch (err) {
        toast.error(
          err?.message ||
            (isEn ? "Telegram sign-in failed" : "تعذر تسجيل الدخول عبر التيليجرام")
        );
      } finally {
        setLoading(false);
      }
    };

    window.__onBlackFightersTelegramAuth = handleTgAuth;

    // Check URL hash for OAuth result (#tgAuthResult=...)
    try {
      const hash = window.location.hash || "";
      if (hash.includes("tgAuthResult=")) {
        const raw = hash.split("tgAuthResult=")[1]?.split("&")[0];
        if (raw) {
          const jsonStr = atob(decodeURIComponent(raw));
          const parsed = JSON.parse(jsonStr);
          if (parsed?.id) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
            handleTgAuth(parsed);
          }
        }
      }
    } catch {}

    // Listen for postMessage from oauth.telegram.org popup
    const onMessage = (event) => {
      try {
        if (typeof event.data === "string" && event.data.includes("tgAuthResult")) {
          const parsed = JSON.parse(event.data);
          if (parsed?.result?.id) {
            handleTgAuth(parsed.result);
          }
        } else if (event.data?.event === "auth_result" && event.data?.result?.id) {
          handleTgAuth(event.data.result);
        }
      } catch {}
    };
    window.addEventListener("message", onMessage);

    // Mount official widget if supported
    const container = widgetContainerRef.current;
    if (container && container.childElementCount === 0) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-request-access", "write");
      script.setAttribute("data-userpic", "false");
      script.setAttribute("data-onauth", "__onBlackFightersTelegramAuth(user)");
      container.appendChild(script);
    }

    return () => {
      window.removeEventListener("message", onMessage);
      delete window.__onBlackFightersTelegramAuth;
    };
  }, [loginWithTelegram, isEn]);

  // 2. Poll login session while active
  useEffect(() => {
    if (!loginSession?.code) return undefined;
    let cancelled = false;

    const intervalId = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/telegram-miniapp-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "poll_login_session",
            code: loginSession.code,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (data?.status === "approved" && data?.customToken) {
          clearInterval(intervalId);
          setLoading(true);
          const [{ signInWithCustomToken }, { auth }] = await Promise.all([
            import("firebase/auth"),
            import("@/lib/firebase"),
          ]);
          await signInWithCustomToken(auth, data.customToken);
          toast.success(
            isEn
              ? "Signed in with Telegram successfully! 🚀"
              : "تم تسجيل الدخول بحساب التيليجرام بنجاح! 🚀"
          );
          window.location.href = "/dashboard";
        } else if (data?.status === "expired") {
          clearInterval(intervalId);
          setLoginSession(null);
          toast.error(
            isEn ? "Login session expired. Try again." : "انتهت صلاحية جلسة الدخول. حاول مجدداً."
          );
        }
      } catch (err) {
        // silent polling error
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [loginSession, isEn]);

  // 3. Initiate Bot Handshake Login
  const handleStartBotLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram-miniapp-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_login_session" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.code) {
        throw new Error(data?.error || "تعذر بدء جلسة الدخول بالتيليجرام");
      }
      setLoginSession(data);
      window.open(data.deepLink, "_blank", "noopener,noreferrer");
      toast.info(
        isEn
          ? "Tap Start in Telegram bot to log in immediately"
          : "افتح البوت واضغط Start لتسجيل الدخول فوراً ⚡"
      );
    } catch (err) {
      toast.error(err.message || "فشل بدء جلسة الدخول بالتيليجرام");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!loginSession?.code) return;
    try {
      await navigator.clipboard.writeText(`/login ${loginSession.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success(isEn ? "Command copied!" : "تم نسخ أمر الدخول!");
    } catch {
      toast.error(isEn ? "Copy failed" : "تعذر النسخ");
    }
  };

  const handlePopupAuth = () => {
    if (window.Telegram?.Login?.auth) {
      setLoading(true);
      window.Telegram.Login.auth(
        { bot_id: TELEGRAM_BOT_ID, request_access: "write" },
        async (data) => {
          if (!data) {
            setLoading(false);
            return;
          }
          try {
            await loginWithTelegram(data);
            toast.success(
              isEn
                ? "Signed in with Telegram successfully! 🚀"
                : "تم تسجيل الدخول وربط حساب التيليجرام بنجاح! 🚀"
            );
          } catch (err) {
            toast.error(
              err?.message ||
                (isEn ? "Telegram sign-in failed" : "تعذر تسجيل الدخول عبر التيليجرام")
            );
          } finally {
            setLoading(false);
          }
        }
      );
      return;
    }

    const oauthUrl = `https://oauth.telegram.org/auth?bot_id=${TELEGRAM_BOT_ID}&origin=${encodeURIComponent(
      window.location.origin
    )}&embed=1&request_access=write&return_to=${encodeURIComponent(window.location.href)}`;
    window.open(oauthUrl, "telegram_oauth", "width=550,height=470");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {loginSession ? (
        <div className="rounded-2xl border border-[#229ED9]/50 bg-[#229ED9]/[0.08] p-4 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#38bdf8]">
              <Loader2 className="w-4 h-4 animate-spin text-[#38bdf8]" />
              <span>
                {isEn
                  ? "Waiting for Telegram bot confirmation..."
                  : "في انتظار ضغط Start في بوت التيليجرام..."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLoginSession(null)}
              className="p-1 text-[#9aa4b2] hover:text-[#ef4444] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#f5f7fa] leading-relaxed">
            {isEn
              ? "Open the bot and tap Start to sign in automatically to your dashboard:"
              : "افتح البوت واضغط Start وسيتم تسجيل دخولك تلقائياً لصفحتك الرئيسية:"}
          </p>

          <div className="flex items-center gap-2">
            <a
              href={loginSession.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-9 rounded-xl bg-[#229ED9] text-[#04131d] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#229ED9]/90 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isEn ? "Open Telegram Bot" : "افتح البوت الآن ↗"}</span>
            </a>
            <button
              type="button"
              onClick={handleCopyCode}
              className="h-9 px-3 rounded-xl border border-white/10 bg-[#05070a] text-xs font-mono font-bold text-[#f5f7fa] flex items-center gap-1.5 hover:border-[#38bdf8]/40 transition-colors cursor-pointer"
              title={isEn ? "Copy /login command" : "نسخ أمر الدخول"}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#19f08c]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#9aa4b2]" />
              )}
              <span>/login {loginSession.code}</span>
            </button>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-[#9aa4b2]">
            <button
              type="button"
              onClick={handlePopupAuth}
              className="hover:underline hover:text-[#38bdf8] transition-colors cursor-pointer"
            >
              {isEn ? "Or use browser popup" : "أو الدخول عبر نافذة المتصفح"}
            </button>
            <span className="flex items-center gap-1 text-[#19f08c]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isEn ? "Secure Handshake" : "مصادقة مشفرة 100%"}</span>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartBotLogin}
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/40 text-[#38bdf8] hover:bg-[#229ED9]/25 transition-colors font-semibold text-sm flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#38bdf8]" />
          ) : (
            <Send className="w-4 h-4 text-[#38bdf8]" />
          )}
          <span>
            {isEn
              ? "Sign in with Telegram (@Black_Fighters_FREE_bot)"
              : "تسجيل الدخول بالتيليجرام (@Black_Fighters_FREE_bot)"}
          </span>
        </button>
      )}

      <div
        ref={widgetContainerRef}
        className="flex justify-center min-h-[40px] items-center"
      />
    </div>
  );
}
