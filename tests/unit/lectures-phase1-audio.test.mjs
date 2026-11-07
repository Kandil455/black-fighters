import assert from "node:assert/strict";
import test from "node:test";

import { planChunks, planChunksSimple } from "../../src/features/lectures/audio/planChunks.js";
import { parseSilenceLog, computeChunkSilenceRatio, detectSilenceIntervalsFromSamples } from "../../src/features/lectures/audio/silence.js";
import { validateMediaFile, validateDuration } from "../../src/features/lectures/audio/probe.js";
import { selectAudioEncoder, checkDurationDrift } from "../../src/features/lectures/audio/normalize.js";
import { buildPlanPreview, cutSingleChunk } from "../../src/features/lectures/audio/cutChunks.js";
import { LECTURE_CONFIG } from "../../src/features/lectures/config.js";

function assertPlanInvariants(chunks, duration, cfg = LECTURE_CONFIG) {
  if (duration <= 0) {
    assert.equal(chunks.length, 0);
    return;
  }
  assert.ok(chunks.length >= 1, "at least 1 chunk");
  assert.equal(chunks[0].startSec, 0, "first chunk starts at 0");
  assert.ok(Math.abs(chunks[chunks.length - 1].endSec - duration) <= 0.01, "last chunk ends at duration");

  const maxAllowedChunks = Math.ceil(duration / cfg.CHUNK_MIN_SEC) + 1;
  assert.ok(chunks.length <= maxAllowedChunks, `chunk count ${chunks.length} <= ${maxAllowedChunks}`);

  for (let i = 0; i < chunks.length; i += 1) {
    const c = chunks[i];
    assert.equal(c.index, i, "indices ascend from 0");
    assert.ok(c.endSec > c.startSec, "positive chunk length");

    // Every chunk except possibly the last (or when merged by tail rule) is within [MIN, MAX]
    if (i < chunks.length - 1 && chunks.length > 2) {
      const len = c.endSec - c.startSec;
      assert.ok(len >= cfg.CHUNK_MIN_SEC - 0.01, `chunk ${i} len ${len} >= MIN ${cfg.CHUNK_MIN_SEC}`);
      assert.ok(len <= cfg.CHUNK_MAX_SEC + 0.01, `chunk ${i} len ${len} <= MAX ${cfg.CHUNK_MAX_SEC}`);
    }

    if (i > 0) {
      const prev = chunks[i - 1];
      const expectedStart = Math.round((prev.endSec - c.overlapBeforeSec) * 1000) / 1000;
      assert.ok(
        Math.abs(c.startSec - expectedStart) <= 0.01,
        `seam ${i}: startSec=${c.startSec} should equal prev.endSec(${prev.endSec}) - overlap(${c.overlapBeforeSec})`,
      );
    }
  }
}

test("planChunks: fixtures for 5 min, 59 min, 2 hours, and 4 hours", () => {
  for (const dur of [5 * 60, 59 * 60, 2 * 3600, 4 * 3600]) {
    const chunks = planChunksSimple(dur);
    assertPlanInvariants(chunks, dur);
  }
});

test("planChunks: hard cuts use 4s overlap when no silences exist", () => {
  const chunks = planChunks(25 * 60, []);
  assertPlanInvariants(chunks, 25 * 60);
  assert.equal(chunks[0].cutKind, "hard");
  assert.equal(chunks[1].overlapBeforeSec, 4);
  assert.equal(chunks[1].startSec, chunks[0].endSec - 4);
});

test("planChunks: silence cuts inside search window pick longest silence and use 0 overlap", () => {
  const silences = [
    { start: 580, end: 581, duration: 1.0, midpoint: 580.5 },
    { start: 610, end: 613, duration: 3.0, midpoint: 611.5 },
  ];
  const chunks = planChunks(20 * 60, silences);
  assertPlanInvariants(chunks, 20 * 60);
  assert.equal(chunks[0].cutKind, "silence");
  assert.equal(chunks[0].endSec, 611.5);
  assert.equal(chunks[1].overlapBeforeSec, 0);
  assert.equal(chunks[1].startSec, 611.5);
});

test("planChunks: silences only far from target (outside search window, inside [MIN, MAX]) still snap to silence", () => {
  const silences = [{ start: 420, end: 422, duration: 2.0, midpoint: 421 }];
  const chunks = planChunks(18 * 60, silences);
  assertPlanInvariants(chunks, 18 * 60);
  assert.equal(chunks[0].cutKind, "silence");
  assert.equal(chunks[0].endSec, 421);
});

