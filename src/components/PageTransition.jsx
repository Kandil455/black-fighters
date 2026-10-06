import React, { useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { playSwoosh } from "@/lib/sounds";
import PageLoader from "@/components/PageLoader";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Instant Zero-Jank Page Transition
 * Avoids parent transform containing-block issues and restores instant native scrolling.
 */
export default function PageTransition() {
  const location = useLocation();

  useEffect(() => {
    try {
      playSwoosh();
    } catch {}
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <div key={location.pathname} className="w-full">
          <Outlet />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}