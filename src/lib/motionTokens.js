import { useEffect, useState } from "react";

/**
 * motionTokens.js
 * Unified Motion System for Black Fighters Study Flow.
 * Standardizes animations across all 22 platform routes.
 */

export const motionTokens = {
  // 100ms linear: button press, micro-interactions
  instant: {
    duration: 0.1,
    ease: "linear",
  },

  // 180ms easeOut: hover states, toggles, badges
  fast: {
    duration: 0.18,
    ease: [0.25, 0.1, 0.25, 1],
  },

  // 280ms easeInOut: modals, tabs, toasts, accordion expand
  base: {
    duration: 0.28,
    ease: [0.4, 0, 0.2, 1],
  },

  // ~450ms spring: page transitions, large cards, deck flips
  slow: {
    type: "spring",
    stiffness: 120,
    damping: 14,
    mass: 1,
  },

  // 700-1200ms bouncy spring: XP, Level Up, challenge win, badge unlocks
  celebration: {
    type: "spring",
    stiffness: 180,
    damping: 10,
    mass: 1,
  },
};

/**
 * Standard page transition variant
 */
export const pageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: motionTokens.slow,
  },
  exit: {
    opacity: 0,
    transition: motionTokens.fast,
  },
};

/**
 * Quiz answer feedback animation variants
 */
export const quizFeedbackVariants = {
  correct: {
    scale: [1, 1.03, 1],
    transition: motionTokens.base,
  },
  wrongShake: {
    x: [-8, 8, -4, 4, -2, 2, 0],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

/**
 * React Hook to detect and observe system reduced-motion accessibility preference
 */
export function useReducedMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event) => setPrefersReducedMotion(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /**
   * Helper that falls back to subtle fade when user prefers reduced motion
   */
  const getTransition = (tokenKey = "base") => {
    if (prefersReducedMotion) {
      return { duration: 0.1, ease: "linear" };
    }
    return motionTokens[tokenKey] || motionTokens.base;
  };

  return {
    prefersReducedMotion,
    getTransition,
  };
}

export default motionTokens;
