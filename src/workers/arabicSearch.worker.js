import { createBookSearchIndex, searchBookIndex } from "../lib/summaryV5/arabicNormalize.js";

let currentIndex = null;

self.onmessage = (event) => {
  const { id, type, payload } = event.data || {};
  try {
    if (type === "BUILD_INDEX") {
      const t0 = performance.now();
      currentIndex = createBookSearchIndex(payload?.chapters || []);
      const elapsedMs = Math.round((performance.now() - t0) * 100) / 100;
      self.postMessage({
        id,
        ok: true,
        type: "INDEX_READY",
        totalDocs: currentIndex.totalDocs,
        elapsedMs,
      });
      return;
    }

    if (type === "SEARCH") {
      const t0 = performance.now();
      const hits = currentIndex
        ? searchBookIndex(currentIndex, payload?.query || "", payload?.limit || 25)
        : [];
      const elapsedMs = Math.round((performance.now() - t0) * 100) / 100;
      self.postMessage({
        id,
        ok: true,
        type: "SEARCH_RESULTS",
        hits,
        elapsedMs,
      });
      return;
    }

    self.postMessage({ id, ok: false, error: `UNKNOWN_WORKER_ACTION:${String(type)}` });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message || "WORKER_ERROR" });
  }
};
