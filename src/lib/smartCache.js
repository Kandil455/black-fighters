/**
 * src/lib/smartCache.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart Batch Cache Engine (محرك الكاش الذكي للدفعات الجامعية)
 *
 * Designed for cohorts of 400+ students uploading the same lecture PDFs/texts:
 * 1. Normalized Content Fingerprinting: Strips variable headers, page numbers,
 *    and formatting noise so identical lectures with different filenames produce
 *    the exact same deterministic hash.
 * 2. Multi-Layer Storage:
 *    - Layer 1: In-Memory Map (0ms instant hit)
 *    - Layer 2: Browser LocalStorage (`bf_smart_batch_cache_v2`) with LRU pruning
 *    - Layer 3: Shared Firestore Collection (`globalLectureCache`) so the first
 *      student in a batch populates the cache for the other 400 students at 0 tokens!
 * 3. Hybrid Quiz Question Bank:
 *    - Accumulates verified MCQs per lecture in a shared `question_bank`.
 *    - On subsequent quiz requests for the same lecture, blends ~50% cached
 *      questions from the bank with ~50% freshly generated AI questions, then
 *      appends the new questions back to expand the bank.
 */

import { db } from "./firebaseDb.js";
import { auth } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { reconcileQuestionAnswer } from "./quizQuality.js";

const LOCAL_CACHE_STORAGE_KEY = "bf_smart_batch_cache_v2";
const LOCAL_SEEN_QUESTIONS_KEY = "bf_seen_quiz_stems_v1";
const MAX_LOCAL_ENTRIES = 35;
const MAX_QUESTION_BANK_SIZE = 180;

// Layer 1: In-memory cache
const memoryArtifacts = new Map();
const memoryQuestionBanks = new Map();

/**
 * Normalizes lecture text so that two students uploading the same PDF (even with
 * different filenames or minor extraction whitespace differences) get the exact
 * same content fingerprint.
 */
export function normalizeTextForCache(rawText = "") {
  return String(rawText || "")
    .replace(/\[صفحة\s+\d+\]/gi, " ")
    .replace(/\bpage\s+\d+(?:\s+of\s+\d+)?\b/gi, " ")
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
}

/**
 * Deterministic fast FNV-1a + multi-lane hash (works synchronously everywhere,
 * both browser and Node.js without async crypto overhead when needed).
 */
export function computeContentHash(rawText = "") {
  const norm = normalizeTextForCache(rawText);
  if (!norm) return "bf_empty";

  // Sample head, middle, tail + full length & rolling hashes across text
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const len = norm.length;
  const step = len > 60000 ? Math.floor(len / 30000) : 1;

  for (let i = 0; i < len; i += step) {
    const c = norm.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (c + (i & 0xff));
    h2 = Math.imul(h2, 0x5bd1e995);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `bf_${len.toString(36)}_${hex1}${hex2}`;
}

/**
 * Builds a deterministic artifact key for a specific task and configuration.
 */
export function buildArtifactKey({
  task = "summary",
  language = "ar",
  summaryStyle = "default",
  summaryMaxPages = 0,
  chunkIndex = 0,
  totalChunks = 1,
}) {
  const cleanTask = String(task || "summary").trim().toLowerCase();
  const cleanLang = String(language || "ar").trim().toLowerCase();
  const cleanStyle = String(summaryStyle || "default").trim().toLowerCase();
  const pageBucket = summaryMaxPages ? Math.round(Number(summaryMaxPages) / 5) * 5 : 0;
  return `${cleanTask}__${cleanLang}__${cleanStyle}__p${pageBucket}__c${chunkIndex}_of_${totalChunks}`;
}

// ─── LocalStorage Helpers (Browser safe) ────────────────────────────────────

function readLocalStore() {
  if (typeof window === "undefined" || !window.localStorage) return { entries: {}, stats: { hits: 0, tokensSaved: 0 } };
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_STORAGE_KEY);
    if (!raw) return { entries: {}, stats: { hits: 0, tokensSaved: 0 } };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.entries
      ? parsed
      : { entries: {}, stats: { hits: 0, tokensSaved: 0 } };
  } catch {
    return { entries: {}, stats: { hits: 0, tokensSaved: 0 } };
  }
}

