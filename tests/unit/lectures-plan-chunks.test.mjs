import assert from "node:assert/strict";
import test from "node:test";

import {
  planChunks,
  planChunksSimple,
} from "../../src/features/lectures/lib/planChunks.js";
import { LECTURE_CONFIG } from "../../src/features/lectures/lib/config.js";

test("a 2-hour lecture splits into ~12 chunks inside the max segment size", () => {
  const chunks = planChunksSimple(2 * 60 * 60);
  assert.ok(chunks.length >= 11 && chunks.length <= 14, `got ${chunks.length}`);
  for (const c of chunks) {
    const len = c.end_sec - c.start_sec;
    assert.ok(len > 0 && len <= LECTURE_CONFIG.CHUNK_MAX_SEC, `bad length ${len}`);
  }
});

test("chunks are ordered, contiguous and cover the whole recording", () => {
  const duration = 95 * 60;
  const chunks = planChunksSimple(duration);
  assert.equal(chunks[0].start_sec, 0);
  assert.ok(Math.abs(chunks[chunks.length - 1].end_sec - duration) < 1);
  for (let i = 1; i < chunks.length; i += 1) {
    assert.ok(chunks[i].start_sec <= chunks[i - 1].end_sec, "chunks must overlap or touch, never gap");
    assert.ok(chunks[i].end_sec > chunks[i].start_sec);
  }
  assert.deepEqual(chunks.map((c) => c.index), chunks.map((_c, i) => i));
});

test("cuts snap to the nearest silence instead of mid-word", () => {
  const duration = 25 * 60;
  // Silences slightly before/after the 10-minute mark.
  const silences = [9 * 60 + 30, 10 * 60 + 25, 19 * 60 + 40, 20 * 60 + 10];
  const chunks = planChunks(duration, silences);
  const cut = chunks[0].end_sec;
  assert.ok(Math.abs(cut - 10 * 60) <= 40, `cut ${cut} should hug a silence`);
  // The cut must land exactly on a measured silence.
  assert.ok(silences.some((s) => Math.abs(s - cut) < 0.2), `cut ${cut} is not on a silence`);
});

test("no silence available → falls back to the target, still within bounds", () => {
  const chunks = planChunks(30 * 60, []);
  const first = chunks[0];
  assert.ok(first.end_sec - first.start_sec <= LECTURE_CONFIG.CHUNK_MAX_SEC);
  assert.ok(first.end_sec - first.start_sec >= LECTURE_CONFIG.CHUNK_MIN_SEC);
});

test("short recordings stay a single chunk", () => {
  const chunks = planChunksSimple(7 * 60);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].start_sec, 0);
  assert.equal(chunks[0].end_sec, 7 * 60);
});

test("degenerate inputs return no chunks instead of throwing", () => {
  assert.deepEqual(planChunksSimple(0), []);
  assert.deepEqual(planChunksSimple(-5), []);
  assert.deepEqual(planChunksSimple(null), []);
});

test("silences outside the recording are ignored", () => {
  const chunks = planChunks(20 * 60, [-10, 0, 5000, 999999]);
  assert.ok(chunks.length >= 2);
  for (const c of chunks) {
    assert.ok(c.start_sec >= 0 && c.end_sec <= 20 * 60 + 1);
  }
});

test("overlap is never larger than a tenth of the target", () => {
  const chunks = planChunksSimple(3 * 60 * 60);
  for (let i = 1; i < chunks.length; i += 1) {
    const overlap = chunks[i - 1].end_sec - chunks[i].start_sec;
    assert.ok(overlap >= 0 && overlap <= LECTURE_CONFIG.CHUNK_TARGET_SEC / 10);
  }
});
