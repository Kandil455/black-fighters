/**
 * src/features/lectures/audio/normalize.js — Audio normalization (mono, 16 kHz)
 * and encoder selection (`libmp3lame` -> `libopus` -> `pcm_s16le`).
 */
import { LECTURE_CONFIG } from "../config.js";
import { downmixToMono, decodeAudioFile } from "../lib/audioPipeline.js";

export const ENCODER_PRIORITY = Object.freeze(["libmp3lame", "libopus", "pcm_s16le"]);

/**
 * Pick the best encoder from an available list per Section 7.3:
 *   1. libmp3lame (audio/mp3, targetSec = cfg.CHUNK_TARGET_SEC)
 *   2. libopus    (audio/ogg, targetSec = cfg.CHUNK_TARGET_SEC)
 *   3. pcm_s16le  (audio/wav, targetSec = 300)
 */
export function selectAudioEncoder(availableEncoders = ENCODER_PRIORITY, cfg = LECTURE_CONFIG) {
  const set = new Set(availableEncoders);
  if (set.has("libmp3lame")) {
    return { encoder: "libmp3lame", mimeType: "audio/mp3", ext: "mp3", targetSec: cfg.CHUNK_TARGET_SEC };
  }
  if (set.has("libopus")) {
    return { encoder: "libopus", mimeType: "audio/ogg", ext: "ogg", targetSec: cfg.CHUNK_TARGET_SEC };
  }
  return { encoder: "pcm_s16le", mimeType: "audio/wav", ext: "wav", targetSec: 300 };
}

/**
 * Verify normalized duration is within 1 second of source duration.
 */
export function checkDurationDrift(sourceDurationSec, normalizedDurationSec) {
  const drift = Math.abs(Number(sourceDurationSec || 0) - Number(normalizedDurationSec || 0));
  return {
    withinTolerance: drift <= 1.0,
    driftSec: Math.round(drift * 100) / 100,
  };
}

/**
 * Normalize a browser File/Blob into 16 kHz mono samples and verify duration.
 */
export async function normalizeAudioFile(file, { onProgress } = {}) {
  const buffer = await decodeAudioFile(file, { onProgress });
  const mono = downmixToMono(buffer);
  const normalizedDurationSec = mono.length / buffer.sampleRate;
  const driftCheck = checkDurationDrift(buffer.duration, normalizedDurationSec);
  return {
    samples: mono,
    sampleRate: buffer.sampleRate,
    durationSec: buffer.duration,
    normalizedDurationSec,
    driftWarning: !driftCheck.withinTolerance,
    driftSec: driftCheck.driftSec,
  };
}

export default {
  ENCODER_PRIORITY,
  selectAudioEncoder,
  checkDurationDrift,
  normalizeAudioFile,
};
