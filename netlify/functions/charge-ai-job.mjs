import { calculateOcrCost, calculateSummaryCost } from "../../src/lib/economyCatalog.js";
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

function quotedCost(body) {
  if (body.task === "image_ocr") return Math.max(1, Math.ceil((Number(body.imageCount) || 1) / 5));
  if (body.task === "ocr") return calculateOcrCost(body.pageCount);
  if (body.task === "quiz") return Math.max(1, Math.ceil((Number(body.questionCount) || 10) / 5));
  if (body.task === "flashcards") return Math.max(1, Math.min(10, Math.ceil((Number(body.charCount) || 1) / 40_000)));
  return calculateSummaryCost(body.charCount);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const rawKey = body.jobKey || `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const jobKey = String(rawKey).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100) || `job_${Date.now()}`;
    const jobRef = adminDb.collection("summaryJobs").doc(`${user.uid}_${jobKey}`);
    const userRef = adminDb.collection("users").doc(user.uid);
    const ledgerRef = adminDb.collection("creditTransactions").doc(`ai_${user.uid}_${jobKey}`);
    const action = body.action || "charge";
    const result = await adminDb.runTransaction(async (transaction) => {
      const [jobSnap, userSnap] = await Promise.all([transaction.get(jobRef), transaction.get(userRef)]);
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");
      const profile = userSnap.data();
      const before = Number(profile.credits || 0);
      const job = jobSnap.exists ? jobSnap.data() : null;
      if (action === "finalize") {
        if (!job) throw new Error("NOT_FOUND_JOB");
        transaction.update(jobRef, { status: "completed", completed_at: FieldValue.serverTimestamp() });
        return { credits: before, cost: job.cost, status: "completed" };
      }
      if (action === "refund") {
        if (!job || job.status !== "charged") return { credits: before, cost: 0, status: job?.status || "missing" };
        const after = before + Number(job.cost || 0);
        transaction.update(userRef, { credits: after, updatedAt: FieldValue.serverTimestamp() });
        transaction.update(jobRef, { status: "refunded", refunded_at: FieldValue.serverTimestamp() });
        transaction.set(adminDb.collection("creditTransactions").doc(`refund_ai_${user.uid}_${jobKey}`), {
          user_id: user.uid, amount: Number(job.cost || 0), balance_before: before, balance_after: after,
          transaction_type: "refund", reason: "ai_job_failed", reference_id: jobKey,
          idempotency_key: `refund_ai_${user.uid}_${jobKey}`, created_at: FieldValue.serverTimestamp(),
        });
        return { credits: after, cost: job.cost, status: "refunded" };
      }
      if (job) return { credits: before, cost: job.cost, status: job.status };
      const cost = quotedCost(body);
      if (before < cost) throw new Error(`رصيدك غير كافي — محتاج ${cost} كريدت`);
      const after = before - cost;
      transaction.update(userRef, { credits: after, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(jobRef, {
        user_id: user.uid, task: body.task || "summary", cost, status: "charged",
        char_count: Number(body.charCount || 0), page_count: Number(body.pageCount || 0),
        total_chunks: Number(body.totalChunks || 1), completed_chunks: 0,
        fingerprint: String(body.fingerprint || ""), created_at: FieldValue.serverTimestamp(),
      });
      transaction.set(ledgerRef, {
        user_id: user.uid, amount: -cost, balance_before: before, balance_after: after,
        transaction_type: "spend", reason: "ai_job", reference_id: jobKey,
        idempotency_key: ledgerRef.id, created_at: FieldValue.serverTimestamp(),
      });
      return { credits: after, cost, status: "charged" };
    });
    return json(200, { success: true, ...result });
  } catch (error) {
    return handleError(error);
  }
};