function writeLocalStore(store) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const keys = Object.keys(store.entries || {});
    if (keys.length > MAX_LOCAL_ENTRIES) {
      // Evict oldest accessed entries
      const sorted = keys.sort(
        (a, b) => (store.entries[a]?.updatedAt || 0) - (store.entries[b]?.updatedAt || 0)
      );
      const toRemove = sorted.slice(0, keys.length - MAX_LOCAL_ENTRIES);
      for (const k of toRemove) delete store.entries[k];
    }
    window.localStorage.setItem(LOCAL_CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded: clear oldest half and retry
    try {
      const keys = Object.keys(store.entries || {});
      const half = Math.ceil(keys.length / 2);
      for (let i = 0; i < half; i++) delete store.entries[keys[i]];
      window.localStorage.setItem(LOCAL_CACHE_STORAGE_KEY, JSON.stringify(store));
    } catch {}
  }
}

function getSeenQuestionStems() {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const arr = JSON.parse(window.localStorage.getItem(LOCAL_SEEN_QUESTIONS_KEY) || "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function recordSeenQuestionStems(questions = []) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const current = getSeenQuestionStems();
    for (const q of questions) {
      const stem = normalizeQuestionStem(q?.question || q?.q || q?.question_text || "");
      if (stem) current.add(stem);
    }
    const list = [...current].slice(-400);
    window.localStorage.setItem(LOCAL_SEEN_QUESTIONS_KEY, JSON.stringify(list));
  } catch {}
}

