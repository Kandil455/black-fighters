import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, increment, arrayUnion, Timestamp, writeBatch,
  onSnapshot, documentId
} from 'firebase/firestore';

// Sort keys Firestore has already rejected (missing composite index / not a real
// field). We only pay that failed round-trip once per key per session and then
// fall back to in-memory sorting for it.
const brokenServerSorts = new Set();
const seenSignupUids = new Set();

import { auth } from './firebase.js';
import { db } from './firebaseDb.js';
import { invokeSecureFunction } from './secureFunctions.js';

// Helper to get current user ID — returns null if not authed
const uid = () => {
  try { return auth?.currentUser?.uid || null; } catch { return null; }
};

// ─── USERS (profiles) ──────────────────────────────────────────────────────────
export const Users = {
  async me() {
    if (!uid() || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid()));
      if (!snap.exists()) {
        if (auth?.currentUser) {
          try {
            await this.create({ 
              email: auth.currentUser.email,
              full_name: auth.currentUser.displayName || 'User'
            });
            const newSnap = await getDoc(doc(db, 'users', uid()));
            if (newSnap.exists()) {
              return { id: newSnap.id, ...newSnap.data(), email: auth.currentUser.email };
            }
          } catch (createErr) {
            console.warn("Could not create initial user doc in Firestore:", createErr.message);
          }
        }
        return {
          id: uid(),
          email: auth?.currentUser?.email,
          full_name: auth?.currentUser?.displayName || 'User',
          role: auth?.currentUser?.email?.toLowerCase() === 'ibrahimkandil000@gmail.com' ? 'admin' : 'user',
          subscription_plan: 'free',
          subscription_status: 'inactive',
          credits: 10,
          token_balance: 10000,
          tokens_used: 0,
          credits_used: 0,
          referrals_count: 0,
          referral_code: (uid() || "").slice(0, 8).toUpperCase(),
        };
      }
            const userData = { id: snap.id, ...snap.data(), email: auth?.currentUser?.email };
      if (userData.email === 'ibrahimkandil000@gmail.com') {
        userData.role = 'admin';
        userData.full_name = 'ADMIN';
        userData.subscription_plan = 'supreme';
        userData.subscription_status = 'active';
        if (typeof userData.credits === 'undefined') {
          userData.credits = 1000;
        }
        if (typeof userData.token_balance === 'undefined') {
          userData.token_balance = 3000000;
        }
        if (snap.data()?.full_name !== 'ADMIN') {
          setDoc(doc(db, 'users', snap.id), { full_name: 'ADMIN' }, { merge: true }).catch(() => {});
        }
      }
      // Ensure 10,000 tokens & 10 credits defaults for all users
      if (typeof userData.token_balance === 'undefined') {
        userData.token_balance = 10000;
      }
      if (typeof userData.credits === 'undefined') {
        userData.credits = 10;
      }
      if (typeof userData.tokens_used === 'undefined') {
        userData.tokens_used = 0;
      }
      if (typeof userData.credits_used === 'undefined') {
        userData.credits_used = 0;
      }
      if (!userData.referral_code) {
        userData.referral_code = (snap.id || "").slice(0, 8).toUpperCase();
      }
      if (typeof userData.referrals_count === 'undefined') {
        userData.referrals_count = 0;
      }
      return userData;
    } catch (err) {
      console.warn("Firestore error in Users.me:", err.message);
      if (auth?.currentUser) {
        const isOwner = auth.currentUser.email?.toLowerCase() === 'ibrahimkandil000@gmail.com' || import.meta.env.DEV;
        // Fallback so user isn't stuck in login loop if offline
        return {
          id: uid(),
          email: auth.currentUser.email || 'ibrahimkandil000@gmail.com',
          full_name: auth.currentUser.displayName || (isOwner ? 'Alpha ⚡' : 'User'),
          role: isOwner ? 'admin' : 'user',
          subscription_plan: isOwner ? 'supreme' : 'free',
          subscription_status: isOwner ? 'active' : 'inactive',
          is_pro: isOwner,
          premium_notified: true,
          credits: isOwner ? 999999 : 10,
          token_balance: isOwner ? 99999999 : 10000,
          tokens_used: 0,
          credits_used: 0,
          referrals_count: isOwner ? 99 : 0,
          referral_code: isOwner ? 'ALPHA777' : (uid() || "").slice(0, 8).toUpperCase(),
        };
      }
      return null;
    }
  },

  async updateMe(data) {
    if (!uid() || !db) {
      if (import.meta.env.DEV) return data;
      throw new Error('Not authenticated');
    }
    try {
      await setDoc(doc(db, 'users', uid()), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      if (!import.meta.env.DEV) throw err;
    }
    return data;
  },

  async create(userData) {
    if (!uid() || !db) throw new Error('Not authenticated');
    const email = userData.email || auth?.currentUser?.email;
    const role = email === 'ibrahimkandil000@gmail.com' ? 'admin' : 'user';
    const referralCode = (uid() || "").slice(0, 8).toUpperCase();
    try {
      await setDoc(doc(db, 'users', uid()), {
        role, subscription_plan: 'free', subscription_status: 'inactive',
        daily_file_limit: 2, daily_operations_limit: 2, badges: [], current_streak: 0, longest_streak: 0,
        total_correct: 0, total_answered: 0, total_xp: 0, total_minutes_studied: 0,
        quizzes_completed: 0, flashcards_reviewed: 0, last_active_date: null,
        credits: 10, // 🎁 الخطة المجانية: كل مستخدم جديد بيبدأ بـ 10 كريدت
        token_balance: 10000, // 🎁 كل مستخدم جديد بيبدأ بـ 10,000 توكن
        tokens_used: 0,
        credits_used: 0,
        referral_code: referralCode,
        referrals_count: 0,
        is_locked: false, createdAt: serverTimestamp(), ...userData,
      }, { merge: true });

      // Process referral bonus for the inviter (5 credits + 5,000 tokens)
      try {
        const { processReferralReward } = await import('./referralService');
        await processReferralReward(uid(), email);
      } catch (refErr) {
        console.warn("[Referral] Post-create processing note:", refErr);
      }

      // Notify Alpha (Telegram) about new user signup — server-side (no token in client)
      try {
        const currentUid = uid();
        if (currentUid && !seenSignupUids.has(currentUid)) {
          seenSignupUids.add(currentUid);
          const { notifyNewSignup } = await import('./notifySignupClient');
          notifyNewSignup({
            userId: currentUid,
            displayName: userData.full_name || auth?.currentUser?.displayName || 'مستخدم جديد',
            email: email || '',
          }).catch(() => {});
        }
      } catch {
        // non-critical — don't interrupt user flow
      }
    } catch (e) {
      console.warn("Users.create warning in Firestore:", e.message);
      // Suppress noisy UI error toast on login/registration flow
    }
  },

  async getAll() {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Users.getAll note:", e.message);
      return [];
    }
  },

  /**
   * Bounded, server-ordered query over the users collection.
   *
   * `Users` is hand-written (not a createEntityStore), so it previously had no
   * `filter` at all. Callers such as the leaderboard asked for
   * `filter({}, "-total_xp", 100)` and silently fell back to a full-collection
   * `getAll()` + in-memory sort because the arguments were ignored.
   *
   * Falls back to an unordered scan only when the ordered query itself fails
   * (missing index / unindexed field), so a bad sort key degrades instead of
   * emptying the page.
   */
  async filter(filters = {}, sortOrder = null, maxResults = null) {
    if (!db) return [];
    const conditions = [];
    for (const [key, value] of Object.entries(filters || {})) {
      if (value === undefined || value === null) continue;
      if (key === 'id') continue;
      conditions.push(where(key, '==', value));
    }

    let desc = false;
    let orderField = null;
    if (typeof sortOrder === 'string' && sortOrder.trim()) {
      desc = sortOrder.trim().startsWith('-');
      orderField = sortOrder.trim().replace(/^[+-]/, '');
    }
    const max = Number(maxResults) > 0 ? Number(maxResults) : null;

    try {
      const constraints = [...conditions];
      if (orderField) constraints.push(orderBy(orderField, desc ? 'desc' : 'asc'));
      if (max) constraints.push(limit(max));
      const snap = await getDocs(constraints.length ? query(collection(db, 'users'), ...constraints) : collection(db, 'users'));
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Secondary in-memory filter for anything Firestore could not express.
      if (!orderField && sortOrder) {
        rows = this.sortInMemory(rows, sortOrder);
      }
      return max ? rows.slice(0, max) : rows;
    } catch (err) {
      console.warn(`[Users.filter] query failed (${err?.message}); falling back to scan`);
      let rows = await this.getAll();
      if (conditions.length) {
        rows = rows.filter((row) => Object.entries(filters).every(([k, v]) => k === 'id' || v === undefined || v === null || row[k] === v));
      }
      if (sortOrder) rows = this.sortInMemory(rows, sortOrder);
      return max ? rows.slice(0, max) : rows;
    }
  },

  /** Numeric-or-string aware sort used by the fallback paths. */
  sortInMemory(rows, sortOrder) {
    const key = String(sortOrder || '').trim().replace(/^[+-]/, '');
    const desc = String(sortOrder || '').trim().startsWith('-');
    if (!key) return rows;
    return [...rows].sort((a, b) => {
      const av = a?.[key] ?? 0;
      const bv = b?.[key] ?? 0;
      if (typeof av === 'number' || typeof bv === 'number') {
        return desc ? Number(bv || 0) - Number(av || 0) : Number(av || 0) - Number(bv || 0);
      }
      return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  },

  async update(userId, data) {
    if (!db) return;
    await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  },

  async get(userId) {
    if (!db) return null;
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /**
   * Fetches several user documents in bounded batches.
   *
   * Replaces `Promise.all(ids.map(id => Users.get(id)))`, which issued one request
   * (plus one rules evaluation) per id — the N+1 that made /groups and /friends
   * crawl before their first paint. Firestore caps `in` filters at 30 values.
   */
  async getMany(ids = [], { chunkSize = 30 } = {}) {
    if (!db) return [];
    const unique = [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean).map(String))];
    if (!unique.length) return [];

    const chunks = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      chunks.push(unique.slice(i, i + chunkSize));
    }

    const pages = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
          return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (err) {
          console.warn('[Users.getMany] batch failed, falling back:', err?.message);
          const results = await Promise.all(chunk.map((id) => this.get(id).catch(() => null)));
          return results.filter(Boolean);
        }
      }),
    );

    // Preserve the caller's requested order (rank/friend ordering depends on it).
    const byId = new Map(pages.flat().map((user) => [user.id, user]));
    return unique.map((id) => byId.get(id)).filter(Boolean);
  },
};

