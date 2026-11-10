/**
 * admin-keys.mjs — Server-side helper to load user-provided Gemini keys (highest
 * priority) and dynamic AI keys & custom provider settings saved by the Admin in
 * Firestore `adminConfig`, with safe try/catch and a 30-second in-memory cache.
 */
import { adminDb } from "../firebase-admin.mjs";

let cachedDocs = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

function isValidGeminiKeyFormat(raw) {
  const clean = String(raw || "").trim();
  return /^AIza[0-9A-Za-z_-]{25,60}$/.test(clean);
}

export async function extractUserGeminiKey({ event, body, uid } = {}) {
  const headerKey =
    event?.headers?.["x-user-gemini-key"] ||
    event?.headers?.["X-User-Gemini-Key"] ||
    "";
  const bodyKey = body?.user_gemini_key || body?.userGeminiKey || "";
  const directCandidate = String(bodyKey || headerKey || "").trim();
  if (isValidGeminiKeyFormat(directCandidate)) {
    return directCandidate;
  }

  if (uid) {
    try {
      const snap = await Promise.race([
        adminDb.collection("userSettings").doc(uid).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 1500)),
      ]);
      if (snap?.exists) {
        const stored = String(snap.data()?.gemini_api_key || "").trim();
        if (isValidGeminiKeyFormat(stored)) {
          return stored;
        }
      }
    } catch {
      // ignore Firestore lookup failure
    }
  }
  return "";
}

async function fetchAdminConfigDocs() {
  const now = Date.now();
  if (cachedDocs && now - cachedAt < CACHE_TTL_MS) {
    return cachedDocs;
  }
  try {
    const snap = await Promise.race([
      adminDb.collection("adminConfig").get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 2500)),
    ]);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cachedDocs = docs;
    cachedAt = now;
    return docs;
  } catch {
    return cachedDocs || [];
  }
}

function extractKeysFromDoc(doc) {
  const keys = [];
  if (Array.isArray(doc?.api_keys)) {
    for (const k of doc.api_keys) {
      if (typeof k === "string" && k.trim()) keys.push(k.trim());
    }
  }
  if (typeof doc?.api_key === "string" && doc.api_key.trim()) {
    for (const part of doc.api_key.split(/[\n,;]+/)) {
      if (part.trim()) keys.push(part.trim());
    }
  }
  return keys;
}

export async function getAdminTranscribeKeys(userContext = {}) {
  const userKey = await extractUserGeminiKey(userContext);
  const mode = String(
    userContext?.body?.ai_key_preference ||
      userContext?.event?.headers?.["x-user-gemini-mode"] ||
      "auto_fallback",
  );

  if (mode === "user_only" && userKey) {
    return [userKey];
  }

  const docs = await fetchAdminConfigDocs();
  const active = docs
    .filter((d) => d.is_active !== false)
    .filter(
      (d) =>
        d.purpose === "lecture_transcribe" ||
        d.purpose === "all" ||
        d.provider === "gemini" ||
        d.protocol === "gemini",
    )
    .sort((a, b) => Number(a.priority ?? 99) - Number(b.priority ?? 99));

  const keys = [];
  if (userKey) {
    keys.push(userKey);
  }
  for (const doc of active) {
    for (const k of extractKeysFromDoc(doc)) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  return keys;
}

export async function getAdminOrganizerConfig(userContext = {}) {
  const userKey = await extractUserGeminiKey(userContext);
  const mode = String(
    userContext?.body?.ai_key_preference ||
      userContext?.event?.headers?.["x-user-gemini-mode"] ||
      "auto_fallback",
  );

  if (mode === "user_only" && userKey) {
    return { apiKeys: [userKey], baseUrl: null, model: null };
  }

  const docs = await fetchAdminConfigDocs();
  const active = docs
    .filter((d) => d.is_active !== false)
    .filter(
      (d) =>
        d.purpose === "lecture_organize" ||
        d.provider === "codecraft" ||
        d.provider === "deepseek" ||
        (d.purpose === "all" && d.protocol === "openai"),
    )
    .sort((a, b) => Number(a.priority ?? 99) - Number(b.priority ?? 99));

  const keys = [];
  if (userKey) {
    keys.push(userKey);
  }
  let baseUrl = null;
  let model = null;
  for (const doc of active) {
    if (!baseUrl && doc.base_url) baseUrl = doc.base_url;
    if (!model && doc.selected_model && doc.purpose === "lecture_organize") {
      model = doc.selected_model;
    }
    for (const k of extractKeysFromDoc(doc)) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  return { apiKeys: keys, baseUrl, model };
}
