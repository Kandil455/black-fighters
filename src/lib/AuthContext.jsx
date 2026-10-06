import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { authService } from '@/api/authService';
import { applyTheme } from '@/lib/themes';
import { getOfflineSnapshot, setOfflineSnapshot } from '@/lib/offlineDb';
import { applyOwnerPrivileges, isOwnerEmail } from '@/lib/permissions';

const AuthContext = createContext(null);
const USE_SUPABASE_OTP = import.meta.env.VITE_SUPABASE_EMAIL_OTP === 'true';

function createBootstrapProfile(firebaseUser) {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    full_name: firebaseUser.displayName || 'Student',
    role: 'user',
    subscription_plan: 'free',
    subscription_status: 'inactive',
    credits: 0,
    token_balance: 0,
    app_theme: 'dark',
  };
}

const IS_LOCAL_TRIAL = Boolean(import.meta.env.DEV);

const LOCAL_TRIAL_PROFILE = applyOwnerPrivileges({
  id: "up3y6pub7IgB1PpEMTcMASO2ei33",
  email: "ibrahimkandil000@gmail.com",
  full_name: "Alpha ⚡ (نسخة تجريبية)",
  role: "admin",
  subscription_plan: "supreme",
  subscription_plan_key: "supreme",
  subscription_plan_name: "Supreme Commander (Local Trial)",
  subscription_status: "active",
  is_pro: true,
  premium_notified: true,
  credits: 999999,
  token_balance: 99999999,
  tokens_used: 0,
  credits_used: 0,
  streak_days: 30,
  current_streak: 30,
  longest_streak: 30,
  xp: 50000,
  total_xp: 50000,
  referral_code: "ALPHA777",
  referrals_count: 99,
  app_theme: "dark",
  is_locked: false,
});

