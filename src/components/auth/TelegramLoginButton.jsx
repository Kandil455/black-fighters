import React, { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { toast } from "sonner";

const TELEGRAM_BOT_ID = "8696687714";

/**
 * Telegram sign-in — full-page redirect flow.
 *
 * Why not the official popup script (telegram-widget.js):
 *  1. Our CSP bans eval by design — and THE OFFICIAL WIDGET SCRIPT ITSELF
 *     calls eval (EvalError in console → window.Telegram never boots → the
 *     OAuth popup closes and the page never receives the user).
 *  2. Popup->parent postMessage is routinely blocked (Shields/ITP/etc.).
 * The redirect variant is the same OAuth product: user confirms in Telegram,
 * oauth.telegram.org returns here and appends #tgAuthResult=<base64url JSON>,
 * which Login.jsx parses and completes (no CSP exposure, no popup bridge).
 */
export default function TelegramLoginButton({ className = "" }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [loading, setLoading] = useState(false);

  const handleRedirectAuth = () => {
    setLoading(true);
    // Preserve existing query (utm etc.) so the return keeps it.
    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    toast.info(
      isEn
        ? "Taking you to Telegram to confirm — one tap and you'll come back signed in…"
        : "هحولك للتيليجرام تتأكد — تحكيمة واحدة وترجع مسجّل ✅"
    );
    const oauthUrl =
      `https://oauth.telegram.org/auth?bot_id=${TELEGRAM_BOT_ID}` +
      `&origin=${encodeURIComponent(window.location.origin)}` +
      `&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`;
    window.location.assign(oauthUrl);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleRedirectAuth}
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
    </div>
  );
}
