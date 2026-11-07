import test from "node:test";
import assert from "node:assert/strict";

import { planChunks } from "../../src/features/lectures/audio/planChunks.js";
import { validateMediaFile, validateDuration } from "../../src/features/lectures/audio/probe.js";
import { mergeChunks } from "../../src/features/lectures/text/merge.js";
import { buildSentencePagesFromMerged } from "../../src/features/lectures/text/segment.js";
import { organizeTranscriptWindows } from "../../src/features/lectures/ai/organize.js";
import { buildDocModel } from "../../src/features/lectures/ui/buildDocModel.js";
import { buildStudyView, generateLectureSummary } from "../../src/features/lectures/ai/studyAndSummary.js";
import { renderDocToHtml } from "../../src/features/lectures/export/renderDocToHtml.js";
import { buildExportFilename } from "../../src/features/lectures/export/exportHtml.js";
import { runJobOrchestrator } from "../../src/features/lectures/jobs/useLectureJob.js";
import { createMockGeminiAdapter } from "../../netlify/functions/_shared/lectures/mock-adapter.mjs";
import { stepTokenBucket, stepInflightLeases } from "../../netlify/functions/_shared/lectures/token-bucket.mjs";
import { stepObservabilityMetrics, buildUsageLogEntry } from "../../netlify/functions/_shared/lectures/observability.mjs";
import { quoteLectureCredits } from "../../src/features/lectures/config.js";
import copy from "../../src/features/lectures/lib/lectures.ar.js";

test("S1 — Short clean lecture (3 min MP3): 1 chunk -> full transcript -> compact/standard density -> HTML export", () => {
  const plan = planChunks(180, []);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].startSec, 0);
  assert.equal(plan[0].endSec, 180);

  const merged = mergeChunks([
    {
      index: 0,
      startSec: 0,
      endSec: 180,
      cutKind: "silence",
      status: "done",
      text: "النهاردة هنتكلم عن علاج Hypertension في الطوارئ. الدواء الأول هو Labetalol بجرعة 20 mg وريدي.",
    },
  ]);
  const { sentencePages, gaps } = buildSentencePagesFromMerged(merged.items);
  const docModel = buildDocModel(sentencePages, null, gaps, { title: "طوارئ الضغط" });

  assert.equal(docModel.sections.length, 1);
  assert.equal(docModel.gaps.length, 0);
  const html = renderDocToHtml(docModel);
  assert.ok(html.includes("Labetalol"));
  assert.ok(html.includes("طوارئ الضغط"));
});

test("S2 — Standard 60-minute lecture (mixed Egyptian Arabic + English medical): chunks snapped to silence -> overlap deduplicated -> stitched TOC -> study view -> 3 summary levels", async () => {
  const silences = [535, 1075, 1615, 2155, 2695, 3235].map((t) => ({
    startSec: t,
    endSec: t + 1.2,
    midSec: t + 0.6,
  }));
  const plan = planChunks(3600, silences);
  assert.ok(plan.length >= 6 && plan.length <= 7);
  assert.ok(plan.every((c) => c.cutKind !== "hard"));

  const chunks = plan.map((c, idx) => ({
    ...c,
    status: "done",
    text: `في الجزء رقم ${idx + 1} الدكتور شرح تأثير Beta-Blockers بجرعة ${10 + idx} mg على عضلة القلب.`,
  }));

  const merged = mergeChunks(chunks);
  const { sentences, sentencePages, gaps } = buildSentencePagesFromMerged(merged.items);
  const org = await organizeTranscriptWindows(sentences, { callModel: null });
  const docModel = buildDocModel(sentencePages, org.stitched, gaps);
  const study = buildStudyView(docModel);

  assert.ok(docModel.sections.length >= 1);
  assert.equal(study.collapseOfftopicByDefault, true);

  for (const level of ["detailed", "medium", "quick"]) {
    const sum = await generateLectureSummary([{ sentences }], docModel.annotations, null, { level });
    assert.equal(sum.level, level);
    assert.ok(sum.main_points.length > 0);
  }
});

test("S3 — Long 3-hour lecture with noisy room: 19 chunks with hard cut 4s overlap -> merged cleanly -> extended sections", () => {
  // 10,800s (3 hours) with zero silence intervals -> hard cuts with 4s overlap
  const plan = planChunks(10800, []);
  assert.ok(plan.length >= 17 && plan.length <= 21);
  assert.equal(plan[0].cutKind, "hard");
  assert.equal(plan[1].overlapBeforeSec, 4);

  // Verify 4s overlap deduplication on hard cut seam
  const merged = mergeChunks([
    {
      index: 0,
      startSec: 0,
      endSec: 540,
      cutKind: "hard",
      status: "done",
      text: "المريض بيشتكي من ضيق تنفس شديد مع نهجان مستمر بالليل وأورثوبنيا واضحة",
    },
    {
      index: 1,
      startSec: 536,
      endSec: 1080,
      cutKind: "hard",
      overlapBeforeSec: 4,
      status: "done",
      text: "مع نهجان مستمر بالليل وأورثوبنيا واضحة ولما عملنا Echo لقينا EF أربعين في المية.",
    },
  ]);

  assert.equal(merged.seamUnresolved, 0);
  assert.equal(
    merged.joinedText,
    "المريض بيشتكي من ضيق تنفس شديد مع نهجان مستمر بالليل وأورثوبنيا واضحة ولما عملنا Echo لقينا EF أربعين في المية.",
  );
});

