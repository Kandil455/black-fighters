/**
 * src/features/lectures/audio/planChunks.js — Pure chunk-planning algorithm (Section 7.5).
 *
 * Pure function: does NOT import ffmpeg or DOM APIs.
 *
 * Algorithm (Section 7.5):
 *   1. If duration <= CHUNK_MAX_SEC, return a single chunk.
 *   2. Set cursor = 0. Loop: remaining = duration - cursor. If remaining <= CHUNK_MAX_SEC,
 *      push the final chunk and stop.
 *   3. target = cursor + CHUNK_TARGET_SEC. Candidates are silences whose midpoint lies
 *      within target ± SPLIT_SEARCH_WINDOW_SEC and whose resulting chunk length is
 *      between CHUNK_MIN_SEC and CHUNK_MAX_SEC. Pick the longest silence (ties: closest
 *      to target). Cut at its midpoint, overlapBeforeSec = 0 (for next chunk), cutKind = 'silence'.
 *   4. No candidate: widen to any silence midpoint inside [cursor + MIN, cursor + MAX],
 *      closest to target.
 *   5. Still none: hard cut at target, and start the next chunk HARD_CUT_OVERLAP_SEC
 *      earlier (overlapBeforeSec = 4, cutKind = 'hard').
 *   6. Tail rule: if the final chunk would be shorter than 60 seconds, merge it into the
 *      previous chunk when that stays within CHUNK_MAX_SEC + 60, otherwise move the
 *      previous cut earlier so both chunks are at least 120 seconds.
 *   7. Output items carry both camelCase (`startSec`, `endSec`, `overlapBeforeSec`, `cutKind`)
 *      and snake_case (`start_sec`, `end_sec`) for compatibility across callers.
 */
import { LECTURE_CONFIG } from "../config.js";

const round3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Normalize silence inputs: accepts numbers (midpoint timestamps in seconds)
 * OR objects `{ start, end, duration?, midpoint? }`.
 */
function normalizeSilences(silences, duration) {
  if (!Array.isArray(silences)) return [];
  const items = [];
  for (const s of silences) {
    if (typeof s === "number") {
      if (Number.isFinite(s) && s > 0 && s < duration) {
        items.push({ start: s, end: s, duration: 0, midpoint: s });
      }
    } else if (s && typeof s === "object") {
      const start = Number(s.start ?? s.startSec);
      const end = Number(s.end ?? s.endSec);
      const rawMid = s.midpoint ?? s.midSec;
      const midpoint =
        rawMid != null && Number.isFinite(Number(rawMid))
          ? Number(rawMid)
          : Number.isFinite(start) && Number.isFinite(end)
          ? (start + end) / 2
          : NaN;
      const dur =
        s.duration != null && Number.isFinite(Number(s.duration))
          ? Number(s.duration)
          : Number.isFinite(start) && Number.isFinite(end)
          ? Math.max(0, end - start)
          : 0;
      if (Number.isFinite(midpoint) && midpoint > 0 && midpoint < duration) {
        items.push({
          start: Number.isFinite(start) ? start : midpoint,
          end: Number.isFinite(end) ? end : midpoint,
          duration: Math.max(0, dur),
          midpoint,
        });
      }
    }
  }
  items.sort((a, b) => a.midpoint - b.midpoint || b.duration - a.duration);
  return items;
}

function makeChunk(index, startSec, endSec, overlapBeforeSec, cutKind) {
  const s = round3(startSec);
  const e = round3(endSec);
  const ov = round3(overlapBeforeSec);
  return {
    index,
    startSec: s,
    endSec: e,
    durationSec: round3(e - s),
    overlapBeforeSec: ov,
    cutKind,
    // Backward-compatible aliases used by existing tests and server code
    start_sec: s,
    end_sec: e,
  };
}

/**
 * @param {number} durationSec
 * @param {Array<number|{start:number,end:number,duration?:number,midpoint?:number}>} [silences]
 * @param {object} [cfg]
 */
