import { drainTelegramOutbox, outboxStats } from "./_shared/telegram-outbox.mjs";
import { json } from "./_shared/http.mjs";

/**
 * POST /api/telegram-outbox-worker
 *
 * Drains the platform → bot delivery queue. Called by the platform scheduler
 * (Vercel Cron / Netlify scheduled function) or manually by an admin.
 *
 * Auth: either the shared CRON_SECRET (`Authorization: Bearer <secret>` or
 * `?secret=`) or a signed-in admin. Without a configured secret it is NOT open —
 * an unauthenticated caller must not be able to make the bot send messages.
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const expected = String(process.env.CRON_SECRET || "").trim();
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const querySecret = event.queryStringParameters?.secret || "";
  const provided = bearer || querySecret;

  if (expected) {
    if (provided !== expected) return json(401, { error: "UNAUTHORIZED" });
  } else {
    const { requireUser, requireAdmin } = await import("./_shared/firebase-admin.mjs");
    try {
      await requireUser(event);
      await requireAdmin(event);
    } catch {
      return json(503, {
        error: "WORKER_NOT_CONFIGURED",
        message: "CRON_SECRET مش مضبوط والمشغّل مش أدمن — رفضنا التشغيل (فشل مغلق).",
      });
    }
  }

  const result = await drainTelegramOutbox({ limit: 25 });
  return json(200, { ...result, stats: await outboxStats(), at: new Date().toISOString() });
};
