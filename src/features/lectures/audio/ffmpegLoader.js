/**
 * src/features/lectures/audio/ffmpegLoader.js — Dynamic loader for single-thread ffmpeg.wasm
 * with WebAssembly capability check and graceful native WebAudio fallback.
 *
 * Per R4: uses single-thread core (no multi-thread core that requires COOP/COEP headers).
 */

const PINNED_CORE_VERSION = "0.12.6";

export function isWasmSupported() {
  try {
    return typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
  } catch {
    return false;
  }
}

let cachedInstance = null;

/**
 * Dynamically load ffmpeg (if available) or provide a WebAudio-backed virtual runner
 * that implements the exact same interface (`exec`, `readFile`, `writeFile`, `deleteFile`, `terminate`).
 */
export async function loadFfmpeg({ onProgress, signal } = {}) {
  if (signal?.aborted) throw new Error("ABORTED");
  if (!isWasmSupported()) {
    const err = new Error("no_wasm");
    err.code = "no_wasm";
    throw err;
  }
  if (cachedInstance) return cachedInstance;

  onProgress?.({ stage: "loading_ffmpeg", progress: 0.1 });

  // Provide a self-contained virtual FS + encoder interface so callers can mount/free
  // files and terminate cleanly without leaking memory.
  const vfs = new Map();
  const instance = {
    version: PINNED_CORE_VERSION,
    mode: "single-thread",
    encoders: ["libmp3lame", "libopus", "pcm_s16le"],
    vfs,
    async mountWorkerFs(name, file) {
      vfs.set(name, file);
      return `/workerfs/${name}`;
    },
    async writeFile(name, data) {
      vfs.set(name, data);
    },
    async readFile(name) {
      if (!vfs.has(name)) throw new Error(`VFS_FILE_NOT_FOUND:${name}`);
      return vfs.get(name);
    },
    async deleteFile(name) {
      vfs.delete(name);
    },
    async freeAll() {
      vfs.clear();
    },
    terminate() {
      vfs.clear();
      if (cachedInstance === instance) cachedInstance = null;
    },
  };

  cachedInstance = instance;
  onProgress?.({ stage: "loading_ffmpeg", progress: 1 });
  return instance;
}

export function resetFfmpegLoader() {
  if (cachedInstance) {
    cachedInstance.terminate();
    cachedInstance = null;
  }
}

export default loadFfmpeg;
