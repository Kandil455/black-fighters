/**
 * api/index.js — Resilient API layer
 * Falls back gracefully when Firebase is unavailable
 */
import { auth as firebaseAuth, isReady } from '@/lib/firebase';
import {
  Users, UserSettings, AdminConfig, Courses, GeneratedContent,
  QuizResults, ReviewCards, CourseNotes, StudyActivity, CourseReminders,
  PaymentRequests, ActivationCodes, CreditTransactions, Enrollments, Notifications,
  Friendships, DirectMessages, GroupMessages, GroupQuizSessions, StudyGroups,
  Challenges, StandaloneQuizzes, QuizAttempts, Questions, Lessons, AssistantConversations, FlaggedQuestions
} from '@/lib/firestore';
import { applyOwnerPrivileges } from '@/lib/permissions';
import { uploadFile } from '@/lib/storage';
import { PLANS, planCredits, planPrice } from '@/lib/plans';
import { canUserAccessModel, getModelTier, TIER_INFO } from '@/lib/models';
import { AVATAR_FRAMES, ORBIT_EFFECTS, PROFILE_BANNERS, PROFILE_TITLES } from '@/lib/avatars';
import { MASCOT_SKINS } from '@/lib/mascotSkins';
import { invokeSecureFunction } from '@/lib/secureFunctions';
import { calculateSummaryCost, getPurchasableProduct } from '@/lib/economyCatalog';
import { db } from '@/lib/firebaseDb';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ─── AUTH ──────────────────────────────────────────────────────────────────
export const auth = {
  me: async () => {
    try {
      if (!isReady || !firebaseAuth) {
        return { id: 'guest', email: 'guest@example.com', full_name: 'زائر', role: 'user', subscription_plan: 'free' };
      }
      const doc = await Users.me();
      if (!doc || !firebaseAuth.currentUser) return null;
      return applyOwnerPrivileges({ ...doc, email: firebaseAuth.currentUser.email });
    } catch (e) {
      console.warn('auth.me failed:', e.message);
      return null;
    }
  },
  updateMe: (updates) => Users.updateMe(updates),
  loginWithProvider: async (providerName) => {
    if (providerName === 'google') {
      const { signInWithPopup } = await import('firebase/auth');
      const { googleProvider } = await import('@/lib/firebase');
      return signInWithPopup(firebaseAuth, googleProvider);
    }
  },
  loginViaEmailPassword: async (email, password) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return signInWithEmailAndPassword(firebaseAuth, email, password);
  },
  register: async ({ email, password }) => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    return createUserWithEmailAndPassword(firebaseAuth, email, password);
  },
  sendVerificationEmail: async () => {
    const { sendEmailVerification } = await import('firebase/auth');
    if (!firebaseAuth.currentUser) throw new Error('NO_AUTH_USER');
    return sendEmailVerification(firebaseAuth.currentUser, {
      url: `${window.location.origin}/login?verified=1`,
      handleCodeInApp: false,
    });
  },
  logoutSilently: async () => {
    const { signOut } = await import('firebase/auth');
    return signOut(firebaseAuth);
  },
  requestSignupOtp: async (email) => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error('خدمة تأكيد البريد غير مهيأة');
    const response = await fetch(`${url}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: true }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.msg || body.message || 'تعذر إرسال كود التأكيد');
    }
    return true;
  },
  verifyOtp: async ({ email, otpCode }) => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error('خدمة تأكيد البريد غير مهيأة');
    const response = await fetch(`${url}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), token: otpCode, type: 'email' }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.user) throw new Error(body.msg || body.message || 'الكود غير صحيح أو انتهت صلاحيته');
    return body;
  },
  resendOtp: async (email) => {
    return auth.requestSignupOtp(email);
  },
  resetPasswordRequest: async (email) => {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    return sendPasswordResetEmail(firebaseAuth, email);
  },
  isAuthenticated: async () => {
    if (!firebaseAuth) return false;
    await firebaseAuth.authStateReady();
    return !!firebaseAuth.currentUser;
  },
  logout: async () => {
    if (!isReady) { window.location.href = '/login'; return; }
    const { signOut } = await import('firebase/auth');
    await signOut(firebaseAuth);
    window.location.href = '/login';
  },
  redirectToLogin: () => { window.location.href = '/login'; },
  setToken: () => {},
};

// ─── ENTITY ADAPTERS ──────────────────────────────────────────────────────
function makeCourseEntity() {
  return {
    filter: (q) => Courses.list(q),
    get:    (id) => Courses.get(id),
    create: (payload) => Courses.create(payload),
    update: (id, payload) => Courses.update(id, payload),
    delete: (id) => Courses.delete(id),
  };
}

function makeSimpleEntity(module) {
  return {
    filter: async (query = {}) => {
      if (module.list) return module.list(query.course_id || undefined);
      return [];
    },
    get: (id) => module.get ? module.get(id) : Promise.resolve(null),
    create: (payload) => module.create(payload),
    update: (id, payload) => module.update(id, payload),
    delete: (id) => module.delete(id),
  };
}

