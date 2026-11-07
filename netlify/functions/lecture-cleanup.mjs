/**
 * netlify/functions/lecture-cleanup.mjs — Hourly cleanup of expired leases, stuck jobs, and old drafts (Section 8.1 & 15.6).
 *
 * POST /api/lecture-cleanup
 */
import { adminDb, FieldValue } from "./_shared/firebase-admin.mjs";
import { json, handleError } from "./_shared/http.mjs";
import { LECTURE_CONFIG } from "../../src/features/lectures/lib/config.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const nowMs = Date.now();
    const retentionMs = LECTURE_CONFIG.RETENTION_AUDIO_CHUNKS_HOURS * 3600 * 1000;
    const stuckThresholdMs = 15 * 60 * 1000;

    // 1. Prune expired inflight leases on lectureQueue/singleton
    const queueRef = adminDb.collection("lectureQueue").doc("singleton");
    let prunedLeases = 0;
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(queueRef);
      if (!snap.exists) return;
      const data = snap.data() || {};
      const leases = data.leases || {};
      const active = {};
      for (const [id, entry] of Object.entries(leases)) {
        if (entry && Number(entry.expiresAtMs || 0) > nowMs) {
          active[id] = entry;
        } else {
          prunedLeases += 1;
        }
      }
      const inflight = Object.keys(active).length;
      tx.set(
        queueRef,
        { leases: active, inflight, updated_at: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }).catch(() => {});

    // 2. Scan recent lectureJobs to clean up expired chunk URLs & stuck jobs
    let cleanedJobs = 0;
    let stuckJobsMarked = 0;
    const jobsSnap = await adminDb.collection("lectureJobs").limit(100).get().catch(() => ({ docs: [] }));

    for (const docSnap of jobsSnap.docs) {
      const job = docSnap.data();
      const updatedMs =
        typeof job.updated_date?.toMillis === "function"
          ? job.updated_date.toMillis()
          : Number(job.updated_date || 0);

      // Mark stuck transcribing jobs (>15m without update)
      if (job.status === "transcribing" && updatedMs > 0 && nowMs - updatedMs > stuckThresholdMs) {
        await docSnap.ref.set(
          {
            status: "failed",
            error: { code: "STUCK_JOB_TIMEOUT", message: "توقفت المعالجة بسبب انقطاع طويل" },
            updated_date: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        stuckJobsMarked += 1;
      }

      // Remove cancelled drafts older than 24h
      if (
        (job.status === "cancelled" || job.status === "draft") &&
        updatedMs > 0 &&
        nowMs - updatedMs > retentionMs
      ) {
        await docSnap.ref.delete().catch(() => {});
        cleanedJobs += 1;
      }
    }

    return json(200, {
      ok: true,
      pruned_leases: prunedLeases,
      stuck_jobs_marked: stuckJobsMarked,
      cleaned_jobs: cleanedJobs,
    });
  } catch (error) {
    return handleError(error);
  }
};
