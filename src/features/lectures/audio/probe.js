/**
 * src/features/lectures/audio/probe.js — Media file validation, fingerprinting & duration probe.
 *
 * Accepts: mp3, m4a, aac, wav, ogg, opus, flac, webm, mp4, mov, mkv, 3gp, amr.
 * Enforces MAX_FILE_BYTES (2 GiB) and MAX_JOB_DURATION_SEC (4 hours).
 */
import { LECTURE_CONFIG } from "../config.js";

export const SUPPORTED_EXTENSIONS = Object.freeze([
  "mp3", "m4a", "aac", "wav", "ogg", "opus", "flac", "webm", "mp4", "mov", "mkv", "3gp", "amr",
]);

export const SUPPORTED_MIMES = Object.freeze([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac",
  "audio/wav", "audio/x-wav", "audio/wave", "audio/ogg", "audio/opus", "audio/flac",
  "audio/webm", "audio/3gpp", "audio/amr",
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/3gpp",
]);

/**
 * Validate file extension, mime type, and size.
 * @param {{name?:string, type?:string, size?:number}} file
 * @param {object} [cfg]
 */
export function validateMediaFile(file, cfg = LECTURE_CONFIG) {
  if (!file || typeof file !== "object") {
    const err = new Error("unsupported_file");
    err.code = "unsupported_file";
    throw err;
  }
  const name = String(file.name || "").trim();
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const mime = String(file.type || "").toLowerCase().split(";")[0].trim();

  const extOk = SUPPORTED_EXTENSIONS.includes(ext);
  const mimeOk =
    SUPPORTED_MIMES.includes(mime) ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/");

  if (!extOk && !mimeOk) {
    const err = new Error("unsupported_file");
    err.code = "unsupported_file";
    throw err;
  }

  const size = Number(file.size || 0);
  if (size > (cfg.MAX_FILE_BYTES || LECTURE_CONFIG.MAX_FILE_BYTES)) {
    const err = new Error("file_too_large");
    err.code = "file_too_large";
    throw err;
  }

  return { ext: ext || "mp3", mime: mime || "audio/mp3", sizeBytes: size };
}

export function validateDuration(durationSec, cfg = LECTURE_CONFIG) {
  const d = Number(durationSec);
  if (!Number.isFinite(d) || d <= 0) {
    const err = new Error("unsupported_file");
    err.code = "unsupported_file";
    throw err;
  }
  if (d > (cfg.MAX_JOB_DURATION_SEC || LECTURE_CONFIG.MAX_JOB_DURATION_SEC)) {
    const err = new Error("too_long");
    err.code = "too_long";
    throw err;
  }
  return d;
}

/**
 * Compute a lightweight deterministic fingerprint of the file (size + duration + FNV-1a of first 1 MB).
 */
export async function computeFileFingerprint(file, durationSec = 0) {
  const size = Number(file?.size || 0);
  const dur = Math.round(Number(durationSec || 0));
  let hash = 2166136261;
  try {
    if (typeof file?.slice === "function") {
      const head = file.slice(0, 1024 * 1024);
      const buf = await head.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const step = Math.max(1, Math.floor(bytes.length / 4096));
      for (let i = 0; i < bytes.length; i += step) {
        hash ^= bytes[i];
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
  } catch {
    /* fallback to size + duration + name */
  }
  return `fp_${size}_${dur}_${hash.toString(16)}`;
}

/**
 * Probe duration via HTMLMediaElement fallback when in browser.
 */
export function probeWithMediaElement(file) {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      reject(new Error("NO_DOM"));
      return;
    }
    const url = URL.createObjectURL(file);
    const el = document.createElement("audio");
    el.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
    };
    el.onloadedmetadata = () => {
      const dur = Number(el.duration);
      cleanup();
      if (Number.isFinite(dur) && dur > 0) resolve(dur);
      else reject(new Error("INVALID_MEDIA_DURATION"));
    };
    el.onerror = () => {
      cleanup();
      reject(new Error("MEDIA_ELEMENT_PROBE_FAILED"));
    };
    el.src = url;
  });
}

export default {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIMES,
  validateMediaFile,
  validateDuration,
  computeFileFingerprint,
  probeWithMediaElement,
};
