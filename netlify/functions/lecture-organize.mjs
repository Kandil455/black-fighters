/**
 * lecture-organize.mjs — DeepSeek groups numbered sentences into sections.
 *
 * POST /api/lecture-organize   body: { job_id }
 *
 * The model returns sentence IDS ONLY. A validator rejects any prose, then a
 * deterministic fallback guarantees full coverage (owner rules N2/N3, N1).
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { buildOrganizationPlan } from "../../src/features/lectures/lib/organize.js";
import { callOrganizeModel, organizeModelAvailable } from "./_shared/lectures/deepseek-organize.mjs";
import { getAdminOrganizerConfig } from "./_shared/lectures/admin-keys.mjs";

async function loadOwned(jobId, uid) {
  const jobSnap = await adminDb.collection("lectureJobs").doc(jobId).get();
  if (!jobSnap.exists) throw new Error("NOT_FOUND");
  if (jobSnap.data().user_id !== uid) throw new Error("UNAUTHORIZED");
  const tSnap = await adminDb.collection("lectureTranscripts").doc(jobId).get();
  if (!tSnap.exists) throw new Error("TRANSCRIPT_NOT_READY");
  return { jobRef: jobSnap.ref, transcript: tSnap.data() };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const jobId = String(body.job_id || "").trim();
    if (!jobId) return json(400, { error: "INVALID_REQUEST" });

    const { jobRef, transcript } = await loadOwned(jobId, user.uid);
    const orgCfg = await getAdminOrganizerConfig({ event, body, uid: user.uid });

    const result = await buildOrganizationPlan(transcript, {
      callModel: async ({ system, user: userPrompt }) =>
        callOrganizeModel({
          system,
          user: userPrompt,
          apiKeys: orgCfg.apiKeys,
          baseUrl: orgCfg.baseUrl,
          model: orgCfg.model,
        }),
    });

    await adminDb.collection("lectureOrganizations").doc(jobId).set({
      job_id: jobId,
      user_id: user.uid,
      model: organizeModelAvailable(orgCfg.apiKeys) ? (orgCfg.model || "deepseek-v4-flash-0731") : "deterministic-fallback",
      created_at: FieldValue.serverTimestamp(),
      plan: result.plan,
      validation: {
        passed: result.validation.passed,
        errors: result.validation.errors.slice(0, 20),
      },
      used_fallback: result.usedFallback,
      attempts: result.attempts,
    });

    await jobRef.set(
      {
        updated_date: FieldValue.serverTimestamp(),
        status: "ready",
        "progress.chunks_done": transcript.sentence_count ?? null,
      },
      { merge: true },
    );

    return json(200, {
      ok: true,
      sections: result.plan.sections.length,
      used_fallback: result.usedFallback,
      validation_passed: result.validation.passed,
      attempts: result.attempts,
      organization: {
        job_id: jobId,
        user_id: user.uid,
        plan: result.plan,
        created_at: new Date(),
      },
    });
  } catch (error) {
    if (error?.message === "NOT_FOUND") return json(404, { error: "NOT_FOUND" });
    if (error?.message === "UNAUTHORIZED") return json(401, { error: "UNAUTHORIZED" });
    if (error?.message === "TRANSCRIPT_NOT_READY") return json(409, { error: "TRANSCRIPT_NOT_READY" });
    return handleError(error);
  }
};
