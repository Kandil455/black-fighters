import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh gesture handler for mobile.
 * Triggers `onRefresh` when the user pulls down from the top of the page.
 *
 * Listeners are subscribed ONCE (stable effect): all cross-callback state
 * lives in refs. The previous version re-ran the effect — tearing down and
 * re-adding three window listeners — on EVERY touchmove tick, because
 * `pullDistance` was in the dependency array.
 */
export default function usePullToRefresh(onRefresh, { threshold = 70 } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0); // latest distance, readable from touchend
  const refreshingRef = useRef(false);
  // Latest callback without re-subscribing the listeners.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        // dampen the pull
        const d = Math.min(delta * 0.5, threshold + 30);
        pullRef.current = d;
        setPullDistance(d);
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const distance = pullRef.current;
      if (distance >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(threshold);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPullDistance(0);
        }
      } else {
        pullRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold]);

  return { pullDistance, refreshing };
}
