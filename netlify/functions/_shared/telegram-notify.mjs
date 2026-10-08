/**
 * telegram-notify.mjs — proactive-message policy for the platform → student path.
 *
 * Telegram v5 specified a budget (max 2/day, quiet hours, per-type opt-out,
 * auto-downgrade to a weekly digest after 5 ignored messages). All of it shipped
 * as a class that kept its state in a module-level Map — i.e. it reset on every
 * cold start and was never called from the live path, so in production the bot
 * could message a student as often as the platform liked, at any hour.
 *
 * State now lives in `telegram_notify_state/{uid}` (server-only) so the budget
 * survives restarts and is shared across instances.
 */

import { adminDb } from "./firebase-admin.mjs";

const COLLECTION = "telegram_notify_state";
const MAX_DAILY = 2;
const QUIET_START_HOUR = 23;
const QUIET_END_HOUR = 7;
const IGNORED_BEFORE_DIGEST = 5;

export const NOTIFICATION_TYPES = ["review_due", "summary_ready", "quiz_graded", "payment", "streak"];

const stateRef = (uid) => adminDb.collection(COLLECTION).doc(String(uid));

function defaultState() {
  return { daily_counts: {}, opted_out_types: [], consecutive_ignored: 0, mode: "normal" };
}

export function isQuietHour(localHour, startHour = QUIET_START_HOUR, endHour = QUIET_END_HOUR) {
  const hour = Number(localHour);
  if (!Number.isFinite(hour)) return false;
  return hour >= startHour || hour < endHour;
}

async function readState(uid) {
  try {
    const snap = await stateRef(uid).get();
    if (!snap.exists) return defaultState();
    return { ...defaultState(), ...(snap.data() || {}) };
  } catch (err) {
    console.warn("[telegram-notify] state read failed:", err.message);
    return defaultState();
  }
}

/** User preferences set from the web settings panel. */
export async function getNotificationPrefs(uid) {
  try {
    const snap = await adminDb.collection("users").doc(String(uid)).get();
    const prefs = snap.data()?.telegram_notifications || {};
    return {
      enabled: prefs.enabled !== false,
      quietStartHour: Number.isFinite(Number(prefs.quietStartHour)) ? Number(prefs.quietStartHour) : QUIET_START_HOUR,
      quietEndHour: Number.isFinite(Number(prefs.quietEndHour)) ? Number(prefs.quietEndHour) : QUIET_END_HOUR,
      types: prefs.types && typeof prefs.types === "object" ? prefs.types : {},
    };
  } catch {
    return { enabled: true, quietStartHour: QUIET_START_HOUR, quietEndHour: QUIET_END_HOUR, types: {} };
  }
}

/**
 * Decides whether a proactive message may be sent right now.
 *
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function evaluateNotification({
  uid,
  type = "review_due",
  localHour = new Date().getHours(),
  dateKey = new Date().toISOString().slice(0, 10),
  explicitlyRequested = false,
}) {
  if (!uid) return { allowed: false, reason: "MISSING_UID" };

  const prefs = await getNotificationPrefs(uid);
  if (!prefs.enabled) return { allowed: false, reason: "USER_DISABLED" };
  if (prefs.types?.[type] === false) return { allowed: false, reason: "OPTED_OUT_OF_TYPE" };

  // Direct replies to something the student just did are never budget-limited.
  if (explicitlyRequested) return { allowed: true };

  const state = await readState(uid);
  if ((state.opted_out_types || []).includes(type)) {
    return { allowed: false, reason: "OPTED_OUT_OF_TYPE" };
  }
  if (Number(state.consecutive_ignored || 0) >= IGNORED_BEFORE_DIGEST && state.mode !== "normal") {
    return { allowed: false, reason: "DOWNGRADED_TO_WEEKLY_DIGEST" };
  }
  if (isQuietHour(localHour, prefs.quietStartHour, prefs.quietEndHour)) {
    return { allowed: false, reason: "QUIET_HOURS_ACTIVE" };
  }
  const sentToday = Number(state.daily_counts?.[dateKey] || 0);
  if (sentToday >= MAX_DAILY) {
    return { allowed: false, reason: "DAILY_BUDGET_EXHAUSTED", sentToday };
  }
  return { allowed: true, sentToday };
}

/** Must be called after a message is actually queued, not before. */
export async function recordNotificationSent({ uid, dateKey = new Date().toISOString().slice(0, 10) }) {
  if (!uid) return;
  const state = await readState(uid);
  const daily = { ...(state.daily_counts || {}) };
  daily[dateKey] = Number(daily[dateKey] || 0) + 1;
  // Keep the document from growing without bound: 7 days is plenty.
  const keep = Object.keys(daily).sort().slice(-7);
  const trimmed = Object.fromEntries(keep.map((k) => [k, daily[k]]));
  try {
    await stateRef(uid).set({ daily_counts: trimmed, updated_at: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn("[telegram-notify] could not record send:", err.message);
  }
}

/** Inline "🔕 mute this type" button (previously emitted with no handler). */
export async function optOutOfType({ uid, type }) {
  if (!uid || !type) return { ok: false, error: "MISSING_ARGS" };
  const state = await readState(uid);
  const types = new Set(state.opted_out_types || []);
  types.add(type);
  try {
    await stateRef(uid).set(
      { opted_out_types: [...types], updated_at: new Date().toISOString() },
      { merge: true },
    );
    // Mirror into the user document so the web panel shows the same truth.
    const userSnap = await adminDb.collection("users").doc(String(uid)).get();
    const prefs = userSnap.data()?.telegram_notifications || {};
    await adminDb.collection("users").doc(String(uid)).set(
      { telegram_notifications: { ...prefs, types: { ...(prefs.types || {}), [type]: false } } },
      { merge: true },
    );
    return { ok: true, type };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Records an ignored (un-opened) proactive message; drives the digest downgrade. */
export async function recordIgnored(uid) {
  if (!uid) return null;
  const state = await readState(uid);
  const ignored = Number(state.consecutive_ignored || 0) + 1;
  const mode = ignored >= IGNORED_BEFORE_DIGEST ? "weekly_digest" : "normal";
  try {
    await stateRef(uid).set({ consecutive_ignored: ignored, mode, updated_at: new Date().toISOString() }, { merge: true });
  } catch {
    /* best effort */
  }
  return { consecutiveIgnored: ignored, mode };
}

export const NOTIFY_LIMITS = {
  maxDaily: MAX_DAILY,
  quietStartHour: QUIET_START_HOUR,
  quietEndHour: QUIET_END_HOUR,
  ignoredBeforeDigest: IGNORED_BEFORE_DIGEST,
};
