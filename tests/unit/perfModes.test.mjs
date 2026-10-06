/**
 * Performance-mode architecture contracts.
 *
 * History (measured bug, Sep 2026): prefers-reduced-motion was treated as a
 * DEVICE WEAKNESS signal — it fed the auto power-saver classification AND
 * the 3D "weak device" tier. Users whose OS reports reduced-motion (often
 * capable machines) got the entire app silently degraded: 0ms transitions
 * via the saver CSS kill-switch, frozen WebGL, skipped preloader, framer
 * force-reduced — with no idea why. The fix decouples three concerns:
 *   1. Motion preference  → accessibility only (reducedMotion="user",
 *      per-component matchMedia gates, intro skip).
 *   2. Power mode         → battery/connection/CPU signals + manual override.
 *   3. Heavy 3D content   → explicit user knob (auto/on/off), independent.
 * These tests keep them decoupled.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

test("auto power classification never reads prefers-reduced-motion", () => {
  const src = read("src/lib/PerformanceContext.jsx");
  const fn = src.match(/function initialAutoState\(\)[\s\S]*?\n}/);
  assert.ok(fn, "initialAutoState() not found");
  assert.equal(
    /prefers-reduced-motion|matchMedia/.test(fn[0]),
    false,
    "auto-saver classification reads the OS motion preference again — that silently degrades capable machines whose users enable reduced-motion for accessibility"
  );
});

test("the intro skip KEEPS the reduced-motion gate (intentional, motion-heavy content)", () => {
  const src = read("src/lib/PerformanceContext.jsx");
  const fn = src.match(/export function isPowerSaverSync\(\)[\s\S]*?\n}/);
  assert.ok(fn, "isPowerSaverSync() not found");
  assert.ok(
    fn[0].includes("prefers-reduced-motion"),
    "intro gate lost its reduced-motion skip — the cinematic intro is exactly what that setting exists to avoid"
  );
});

test("device capability probe never reads prefers-reduced-motion", () => {
  const src = read("src/lib/webglQuality.js");
  const fn = src.match(/function detectCapability\(\)[\s\S]*?\n}/);
  assert.ok(fn, "detectCapability() not found");
  assert.equal(
    /prefers-reduced-motion/.test(fn[0]),
    false,
    "3D capability classification treats the accessibility preference as device weakness again"
  );
});

test("use3DQuality honors the heavy-3D knob in addition to saver mode", () => {
  const src = read("src/lib/webglQuality.js");
  assert.ok(
    src.includes("heavyEnabled"),
    "use3DQuality ignores the heavy-3D knob — the Settings toggle would be dead UI"
  );
});

test("PerformanceContext exposes the heavy-3D tri-state", () => {
  const src = read("src/lib/PerformanceContext.jsx");
  for (const part of ['"on"', '"off"', '"auto"', "heavyEnabled", "setHeavy3d"]) {
    assert.ok(src.includes(part), `heavy-3D knob missing piece: ${part}`);
  }
});

test("Settings UI exposes both knobs (power mode + 3D scenes)", () => {
  const src = read("src/components/settings/PerformanceSettings.jsx");
  assert.ok(src.includes("setHeavy3d"), "3D knob missing from the settings panel");
  assert.ok(src.includes("setMode"), "power-mode knob missing from the settings panel");
});

test("Layout never derives framer reducedMotion from the saver flag", () => {
  const src = read("src/components/Layout.jsx");
  assert.equal(
    src.includes("reducedMotion={isPowerSaver"),
    false,
    "saver mode force-reduces framer again — mid-session mode flips kill every whileHover (the scroll-to-unlock bug)"
  );
});