// ─── USER SETTINGS ────────────────────────────────────────────────────────────
export const UserSettings = {
  async get() {
    if (!uid() || !db) return null;
    const snap = await getDoc(doc(db, 'userSettings', uid()));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  async set(data) {
    if (!uid() || !db) return;
    await setDoc(doc(db, 'userSettings', uid()), { ...data, user_id: uid(), updatedAt: serverTimestamp() }, { merge: true });
  },
  async delete() {
    if (!uid() || !db) return;
    await deleteDoc(doc(db, 'userSettings', uid()));
  },
};

// ─── ADMIN CONFIG ─────────────────────────────────────────────────────────────
export const AdminConfig = {
  async get(id = 'default') {
    if (!db) return null;
    const snap = await getDoc(doc(db, 'adminConfig', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  async getAll() {
    if (!db) return [];
    const snap = await getDocs(collection(db, 'adminConfig'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async set(id, data) {
    if (!db) return;
    await setDoc(doc(db, 'adminConfig', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  },
  async delete(id) {
    if (!db) return;
    await deleteDoc(doc(db, 'adminConfig', id));
  }
};

// ─── COURSES ──────────────────────────────────────────────────────────────────
export const Courses = {
  async list(filters = {}) {
    if (!uid() || !db) return [];
    const q = query(collection(db, 'courses'), where('user_id', '==', uid()));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
  },

  async get(id) {
    if (!db) return null;
    const snap = await getDoc(doc(db, 'courses', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async create(data) {
    if (!uid() || !db) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'courses'), { ...data, user_id: uid(), created_at: serverTimestamp(), updated_at: serverTimestamp() });
    return { id: ref.id, ...data };
  },

  async update(id, data) {
    if (!db) return;
    await updateDoc(doc(db, 'courses', id), { ...data, updated_at: serverTimestamp() });
  },

  async delete(id) {
    if (!uid() || !db) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'courses', id));
    const relatedCollections = ['generatedContent', 'courseNotes', 'reviewCards', 'courseReminders'];
    for (const col of relatedCollections) {
      const q = query(collection(db, col), where('course_id', '==', id), where('user_id', '==', uid()));
      const snap = await getDocs(q);
      for (const d of snap.docs) batch.delete(d.ref);
    }
    await batch.commit();
  },

  async count() {
    if (!uid() || !db) return 0;
    const snap = await getDocs(query(collection(db, 'courses'), where('user_id', '==', uid())));
    return snap.size;
  },
};

// ─── GENERATED CONTENT ────────────────────────────────────────────────────────
function normalizeContent(d) {
  const raw = { id: d.id, ...d.data() };
  return { ...raw, content_type: raw.content_type || raw.type, content: raw.content || raw.data, type: raw.content_type || raw.type, data: raw.content || raw.data };
}

export const GeneratedContent = {
  async list(courseId) {
    if (!uid() || !db || !courseId) return [];
    const q = query(collection(db, 'generatedContent'), where('course_id', '==', courseId), where('user_id', '==', uid()));
    const snap = await getDocs(q);
    return snap.docs.map(normalizeContent);
  },
  async get(courseId, type) {
    if (!uid() || !db) return null;
    const q = query(collection(db, 'generatedContent'), where('course_id', '==', courseId), where('content_type', '==', type), where('user_id', '==', uid()), limit(1));
    const snap = await getDocs(q);
    return snap.empty ? null : normalizeContent(snap.docs[0]);
  },
  async listAll(filters = {}) {
    if (!uid() || !db) return [];
    let constraints = [where('user_id', '==', uid())];
    if (filters.course_id) constraints.push(where('course_id', '==', filters.course_id));
    if (filters.content_type) constraints.push(where('content_type', '==', filters.content_type));
    const q = query(collection(db, 'generatedContent'), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(normalizeContent);
  },
  async set(courseId, type, data, lang = 'ar', metadata = {}) {
    if (!uid()) throw new Error('Not authenticated');
    const result = await invokeSecureFunction('save-generated-content', {
      courseId,
      contentType: type,
      content: data,
      language: lang,
      metadata,
    });
    return result.data?.id;
  },
  async delete(courseId, type) {
    if (!uid()) throw new Error('Not authenticated');
    await invokeSecureFunction('delete-generated-content', { courseId, contentType: type });
  },
};

// ─── QUIZ RESULTS ─────────────────────────────────────────────────────────────
export const QuizResults = {
  async list() {
    if (!uid() || !db) return [];
    const q = query(collection(db, 'quizResults'), where('user_id', '==', uid()));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
  },
  async create(data) {
    if (!uid() || !db) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'quizResults'), { ...data, user_id: uid(), created_at: serverTimestamp() });
    return { id: ref.id, ...data };
  },
};

// ─── REVIEW CARDS ─────────────────────────────────────────────────────────────
export const ReviewCards = {
  async listDue() {
    if (!uid() || !db) return [];
    const q = query(collection(db, 'reviewCards'), where('user_id', '==', uid()), where('due_date', '<=', Timestamp.now()));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async listByCourse(courseId) {
    if (!uid() || !db) return [];
    const q = query(collection(db, 'reviewCards'), where('course_id', '==', courseId), where('user_id', '==', uid()));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async create(data) {
    if (!uid() || !db) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'reviewCards'), { ...data, user_id: uid(), ease_factor: data.ease_factor || 2.5, interval_days: data.interval_days || 1, repetitions: data.repetitions || 0, due_date: data.due_date || Timestamp.now(), created_at: serverTimestamp() });
    return { id: ref.id, ...data };
  },
  async update(id, data) {
    if (!db) return;
    await updateDoc(doc(db, 'reviewCards', id), { ...data, updated_at: serverTimestamp() });
  },
  async delete(id) {
    if (!db) return;
    await deleteDoc(doc(db, 'reviewCards', id));
  },
};

// ─── COURSE NOTES ─────────────────────────────────────────────────────────────
export const CourseNotes = {
  async list(courseId) {
    if (!uid() || !db) return [];
    const q = query(collection(db, 'courseNotes'), where('course_id', '==', courseId), where('user_id', '==', uid()));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
  },
  async create(data) {
    if (!uid() || !db) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'courseNotes'), { ...data, user_id: uid(), created_at: serverTimestamp() });
    return { id: ref.id, ...data };
  },
  async update(id, data) {
    if (!db) return;
    await updateDoc(doc(db, 'courseNotes', id), { ...data, updated_at: serverTimestamp() });
  },
  async delete(id) {
    if (!db) return;
    await deleteDoc(doc(db, 'courseNotes', id));
  },
};

// ─── STUDY ACTIVITY ───────────────────────────────────────────────────────────
export const StudyActivity = {
  async list(days = 30) {
    if (!uid() || !db) return [];
    const since = new Date(); since.setDate(since.getDate() - days);
    const q = query(collection(db, 'studyActivity'), where('user_id', '==', uid()), where('created_at', '>=', Timestamp.fromDate(since)));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
  },
  async record({ minutes = 0, questions = 0, courseId = null, activityType = 'study_session', xpEarned = 0 }) {
    if (!uid() || !db) return null;
    const today = new Date().toISOString().split('T')[0];
    const ref = await addDoc(collection(db, 'studyActivity'), { user_id: uid(), course_id: courseId, activity_type: activityType, xp_earned: xpEarned, date: today, metadata: { minutes, questions }, created_at: serverTimestamp() });
    return { id: ref.id };
  },
};

// ─── COURSE REMINDERS ─────────────────────────────────────────────────────────
export const CourseReminders = {
  async list() {
    if (!uid() || !db) return [];
    const q = query(collection(db, 'courseReminders'), where('user_id', '==', uid()));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
  },
  async create(data) {
    if (!uid() || !db) throw new Error('Not authenticated');
    const ref = await addDoc(collection(db, 'courseReminders'), { ...data, user_id: uid(), created_at: serverTimestamp() });
    return { id: ref.id, ...data };
  },
  async update(id, data) {
    if (!db) return;
    await updateDoc(doc(db, 'courseReminders', id), { ...data, updated_at: serverTimestamp() });
  },
  async delete(id) {
    if (!db) return;
    await deleteDoc(doc(db, 'courseReminders', id));
  },
};
// ─── GENERIC ENTITY STORE FACTORY ──────────────────────────────────────────
export const createEntityStore = (collectionName) => ({
  async get(id) {
    if (!db) return null;
    const snap = await getDoc(doc(db, collectionName, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  async getAll() {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  },
  async filter(filters = {}, sortOrder = null, maxResults = null) {
    if (!db) return [];
    try {
      // 1. Direct Document ID lookup support
      if (filters.id && typeof filters.id === 'string') {
        const item = await this.get(filters.id);
        if (!item) return [];
        for (const [k, v] of Object.entries(filters)) {
          if (k !== 'id' && v !== undefined && item[k] !== v) return [];
        }
        return [item];
      }

      // 2. Batch Document ID lookup support ({ id: { $in: [...] } } or id: array)
      if (filters.id && (Array.isArray(filters.id) || filters.id?.$in)) {
        const idList = Array.isArray(filters.id) ? filters.id : filters.id.$in;
        const fetched = await Promise.all(idList.map((docId) => this.get(docId)));
        return fetched.filter(Boolean);
      }

      const currentUid = uid();
      const isAdmin = auth?.currentUser?.email?.toLowerCase() === 'ibrahimkandil000@gmail.com';
      const userScopedCollections = ['notifications', 'quizAttempts', 'creditTransactions', 'summaryJobs', 'summaryDocuments', 'summaryRevisions', 'mediaAssets', 'enrollments'];
      
      // If collection requires user ownership and no user is authenticated, return empty list immediately without causing permission errors
      if (!isAdmin && userScopedCollections.includes(collectionName) && !currentUid) {
        return [];
      }

      const effectiveFilters = { ...filters };
      // Auto-scope only for normal users when user_id is omitted, NEVER for admin or when collectionName is not user-scoped
      if (!isAdmin && userScopedCollections.includes(collectionName) && effectiveFilters.user_id === undefined) {
        effectiveFilters.user_id = currentUid;
      }

      const buildConditions = (flts) => {
        const conds = [];
        for (const [k, v] of Object.entries(flts)) {
          if (v !== undefined && v !== null) {
            if (k === 'participant_ids' && typeof v === 'string') {
              conds.push(where(k, 'array-contains', v));
            } else if (typeof v === 'object' && !Array.isArray(v)) {
              if (v.$all && Array.isArray(v.$all) && v.$all.length > 0) {
                conds.push(where(k, 'array-contains', v.$all[0]));
              } else if (v.$in && Array.isArray(v.$in) && v.$in.length > 0) {
                conds.push(where(k, 'in', v.$in.slice(0, 10)));
              } else if (v.$contains) {
                conds.push(where(k, 'array-contains', v.$contains));
              }
            } else if (Array.isArray(v)) {
              conds.push(where(k, 'array-contains-any', v.slice(0, 10)));
            } else {
              conds.push(where(k, '==', v));
            }
          }
        }
        return conds;
      };

      const postFilter = (list, flts) => {
        let res = list;
        for (const [k, v] of Object.entries(flts)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && v.$all && Array.isArray(v.$all)) {
            res = res.filter(item => Array.isArray(item[k]) && v.$all.every(val => item[k].includes(val)));
          }
        }
        return res;
      };

      let q = collection(db, collectionName);
      const conditions = buildConditions(effectiveFilters);
      if (conditions.length > 0) {
        q = query(q, ...conditions);
      }

      const requestedKey = sortOrder ? sortOrder.replace(/^[-+]/, '') : '';
      const sortKey = requestedKey === 'created_date' ? 'created_at'
        : requestedKey === 'updated_date' ? 'updated_at'
        : requestedKey;
      const isLegacyAlias = !!sortOrder && sortKey !== requestedKey;
      const descending = sortOrder ? sortOrder.startsWith('-') : false;

      // ── Preferred: let Firestore order + limit (bounded payload, cheap) ────
      // Used for real fields (created_at, chapter_index, …). Skipped for legacy
      // aliases (`created_date`), because a server-side orderBy on a field the
      // documents do not physically contain silently returns NOTHING (BUG-06),
      // and for any key Firestore already refused in this session.
      if (sortOrder && !isLegacyAlias && !brokenServerSorts.has(`${collectionName}:${sortKey}`)) {
        try {
          const serverQuery = [orderBy(sortKey, descending ? 'desc' : 'asc')];
          if (maxResults) serverQuery.push(limit(maxResults));
          const serverSnap = await getDocs(query(q, ...serverQuery));
          return postFilter(serverSnap.docs.map(d => ({ id: d.id, ...d.data() })), effectiveFilters);
        } catch (error) {
          brokenServerSorts.add(`${collectionName}:${sortKey}`);
          console.warn(
            `[firestore] server-side orderBy("${sortKey}") on "${collectionName}" unavailable ` +
            `(${error?.code || error?.message}) — sorting in memory instead.`
          );
        }
      }

      const snap = await getDocs(q);
      let docs = postFilter(snap.docs.map(d => ({ id: d.id, ...d.data() })), effectiveFilters);
      if (sortOrder) {
        const norm = (v) => (typeof v?.toMillis === 'function' ? v.toMillis()
          : typeof v?.seconds === 'number' ? v.seconds * 1000
          : v);
        // Mixed storage types must still order chronologically: a numeric
        // timestamp and an ISO string both normalize to epoch millis before the
        // lexicographic fallback runs.
        const cmpVals = (a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          const ta = typeof a === 'number' ? a : typeof a === 'string' ? Date.parse(a) : NaN;
          const tb = typeof b === 'number' ? b : typeof b === 'string' ? Date.parse(b) : NaN;
          if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
          const sa = String(a); const sb = String(b);
          return sa < sb ? -1 : sa > sb ? 1 : 0;
        };
        docs.sort((a, b) => {
          const av = norm(a[sortKey]);
          const bv = norm(b[sortKey]);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;  // missing timestamps always sort last
          if (bv == null) return -1;
          const c = cmpVals(av, bv);
          return descending ? -c : c;
        });
      }
      if (maxResults && docs.length > maxResults) docs = docs.slice(0, maxResults);
      return docs;
    } catch (err) {
      // If permission error occurs, suppress warning noise gracefully
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        return [];
      }
      console.warn(`Firestore filter failed for ${collectionName}:`, err.message);
      return [];
    }
  },
  async create(data) {
    if (!db) throw new Error('DB not initialized');
    const ref = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return { id: ref.id, ...data };
  },
  async update(id, data) {
    if (!db) return null;
    await updateDoc(doc(db, collectionName, id), {
      ...data,
      updated_at: serverTimestamp()
    });
    return { id, ...data };
  },
  async delete(id) {
    if (!db) return;
    await deleteDoc(doc(db, collectionName, id));
  },
  subscribe(callback, docId = null) {
    if (!db) return () => {};
    if (docId) {
      return onSnapshot(doc(db, collectionName, docId), (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, data: { id: snap.id, ...snap.data() } });
        }
      }, (err) => console.warn(`Firestore subscribe error on ${collectionName}/${docId}:`, err.message));
    }
    return onSnapshot(collection(db, collectionName), (snap) => {
      snap.docChanges().forEach((change) => {
        callback({
          type: change.type,
          id: change.doc.id,
          data: { id: change.doc.id, ...change.doc.data() },
        });
      });
    }, (err) => console.warn(`Firestore collection subscribe error on ${collectionName}:`, err.message));
  }
});

// Missing Entity Exports
export const PaymentRequests = createEntityStore('paymentRequests');
export const ActivationCodes = createEntityStore('activationCodes');
export const CreditTransactions = createEntityStore('creditTransactions');
export const Enrollments = createEntityStore('enrollments');
export const Notifications = createEntityStore('notifications');
export const Friendships = createEntityStore('friendships');
export const DirectMessages = createEntityStore('directMessages');
export const GroupMessages = createEntityStore('groupMessages');
export const GroupQuizSessions = createEntityStore('groupQuizSessions');
export const StudyGroups = {
  ...createEntityStore('studyGroups'),
  async listForUser(userId, maxResults = 100) {
    if (!db || !userId) return [];
    const snap = await getDocs(query(
      collection(db, 'studyGroups'),
      where('member_ids', 'array-contains', userId),
      limit(maxResults),
    ));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.updated_date?.toMillis?.() || a.updated_at?.toMillis?.() || 0;
        const bTime = b.updated_date?.toMillis?.() || b.updated_at?.toMillis?.() || 0;
        return bTime - aTime;
      });
  },
};
export const Challenges = createEntityStore('challenges');
export const StandaloneQuizzes = createEntityStore('standaloneQuizzes');
export const QuizAttempts = createEntityStore('quizAttempts');
export const Questions = createEntityStore('questions');
export const Lessons = createEntityStore('lessons');
// Student-reported quiz problems. The entity was referenced by BOTH the report
// modal and the admin review tab but never defined, so `entities.FlaggedQuestion`
// was undefined, every report was dropped by `?.create(...)`, and admins saw an
// empty queue forever.
export const FlaggedQuestions = createEntityStore('flaggedQuestions');
export const AssistantConversations = createEntityStore('assistantConversations');
