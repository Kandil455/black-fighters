import { requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { validateAllowedMediaUrl } from "./_shared/media-security.mjs";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 6 * 1024 * 1024;

function validateUrl(value) {
  return validateAllowedMediaUrl(value);
}

async function fetchValidated(initialUrl) {
  let url = validateUrl(initialUrl);
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "IIIAK-Education/1.0" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      url = validateUrl(new URL(response.headers.get("location"), url).toString());
      continue;
    }
    if (!response.ok) throw new Error("MEDIA_FETCH_FAILED");
    return response;
  }
  throw new Error("MEDIA_REDIRECT_LIMIT");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    await requireUser(event);
    const { url } = parseBody(event);
    const response = await fetchValidated(url);
    const type = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (!ALLOWED_TYPES.has(type)) throw new Error("UNSUPPORTED_MEDIA_TYPE");
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("MEDIA_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("MEDIA_TOO_LARGE");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
      isBase64Encoded: true,
      body: Buffer.from(bytes).toString("base64"),
    };
  } catch (error) {
    return handleError(error);
  }
};
