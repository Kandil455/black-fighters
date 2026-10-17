import React, { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
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

  useEffect(() => {
    window.__onBlackFightersTelegramAuth = async (tgUser) => {
      if (!tgUser || !tgUser.id) return;
      setLoading(true);
      try {
        await loginWithTelegram(tgUser);
        toast.success(
          isEn
            ? "Signed in with Telegram successfully!"
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
      delete window.__onBlackFightersTelegramAuth;
    };
  }, [loginWithTelegram, isEn]);

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
                ? "Signed in with Telegram successfully!"
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
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={handlePopupAuth}
        disabled={loading}
        className="w-full h-11 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/40 text-[#38bdf8] hover:bg-[#229ED9]/25 transition-colors font-semibold text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
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
      <div
        ref={widgetContainerRef}
        className="flex justify-center min-h-[40px] items-center"
      />
    </div>
  );
}