function mergeWithLocalTrial(profileObj) {
  if (!IS_LOCAL_TRIAL) return applyOwnerPrivileges(profileObj);
  const base = applyOwnerPrivileges({
    ...LOCAL_TRIAL_PROFILE,
    ...(profileObj || {}),
    email: "ibrahimkandil000@gmail.com",
    role: "admin",
    subscription_plan: "supreme",
    subscription_status: "active",
    is_pro: true,
    premium_notified: true,
    is_locked: false,
  });
  base.credits = Math.max(Number(profileObj?.credits || 0), 999999);
  base.token_balance = Math.max(Number(profileObj?.token_balance || 0), 99999999);
  return base;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => (IS_LOCAL_TRIAL ? LOCAL_TRIAL_PROFILE : null));
  const [profile, setProfile] = useState(() => (IS_LOCAL_TRIAL ? LOCAL_TRIAL_PROFILE : null));
  const [isAuthenticated, setIsAuthenticated] = useState(() => IS_LOCAL_TRIAL);
  const [isLoadingAuth, setIsLoadingAuth] = useState(() => !IS_LOCAL_TRIAL);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(() => IS_LOCAL_TRIAL);

  const fetchProfile = useCallback(async ({ keepExistingSession = false } = {}) => {
    try {
      const me = await authService.me();
      if (me) {
        const privileged = mergeWithLocalTrial(me);
        await setOfflineSnapshot('auth:profile', privileged).catch(() => {});
        setUser(privileged);
        setProfile(privileged);
        setIsAuthenticated(true);
        applyTheme(privileged.app_theme || 'dark');
        return privileged;
      }
    } catch (e) {
      console.warn('fetchProfile failed:', e.message);
    }
    if (IS_LOCAL_TRIAL) {
      setUser((prev) => prev || LOCAL_TRIAL_PROFILE);
      setProfile((prev) => prev || LOCAL_TRIAL_PROFILE);
      setIsAuthenticated(true);
      return LOCAL_TRIAL_PROFILE;
    }
    if (!keepExistingSession) {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
    return null;
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    let mounted = true;
    const init = async () => {
      if (IS_LOCAL_TRIAL) {
        applyTheme(LOCAL_TRIAL_PROFILE.app_theme || 'dark');
        setUser((prev) => prev || LOCAL_TRIAL_PROFILE);
        setProfile((prev) => prev || LOCAL_TRIAL_PROFILE);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
      try {
        const fb = await import('@/lib/firebase');
        const firebaseAuth = fb.auth;
        const isReady = fb.isReady;
        if (!isReady || !firebaseAuth?.onAuthStateChanged) {
          if (mounted) { setIsLoadingAuth(false); setAuthChecked(true); }
          return;
        }

        unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
          if (!mounted) return;
          if (firebaseUser) {
            const bootstrap = IS_LOCAL_TRIAL
              ? mergeWithLocalTrial(createBootstrapProfile(firebaseUser))
              : createBootstrapProfile(firebaseUser);
            setUser(bootstrap);
            setProfile(bootstrap);
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            fetchProfile({ keepExistingSession: true });
            return;
          } else if (IS_LOCAL_TRIAL) {
            setUser(LOCAL_TRIAL_PROFILE);
            setProfile(LOCAL_TRIAL_PROFILE);
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          } else {
            setUser(null);
            setProfile(null);
            setIsAuthenticated(false);
            applyTheme('dark');
          }
          setIsLoadingAuth(false);
          setAuthChecked(true);
        });
      } catch (e) {
        console.warn('Auth init failed:', e.message);
        if (mounted) { setIsLoadingAuth(false); setAuthChecked(true); }
      }
    };
    init();
    return () => { mounted = false; try { unsubscribe(); } catch {} };
  }, [fetchProfile]);

  const login = async (email, password, nextUrl) => {
    setAuthError(null);
    try {
      await authService.loginViaEmailPassword(email, password);
      await fetchProfile();
      window.location.href = nextUrl || '/dashboard';
    } catch (err) {
      setAuthError(err);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const res = await authService.loginWithProvider('google');
      if (res && !res.redirect) {
        await fetchProfile();
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setAuthError(err);
      throw err;
    }
  };

  const register = async ({ email, password, fullName }) => {
    setAuthError(null);
    try {
      const cred = await authService.register({ email, password });
      try { await authService.sendVerificationEmail(); } catch {}
      try {
        const { updateProfile } = await import('firebase/auth');
        const fb2 = await import('@/lib/firebase');
        if (fb2.auth?.currentUser && fullName) await updateProfile(fb2.auth.currentUser, { displayName: fullName });
      } catch {}
      return { mode: 'link', credential: cred };
    } catch (err) { setAuthError(err); throw err; }
  };

  const verifyOtp = async (args = {}) => {
    const { email, otpCode } = args;
    if (import.meta.env.VITE_SUPABASE_EMAIL_OTP === 'true' && email && otpCode) {
      return authService.verifyOtp({ email, otpCode });
    }
    return true;
  };
  const resendOtp = async (email) => { if (email) return authService.resendOtp(email); };
  const resendVerificationLink = async () => {
    try { await authService.sendVerificationEmail(); return { sent: true }; }
    catch (e) { return { sent: false, error: e.message }; }
  };
  const logout = async () => {
    if (IS_LOCAL_TRIAL) {
      setUser(LOCAL_TRIAL_PROFILE);
      setProfile(LOCAL_TRIAL_PROFILE);
      setIsAuthenticated(true);
      window.location.href = '/dashboard';
      return;
    }
    try { await authService.logout(); } catch (e) { console.warn('logout failed:', e.message); }
    finally { setUser(null); setProfile(null); setIsAuthenticated(false); window.location.href = '/login'; }
  };
  const forgotPassword = async (email) => authService.resetPasswordRequest(email);

  const me = useCallback(async () => { if (profile) return profile; return (await fetchProfile()) || (IS_LOCAL_TRIAL ? LOCAL_TRIAL_PROFILE : null); }, [profile, fetchProfile]);
  const updateMe = useCallback(async (updates) => {
    const base = profile || (IS_LOCAL_TRIAL ? LOCAL_TRIAL_PROFILE : {});
    const updatedLocal = mergeWithLocalTrial({ ...base, ...updates });
    setUser(updatedLocal); setProfile(updatedLocal);
    if (updates.app_theme) applyTheme(updates.app_theme);
    try {
      const saved = await authService.updateMe(updates);
      const privileged = mergeWithLocalTrial(saved || updatedLocal);
      setUser(privileged); setProfile(privileged);
      await setOfflineSnapshot('auth:profile', privileged).catch(() => {});
      return privileged;
    } catch (e) { console.warn('updateMe remote failed:', e.message); return updatedLocal; }
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile({ keepExistingSession: true });
  }, [fetchProfile]);

  const navigateToLogin = useCallback((nextUrl) => {
    if (IS_LOCAL_TRIAL) {
      window.location.href = nextUrl || '/dashboard';
      return;
    }
    const target = nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login';
    window.location.href = target;
  }, []);
  const redirectToLogin = navigateToLogin;

  const adminPremium = useMemo(() => {
    const p = profile ? applyOwnerPrivileges(profile) : null;
    if (!p) return { isAdmin: false, isPremium: false };
    return {
      isAdmin: p.role === 'admin' || isOwnerEmail(p.email),
      isPremium: p.subscription_plan === 'premium' || p.subscription_status === 'active' || isOwnerEmail(p.email),
    };
  }, [profile]);
  const isAdmin = adminPremium.isAdmin;
  const isPremium = adminPremium.isPremium;

  const value = useMemo(() => ({
    user, profile, isAuthenticated, isLoadingAuth, authError, isAdmin, isPremium, authChecked,
    login, loginWithGoogle, register, verifyOtp, resendOtp, resendVerificationLink, logout, forgotPassword, navigateToLogin, redirectToLogin, me, updateMe, fetchProfile, refreshProfile,
  }), [user, profile, isAuthenticated, isLoadingAuth, authError, isAdmin, isPremium, authChecked]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
