import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const AssistantChat = lazy(() => import("./AssistantChat"));

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    try {
      return localStorage.getItem("bf_assistant_minimized") === "1";
    } catch {
      return false;
    }
  });
  const { dir, locale } = useLocale();
  const isEn = locale === "en";

  const updateMinimized = (nextVal) => {
    setMinimized(nextVal);
    if (nextVal) setOpen(false);
    try {
      localStorage.setItem("bf_assistant_minimized", nextVal ? "1" : "0");
    } catch {}
  };

  // In RTL, the button sits on the left side of the screen (left-4 / left-0 when docked).
  // In LTR, the button sits on the right side of the screen (right-4 / right-0 when docked).
  const HideArrowIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const ShowArrowIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <>
      <div
        className={`fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-20 ${
          dir === "rtl" ? "left-4 sm:left-6 md:left-8" : "right-4 sm:right-6 md:right-8"
        } z-[60]`}
      >
        <AnimatePresence>
          {open && !minimized && (
            <Suspense
              fallback={
                <div className="glass-strong rounded-2xl flex h-[420px] w-[min(92vw,380px)] items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#19f08c]" />
                </div>
              }
            >
              <AssistantChat onClose={() => setOpen(false)} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {minimized ? (
        <button
          type="button"
          onClick={() => updateMinimized(false)}
          title={isEn ? "Show Study Assistant" : "إظهار المساعد الذكي"}
          aria-label={isEn ? "Show Study Assistant" : "إظهار المساعد الذكي"}
          className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 ${
            dir === "rtl"
              ? "left-0 rounded-e-xl border-s-0"
              : "right-0 rounded-s-xl border-e-0"
          } z-50 h-12 w-6 bg-[#0b111a] border border-[#19f08c]/45 text-[#19f08c] hover:bg-[#19f08c] hover:text-[#03150c] flex items-center justify-center cursor-pointer select-none transition-colors duration-150 shadow-[0_0_20px_rgba(25,240,140,0.25)]`}
        >
          <ShowArrowIcon className="w-4 h-4 stroke-[2.5]" />
        </button>
      ) : (
        <div
          className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 ${
            dir === "rtl" ? "left-4 md:left-8" : "right-4 md:right-8"
          } z-50 flex items-center rounded-2xl bg-[#0b111a]/95 border border-[#19f08c]/40 shadow-[0_8px_28px_-6px_rgba(25,240,140,0.32)] overflow-hidden select-none`}
        >
          <motion.button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={isEn ? "Black Fighters Study Assistant" : "مساعد Black Fighters الذكي"}
            className={`h-11 px-3.5 flex items-center gap-2 cursor-pointer transition-colors duration-150 ${
              open
                ? "bg-[#19f08c]/15 text-[#19f08c]"
                : "text-[#f5f7fa] hover:bg-white/[0.05]"
            }`}
          >
            {open ? (
              <X className="w-4 h-4 text-[#19f08c] stroke-[2.4]" />
            ) : (
              <span className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-[#19f08c]/15 text-[#19f08c]">
                <Bot className="w-4 h-4 stroke-[2.2]" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#19f08c]" />
              </span>
            )}
            <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">
              {open
                ? isEn
                  ? "Close"
                  : "إغلاق"
                : isEn
                ? "Smart Assistant"
                : "المساعد الذكي"}
            </span>
          </motion.button>

          <button
            type="button"
            onClick={() => updateMinimized(true)}
            title={isEn ? "Hide button to edge" : "إخفاء الزر في الجنب"}
            aria-label={isEn ? "Hide button to edge" : "إخفاء الزر في الجنب"}
            className="h-11 w-7 flex items-center justify-center border-s border-white/10 text-[#9aa4b2] hover:text-[#19f08c] hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
          >
            <HideArrowIcon className="w-3.5 h-3.5 stroke-[2.4]" />
          </button>
        </div>
      )}
    </>
  );
}
