import assert from "node:assert/strict";
import test from "node:test";

import {
  stepTokenBucket,
  stepInflightLeases,
  releaseInflightLease,
  utcDayKey,
} from "../../netlify/functions/_shared/lectures/token-bucket.mjs";
import {
  validateTranscriptResult,
  classifyTranscribeError,
  hasRepetitionLoop,
} from "../../netlify/functions/_shared/lectures/validator.mjs";
import { createMockGeminiAdapter } from "../../netlify/functions/_shared/lectures/mock-adapter.mjs";

test("stepTokenBucket: enforces 3 RPM burst, spacing, refill, and accurate retryAfterMs with fake clock", () => {
  let state = {};
  let now = 1_000_000;

  // First request allowed immediately
  const r1 = stepTokenBucket(state, now, { rpmLimit: 3, minSpacingMs: 21_000 });
  assert.equal(r1.allowed, true);
  state = r1.nextState;

  // Second request 5s later blocked by 21s spacing
  const r2 = stepTokenBucket(state, now + 5_000, { rpmLimit: 3, minSpacingMs: 21_000 });
  assert.equal(r2.allowed, false);
  assert.equal(r2.retryAfterMs, 16_000);

  // Advance 21s -> allowed
  now += 21_000;
  const r3 = stepTokenBucket(state, now, { rpmLimit: 3, minSpacingMs: 21_000 });
  assert.equal(r3.allowed, true);
  state = r3.nextState;

  // Test pure token depletion without spacing guard
  let bState = { tokens: 1, updatedAtMs: now, dayKey: utcDayKey(now), dayCount: 0 };
  const b1 = stepTokenBucket(bState, now, { rpmLimit: 3, minSpacingMs: 0 });
  assert.equal(b1.allowed, true);
  assert.equal(b1.nextState.tokens, 0);

  const b2 = stepTokenBucket(b1.nextState, now, { rpmLimit: 3, minSpacingMs: 0 });
  assert.equal(b2.allowed, false);
  assert.equal(b2.retryAfterMs, 20_000); // 1 token at 3/60000ms = 20000ms

  // After 20s, token refills
  const b3 = stepTokenBucket(b1.nextState, now + 20_000, { rpmLimit: 3, minSpacingMs: 0 });
  assert.equal(b3.allowed, true);
});

