/**
 * Bridges Netlify-style handlers (used across netlify/functions/**) onto Vercel's
 * Web `Request`/`Response` API.
 *
 * BINARY SAFETY: the previous implementation always did `await request.text()`.
 * That decodes the body as UTF-8, which silently corrupts any non-text payload —
 * a PDF/PNG uploaded through /api/telegram-upload would arrive with every invalid
 * UTF-8 sequence replaced by U+FFFD. Uploads looked successful and produced
 * broken files.
 *
 * Rule now: text-ish bodies (JSON, form-encoded, empty) keep the string path that
 * every existing handler expects; anything else is read as bytes and handed over
 * base64-encoded with `isBase64Encoded: true`, which is exactly what Netlify does
 * for binary bodies and what the upload parser already handles.
 */

const TEXTUAL_CONTENT_TYPES = [
  "application/json",
  "application/ld+json",
  "application/x-www-form-urlencoded",
  "application/javascript",
  "application/xml",
  "text/",
];

function isTextual(contentType) {
  const type = String(contentType || "").toLowerCase();
  if (!type) return true; // no content-type: preserve legacy behaviour
  return TEXTUAL_CONTENT_TYPES.some((prefix) => type.startsWith(prefix));
}

export function adaptNetlifyHandler(handler) {
  return async function handleVercelRequest(request) {
    const method = request.method || "GET";
    const headers = Object.fromEntries(request.headers.entries());

    let body = "";
    let isBase64Encoded = false;

    if (method !== "GET" && method !== "HEAD") {
      if (isTextual(headers["content-type"])) {
        body = await request.text();
      } else {
        const bytes = Buffer.from(await request.arrayBuffer());
        body = bytes.toString("base64");
        isBase64Encoded = true;
      }
    }

    const urlObj = new URL(request.url);
    const event = {
      httpMethod: method,
      headers,
      body,
      isBase64Encoded,
      rawUrl: request.url,
      path: urlObj.pathname,
      queryStringParameters: Object.fromEntries(urlObj.searchParams.entries()),
    };

    const result = await handler(event, {});
    const responseBody = result?.isBase64Encoded
      ? Buffer.from(result?.body || "", "base64")
      : result?.body ?? "";

    return new Response(responseBody, {
      status: result?.statusCode || 200,
      headers: result?.headers || { "Content-Type": "application/json; charset=utf-8" },
    });
  };
}
