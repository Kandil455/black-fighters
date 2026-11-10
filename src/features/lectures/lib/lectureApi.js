/**
 * lectureApi.js — typed wrapper over the lecture serverless functions.
 * All calls go through invokeSecureFunction (Firebase ID token attached)
 * and automatically prioritize user-provided Gemini API keys for lecture processing.
 */
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { getUserGeminiKeySync, getUserGeminiModeSync } from "@/lib/integrations";

function withUserGeminiPriority(payload = {}) {
  const userKey = String(payload?.user_gemini_key || getUserGeminiKeySync() || "").trim();
  const keyMode = String(payload?.ai_key_preference || getUserGeminiModeSync() || "auto_fallback").trim();
  return {
    ...payload,
    ...(userKey ? { user_gemini_key: userKey } : {}),
    ai_key_preference: keyMode,
  };
}

async function callLectureFn(fnName, payload) {
  const res = await invokeSecureFunction(fnName, withUserGeminiPriority(payload));
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
  transcribeChunk({ jobId, chunkIndex, audioUrl, audioBase64, mime, leaseId, userGeminiKey }) {
    return callLectureFn("lecture-transcribe-chunk", {
      job_id: jobId,
      chunk_index: chunkIndex,
      audio_url: audioUrl,
      audio_base64: audioBase64,
      mime,
      lease_id: leaseId,
      ...(userGeminiKey ? { user_gemini_key: userGeminiKey } : {}),
    });
  },
  finalize(jobId) {
    return callLectureFn("lecture-finalize", { job_id: jobId });
  },
  organize(jobId, userGeminiKey) {
    return callLectureFn("lecture-organize", {
      job_id: jobId,
      ...(userGeminiKey ? { user_gemini_key: userGeminiKey } : {}),
    });
  },
  summary(jobId, kind = "summary", level = "detailed", userGeminiKey) {
    return callLectureFn("lecture-summary", {
      job_id: jobId,
      kind,
      level,
      ...(userGeminiKey ? { user_gemini_key: userGeminiKey } : {}),
    });
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
