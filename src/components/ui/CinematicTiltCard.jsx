/**
 * CinematicTiltCard.jsx
 * Premium glassmorphic tilt card with:
 * - Real spring-physics 3D perspective tilt (integrator in src/lib/motionMath)
 * - Cursor spotlight + specular edge gleam via CSS custom properties
 * - Smooth hover scale
 *
 * PERFORMANCE CONTRACT (this replaces a setState-per-mousemove design):
 * - pointermove only writes numbers into refs — ZERO React re-renders while
 *   the cursor moves (the old version re-rendered the whole card subtree,
 *   including MCQ content and Lottie icons, 60–120×/s).
 * - A single rAF loop (started on mouseenter, stopped when the spring
 *   settles) does one read (only when the cached rect was invalidated) and
 *   then all writes: one `style.transform` on the card + two custom-property
 *   writes (--mx/--my) that BOTH glow overlays inherit.
 * - Overlay opacity is CSS-transitioned and toggled once per enter/leave,
 *   never per frame.
 * - prefers-reduced-motion: no tilt, no loop — the card stays flat.
 */
import React, { useEffect, useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { measure } from "@/lib/frameScheduler";
import {
  damp,
  springStep,
  springIsSettled,
  computePointerTarget,
} from "@/lib/motionMath";

// Spring tuned to LEAD the cursor (stiffer than the visual weight suggests):
// on mid-range GPUs frame pacing adds 1–2 frames of latency, so the card must
// arrive slightly early — perceived as instant. The glow anchor glides behind
// via the @property transition in index.css (spring + glide = butter).
const TILT_SPRING = { stiffness: 460, damping: 30, mass: 0.7 };
const SCALE_SMOOTHING = 14; // 1/s exponential rate for the hover scale
const HOVER_SCALE = 1.018;

const ZERO_RECT = { left: 0, top: 0, width: 0, height: 0 };

const CinematicTiltCard = forwardRef(function CinematicTiltCard(
  {
    children,
    className = "",
    glowColor = "rgba(0, 245, 255, 0.18)",
    maxTilt = 10,
    ...props
  },
  forwardedRef
) {
  const internalRef = useRef(null);
  const cardRef = forwardedRef || internalRef;
  const rectRef = useRef(null); // layout box cached per hover + on scroll invalidation
  const anim = useRef({
    // pointer target (viewport px) — written by pointermove, read by the loop
    clientX: 0,
    clientY: 0,
    // animated state
    rotateX: 0,
    vRotateX: 0,
    rotateY: 0,
    vRotateY: 0,
    scale: 1,
    hovered: false,
    dirty: false,
    raf: 0,
    last: 0,
    reduced: false,
  });

  // ── the single rAF driver ────────────────────────────────────────────────
  // Read phase (only when invalidated) → integrate → write phase, all inside
  // one animation frame. This is the fastdom discipline: never interleave a
  // fresh layout read between writes.
  const tick = (now) => {
    const a = anim.current;
    const dt = a.last ? Math.min((now - a.last) / 1000, 0.032) : 0.016;
    a.last = now;

    const el = cardRef.current;
    if (!el) { a.raf = 0; a.last = 0; return; }

    if (!rectRef.current) {
      // Scroll invalidated the cached box (or first frame) — ONE layout read,
      // before any write in this frame.
      rectRef.current = el.getBoundingClientRect();
    }

    const target = computePointerTarget(
      a.clientX, a.clientY, rectRef.current || ZERO_RECT, maxTilt
    );

    // Integrate (semi-implicit Euler spring for tilt, exponential for scale).
    const rx = springStep(a.rotateX, a.vRotateX, target.rotateX, TILT_SPRING, dt);
    const ry = springStep(a.rotateY, a.vRotateY, target.rotateY, TILT_SPRING, dt);
    a.rotateX = rx.value; a.vRotateX = rx.velocity;
    a.rotateY = ry.value; a.vRotateY = ry.velocity;
    const nextScale = damp(a.scale, a.hovered ? HOVER_SCALE : 1, SCALE_SMOOTHING, dt);
    const scaleDone = Math.abs(nextScale - a.scale) < 0.0004;
    a.scale = nextScale;

    const tiltDone =
      springIsSettled(a.rotateX, a.vRotateX, target.rotateX, 0.0015) &&
      springIsSettled(a.rotateY, a.vRotateY, target.rotateY, 0.0015);
    const pointerIdle = !a.dirty;
    a.dirty = false;

    // Write phase — one transform string + two inherited custom properties.
    el.style.transform =
      `perspective(900px) rotateX(${a.rotateX.toFixed(3)}deg) ` +
      `rotateY(${a.rotateY.toFixed(3)}deg) scale(${a.scale.toFixed(4)})`;
    el.style.setProperty("--mx", `${target.px.toFixed(2)}%`);
    el.style.setProperty("--my", `${target.py.toFixed(2)}%`);

    if ((tiltDone && scaleDone && pointerIdle)) {
      a.raf = 0;
      a.last = 0;
      if (!a.hovered && tiltDone && scaleDone) {
        // Fully back at rest — drop the inline transform so the element keeps
        // no residual layer work between hovers.
        el.style.transform = "";
      }
      return;
    }
    a.raf = requestAnimationFrame(tick);
  };

  const wake = () => {
    const a = anim.current;
    if (a.reduced || a.raf) return;
    a.last = 0;
    a.raf = requestAnimationFrame(tick);
  };

  // prefers-reduced-motion: no tilt, no loop (matches preloader/Lottie policy).
  useEffect(() => {
    anim.current.reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    return () => {
      if (anim.current.raf) cancelAnimationFrame(anim.current.raf);
      anim.current.raf = 0;
    };
  }, []);

  // While hovered, scrolling invalidates the cached rect so the spotlight
  // keeps tracking the real cursor instead of drifting (agy §8.3).
  // §5 HARDENING (the 15-card scroll tax): the old handler invalidated AND
  // invoked the wake on EVERY scroll event — hovering a card while scrolling booted a
  // 60fps rAF that did a getBoundingClientRect() EVERY frame, and Landing
  // mounts 10 of these + 4 CardSpotlights with the same pattern (window-level
  // capture listeners each). Now: invalidation is rAF-throttled to one
  // flag-set per scroll frame and NEVER boots the loop — the next real
  // pointermove (which scroll-under-cursor implies) starts it again.
  const hovered = anim.current.hovered;
  useEffect(() => {
    if (!hovered) return;
    let queued = false;
    const invalidate = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        rectRef.current = null;
        anim.current.dirty = true; // flag only — the next pointermove re-measures
      });
    };
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", invalidate, { capture: true });
  }, [hovered]);

  const onMove = (e) => {
    const a = anim.current;
    if (a.reduced || !cardRef.current) return;
    a.clientX = e.clientX;
    a.clientY = e.clientY;
    a.dirty = true;
    wake();
  };

  const onEnter = (e) => {
    const a = anim.current;
    a.hovered = true;
    a.clientX = e.clientX;
    a.clientY = e.clientY;
    // Batched layout read on enter (frameScheduler: reads before writes).
    measure(() => {
      rectRef.current = cardRef.current?.getBoundingClientRect() || null;
    });
    wake(); // also triggers the hover-scale spring
    // Re-render once per enter for the border/shadow/opacity classes — never
    // per mousemove.
    forceRender();
  };

  const onLeave = () => {
    const a = anim.current;
    a.hovered = false;
    a.dirty = true;
    rectRef.current = null;
    wake(); // springs back to flat + scale 1, then the loop parks itself
    forceRender();
  };

  // Tiny render trigger used ONLY on enter/leave (2 renders per hover).
  // (eslint-plugin-react-hooks doesn't see the tick() ref write, hence the
  // disable — the pattern is intentional and performance-contract-tested.)
  const [, setTickState] = React.useState(0);
  const forceRender = () => setTickState((n) => n + 1);

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "relative rounded-3xl ios-glass-card border border-white/[0.08] overflow-hidden",
        hovered && "border-white/[0.2] shadow-[0_24px_60px_rgba(0,0,0,0.8)]",
        className
      )}
      {...props}
      /* ios-glass-card's `transition: transform .32s` re-interpolates every
         per-frame spring write — the floaty lag. Keep shadow/border fades,
         drop transform from the CSS transition (JS owns transform now). */
      style={{
        transition:
          "box-shadow 0.32s cubic-bezier(0.16,1,0.3,1), border-color 0.25s ease",
      }}
    >
      {/* ── Cursor glow spotlight (anchored by inherited --mx/--my) ──
          .tilt-glow carries the @property-registered --mx/--my transition
          (index.css): the BROWSER interpolates the gradient center, so the
          glow GLIDES behind the spring-tilted card instead of teleporting
          every frame — the butter feel the Landing card has. Browsers
          without @property degrade to instant follow. The gradient color
          still comes from --glow-color (set once per render below), so
          React never serializes a gradient string per frame. */}
      <div
        className="tilt-glow pointer-events-none absolute inset-0 z-10 rounded-3xl transition-opacity duration-400"
        style={{
          opacity: hovered ? 1 : 0,
          contain: "paint", // bound the gradient repaint to this overlay
          "--glow-color": glowColor,
        }}
      />

      {/* ── Specular border gleam (same @property glide) ── */}
      <div
        className="tilt-gleam pointer-events-none absolute inset-0 z-20 rounded-3xl transition-opacity duration-400"
        style={{ opacity: hovered ? 0.55 : 0, contain: "paint" }}
      />

      {/* ── Content (lifted in Z-space) ── */}
      <div
        className="relative z-30 h-full flex flex-col"
        style={{ transform: "translateZ(18px)", transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
});

export default CinematicTiltCard;
