import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { BADGES } from "@/lib/gamification";
import { playClick } from "@/lib/sounds";

// مودال احتفالي بانيميشن خرافي يظهر عند فتح وسام جديد.
export default function BadgeUnlockModal({ badgeKey, onClose }) {
  const badge = BADGES[badgeKey];

  useEffect(() => {
    if (!badge) return;
    try { playClick(); } catch {}
    const fire = (ratio, opts) =>
      confetti({ ...opts, particleCount: Math.floor(220 * ratio), origin: { y: 0.45 }, zIndex: 9999 });
    fire(0.25, { spread: 26, startVelocity: 55, colors: ["#00e5ff", "#a855f7", "#00ff9d"] });
    fire(0.2, { spread: 60, colors: ["#00e5ff", "#fbbf24"] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9, colors: ["#a855f7", "#00ff9d", "#fbbf24"] });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, [badge]);

  if (!badge) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-background/85 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Glow rays */}
        <motion.div
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 360, opacity: 1 }}
          transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.6 } }}
          className="absolute w-[480px] h-[480px] pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg, transparent, hsl(184 100% 50% / 0.18), transparent, hsl(270 100% 68% / 0.18), transparent)",
            borderRadius: "9999px",
          }}
        />

        <motion.div
          initial={{ scale: 0.6, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="relative glass-card neon-glow-cyan rounded-[2rem] p-8 border border-primary/40 text-center max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ y: -10 }}
            animate={{ y: 0 }}
            className="inline-flex items-center gap-1.5 text-xs font-black text-accent border border-accent/40 bg-accent/10 rounded-full px-4 py-1.5 mb-5"
          >
            <Sparkles className="w-3.5 h-3.5" /> وسام جديد اتفتح!
          </motion.div>

          {/* Badge icon with floating + glow */}
          <div className="relative mx-auto w-32 h-32 mb-5">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
            />
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
              className="relative w-full h-full rounded-full glass-card border-2 border-primary/50 flex items-center justify-center"
            >
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-6xl"
              >
                {badge.icon}
              </motion.span>
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-black neon-text-gradient mb-2"
          >
            {badge.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-muted-foreground mb-6"
          >
            {badge.desc}
          </motion.p>

          <Button onClick={onClose} className="w-full h-11 font-bold gap-2 neon-glow-cyan">
            <Sparkles className="w-4 h-4" /> تمام، يلا نكمّل!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}