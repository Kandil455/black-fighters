/**
 * src/features/lectures/audio/silence.js — Pure silence log parser & silence interval helpers.
 *
 * Pure module (does NOT import ffmpeg).
 * Parses ffmpeg silencedetect logs AND detects silence intervals from raw mono samples.
 */
import { LECTURE_CONFIG } from "../config.js";

/**
 * Parse ffmpeg `silencedetect` filter output lines into `{ start, end, duration, midpoint }` intervals.
 *
 * Edge cases handled per Section 7.4:
 *   • A final `silence_start` without a matching `silence_end` extends until `totalDurationSec`.
 *   • Intervals shorter than `minSec` are ignored.
 *
 * @param {string} logText
 * @param {{ totalDurationSec?: number, minSec?: number }} [opts]
 * @returns {Array<{start:number, end:number, duration:number, midpoint:number}>}
 */
export function parseSilenceLog(
  logText,
  { totalDurationSec = null, minSec = LECTURE_CONFIG.SILENCE_MIN_SEC } = {},
) {
  const text = String(logText || "");
  if (!text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const intervals = [];
  let openStart = null;

  const startRe = /silence_start:\s*(-?\d+(?:\.\d+)?)/;
  const endRe = /silence_end:\s*(-?\d+(?:\.\d+)?)(?:\s*\|\s*silence_duration:\s*(-?\d+(?:\.\d+)?))?/;

  for (const line of lines) {
    const startMatch = line.match(startRe);
    if (startMatch) {
      const val = Math.max(0, Number(startMatch[1]));
      if (Number.isFinite(val)) openStart = val;
    }

    const endMatch = line.match(endRe);
    if (endMatch) {
      const endVal = Number(endMatch[1]);
      const durVal = endMatch[2] != null ? Number(endMatch[2]) : null;
      if (Number.isFinite(endVal)) {
        const startVal =
          openStart != null
            ? openStart
            : durVal != null && Number.isFinite(durVal)
            ? Math.max(0, endVal - durVal)
            : null;
        openStart = null;
        if (startVal != null && endVal > startVal) {
          const duration = endVal - startVal;
          if (duration >= minSec - 1e-6) {
            intervals.push({
              start: Math.round(startVal * 1000) / 1000,
              end: Math.round(endVal * 1000) / 1000,
              duration: Math.round(duration * 1000) / 1000,
              midpoint: Math.round(((startVal + endVal) / 2) * 1000) / 1000,
            });
          }
        }
      }
    }
  }

  // Edge case: a final silence_start without an end means silence until the end of the file.
  if (openStart != null && totalDurationSec != null && Number.isFinite(totalDurationSec)) {
    const endVal = Number(totalDurationSec);
    if (endVal > openStart) {
      const duration = endVal - openStart;
      if (duration >= minSec - 1e-6) {
        intervals.push({
          start: Math.round(openStart * 1000) / 1000,
          end: Math.round(endVal * 1000) / 1000,
          duration: Math.round(duration * 1000) / 1000,
          midpoint: Math.round(((openStart + endVal) / 2) * 1000) / 1000,
        });
      }
    }
  }

  return intervals;
}

/**
 * Compute silence ratio (0..1) inside a chunk `[startSec, endSec]` from parsed silence intervals.
 */
export function computeChunkSilenceRatio(startSec, endSec, silences = []) {
  const chunkLen = Math.max(0, Number(endSec) - Number(startSec));
  if (chunkLen <= 0) return 0;
  let silentSec = 0;
  for (const s of silences) {
    if (typeof s === "number") continue;
    const sStart = Number(s?.start);
    const sEnd = Number(s?.end);
    if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || sEnd <= sStart) continue;
    const overlapStart = Math.max(startSec, sStart);
    const overlapEnd = Math.min(endSec, sEnd);
    if (overlapEnd > overlapStart) {
      silentSec += overlapEnd - overlapStart;
    }
  }
  return Math.min(1, Math.round((silentSec / chunkLen) * 1000) / 1000);
}

/**
 * Scan mono Float32 samples into silence intervals `{ start, end, duration, midpoint }`.
 * Retries automatically with relaxed parameters (`-28 dB`, `0.4 s`) if nothing is found
 * in a recording longer than 20 minutes.
 */
export function detectSilenceIntervalsFromSamples(
  samples,
  sampleRate = LECTURE_CONFIG.AUDIO_SAMPLE_RATE,
  { noiseDb = LECTURE_CONFIG.SILENCE_NOISE_DB, minSec = LECTURE_CONFIG.SILENCE_MIN_SEC, frameMs = 50 } = {},
) {
  const runScan = (dbThreshold, minDurationSec) => {
    const frameSize = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
    const frames = Math.floor(samples.length / frameSize);
    if (frames <= 0) return [];

    const rms = new Float32Array(frames);
    for (let f = 0; f < frames; f += 1) {
      let sum = 0;
      const offset = f * frameSize;
      for (let i = 0; i < frameSize; i += 1) {
        const v = samples[offset + i];
        sum += v * v;
      }
      rms[f] = Math.sqrt(sum / frameSize);
    }

    const linearDbThreshold = 10 ** (dbThreshold / 20);
    const sorted = Array.from(rms).sort((a, b) => a - b);
    const p60 = sorted[Math.floor(sorted.length * 0.6)] || 0;
    const threshold = Math.max(0.004, Math.min(linearDbThreshold, p60 * 0.12 || linearDbThreshold));

    const minFrames = Math.max(1, Math.round((minDurationSec * 1000) / frameMs));
    const intervals = [];
    let runStartFrame = -1;
    let runCount = 0;

    for (let f = 0; f < frames; f += 1) {
      if (rms[f] <= threshold) {
        if (runCount === 0) runStartFrame = f;
        runCount += 1;
      } else {
        if (runCount >= minFrames) {
          const start = (runStartFrame * frameSize) / sampleRate;
          const end = (f * frameSize) / sampleRate;
          intervals.push({
            start: Math.round(start * 1000) / 1000,
            end: Math.round(end * 1000) / 1000,
            duration: Math.round((end - start) * 1000) / 1000,
            midpoint: Math.round(((start + end) / 2) * 1000) / 1000,
          });
        }
        runCount = 0;
        runStartFrame = -1;
      }
    }

    if (runCount >= minFrames) {
      const start = (runStartFrame * frameSize) / sampleRate;
      const end = samples.length / sampleRate;
      intervals.push({
        start: Math.round(start * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
        duration: Math.round((end - start) * 1000) / 1000,
        midpoint: Math.round(((start + end) / 2) * 1000) / 1000,
      });
    }
    return intervals;
  };

  let found = runScan(noiseDb, minSec);
  const totalSec = samples.length / Math.max(1, sampleRate);
  if (found.length === 0 && totalSec > 20 * 60) {
    // Section 7.4 fallback: retry once with noise -28 dB and minimum 0.4 s
    found = runScan(-28, 0.4);
  }
  return found;
}

export default {
  parseSilenceLog,
  computeChunkSilenceRatio,
  detectSilenceIntervalsFromSamples,
};
