import { useEffect, useState } from "react";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { motionTokens } from "@/lib/motionTokens";

/**
 * motion.js — the ONE place that decides whether something may animate.
 *
 * Three inputs, deliberately separated:
 *   1. Device tier    (PerformanceContext) → a weak phone simply may not animate.
 *   2. Power mode     (PerformanceContext) → the user asked for saver.
 *   3. Motion pref    (OS)                 → accessibility, independent of hardware.
 *
 * Contract for every consumer (pinned by tests/unit/motionPerfContracts.test.mjs):
 *   • only `transform` / `opacity` animate — never `filter`, `box-shadow`, `width`
 *     or `height` (all four repaint on the main thread every frame);
 *   • `duration` stays ≤ 300 ms for UI feedback;
 *   • `stagger` is capped so a 30-item list does not queue 30 animations.
 */

const MAX_UI_DURATION = 0.3;
const MAX_STAGGER = 0.04;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @param {{ allowOnLite?: boolean }} [options]
 *   `allowOnLite` for motion that is functional (e.g. a progress reveal the user
 *   must be able to follow). Decorative motion is always off on lite.
 */
export function useMotionGate({ allowOnLite = false } = {}) {
  const { isPowerSaver, tier } = usePerformanceMode();
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  const liteBlocked = tier === "lite" && !allowOnLite;
  const enabled = !(isPowerSaver || reduced || liteBlocked);

  const duration = enabled ? motionTokens.base.duration : 0;
  const fast = enabled ? motionTokens.fast.duration : 0;
  const stagger = enabled ? MAX_STAGGER : 0;

  return {
    enabled,
    reduced,
    tier,
    isLite: tier === "lite",
    duration: Math.min(duration, MAX_UI_DURATION),
    fast,
    stagger,
    ease: motionTokens.base.ease,
  };
}

export { MAX_UI_DURATION, MAX_STAGGER };
export default useMotionGate;
