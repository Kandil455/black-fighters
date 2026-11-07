/**
 * admin-keys.mjs — Server-side helper to load dynamic AI keys & custom provider
 * settings saved by the Admin in Firestore `adminConfig`, with safe try/catch
 * and a 30-second in-memory cache so server endpoints never fail if Firestore
 * is unreachable or in offline tests.
 */
import { adminDb } from "../firebase-admin.mjs";

let cachedDocs = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

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

export async function getAdminTranscribeKeys() {
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
  for (const doc of active) {
    for (const k of extractKeysFromDoc(doc)) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  return keys;
}

export async function getAdminOrganizerConfig() {
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
