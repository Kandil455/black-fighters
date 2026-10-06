export const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

export function parseBody(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_JSON");
    return body;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function handleError(error) {
  const message = error?.message || "SERVER_ERROR";
  const status = /UNAUTHORIZED|auth|token/i.test(message) ? 401
    : /FORBIDDEN|admin/i.test(message) ? 403
    : /NOT_FOUND/i.test(message) ? 404
    : /DUPLICATE|ALREADY_CLAIMED|CONFLICT/i.test(message) ? 409
    : /INVALID|INSUFFICIENT|PHONE_NOT_VERIFIED|رصيد|المبلغ|الخطة|الباقة|الطلب/i.test(message) ? 400 : 500;
  return json(status, { error: message });
}
