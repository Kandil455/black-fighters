import { invokeSecureFunction } from "./secureFunctions.js";
import { getOfflineSnapshot, setOfflineSnapshot } from "./offlineDb.js";
import { createBoundedLoader } from "./blobCache.js";

const localKey = (id) => `summary-job:v3:server-mirror:${id}`;
const draftKey = (courseId) => `summary-document:v3:draft:${courseId}`;
const localUpdateQueues = new Map();

async function serializeLocalUpdate(jobId, operation) {
  const previous = localUpdateQueues.get(jobId) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  localUpdateQueues.set(jobId, current);
  try {
    return await current;
  } finally {
    if (localUpdateQueues.get(jobId) === current) localUpdateQueues.delete(jobId);
  }
}

async function invoke(name, payload, fallback = null) {
  try {
    return (await invokeSecureFunction(name, payload)).data;
  } catch (error) {
    if (!fallback) throw error;
    const message = String(error?.message || error || "");
    if (/REVISION_CONFLICT|UNAUTHORIZED|FORBIDDEN|INVALID_|UNSAFE_|TOO_LARGE|NOT_FOUND/i.test(message)) throw error;
    return fallback(error);
  }
}

async function mirrorServerArtifacts(jobId, payload) {
  if (!payload?.job || !jobId) return;
  const chunks = [...(payload.job.chunks || [])];
  for (const artifact of payload.chunkOutputs || []) {
    const index = Number(artifact?.index);
    if (Number.isInteger(index) && chunks[index] && artifact?.output) chunks[index] = { ...chunks[index], output: artifact.output };
  }
  await setOfflineSnapshot(localKey(jobId), {
    ...payload.job,
    chunks,
    ...(payload.result ? { result: payload.result } : {}),
  });
}

export async function startSummaryJob({ courseId = "", fingerprint, totalChunks, config, idempotencyKey }) {
  const result = await invoke("start-summary-job", { courseId, fingerprint, totalChunks, config, idempotencyKey }, async () => {
    const id = `local:${idempotencyKey || crypto.randomUUID()}`;
    const job = {
      id, course_id: courseId, fingerprint, status: "queued", progress: 0,
      completed_chunks: 0, total_chunks: totalChunks, config,
      chunks: Array.from({ length: totalChunks }, (_, index) => ({ index, status: "pending", attempts: 0 })),
      offline: true,
    };
    await setOfflineSnapshot(localKey(id), job);
    return { job, chunkOutputs: [], result: null, offline: true };
  });
  await mirrorServerArtifacts(result?.job?.id, result).catch(() => {});
  return result;
}

export async function getSummaryJob(jobId) {
  const local = async () => {
    const job = await getOfflineSnapshot(localKey(jobId));
    return {
      job,
      chunkOutputs: (job?.chunks || []).filter((chunk) => chunk.output).map((chunk) => ({ index: chunk.index, output: chunk.output })),
      result: job?.result || null,
      offline: true,
    };
  };
  if (String(jobId).startsWith("local:")) return local();
  const result = await invoke("get-summary-job", { jobId }, local);
  await mirrorServerArtifacts(jobId, result).catch(() => {});
  return result;
}

export async function updateSummaryJob(jobId, update) {
  const updateLocal = () => serializeLocalUpdate(jobId, async () => {
    const current = await getOfflineSnapshot(localKey(jobId));
    if (!current) return { job: null, offline: true };
    const jobUpdate = { ...update };
    delete jobUpdate.chunkOutput;
    delete jobUpdate.resultOutput;
    const chunks = [...(current.chunks || [])];
    if (Number.isInteger(update.chunkIndex) && chunks[update.chunkIndex]) {
      chunks[update.chunkIndex] = {
        ...chunks[update.chunkIndex],
        status: update.chunkStatus || chunks[update.chunkIndex].status,
        attempts: update.chunkStatus === "running" ? Number(chunks[update.chunkIndex].attempts || 0) + 1 : chunks[update.chunkIndex].attempts,
        error: update.error || null,
        ...(update.chunkOutput ? { output: update.chunkOutput } : {}),
      };
    }
    const completed = chunks.filter((chunk) => chunk.status === "completed").length;
    const job = {
      ...current,
      ...jobUpdate,
      chunks,
      completed_chunks: completed,
      progress: chunks.length ? Math.round((completed / chunks.length) * 100) : 0,
      ...(update.resultOutput ? { result: update.resultOutput } : {}),
    };
    await setOfflineSnapshot(localKey(jobId), job);
    return { job, offline: true };
  });
  if (String(jobId).startsWith("local:")) return updateLocal();
  const result = await invoke("update-summary-job", { jobId, ...update }, updateLocal);
  await mirrorServerArtifacts(jobId, result).catch(() => {});
  return result;
}

export async function cancelSummaryJob(jobId) {
  if (String(jobId).startsWith("local:")) return updateSummaryJob(jobId, { status: "cancelled" });
  return invoke("cancel-summary-job", { jobId }, () => updateSummaryJob(jobId, { status: "cancelled" }));
}

export async function retrySummaryChunk(jobId, chunkIndex) {
  if (String(jobId).startsWith("local:")) return updateSummaryJob(jobId, { status: "running", chunkIndex, chunkStatus: "pending", error: null });
  return invoke("retry-summary-chunk", { jobId, chunkIndex });
}

export async function loadSummaryDocument(courseId) {
  return invoke("get-summary-document", { courseId }, async () => {
    const draft = await getOfflineSnapshot(draftKey(courseId));
    return draft || { document: null, revision: 0, offline: true };
  });
}

export async function saveSummaryDocument({ courseId, document, baseRevision = 0, reason = "autosave", renderedMarkdown = "" }) {
  const payload = { courseId, document, baseRevision, reason, renderedMarkdown };
  return invoke("save-summary-document", payload, async () => {
    const revision = Number(baseRevision) + 1;
    const result = { document, revision, offline: true, pendingSync: true };
    await setOfflineSnapshot(draftKey(courseId), result);
    return result;
  });
}

export async function listSummaryRevisions(courseId, limit = 20) {
  return invoke("list-summary-revisions", { courseId, limit }, async () => ({ revisions: [], offline: true }));
}

export async function searchLicensedImages(query, limit = 12) {
  return invoke("search-licensed-images", { query, limit });
}

export async function fetchLicensedImage(url) {
  const user = (await import("./firebase.js")).auth?.currentUser;
  if (!user) throw new Error("سجّل دخولك أولاً");
  const token = await user.getIdToken();
  const base = import.meta.env.VITE_FUNCTIONS_BASE_URL
    || (typeof window !== "undefined" && /\.netlify\.app$/i.test(window.location.hostname) ? "/.netlify/functions" : "/api");
  const response = await fetch(`${base.replace(/\/$/, "")}/proxy-media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "تعذر تحميل الصورة");
  return response.blob();
}

// Concurrent-safe, bounded LRU blob cache (see src/lib/blobCache.js).
// Same licensed image is fetched once per session instead of once per mount,
// and the cache can't grow without limit on a long lecture. The loader lives
// in a dependency-free module so tests/blobCache.test.mjs can unit-test the
// dedupe/evict/retry behavior directly under `node --test`.
const { load: fetchLicensedImageCached, cache: licensedImageCache } =
  createBoundedLoader(fetchLicensedImage, 60);
export { fetchLicensedImageCached };
