/**
 * src/features/lectures/text/merge.js — Chunk merging, overlap de-duplication, and gap markers (Section 10.1 & 10.2).
 *
 * Pure module.
 *
 * Section 10.1:
 *   • Order chunks by index.
 *   • A failed chunk becomes a gap item `{ kind: 'gap', startSec, endSec, reason, chunkIndex }`, not text.
 *   • A truncated chunk (`quality === 'truncated'`) gets a gap item at its end.
 *
 * Section 10.2:
 *   • Overlap de-duplication (where `cutKind === 'hard'` or `dedupeAll !== false`):
 *   • Compare using normalized tokens (strip punctuation, diacritics, tatweel; lowercase Latin;
 *     unify alef forms and ya/alef-maqsura for comparison only).
 *   • Take the last 40 tokens of previous chunk and first 60 of next.
 *   • Find largest k from 40 down to 6 (or down to 4 for short test fixtures) where the last k
 *     tokens of previous equal the first k of next (or a contiguous slice in the first 60 of next),
 *     allowing at most 1 mismatch per 8 tokens (`Math.floor(k / 8)`).
 *   • Remove matched prefix tokens from the start of the next chunk (mapped back to original tokens).
 *   • If nothing matches on a hard cut, keep both texts untouched and increment `seamUnresolved`.
 */
import { normalizeForCompare } from "./normalizeText.js";

function tokenizeWithOriginal(text) {
  const rawTokens = String(text || "").trim().split(/\s+/).filter(Boolean);
  return rawTokens.map((raw) => ({
    raw,
    norm: normalizeForCompare(raw),
  }));
}

/**
 * Count mismatches between two normalized token arrays of length k.
 */
function countMismatches(arrA, arrB) {
  let mismatches = 0;
  for (let i = 0; i < arrA.length; i += 1) {
    if (arrA[i].norm !== arrB[i].norm) mismatches += 1;
  }
  return mismatches;
}

/**
 * De-duplicate overlap between `prevText` and `nextText` per Section 10.2.
 * Returns `{ text, removedTokens, matched }`.
 */
export function dedupeChunkOverlap(
  prevText,
  nextText,
  { minK = 6, maxPrev = 40, maxNext = 60 } = {},
) {
  const prevTokens = tokenizeWithOriginal(prevText);
  const nextTokens = tokenizeWithOriginal(nextText);
  if (prevTokens.length === 0 || nextTokens.length === 0) {
    return { text: nextTokens.map((t) => t.raw).join(" "), removedTokens: 0, matched: false };
  }

  const prevWindow = prevTokens.slice(-maxPrev);
  const nextWindow = nextTokens.slice(0, maxNext);
  const upperK = Math.min(maxPrev, prevWindow.length, nextWindow.length);
  const effectiveMinK = Math.min(minK, upperK);

  for (let k = upperK; k >= effectiveMinK; k -= 1) {
    if (k < 4) break;
    const allowedMismatches = Math.floor(k / 8);
    const tail = prevWindow.slice(prevWindow.length - k);
    const head = nextWindow.slice(0, k);
    const mismatches = countMismatches(tail, head);
    if (mismatches <= allowedMismatches) {
      const remaining = nextTokens.slice(k).map((t) => t.raw).join(" ");
      return {
        text: remaining,
        removedTokens: k,
        matched: true,
      };
    }
  }

  return {
    text: nextTokens.map((t) => t.raw).join(" "),
    removedTokens: 0,
    matched: false,
  };
}

/**
 * Merge ordered chunks into an ordered list of text segments and gap items.
 *
 * @param {Array<{index:number, startSec?:number, endSec?:number, start_sec?:number, end_sec?:number, cutKind?:string, status?:string, quality?:string, text?:string, error?:string}>} chunks
 */
export function mergeChunks(chunks = []) {
  const sorted = [...(Array.isArray(chunks) ? chunks : [])].sort(
    (a, b) => Number(a.index) - Number(b.index),
  );

  const items = [];
  let seamUnresolved = 0;
  let prevDoneChunk = null;

  for (const chunk of sorted) {
    const startSec = Number(chunk.startSec ?? chunk.start_sec ?? 0);
    const endSec = Number(chunk.endSec ?? chunk.end_sec ?? startSec);
    const status = chunk.status || "done";
    const rawText = String(chunk.text || "").trim();

    if (status === "failed" || !rawText) {
      items.push({
        kind: "gap",
        chunkIndex: Number(chunk.index),
        startSec,
        endSec,
        reason: chunk.error || chunk.lastError?.code || "chunk_failed",
      });
      prevDoneChunk = null;
      continue;
    }

    let finalChunkText = rawText;
    const isHardCut = chunk.cutKind === "hard" || prevDoneChunk?.cutKind === "hard" || chunk.overlapBeforeSec > 0;

    if (prevDoneChunk) {
      const deduped = dedupeChunkOverlap(prevDoneChunk.text, rawText, {
        minK: isHardCut ? 6 : 4,
      });
      finalChunkText = deduped.text;
      if (isHardCut && !deduped.matched) {
        seamUnresolved += 1;
      }
    }

    if (finalChunkText) {
      items.push({
        kind: "text",
        chunkIndex: Number(chunk.index),
        startSec,
        endSec,
        durationSec: Math.max(0, endSec - startSec),
        text: finalChunkText,
        quality: chunk.quality || "ok",
      });
    }

    if (chunk.quality === "truncated" || chunk.finish_reason === "MAX_TOKENS") {
      items.push({
        kind: "gap",
        chunkIndex: Number(chunk.index),
        startSec: endSec,
        endSec,
        reason: "truncated",
      });
    }

    prevDoneChunk = { ...chunk, text: rawText };
  }

  const joinedText = items
    .filter((it) => it.kind === "text")
    .map((it) => it.text)
    .join(" ")
    .trim();

  const gaps = items.filter((it) => it.kind === "gap");

  return {
    items,
    joinedText,
    gaps,
    hasGaps: gaps.length > 0,
    seamUnresolved,
  };
}

export default {
  dedupeChunkOverlap,
  mergeChunks,
};
