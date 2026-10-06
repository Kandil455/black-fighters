import { handleError, json, parseBody } from "./_shared/http.mjs";
import { requireUser } from "./_shared/firebase-admin.mjs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.ALPHA_TELEGRAM_CHAT_ID || "";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    // Auth required — this endpoint stores arbitrary files on the platform's Telegram storage
    await requireUser(event);

    const body = parseBody(event);
    let { dataUrl, base64, filename = "upload.bin", mimeType = "application/octet-stream" } = body;

    let buffer;
    if (dataUrl && typeof dataUrl === "string") {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        throw new Error("INVALID_DATA_URL");
      }
    } else if (base64) {
      buffer = Buffer.from(base64, "base64");
    } else {
      throw new Error("MISSING_FILE_DATA");
    }

    if (buffer.length > 45 * 1024 * 1024) {
      throw new Error("FILE_TOO_LARGE");
    }

    // Determine extension
    let ext = filename.split(".").pop();
    if (!ext || ext === filename) {
      ext = mimeType.includes("video") ? "mp4" : mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    }
    const finalFilename = `bf_${Date.now()}.${ext}`;

    // Upload to Telegram Storage Cloud (Unlimited, permanent, high-speed CDN)
    const isImage = mimeType.startsWith("image/");
    const endpoint = isImage ? "sendPhoto" : "sendDocument";
    const fileField = isImage ? "photo" : "document";

    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="disable_notification"\r\n\r\ntrue\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${finalFilename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(payload.length),
      },
      body: payload,
      signal: AbortSignal.timeout(30000),
    });

    const tgData = await tgRes.json();
    if (!tgData.ok || !tgData.result) {
      console.warn("Telegram sendDocument error:", tgData);
      throw new Error("STORAGE_UPLOAD_FAILED");
    }

    const fileId = tgData.result.document?.file_id || tgData.result.video?.file_id || tgData.result.photo?.slice(-1)[0]?.file_id;
    if (!fileId) throw new Error("NO_FILE_ID_RETURNED");

    const getFileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const getFileData = await getFileRes.json();
    const filePath = getFileData.result?.file_path;

    if (!filePath) throw new Error("NO_FILE_PATH_RETURNED");

    // Return the permanent proxy stream URL
    const fileUrl = `/api/stream-media?p=${encodeURIComponent(filePath)}&t=${encodeURIComponent(mimeType)}`;
    return json(200, { ok: true, url: fileUrl });
  } catch (err) {
    console.error("[upload-media] Error:", err.message);
    return handleError(err);
  }
};
