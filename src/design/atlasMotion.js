/**
 * BLACK FIGHTERS V5 — نظام الحركة «اضغط، ماتطيرش» (Press, Don't Fly)
 * Only transform and opacity are permitted.
 * Max 2 concurrent animated elements.
 * View Transition crossfade = 160ms.
 */

export const ATLAS_MOTION_TOKENS = Object.freeze({
  enterMs: 160,
  exitMs: 120,
  stampMs: 180,
  pageCrossfadeMs: 160,
  maxConcurrentAnimatedElements: 2,
  allowedProperties: Object.freeze(["transform", "opacity"]),
  bannedPatterns: Object.freeze([
    "parallax",
    "glow",
    "blur",
    "magnetic",
    "3d",
    "text-scramble",
    "infinite-loop",
  ]),
});

export const ATLAS_MOTION_VARIANTS = Object.freeze({
  plateEnter: {
    initial: { opacity: 0, transform: "translateY(6px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    exit: { opacity: 0, transform: "translateY(0px)" },
    transition: { duration: 0.16, ease: "easeOut" },
  },
  stampPress: {
    initial: { opacity: 0, transform: "scale(1.06) rotate(-4deg)" },
    animate: { opacity: 1, transform: "scale(1) rotate(-4deg)" },
    transition: { duration: 0.18, ease: "easeOut" },
  },
  crossfade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.16, ease: "linear" },
  },
});

export const ATLAS_DURATION = Object.freeze({
  enter: 0.16,
  exit: 0.12,
  stamp: 0.18,
  crossfade: 0.16,
});

let sessionStampCount = 0;

export function canPressSessionStamp() {
  return sessionStampCount < 1;
}

export function recordSessionStamp() {
  if (sessionStampCount >= 1) return false;
  sessionStampCount += 1;
  return true;
}

export function resetSessionStampForTest() {
  sessionStampCount = 0;
}

export const canTriggerSessionStamp = canPressSessionStamp;
export const consumeSessionStamp = recordSessionStamp;
export const resetSessionStampForTests = resetSessionStampForTest;

/**
 * Triggers a 160ms View Transition crossfade with mandatory accessibility focus routing.
 */
export function runAtlasViewTransition(updateDomCallback, focusTargetId = null) {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
    updateDomCallback();
    if (focusTargetId && typeof document !== "undefined") {
      document.getElementById(focusTargetId)?.focus?.();
    }
    return Promise.resolve();
  }
  const transition = document.startViewTransition(() => {
    updateDomCallback();
  });
  return transition.finished.finally(() => {
    if (focusTargetId) {
      document.getElementById(focusTargetId)?.focus?.();
    }
  });
}
