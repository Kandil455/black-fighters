/**
 * MagneticButton.jsx
 * Real magnetic attraction: the label drifts toward the cursor (damped,
 * frame-rate-independent — src/lib/motionMath) and springs back on leave.
 *
 * PERFORMANCE CONTRACT:
 * - pointermove writes coords into refs only; a single rAF loop (started on
 *   enter, self-parking when settled) writes one translate3d. ZERO React
 *   re-renders while the pointer moves.
 * - Structure: outer <div> = pointer target (no transition) → magnetic
 *   layer (JS translate) → scale layer (CSS hover/active scale). Three
 *   separate elements so no CSS transition ever re-interpolates the JS
 *   transform writes (the conflict that made tilt cards feel floaty).
 * - prefers-reduced-motion: renders as a plain inline-block wrapper.
 *
 * `strength` = fraction of the pointer's offset from center that the label
 * follows (0.3 default; 0.35 = strong pull).
 */
import React, { useEffect, useRef } from "react";
import { damp } from "@/lib/motionMath";

const SMOOTHING = 10; // 1/s exponential rate — higher = snappier
const EPS = 0.05; // px — close enough to park the loop

export default function MagneticButton({
  children,
  className = "",
  strength = 0.3,
  ...props
}) {
  const wrapRef = useRef(null);
  const magRef = useRef(null);
  const rectRef = useRef(null);
  const anim = useRef({
    x: 0, y: 0, tx: 0, ty: 0,
    raf: 0, last: 0, reduced: false,
  });

  useEffect(() => {
    anim.current.reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    return () => {
      if (anim.current.raf) cancelAnimationFrame(anim.current.raf);
      anim.current.raf = 0;
    };
  }, []);

  const tick = (now) => {
    const a = anim.current;
    const dt = a.last ? Math.min((now - a.last) / 1000, 0.032) : 0.016;
    a.last = now;
    a.x = damp(a.x, a.tx, SMOOTHING, dt);
    a.y = damp(a.y, a.ty, SMOOTHING, dt);

    const el = magRef.current;
    if (!el) { a.raf = 0; a.last = 0; return; }

    if (Math.abs(a.x - a.tx) < EPS && Math.abs(a.y - a.ty) < EPS) {
      // Settled (or returned home): snap exactly, park the loop.
      a.x = a.tx; a.y = a.ty;
      el.style.transform = a.tx === 0 && a.ty === 0 ? "" : `translate3d(${a.tx}px, ${a.ty}px, 0)`;
      a.raf = 0; a.last = 0;
      return;
    }
    el.style.transform = `translate3d(${a.x.toFixed(2)}px, ${a.y.toFixed(2)}px, 0)`;
    a.raf = requestAnimationFrame(tick);
  };

  const wake = () => {
    const a = anim.current;
    if (a.reduced || a.raf) return;
    a.last = 0;
    a.raf = requestAnimationFrame(tick);
  };

  const onEnter = (e) => {
    if (anim.current.reduced) return;
    // One batched read per enter; pointer path stays read-free.
    rectRef.current = wrapRef.current?.getBoundingClientRect() || null;
    onMove(e);
  };

  const onMove = (e) => {
    const a = anim.current;
    if (a.reduced) return;
    const rect = rectRef.current;
    if (!rect) return;
    a.tx = (e.clientX - (rect.left + rect.width / 2)) * strength;
    a.ty = (e.clientY - (rect.top + rect.height / 2)) * strength;
    wake();
  };

  const onLeave = () => {
    const a = anim.current;
    a.tx = 0; a.ty = 0;
    rectRef.current = null;
    wake(); // springs home, then parks
  };

  return (
    <div
      ref={wrapRef}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`inline-block ${className}`}
      {...props}
    >
      <div ref={magRef} className="inline-block will-change-[transform]">
        <div className="inline-block transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
          {children}
        </div>
      </div>
    </div>
  );
}
