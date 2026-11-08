/**
 * lectureApi.js — typed wrapper over the lecture serverless functions.
 * All calls go through invokeSecureFunction (Firebase ID token attached).
 */
import { invokeSecureFunction } from "@/lib/secureFunctions";

async function callLectureFn(fnName, payload) {
  const res = await invokeSecureFunction(fnName, payload);
  const data = res && typeof res === "object" && "data" in res ? res.data : res;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...data, data };
  }
  return { data };
}

export const lectureApi = {
  create(payload) {
    return callLectureFn("lecture-create", payload);
  },
  claimChunk({ jobId, chunkIndex }) {
    return callLectureFn("lecture-chunk-claim", {
      job_id: jobId,
      chunk_index: chunkIndex,
    });
  },
  transcribeChunk({ jobId, chunkIndex, audioUrl, audioBase64, mime, leaseId }) {
    return callLectureFn("lecture-transcribe-chunk", {
      job_id: jobId,
      chunk_index: chunkIndex,
      audio_url: audioUrl,
      audio_base64: audioBase64,
      mime,
      lease_id: leaseId,
    });
  },
  finalize(jobId) {
    return callLectureFn("lecture-finalize", { job_id: jobId });
  },
  organize(jobId) {
    return callLectureFn("lecture-organize", { job_id: jobId });
  },
  summary(jobId, kind = "summary", level = "detailed") {
    return callLectureFn("lecture-summary", { job_id: jobId, kind, level });
  },
  getLectureData(jobId) {
    return callLectureFn("lecture-actions", { action: "getLectureData", job_id: jobId });
  },
  listLectures() {
    return callLectureFn("lecture-actions", { action: "listLectures" });
  },
  retryFailedChunks(jobId) {
    return callLectureFn("lecture-actions", { action: "retryFailedChunks", job_id: jobId });
  },
  cancelLecture(jobId) {
    return callLectureFn("lecture-actions", { action: "cancelLecture", job_id: jobId });
  },
  deleteLecture(jobId) {
    return callLectureFn("lecture-actions", { action: "deleteLecture", job_id: jobId });
  },
};

export default lectureApi;
