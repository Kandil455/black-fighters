/**
 * Shared motion variants — one vocabulary for the whole app.
 *
 * Every variant is built from `motionTokens`, so durations and easings stay
 * consistent. Pass `reduced` (from useReducedMotionPreference) to get a simple,
 * non-moving fade instead: motion never runs for users who asked for less.
 */
import { motionTokens } from "./motionTokens.js";

const { fast, base, instant, slow } = motionTokens;

const fade = { opacity: 0 };
const shown = { opacity: 1 };

/** Enter from below with a fade. The default for cards, sections and rows. */
export function enterUp({ reduced = false, distance = 12 } = {}) {
  if (reduced) return { hidden: fade, show: { ...shown, transition: fast } };
  return {
    hidden: { opacity: 0, y: distance },
    show: { opacity: 1, y: 0, transition: { duration: base.duration, ease: base.ease } },
  };
}

/** A container that reveals its children one after another. */
export function staggerParent({ reduced = false, gap = 0.05 } = {}) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : gap, delayChildren: reduced ? 0 : 0.04 } },
  };
}

/** Scale-in for badges, chips and small pop-ins. */
export function popIn({ reduced = false } = {}) {
  if (reduced) return { hidden: fade, show: { ...shown, transition: fast } };
  return {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1, transition: { duration: fast.duration, ease: fast.ease } },
  };
}

/** Hover lift for interactive cards. Empty when motion is reduced. */
export function hoverLift({ reduced = false } = {}) {
  if (reduced) return {};
  return {
    whileHover: { y: -2, transition: { duration: fast.duration, ease: fast.ease } },
    whileTap: { scale: 0.985, transition: { duration: instant.duration } },
  };
}

/** Celebration spring for wins, XP gains and unlocks. */
export function celebrate({ reduced = false } = {}) {
  if (reduced) return { hidden: fade, show: { ...shown, transition: fast } };
  return {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: slow },
  };
}

export const variantTokens = { fast, base, instant, slow };