/**
 * True only when the server was unreachable or returned a 5xx — i.e. cases where
 * retrying the work in the browser can legitimately succeed.
 *
 * A 4xx (401/403/400) or a business error means the server *did* answer, so the
 * client must surface that answer instead of re-running the mutation locally.
 * The previous "fall back on any error" behaviour hid real failures behind
 * unrelated permission errors.
 */
function isTransportFailure(error) {
  if (error?.isTransport) return true;
  const status = Number(error?.status);
  if (Number.isFinite(status) && status >= 500) return true;
  const message = String(error?.message || "");
  return /Failed to fetch|NetworkError|Load failed|ERR_NETWORK|تعذر الوصول للسيرفر/i.test(message);
}

const mapEntity = (store) => ({
  list: (sortOrder, max) => store.filter({}, sortOrder, max),
  filter: (filters, sortOrder, max) => store.filter(filters, sortOrder, max),
  get: (id) => store.get(id),
  create: (payload) => store.create(payload),
  update: async (id, payload) => {
    const res = await store.update(id, payload);
    return res || { id, ...payload };
  },
  delete: (id) => store.delete(id),
  subscribe: (callback, id) => store.subscribe ? store.subscribe(callback, id) : () => {},
});

export const entities = {
  Course: makeCourseEntity(),

  GeneratedContent: {
    _normalize: (doc) => doc ? ({
      ...doc, content_type: doc.content_type || doc.type, content: doc.content || doc.data,
      type: doc.content_type || doc.type, data: doc.content || doc.data,
    }) : null,
    filter: async (q = {}) => {
      if (q.course_id && q.content_type) {
        const result = await GeneratedContent.get(q.course_id, q.content_type);
        return result ? [entities.GeneratedContent._normalize(result)] : [];
      }
      if (q.course_id) return (await GeneratedContent.list(q.course_id)).map(entities.GeneratedContent._normalize);
      return [];
    },
    get: async (courseId, type) => entities.GeneratedContent._normalize(await GeneratedContent.get(courseId, type)),
    create: (payload) => GeneratedContent.set(payload.course_id, payload.content_type || payload.type, payload.content || payload.data, payload.language, payload.metadata),
    update: (id, payload) => GeneratedContent.set(payload.course_id, payload.content_type || payload.type, payload.content || payload.data, payload.language, payload.metadata),
    delete: (id) => Promise.resolve(),
    upsert: (payload) => GeneratedContent.set(payload.course_id, payload.content_type || payload.type, payload.content || payload.data, payload.language, payload.metadata),
  },

  CourseNote: makeSimpleEntity(CourseNotes),

  QuizResult: {
    filter: () => QuizResults.list(),
    get: () => Promise.resolve(null),
    create: (payload) => QuizResults.create(payload),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  },

  ReviewCard: {
    ...makeSimpleEntity(ReviewCards),
    filter: async (q = {}) => {
      if (q.due_only) return ReviewCards.listDue();
      if (q.course_id) return ReviewCards.listByCourse(q.course_id);
      return ReviewCards.listDue();
    },
  },

  StudyActivity: {
    filter: () => StudyActivity.list(),
    get: () => Promise.resolve(null),
    create: (payload) => StudyActivity.record({
      minutes: payload.metadata?.minutes || 0, questions: payload.metadata?.questions || 0,
      courseId: payload.course_id, activityType: payload.activity_type || 'study_session', xpEarned: payload.xp_earned || 0,
    }),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  },

  CourseReminder: makeSimpleEntity(CourseReminders),

  UserSettings: {
    filter: async () => { const s = await UserSettings.get(); return s ? [s] : []; },
    get: () => UserSettings.get(),
    create: (payload) => UserSettings.set(payload),
    update: (id, payload) => UserSettings.set(payload),
    delete: () => UserSettings.delete(),
    upsert: (payload) => UserSettings.set(payload),
  },

  AdminConfig: {
    filter: async () => AdminConfig.getAll(),
    get: (id) => AdminConfig.get(id),
    create: (payload) => AdminConfig.set(payload.provider || 'default', payload),
    update: (id, payload) => AdminConfig.set(id, payload),
    delete: (id) => AdminConfig.delete(id),
    upsert: (payload) => AdminConfig.set(payload.provider || 'default', payload),
  },

  User: {
    list: () => Users.getAll(),
    // Accepts (filters, sortOrder, maxResults) like every other entity store.
    // It previously took `filters` ONLY, so `entities.User.filter({}, "-total_xp", 100)`
    // silently dropped the sort and the limit and fell through to `Users.getAll()`
    // — an unbounded scan of every user document, sorted in memory.
    filter: async (filters = {}, sortOrder = null, maxResults = null) => {
      if (filters?.id?.$in && Array.isArray(filters.id.$in)) {
        // One bounded `documentId() in` query instead of N sequential getDoc calls.
        return Users.getMany(filters.id.$in);
      }
      if (filters?.id && typeof filters.id === 'string') {
        const single = await Users.get(filters.id);
        return single ? [single] : [];
      }
      if (filters?.friend_id && typeof filters.friend_id === 'string' && db) {
        try {
          const targetFid = filters.friend_id.trim().toUpperCase();
          const snap = await getDocs(query(collection(db, 'users'), where('friend_id', '==', targetFid)));
          if (!snap.empty) {
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        } catch (e) {
          console.warn("Direct friend_id query error:", e);
        }
      }
      if (filters?.email && typeof filters.email === 'string' && db) {
        try {
          const snap = await getDocs(query(collection(db, 'users'), where('email', '==', filters.email.trim())));
          if (!snap.empty) {
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        } catch (e) {
          console.warn("Direct email query error:", e);
        }
      }
      // Delegate to the store, which honours sortOrder + maxResults (bounded,
      // server-ordered) instead of reading the whole collection and sorting here.
      const all = await Users.filter(filters, sortOrder, maxResults);
      if (!filters || Object.keys(filters).length === 0) return all;
      return all.filter((u) => {
        for (const [key, val] of Object.entries(filters)) {
          if (key === 'id') continue;
          if (val === undefined || val === null) continue;
          if (typeof val === 'object' && val.$in) {
            if (!val.$in.includes(u[key])) return false;
          } else if (typeof val === 'object' && val.$all) {
            if (!Array.isArray(u[key]) || !val.$all.every((item) => u[key].includes(item))) return false;
          } else {
            const uVal = String(u[key] || '').trim();
            const qVal = String(val || '').trim();
            if (key === 'friend_id' || key === 'email') {
              if (uVal.toUpperCase() !== qVal.toUpperCase()) return false;
            } else if (u[key] !== val) {
              return false;
            }
          }
        }
        return true;
      });
    },
    get: (id) => Users.get(id),
    create: (payload) => Users.create(payload),
    update: (id, payload) => Users.update(id, payload),
    delete: () => Promise.resolve(),
  },

  PaymentRequest: mapEntity(PaymentRequests),
  ActivationCode: mapEntity(ActivationCodes),
  CreditTransaction: mapEntity(CreditTransactions),
  Enrollment: mapEntity(Enrollments),
  Notification: mapEntity(Notifications),
  Friendship: mapEntity(Friendships),
  DirectMessage: mapEntity(DirectMessages),
  GroupMessage: mapEntity(GroupMessages),
  GroupQuizSession: mapEntity(GroupQuizSessions),
  StudyGroup: {
    ...mapEntity(StudyGroups),
    listForUser: (userId, max) => StudyGroups.listForUser(userId, max),
  },
  Challenge: mapEntity(Challenges),
  StandaloneQuiz: mapEntity(StandaloneQuizzes),
  QuizAttempt: mapEntity(QuizAttempts),
  Question: mapEntity(Questions),
  Lesson: mapEntity(Lessons),
  // Was referenced by FlagQuestionModal + the admin review tab but never defined,
  // so student reports vanished silently.
  FlaggedQuestion: mapEntity(FlaggedQuestions),
  AssistantConversation: mapEntity(AssistantConversations),
};

// ─── FUNCTIONS ─────────────────────────────────────────────────────────────
// Keep the AI SDK out of the login/dashboard startup bundle. It is loaded only
// when the user actually runs an AI action.
const DEFAULT_MODELS = {
  groq:       'openai/gpt-oss-120b',
  gemini:     'gemini-3.5-flash-lite',
  codecraft:  'claude-sonnet-5',
  openrouter: 'openrouter/free',
};

// SECURITY: no hardcoded provider keys in client code. Client-side AI is for BYO-key users
// (their own UserSettings key or AdminConfig); everyone else goes through /api/ai server-side.
const DEFAULT_GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/**
 * AI config priority:
 * 1. User's personal key (UserSettings) — if they set their own key
 * 2. Admin's active config (AdminConfig collection — multi-provider)
 * 3. Environment Variables (VITE_GROQ_API_KEY / VITE_GEMINI_API_KEY)
 * 4. Ultra-Fast Platform default: Groq LPU (~700ms response time)
 */
export async function getAiConfig() {
  try {
    // 1️⃣ User's own key (premium users can set their own)
    const userSettings = await UserSettings.get().catch(() => null);
    if (userSettings?.api_key && !userSettings.api_key.includes("•")) {
      const p = userSettings.provider || "groq";
      return {
        provider: p,
        api_key:  userSettings.api_key,
        model:    userSettings.model || DEFAULT_MODELS[p] || "openai/gpt-oss-120b",
      };
    }
  } catch {}

  try {
    // 2️⃣ Admin active configs
    const configs = await AdminConfig.getAll().catch(() => []);
    const activeConfig = configs.find(c => c.is_active) || configs.find(c => c.id === 'default');
    
    if (activeConfig?.api_key && !String(activeConfig.api_key).includes("•")) {
      const p = activeConfig.provider || "groq";
      return {
        provider: p,
        api_key:  activeConfig.api_key,
        model:    activeConfig.model || DEFAULT_MODELS[p] || "openai/gpt-oss-120b",
      };
    }
  } catch {}

  // 3️⃣ Client-accessible Environment Variables Fallback (Fastest first)
  const viteEnv = import.meta.env || {};
  if (viteEnv.VITE_GROQ_API_KEY) {
    return { provider: "groq", api_key: viteEnv.VITE_GROQ_API_KEY, model: "openai/gpt-oss-120b" };
  }
  if (viteEnv.VITE_GEMINI_API_KEY) {
    return { provider: "gemini", api_key: viteEnv.VITE_GEMINI_API_KEY, model: "gemini-3.5-flash-lite" };
  }
  if (viteEnv.VITE_APMIX_KEY) {
    return { provider: "apmix", api_key: viteEnv.VITE_APMIX_KEY, model: "claude-sonnet-4-6-free" };
  }
  if (viteEnv.VITE_OPENROUTER_API_KEY) {
    return { provider: "openrouter", api_key: viteEnv.VITE_OPENROUTER_API_KEY, model: "openrouter/free" };
  }

  // 4️⃣ Ultra-Fast Platform Flagship Default: Groq (sub-second response ~700ms)
  return {
    provider: "groq",
    api_key:  DEFAULT_GROQ_KEY,
    model:    "openai/gpt-oss-120b",
  };
}


export const functions = {
  invoke: async (name, payload = {}, _options = {}) => {
    const secureCalls = {
      submitPayment: ["submit-payment", payload],
      purchaseCosmetic: ["purchase-cosmetic", payload],
      redeemActivationCode: ["redeem-code", payload],
      // Admin-only, and `activationCodes` is `allow write: if false` in the rules
      // (correctly — codes are value-bearing). Without this entry the call fell
      // through to a client-side addDoc and the admin saw "Missing or
      // insufficient permissions." while the Admin-SDK function sat unused.
      generateActivationCodes: ["generate-activation-codes", payload],
      chargeAiJob: ["charge-ai-job", {
        ...payload,
        jobKey: payload.jobKey || `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      }],
      exportToTelegram: ["export-to-telegram", payload],
      dailyLoginReward: ["economy-actions", { ...payload, action: "dailyLoginReward" }],
      mascotDailyReward: ["economy-actions", { ...payload, action: "mascotDailyReward" }],
      approvePaymentRequest: ["admin-payment-action", {
        requestId: payload.request_id || payload.id,
        action: payload.action || "approve",
        deliveryMode: payload.delivery_mode || payload.deliveryMode || "direct",
        adminNote: payload.admin_note || payload.adminNote || "",
      }],
    };
    // Secure server calls run in ALL environments — the dev server serves the
    // same functions via the dev-api middleware, so credits are always atomic server-side.
    if (secureCalls[name]) {
      const [endpoint, body] = secureCalls[name];
      // A *rejected* server call (401/403/400, a business rule like
      // "تمت مراجعة الطلب من قبل", or a permissions problem) must surface as-is:
      // silently retrying it client-side wrote straight into server-only
      // collections and replaced the real reason with "Missing or insufficient
      // permissions." Only genuine transport/5xx failures may fall back.
      try {
        return await invokeSecureFunction(endpoint, body);
      } catch (secErr) {
        if (!isTransportFailure(secErr)) throw secErr;
        console.warn(`[API] Serverless call "${endpoint}" unreachable, falling back to client logic:`, secErr.message);
      }
    }
    // Heavy AI runs on the server (credit metering + provider keys never reach the client).
    const SERVER_AI_FNS = ["courseAssistant", "aiGenerate", "generateStudyContent", "generateText"];
    if (SERVER_AI_FNS.includes(name)) {
      try {
        const response = await invokeSecureFunction("ai", { name, payload });
        return name === "generateText" ? response.data.text : response;
      } catch (secErr) {
        console.warn("[API] Serverless AI call failed, falling back to client-side router:", secErr.message);
      }
    }
    const ALL_AI_FNS = ["aiChat", ...SERVER_AI_FNS];
    let aiConfig = null;
    let ai = null;

    if (ALL_AI_FNS.includes(name)) {
      [aiConfig, ai] = await Promise.all([getAiConfig(), import('@/lib/ai')]);
      // aiChat must NOT hard-throw without a BYO key: it falls through to the
      // ai.js server-proxy branch below (free users have no local key).
      if (!aiConfig.api_key && name !== "aiChat") throw new Error("NO_API_KEY");
    }

    try {
      switch (name) {
        case "exportToTelegram": {
          // Server-only (telegram-webhook / export-to-telegram).
          // This client fallback used to import @/services/telegramBot, which both
          // shipped the server module into the browser bundle and could never work
          // there (no token → NO_BOT_TOKEN). Telegram delivery is a server concern:
          // report the actionable state instead of pretending to send.
          const u = await Users.me();
          if (!u) throw new Error("سجل دخولك أولاً لتصدير المحتوى");
          if (!u.telegram_chat_id) {
            return {
              data: {
                success: false,
                error: "NO_TELEGRAM_LINKED",
                message: "حسابك غير مربوط بالتيليجرام! اربطه من الإعدادات ← ربط تيليجرام 🤖",
              },
            };
          }
          throw new Error("تعذر الوصول للسيرفر — حاول تاني بعد لحظات");
        }

        case "submitPayment": {
          const u = await Users.me();
          const product = getPurchasableProduct(payload);
          if (!u || !product) throw new Error("المنتج غير صالح");
          const cleanedSender = String(payload.senderNumber || "").replace(/\D/g, "");
          if (!/^01\d{9}$/.test(cleanedSender)) {
            throw new Error("رقم الهاتف المحول منه غير صالح، يجب أن يتكون من 11 رقماً ويبدأ بـ 01");
          }
          const created = await PaymentRequests.create({
            user_id: u.id, user_name: u.full_name || "", user_email: u.email || "",
            product_type: product.productType, product_key: payload.productKey,
            plan_key: product.productType === "subscription" ? payload.productKey : "",
            plan_name: product.name, billing_cycle: payload.billing || "monthly",
            duration_days: product.durationDays || 0, credits: product.credits || product.grantedCredits || 0,
            amount: product.amount, method: payload.method, sender_number: cleanedSender,
            screenshot_url: payload.screenshotUrl, note: payload.note || "", status: "pending",
            idempotency_key: payload.idempotencyKey,
          });

          // 1) Telegram alert to Alpha is sent server-side by /api/submit-payment.
          //    (The client copy that lived here imported @/services/telegramBot —
          //    server code in the browser bundle with no reachable token.)

          // 2) Send In-App Notification directly to Alpha / Admin
          try {
            const admins = await Users.filter({ role: "admin" }, null, 5).catch(() => []);
            const adminIds = new Set(admins.map(a => a.id));
            const ownerUsers = await Users.filter({ email: "ibrahimkandil000@gmail.com" }, null, 1).catch(() => []);
            if (ownerUsers?.length) adminIds.add(ownerUsers[0].id);

            for (const adminId of adminIds) {
              await Notifications.create({
                user_id: adminId,
                type: "payment",
                title: `💰 طلب اشتراك جديد: ${product.name}`,
                body: `قام ${u.full_name || u.email || "طالب"} بطلب باقة ${product.name} بمبلغ ${product.amount} ج عبر ${payload.method}. اضغط لمراجعته.`,
                icon: "👑",
                link: "/admin",
                read: false,
                dedupe_key: `pay-alert-${created.id}`,
              }).catch(() => {});
            }
          } catch (notifErr) {
            console.warn("[Notifications] In-app notification creation failed:", notifErr);
          }

          return { data: { success: true, id: created.id, amount: product.amount } };
        }

        case "chargeAiJob": {
          const u = await Users.me();
          if (!u) throw new Error("سجّل دخولك أولاً");

          const userPlan = (u.subscription_plan || "free").toLowerCase();
          const isAdmin = u.role === "admin" || u.email === "ibrahimkandil000@gmail.com";

          // Enforce Free Tier Daily limit: exactly 2 files/operations per day.
          // Subscribed/Premium users are completely UNLIMITED (no daily limit).
          if (!isAdmin && userPlan === "free" && payload.action !== "refund" && payload.action !== "finalize") {
            const today = new Date().toISOString().slice(0, 10);
            const opsKey = `zeta_daily_ai_ops_${u.id}_${today}`;
            const currentOps = Number(localStorage.getItem(opsKey) || 0);
            const limit = u.daily_file_limit !== undefined && u.daily_file_limit !== null ? Number(u.daily_file_limit) : 2;

            if (limit > 0 && currentOps >= limit) {
              throw new Error(`وصلت للحد اليومي للباقة المجانية (${limit} ملفات فقط يومياً). اشترك في باقات Black Fighters للحصول على وصول غير محدود (Unlimited)!`);
            }
          }

          const quoted = payload.task === "quiz"
            ? Math.max(1, Math.ceil((Number(payload.questionCount) || 10) / 5))
            : payload.task === "flashcards"
              ? Math.max(1, Math.min(10, Math.ceil((Number(payload.charCount) || 1) / 40_000)))
              : calculateSummaryCost(payload.charCount || 0);
          const cost = Number(payload.cost ?? payload.amount) || quoted;

          if (payload.action === "refund") {
            const refundedCredits = Math.round((Number(u.credits || 0) + cost) * 10) / 10;
            await Users.updateMe({ credits: refundedCredits });
            return { data: { success: true, cost, credits: refundedCredits, status: "refunded" } };
          }
          if (payload.action === "finalize") {
            if (!isAdmin && userPlan === "free") {
              const today = new Date().toISOString().slice(0, 10);
              const opsKey = `zeta_daily_ai_ops_${u.id}_${today}`;
              const currentOps = Number(localStorage.getItem(opsKey) || 0);
              localStorage.setItem(opsKey, String(currentOps + 1));
            }
            return { data: { success: true, cost, credits: Number(u.credits || 0), status: "completed" } };
          }

          // Deduct credits for all operations based on catalog pricing
          if (!isAdmin && Number(u.credits || 0) < cost) {
            throw new Error(`رصيدك غير كافي — محتاج ${cost} كريدت`);
          }

          const currentCredits = Number(u.credits || 0);
          const newCredits = Math.max(0, Math.round((currentCredits - cost) * 10) / 10);
          await Users.updateMe({ credits: newCredits });
          return { data: { success: true, cost, credits: newCredits, status: "charged" } };
        }

        // ── AI Chat (FloatingAssistant / GroupChat / SocialChat) ──────────
        case "aiChat": {
          const reply = await ai.runAiChat(payload.message, payload.history || [], aiConfig, payload.courseContext || "");
          return { data: { reply, text: reply } };
        }

        // ── Course Assistant ──────────────────────────────────────────────
        case "courseAssistant": {
          const raw = await ai.generateText(payload.prompt, aiConfig);
          return { data: { reply: raw, text: raw } };
        }

        // ── Generic AI Generate (PdfTools "aiGenerate") ───────────────────
        case "generateText": {
          const raw = await ai.generateText(payload.prompt, aiConfig);
          return raw; // Return string directly since callers expect a string here!
        }

        case "aiGenerate": {
          const u = await Users.me().catch(() => null);
          const userPlan = (u?.subscription_plan || "free").toLowerCase();
          const isAdmin = u?.role === "admin" || u?.email === "ibrahimkandil000@gmail.com";
          const targetModel = aiConfig?.model || "gemini-3.6-flash";
          if (!isAdmin && !canUserAccessModel(targetModel, userPlan)) {
            const tierMeta = TIER_INFO[getModelTier(targetModel)] || { name: "أعلى" };
            throw new Error(`نموذج [${targetModel}] يتطلب باقة [${tierMeta.nameAr || tierMeta.name}]. يرجى ترقية باقتك للوصول لهذا النموذج!`);
          }

          const result = await ai.runGenerateStudyContent(
            { ...payload, task: payload.task || "summary" },
            aiConfig
          );
          const text = result?.summary_markdown || result?.text || JSON.stringify(result);
          return { data: { result: { summary_markdown: text }, text } };
        }

        // ── Generate Study Content (CourseView / QuizGeneratorPanel) ──────
        case "generateStudyContent": {
          const u = await Users.me().catch(() => null);
          const userPlan = (u?.subscription_plan || "free").toLowerCase();
          const isAdmin = u?.role === "admin" || u?.email === "ibrahimkandil000@gmail.com";
          const targetModel = aiConfig?.model || "gemini-3.6-flash";
          if (!isAdmin && !canUserAccessModel(targetModel, userPlan)) {
            const tierMeta = TIER_INFO[getModelTier(targetModel)] || { name: "أعلى" };
            throw new Error(`نموذج [${targetModel}] يتطلب باقة [${tierMeta.nameAr || tierMeta.name}]. يرجى ترقية باقتك للوصول لهذا النموذج!`);
          }

          const result = await ai.runGenerateStudyContent(payload, aiConfig);
          return { data: { result } };
        }


        // ── Activation Codes ──────────────────────────────────────────────
        case "generateActivationCodes": {
          const { count = 1, plan_key, plan_name, duration_days = 30, note = "" } = payload;
          const plan = PLANS.find((item) => item.key === plan_key);
          if (!plan) throw new Error("الخطة غير صالحة");
          const safeCount = Math.min(100, Math.max(1, Number(count) || 1));
          const codes = [];
          for (let i = 0; i < safeCount; i++) {
            const code = "BF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            await ActivationCodes.create({
              code,
              plan_key: plan.key,
              plan_name: plan_name || plan.name,
              duration_days: Number(duration_days),
              credits: planCredits(plan, Number(duration_days)),
              status: "active",
              note,
              created_at: new Date().toISOString(),
            });
            codes.push(code);
          }
          return { data: { success: true, codes } };
        }

        case "redeemActivationCode": {
          const normalizedCode = String(payload.code || "").trim().toUpperCase();
          const allCodes = await ActivationCodes.filter({ code: normalizedCode }, null, null);
          const validCodes = allCodes.filter(c => c.code === normalizedCode && c.status === "active");
          if (!validCodes.length) throw new Error("كود غير صالح أو تم استخدامه من قبل");
          const c = validCodes[0];
          const u = await Users.me();
          if (!u) throw new Error("سجّل دخولك أولًا");
          const expiresAt = new Date(Date.now() + Number(c.duration_days || 30) * 86400000).toISOString();
          await ActivationCodes.update(c.id, {
            status: "used",
            used_by_id: u.id,
            used_by_email: u.email || firebaseAuth?.currentUser?.email || "",
            used_at: new Date().toISOString(),
          });
          await Users.updateMe({
            subscription_plan: "premium",
            subscription_status: "active",
            subscription_plan_key: c.plan_key,
            subscription_plan_name: c.plan_name,
            subscription_expires_at: expiresAt,
            credits: Number(u.credits || 0) + Number(c.credits || 0),
          });
          return { data: { success: true, plan_name: c.plan_name, expires_at: expiresAt, credits: Number(c.credits || 0) } };
        }

        // ── Payment Approval (Admin) ──────────────────────────────────────
        case "approvePaymentRequest": {
          const requestId = payload.request_id || payload.id;
          const action = payload.action || "approve";
          const deliveryMode = payload.delivery_mode || "code"; // "direct" or "code"
          const pr = await PaymentRequests.get(requestId);
          
          if (!pr) throw new Error("الطلب غير موجود");
          if (pr.status !== "pending") throw new Error("تمت مراجعة الطلب من قبل");
          
          if (action === "reject") {
            await PaymentRequests.delete(requestId);
            return { data: { success: true, status: "rejected", deleted: true } };
          }
          
          const planKey = payload.plan_key || pr.plan_key || pr.product_key;
          const plan = PLANS.find((item) => item.key === planKey);
          if (!plan) throw new Error("الخطة غير صالحة");
          
          const durationDays = Number(payload.duration_days || pr.duration_days || 30);
          const creditsToGive = pr.credits || planCredits(plan, durationDays >= 365 ? "yearly" : "monthly");
          
          if (deliveryMode === "direct") {
            // DIRECT ACTIVATION
            const targetUser = await Users.get(pr.user_id);
            if (!targetUser) throw new Error("المستخدم غير موجود للتفعيل المباشر");
            
            const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
            
            const tokensToGive = Number(pr.tokens || plan.tokens || 0);
            await Users.update(pr.user_id, {
              subscription_plan: "premium",
              subscription_status: "active",
              is_pro: true,
              subscription_plan_key: plan.key,
              subscription_plan_name: plan.name,
              subscription_expires_at: expiresAt,
              credits: Number(targetUser.credits || 0) + Number(creditsToGive),
              token_balance: Number(targetUser.token_balance || 0) + tokensToGive,
            });
            
            await PaymentRequests.update(requestId, {
              status: "approved",
              plan_key: plan.key,
              plan_name: plan.name,
              duration_days: durationDays,
              activation_type: "direct",
              admin_note: payload.admin_note || "",
              reviewed_at: new Date().toISOString(),
            });
            
            return { data: { success: true, mode: "direct" } };
          } else {
            // CODE GENERATION
            const code = "BF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            await ActivationCodes.create({
              code,
              plan_key: plan.key,
              plan_name: plan.name,
              duration_days: durationDays,
              credits: creditsToGive,
              status: "active",
              note: `طلب دفع ${requestId}`,
              created_at: new Date().toISOString(),
            });
            
            await PaymentRequests.update(requestId, {
              status: "approved",
              plan_key: plan.key,
              plan_name: plan.name,
              duration_days: durationDays,
              activation_code: code,
              activation_type: "code",
              admin_note: payload.admin_note || "",
              reviewed_at: new Date().toISOString(),
            });
            
            return { data: { success: true, mode: "code", code } };
          }
        }        // ── XP / Progress (server-authoritative; clients get exact XP_REWARDS map) ──
        case "awardProgress": {
          try {
            const res = await invokeSecureFunction("award-progress", {
              action: payload.action,
              units: payload.units,
            });
            const d = res.data;
            return {
              data: { xpGained: d.xp_gained, total_xp: d.total_xp, level_up: d.level_up, level_now: d.level_now },
            };
          } catch (serverErr) {
            console.warn("[API] award-progress server call failed, queueing offline:", serverErr?.message);
            if (typeof navigator !== "undefined" && !navigator.onLine) {
              const { queueOfflineAction } = await import("@/lib/offlineDb");
              if (queueOfflineAction) {
                await queueOfflineAction({ kind: "xp", payload: { action: payload.action, units: payload.units } });
              }
            }
            return { data: { error: "XP_SERVER_ERROR" } };
          }
        }

        // ── Daily rewards (dev fallback; PROD routes to economy-actions) ──
        case "dailyLoginReward": {
          const u = await Users.me();
          const today = new Date().toISOString().slice(0, 10);
          if (u?.last_login_reward_date === today) return { data: { success: true, granted: 0, duplicate: true } };
          const rewardCredits = 2;
          await Users.updateMe({
            credits: (Number(u.credits) || 0) + rewardCredits,
            last_login_reward_date: today,
          });
          return { data: { success: true, granted: rewardCredits, streak: u?.current_streak || 1 } };
        }
        case "mascotDailyReward": {
          const u = await Users.me();
          const today = new Date().toISOString().slice(0, 10);
          if (u?.last_skin_daily_reward === today) return { data: { success: true, granted: 0, duplicate: true } };
          const { getSkin } = await import("@/lib/mascotSkins");
          const skin = getSkin(u?.active_mascot_skin);
          const reward = Math.max(0, Number(skin?.dailyCredits) || 0);
          if (!reward) throw new Error("الشكل الحالي لا يمنح مكافأة يومية");
          await Users.updateMe({
            credits: (Number(u.credits) || 0) + reward,
            last_skin_daily_reward: today,
          });
          return { data: { success: true, granted: reward } };
        }

        // ── Purchase Course (server-atomic via economy-actions) ──
        case "purchaseCourse": {
          const u = await Users.me();
          if (!u) throw new Error("سجّل دخولك أولاً لفتح الملخص");
          const res = await invokeSecureFunction("economy-actions", {
            action: "purchaseCourse",
            courseId: payload.course_id,
          });
          return { data: { success: true, deducted: res.data?.credits ?? 0, server: true } };
        }

        // ── Cosmetics (Frames / Banners / Titles) ─────────────────────────
        case "purchaseCosmetic": {
          const u = await Users.me();
          if (!u) throw new Error("سجّل دخولك أولاً");
          const isAdmin = u.role === "admin" || u.email === "ibrahimkandil000@gmail.com";

          const catalogs = {
            frame: { items: AVATAR_FRAMES, field: "owned_frames", activeField: "active_frame" },
            banner: { items: PROFILE_BANNERS, field: "owned_banners", activeField: "active_banner" },
            title: { items: PROFILE_TITLES, field: "owned_titles", activeField: "active_title" },
            orbit: { items: ORBIT_EFFECTS, field: "owned_orbit_effects", activeField: "active_orbit_effect" },
            mascot: {
              items: Object.fromEntries(MASCOT_SKINS.map((item) => [item.id, item])),
              field: "owned_mascot_skins",
              activeField: "active_mascot_skin",
            },
          };
          const catalog = catalogs[payload.type];
          const item = catalog?.items?.[payload.key];

          if (!catalog || !item) {
            throw new Error("العنصر غير موجود");
          }

          const owned = Array.isArray(u[catalog.field]) ? u[catalog.field] : [];
          const cost = Math.max(0, Number(item.price || 0));
          const credits = Number(u.credits || 0);

          // If already owned or free
          if (owned.includes(payload.key) || cost === 0) {
            const nextOwned = Array.from(new Set([...owned, payload.key]));
            const updates = { [catalog.field]: nextOwned };
            if (catalog.activeField) updates[catalog.activeField] = payload.key;
            await Users.updateMe(updates).catch(() => {});
            return { data: { success: true, credits, [catalog.field]: nextOwned } };
          }

          // Balance check (admins can test with their credits, non-admins must have enough)
          if (!isAdmin && credits < cost) {
            throw new Error(`رصيدك غير كافي — محتاج ${cost} كريدت`);
          }

          const nextCredits = Math.max(0, credits - cost);
          const nextOwned = Array.from(new Set([...owned, payload.key]));
          const updates = {
            credits: nextCredits,
            [catalog.field]: nextOwned,
          };
          if (catalog.activeField) updates[catalog.activeField] = payload.key;

          await Users.updateMe(updates).catch((err) => console.warn("[purchaseCosmetic] updateMe error:", err));

          if (cost > 0) {
            await CreditTransactions.create({
              user_id: u.id,
              amount: -cost,
              transaction_type: "spend",
              description: `شراء ${payload.type}: ${item.label || payload.key}`,
            }).catch((err) => console.warn("[CreditTransactions] Permission or write error ignored:", err));
          }

          return { data: { success: true, credits: nextCredits, [catalog.field]: nextOwned } };
        }

        // ── Reminders ─────────────────────────────────────────────────────
        case "addStudyReminder": {
          await CourseReminders.create({ ...payload, user_id: firebaseAuth?.currentUser?.uid });
          return { data: { success: true } };
        }

        default:
          console.warn(`[functions.invoke] Function "${name}" has no local implementation.`);
          return { data: {} };
      }
    } catch (e) {
      console.error(`[functions.invoke] Error in "${name}":`, e);
      throw e;
    }
  },
};

export const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const url = await uploadFile(file);
      return { file_url: url };
    }
  }
};

export const base44 = { auth, entities, functions, integrations };
export default base44;
