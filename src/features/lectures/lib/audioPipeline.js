/**
 * audioPipeline.js — browser-side audio preparation.
 *
 * Everything here runs on the student's device: nothing is uploaded until the
 * split plan is approved. We decode → downmix to mono 16 kHz → find quiet
 * moments → let planChunks() snap cuts to silence.
 *
 * Free-tier reality: the model accepts 3 requests/minute project-wide, so a
 * 2-hour lecture is ~12 chunks ≈ 4 minutes. The device does the heavy lifting
 * so the server only ever sees short, well-formed chunks.
 */
import { LECTURE_CONFIG } from "./config.js";
import { planChunks } from "./planChunks.js";

const TARGET_SAMPLE_RATE = 16_000;

/** Decode any browser-supported audio/video file into an AudioBuffer. */
export async function decodeAudioFile(file, { onProgress } = {}) {
  if (typeof window === "undefined") throw new Error("BROWSER_ONLY");
  onProgress?.({ phase: "decode", ratio: 0 });
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("AUDIO_CONTEXT_UNAVAILABLE");
  const ctx = new AudioCtx({ sampleRate: TARGET_SAMPLE_RATE });
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    onProgress?.({ phase: "decode", ratio: 1 });
    return buffer;
  } finally {
    // Close only after decode resolves — decodeAudioData copies the samples.
    ctx.close().catch(() => {});
  }
}

/** Downmix every channel into a single Float32Array. */
export function downmixToMono(buffer) {
  const channels = Math.max(1, buffer.numberOfChannels || 1);
  if (channels === 1) return buffer.getChannelData(0);
  const length = buffer.length;
  const out = new Float32Array(length);
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) out[i] += data[i] / channels;
  }
  return out;
}

/**
 * Find quiet moments (seconds) in the samples.
 * A moment is "quiet" when its RMS over a short window stays below the
 * adaptive threshold for at least MIN_QUIET_MS.
 */
export function findSilences(
  samples,
  sampleRate,
  { frameMs = 50, minQuietMs = 400, ratio = 0.08 } = {},
) {
  const frameSize = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const frames = Math.floor(samples.length / frameSize);
  if (frames <= 0) return [];

  const rms = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i += 1) {
      const v = samples[start + i];
      sum += v * v;
    }
    rms[f] = Math.sqrt(sum / frameSize);
  }

  // Adaptive threshold: a fraction of the loud frames' median level.
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const p60 = sorted[Math.floor(sorted.length * 0.6)] || 0;
  const threshold = Math.max(0.004, p60 * ratio);

  const minQuietFrames = Math.max(1, Math.round(minQuietMs / frameMs));
  const silences = [];
  let run = 0;
  for (let f = 0; f < frames; f += 1) {
    if (rms[f] <= threshold) {
      run += 1;
      continue;
    }
    if (run >= minQuietFrames) {
      const middleFrame = f - Math.floor(run / 2);
      silences.push((middleFrame * frameSize) / sampleRate);
    }
    run = 0;
  }
  return silences;
}

/** Encode a Float32 slice as a mono 16 kHz WAV Blob. */
export function encodeWav(samples, sampleRate = TARGET_SAMPLE_RATE) {
  const byteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + byteLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, byteLength, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Downsample a mono Float32Array by an integer factor (e.g. 2x -> 8kHz) when needed to fit upload size limits. */
function downsampleMono(samples, factor = 2) {
  if (factor <= 1) return samples;
  const outLen = Math.floor(samples.length / factor);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    let acc = 0;
    const base = i * factor;
    for (let k = 0; k < factor; k += 1) acc += samples[base + k] || 0;
    out[i] = acc / factor;
  }
  return out;
}

/**
 * Prepare a lecture: decode, plan the split, and slice each chunk to a Blob.
 * Chunks are planned around ~95s (≤105s) so 16kHz 16-bit mono WAV blobs stay under 3.4 MB.
 * @returns {Promise<{durationSec:number, chunks:Array<{index,start_sec,end_sec,blob,bytes}>, silences:number}>}
 */
export async function prepareLecture(file, { onProgress } = {}) {
  const buffer = await decodeAudioFile(file, { onProgress });
  const durationSec = buffer.duration;
  onProgress?.({ phase: "analyze", ratio: 0.1 });

  const mono = downmixToMono(buffer);
  const silences = findSilences(mono, buffer.sampleRate);
  onProgress?.({ phase: "analyze", ratio: 0.5 });

  // Adaptive chunking: short audio files (<3m) stay as 1 single fast chunk.
  // Medium files (3-10m) use ~180s chunks (2-3 chunks total).
  // Long lectures (>10m) use ~180-240s chunks for rapid parallel streaming.
  const isShortAudio = durationSec <= 180;
  const isMediumAudio = durationSec <= 600;

  const plan = isShortAudio
    ? planChunks(durationSec, silences, {
        ...LECTURE_CONFIG,
        CHUNK_TARGET_SEC: Math.ceil(durationSec) + 1,
        CHUNK_MIN_SEC: 10,
        CHUNK_MAX_SEC: Math.ceil(durationSec) + 10,
        SPLIT_SEARCH_WINDOW_SEC: 5,
      })
    : planChunks(durationSec, silences, {
        ...LECTURE_CONFIG,
        CHUNK_TARGET_SEC: isMediumAudio ? 180 : 210,
        CHUNK_MIN_SEC: isMediumAudio ? 90 : 120,
        CHUNK_MAX_SEC: isMediumAudio ? 210 : 240,
        SPLIT_SEARCH_WINDOW_SEC: 20,
      });
  const MAX_SAFE_WAV_BYTES = 3_350_000;
  const chunks = [];
  for (const [i, chunk] of plan.entries()) {
    const startSample = Math.floor(chunk.start_sec * buffer.sampleRate);
    const endSample = Math.min(mono.length, Math.ceil(chunk.end_sec * buffer.sampleRate));
    let slice = mono.subarray(startSample, endSample);
    let targetRate = buffer.sampleRate;
    if (slice.length * 2 + 44 > MAX_SAFE_WAV_BYTES) {
      const factor = Math.ceil((slice.length * 2 + 44) / MAX_SAFE_WAV_BYTES);
      slice = downsampleMono(slice, factor);
      targetRate = Math.max(8000, Math.floor(buffer.sampleRate / factor));
    }
    const blob = encodeWav(slice, targetRate);
    chunks.push({ ...chunk, blob, bytes: blob.size });
    onProgress?.({ phase: "slice", ratio: 0.5 + (0.5 * (i + 1)) / plan.length });
  }

  return { durationSec, chunks, silences: silences.length };
}

/** Approximate upload size for the UI hint. */
export function estimateUploadBytes(chunks) {
  return chunks.reduce((sum, c) => sum + (c.bytes || 0), 0);
}

export { LECTURE_CONFIG, TARGET_SAMPLE_RATE };
