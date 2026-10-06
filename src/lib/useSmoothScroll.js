import { useEffect, useRef } from "react";
import { damp } from "@/lib/motionMath";

/**
 * useSmoothScroll(enabled)
 *
 * Eased wheel/trackpad scrolling for the PAGE canvas only. Trackpads deliver
 * raw wheel deltas that land as instant jumps; this integrates them toward a
 * target with frame-rate-independent exponential damping (motionMath.damp —
 * identical feel at 60/120Hz) and parks the rAF loop when settled.
 *
 * GATES (all checked BEFORE preventDefault — when any gate fails the browser
 * scrolls natively and this hook costs nothing):
 *  - `enabled` false (Power Saver flips this off live in Layout) → native
 *  - prefers-reduced-motion → native (scroll smoothing IS motion)
 *  - ctrlKey (trackpad pinch-zoom) → native
 *  - |deltaX| ≥ |deltaY| (horizontal gestures / carousels) → native
 *  - the event target sits inside an inner scrollable container (sidebar menu,
 *    modal sheets) → native, so their scrolling is untouched
 *  - page shorter than the viewport → native (nothing to smooth)
 *
 * PERFORMANCE CONTRACT:
 *  - No React state. Refs + one self-parking rAF loop (the §2 pointer-effect
 *    pattern, applied to scroll).
 *  - window.scrollY / scrollHeight are read ONLY inside the loop while a
 *    glide is active (reads batched before writes, loop parked = zero cost at
 *    rest). The wheel handler itself only accumulates the target.
 *  - Tilt/spotlight rect caches stay correct: synthetic scrollTo fires real
 *    scroll events, so their capture-phase invalidation listeners still run.
 */

const SMOOTHING = 14;      // 1/s — tight: "glide" not "floaty lag"
const MAX_EVENT_DELTA = 140; // clamp a single wheel notch/inertia burst
const SETTLE_EPS = 0.5;    // px — close enough to snap & park

function normalizeDelta(e) {
  let v = e.deltaY;
  if (e.deltaMode === 1) v *= 16; // lines → px
  else if (e.deltaMode === 2) v *= window.innerHeight || 800; // pages → px
  return Math.max(-MAX_EVENT_DELTA, Math.min(MAX_EVENT_DELTA, v));
}

/**
 * Nearest ancestor with a scrollable overflow (auto/scroll) that actually
 * overflows. Wheel events aimed at such containers keep native scrolling —
 * this hook only ever owns the window/page canvas.
 */
function findScrollableAncestor(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node instanceof Element) {
      // No getComputedStyle here — a computed-style walk per wheel tick
      // forces style recalc in the hot path (§3). Scrollables that must keep
      // native scrolling declare it: the .scrollbar-none / .overscroll-contain
      // classes (the app's scroll containers) or an inline overflow style.
      const inline = node.style.overflowY;
      const cls = node.className;
      const hinted =
        (typeof cls === "string" &&
          (cls.includes("scrollbar-none") || cls.includes("overscroll-contain"))) ||
        inline === "auto" ||
        inline === "scroll";
      if (hinted && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

export function useSmoothScroll(enabled) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const state = { target: 0, active: false, raf: 0, last: 0, lastWritten: null };
    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const tick = (now) => {
      const st = state;
      const dt = st.last ? Math.min((now - st.last) / 1000, 0.032) : 0.016;
      st.last = now;

      const pos = window.scrollY; // single read, before any write
      // External scroll while gliding (route-change reset, scrollbar drag,
      // find-in-page, touch): the target is stale — abandon the glide
      // instead of yanking the view back to it.
      if (st.lastWritten != null && Math.abs(pos - st.lastWritten) > 60) {
        st.raf = 0; st.active = false; st.last = 0; st.lastWritten = null;
        return;
      }
      const next = damp(pos, st.target, SMOOTHING, dt);
      const clamped = Math.max(0, Math.min(maxScroll(), next));

      if (Math.abs(clamped - pos) >= 0.1) {
        window.scrollTo(0, clamped);
      }
      st.lastWritten = clamped;
      if (Math.abs(st.target - clamped) < SETTLE_EPS) {
        window.scrollTo(0, st.target); // snap exact, then park
        st.raf = 0; st.active = false; st.last = 0; st.lastWritten = null;
        return;
      }
      st.raf = requestAnimationFrame(tick);
    };

    const onWheel = (e) => {
      if (e.defaultPrevented || e.ctrlKey) return;      // pinch-zoom → native
      if (reduced?.matches) return;                     // a11y → native
      if (!enabledRef.current) return;                  // saver flip → native
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // horizontal → native
      if (findScrollableAncestor(e.target)) return;     // inner scroller → native
      const max = maxScroll();
      if (max <= 4) return;                             // page fits → native

      e.preventDefault();
      const st = state;
      const base = st.active ? st.target : window.scrollY;
      st.target = Math.max(0, Math.min(max, base + normalizeDelta(e)));
      st.active = true;
      if (!st.raf) {
        st.last = 0;
        st.lastWritten = null; // fresh glide — no stale write position
        st.raf = requestAnimationFrame(tick);
      }
    };

    const stop = () => {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0; state.active = false; state.last = 0; state.lastWritten = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", stop);
      stop();
    };
  }, [enabled]);
}

export default useSmoothScroll;
