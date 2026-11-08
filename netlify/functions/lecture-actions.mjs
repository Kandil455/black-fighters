/**
 * netlify/functions/lecture-actions.mjs — Retry failed chunks, cancel lecture, delete lecture (Section 8.1 & 15).
 *
 * POST /api/lecture-actions
 * body: { action: "retryFailedChunks" | "cancelLecture" | "deleteLecture", job_id }
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { refundCreditsAtomic } from "./_shared/server-ai.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const action = String(body.action || "").trim();
    const jobId = String(body.job_id || body.jobId || "").trim();
    if (!action) return json(400, { error: "INVALID_REQUEST" });

    if (action === "listLectures") {
      const snap = await adminDb
        .collection("lectureJobs")
        .where("user_id", "==", user.uid)
        .get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const bSec = b.created_date?.seconds || (b.created_date ? new Date(b.created_date).getTime() / 1000 : 0);
        const aSec = a.created_date?.seconds || (a.created_date ? new Date(a.created_date).getTime() / 1000 : 0);
        return bSec - aSec;
      });
      return json(200, { ok: true, jobs: rows });
    }

    if (!jobId) return json(400, { error: "INVALID_REQUEST" });

    const jobRef = adminDb.collection("lectureJobs").doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) return json(404, { error: "NOT_FOUND" });
    const data = snap.data();
    if (data.user_id !== user.uid && data.ownerUid !== user.uid) {
      return json(401, { error: "UNAUTHORIZED" });
    }

    if (action === "getLectureData") {
      const [tSnap, oSnap] = await Promise.all([
        adminDb.collection("lectureTranscripts").doc(jobId).get().catch(() => ({ exists: false })),
        adminDb.collection("lectureOrganizations").doc(jobId).get().catch(() => ({ exists: false })),
      ]);
      return json(200, {
        ok: true,
        job: { id: snap.id, ...data },
        transcript: tSnap.exists ? tSnap.data() : null,
        organization: oSnap.exists ? oSnap.data() : null,
      });
    }

    if (action === "retryFailedChunks") {
      const manualRounds = Number(data.manual_retry_rounds || 0);
      if (manualRounds >= 2) {
        return json(400, { error: "MAX_MANUAL_RETRIES_EXCEEDED" });
      }
      const chunks = Array.isArray(data?.plan?.chunks) ? data.plan.chunks : [];
      const resetChunks = chunks.map((c) =>
        c.status === "failed"
          ? { ...c, status: "pending", attempts: 0, error: null, lease_until: 0 }
          : c,
      );
      await jobRef.set(
        {
          status: "transcribing",
          manual_retry_rounds: manualRounds + 1,
          "plan.chunks": resetChunks,
          "progress.chunks_failed": 0,
          error: null,
          updated_date: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return json(200, { ok: true, action, manual_retry_rounds: manualRounds + 1 });
    }

    if (action === "cancelLecture") {
      const chunks = Array.isArray(data?.plan?.chunks) ? data.plan.chunks : [];
      const total = Math.max(1, Number(data?.plan?.chunk_count || chunks.length || 1));
      const doneCount = chunks.filter((c) => c.status === "done").length;
      const charged = Number(data?.credits?.charged || 0);
      const usedShare = Math.ceil((doneCount / total) * charged);
      const refundable = Math.max(0, charged - usedShare - Number(data?.credits?.refunded || 0));

      if (refundable > 0) {
        await refundCreditsAtomic(user.uid, {
          amount: refundable,
          reason: "lecture_cancel_refund",
          referenceId: jobId,
        });
      }

      await jobRef.set(
        {
          status: "cancelled",
          "credits.refunded": Number(data?.credits?.refunded || 0) + refundable,
          updated_date: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return json(200, { ok: true, action, refunded: refundable });
    }

    if (action === "deleteLecture") {
      await Promise.all([
        jobRef.delete(),
        adminDb.collection("lectureTranscripts").doc(jobId).delete().catch(() => {}),
        adminDb.collection("lectureOrganizations").doc(jobId).delete().catch(() => {}),
        adminDb.collection("lectureSummaries").doc(`${jobId}_summary`).delete().catch(() => {}),
        adminDb.collection("lectureSummaries").doc(`${jobId}_study`).delete().catch(() => {}),
      ]);
      return json(200, { ok: true, action, deleted: jobId });
    }

    return json(400, { error: "UNKNOWN_ACTION" });
  } catch (error) {
    return handleError(error);
  }
};