export function planChunks(durationSec, silences = [], cfg = LECTURE_CONFIG) {
  const duration = Math.max(0, Number(durationSec) || 0);
  if (duration <= 0) return [];

  const targetSec = Number(cfg.CHUNK_TARGET_SEC ?? LECTURE_CONFIG.CHUNK_TARGET_SEC);
  const minSec = Number(cfg.CHUNK_MIN_SEC ?? LECTURE_CONFIG.CHUNK_MIN_SEC);
  const maxSec = Number(cfg.CHUNK_MAX_SEC ?? LECTURE_CONFIG.CHUNK_MAX_SEC);
  const searchWindowSec = Number(cfg.SPLIT_SEARCH_WINDOW_SEC ?? LECTURE_CONFIG.SPLIT_SEARCH_WINDOW_SEC);
  const hardOverlapSec = Math.min(
    Number(cfg.HARD_CUT_OVERLAP_SEC ?? cfg.CHUNK_OVERLAP_SEC ?? LECTURE_CONFIG.HARD_CUT_OVERLAP_SEC),
    Math.floor(targetSec / 10),
  );

  // Rule 1: If duration <= CHUNK_MAX_SEC, return a single chunk.
  if (duration <= maxSec) {
    return [makeChunk(0, 0, duration, 0, "silence")];
  }

  const normalized = normalizeSilences(silences, duration);
  const rawChunks = [];
  let cursor = 0;
  let pendingOverlap = 0;
  let guard = 0;

  while (cursor < duration && guard < 10_000) {
    guard += 1;
    const remaining = duration - cursor;

    // Rule 2: If remaining <= CHUNK_MAX_SEC, push the final chunk and stop.
    if (remaining <= maxSec) {
      rawChunks.push({
        startSec: cursor,
        endSec: duration,
        overlapBeforeSec: pendingOverlap,
        cutKind: rawChunks.length > 0 ? rawChunks[rawChunks.length - 1].cutKind : "silence",
      });
      break;
    }

    const target = cursor + targetSec;
    const minCut = cursor + minSec;
    const maxCut = Math.min(cursor + maxSec, duration);

    // Rule 3: Candidates within target ± SPLIT_SEARCH_WINDOW_SEC AND [cursor + MIN, cursor + MAX]
    const winLow = Math.max(minCut, target - searchWindowSec);
    const winHigh = Math.min(maxCut, target + searchWindowSec);

    const primaryCandidates = normalized.filter(
      (s) => s.midpoint >= winLow - 1e-9 && s.midpoint <= winHigh + 1e-9,
    );

    let chosenCut = null;
    let cutKind = "silence";

    if (primaryCandidates.length > 0) {
      // Pick longest silence; ties go to closest to target
      primaryCandidates.sort((a, b) => {
        if (Math.abs(b.duration - a.duration) > 1e-6) return b.duration - a.duration;
        return Math.abs(a.midpoint - target) - Math.abs(b.midpoint - target);
      });
      chosenCut = primaryCandidates[0].midpoint;
      cutKind = "silence";
    } else {
      // Rule 4: Widen to any silence midpoint inside [cursor + MIN, cursor + MAX], closest to target
      const wideCandidates = normalized.filter(
        (s) => s.midpoint >= minCut - 1e-9 && s.midpoint <= maxCut + 1e-9,
      );
      if (wideCandidates.length > 0) {
        wideCandidates.sort(
          (a, b) => Math.abs(a.midpoint - target) - Math.abs(b.midpoint - target),
        );
        chosenCut = wideCandidates[0].midpoint;
        cutKind = "silence";
      }
    }

    if (chosenCut != null) {
      rawChunks.push({
        startSec: cursor,
        endSec: chosenCut,
        overlapBeforeSec: pendingOverlap,
        cutKind: "silence",
      });
      cursor = chosenCut;
      pendingOverlap = 0;
    } else {
      // Rule 5: Hard cut at target, start next chunk HARD_CUT_OVERLAP_SEC earlier
      const hardCut = Math.min(Math.max(target, minCut), maxCut);
      rawChunks.push({
        startSec: cursor,
        endSec: hardCut,
        overlapBeforeSec: pendingOverlap,
        cutKind: "hard",
      });
      cursor = Math.max(cursor + 1, hardCut - hardOverlapSec);
      pendingOverlap = round3(hardCut - cursor);
    }
  }

  // Rule 6: Tail rule — if the final chunk is shorter than 60s (or shorter than 120s when forced):
  if (rawChunks.length >= 2) {
    const last = rawChunks[rawChunks.length - 1];
    const prev = rawChunks[rawChunks.length - 2];
    const lastLen = last.endSec - last.startSec;
    if (lastLen < 60) {
      const mergedLen = last.endSec - prev.startSec;
      if (mergedLen <= maxSec + 60) {
        // Merge into previous chunk
        prev.endSec = last.endSec;
        rawChunks.pop();
      } else {
        // Move previous cut earlier so both chunks are at least 120 seconds
        const desiredLastStart = Math.max(prev.startSec + 120, duration - 120);
        const prevEnd = prev.cutKind === "hard" ? desiredLastStart + last.overlapBeforeSec : desiredLastStart;
        prev.endSec = prevEnd;
        last.startSec = desiredLastStart;
      }
    } else if (lastLen < 120 && (last.endSec - prev.startSec) > maxSec + 60) {
      const desiredLastStart = Math.max(prev.startSec + 120, duration - 120);
      const prevEnd = prev.cutKind === "hard" ? desiredLastStart + last.overlapBeforeSec : desiredLastStart;
      prev.endSec = prevEnd;
      last.startSec = desiredLastStart;
    }
  }

  return rawChunks.map((c, idx) =>
    makeChunk(idx, c.startSec, c.endSec, idx === 0 ? 0 : c.overlapBeforeSec, c.cutKind),
  );
}

/** Convenience for callers that only know the duration. */
export function planChunksSimple(durationSec, cfg = LECTURE_CONFIG) {
  return planChunks(durationSec, [], cfg);
}

export default planChunks;
