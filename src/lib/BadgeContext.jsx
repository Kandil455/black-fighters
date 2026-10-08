import React, { createContext, lazy, Suspense, useContext, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const BadgeUnlockModal = lazy(() => import("@/components/BadgeUnlockModal"));

const BadgeContext = createContext({ showBadge: () => {}, showBadges: () => {} });

export function BadgeProvider({ children }) {
  const showBadges = useCallback(() => {}, []);
  const showBadge = useCallback(() => {}, []);

  return (
    <BadgeContext.Provider value={{ showBadge, showBadges }}>
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => useContext(BadgeContext);

/**
 * Syncs the tiered badge ladder + milestone credit rewards once per profile
 * load: awards every ladder badge the user's counters qualify for, pays
 * freshly-crossed badge-count milestones, and celebrates unlocks.
 */
function BadgeSyncWatcher({ showBadges }) {
  const { profile, refreshProfile } = useAuth();
  const lastSyncRef = useRef(null);

  useEffect(() => {
    if (!profile?.id) return;
    const stamp = `${profile.id}:${profile.updated_date || ""}`;
    if (lastSyncRef.current === stamp) return;
    lastSyncRef.current = stamp;
    let cancelled = false;
    (async () => {
      try {
        const { syncBadgeLadder } = await import("@/lib/gamification");
        const { newBadges, creditsEarned } = await syncBadgeLadder(profile);
        if (cancelled) return;
        if (newBadges.length) showBadges(newBadges);
        if (creditsEarned > 0) toast.success(`🎁 مكافأة الإنجازات: +${creditsEarned} كريدت`);
        if ((newBadges.length || creditsEarned) > 0) await refreshProfile();
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.updated_date, showBadges, refreshProfile]);

  return null;
}
