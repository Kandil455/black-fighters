/**
 * netlify/functions/_shared/lectures/validator.mjs — Result validation & error classification (Section 8.4 & 8.5).
 *
 * Pure module so it can be unit-tested with mocked clocks and payloads.
 */
import { LECTURE_CONFIG } from "./config.mjs";

const ARABIC_OR_LATIN_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFA-Za-z]/;

/**
 * Detect if a 6-word sequence repeats more than 8 times in a row.
 */
export function hasRepetitionLoop(text, { seqLen = 6, maxRepeats = 8 } = {}) {
  const words = String(text || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < seqLen * (maxRepeats + 1)) return false;

  for (let start = 0; start <= words.length - seqLen * (maxRepeats + 1); start += 1) {
    const pattern = words.slice(start, start + seqLen).join(" ");
    let repeats = 1;
    let cursor = start + seqLen;
    while (cursor + seqLen <= words.length) {
      const next = words.slice(cursor, cursor + seqLen).join(" ");
      if (next === pattern) {
        repeats += 1;
        if (repeats > maxRepeats) return true;
        cursor += seqLen;
      } else {
        break;
      }
    }
  }
  return false;
}

/**
 * Validate a transcription result per Section 8.4:
 *   • Empty or whitespace text -> { valid: false, reason: 'EMPTY_RESPONSE', retryable: true }
 *   • Text with no Arabic and no Latin letters -> { valid: false, reason: 'NO_SPEECH_LETTERS', retryable: true }
 *   • finishReason === 'MAX_TOKENS' -> { valid: true, quality: 'truncated', appendGapMarker: true }
 *   • Other non-STOP finishReason -> { valid: false, reason: `FINISH_${finishReason}`, retryable: true }
 *   • Density: wpm < 20 while silenceRatio < 0.6 -> { valid: true, quality: 'low', retryRecommended: true, reason: 'LOW_DENSITY' }
 *   • Density: wpm > 260 or 6-word sequence > 8 repeats -> { valid: true, quality: 'low', retryRecommended: true, reason: 'REPETITION_LOOP' }
 */
export function validateTranscriptResult({
  text,
  finishReason = "STOP",
  durationSec = 600,
  silenceRatio = 0,
}) {
  const clean = String(text || "").trim();
  if (!clean) {
    return {
      valid: false,
      retryable: true,
      reason: "EMPTY_RESPONSE",
      quality: "low",
      wordCount: 0,
      wordsPerMinute: 0,
    };
  }

  if (!ARABIC_OR_LATIN_RE.test(clean)) {
    return {
      valid: false,
      retryable: true,
      reason: "NO_SPEECH_LETTERS",
      quality: "low",
      wordCount: 0,
      wordsPerMinute: 0,
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(0.1, Number(durationSec || 60) / 60);
  const wordsPerMinute = Math.round((wordCount / minutes) * 10) / 10;

  if (finishReason === "MAX_TOKENS") {
    return {
      valid: true,
      retryable: false,
      quality: "truncated",
      appendGapMarker: true,
      reason: "MAX_TOKENS",
      wordCount,
      wordsPerMinute,
    };
  }

  if (finishReason && finishReason !== "STOP") {
    return {
      valid: false,
      retryable: true,
      reason: `FINISH_${finishReason}`,
      quality: "low",
      wordCount,
      wordsPerMinute,
    };
  }

  if (wordsPerMinute > 260 || hasRepetitionLoop(clean)) {
    return {
      valid: true,
      retryable: false,
      retryRecommended: true,
      quality: "low",
      reason: "REPETITION_LOOP",
      wordCount,
      wordsPerMinute,
    };
  }

  if (wordsPerMinute < 20 && Number(silenceRatio || 0) < 0.6) {
    return {
      valid: true,
      retryable: false,
      retryRecommended: true,
      quality: "low",
      reason: "LOW_DENSITY",
      wordCount,
      wordsPerMinute,
    };
  }

  return {
    valid: true,
    retryable: false,
    retryRecommended: false,
    quality: "ok",
    reason: null,
    wordCount,
    wordsPerMinute,
  };
}

/**
 * Classify an HTTP or network error from Gemini per Section 8.5.
 *
 * @param {{ status?: number, message?: string, retryAfterSec?: number, consecutive429s?: number }} err
 */
export function classifyTranscribeError({
  status = 0,
  message = "",
  retryAfterSec = 0,
  consecutive429s = 0,
  attempt = 1,
} = {}) {
  const msg = String(message || "");

  if (status === 401 || status === 403) {
    return {
      category: "service_unavailable",
      action: "abort_job",
      retryable: false,
      countsAsAttempt: false,
      raiseAdminAlert: true,
      retryAfterMs: 0,
    };
  }

  if (status === 429) {
    const counts = Number(consecutive429s) + 1 >= 3;
    const retryAfterMs =
      retryAfterSec > 0
        ? retryAfterSec * 1000
        : Math.max(LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS, computeBackoffMs(attempt));
    return {
      category: "rate_limited",
      action: "wait",
      retryable: true,
      countsAsAttempt: counts,
      retryAfterMs,
    };
  }

  if (status === 400 && /Thinking is not enabled/i.test(msg)) {
    return {
      category: "thinking_not_enabled",
      action: "retry",
      retryable: true,
      countsAsAttempt: true,
      retryAfterMs: computeBackoffMs(attempt),
    };
  }

  if (status === 400) {
    return {
      category: "bad_request",
      action: "fail_chunk",
      retryable: false,
      countsAsAttempt: true,
      retryAfterMs: 0,
    };
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 0 ||
    /timeout|network|fetch|ECONN|ABORT/i.test(msg)
  ) {
    return {
      category: "transient_upstream",
      action: "retry",
      retryable: true,
      countsAsAttempt: true,
      retryAfterMs: computeBackoffMs(attempt),
    };
  }

  return {
    category: "unknown_error",
    action: "retry",
    retryable: true,
    countsAsAttempt: true,
    retryAfterMs: computeBackoffMs(attempt),
  };
}

export function computeBackoffMs(attempt = 1, rand = Math.random) {
  const base = Math.min(
    LECTURE_CONFIG.BACKOFF_MAX_MS,
    LECTURE_CONFIG.BACKOFF_BASE_MS * 2 ** Math.max(0, Number(attempt) - 1),
  );
  const jitter = base * LECTURE_CONFIG.BACKOFF_JITTER * rand();
  return Math.round(base + jitter);
}

export default {
  hasRepetitionLoop,
  validateTranscriptResult,
  classifyTranscribeError,
  computeBackoffMs,
};
