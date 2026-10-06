// src/lib/directUpload.js
// Direct browser-to-Telegram storage cloud uploader.
// Completely bypasses Vercel's 4.5MB serverless payload limit (FUNCTION_PAYLOAD_TOO_LARGE).
// Telegram API allows CORS (Access-Control-Allow-Origin: *) and files up to 50MB.

const BOT_TOKEN = "7601463756:AAFhPfm52g1x2epMhL7W2W35udCEyq8JDHA";
const ALPHA_CHAT_ID = "5923929978";

/**
 * Uploads any file (PDF, HTML, images, video) up to 50MB directly from the browser
 * to Telegram Cloud Storage CDN and returns a permanent stream proxy URL.
 */
export async function uploadDirectToTelegram(file, { onProgress } = {}) {
  if (!file) throw new Error("الملف غير متوفر");
  if (file.size > 48 * 1024 * 1024) {
    throw new Error("الملف أكبر من 48 ميجابايت (الحد الأقصى للرفع المباشر)");
  }

  const isImage = file.type?.startsWith("image/");
  const endpoint = isImage ? "sendPhoto" : "sendDocument";
  const fileField = isImage ? "photo" : "document";

  const formData = new FormData();
  formData.append("chat_id", ALPHA_CHAT_ID);
  formData.append("disable_notification", "true");
  formData.append(fileField, file, file.name);

  if (onProgress) onProgress(20);

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (onProgress) onProgress(70);

  const tgData = await res.json();
  if (!tgData.ok || !tgData.result) {
    throw new Error(tgData.description || "فشل رفع الملف إلى سحابة التليجرام");
  }

  const fileId =
    tgData.result.document?.file_id ||
    tgData.result.video?.file_id ||
    tgData.result.photo?.slice(-1)[0]?.file_id;

  if (!fileId) throw new Error("تعذر استخراج معرّف الملف من السحابة");

  const getFileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const getFileData = await getFileRes.json();
  const filePath = getFileData.result?.file_path;

  if (!filePath) throw new Error("تعذر استخراج مسار الملف السحابي");

  if (onProgress) onProgress(100);

  const streamUrl = `/api/stream-media?p=${encodeURIComponent(filePath)}&t=${encodeURIComponent(file.type || "application/octet-stream")}`;

  return {
    url: streamUrl,
    fileId,
    filePath,
    fileName: file.name,
    fileSize: file.size,
  };
}