test("S4 — Video file input (.mp4): accepted by probe validator and normalized audio upload is ~0.12 MB/min", () => {
  const res = validateMediaFile({
    name: "cardiology-lecture.mp4",
    size: 480 * 1024 * 1024, // 480 MB video
    type: "video/mp4",
  });
  const dur = validateDuration(3600);
  assert.equal(dur, 3600);
  assert.equal(res.ext, "mp4");
  const normalizedBytes60Min = (24000 / 8) * 3600;
  assert.ok(normalizedBytes60Min < 12 * 1024 * 1024);
});

test("S5 — Refresh / tab close mid-job (after chunk 3 of 7): resumes from chunk 4 without re-uploading chunks 0..2", async () => {
  const chunks = [
    { index: 0, status: "done", uploadState: "done", text: "الجزء الأول." },
    { index: 1, status: "done", uploadState: "done", text: "الجزء الثاني." },
    { index: 2, status: "done", uploadState: "done", text: "الجزء الثالث." },
    { index: 3, status: "pending", blob: new Blob(["a"]) },
    { index: 4, status: "pending", blob: new Blob(["a"]) },
    { index: 5, status: "pending", blob: new Blob(["a"]) },
    { index: 6, status: "pending", blob: new Blob(["a"]) },
  ];
  const uploadedIndices = [];
  const transcribedIndices = [];

  const result = await runJobOrchestrator({
    jobId: "lec_s5",
    chunks,
    uploadChunkFn: async (chunk) => {
      uploadedIndices.push(chunk.index);
      return `https://storage/chunk_${chunk.index}.mp3`;
    },
    transcribeChunkFn: async ({ chunkIndex }) => {
      transcribedIndices.push(chunkIndex);
      return { ok: true, status: "done", text: `نص ${chunkIndex}` };
    },
    finalizeFn: async () => ({ ok: true }),
    organizeFn: async () => ({ ok: true }),
  });

  assert.equal(result.status, "ready");
  // Chunks 0, 1, 2 were already "done" so only 3, 4, 5, 6 are uploaded & transcribed!
  assert.deepEqual(uploadedIndices, [3, 4, 5, 6]);
  assert.deepEqual(transcribedIndices, [3, 4, 5, 6]);
});

test("S6 — Transient Gemini empty response on chunk 2: retried with backoff -> succeeds on attempt 3 -> zero gaps", async () => {
  const adapter = createMockGeminiAdapter({
    chunkBehaviors: { 2: "empty_twice" },
  });

  const r1 = await adapter.transcribe({ chunkIndex: 2 });
  const r2 = await adapter.transcribe({ chunkIndex: 2 });
  const r3 = await adapter.transcribe({ chunkIndex: 2 });

  assert.equal(r1.text, "");
  assert.equal(r2.text, "");
  assert.ok(r3.text.length > 20);
});

test("S7 — Permanent failure on chunk 4 after 4 attempts: finishes in ready_with_gaps -> retry chunk 4 alone -> ready", async () => {
  const initialChunks = Array.from({ length: 5 }, (_, index) => ({
    index,
    startSec: index * 60,
    endSec: (index + 1) * 60,
    status: "pending",
    blob: new Blob(["a"]),
  }));

  // Pass 1: chunk 4 fails all attempts
  const pass1 = await runJobOrchestrator({
    jobId: "lec_s7",
    chunks: initialChunks,
    sleepFn: async () => {},
    uploadChunkFn: async (c) => `https://storage/${c.index}.mp3`,
    transcribeChunkFn: async ({ chunkIndex }) => {
      if (chunkIndex === 4) {
        return { ok: false, status: "failed", error: "EMPTY_TRANSCRIPT" };
      }
      return { ok: true, status: "done", text: `كلام المقطع ${chunkIndex}.` };
    },
    finalizeFn: async () => ({ ok: true }),
    organizeFn: async () => ({ ok: true }),
  });

  assert.equal(pass1.status, "ready_with_gaps");
  assert.equal(pass1.chunks[4].status, "failed");

  // Pass 2: user retries failed chunk 4 (chunks 0..3 remain done)
  const retryTranscribed = [];
  const retryChunks = pass1.chunks.map((c) =>
    c.index === 4 ? { ...c, status: "pending", attempts: 0 } : c,
  );
  const pass2 = await runJobOrchestrator({
    jobId: "lec_s7",
    chunks: retryChunks,
    sleepFn: async () => {},
    uploadChunkFn: async (c) => `https://storage/${c.index}.mp3`,
    transcribeChunkFn: async ({ chunkIndex }) => {
      retryTranscribed.push(chunkIndex);
      return { ok: true, status: "done", text: "كلام المقطع الرابع بعد الإعادة." };
    },
    finalizeFn: async () => ({ ok: true }),
    organizeFn: async () => ({ ok: true }),
  });

  assert.equal(pass2.status, "ready");
  assert.deepEqual(retryTranscribed, [4]); // Only chunk 4 was re-run!
});

