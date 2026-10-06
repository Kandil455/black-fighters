/**
 * motionMath.js — pure, DOM-free motion math for pointer-driven effects.
 *
 * Everything in this module is side-effect-free so the motion hot path
 * (previously buried inside React setState calls that re-rendered whole card
 * subtrees 60–120×/s) is unit-testable with plain node:test — no browser,
 * no React, no mocking of rAF.
 *
 * Consumers: CinematicTiltCard (spring tilt), CardSpotlight (pointer glow).
 */

/** Clamp v into [min, max]. */
export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

/** Linear interpolation; t outside [0,1] extrapolates. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Frame-rate-independent exponential smoothing ("critically damped feel").
 * `smoothing` is the fraction of the remaining distance closed per second —
 * higher = snappier. Two half-length steps land exactly where one full step
 * does, so the animation looks identical at 60Hz and 120Hz.
 */
export function damp(current, target, smoothing, dt) {
  const t = 1 - Math.exp(-smoothing * Math.max(dt, 0));
  return lerp(current, target, t);
}

/**
 * One step of a semi-implicit Euler spring integrator (the same physical
 * model behind framer-motion's default springs — stiffness/damping/mass).
 * Semi-implicit (velocity first, then position) is stable for the dt values
 * we feed it (clamped to ≤32ms by the caller).
 *
 * @returns {{ value: number, velocity: number }}
 */
export function springStep(value, velocity, target, params = {}, dt = 1 / 60) {
  const { stiffness = 380, damping = 28, mass = 1 } = params;
  const force = -stiffness * (value - target);
  const drag = -damping * velocity;
  const nextVelocity = velocity + ((force + drag) / mass) * dt;
  const nextValue = value + nextVelocity * dt;
  return { value: nextValue, velocity: nextVelocity };
}

/**
 * A spring is visually settled when displacement and velocity are both
 * sub-pixel/sub-degree — the cue for the rAF loop to stop burning frames.
 */
export function springIsSettled(value, velocity, target, epsilon = 0.001) {
  return Math.abs(value - target) < epsilon && Math.abs(velocity) < epsilon;
}

/**
 * Map a pointer position (viewport px) onto a card rect (cached, untransformed
 * layout box) to produce tilt targets and gradient anchor points.
 *
 * Sign conventions match the original CinematicTiltCard: cursor below center
 * tilts the top edge toward the viewer (rotateX negative), cursor right of
 * center rotates the right edge away (rotateY positive).
 *
 * px/py are the pointer as a 0–100 percentage of the card box — consumed by
 * the cursor-glow gradients via CSS custom properties (--mx/--my), so the
 * per-frame DOM write is two `setProperty` calls instead of re-serializing
 * two background strings through React.
 *
 * Zero-width/height rects fall back to 1 to keep the math NaN-free.
 */
export function computePointerTarget(clientX, clientY, rect, maxTilt = 10) {
  const w = rect.width || 1;
  const h = rect.height || 1;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const nx = clamp((x - w / 2) / (w / 2), -1, 1);
  const ny = clamp((y - h / 2) / (h / 2), -1, 1);
  return {
    // `+ 0` normalizes -0 (from -ny * maxTilt when ny = 0) to +0 so strict
    // equality holds and no `-0.000deg` ever reaches the transform string.
    rotateX: -ny * maxTilt + 0,
    rotateY: nx * maxTilt + 0,
    px: clamp((x / w) * 100, 0, 100),
    py: clamp((y / h) * 100, 0, 100),
  };
}
