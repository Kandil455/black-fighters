import { getBotUsername } from "./_shared/telegram-engine.mjs";
import { COMMANDS, NOTIFICATION_TYPES } from "./_shared/telegram-commands.mjs";
import { json } from "./_shared/http.mjs";

/**
 * GET /api/telegram-manifest
 *
 * A machine-readable description of what the bot actually does, consumed by the
 * web settings panel so the in-app help can never drift from the dispatcher.
 *
 * Public and cacheable: command names, descriptions and the bot handle only —
 * no secrets.
 */
export const handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "OPTIONS") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }
  const botUsername = getBotUsername();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
    body: JSON.stringify({
      ok: true,
      botUsername,
      botUrl: `https://t.me/${botUsername}`,
      miniAppPath: "/tg",
      commands: COMMANDS,
      notificationTypes: NOTIFICATION_TYPES,
    }),
  };
};
