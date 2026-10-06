const WORKER_TIMEOUT = 5 * 60 * 1000;

export function supportsFileWorker() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function runWorkerTask(payload, { transfer = [], onProgress } = {}) {
  if (!supportsFileWorker()) return Promise.reject(new Error("worker_unavailable"));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/fileProcessor.worker.js", import.meta.url), { type: "module" });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("worker_timeout"));
    }, WORKER_TIMEOUT);

    const finish = () => {
      window.clearTimeout(timer);
      worker.terminate();
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "worker_failed"));
    };
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        onProgress?.(data);
        return;
      }
      if (data.id !== id) return;
      finish();
      if (data.type === "error") reject(new Error(data.error));
      else resolve(data.result);
    };
    worker.postMessage({ ...payload, id }, transfer);
  });
}

export async function extractFileInWorker(file, ext, onProgress) {
  const buffer = await file.arrayBuffer();
  return runWorkerTask({ task: "extract", ext, buffer }, { transfer: [buffer], onProgress });
}

export function splitTextInWorker(text, maxChars) {
  return runWorkerTask({ task: "chunk", text, maxChars });
}
