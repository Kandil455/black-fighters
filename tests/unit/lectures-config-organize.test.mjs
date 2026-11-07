import assert from "node:assert/strict";
import test from "node:test";

import {
  LECTURE_CONFIG,
  estimateTranscribeSeconds,
  planChunkCount,
  quoteLectureCredits,
  formatEtaAr,
} from "../../src/features/lectures/lib/config.js";
import { buildOrganizationPlan } from "../../src/features/lectures/lib/organize.js";

test("config pins the measured Free-tier limits", () => {
  assert.equal(LECTURE_CONFIG.TRANSCRIBE_MODEL, "gemini-3.5-transcribe");
  assert.equal(LECTURE_CONFIG.GEMINI_RPM_LIMIT, 3, "measured: 3 RPM on free tier");
  assert.equal(LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS, 21_000);
  assert.equal(LECTURE_CONFIG.GLOBAL_MAX_INFLIGHT, 1);
  assert.equal(LECTURE_CONFIG.TRANSCRIBE_MODE, "VERBATIM", "SMART rewrites speech");
});

test("there is no fallback model anywhere in config (owner rule N1)", () => {
  const values = JSON.stringify(LECTURE_CONFIG).toLowerCase();
  assert.ok(!values.includes("fallbackmodel"), "no fallback model key");
  assert.equal(values.match(/gemini-[a-z0-9.-]+/g)?.length, 1, "exactly one gemini model");
});

test("a 2-hour lecture plans 12 chunks and ~4 minutes of queue time", () => {
  const chunks = planChunkCount(2 * 60 * 60);
  assert.equal(chunks, 12);
  const eta = estimateTranscribeSeconds(chunks);
  assert.ok(eta > 200 && eta < 300, `expected ~252s, got ${eta}`);
});

test("ETA grows linearly and accounts for the queue ahead", () => {
  const solo = estimateTranscribeSeconds(6);
  const behindOneLecture = estimateTranscribeSeconds(6, { queueAhead: 6 });
  assert.ok(behindOneLecture > solo);
});

test("credit quote is duration-based and never free", () => {
  assert.equal(quoteLectureCredits(0), 1);
  assert.equal(quoteLectureCredits(60), 1);
  assert.equal(quoteLectureCredits(61), 2);
  assert.equal(quoteLectureCredits(2 * 60 * 60), 120);
});

test("ETA formats in Arabic", () => {
  assert.match(formatEtaAr(45), /ثانية/);
  assert.match(formatEtaAr(252), /دقيقة/);
  assert.match(formatEtaAr(7200), /ساعة/);
});

// ─── organize plan builder with mocked model ────────────────────────────────
const transcript = {
  word_count: 40,
  sentences: Array.from({ length: 10 }, (_v, i) => ({ id: i + 1, text: `sentence ${i + 1}` })),
};

test("buildOrganizationPlan accepts a valid plan without calling the fallback", async () => {
  const calls = [];
  const plan = await buildOrganizationPlan(transcript, {
    callModel: async () => {
      calls.push(1);
      return {
        sections: [
          { title: "مقدمة", kindHint: "concept", sentence_ids: [1, 2, 3] },
          { title: "خطوات", kindHint: "steps", sentence_ids: [4, 5, 6, 7, 8, 9, 10] },
        ],
        noise_sentence_ids: [],
        glossary: [{ term: "ACL", ar: "الرباط الصليبي", sentence_ids: [2] }],
      };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(plan.usedFallback, false);
  assert.equal(plan.validation.passed, true);
  assert.equal(plan.plan.sections.length, 2);
});

test("buildOrganizationPlan retries then falls back when the model rewrites text", async () => {
  let attempts = 0;
  const plan = await buildOrganizationPlan(transcript, {
    callModel: async () => {
      attempts += 1;
      return {
        sections: [
          {
            title: "مقدمة",
            text: "sentence 1 sentence 2 rewritten by the model",
            sentence_ids: [1, 2, 3],
          },
        ],
      };
    },
  });
  assert.equal(attempts, LECTURE_CONFIG.ORGANIZE_MAX_ATTEMPTS);
  assert.equal(plan.usedFallback, true, "model rewritten prose must be rejected");
  // The fallback plan itself is structurally valid — every sentence covered once.
  assert.equal(plan.validation.passed, true);
  // fallback still covers every sentence exactly once
  const ids = plan.plan.sections.flatMap((s) => s.sentence_ids).sort((a, b) => a - b);
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("buildOrganizationPlan rejects out-of-range and duplicated ids", async () => {
  const plan = await buildOrganizationPlan(transcript, {
    callModel: async () => ({
      sections: [{ title: "x", sentence_ids: [1, 1, 99] }],
    }),
  });
  assert.equal(plan.usedFallback, true);
});
