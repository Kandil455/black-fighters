import React from "react";
import { Loader2, ArrowDown } from "lucide-react";
import usePullToRefresh from "@/hooks/usePullToRefresh";

/**
 * Wraps page content with a mobile pull-to-refresh indicator.
 * `onRefresh` should return a promise (e.g. queryClient.invalidateQueries).
 */
export default function PullToRefresh({ onRefresh, children }) {
  const { pullDistance, refreshing } = usePullToRefresh(onRefresh);
  const show = pullDistance > 0 || refreshing;

  return (
    <div className="relative">
      {show && (
        <div
          className="md:hidden absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
          style={{ top: Math.max(pullDistance - 36, 4) }}
        >
          <div className="glass-card border border-primary/30 rounded-full p-2 neon-glow-cyan">
            {refreshing ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <ArrowDown
                className="w-5 h-5 text-primary transition-transform"
                style={{ transform: `rotate(${Math.min(pullDistance * 2.5, 180)}deg)` }}
              />
            )}
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? "transform 0.2s" : "none" }}>
        {children}
      </div>
    </div>
  );
}