export function normalizeQuestionStem(qText = "") {
  return String(qText || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

// ─── Shared Firestore & Local Artifact Lookup ───────────────────────────────

/**
 * Checks Memory -> LocalStorage -> Shared Firestore (`globalLectureCache`)
 * for a previously generated artifact (summary, flashcards, facts, source analysis).
 */
export async function getCachedArtifact(textOrHash, artifactKey, { isAlreadyHashed = false } = {}) {
  const contentHash = isAlreadyHashed ? String(textOrHash) : computeContentHash(textOrHash);
  if (!contentHash || contentHash === "bf_empty") return null;
  const compositeKey = `${contentHash}::${artifactKey}`;

  // 1. Memory Hit
  if (memoryArtifacts.has(compositeKey)) {
    bumpCacheHitTelemetry(contentHash, 1200);
    return memoryArtifacts.get(compositeKey);
  }

  // 2. LocalStorage Hit
  const localStore = readLocalStore();
  const localEntry = localStore.entries?.[contentHash];
  if (localEntry?.artifacts?.[artifactKey]) {
    const data = localEntry.artifacts[artifactKey];
    memoryArtifacts.set(compositeKey, data);
    bumpCacheHitTelemetry(contentHash, 1500);
    return data;
  }

  // 3. Shared Firestore Hit (`globalLectureCache/{contentHash}`)
  if (db && auth?.currentUser) {
    try {
      const snap = await getDoc(doc(db, "globalLectureCache", contentHash));
      if (snap.exists()) {
        const docData = snap.data() || {};
        const rawArtifact = docData.artifacts?.[artifactKey];
        if (rawArtifact) {
          const parsed = typeof rawArtifact === "string" ? JSON.parse(rawArtifact) : rawArtifact;
          memoryArtifacts.set(compositeKey, parsed);
          // Mirror to LocalStorage
          saveToLocalEntry(contentHash, { artifactKey, artifactValue: parsed });
          // Increment shared hit counter best-effort
          updateDoc(doc(db, "globalLectureCache", contentHash), {
            hit_count: increment(1),
            tokens_saved: increment(1800),
            last_hit_at: serverTimestamp(),
          }).catch(() => {});
          bumpCacheHitTelemetry(contentHash, 1800);
          return parsed;
        }
      }
    } catch {
      // Ignore permission/offline errors and proceed to generate
    }
  }

  return null;
}

/**
 * Saves a generated artifact to Memory, LocalStorage, and Shared Firestore (`globalLectureCache`)
 * so the rest of the 401-student batch gets an instant Cache Hit.
 */
export async function setCachedArtifact(textOrHash, artifactKey, value, { isAlreadyHashed = false, meta = {} } = {}) {
  if (!value) return;
  const contentHash = isAlreadyHashed ? String(textOrHash) : computeContentHash(textOrHash);
  if (!contentHash || contentHash === "bf_empty") return;
  const compositeKey = `${contentHash}::${artifactKey}`;

  // 1. Save to Memory
  memoryArtifacts.set(compositeKey, value);

  // 2. Save to LocalStorage
  saveToLocalEntry(contentHash, { artifactKey, artifactValue: value, meta });

  // 3. Save to Shared Firestore (`globalLectureCache/{contentHash}`)
  if (db && auth?.currentUser) {
    try {
      const serialized = JSON.stringify(value);
      // Avoid exceeding Firestore 1MB document limit
      if (serialized.length < 650_000) {
        const ref = doc(db, "globalLectureCache", contentHash);
        await setDoc(
          ref,
          {
            content_hash: contentHash,
            artifacts: {
              [artifactKey]: serialized,
            },
            meta: {
              ...meta,
              updated_by: auth.currentUser.uid,
            },
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch {
      // Non-fatal if offline or rules not yet deployed
    }
  }
}

function saveToLocalEntry(contentHash, { artifactKey, artifactValue, questionBank, meta = {} }) {
  const store = readLocalStore();
  const existing = store.entries[contentHash] || {
    contentHash,
    artifacts: {},
    questionBank: [],
    hitCount: 0,
    updatedAt: Date.now(),
  };
  if (artifactKey && artifactValue !== undefined) {
    existing.artifacts = existing.artifacts || {};
    existing.artifacts[artifactKey] = artifactValue;
  }
  if (Array.isArray(questionBank)) {
    existing.questionBank = questionBank;
  }
  existing.meta = { ...(existing.meta || {}), ...meta };
  existing.updatedAt = Date.now();
  store.entries[contentHash] = existing;
  writeLocalStore(store);
}

function bumpCacheHitTelemetry(contentHash, estimatedTokens = 1000) {
  const store = readLocalStore();
  store.stats = store.stats || { hits: 0, tokensSaved: 0 };
  store.stats.hits = (Number(store.stats.hits) || 0) + 1;
  store.stats.tokensSaved = (Number(store.stats.tokensSaved) || 0) + estimatedTokens;
  if (store.entries?.[contentHash]) {
    store.entries[contentHash].hitCount = (Number(store.entries[contentHash].hitCount) || 0) + 1;
    store.entries[contentHash].updatedAt = Date.now();
  }
  writeLocalStore(store);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("bf:smart-cache-hit", {
        detail: {
          contentHash,
          hits: store.stats.hits,
          tokensSaved: store.stats.tokensSaved,
        },
      })
    );
  }
}

export function getSmartCacheStats() {
  const store = readLocalStore();
  return {
    hits: Number(store.stats?.hits || 0),
    tokensSaved: Number(store.stats?.tokensSaved || 0),
    cachedLecturesCount: Object.keys(store.entries || {}).length,
  };
}

// ─── Hybrid Quiz Cache Engine (بنك الأسئلة التراكمي الهجين للدفعة) ────────────

/**
 * Fetches the shared question bank for a lecture (`contentHash + language`).
 */
export async function getCachedQuestionBank(textOrHash, language = "ar", { isAlreadyHashed = false } = {}) {
  const contentHash = isAlreadyHashed ? String(textOrHash) : computeContentHash(textOrHash);
  if (!contentHash || contentHash === "bf_empty") return [];
  const bankKey = `${contentHash}::qbank_${language}`;

  // 1. Check Memory
  if (memoryQuestionBanks.has(bankKey)) {
    return memoryQuestionBanks.get(bankKey);
  }

  let bank = [];

  // 2. Check LocalStorage
  const localStore = readLocalStore();
  const localBank = localStore.entries?.[contentHash]?.questionBanks?.[language]
    || localStore.entries?.[contentHash]?.questionBank
    || [];
  if (Array.isArray(localBank) && localBank.length > 0) {
    bank = localBank;
  }

  // 3. Check Shared Firestore `globalLectureCache`
  if (db && auth?.currentUser) {
    try {
      const snap = await getDoc(doc(db, "globalLectureCache", contentHash));
      if (snap.exists()) {
        const data = snap.data() || {};
        const remoteBankRaw = data.question_banks?.[language] || data.question_bank;
        const remoteBank = typeof remoteBankRaw === "string" ? JSON.parse(remoteBankRaw) : remoteBankRaw;
        if (Array.isArray(remoteBank) && remoteBank.length > 0) {
          bank = mergeUniqueQuestions(bank, remoteBank);
        }
      }
    } catch {}
  }

  const reconciledBank = bank.map((q) => reconcileQuestionAnswer(q));
  memoryQuestionBanks.set(bankKey, reconciledBank);
  return reconciledBank;
}

/**
 * Deduplicates and merges two arrays of quiz questions, reconciling answer indices against explanations.
 */
export function mergeUniqueQuestions(existing = [], incoming = []) {
  const map = new Map();
  for (const rawQ of [...existing, ...incoming]) {
    if (!rawQ || typeof rawQ !== "object") continue;
    const q = reconcileQuestionAnswer(rawQ);
    const stem = normalizeQuestionStem(q.question || q.q || q.question_text || "");
    if (!stem || stem.length < 8) continue;
    if (!Array.isArray(q.options) || q.options.length < 2) continue;
    if (!map.has(stem)) {
      map.set(stem, {
        ...q,
        cached_at: q.cached_at || Date.now(),
      });
    }
  }
  return [...map.values()].slice(-MAX_QUESTION_BANK_SIZE);
}

/**
 * Prepares a Hybrid Quiz Plan:
 * - Pulls up to `hybridRatio` (default 50%) of the requested questions from the
 *   cached question bank (prioritizing unseen questions for the current student).
 * - Calculates `missingCount` (the remaining ~50% to be generated fresh by AI).
 * - Also provides `fallbackAllCached` in case the AI provider fails or is offline.
 */
export async function prepareHybridQuizPlan({
  text,
  language = "ar",
  desiredCount = 10,
  difficulty = "mixed",
  hybridRatio = 0.5,
}) {
  const contentHash = computeContentHash(text);
  const bank = await getCachedQuestionBank(contentHash, language, { isAlreadyHashed: true });

  if (!bank.length) {
    return {
      contentHash,
      cachedSlice: [],
      missingCount: desiredCount,
      existingStems: [],
      fullBank: [],
      isHybridHit: false,
    };
  }

  const seenStems = getSeenQuestionStems();

  // Filter by difficulty if specific difficulty requested, else take all
  const matchingDifficulty =
    difficulty && difficulty !== "mixed"
      ? bank.filter((q) => !q.difficulty || q.difficulty === difficulty)
      : bank;
  const candidatePool = matchingDifficulty.length >= 2 ? matchingDifficulty : bank;

  // Prioritize questions this student hasn't seen yet, then shuffle
  const unseen = [];
  const seen = [];
  for (const q of candidatePool) {
    const stem = normalizeQuestionStem(q.question || q.q || "");
    if (seenStems.has(stem)) seen.push(q);
    else unseen.push(q);
  }

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const orderedCandidates = [...shuffle(unseen), ...shuffle(seen)];

  // Take up to 50% from cache so every student gets a fresh mix while saving 50% tokens!
  const targetCachedCount = Math.min(
    orderedCandidates.length,
    Math.max(1, Math.floor(desiredCount * hybridRatio))
  );

  const cachedSlice = orderedCandidates.slice(0, targetCachedCount).map((q) => ({
    ...q,
    from_smart_cache: true,
  }));

  const missingCount = Math.max(0, desiredCount - cachedSlice.length);
  const existingStems = bank
    .slice(-45)
    .map((q) => String(q.question || q.q || "").trim())
    .filter(Boolean);

  if (cachedSlice.length > 0) {
    bumpCacheHitTelemetry(contentHash, cachedSlice.length * 220);
  }

  return {
    contentHash,
    cachedSlice,
    missingCount,
    existingStems,
    fullBank: orderedCandidates,
    isHybridHit: cachedSlice.length > 0,
  };
}

/**
 * Appends newly generated & verified questions to the lecture's shared Question Bank
 * in Memory, LocalStorage, and Firestore `globalLectureCache`, and returns the
 * combined hybrid question list for the student!
 */
export async function commitHybridQuizQuestions({
  textOrHash,
  language = "ar",
  cachedSlice = [],
  newQuestions = [],
  desiredCount = 10,
  isAlreadyHashed = false,
}) {
  const contentHash = isAlreadyHashed ? String(textOrHash) : computeContentHash(textOrHash);
  const bankKey = `${contentHash}::qbank_${language}`;

  const currentBank = await getCachedQuestionBank(contentHash, language, { isAlreadyHashed: true });
  const updatedBank = mergeUniqueQuestions(currentBank, newQuestions);

  // 1. Update Memory
  memoryQuestionBanks.set(bankKey, updatedBank);

  // 2. Update LocalStorage
  const store = readLocalStore();
  const entry = store.entries[contentHash] || {
    contentHash,
    artifacts: {},
    questionBanks: {},
    updatedAt: Date.now(),
  };
  entry.questionBanks = entry.questionBanks || {};
  entry.questionBanks[language] = updatedBank;
  entry.questionBank = updatedBank;
  entry.updatedAt = Date.now();
  store.entries[contentHash] = entry;
  writeLocalStore(store);

  // 3. Update Shared Firestore `globalLectureCache`
  if (db && auth?.currentUser && newQuestions.length > 0) {
    try {
      const serializedBank = JSON.stringify(updatedBank.slice(-120));
      if (serializedBank.length < 600_000) {
        const ref = doc(db, "globalLectureCache", contentHash);
        await setDoc(
          ref,
          {
            content_hash: contentHash,
            question_banks: {
              [language]: serializedBank,
            },
            question_count: updatedBank.length,
            hit_count: increment(cachedSlice.length > 0 ? 1 : 0),
            tokens_saved: increment(cachedSlice.length * 220),
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch {}
  }

  // Combine cachedSlice + newQuestions without duplicates
  const combined = mergeUniqueQuestions(cachedSlice, newQuestions);
  // If still short and updatedBank has extra questions, top up from updatedBank
  const finalQuestions =
    combined.length < desiredCount
      ? mergeUniqueQuestions(combined, updatedBank).slice(0, desiredCount)
      : combined.slice(0, desiredCount);

  // Shuffle final questions so cached and new questions are seamlessly interleaved
  const interleaved = [...finalQuestions].sort(() => Math.random() - 0.5);
  recordSeenQuestionStems(interleaved);

  return {
    questions: interleaved,
    bankSize: updatedBank.length,
    cachedUsedCount: cachedSlice.length,
    newlyGeneratedCount: newQuestions.length,
  };
}
