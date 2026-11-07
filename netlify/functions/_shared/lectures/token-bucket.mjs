/**
 * netlify/functions/_shared/lectures/token-bucket.mjs — Pure & Firestore-backed
 * token bucket rate limiter + inflight lease manager (Section 8.3).
 *
 * Pure state transitions (`stepTokenBucket`, `stepInflightLeases`) are exported
 * so unit tests can verify bursts, refills, daily guards, retryAfterMs accuracy,
 * and lease expiry with a fake clock.
 */
import { LECTURE_CONFIG } from "./config.mjs";

export function utcDayKey(nowMs = Date.now()) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Pure token-bucket step (Section 8.3):
 *   capacity = max(1, min(GEMINI_RPM_LIMIT, 3))
 *   refill rate = GEMINI_RPM_LIMIT / 60000 ms
 *
 * Also enforces `GLOBAL_MIN_SPACING_MS` when `minSpacingMs` is set (Free tier 21s spacing).
 */
export function stepTokenBucket(
  state = {},
  nowMs = Date.now(),
  {
    rpmLimit = LECTURE_CONFIG.GEMINI_RPM_LIMIT,
    rpdGuard = LECTURE_CONFIG.GEMINI_RPD_GUARD,
    minSpacingMs = 0,
  } = {},
) {
  const capacity = Math.max(1, Math.min(Number(rpmLimit) || 3, 3));
  const ratePerMs = (Number(rpmLimit) || 3) / 60_000;
  const today = utcDayKey(nowMs);

  const prevDayKey = state.dayKey || today;
  const prevDayCount = prevDayKey === today ? Number(state.dayCount || 0) : 0;

  // Daily guard check
  if (rpdGuard != null && Number.isFinite(Number(rpdGuard)) && prevDayCount >= Number(rpdGuard)) {
    return {
      allowed: false,
      quotaDay: true,
      retryAfterMs: 60_000,
      nextState: {
        tokens: state.tokens ?? capacity,
        updatedAtMs: nowMs,
        lastFiredAtMs: state.lastFiredAtMs || 0,
        dayKey: today,
        dayCount: prevDayCount,
      },
    };
  }

  const prevUpdatedAt = state.updatedAtMs != null ? Number(state.updatedAtMs) : nowMs;
  const prevTokens = state.tokens != null ? Number(state.tokens) : capacity;
  const elapsedMs = Math.max(0, nowMs - prevUpdatedAt);
  const refilled = Math.min(capacity, prevTokens + elapsedMs * ratePerMs);

  // Optional spacing check
  const lastFired = Number(state.lastFiredAtMs || 0);
  if (minSpacingMs > 0 && lastFired > 0 && nowMs - lastFired < minSpacingMs) {
    const spacingWait = Math.ceil(minSpacingMs - (nowMs - lastFired));
    return {
      allowed: false,
      quotaDay: false,
      retryAfterMs: spacingWait,
      nextState: {
        tokens: refilled,
        updatedAtMs: nowMs,
        lastFiredAtMs: lastFired,
        dayKey: today,
        dayCount: prevDayCount,
      },
    };
  }

  if (refilled >= 1) {
    return {
      allowed: true,
      quotaDay: false,
      retryAfterMs: 0,
      nextState: {
        tokens: refilled - 1,
        updatedAtMs: nowMs,
        lastFiredAtMs: nowMs,
        dayKey: today,
        dayCount: prevDayCount + 1,
      },
    };
  }

  const retryAfterMs = Math.ceil((1 - refilled) / ratePerMs);
  return {
    allowed: false,
    quotaDay: false,
    retryAfterMs,
    nextState: {
      tokens: refilled,
      updatedAtMs: nowMs,
      lastFiredAtMs: lastFired,
      dayKey: today,
      dayCount: prevDayCount,
    },
  };
}

/**
 * Pure inflight lease manager (Section 8.2 step 4):
 * Prunes expired leases, checks `GLOBAL_MAX_INFLIGHT` and `USER_MAX_INFLIGHT`,
 * and acquires a new lease if allowed.
 */
export function stepInflightLeases(
  leasesMap = {},
  {
    uid,
    leaseId,
    nowMs = Date.now(),
    leaseSec = LECTURE_CONFIG.LEASE_SEC,
    globalMax = LECTURE_CONFIG.GLOBAL_MAX_INFLIGHT,
    userMax = LECTURE_CONFIG.USER_MAX_INFLIGHT,
  } = {},
) {
  const active = {};
  let globalCount = 0;
  let userCount = 0;

  for (const [id, entry] of Object.entries(leasesMap || {})) {
    if (!entry || Number(entry.expiresAtMs || 0) <= nowMs) continue;
    active[id] = entry;
    globalCount += 1;
    if (entry.uid === uid) userCount += 1;
  }

  if (globalCount >= globalMax || userCount >= userMax) {
    const jitterMs = 1_000 + Math.floor(Math.random() * 2_000);
    return {
      acquired: false,
      retryAfterMs: jitterMs,
      leases: active,
      globalCount,
      userCount,
    };
  }

  const newLeaseId = leaseId || `lease_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
  active[newLeaseId] = {
    uid,
    expiresAtMs: nowMs + leaseSec * 1000,
  };

  return {
    acquired: true,
    leaseId: newLeaseId,
    retryAfterMs: 0,
    leases: active,
    globalCount: globalCount + 1,
    userCount: userCount + 1,
  };
}

export function releaseInflightLease(leasesMap = {}, leaseId) {
  const copy = { ...(leasesMap || {}) };
  delete copy[leaseId];
  return copy;
}

export default {
  utcDayKey,
  stepTokenBucket,
  stepInflightLeases,
  releaseInflightLease,
};
