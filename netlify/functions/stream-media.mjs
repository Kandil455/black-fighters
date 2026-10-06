const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export const handler = async (event) => {
  const urlObj = event.rawUrl ? new URL(event.rawUrl) : null;
  const params = event.queryStringParameters || (urlObj ? Object.fromEntries(urlObj.searchParams.entries()) : {});
  const filePath = params.p || params.path;
  const mimeType = params.t || params.type || "application/octet-stream";

  if (!filePath || !/^[\w\-\.\/]+$/.test(filePath)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "INVALID_PATH" }),
    };
  }

  try {
    const telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const range = event.headers?.range || event.headers?.Range;

    const fetchHeaders = {};
    if (range) {
      fetchHeaders["Range"] = range;
    }

    const res = await fetch(telegramUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok && res.status !== 206) {
      return {
        statusCode: res.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "MEDIA_FETCH_FAILED" }),
      };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const headers = {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Access-Control-Allow-Origin": "*",
    };

    if (res.status === 206 && res.headers.get("content-range")) {
      headers["Content-Range"] = res.headers.get("content-range");
    }

    return {
      statusCode: res.status,
      headers,
      isBase64Encoded: true,
      body: buffer.toString("base64"),
    };
  } catch (err) {
    console.error("[stream-media] Error:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
