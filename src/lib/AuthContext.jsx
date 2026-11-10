import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { authService } from '@/api/authService';
import { applyTheme } from '@/lib/themes';
import { getOfflineSnapshot, setOfflineSnapshot } from '@/lib/offlineDb';
import { applyOwnerPrivileges, isOwnerEmail } from '@/lib/permissions';

const AuthContext = createContext(null);
const USE_SUPABASE_OTP = import.meta.env.VITE_SUPABASE_EMAIL_OTP === 'true';

function createBootstrapProfile(firebaseUser) {
  return applyOwnerPrivileges({
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'طالب جامعي',
    role: 'user',
    subscription_plan: 'free',
    subscription_status: 'inactive',
    credits: 25,
    token_balance: 25000,
    app_theme: 'clinical',
  });
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchProfile = useCallback(async ({ keepExistingSession = false } = {}) => {
    try {
      const me = await authService.me();
      if (me) {
        const privileged = applyOwnerPrivileges(me);
        await setOfflineSnapshot('auth:profile', privileged).catch(() => {});
        setUser(privileged);
        setProfile(privileged);
        setIsAuthenticated(true);
        applyTheme(privileged.app_theme || 'clinical');
        return privileged;
      }
    } catch (e) {
      console.warn('fetchProfile failed:', e.message);
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
            const bootstrap = createBootstrapProfile(firebaseUser);
            setUser(bootstrap);
            setProfile(bootstrap);
            setIsAuthenticated(true);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            fetchProfile({ keepExistingSession: true });
            return;
          } else {
            setUser(null);
            setProfile(null);
            setIsAuthenticated(false);
            applyTheme('clinical');
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

  const loginWithTelegram = async (telegramPayload) => {
    setAuthError(null);
    try {
      await authService.loginWithTelegram(telegramPayload);
      await fetchProfile();
      window.location.href = '/dashboard';
    } catch (err) {
      setAuthError(err);
      throw err;
    }
  };

  const register = async ({ email, password, fullName }) => {
    setAuthError(null);
    try {
      // OTP-first: request a 6-digit code; the Firebase account itself is
      // created server-side ONLY after the code verifies — no ghost accounts
      // with faked inboxes.
      await authService.requestEmailOtp(email, fullName);
      return { mode: "otp" };
    } catch (err) {
      // Graceful degradation while the mail provider key isn't provisioned
      // yet: fall back to the classic Firebase link-verification flow.
      if (err?.code === "MAIL_NOT_CONFIGURED" || String(err?.message || "").includes("MAIL_NOT_CONFIGURED")) {
        console.warn("[register] OTP mailer unavailable — legacy link flow engaged");
        const cred = await authService.register({ email, password });
        try { await authService.sendVerificationEmail(); } catch {}
        try {
          const { updateProfile } = await import('firebase/auth');
          const fb2 = await import('@/lib/firebase');
          if (fb2.auth?.currentUser && fullName) await updateProfile(fb2.auth.currentUser, { displayName: fullName });
        } catch {}
        return { mode: 'link', credential: cred };
      }
      setAuthError(err);
      throw err;
    }
  };

  const verifyOtp = async (args = {}) => {
    const { email, otpCode, password, fullName } = args;
    if (!email || !otpCode) return true;
    return authService.verifyEmailOtpAndRegister({ email, code: otpCode, password, fullName });
  };
  const resendOtp = async (email) => { if (email) return authService.resendOtp(email); };
  const resendVerificationLink = async () => {
    try { await authService.sendVerificationEmail(); return { sent: true }; }
    catch (e) { return { sent: false, error: e.message }; }
  };
  const logout = async () => {
    try { await authService.logout(); } catch (e) { console.warn('logout failed:', e.message); }
    finally { setUser(null); setProfile(null); setIsAuthenticated(false); window.location.href = '/login'; }
  };
  const forgotPassword = async (email) => authService.resetPasswordRequest(email);

  const me = useCallback(async () => { if (profile) return profile; return await fetchProfile(); }, [profile, fetchProfile]);
  const updateMe = useCallback(async (updates) => {
    const base = profile || {};
    const updatedLocal = applyOwnerPrivileges({ ...base, ...updates });
    setUser(updatedLocal); setProfile(updatedLocal);
    if (updates.app_theme) applyTheme(updates.app_theme);
    try {
      const saved = await authService.updateMe(updates);
      const privileged = applyOwnerPrivileges(saved || updatedLocal);
      setUser(privileged); setProfile(privileged);
      await setOfflineSnapshot('auth:profile', privileged).catch(() => {});
      return privileged;
    } catch (e) { console.warn('updateMe remote failed:', e.message); return updatedLocal; }
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile({ keepExistingSession: true });
  }, [fetchProfile]);

  const patchProfile = useCallback((patchOrFn) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
      if (!patch || typeof patch !== "object") return prev;
      const next = { ...prev, ...patch };
      setUser(next);
      setOfflineSnapshot("auth:profile", next).catch(() => {});
      return next;
    });
  }, []);

  const navigateToLogin = useCallback((nextUrl) => {
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
    login, loginWithGoogle, loginWithTelegram, register, verifyOtp, resendOtp, resendVerificationLink, logout, forgotPassword, navigateToLogin, redirectToLogin, me, updateMe, fetchProfile, refreshProfile, patchProfile,
  }), [user, profile, isAuthenticated, isLoadingAuth, authError, isAdmin, isPremium, authChecked, patchProfile]);

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
