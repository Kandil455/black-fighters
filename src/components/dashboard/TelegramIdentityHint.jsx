import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Link2, X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";

/**
 * One-time nudge for Telegram-only accounts (the classic confusion: student
 * signed in via Telegram first — fresh tg_ account holding the 15 welcome
 * credits — then via Google and can't find their balance. Linking merges
 * identities and auto-transfers the orphan account's credits).
 */
export default function TelegramIdentityHint() {
  const { profile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("bf_tg_identity_hint_dismissed") === "1";
    } catch {
      return true;
    }
  });

  // Only nag genuine Telegram-first accounts: telegram id present, no email,
  // no explicit linkage to a web account.
  const isTelegramOnly =
    Boolean(profile?.telegram_id || profile?.telegram_chat_id) &&
    !profile?.email;
  if (!isTelegramOnly || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[#19f08c]/25 bg-gradient-to-l from-[#19f08c]/[0.07] to-[#229ED9]/[0.07] px-4 py-3.5 flex items-start gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center shrink-0">
          <Bot className="w-4.5 h-4.5 text-[#38bdf8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#19f08c]" />
            {isEn ? "One account, whole balance" : "حساب واحد بكل رصيدك"}
          </p>
          <p className="text-xs text-white/60 leading-relaxed mt-1">
            {isEn
              ? "This account was created from Telegram. If you also signed in with Google or email, link them from Settings and we auto-carry every credit to one account."
              : "حسابك ده اتعمل من التيليجرام. لو عندك حساب تاني (جوجل/إيميل) — اربطهم من الإعدادات ورصيد الحساب التاني هيتحوّل أوتوماتيك (٢٥ كريدت ترحيلة فورية ومعاها كل اللي مضمخوش مش معلق في الحسابات)."}{" "}
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#19f08c] hover:text-emerald-300 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {isEn ? "Link accounts now" : "ربط الحسابات دلوقتي"}
          </Link>
        </div>
        <button
          onClick={() => {
            try {
              localStorage.setItem("bf_tg_identity_hint_dismissed", "1");
            } catch {}
            setDismissed(true);
          }}
          aria-label={isEn ? "Dismiss" : "إخفاء"}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
