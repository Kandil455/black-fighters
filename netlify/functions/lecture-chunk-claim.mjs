/**
 * netlify/functions/lecture-chunk-claim.mjs — Claim a global transcription slot (Section 6.2 & 8.2).
 *
 * POST /api/lecture-chunk-claim
 * body: { job_id, chunk_index }
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { LECTURE_CONFIG } from "../../src/features/lectures/lib/config.js";
import { stepTokenBucket, stepInflightLeases } from "./_shared/lectures/token-bucket.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const jobId = String(body.job_id || "").trim();
    const chunkIndex = Number(body.chunk_index);
    if (!jobId || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return json(400, { error: "INVALID_REQUEST" });
    }

    const jobRef = adminDb.collection("lectureJobs").doc(jobId);
    const rateRef = adminDb.collection("lectureQueue").doc("singleton");

    const nowMs = Date.now();
    const result = await adminDb.runTransaction(async (tx) => {
      const [jobSnap, rateSnap] = await Promise.all([tx.get(jobRef), tx.get(rateRef)]);
      if (!jobSnap.exists) throw new Error("NOT_FOUND");
      const job = jobSnap.data();
      if (job.user_id !== user.uid && job.ownerUid !== user.uid) throw new Error("UNAUTHORIZED");

      const chunks = Array.isArray(job?.plan?.chunks) ? [...job.plan.chunks] : [];
      const existing = chunks.find((c) => Number(c.index) === chunkIndex);
      if (existing?.status === "done") {
        return { status: "done", claimed: false, wait_ms: 0 };
      }
      if (existing?.status === "processing" && Number(existing.lease_until || 0) > nowMs) {
        const waitMs = Math.min(5_000, Number(existing.lease_until) - nowMs);
        return { status: "wait", claimed: false, wait_ms: waitMs, retryAfterMs: waitMs };
      }
      if (Number(existing?.attempts || 0) >= LECTURE_CONFIG.MAX_ATTEMPTS_PER_CHUNK) {
        return { status: "failed", claimed: false, wait_ms: 0 };
      }

      const rateData = rateSnap.exists ? rateSnap.data() : {};
      const inflightStep = stepInflightLeases(rateData.leases || {}, {
        uid: user.uid,
        nowMs,
        leaseSec: LECTURE_CONFIG.LEASE_SEC,
        globalMax: LECTURE_CONFIG.GLOBAL_MAX_INFLIGHT,
        userMax: LECTURE_CONFIG.USER_MAX_INFLIGHT,
      });

      if (!inflightStep.acquired) {
        return {
          status: "wait",
          claimed: false,
          wait_ms: inflightStep.retryAfterMs,
          retryAfterMs: inflightStep.retryAfterMs,
        };
      }

      const bucketStep = stepTokenBucket(rateData.bucket || {}, nowMs, {
        rpmLimit: LECTURE_CONFIG.GEMINI_RPM_LIMIT,
        rpdGuard: LECTURE_CONFIG.GEMINI_RPD_GUARD,
        minSpacingMs: LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS,
      });

      if (bucketStep.quotaDay) {
        return {
          status: "quota_day",
          claimed: false,
          wait_ms: bucketStep.retryAfterMs,
          retryAfterMs: bucketStep.retryAfterMs,
        };
      }

      if (!bucketStep.allowed) {
        return {
          status: "wait",
          claimed: false,
          wait_ms: bucketStep.retryAfterMs,
          retryAfterMs: bucketStep.retryAfterMs,
        };
      }

      const leaseId = inflightStep.leaseId;
      const leaseUntil = nowMs + LECTURE_CONFIG.LEASE_SEC * 1000;
      const nextChunk = {
        ...(existing || { index: chunkIndex }),
        index: chunkIndex,
        status: "processing",
        lease_id: leaseId,
        lease_until: leaseUntil,
      };
      const nextChunks = chunks.filter((c) => Number(c.index) !== chunkIndex);
      nextChunks.push(nextChunk);
      nextChunks.sort((a, b) => Number(a.index) - Number(b.index));

      tx.set(
        rateRef,
        {
          bucket: bucketStep.nextState,
          leases: inflightStep.leases,
          last_fired_at: nowMs,
          inflight: inflightStep.globalCount,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        jobRef,
        {
          updated_date: FieldValue.serverTimestamp(),
          "plan.chunks": nextChunks,
        },
        { merge: true },
      );

      return {
        status: "claimed",
        claimed: true,
        lease_id: leaseId,
        wait_ms: 0,
        retryAfterMs: 0,
      };
    });

    return json(200, { ok: true, ...result });
  } catch (error) {
    if (error?.message === "NOT_FOUND") return json(404, { error: "NOT_FOUND" });
    if (error?.message === "UNAUTHORIZED") return json(401, { error: "UNAUTHORIZED" });
    return handleError(error);
  }
};
