let seq = 0;

export function supportsFileWorker() {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function runWorkerTask(payload, transfer = [], onProgress) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const worker = new Worker(new URL("../workers/fileProcessor.worker.js", import.meta.url), {
      type: "module",
    });

    const cleanup = () => worker.terminate();

    worker.onmessage = ({ data }) => {
      if (data?.type === "progress") {
        onProgress?.(data);
        return;
      }
      if (data?.id !== id) return;
      cleanup();
      if (data.type === "error") reject(new Error(data.error || "worker_failed"));
      else resolve(data.result);
    };

    worker.onerror = (error) => {
      cleanup();
      reject(error);
    };

    worker.postMessage({ ...payload, id }, transfer);
  });
}

export async function extractFileInWorker(fileOrBuffer, ext, onProgress) {
  const sourceBuffer = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer.slice(0)
    : await fileOrBuffer.arrayBuffer();
  return runWorkerTask({ task: "extract", ext, buffer: sourceBuffer }, [sourceBuffer], onProgress);
}

export async function splitTextInWorker(text, maxChars) {
  return runWorkerTask({ task: "chunk", text, maxChars });
}
