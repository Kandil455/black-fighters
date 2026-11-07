/**
 * LECTURE_CONFIG — single source of truth for the transcription pipeline.
 *
 * Every number here was MEASURED against the live API on 30 Oct 2026:
 *   • gemini-3.5-transcribe exists, inputTokenLimit 98304, outputTokenLimit 32768
 *   • audio cost ≈ 10 tokens/second (194 tokens for 20s)
 *   • Free tier RPM = 3 (8 rapid calls → 3 ok, 5 × HTTP 429)
 *   • 21s spacing → clean runs (6 calls, 5 clean, first polluted by burst)
 *
 * Free-tier only (owner decision). Switching to paid = change GEMINI_RPM_LIMIT
 * and GLOBAL_MIN_SPACING_MS; no other code changes.
 *
 * This module is imported by BOTH browser and server code, so it must stay
 * dependency-free (no firebase, no node builtins).
 */
export const LECTURE_CONFIG = Object.freeze({
  // ── Model (verified live; do not add fallbacks — owner rule N1) ──────────
  TRANSCRIBE_MODEL: "gemini-3.5-transcribe",
  TRANSCRIBE_MODE: "VERBATIM", // SMART rewrites speech; we never want that
  GEMINI_API_BASE: "https://generativelanguage.googleapis.com/v1beta",
  LANGUAGE_CODES: Object.freeze(["ar-EG", "en-US"]),
  CUSTOM_VOCAB_ENABLED: true,

  // ── Audio format ─────────────────────────────────────────────────────────
  AUDIO_SAMPLE_RATE: 16_000,
  AUDIO_CHANNELS: 1,
  AUDIO_BITRATE: "32k",

  // ── Rate control (Free tier = 3 RPM, measured) ───────────────────────────
  GEMINI_RPM_LIMIT: 3,
  GEMINI_RPD_GUARD: null,
  GLOBAL_MIN_SPACING_MS: 21_000, // 60s / 3 = 20s + 1s safety margin
  GLOBAL_MAX_INFLIGHT: 1,
  USER_MAX_INFLIGHT: 1,
  USER_MAX_ACTIVE_JOBS: 1,
  USER_MAX_MINUTES_PER_DAY: 240,
  USER_MAX_STORED_LECTURES: 50,

  // ── Chunking ─────────────────────────────────────────────────────────────
  CHUNK_TARGET_SEC: 600, // 10 minutes — 12 chunks for a 2h lecture
  CHUNK_MIN_SEC: 360,
  CHUNK_MAX_SEC: 780,
  SPLIT_SEARCH_WINDOW_SEC: 60,
  HARD_CUT_OVERLAP_SEC: 4,
  CHUNK_OVERLAP_SEC: 4, // trimmed during finalize to avoid duplicated words
  SILENCE_NOISE_DB: -32,
  SILENCE_MIN_SEC: 0.6,
  MAX_JOB_DURATION_SEC: 4 * 60 * 60,
  MAX_AUDIO_SEC: 4 * 60 * 60,
  MAX_FILE_BYTES: 2 * 1024 ** 3,
  MAX_AUDIO_BYTES: 2 * 1024 ** 3,

  // ── Retries / leases ─────────────────────────────────────────────────────
  MAX_ATTEMPTS_PER_CHUNK: 5,
  EMPTY_RESPONSE_RETRIES: 2,
  // How many times one chunk may sit through a full RPM window before it is
  // reported as failed. A 429 is a scheduling problem, not a chunk failure.
  MAX_RATE_LIMIT_WAITS: 6,
  BACKOFF_BASE_MS: 2_000,
  BACKOFF_MAX_MS: 60_000,
  BACKOFF_JITTER: 0.25,
  JITTER: 0.25,
  LEASE_SEC: 150,
  RETENTION_AUDIO_CHUNKS_HOURS: 24,

  // ── Sentence segmentation ────────────────────────────────────────────────
  SEGMENT_MAX_WORDS: 45,
  SENTENCE_PAGE_SIZE: 300,

  // ── DeepSeek organization ────────────────────────────────────────────────
  CODECRAFT_BASE_URL: "https://codecraftapi.com/v1",
  ORGANIZE_MODEL: "deepseek-v4-flash-0731",
  ORGANIZE_WINDOW_WORDS: 1_500,
  ORGANIZE_WINDOW_MIN_WORDS: 900,
  ORGANIZE_WINDOW_MAX_WORDS: 2_200,
  ORGANIZE_MAX_ATTEMPTS: 3,

  // ── Template density thresholds (words) — extensible templates ───────────
  DENSITY_MICRO_MAX: 60,
  DENSITY_COMPACT_MAX: 600,
  DENSITY_STANDARD_MAX: 2_500,
  DENSITY_RICH_MAX: 8_000,
  SECTIONS_MIN: 3,
  SECTIONS_MAX: 12,
  WORDS_PER_SECTION: 700,

  // ── Pricing (never hard-code a price in a component) ─────────────────────
  CREDITS_PER_AUDIO_MINUTE: 1,
  CREDITS_SUMMARY: 2,
  CREDITS_STUDY_NOTES: 2,

  // ── Feature flag ─────────────────────────────────────────────────────────
  FEATURE_FLAG: "lectures",
  FEATURE_LECTURES: true,
  SCHEMA_VERSION: 1,
});

/** Estimated wall-clock seconds to transcribe `chunkCount` chunks on Free tier. */
export function estimateTranscribeSeconds(chunkCount, { queueAhead = 0 } = {}) {
  const spacing = LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS / 1000;
  const total = Math.max(0, Number(chunkCount) || 0) + Math.max(0, Number(queueAhead) || 0);
  // First call fires immediately, each subsequent one waits the spacing.
  return Math.max(0, total - 1) * spacing + 20;
}

/** How many chunks a duration maps to. */
export function planChunkCount(durationSec) {
  const target = LECTURE_CONFIG.CHUNK_TARGET_SEC;
  return Math.max(1, Math.ceil((Number(durationSec) || 0) / target));
}

/** Credit quote for a lecture duration. */
export function quoteLectureCredits(durationSec) {
  const minutes = Math.ceil((Number(durationSec) || 0) / 60);
  return Math.max(1, minutes * LECTURE_CONFIG.CREDITS_PER_AUDIO_MINUTE);
}

/** Human readable ETA in Arabic. */
export function formatEtaAr(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return rest ? `${m} دقيقة و${rest} ثانية` : `${m} دقيقة`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} ساعة و${rm} دقيقة` : `${h} ساعة`;
}

export default LECTURE_CONFIG;
