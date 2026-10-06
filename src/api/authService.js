import { applyOwnerPrivileges } from "@/lib/permissions";
import { friendlyAuthError, RETRYABLE_AUTH_CODES } from "@/lib/authErrors";

const loadFirebase = () => import("@/lib/firebase");
const loadUsers = async () => (await import("@/lib/firestore")).Users;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAuthOperation(operation, fallback, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = RETRYABLE_AUTH_CODES.has(error?.code) && navigator.onLine && attempt < retries;
      if (!canRetry) throw friendlyAuthError(error, fallback);
      await wait(350 * (attempt + 1));
    }
  }
  throw friendlyAuthError(lastError, fallback);
}

const supabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

async function requestSupabase(path, body) {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) throw new Error("خدمة تأكيد البريد غير مهيأة");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || "تعذر إكمال تأكيد البريد");
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('خدمة كود التأكيد لا تستجيب');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const authService = {
  async me() {
    try {
      const [{ auth: firebaseAuth, isReady }, Users] = await Promise.all([
        loadFirebase(),
        loadUsers(),
      ]);
      if (!isReady || !firebaseAuth?.currentUser) return null;
      const profile = await Users.me();
      if (!profile) return null;
      return applyOwnerPrivileges({ ...profile, email: firebaseAuth.currentUser.email });
    } catch (error) {
      console.warn("auth.me failed:", error.message);
      return null;
    }
  },

  async updateMe(updates) {
    const Users = await loadUsers();
    return Users.updateMe(updates);
  },

  async loginWithProvider(providerName) {
    if (providerName !== "google") throw new Error("PROVIDER_NOT_SUPPORTED");
    const [{ signInWithPopup, signInWithRedirect }, { auth: firebaseAuth, googleProvider }] = await Promise.all([
      import("firebase/auth"),
      loadFirebase(),
    ]);

    const isCapacitor = typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || navigator.userAgent.includes('Capacitor'));
    if (isCapacitor) {
      await signInWithRedirect(firebaseAuth, googleProvider);
      return { redirect: true };
    }

    try {
      return await runAuthOperation(
        () => signInWithPopup(firebaseAuth, googleProvider),
        "تعذر تسجيل الدخول بحساب Google",
        1,
      );
    } catch (error) {
      if (!['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error?.code)) throw error;
      await signInWithRedirect(firebaseAuth, googleProvider);
      return { redirect: true };
    }
  },

  async loginViaEmailPassword(email, password) {
    const [{ signInWithEmailAndPassword }, { auth: firebaseAuth }] = await Promise.all([
      import("firebase/auth"),
      loadFirebase(),
    ]);
    return runAuthOperation(
      () => signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password),
      "تعذر تسجيل الدخول",
    );
  },

  async register({ email, password }) {
    const [{ createUserWithEmailAndPassword }, { auth: firebaseAuth }] = await Promise.all([
      import("firebase/auth"),
      loadFirebase(),
    ]);
    return runAuthOperation(
      () => createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password),
      "تعذر إنشاء الحساب",
    );
  },

  async sendVerificationEmail() {
    const [{ sendEmailVerification }, { auth: firebaseAuth }] = await Promise.all([
      import("firebase/auth"),
      loadFirebase(),
    ]);
    if (!firebaseAuth.currentUser) throw new Error("NO_AUTH_USER");
    return runAuthOperation(
      () => sendEmailVerification(firebaseAuth.currentUser, {
        url: `${window.location.origin}/login?verified=1`,
        handleCodeInApp: false,
      }),
      "تعذر إرسال رسالة التأكيد",
      1,
    );
  },

  async logoutSilently() {
    const [{ signOut }, { auth: firebaseAuth }] = await Promise.all([
      import("firebase/auth"),
      loadFirebase(),
    ]);
    return signOut(firebaseAuth);
  },

  requestSignupOtp(email) {
    return requestSupabase("otp", {
      email: email.trim().toLowerCase(),
      create_user: true,
    });
  },

  async verifyOtp({ email, otpCode }) {
    const data = await requestSupabase("verify", {
      email: email.trim().toLowerCase(),
      token: otpCode,
      type: "email",
    });
    if (!data.user) throw new Error("الكود غير صحيح أو انتهت صلاحيته");
    return data;
  },

  resendOtp(email) {
    return this.requestSignupOtp(email);
  },

  async resetPasswordRequest(email) {
    const [{ sendPasswordResetEmail }, { auth: firebaseAuth }] = await Promise.all([
      import("firebase/auth"),
      loadFirebase(),
    ]);
    return runAuthOperation(
      () => sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase()),
      "تعذر إرسال رابط استعادة كلمة المرور",
      1,
    );
  },

  async logout() {
    const { auth: firebaseAuth, isReady } = await loadFirebase();
    if (isReady) {
      const { signOut } = await import("firebase/auth");
      await signOut(firebaseAuth);
    }
    window.location.href = "/login";
  },
};