test("stepTokenBucket: enforces daily guard (RPD) and resets on new UTC day", () => {
  const day1 = Date.parse("2026-10-31T10:00:00Z");
  const state = { tokens: 3, updatedAtMs: day1, dayKey: "2026-10-31", dayCount: 50 };

  const blocked = stepTokenBucket(state, day1 + 1000, { rpmLimit: 3, rpdGuard: 50 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.quotaDay, true);

  // Next UTC day resets dayCount
  const day2 = Date.parse("2026-11-01T00:01:00Z");
  const reset = stepTokenBucket(state, day2, { rpmLimit: 3, rpdGuard: 50 });
  assert.equal(reset.allowed, true);
  assert.equal(reset.nextState.dayCount, 1);
});

test("stepInflightLeases: enforces global and per-user concurrency and prunes expired leases", () => {
  const now = 5_000_000;
  let leases = {};

  const s1 = stepInflightLeases(leases, { uid: "u1", nowMs: now, leaseSec: 150, globalMax: 1, userMax: 1 });
  assert.equal(s1.acquired, true);
  leases = s1.leases;

  // Second caller blocked while lease is active
  const s2 = stepInflightLeases(leases, { uid: "u2", nowMs: now + 10_000, leaseSec: 150, globalMax: 1, userMax: 1 });
  assert.equal(s2.acquired, false);
  assert.ok(s2.retryAfterMs >= 1000 && s2.retryAfterMs <= 3000);

  // After 151s, lease expires and is pruned automatically
  const s3 = stepInflightLeases(leases, { uid: "u2", nowMs: now + 151_000, leaseSec: 150, globalMax: 1, userMax: 1 });
  assert.equal(s3.acquired, true);
  assert.equal(s3.globalCount, 1);

  // Explicit release
  const afterRelease = releaseInflightLease(s3.leases, s3.leaseId);
  assert.equal(Object.keys(afterRelease).length, 0);
});

test("validateTranscriptResult: checks empty, no-letters, MAX_TOKENS, low density, and repetition loops", () => {
  assert.equal(validateTranscriptResult({ text: "   " }).valid, false);
  assert.equal(validateTranscriptResult({ text: "   " }).reason, "EMPTY_RESPONSE");

  assert.equal(validateTranscriptResult({ text: "12345 67890 !!!" }).valid, false);
  assert.equal(validateTranscriptResult({ text: "12345 67890 !!!" }).reason, "NO_SPEECH_LETTERS");

  const trunc = validateTranscriptResult({
    text: "المريض عنده ألم في الصدر ومحتاج رسم قلب فورا.",
    finishReason: "MAX_TOKENS",
    durationSec: 20,
  });
  assert.equal(trunc.valid, true);
  assert.equal(trunc.quality, "truncated");
  assert.equal(trunc.appendGapMarker, true);

  const lowDensity = validateTranscriptResult({
    text: "كلمة واحدة بس",
    finishReason: "STOP",
    durationSec: 600,
    silenceRatio: 0.1,
  });
  assert.equal(lowDensity.valid, true);
  assert.equal(lowDensity.quality, "low");
  assert.equal(lowDensity.retryRecommended, true);

  const loopText = Array.from({ length: 10 }, () => "المريض عنده ألم شديد في الصدر").join(" ");
  assert.equal(hasRepetitionLoop(loopText), true);
  const loopRes = validateTranscriptResult({ text: loopText, durationSec: 120 });
  assert.equal(loopRes.quality, "low");
  assert.equal(loopRes.reason, "REPETITION_LOOP");
});

test("classifyTranscribeError: covers every row of Section 8.5", () => {
  // 429 first two times do not count as attempt; 3rd consecutive counts
  assert.equal(classifyTranscribeError({ status: 429, consecutive429s: 0 }).countsAsAttempt, false);
  assert.equal(classifyTranscribeError({ status: 429, consecutive429s: 1 }).countsAsAttempt, false);
  assert.equal(classifyTranscribeError({ status: 429, consecutive429s: 2 }).countsAsAttempt, true);
  assert.equal(classifyTranscribeError({ status: 429, retryAfterSec: 30 }).retryAfterMs, 30_000);

  // 500, 502, 503, 504
  for (const status of [500, 502, 503, 504]) {
    const c = classifyTranscribeError({ status });
    assert.equal(c.retryable, true);
    assert.equal(c.countsAsAttempt, true);
  }

  // 400 "Thinking is not enabled" -> retryable
  const thinking = classifyTranscribeError({ status: 400, message: "Thinking is not enabled" });
  assert.equal(thinking.category, "thinking_not_enabled");
  assert.equal(thinking.retryable, true);

  // Other 400 -> fail_chunk (bad_request)
  const bad400 = classifyTranscribeError({ status: 400, message: "Invalid format" });
  assert.equal(bad400.category, "bad_request");
  assert.equal(bad400.retryable, false);

  // 401, 403 -> service_unavailable, abort_job, do not burn attempts
  for (const status of [401, 403]) {
    const authErr = classifyTranscribeError({ status });
    assert.equal(authErr.category, "service_unavailable");
    assert.equal(authErr.action, "abort_job");
    assert.equal(authErr.countsAsAttempt, false);
    assert.equal(authErr.raiseAdminAlert, true);
  }
});

test("mockGeminiAdapter: supports normal and failure-injection modes", async () => {
  const mock = createMockGeminiAdapter({
    chunkBehaviors: { 0: "normal", 1: "empty_twice", 2: "truncated", 3: "401" },
  });

  const c0 = await mock.transcribe({ chunkIndex: 0 });
  assert.ok(c0.text.includes("Myocardial infarction"));

  const c1a = await mock.transcribe({ chunkIndex: 1 });
  assert.equal(c1a.text, "");
  const c1b = await mock.transcribe({ chunkIndex: 1 });
  assert.equal(c1b.text, "");
  const c1c = await mock.transcribe({ chunkIndex: 1 });
  assert.ok(c1c.text.length > 10);

  const c2 = await mock.transcribe({ chunkIndex: 2 });
  assert.equal(c2.finishReason, "MAX_TOKENS");

  await assert.rejects(() => mock.transcribe({ chunkIndex: 3 }), { status: 401 });
});
