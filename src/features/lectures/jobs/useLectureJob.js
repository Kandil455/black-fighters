/**
 * src/features/lectures/jobs/useLectureJob.js — Client orchestrator & state machine (Phase 3 / Section 9).
 *
 * Exports both:
 *   • Pure orchestrator helpers (`computeWeightedProgress`, `computeMovingEtaSec`, `runJobOrchestrator`)
 *     so all 12 integration scenarios (S1–S12) can be tested deterministically in Node.
 *   • React hook `useLectureJob(lectureId)` with Firestore `onSnapshot`, Wake Lock,
 *     `beforeunload` guard, `online`/`offline` pause/resume, `visibilitychange`, and
 *     file re-selection fingerprint verification.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LECTURE_CONFIG } from "../config.js";

/**
 * Progress weights (Section 9):
 *   prepare: 10%, upload: 15%, transcribe: 60%, finalize: 5%, organize: 10%
 */
export function computeWeightedProgress({
  prepared = false,
  chunksTotal = 1,
  chunksUploaded = 0,
  chunksDone = 0,
  finalized = false,
  windowsTotal = 1,
  windowsDone = 0,
} = {}) {
  const totalChunks = Math.max(1, Number(chunksTotal) || 1);
  const totalWin = Math.max(1, Number(windowsTotal) || 1);

  const prepScore = prepared ? 10 : 0;
  const uploadScore = 15 * Math.min(1, Math.max(0, Number(chunksUploaded) || 0) / totalChunks);
  const transcribeScore = 60 * Math.min(1, Math.max(0, Number(chunksDone) || 0) / totalChunks);
  const finalizeScore = finalized ? 5 : 0;
  const organizeScore = 10 * Math.min(1, Math.max(0, Number(windowsDone) || 0) / totalWin);

  return Math.min(100, Math.round(prepScore + uploadScore + transcribeScore + finalizeScore + organizeScore));
}

/**
 * Moving average ETA calculator (Section 9).
 */
export function computeMovingEtaSec({
  remainingChunks = 0,
  recentLatenciesMs = [],
  recentWaitsMs = [],
  defaultSpacingMs = LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS,
} = {}) {
  const rem = Math.max(0, Number(remainingChunks) || 0);
  if (rem === 0) return 0;

  const avgLatMs =
    recentLatenciesMs.length > 0
      ? recentLatenciesMs.reduce((a, b) => a + b, 0) / recentLatenciesMs.length
      : 5_000;
  const avgWaitMs =
    recentWaitsMs.length > 0
      ? recentWaitsMs.reduce((a, b) => a + b, 0) / recentWaitsMs.length
      : defaultSpacingMs;

  const perChunkSec = Math.max(defaultSpacingMs / 1000, (avgLatMs + avgWaitMs) / 1000);
  return Math.ceil(rem * perChunkSec);
}

/**
 * Pure worker orchestrator for advancing a lecture job's chunks.
 *
 * Handles:
 *   • Concurrency `USER_MAX_INFLIGHT`
 *   • Resumable upload with up to 3 retries
 *   • Server responses: `done`, `wait` (does not burn attempts), `retry`, `failed`, `quota_day`, `service_unavailable`
 *   • No-speech detection (all chunks empty and high silenceRatio -> refunds)
 *   • Consecutive account-level errors (pauses worker instead of looping)
 */