test("planChunks: tail rule merges <60s final tail or shifts cut so both chunks >= 120s", () => {
  // 780 + 40 = 820s -> after a 600s cut, remaining is 220s (fits in 1 chunk).
  // Test a case where cursor reaches duration - 30s:
  // Suppose silence at 760s in a 790s file -> remaining is 30s (< 60s).
  // Merged length = 790s <= 780 + 60 (840s), so it merges into a single 790s chunk!
  const merged = planChunks(790, [{ start: 759, end: 761, duration: 2, midpoint: 760 }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].endSec, 790);

  // Suppose previous chunk started at 0, cut at 695 in a 740s file (tail = 45s < 60s)
  // where merging (740s) exceeds MAX+60 (650+60=710s):
  const customCfg = { ...LECTURE_CONFIG, CHUNK_MAX_SEC: 650, CHUNK_TARGET_SEC: 600, CHUNK_MIN_SEC: 360 };
  const shifted = planChunks(740, [{ start: 644, end: 646, duration: 2, midpoint: 645 }], customCfg);
  assert.equal(shifted.length, 2);
  for (const c of shifted) {
    assert.ok(c.endSec - c.startSec >= 120, `chunk length ${c.endSec - c.startSec} >= 120s`);
  }
});

test("planChunks: seeded random property test over 200 inputs", () => {
  let seed = 133742;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  for (let i = 0; i < 200; i += 1) {
    const duration = Math.floor(rand() * 14_300) + 30;
    const silenceCount = Math.floor(rand() * 35);
    const silences = [];
    for (let j = 0; j < silenceCount; j += 1) {
      const start = rand() * (duration - 5);
      const dur = 0.6 + rand() * 3.0;
      silences.push({ start, end: start + dur, duration: dur, midpoint: start + dur / 2 });
    }
    const planA = planChunks(duration, silences);
    const planB = planChunks(duration, silences);
    assert.deepEqual(planA, planB, "deterministic for identical input");
    assertPlanInvariants(planA, duration);
  }
});

test("parseSilenceLog: parses intervals and handles final silence_start without silence_end", () => {
  const log = `
[silencedetect @ 0x1] silence_start: 12.4
[silencedetect @ 0x1] silence_end: 13.6 | silence_duration: 1.2
[silencedetect @ 0x1] silence_start: 40.0
[silencedetect @ 0x1] silence_end: 40.3 | silence_duration: 0.3
[silencedetect @ 0x1] silence_start: 118.0
  `;
  const parsed = parseSilenceLog(log, { totalDurationSec: 120, minSec: 0.6 });
  assert.equal(parsed.length, 2, "ignores 0.3s < 0.6s and closes final open silence at 120s");
  assert.equal(parsed[0].start, 12.4);
  assert.equal(parsed[0].end, 13.6);
  assert.equal(parsed[0].midpoint, 13.0);
  assert.equal(parsed[1].start, 118.0);
  assert.equal(parsed[1].end, 120.0);
  assert.equal(parsed[1].duration, 2.0);
});

test("computeChunkSilenceRatio: calculates overlap ratio accurately", () => {
  const silences = [
    { start: 10, end: 20 },
    { start: 50, end: 80 },
  ];
  assert.equal(computeChunkSilenceRatio(0, 100, silences), 0.4);
});

test("probe & normalize helpers: validate extensions, sizes, durations, and encoders", () => {
  assert.doesNotThrow(() => validateMediaFile({ name: "lec.mp3", type: "audio/mpeg", size: 1024 }));
  assert.throws(() => validateMediaFile({ name: "malware.exe", type: "application/x-msdownload", size: 100 }), /unsupported_file/);
  assert.throws(() => validateMediaFile({ name: "huge.mp4", type: "video/mp4", size: 3 * 1024 ** 3 }), /file_too_large/);
  assert.throws(() => validateDuration(5 * 3600), /too_long/);

  assert.equal(selectAudioEncoder(["libmp3lame"]).encoder, "libmp3lame");
  assert.equal(selectAudioEncoder(["libopus"]).encoder, "libopus");
  assert.equal(selectAudioEncoder(["pcm_s16le"]).targetSec, 300);

  assert.equal(checkDurationDrift(100, 100.5).withinTolerance, true);
  assert.equal(checkDurationDrift(100, 102.5).withinTolerance, false);
});

test("cutSingleChunk & buildPlanPreview", () => {
  const sr = 16000;
  const samples = new Float32Array(sr * 10);
  const plan = [{ index: 0, startSec: 0, endSec: 10, overlapBeforeSec: 0, cutKind: "silence" }];
  const cut = cutSingleChunk(samples, sr, plan[0], [{ start: 2, end: 4 }]);
  assert.equal(cut.paddedIndex, "000");
  assert.equal(cut.silenceRatio, 0.2);
  assert.ok(cut.bytes > 44);

  const preview = buildPlanPreview(1200, planChunksSimple(1200));
  assert.equal(preview.chunkCount, 2);
  assert.ok(preview.estimatedCredits >= 20);
  assert.ok(preview.estimatedWaitRangeSec.max >= preview.estimatedWaitRangeSec.min);
});