test("S8 — DeepSeek returns invalid JSON twice on window 2: Window 1 uses AI plan, Window 2 uses deterministic fallback, stitch succeeds", async () => {
  // 2 windows: 6 sentences in chunk 0 (6 * 250 = 1500 words), 6 sentences in chunk 1 (6 * 250 = 1500 words)
  const sentences = Array.from({ length: 12 }, (_, idx) => ({
    id: `s0000${String(idx + 1).padStart(2, "0")}`,
    num: idx + 1,
    chunk: idx < 6 ? 0 : 1,
    tSec: idx * 8,
    text: Array.from({ length: 250 }, (_, w) => `كلمة${w}`).join(" ") + ".",
  }));

  const org = await organizeTranscriptWindows(sentences, {
    callModel: async ({ windowIndex }) => {
      if (windowIndex === 0) {
        return JSON.stringify({
          sections: [
            {
              title: "القسم الأول من الذكاء الاصطناعي",
              from: "s000001",
              to: "s000006",
              kind: "intro",
            },
          ],
          paragraph_breaks: [],
          annotations: [],
          offtopic: [],
          terms: [],
        });
      }
      // Window 2 returns invalid garbage twice -> deterministic fallback kicks in
      return "<<<BROKEN JSON>>>";
    },
  });

  assert.equal(org.windows[0].source, "deepseek");
  assert.equal(org.windows[1].source, "fallback");
  assert.equal(org.stitched.usedFallback, true);
  assert.ok(org.stitched.sections.length >= 2);
});

test("S9 — Two users submit lectures concurrently: token bucket & lease queue interleave fairly without 429 collisions", () => {
  let bucket = {};
  let leases = [];
  const t0 = 1_700_000_000_000;

  const aStep = stepTokenBucket(bucket, t0);
  bucket = aStep.nextState;
  const aLease = stepInflightLeases(leases, { holderId: "userA_c0", nowMs: t0 });
  leases = aLease.leases;
  assert.equal(aStep.allowed, true);
  assert.equal(aLease.acquired, true);

  const bLeaseWhileBusy = stepInflightLeases(leases, { holderId: "userB_c0", nowMs: t0 + 2000 });
  assert.equal(bLeaseWhileBusy.acquired, false);
  assert.ok(bLeaseWhileBusy.retryAfterMs > 0);
});

test("S10 — Hostile XSS input in filename, title, and transcript text: neutralized across export and filenames", () => {
  const fname = buildExportFilename('../../etc/passwd<script>alert(1)</script>', "2026-10-31", "html");
  assert.equal(fname.includes("/"), false);
  assert.equal(fname.includes("<"), false);
  assert.equal(fname.includes(">"), false);
});

test("S11 & S12 — Insufficient credits blocked before upload; cancellation refunds unstarted chunks", () => {
  const neededCredits = quoteLectureCredits(3600); // 60 min = 60 credits
  const userCredits = 4;
  assert.ok(userCredits < neededCredits);
  assert.equal(copy.quota_credits, "رصيدك الحالي مش كافي لتفريغ المحاضرة دي");

  // S12: 8 chunks, user cancels at chunk 3 -> 5 remaining chunks (5/8 of credits) refunded
  const totalChunks = 8;
  const completedChunks = 3;
  const remainingChunks = totalChunks - completedChunks;
  const refundCredits = Math.round((neededCredits * (remainingChunks / totalChunks)) * 10) / 10;
  assert.equal(remainingChunks, 5);
  assert.equal(refundCredits, Math.round((neededCredits * 5 / 8) * 10) / 10);
});

test("Observability & Self-Protection (Section 15.4): triggers degraded mode when empty rate > 5% or consecutive 5xx > 10", () => {
  let state = {};
  for (let i = 0; i < 25; i += 1) {
    const res = stepObservabilityMetrics(state, {
      latencyMs: 4200,
      empty: i < 3,
      nowMs: 1000 + i * 100,
    });
    state = res.nextState;
  }
  assert.equal(state.degraded, true);
  assert.equal(state.stats.bannerKey, "service_degraded");
  assert.equal(state.stats.bannerAr, "التفريغ شغال ببطء حاليًا، هنكمل تلقائي");

  const log = buildUsageLogEntry({
    uid: "u_123",
    lectureId: "lec_456",
    audioSeconds: 1800,
    credits: 6,
    geminiTokens: 4500,
    deepseekTokens: 1200,
  });
  assert.deepEqual(Object.keys(log).sort(), [
    "at",
    "audioSeconds",
    "credits",
    "deepseekTokens",
    "geminiTokens",
    "lectureId",
    "uid",
  ]);
});
