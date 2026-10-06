/**
 * CardSpotlight.jsx — feature-grid card with a cursor-tracking radial glow.
 *
 * PERFORMANCE CONTRACT (same discipline as CinematicTiltCard):
 * - mousemove writes ZERO React state: it either computes the glow anchor
 *   from the cached rect and queues a CSS-custom-property write through
 *   frameScheduler.mutate(), or batches the (rare) rect re-measure through
 *   measure() first. React re-renders only on enter/leave/focus/blur.
 * - The glow position lives in --sx/--sy custom properties on the root, so
 *   the overlay's background string is serialized by the browser once, not
 *   by React on every move.
 */
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { measure, mutate } from "@/lib/frameScheduler";

function writeAnchor(div, rect, clientX, clientY) {
  const w = rect.width || 1;
  const h = rect.height || 1;
  const px = Math.min(Math.max(((clientX - rect.left) / w) * 100, 0), 100);
  const py = Math.min(Math.max(((clientY - rect.top) / h) * 100, 0), 100);
  mutate(() => {
    div.style.setProperty("--sx", `${px.toFixed(2)}%`);
    div.style.setProperty("--sy", `${py.toFixed(2)}%`);
  });
}

export function CardSpotlight({
  children,
  radius = 350,
  color = "rgba(0, 245, 255, 0.15)",
  className,
  ...props
}) {
  const divRef = useRef(null);
  const rectRef = useRef(null); // layout box cached per hover + on scroll invalidation
  const [active, setActive] = useState(false); // one render per enter/leave/focus/blur

  const handleMouseMove = (e) => {
    const div = divRef.current;
    if (!div) return;
    if (rectRef.current) {
      // Hot path: cached rect → straight to the batched write phase.
      writeAnchor(div, rectRef.current, e.clientX, e.clientY);
    } else {
      // Cold path: one batched read, then the write in the same frame.
      const { clientX, clientY } = e;
      measure(() => {
        const rect = div.getBoundingClientRect();
        rectRef.current = rect;
        writeAnchor(div, rect, clientX, clientY);
      });
    }
  };

  const handleFocus = () => setActive(true);
  const handleBlur = () => setActive(false);

  const handleMouseEnter = () => {
    // Batched layout read on enter (frameScheduler: reads before writes).
    measure(() => {
      rectRef.current = divRef.current?.getBoundingClientRect() || null;
    });
    setActive(true);
  };

  const handleMouseLeave = () => {
    rectRef.current = null; // next hover re-measures (layout may have changed)
    setActive(false);
  };

  // Scrolling while the glow is active invalidates the cached rect so the
  // glow keeps tracking the real cursor instead of drifting (agy §8.3).
  // §5 HARDENING (the 15-card scroll tax): rAF-throttled to one flag-set per
  // scroll frame — the old handler nulled the rect on EVERY scroll event,
  // so a scroll storm churned a closure per event × 14 sibling cards on the
  // Landing page. Never wakes anything: the next mousemove re-measures.
  useEffect(() => {
    if (!active) return;
    let queued = false;
    const invalidate = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; rectRef.current = null; });
    };
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", invalidate, { capture: true });
  }, [active]);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-3xl border border-white/10 bg-[#0a0b12] p-6 overflow-hidden transition-colors group",
        className
      )}
      {...props}
    >
      {/* Interactive Radial Spotlight — anchored by --sx/--sy on the root */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          contain: "paint",
          background: `radial-gradient(${radius}px circle at var(--sx, 50%) var(--sy, 50%), ${color}, transparent 80%)`,
        }}
      />
      {/* Subtle Dot Matrix Grid in Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
export default CardSpotlight;
