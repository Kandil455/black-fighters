import { requireUser } from "./_shared/firebase-admin.mjs";
import { getBotToken, getAlphaChatId } from "./_shared/telegram-engine.mjs";
import { handleError, json } from "./_shared/http.mjs";

/**
 * POST /api/telegram-upload  (multipart/form-data, field name `file`)
 *
 * Server-mediated replacement for the old browser→api.telegram.org uploader that
 * shipped the bot token inside the client bundle (src/lib/directUpload.js).
 *
 * Why multipart instead of the existing base64 `/api/upload-media`:
 *   base64 inflates the payload by ~33%, and the hosting request-body ceiling
 *   (Vercel ≈4.5MB, Netlify ≈6MB) is the real limit either way. Raw multipart
 *   therefore carries ~33% more file for the same ceiling.
 *
 * NOTE: files above MAX_UPLOAD_BYTES need a chunked/object-storage path — see
 * docs/TELEGRAM_ARCHITECTURE.md ("large media"). This endpoint never exposes a
 * credential to the browser.
 */

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024; // safe under both hosting body ceilings

/**
 * Minimal multipart/form-data parser for a single `file` field.
 *
 * Exported for tests: hand-rolled boundary parsing is exactly the kind of code
 * that silently corrupts uploads (off-by-one on the trailing CRLF, base64 vs
 * utf8 bodies from different hosts), so it gets direct unit coverage.
 */
export function parseMultipart(body, contentType, isBase64Encoded = false) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  const boundary = (boundaryMatch?.[1] || boundaryMatch?.[2] || "").trim();
  if (!boundary) throw new Error("INVALID_MULTIPART_BOUNDARY");

  // Netlify/Vercel hand us the body either as a UTF-8 string, a Buffer, or a
  // base64 string when the platform decoded it that way.
  const buffer = Buffer.isBuffer(body)
    ? body
    : Buffer.from(body == null ? "" : String(body), isBase64Encoded ? "base64" : "utf8");
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = buffer.indexOf(delimiter);

  while (index !== -1) {
    const next = buffer.indexOf(delimiter, index + delimiter.length);
    if (next === -1) break;
    parts.push(buffer.subarray(index + delimiter.length, next));
    index = next;
  }

  const files = [];
  for (const raw of parts) {
    const headerEnd = raw.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const headerText = raw.subarray(0, headerEnd).toString("utf8");
    if (!/name="file"/.test(headerText)) continue;
    const filename = /filename="([^"]*)"/.exec(headerText)?.[1] || "upload.bin";
    const mimeType = /Content-Type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() || "application/octet-stream";
    // Strip the trailing CRLF that belongs to the boundary, not the payload.
    let content = raw.subarray(headerEnd + 4);
    if (content.length >= 2 && content[content.length - 2] === 0x0d && content[content.length - 1] === 0x0a) {
      content = content.subarray(0, content.length - 2);
    }
    files.push({ filename, mimeType, content });
  }
  return files;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    await requireUser(event);

    const botToken = getBotToken();
    const chatId = getAlphaChatId();
    if (!botToken || !chatId) {
      // Fail closed: no server-side Telegram storage credentials configured.
      return json(503, { error: "STORAGE_NOT_CONFIGURED", message: "خدمة التخزين غير مهيأة على السيرفر." });
    }

    const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
    const files = parseMultipart(event.body, contentType, Boolean(event.isBase64Encoded));
    if (!files.length) throw new Error("MISSING_FILE_DATA");

    const { filename, mimeType, content } = files[0];
    if (!content?.length) throw new Error("EMPTY_FILE");
    if (content.length > MAX_UPLOAD_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }

    const isImage = mimeType.startsWith("image/");
    const endpoint = isImage ? "sendPhoto" : "sendDocument";
    const fileField = isImage ? "photo" : "document";
    const ext = (filename.split(".").pop() || "").slice(0, 8).replace(/[^A-Za-z0-9]/g, "") || "bin";
    const safeFilename = `bf_${Date.now()}.${ext}`;

    const boundary = "----BFBoundary" + Math.random().toString(36).slice(2);
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="disable_notification"\r\n\r\ntrue\r\n`),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${safeFilename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      ),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: payload,
      signal: AbortSignal.timeout(45000),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    if (!tgData.ok || !tgData.result) {
      console.warn("[telegram-upload] Telegram rejected the upload:", tgData.description || tgData.error_code);
      throw new Error("STORAGE_UPLOAD_FAILED");
    }

    const fileId =
      tgData.result.document?.file_id ||
      tgData.result.video?.file_id ||
      tgData.result.photo?.slice(-1)?.[0]?.file_id;
    if (!fileId) throw new Error("NO_FILE_ID_RETURNED");

    const getFileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`, {
      signal: AbortSignal.timeout(15000),
    });
    const getFileData = await getFileRes.json().catch(() => ({}));
    const filePath = getFileData.result?.file_path;
    if (!filePath) throw new Error("NO_FILE_PATH_RETURNED");

    return json(200, {
      ok: true,
      url: `/api/stream-media?p=${encodeURIComponent(filePath)}&t=${encodeURIComponent(mimeType)}`,
      fileId,
      fileName: filename,
      fileSize: content.length,
    });
  } catch (error) {
    const message = error?.message || "UPLOAD_FAILED";
    if (message === "FILE_TOO_LARGE") {
      return json(413, {
        error: "FILE_TOO_LARGE",
        message: `أقصى حجم للرفع المباشر ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(1)} ميجابايت. اضغط الملف أو ارفعه من المنصة.`,
      });
    }
    return handleError(error);
  }
};
