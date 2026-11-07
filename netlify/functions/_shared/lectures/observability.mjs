/**
 * netlify/functions/_shared/lectures/observability.mjs — Rolling 100-chunk health
 * metrics, self-protection degraded mode (Section 15.3 & 15.4), and privacy-safe usage log.
 */

export const MAX_METRICS_HISTORY = 100;
export const DEGRADED_WINDOW_SIZE = 50;
export const DEGRADED_EMPTY_RATE_THRESHOLD = 0.05; // > 5%
export const DEGRADED_CONSECUTIVE_5XX_THRESHOLD = 10; // > 10 consecutive 5xx

/**
 * Pure state machine step for rolling chunk observability & self-protection (Section 15.4).
 *
 * @param {object} prevState - stored on `system/lectures_rate_limit`
 * @param {{
 *   latencyMs?: number,
 *   empty?: boolean,
 *   retried?: boolean,
 *   failed?: boolean,
 *   status5xx?: boolean,
 *   nowMs?: number
 * }} sample
 */
export function stepObservabilityMetrics(prevState = {}, sample = {}) {
  const nowMs = Number(sample.nowMs) || Date.now();
  const prevHistory = Array.isArray(prevState.recentChunks) ? prevState.recentChunks : [];

  const entry = {
    at: nowMs,
    latencyMs: Math.max(0, Number(sample.latencyMs) || 0),
    empty: Boolean(sample.empty),
    retried: Boolean(sample.retried),
    failed: Boolean(sample.failed),
    status5xx: Boolean(sample.status5xx),
  };

  const recentChunks = [...prevHistory, entry].slice(-MAX_METRICS_HISTORY);
  const consecutive5xx = entry.status5xx ? (Number(prevState.consecutive5xx) || 0) + 1 : 0;

  // Evaluate over last 50 chunks
  const window50 = recentChunks.slice(-DEGRADED_WINDOW_SIZE);
  const count50 = window50.length;
  const emptyCount50 = window50.filter((c) => c.empty).length;
  const emptyRate50 = count50 > 0 ? emptyCount50 / count50 : 0;

  const total100 = recentChunks.length;
  const retryRate100 = total100 > 0 ? recentChunks.filter((c) => c.retried).length / total100 : 0;
  const failureRate100 = total100 > 0 ? recentChunks.filter((c) => c.failed).length / total100 : 0;
  const avgLatencyMs100 =
    total100 > 0
      ? Math.round(recentChunks.reduce((sum, c) => sum + c.latencyMs, 0) / total100)
      : 0;

  // Trigger degraded mode if empty rate over last 50 chunks > 5% (with at least 20 samples)
  // OR consecutive 5xx > 10
  const triggerByEmptyRate = count50 >= 20 && emptyRate50 > DEGRADED_EMPTY_RATE_THRESHOLD;
  const triggerBy5xx = consecutive5xx > DEGRADED_CONSECUTIVE_5XX_THRESHOLD;

  let degraded = Boolean(prevState.degraded);
  if (triggerByEmptyRate || triggerBy5xx) {
    degraded = true;
  } else if (degraded && emptyRate50 <= DEGRADED_EMPTY_RATE_THRESHOLD && consecutive5xx <= 2) {
    degraded = false;
  }

  return {
    nextState: {
      ...prevState,
      recentChunks,
      consecutive5xx,
      degraded,
      effectiveMaxInflight: degraded ? 1 : prevState.effectiveMaxInflight || 1,
      stats: {
        sampleCount: total100,
        avgLatencyMs100,
        emptyRate50: Number(emptyRate50.toFixed(4)),
        retryRate100: Number(retryRate100.toFixed(4)),
        failureRate100: Number(failureRate100.toFixed(4)),
        consecutive5xx,
        degraded,
        bannerKey: degraded ? "service_degraded" : null,
        bannerAr: degraded ? "التفريغ شغال ببطء حاليًا، هنكمل تلقائي" : null,
      },
    },
    degraded,
    stats: {
      sampleCount: total100,
      avgLatencyMs100,
      emptyRate50: Number(emptyRate50.toFixed(4)),
      retryRate100: Number(retryRate100.toFixed(4)),
      failureRate100: Number(failureRate100.toFixed(4)),
      consecutive5xx,
      degraded,
    },
  };
}

/**
 * Build a privacy-safe `usage_log` document (Section 15.1):
 * strictly metadata (`uid`, `lectureId`, `audioSeconds`, `credits`, `geminiTokens`, `deepseekTokens`, `at`)
 * with zero user audio or transcript content.
 */
export function buildUsageLogEntry({
  uid,
  lectureId,
  audioSeconds = 0,
  credits = 0,
  geminiTokens = 0,
  deepseekTokens = 0,
  at = new Date().toISOString(),
} = {}) {
  return {
    uid: String(uid || ""),
    lectureId: String(lectureId || ""),
    audioSeconds: Math.max(0, Math.round(Number(audioSeconds) || 0)),
    credits: Math.max(0, Number(credits) || 0),
    geminiTokens: Math.max(0, Math.round(Number(geminiTokens) || 0)),
    deepseekTokens: Math.max(0, Math.round(Number(deepseekTokens) || 0)),
    at,
  };
}

export default {
  stepObservabilityMetrics,
  buildUsageLogEntry,
};
