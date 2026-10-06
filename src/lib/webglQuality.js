import { usePerformanceMode } from "@/lib/PerformanceContext";

/**
 * webglQuality.js
 * Adaptive 3D quality resolver shared by every Three.js scene.
 *
 * Strategy (replaces static per-component caps):
 *  - Power Saver (auto or manual)  -> low-power preset, antialias off, DPR 1.25
 *  - Capable device (GPU + cores)  -> high-performance preset, antialias on, DPR 2
 *  - Weak device                   -> balanced preset, antialias on small scenes, DPR 1.5
 *
 * Capability probe runs once per page load and is memoized module-level,
 * so mounting many 3D components never re-probes the GPU.
 */

const QUALITY_PRESETS = {
  full: { antialias: true, powerPreference: "high-performance", pixelRatioCap: 2, tier: "full" },
  // balanced: weaker GPUs get AA + capped DPR, but powerPreference stays
  // 'high-performance' — 'low-power' steers COMPOSITING onto the integrated
  // GPU on hybrid systems, and compositing is most of this app's frame cost
  // (the balanced-mode menu lag report). The DPR/AA caps already carry the
  // power saving.
  balanced: { antialias: true, powerPreference: "high-performance", pixelRatioCap: 1.5, tier: "balanced" },
  saver: { antialias: false, powerPreference: "low-power", pixelRatioCap: 1.25, tier: "saver" },
};

let capabilityCache = null;

function probeGpuIsSoftware() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return true;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "")
      : "";
    const vendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "")
      : "";
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(`${renderer} ${vendor}`);
  } catch {
    return true;
  }
}

function detectCapability() {
  if (typeof navigator === "undefined") return { softwareGpu: false, weak: false };
  const cores = Number(navigator.hardwareConcurrency || 8);
  const memory = Number(navigator.deviceMemory || 8);
  const softwareGpu = probeGpuIsSoftware();
  const weak = softwareGpu || (cores <= 4 && memory <= 4);
  return { softwareGpu, weak, cores, memory };
}

export function getDevice3DCapability() {
  if (!capabilityCache) capabilityCache = detectCapability();
  return capabilityCache;
}

export function resolve3DQuality({ isPowerSaver = false } = {}) {
  if (isPowerSaver) return QUALITY_PRESETS.saver;
  const { weak } = getDevice3DCapability();
  return weak ? QUALITY_PRESETS.balanced : QUALITY_PRESETS.full;
}

/** React hook — quality preset for a 3D scene. Honors BOTH the Battery Saver
 * mode AND the explicit heavy-3D knob (auto/on/off): either one skipping 3D
 * resolves to the saver preset, so existing `quality.isPowerSaver` gates in
 * scene components need no changes. */
export function use3DQuality() {
  const { isPowerSaver, heavyEnabled } = usePerformanceMode();
  const skip3D = isPowerSaver || !heavyEnabled;
  return { ...resolve3DQuality({ isPowerSaver: skip3D }), isPowerSaver: skip3D, heavyEnabled };
}

/**
 * Shared helper to detect if the user agent prefers reduced motion.
 * SSR-safe, handles older browsers/environments without matchMedia.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
}

/**
 * createResolutionGovernor(renderer)
 * Watches real frame times and auto-adjusts the renderer's pixel ratio:
 *   sustained slow frames (> slowMs avg)  -> step resolution DOWN (smoother motion)
 *   sustained fast frames (< fastMs avg)  -> step resolution UP (sharper image)
 * Usage: const govern = createResolutionGovernor(renderer); ... call govern() every frame after render.
 */
export function createResolutionGovernor(renderer, {
  minScale = 0.55, stepDown = 0.15, stepUp = 0.1,
  slowMs = 22, fastMs = 13, windowSize = 50,
} = {}) {
  const base = typeof renderer.getPixelRatio === "function" ? renderer.getPixelRatio() : 1;
  let scale = 1;
  let frames = 0;
  let acc = 0;
  let last = performance.now();
  return function govern() {
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (dt < 100) { acc += dt; frames += 1; } // ignore tab-switch outliers
    if (frames >= windowSize) {
      const avg = acc / frames;
      frames = 0;
      acc = 0;
      if (avg > slowMs && scale > minScale) {
        scale = Math.max(minScale, scale - stepDown);
        renderer.setPixelRatio(base * scale);
      } else if (avg < fastMs && scale < 1) {
        scale = Math.min(1, scale + stepUp);
        renderer.setPixelRatio(base * scale);
      }
    }
  };
}
