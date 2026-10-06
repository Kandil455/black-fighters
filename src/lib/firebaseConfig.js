/**
 * firebaseConfig.js — pure validation of the Firebase client config.
 *
 * Why this exists: when any VITE_FIREBASE_* var is missing, Firebase's own
 * error is a generic `auth/invalid-api-key` at init time, which reads as an
 * auth problem when it's actually a build-environment problem. This module
 * detects missing/placeholder values up front and reports the EXACT variable
 * names to set, so the fix is one console read away.
 *
 * Pure and DOM-free — unit-tested in tests/unit/firebaseConfig.test.mjs.
 */

export const FIREBASE_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const PLACEHOLDER_HINTS = [
  "your-", "changeme", "change-me", "xxx", "todo", "placeholder", "<", "delete-me",
];

function isMissingOrPlaceholder(value) {
  if (typeof value !== "string") return true;
  const v = value.trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  return PLACEHOLDER_HINTS.some((hint) => lower.includes(hint));
}

/**
 * @param {Record<string, string|undefined>} env - e.g. import.meta.env
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateFirebaseConfig(env) {
  const source = env || {};
  const missing = FIREBASE_ENV_VARS.filter((key) =>
    isMissingOrPlaceholder(source[key])
  );
  return { ok: missing.length === 0, missing };
}

/**
 * Human-readable, actionable warning message for the missing vars.
 */
export function firebaseConfigWarning(missing) {
  return [
    "Firebase client config is incomplete — auth/firestore will NOT work.",
    `Missing or placeholder Vite env vars (${missing.length}):`,
    ...missing.map((k) => `  • ${k}`),
    "Fix: create a .env file in the project root (see .env.example) or set",
    "them in your hosting provider's build environment, then rebuild.",
  ].join("\n");
}
