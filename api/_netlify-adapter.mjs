export function adaptNetlifyHandler(handler) {
  return async function handleVercelRequest(request) {
    const method = request.method || "GET";
    const body = method === "GET" || method === "HEAD" ? "" : await request.text();
    const urlObj = new URL(request.url);
    const event = {
      httpMethod: method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
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
