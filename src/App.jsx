import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster as SonnerToaster } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import AppProviders from '@/app/AppProviders';
import AppRoutes from '@/app/AppRoutes';
import { lazyWithRetry } from '@/app/lazyWithRetry';
import ScrollToTop from '@/components/ScrollToTop';
import PWAUpdater from '@/components/PWAUpdater';
import OfflineManager from '@/components/OfflineManager';
import { initSecurityGuard } from '@/lib/securityGuard';
import { initReferralTracking } from '@/lib/referralService';
import RemoteLockOverlay from '@/components/RemoteLockOverlay';

const PremiumUpgradeModal = lazyWithRetry(() => import('@/components/PremiumUpgradeModal'));

function PremiumUpgradeHost() {
  const { profile } = useAuth();
  if (profile?.subscription_plan !== 'premium' || profile?.premium_notified === true) return null;
  return <Suspense fallback={null}><PremiumUpgradeModal /></Suspense>;
}

export default function App() {
  useEffect(() => {
    initSecurityGuard();
    initReferralTracking();
    const warmUp = () => {
      import('@/pages/Dashboard').catch(() => {});
      import('@/pages/Quizzes').catch(() => {});
      import('@/pages/Subscriptions').catch(() => {});
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) window.requestIdleCallback(warmUp);
    else setTimeout(warmUp, 1500);
  }, []);

  return (
    <AppProviders>
      <RemoteLockOverlay />
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <PWAUpdater />
        <OfflineManager />
        <PremiumUpgradeHost />
        <AppRoutes />
      </Router>
      <SonnerToaster theme="dark" position="bottom-center" richColors closeButton />
    </AppProviders>
  );
}
