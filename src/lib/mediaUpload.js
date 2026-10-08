/**
 * src/lib/mediaUpload.js — authenticated media uploads.
 *
 * SECURITY: this module never sees a Telegram credential. Uploads go to our own
 * function (`/api/telegram-upload`), which holds the token server-side. The file
 * it replaces (directUpload.js) had `BOT_TOKEN` and `ALPHA_CHAT_ID` hardcoded and
 * shipped them to every visitor; that token must be rotated via @BotFather.
 */
import { apiUrl, resolveMediaUrl } from "./apiBase.js";
import { auth } from "./firebase.js";

export const MAX_DIRECT_UPLOAD_BYTES = 3.5 * 1024 * 1024;

async function authHeaders() {
  try {
    const token = await auth?.currentUser?.getIdToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Uploads a File/Blob to platform storage and returns the permanent stream URL.
 * Throws with an Arabic-friendly message on failure so callers can surface it.
 *
 * @param {File|Blob} file
 * @param {{ onProgress?: (percent: number) => void }} [options]
 */
export async function uploadMedia(file, { onProgress } = {}) {
  if (!file) throw new Error("الملف غير متوفر");
  if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
    throw new Error(
      `الملف أكبر من ${(MAX_DIRECT_UPLOAD_BYTES / (1024 * 1024)).toFixed(1)} ميجابايت — اضغط الملف أو قسّمه ثم أعد المحاولة.`,
    );
  }

  const formData = new FormData();
  formData.append("file", file, file.name || "upload.bin");

  if (onProgress) onProgress(15);

  const res = await fetch(apiUrl("telegram-upload"), {
    method: "POST",
    headers: await authHeaders(), // let the browser set the multipart boundary
    body: formData,
  });

  if (onProgress) onProgress(75);

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.url) {
    throw new Error(data?.message || data?.error || "فشل رفع الملف");
  }

  if (onProgress) onProgress(100);
  return resolveMediaUrl(data.url);
}

export default { uploadMedia, MAX_DIRECT_UPLOAD_BYTES };
