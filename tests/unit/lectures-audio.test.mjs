import assert from "node:assert/strict";
import test from "node:test";

import {
  findSilences,
  encodeWav,
  downmixToMono,
} from "../../src/features/lectures/lib/audioPipeline.js";

const SR = 16_000;

/** Build samples: loud tone blocks separated by true silence. */
function buildSignal(segments) {
  const total = segments.reduce((n, s) => n + Math.round(s.dur * SR), 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const seg of segments) {
    const len = Math.round(seg.dur * SR);
    for (let i = 0; i < len; i += 1) {
      out[offset + i] = seg.loud
        ? 0.4 * Math.sin((2 * Math.PI * 220 * i) / SR)
        : 0;
    }
    offset += len;
  }
  return out;
}

test("finds silence gaps and ignores speech", () => {
  const samples = buildSignal([
    { dur: 3, loud: true },
    { dur: 1, loud: false },
    { dur: 3, loud: true },
    { dur: 1, loud: false },
    { dur: 2, loud: true },
  ]);
  const silences = findSilences(samples, SR);
  assert.ok(silences.length >= 2, `expected >=2 silences, got ${silences.length}`);
  // First silence should sit near the 3–4s mark.
  assert.ok(silences.some((s) => s > 2.5 && s < 4.5), `bad silence positions: ${silences}`);
});

test("continuous speech produces no silence points", () => {
  const samples = buildSignal([{ dur: 5, loud: true }]);
  const silences = findSilences(samples, SR);
  assert.equal(silences.length, 0);
});

test("all-silence audio does not crash and returns positions", () => {
  const samples = buildSignal([{ dur: 4, loud: false }]);
  const silences = findSilences(samples, SR);
  assert.ok(Array.isArray(silences));
});

test("empty input is handled", () => {
  assert.deepEqual(findSilences(new Float32Array(0), SR), []);
});

test("downmix averages stereo channels", () => {
  const left = new Float32Array([1, 1, 1, 1]);
  const right = new Float32Array([0, 0, 0, 0]);
  const buffer = {
    numberOfChannels: 2,
    length: 4,
    getChannelData: (c) => (c === 0 ? left : right),
  };
  const mono = downmixToMono(buffer);
  assert.equal(mono.length, 4);
  for (const v of mono) assert.ok(Math.abs(v - 0.5) < 1e-6);
});

test("mono passthrough returns the same channel", () => {
  const only = new Float32Array([0.1, 0.2]);
  const buffer = { numberOfChannels: 1, length: 2, getChannelData: () => only };
  assert.equal(downmixToMono(buffer), only);
});

test("encodeWav writes a valid 16-bit mono PCM header", async () => {
  const samples = new Float32Array(1000);
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.sin(i / 20) * 0.5;
  const blob = encodeWav(samples, SR);
  assert.equal(blob.type, "audio/wav");
  assert.equal(blob.size, 44 + samples.length * 2);

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  assert.equal(ascii(0, 4), "RIFF");
  assert.equal(ascii(8, 12), "WAVE");
  assert.equal(ascii(36, 40), "data");
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint16(20, true), 1, "PCM format");
  assert.equal(view.getUint16(22, true), 1, "mono");
  assert.equal(view.getUint32(24, true), SR, "sample rate");
  assert.equal(view.getUint32(40, true), samples.length * 2, "data length");
});

test("encodeWav clamps out-of-range samples instead of wrapping", async () => {
  const blob = encodeWav(new Float32Array([2, -2, 0]), SR);
  const view = new DataView(await blob.arrayBuffer());
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(46, true), -32768);
  assert.equal(view.getInt16(48, true), 0);
});
