import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const AssistantChat = lazy(() => import("./AssistantChat"));

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const { dir, locale } = useLocale();
  const isEn = locale === "en";

  return (
    <>
      <div
        className={`fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-20 ${
          dir === "rtl" ? "left-4 sm:left-6 md:left-8" : "right-4 sm:right-6 md:right-8"
        } z-[60]`}
      >
        <AnimatePresence>
          {open && (
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

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={isEn ? "Black Fighters Study Assistant" : "مساعد Black Fighters الذكي"}
        className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 ${
          dir === "rtl" ? "left-4 md:left-8" : "right-4 md:right-8"
        } z-50 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center cursor-pointer select-none transition-transform duration-150 active:scale-95 ${
          open
            ? "glass-strong text-[#f5f7fa] border border-white/15"
            : "btn-primary-glow"
        }`}
      >
        {open ? (
          <X className="w-5 h-5 stroke-[2.2]" />
        ) : (
          <Sparkles className="w-5 h-5 stroke-[2.2]" />
        )}
      </motion.button>
    </>
  );
}
