import { requireUser } from "./_shared/firebase-admin.mjs";
import { createLinkCode, unlinkTelegram, LINK_CODE_TTL_MS } from "./_shared/telegram-link.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { getBotUsername } from "./_shared/telegram-engine.mjs";

/**
 * POST /api/telegram-link
 *   { action: "create" } → { ok, code, deepLink, expiresAt }
 *   { action: "unlink" } → { ok }
 *
 * Authenticated. The account is taken from the verified Firebase token — never
 * from the request body — so a caller can only ever link THEIR OWN account.
 */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const { action = "create" } = parseBody(event);

    if (action === "unlink") {
      const result = await unlinkTelegram(user.uid);
      if (!result.ok) return json(400, { ok: false, error: result.error });
      return json(200, { ok: true, linked: false });
    }

    if (action !== "create") {
      return json(400, { ok: false, error: "UNKNOWN_ACTION" });
    }

    const { code, expiresAt, ttlMs } = await createLinkCode(user.uid);
    const botUsername = getBotUsername();
    return json(200, {
      ok: true,
      code,
      expiresAt,
      ttlMs: ttlMs || LINK_CODE_TTL_MS,
      deepLink: `https://t.me/${botUsername}?start=link_${code}`,
      botUsername,
      instructions: `افتح البوت وابعت: /link ${code}`,
    });
  } catch (error) {
    return handleError(error);
  }
};
