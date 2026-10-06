import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const AssistantChat = lazy(() => import("./AssistantChat"));

/**
 * FloatingAssistant
 *
 * PERFORMANCE CONTRACT: the always-running decorations (idle float, gradient
 * spin, sonar pulse) are PURE CSS transform/opacity keyframes (index.css
 * .fab-*) — they live entirely on the compositor and never touch React or
 * the framer tree. Hover/press scale lives on an INNER wrapper (transition-
 * transform) because a running CSS animation would otherwise override the
 * transform on the same element. framer remains only for the chat panel's
 * mount/unmount via AnimatePresence.
 */
export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const { dir } = useLocale();

  return (
    <>
      {/* نافذة الشات */}
      <div className={`fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-20 ${dir === "rtl" ? "left-4 sm:left-6 md:left-8" : "right-4 sm:right-6 md:right-8"} z-[60]`}>
        <AnimatePresence>
          {open && (
            <Suspense fallback={
              <div className="ios-glass-dark rounded-3xl border border-primary/30 flex h-[420px] w-[min(92vw,400px)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }>
              <AssistantChat onClose={() => setOpen(false)} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>

      {/* الزر العائم (3D Liquid Siri/Gemini Floating Crystal Orb) */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label="مساعد Black Fighters"
        className={`fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6 ${dir === "rtl" ? "left-4 md:left-8" : "right-4 md:right-8"} z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center cursor-pointer select-none`}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ y: { duration: 2.8, repeat: Infinity, ease: "easeInOut" } }}
      >
        {/* Press/hover scale wrapper — never on the animated element itself */}
        <div className="transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90">
          {open ? (
            <div className="w-14 h-14 rounded-full ios-glass-dock border border-primary/50 shadow-[0_0_25px_rgba(0,245,255,0.4)] flex items-center justify-center">
              <X className="w-6 h-6 text-primary stroke-[2.5]" />
            </div>
          ) : (
            <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-primary via-cyan-400 to-accent shadow-[0_0_30px_rgba(0,245,255,0.5)]">
              <div className="w-full h-full rounded-full bg-background/85 backdrop-blur-xl flex items-center justify-center overflow-hidden relative">
                <div className="fab-spin absolute inset-0 bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent" />
                <Sparkles className="w-6 h-6 text-primary relative z-10 animate-pulse" />
              </div>
            </div>
          )}
        </div>
        {!open && (
          <span className="fab-pulse absolute inset-0 rounded-full border border-primary/40 pointer-events-none" />
        )}
      </motion.button>
    </>
  );
}