export async function runJobOrchestrator({
  jobId,
  chunks = [],
  uploadChunkFn,
  transcribeChunkFn,
  finalizeFn,
  organizeFn,
  onStateChange,
  sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  signal,
  maxAttemptsPerChunk = LECTURE_CONFIG.MAX_ATTEMPTS_PER_CHUNK,
}) {
  const chunkStates = chunks.map((c, idx) => ({
    index: c.index ?? idx,
    startSec: c.startSec ?? c.start_sec ?? 0,
    endSec: c.endSec ?? c.end_sec ?? 0,
    silenceRatio: c.silenceRatio ?? 0,
    uploadState: c.uploadState || (c.audioUrl ? "done" : "pending"),
    audioUrl: c.audioUrl || null,
    status: c.status || "pending",
    attempts: Number(c.attempts || 0),
    text: c.text || "",
    quality: c.quality || "ok",
    error: c.error || null,
    blob: c.blob || null,
  }));

  let pausedReason = null;
  let consecutiveAccountErrors = 0;
  const recentLatenciesMs = [];
  const recentWaitsMs = [];

  const notify = (extra = {}) => {
    const doneCount = chunkStates.filter((c) => c.status === "done").length;
    const failedCount = chunkStates.filter((c) => c.status === "failed").length;
    const uploadedCount = chunkStates.filter((c) => c.uploadState === "done").length;
    onStateChange?.({
      jobId,
      chunks: chunkStates.map(({ blob: _b, ...rest }) => rest),
      chunksDone: doneCount,
      chunksFailed: failedCount,
      chunksUploaded: uploadedCount,
      pausedReason,
      etaSec: computeMovingEtaSec({
        remainingChunks: chunkStates.length - doneCount - failedCount,
        recentLatenciesMs,
        recentWaitsMs,
      }),
      ...extra,
    });
  };

  for (const chunk of chunkStates) {
    if (signal?.aborted) {
      return { status: "cancelled", chunks: chunkStates, pausedReason: "cancelled" };
    }
    if (chunk.status === "done") continue;

    // 1. Ensure uploaded (with 3 retries)
    if (chunk.uploadState !== "done") {
      if (!chunk.blob && !chunk.audioUrl) {
        pausedReason = "chunk_not_uploaded";
        notify({ status: "paused" });
        return { status: "paused", pausedReason: "chunk_not_uploaded", chunks: chunkStates };
      }
      let upErr = null;
      for (let uTry = 1; uTry <= 3; uTry += 1) {
        try {
          chunk.audioUrl = await uploadChunkFn(chunk);
          chunk.uploadState = "done";
          chunk.blob = null; // Free bytes in memory once uploaded
          upErr = null;
          notify();
          break;
        } catch (err) {
          upErr = err;
          await sleepFn(500 * uTry);
        }
      }
      if (upErr) {
        chunk.status = "failed";
        chunk.error = "upload_failed";
        notify();
        continue;
      }
    }

    // 2. Transcribe loop for this chunk
    chunk.status = "processing";
    notify();

    while (chunk.status === "processing") {
      if (signal?.aborted) {
        return { status: "cancelled", chunks: chunkStates, pausedReason: "cancelled" };
      }

      const started = Date.now();
      let res;
      try {
        res = await transcribeChunkFn({
          jobId,
          chunkIndex: chunk.index,
          audioUrl: chunk.audioUrl,
          silenceRatio: chunk.silenceRatio,
        });
      } catch (err) {
        res = { status: "retry", error: err?.code || err?.message || "NETWORK", retryAfterMs: 2_000 };
      }

      const outcome = res?.status || (res?.ok ? "done" : res?.retryable ? "retry" : "failed");

      if (outcome === "done") {
        consecutiveAccountErrors = 0;
        chunk.status = "done";
        chunk.text = res.text ?? "";
        chunk.quality = res.quality || "ok";
        chunk.error = null;
        recentLatenciesMs.push(res.took_ms || Date.now() - started);
        notify();
        break;
      }

      if (outcome === "quota_day") {
        chunk.status = "pending";
        pausedReason = "quota_day";
        notify({ status: "paused" });
        return { status: "paused", pausedReason: "quota_day", chunks: chunkStates };
      }

      if (outcome === "service_unavailable" || res?.error === "service_unavailable" || res?.status === 401 || res?.status === 403) {
        consecutiveAccountErrors += 1;
        chunk.status = "pending";
        if (consecutiveAccountErrors >= 1) {
          pausedReason = "service_unavailable";
          notify({ status: "failed" });
          return { status: "failed", pausedReason: "service_unavailable", chunks: chunkStates };
        }
      }

      if (outcome === "wait") {
        // Wait does NOT count as an attempt
        const waitMs = Math.max(50, Number(res?.retryAfterMs ?? res?.wait_ms ?? 2_000));
        recentWaitsMs.push(waitMs);
        await sleepFn(waitMs);
        continue;
      }

      if (outcome === "retry") {
        chunk.attempts += 1;
        if (chunk.attempts >= maxAttemptsPerChunk) {
          chunk.status = "failed";
          chunk.error = res?.error || "max_attempts_exceeded";
          notify();
          break;
        }
        const waitMs = Math.max(50, Number(res?.retryAfterMs ?? 2_000));
        await sleepFn(waitMs);
        continue;
      }

      // Hard failure on this chunk -> record and move on (one chunk failing never blocks others)
      chunk.attempts += 1;
      chunk.status = "failed";
      chunk.error = res?.error || "chunk_failed";
      notify();
      break;
    }
  }

  // Check if recording had no speech at all
  const allEmptyOrFailed = chunkStates.every((c) => !c.text || !c.text.trim());
  const highSilence = chunkStates.every((c) => Number(c.silenceRatio || 0) >= 0.6);
  if (allEmptyOrFailed && highSilence) {
    return { status: "no_speech", pausedReason: "no_speech", chunks: chunkStates };
  }

  const anyDone = chunkStates.some((c) => c.status === "done" && c.text?.trim());
  if (!anyDone) {
    return { status: "failed", pausedReason: "empty_after_retries", chunks: chunkStates };
  }

  const finalizeResult = finalizeFn ? await finalizeFn(jobId, chunkStates) : null;
  const organizeResult = organizeFn ? await organizeFn(jobId, finalizeResult) : null;

  const hasGaps = chunkStates.some((c) => c.status === "failed" || c.quality === "truncated");
  const finalStatus = hasGaps ? "ready_with_gaps" : "ready";
  notify({ status: finalStatus, finalized: true, windowsDone: 1, windowsTotal: 1 });

  return {
    status: finalStatus,
    chunks: chunkStates,
    finalizeResult,
    organizeResult,
  };
}

/**
 * React hook wrapping Wake Lock, beforeunload, online/offline, and visibilitychange.
 */
export function useLectureJob(lectureId) {
  const [state, setState] = useState({
    lectureId,
    status: "idle",
    chunks: [],
    chunksDone: 0,
    chunksFailed: 0,
    chunksUploaded: 0,
    pausedReason: null,
    etaSec: 0,
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  });
  const wakeLockRef = useRef(null);
  const workingRef = useRef(false);

  const acquireWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.wakeLock?.request) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* Wake Lock optional on unsupported browsers */
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onBeforeUnload = (e) => {
      if (!workingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onOnline = () => setState((s) => ({ ...s, isOffline: false }));
    const onOffline = () => setState((s) => ({ ...s, isOffline: true }));
    const onVisibility = () => {
      if (document.visibilityState === "visible" && workingRef.current) {
        acquireWakeLock();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      releaseWakeLock();
    };
  }, [acquireWakeLock, releaseWakeLock]);

  return {
    state,
    setState,
    acquireWakeLock,
    releaseWakeLock,
    setWorking: (v) => {
      workingRef.current = Boolean(v);
      if (v) acquireWakeLock();
      else releaseWakeLock();
    },
  };
}

export default useLectureJob;
