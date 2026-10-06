import { requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { getJobArtifacts, getOwnedJob, serializeSnapshot } from "./_shared/summary-documents.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const { jobId } = parseBody(event);
    const { ref, snap } = await getOwnedJob(user.uid, jobId);
    const artifacts = await getJobArtifacts(ref);
    return json(200, { job: serializeSnapshot(snap), ...artifacts });
  } catch (error) {
    return handleError(error);
  }
};
