/**
 * src/features/lectures/audio/cutChunks.js — Lazy chunk cutting & plan preview helpers (Section 7.6 & 7.7).
 */
import { LECTURE_CONFIG, quoteLectureCredits } from "../config.js";
import { encodeWav } from "../lib/audioPipeline.js";
import { computeChunkSilenceRatio } from "./silence.js";

/**
 * Cut a single chunk from normalized mono samples.
 * Verify that copied duration is within 1.5s of planned duration.
 */
export function cutSingleChunk(
  monoSamples,
  sampleRate,
  chunkPlanItem,
  silences = [],
) {
  const startSec = Number(chunkPlanItem.startSec ?? chunkPlanItem.start_sec ?? 0);
  const endSec = Number(chunkPlanItem.endSec ?? chunkPlanItem.end_sec ?? 0);
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(monoSamples.length, Math.ceil(endSec * sampleRate));
  const slice = monoSamples.subarray(startSample, endSample);
  const actualDurationSec = slice.length / Math.max(1, sampleRate);
  const plannedDurationSec = endSec - startSec;
  const reEncoded = Math.abs(actualDurationSec - plannedDurationSec) > 1.5;

  const blob = encodeWav(slice, sampleRate);
  const silenceRatio = computeChunkSilenceRatio(startSec, endSec, silences);
  const paddedIdx = String(chunkPlanItem.index).padStart(3, "0");

  return {
    ...chunkPlanItem,
    index: chunkPlanItem.index,
    paddedIndex: paddedIdx,
    fileName: `chunk_${paddedIdx}.mp3`,
    blob,
    bytes: blob.size,
    silenceRatio,
    reEncoded,
  };
}

/**
 * Lazy async generator that cuts chunks one at a time so the caller can upload
 * and free each chunk before cutting the next (Section 7.6).
 */
export async function* cutChunksLazily(
  monoSamples,
  sampleRate,
  plan,
  silences = [],
  { signal } = {},
) {
  for (const item of plan) {
    if (signal?.aborted) throw new Error("ABORTED");
    const chunk = cutSingleChunk(monoSamples, sampleRate, item, silences);
    yield chunk;
  }
}

/**
 * Build the plan preview for the UI (Section 7.7):
 * chunkCount, durationSec, cutKind counts, estimated credits, estimated wait time range.
 */
export function buildPlanPreview(durationSec, plan, cfg = LECTURE_CONFIG) {
  const chunks = Array.isArray(plan) ? plan : [];
  const chunkCount = chunks.length;
  const silenceCuts = chunks.filter((c) => c.cutKind === "silence").length;
  const hardCuts = chunks.filter((c) => c.cutKind === "hard").length;
  const estimatedCredits = quoteLectureCredits(durationSec);

  const throughputPerMin = Math.max(1, Math.min(cfg.GEMINI_RPM_LIMIT || 3, cfg.GLOBAL_MAX_INFLIGHT * 3 || 3));
  const baseMinutes = chunkCount / throughputPerMin;
  const minWaitSec = Math.max(15, Math.round(baseMinutes * 60 * 0.85));
  const maxWaitSec = Math.max(30, Math.round(baseMinutes * 60 * 1.35));

  return {
    chunkCount,
    durationSec: Math.round(Number(durationSec) || 0),
    cutKindCounts: {
      silence: silenceCuts,
      hard: hardCuts,
    },
    silenceBased: hardCuts === 0,
    hardCutCount: hardCuts,
    estimatedCredits,
    estimatedWaitRangeSec: { min: minWaitSec, max: maxWaitSec },
  };
}

export default {
  cutSingleChunk,
  cutChunksLazily,
  buildPlanPreview,
};
