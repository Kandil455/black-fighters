/**
 * Unit tests for src/lib/motionMath.js — the pure math behind the pointer
 * effects (CinematicTiltCard spring tilt, CardSpotlight cursor glow).
 *
 * The hot path used to run inside React setState at 60–120Hz with zero test
 * coverage; these tests pin the contracts that make the ref-driven rewrite
 * safe: deterministic clamping, frame-rate-independent damping, stable spring
 * integration, and NaN-free pointer mapping.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  lerp,
  damp,
  springStep,
  springIsSettled,
  computePointerTarget,
} from "../../src/lib/motionMath.js";

// ── clamp ────────────────────────────────────────────────────────────────
test("clamp keeps values inside [min, max]", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test("clamp handles inverted usage gracefully (min > max still bounds)", () => {
  // Implementation detail: min(max(v, min), max) — document the actual order.
  assert.equal(clamp(5, 10, 0), 0);
});

// ── lerp ─────────────────────────────────────────────────────────────────
test("lerp hits exact endpoints at t=0 and t=1", () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
});

test("lerp midpoint is exact", () => {
  assert.equal(lerp(10, 20, 0.5), 15);
});

// ── damp (frame-rate independence) ───────────────────────────────────────
test("damp: two half-dt steps land exactly where one full-dt step does", () => {
  // This is the contract that makes the tilt look identical at 60Hz and 120Hz.
  const target = 10;
  const smoothing = 12;

  // Path A: one 32ms step.
  const a = damp(0, target, smoothing, 0.032);

  // Path B: two 16ms steps starting from the same point.
  const mid = damp(0, target, smoothing, 0.016);
  const b = damp(mid, target, smoothing, 0.016);

  assert.ok(Math.abs(a - b) < 1e-9, `one 32ms step (${a}) must equal two 16ms steps (${b})`);
});

test("damp never overshoots and approaches the target monotonically", () => {
  let v = 0;
  let prev = -Infinity;
  for (let i = 0; i < 200; i += 1) {
    v = damp(v, 1, 10, 1 / 60);
    assert.ok(v >= prev, "must be monotonic toward target");
    assert.ok(v <= 1, "exponential damping must never overshoot");
    prev = v;
  }
  assert.ok(Math.abs(v - 1) < 1e-6, "converges onto the target");
});

test("damp treats negative dt as zero (no time travel)", () => {
  assert.equal(damp(3, 10, 12, -0.5), 3);
});

// ── springStep ───────────────────────────────────────────────────────────
test("spring converges to target and settles (loop stops burning frames)", () => {
  const SPRING = { stiffness: 380, damping: 28, mass: 0.8 };
  let { value, velocity } = { value: -9, velocity: 0 }; // from max tilt
  let settled = false;
  for (let i = 0; i < 600; i += 1) {
    ({ value, velocity } = springStep(value, velocity, 0, SPRING, 1 / 60));
    if (springIsSettled(value, velocity, 0)) { settled = true; break; }
  }
  assert.ok(settled, "spring from -9deg must settle within 10s");
  assert.ok(Math.abs(value) < 0.001);
});

test("spring is stable at large dt input clamped by caller (32ms)", () => {
  const SPRING = { stiffness: 380, damping: 28, mass: 0.8 };
  let value = 10, velocity = 0;
  for (let i = 0; i < 300; i += 1) {
    ({ value, velocity } = springStep(value, velocity, 0, SPRING, 0.032));
    assert.ok(Math.abs(value) < 100, "must not explode at 30fps steps");
  }
  assert.ok(springIsSettled(value, velocity, 0, 0.01));
});

test("spring overshoots with low damping (underdamped behavior preserved)", () => {
  const LOOSE = { stiffness: 200, damping: 8, mass: 1 };
  let value = 0, velocity = 0, maxOvershoot = 0;
  for (let i = 0; i < 200; i += 1) {
    ({ value, velocity } = springStep(value, velocity, 10, LOOSE, 1 / 60));
    maxOvershoot = Math.max(maxOvershoot, value);
  }
  assert.ok(maxOvershoot > 10, "underdamped spring must overshoot the target");
});

test("springIsSettled honors the epsilon on both position and velocity", () => {
  assert.ok(springIsSettled(0.0009, 0, 0));           // position inside eps
  assert.ok(springIsSettled(0, 0.0009, 0));           // velocity inside eps
  assert.equal(springIsSettled(0.01, 0, 0), false);   // position outside
  assert.equal(springIsSettled(0, 0.01, 0), false);   // velocity outside
  assert.ok(springIsSettled(0.4, 0, 0.5, 0.2));       // custom epsilon
});

// ── computePointerTarget ─────────────────────────────────────────────────
const RECT = { left: 100, top: 50, width: 400, height: 200 };

test("pointer at card center maps to zero tilt and 50%/50% anchor", () => {
  const t = computePointerTarget(300, 150, RECT, 10);
  assert.equal(t.rotateX, 0);
  assert.equal(t.rotateY, 0);
  assert.equal(t.px, 50);
  assert.equal(t.py, 50);
});

test("pointer at corners maps to ±maxTilt, clamped outside the card", () => {
  const topRight = computePointerTarget(500, 50, RECT, 10);
  assert.equal(topRight.rotateX, 10); // top edge → rotateX positive (top tilts away)
  assert.equal(topRight.rotateY, 10); // right edge → rotateY positive
  assert.equal(topRight.px, 100);
  assert.equal(topRight.py, 0);

  // Far outside the box → tilt clamps, anchor pins to the border (0–100).
  const far = computePointerTarget(5000, 5000, RECT, 10);
  assert.equal(far.rotateX, -10);
  assert.equal(far.rotateY, 10);
  assert.equal(far.px, 100);
  assert.equal(far.py, 100);
});

test("sign conventions match the original tilt card", () => {
  // Cursor below-right of center: rotateX negative (top tilts toward viewer),
  // rotateY positive — exactly the original formulas' output.
  const belowRight = computePointerTarget(450, 250, RECT, 10);
  assert.ok(belowRight.rotateX < 0);
  assert.ok(belowRight.rotateY > 0);
  // Horizontally centered probe → rotateY must be exactly 0 (no twist).
  const belowCenter = computePointerTarget(300, 250, RECT, 10);
  assert.equal(belowCenter.rotateY, 0);
});

test("zero-size rect never produces NaN (fallback dimension = 1)", () => {
  const t = computePointerTarget(0, 0, { left: 0, top: 0, width: 0, height: 0 }, 10);
  assert.ok(Number.isFinite(t.rotateX));
  assert.ok(Number.isFinite(t.rotateY));
  assert.ok(Number.isFinite(t.px));
  assert.ok(Number.isFinite(t.py));
});
