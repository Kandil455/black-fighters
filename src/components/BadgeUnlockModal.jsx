import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Award,
  Bot,
  BookOpenCheck,
  Clock,
  Flame,
  Layers,
  NotebookText,
  PenLine,
  Sparkles,
  Star,
  StickyNote,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { BADGES } from "@/lib/gamification";
import { usePerformanceMode } from "@/lib/PerformanceContext";

/**
 * BadgeUnlockModal — the achievement celebration.
 *
 * Rebuilt because the previous version read as noise: the badge emoji appeared
 * TWICE (inside the title string AND as the medallion glyph), a 480px rotating
 * conic-gradient blob sat behind the card as an unintended purple circle, the
 * whole screen used `backdrop-blur-xl`, and 4 infinite animations ran at once.
 *
 * Now: one icon per family (lucide, same vocabulary as the rest of the app), a
 * single crisp medallion, clear hierarchy, and celebration that is skipped on the
 * lite tier / reduced-motion instead of fighting the compositor.
 */

// Family → icon + accent. The ladder titles already carry a trailing emoji, so the
// emoji is stripped from the title and replaced by a real icon here.
const FAMILY_STYLE = {
  courses_created: { Icon: BookOpenCheck, tone: "text-primary", ring: "border-primary/40", wash: "bg-primary/10" },
  quizzes_completed: { Icon: Trophy, tone: "text-amber-300", ring: "border-amber-400/40", wash: "bg-amber-400/10" },
  summaries_created: { Icon: NotebookText, tone: "text-sky-300", ring: "border-sky-400/40", wash: "bg-sky-400/10" },
  flashcards_reviewed: { Icon: Layers, tone: "text-violet-300", ring: "border-violet-400/40", wash: "bg-violet-400/10" },
  notes_written: { Icon: StickyNote, tone: "text-lime-300", ring: "border-lime-400/40", wash: "bg-lime-400/10" },
  perfect_scores: { Icon: Star, tone: "text-yellow-300", ring: "border-yellow-400/40", wash: "bg-yellow-400/10" },
  current_streak: { Icon: Flame, tone: "text-orange-400", ring: "border-orange-400/40", wash: "bg-orange-400/10" },
  total_minutes_studied: { Icon: Clock, tone: "text-teal-300", ring: "border-teal-400/40", wash: "bg-teal-400/10" },
  ai_messages: { Icon: Bot, tone: "text-cyan-300", ring: "border-cyan-400/40", wash: "bg-cyan-400/10" },
  ai_quizzes: { Icon: Target, tone: "text-rose-300", ring: "border-rose-400/40", wash: "bg-rose-400/10" },
  summary_edits: { Icon: PenLine, tone: "text-indigo-300", ring: "border-indigo-400/40", wash: "bg-indigo-400/10" },
};

const FALLBACK_STYLE = { Icon: Award, tone: "text-primary", ring: "border-primary/40", wash: "bg-primary/10" };

// Ladder titles look like "مثابرة III 🔥" — drop the trailing emoji so it renders once.
function cleanTitle(title = "") {
  return title.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").trim();
}

export default function BadgeUnlockModal({ badgeKey, onClose }) {
  const badge = BADGES[badgeKey];
  const { isLite, isPowerSaver } = usePerformanceMode();
  const reduceMotion = useReducedMotion();

  const celebrate = !isLite && !isPowerSaver && !reduceMotion;

  const style = useMemo(() => FAMILY_STYLE[badge?.family] || FALLBACK_STYLE, [badge?.family]);
  const title = useMemo(() => cleanTitle(badge?.title), [badge?.title]);

  // Confetti is loaded on demand: it is a ~10KB canvas library that only ever
  // matters for this one moment, and only on capable devices.
  useEffect(() => {
    if (!badge || !celebrate) return;
    let cancelled = false;
    import("canvas-confetti")
      .then(({ default: confetti }) => {
        if (cancelled) return;
        const colors = ["#3DDC97", "#7dd3fc", "#fbbf24"];
        confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { y: 0.5 }, colors, disableForReducedMotion: true });
        setTimeout(() => {
          if (!cancelled) confetti({ particleCount: 45, spread: 100, decay: 0.92, scalar: 0.85, origin: { y: 0.55 }, colors, disableForReducedMotion: true });
        }, 180);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [badge, celebrate]);

  // Esc closes — a full-screen modal without a keyboard escape is a trap.
  useEffect(() => {
    if (!badge) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [badge, onClose]);

  if (!badge) return null;

  const { Icon } = style;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="إنجاز جديد"
      >
        <motion.div
          initial={{ scale: 0.94, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-[22rem] overflow-hidden rounded-3xl border border-[#1E222B] bg-[#0E1117] p-6 text-center shadow-2xl shadow-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute end-4 top-4 rounded-lg p-1.5 text-[#8A91A0] transition-colors hover:bg-white/5 hover:text-[#F2F3F5]"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Label */}
          <div className="mb-6 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A91A0]">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            إنجاز جديد
          </div>

          {/* Medallion */}
          <div className="relative mx-auto mb-5 h-24 w-24">
            <div className={`absolute inset-0 rounded-full ${style.wash} blur-xl`} aria-hidden="true" />
            <div
              className={`relative flex h-24 w-24 items-center justify-center rounded-full border ${style.ring} bg-[#131820]`}
            >
              <Icon className={`h-11 w-11 ${style.tone}`} strokeWidth={1.6} />
            </div>
          </div>

          <h2 className="text-xl font-black leading-snug text-[#F2F3F5]">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8A91A0]">{badge.desc}</p>

          {Number.isFinite(badge.threshold) && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#1E222B] bg-[#07080C] px-3 py-1 text-[11px] font-semibold text-[#8A91A0]">
              <Trophy className="h-3 w-3 text-amber-300" />
              المرحلة عند {badge.threshold}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-[#3DDC97] px-4 py-3 text-sm font-black text-[#03150c] transition-transform active:scale-[0.98]"
          >
            تمام، يلا نكمّل
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
