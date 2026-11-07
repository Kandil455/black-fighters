import { adminDb } from "./_shared/firebase-admin.mjs";
import { json, parseBody } from "./_shared/http.mjs";
import crypto from "node:crypto";

/**
 * telegram-bot-store — tiny durable KV API for the standalone study bot.
 *
 * Why this exists: the free hosting plan of the bot has an ephemeral disk, so
 * its quota/progress/state silently wiped on every redeploy. The bot keeps an
 * in-memory store and flushes changes here (write-behind), then reloads on
 * boot — exactly the same pattern as the old Redis store, minus paid hosting.
 *
 * Auth: shared secret header (same secret used for the upstream webhook
 * forwarding). Values per doc are capped and stored in a dedicated namespace
 * that never collides with student data.
 */

const COLLECTION = "telegram_bot_store";
const MAX_VALUE_BYTES = 180_000; // per doc — the bot's keys are small by design
const MAX_OPS_PER_CALL = 400;    // under Firestore's 500-op batch ceiling
const KEY_RE = /^[A-Za-z0-9:._-]{1,120}$/;
const LOAD_LIMIT = 5000;         // firestore .get() default sane cap applied below

const encKey = (k) => "k_" + encodeURIComponent(String(k));
const decKey = (id) => (String(id).startsWith("k_") ? decodeURIComponent(String(id).slice(2)) : String(id));

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export const handler = async (event) => {
  try {
    const secret = String(process.env.TELEGRAM_UPSTREAM_SECRET || "");
    if (!secret) return json(503, { ok: false, error: "BOT_STORE_NOT_CONFIGURED" });
    const given = String(event.headers?.["x-bf-bot-secret"] || "");
    if (!given || !safeEqual(given, secret)) return json(401, { ok: false, error: "UNAUTHORIZED" });

    const method = String(event.httpMethod || "GET").toUpperCase();

    // Full reload — the bot calls this once at boot.
    if (method === "GET") {
      const snap = await adminDb.collection(COLLECTION).limit(LOAD_LIMIT).get();
      const entries = snap.docs.map((d) => ({ k: decKey(d.id), ...d.data() }));
      return json(200, { ok: true, entries, truncated: entries.length >= LOAD_LIMIT });
    }

    if (method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

    const body = parseBody(event);
    const ops = Array.isArray(body?.ops) ? body.ops : null;
    if (!ops || !ops.length) return json(400, { ok: false, error: "NO_OPS" });
    if (ops.length > MAX_OPS_PER_CALL) return json(413, { ok: false, error: "TOO_MANY_OPS" });

    const batch = adminDb.batch();
    let written = 0;
    for (const op of ops) {
      const k = op && typeof op.k === "string" ? op.k : null;
      if (!k || !KEY_RE.test(k) || k.includes("/")) continue;
      const ref = adminDb.collection(COLLECTION).doc(encKey(k));
      if (op.del) {
        batch.delete(ref);
        written += 1;
        continue;
      }
      const value = op.v;
      if (value === undefined) continue;
      const payload = JSON.stringify({ v: value, exp: Number(op.exp) || 0 });
      if (payload.length > MAX_VALUE_BYTES) continue;
      batch.set(ref, { v: value, exp: Number(op.exp) || 0 });
      written += 1;
    }

    if (written) await batch.commit();
    return json(200, { ok: true, written });
  } catch (error) {
    console.error("[telegram-bot-store]", error);
    return json(500, { ok: false, error: "INTERNAL" });
  }
};
