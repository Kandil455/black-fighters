/**
 * telegram-outbox.mjs — durable platform → bot delivery.
 *
 * WHY A QUEUE: the platform's events (summary ready, quiz graded, plan approved,
 * review due) used to be fired inline from whichever request happened to trigger
 * them. If Telegram returned 429, or the lambda timed out, the message was simply
 * lost — there was no retry, no backoff and no dead-letter anywhere in the live
 * path (the tested `TelegramOutbox` class in telegram-v5.mjs was never wired up).
 *
 * Every outbound message is now a row in `telegram_outbox` (server-only per
 * firestore.rules) that a scheduled worker drains, honouring Telegram's
 * `retry_after` and moving permanently-failed rows to the dead-letter state.
 */

import { adminDb } from "./firebase-admin.mjs";
import { callTelegramApi, getBotToken } from "./telegram-engine.mjs";

const COLLECTION = "telegram_outbox";
const MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 30_000;

const outbox = () => adminDb.collection(COLLECTION);

/**
 * Queues a message for delivery.
 *
 * @param {object} params
 * @param {string} params.uid        platform user id (for auditing/opt-out)
 * @param {string|number} params.chatId recipient chat (resolved by the caller)
 * @param {'sendMessage'|'sendDocument'|'sendPhoto'|'sendPoll'} [params.method]
 * @param {object} params.payload    raw Telegram Bot API payload
 * @param {string} [params.kind]     event name, e.g. 'summary_ready'
 * @param {number} [params.dedupeKey] caller-supplied idempotency value
 */
export async function enqueueTelegramMessage({
  uid = null,
  chatId,
  method = "sendMessage",
  payload,
  kind = "generic",
  dedupeKey = null,
}) {
  if (!chatId || !payload) return { ok: false, error: "MISSING_TARGET_OR_PAYLOAD" };

  // Idempotency: the same event must not be delivered twice (a retried webhook
  // or a double-submitted form used to send duplicate messages).
  if (dedupeKey) {
    try {
      const existing = await outbox()
        .where("dedupe_key", "==", String(dedupeKey))
        .limit(1)
        .get();
      if (!existing.empty) return { ok: true, duplicate: true, id: existing.docs[0].id };
    } catch (err) {
      console.warn("[telegram-outbox] dedupe check failed:", err.message);
    }
  }

  const doc = {
    uid,
    chat_id: String(chatId),
    method,
    payload,
    kind,
    dedupe_key: dedupeKey ? String(dedupeKey) : null,
    status: "queued",
    attempts: 0,
    next_attempt_at: Date.now(),
    last_error: null,
    created_at: new Date().toISOString(),
  };

  try {
    const ref = await outbox().add(doc);
    return { ok: true, id: ref.id };
  } catch (err) {
    console.error("[telegram-outbox] enqueue failed:", err.message);
    return { ok: false, error: "ENQUEUE_FAILED" };
  }
}

/**
 * Drains due rows. Called by the scheduled worker (and safe to call on demand).
 * Returns a summary so the worker's response is diagnosable from logs.
 */
export async function drainTelegramOutbox({ limit = 25, now = Date.now() } = {}) {
  if (!getBotToken()) {
    return { ok: false, error: "NO_BOT_TOKEN", processed: 0, sent: 0, failed: 0, deadLettered: 0 };
  }

  let docs = [];
  try {
    const snap = await outbox()
      .where("status", "==", "queued")
      .limit(limit)
      .get();
    docs = snap.docs.filter((doc) => Number(doc.data()?.next_attempt_at || 0) <= now);
  } catch (err) {
    console.error("[telegram-outbox] drain query failed:", err.message);
    return { ok: false, error: "QUERY_FAILED", processed: 0, sent: 0, failed: 0, deadLettered: 0 };
  }

  let sent = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const doc of docs) {
    const row = doc.data() || {};
    const attempts = Number(row.attempts || 0) + 1;
    const result = await callTelegramApi(row.method || "sendMessage", row.payload || {});

    if (result?.ok) {
      sent += 1;
      await doc.ref
        .set({ status: "sent", attempts, sent_at: new Date().toISOString(), last_error: null }, { merge: true })
        .catch(() => {});
      continue;
    }

    const retryAfterSec = Number(result?.parameters?.retry_after || 0);
    const backoffMs = retryAfterSec > 0 ? retryAfterSec * 1000 : Math.pow(2, attempts) * DEFAULT_BACKOFF_MS;

    if (attempts >= MAX_ATTEMPTS) {
      deadLettered += 1;
      await doc.ref
        .set(
          {
            status: "dlq",
            attempts,
            last_error: result?.description || "DELIVERY_FAILED",
            dead_lettered_at: new Date().toISOString(),
          },
          { merge: true },
        )
        .catch(() => {});
    } else {
      failed += 1;
      await doc.ref
        .set(
          {
            status: "queued",
            attempts,
            next_attempt_at: now + backoffMs,
            last_error: result?.description || "DELIVERY_FAILED",
          },
          { merge: true },
        )
        .catch(() => {});
    }
  }

  return { ok: true, processed: docs.length, sent, failed, deadLettered };
}

/** Re-queues a dead-lettered row (admin recovery path). */
export async function replayDeadLetter(id) {
  if (!id) return { ok: false, error: "MISSING_ID" };
  try {
    await outbox().doc(String(id)).set(
      { status: "queued", attempts: 0, next_attempt_at: Date.now(), last_error: null, replayed_at: new Date().toISOString() },
      { merge: true },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function outboxStats() {
  try {
    const [queued, dlq] = await Promise.all([
      outbox().where("status", "==", "queued").count().get(),
      outbox().where("status", "==", "dlq").count().get(),
    ]);
    return { queued: queued.data().count, dlq: dlq.data().count };
  } catch {
    return { queued: null, dlq: null };
  }
}

export const OUTBOX_MAX_ATTEMPTS = MAX_ATTEMPTS;
