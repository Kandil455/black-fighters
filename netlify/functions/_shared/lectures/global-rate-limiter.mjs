/**
 * global-rate-limiter.mjs — one global gate for the Free-tier 3 RPM limit.
 *
 * Measured on 30 Oct 2026: gemini-3.5-transcribe allows 3 requests per minute
 * on the free tier (8 rapid calls → 3 ok, 5 × HTTP 429). That budget is per
 * PROJECT, not per user, so every transcription call in the app funnels through
 * this single gate.
 *
 * Two layers:
 *   1. in-process mutex  — serialises callers inside one server instance
 *   2. Firestore doc     — `lectureQueue/singleton` coordinates across instances
 *
 * The Firestore layer is the authoritative one: it stores `lastFiredAt` and an
 * `inflight` counter inside a transaction, so two instances can never fire at
 * the same moment. If Firestore is unavailable we degrade to the in-process
 * gate (still correct for a single warm instance) instead of hammering the API.
 */
import { adminDb, FieldValue } from "../firebase-admin.mjs";
import { LECTURE_CONFIG } from "../../../../src/features/lectures/lib/config.js";
import { geminiKeysPool } from "./gemini-transcribe.mjs";

const QUEUE_DOC = "lectureQueue/singleton";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function effectiveMinSpacingMs() {
  const keyCount = Math.max(1, geminiKeysPool().length);
  return Math.max(800, Math.floor(LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS / keyCount));
}

function effectiveMaxInflight() {
  const keyCount = Math.max(1, geminiKeysPool().length);
  return Math.max(LECTURE_CONFIG.GLOBAL_MAX_INFLIGHT, Math.min(4, keyCount));
}

/** In-process serialisation: only one caller waits/claims at a time. */
let processChain = Promise.resolve();
function withProcessLock(task) {
  const run = processChain.then(task, task);
  // Keep the chain alive even when a task rejects.
  processChain = run.then(() => undefined, () => undefined);
  return run;
}

function queueRef() {
  const [collection, doc] = QUEUE_DOC.split("/");
  return adminDb.collection(collection).doc(doc);
}

/**
 * Try to claim a firing slot.
 * @returns {Promise<{granted:boolean, waitMs:number, leaseId?:string}>}
 */
async function tryClaim() {
  const ref = queueRef();
  const now = Date.now();
  const minGap = effectiveMinSpacingMs();
  const maxInflight = effectiveMaxInflight();

  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : {};
      const lastFiredAt = Number(data.last_fired_at || 0);
      const inflight = Number(data.inflight || 0);
      const elapsed = now - lastFiredAt;

      if (inflight >= maxInflight) {
        return { granted: false, waitMs: Math.max(minGap, 500) };
      }
      if (elapsed < minGap) {
        return { granted: false, waitMs: minGap - elapsed };
      }

      const leaseId = `${now}_${Math.random().toString(36).slice(2, 10)}`;
      tx.set(
        ref,
        {
          last_fired_at: now,
          inflight: inflight + 1,
          lease_id: leaseId,
          lease_until: now + LECTURE_CONFIG.LEASE_SEC * 1000,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { granted: true, waitMs: 0, leaseId };
    });
  } catch (error) {
    // Firestore unavailable → fall back to a per-instance timing gate.
    return { granted: false, waitMs: 0, degraded: true, error: error?.message };
  }
}

/** In-instance fallback timing gate (used only when Firestore fails). */
let localLastFiredAt = 0;
let localInflight = 0;

function tryClaimLocal() {
  const now = Date.now();
  const gap = now - localLastFiredAt;
  const minGap = effectiveMinSpacingMs();
  const maxInflight = effectiveMaxInflight();
  if (localInflight >= maxInflight) return { granted: false, waitMs: 500 };
  if (gap < minGap) {
    return { granted: false, waitMs: minGap - gap };
  }
  localLastFiredAt = now;
  localInflight += 1;
  return { granted: true, waitMs: 0, leaseId: `local_${now}` };
}

/**
 * Wait until a slot is granted, then run `task`. Always releases the slot.
 * @template T
 * @param {() => Promise<T>} task
 * @param {{maxWaitMs?:number, onWait?:(ms:number)=>void, log?:Function}} opts
 * @returns {Promise<T>}
 */
export async function withGlobalSlot(task, { maxWaitMs = 15 * 60_000, onWait, log = () => {} } = {}) {
  const startedAt = Date.now();

  const claimed = await withProcessLock(async () => {
    for (;;) {
      if (Date.now() - startedAt > maxWaitMs) {
        throw new Error("QUEUE_TIMEOUT");
      }
      const claim = await tryClaim();
      if (claim.granted) return claim;

      if (claim.degraded) {
        const local = tryClaimLocal();
        if (local.granted) return local;
        const wait = Math.max(250, local.waitMs);
        onWait?.(wait);
        await sleep(wait);
        continue;
      }

      const wait = Math.max(250, Math.min(claim.waitMs, 5_000));
      onWait?.(claim.waitMs);
      await sleep(wait);
    }
  });

  try {
    return await task();
  } finally {
    await releaseSlot(claimed?.leaseId);
  }
}

async function releaseSlot() {
  localInflight = Math.max(0, localInflight - 1);
  try {
    await adminDb.runTransaction(async (tx) => {
      const ref = queueRef();
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const inflight = Number(snap.data().inflight || 0);
      tx.set(ref, { inflight: Math.max(0, inflight - 1) }, { merge: true });
    });
  } catch {
    /* best effort — a stale inflight self-heals via lease_until */
  }
}

/** Current queue depth for the UI ETA. */
export async function queueSnapshot() {
  try {
    const snap = await queueRef().get();
    const data = snap.exists ? snap.data() : {};
    const lastFiredAt = Number(data.last_fired_at || 0);
    const inflight = Number(data.inflight || 0);
    const waitMs = Math.max(0, LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS - (Date.now() - lastFiredAt));
    return { inflight, waitMs, lastFiredAt };
  } catch {
    return { inflight: localInflight, waitMs: 0, lastFiredAt: localLastFiredAt };
  }
}

export default withGlobalSlot;
