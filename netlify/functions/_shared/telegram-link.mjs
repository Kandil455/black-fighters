/**
 * telegram-link.mjs — secure Telegram ⇄ platform account linking.
 *
 * WHY THIS EXISTS (replaced two live vulnerabilities):
 *  1. `/start link_<userId>` trusted the platform uid typed into the deep link.
 *     Public profile pages expose uids (/u/:id), so anyone could link their own
 *     Telegram chat to somebody else's account and inherit their subscription.
 *  2. `/link <email>` looked an account up by email and linked it with zero
 *     proof of ownership — the same hijack, one guess away.
 *
 * The flow is now code-based and single-use:
 *   web (authenticated)  → POST /api/telegram-link {action:"create"} → 8-char code
 *   user taps the deep link → bot `/link <code>` → consumeLinkCode() links the chat
 *
 * Codes live in `telegram_link_codes/{code}` (server-only per firestore.rules),
 * expire after 10 minutes, and can be redeemed exactly once.
 */

import crypto from "node:crypto";
import { adminDb, FieldValue } from "./firebase-admin.mjs";

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;

// Alphabet avoids 0/O/1/I/L so the code survives being retyped from a screenshot.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** `/link abcd1234`, `ABCD-1234`, `  abcd1234  ` → canonical code. */
export function normalizeLinkCode(raw) {
  const cleaned = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_RE.test(cleaned) ? cleaned : "";
}

function generateCode() {
  let out = "";
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Creates (or reuses) a pending link code for a platform user.
 * Reuse matters: a user tapping "اربط تيليجرام" twice keeps one live code
 * instead of littering the collection.
 */
export async function createLinkCode(uid, { ttlMs = LINK_CODE_TTL_MS } = {}) {
  if (!uid) throw new Error("MISSING_UID");
  const now = Date.now();
  const expiresAt = now + ttlMs;

  // Drop this user's own expired/used codes first (bounded, 10 docs max).
  try {
    const stale = await adminDb
      .collection("telegram_link_codes")
      .where("uid", "==", uid)
      .limit(10)
      .get();
    await Promise.all(
      stale.docs
        .filter((doc) => {
          const d = doc.data();
          return d.used_at || !d.expires_at || d.expires_at < now;
        })
        .map((doc) => doc.ref.delete().catch(() => {})),
    );
  } catch (err) {
    console.warn("[telegram-link] stale code cleanup skipped:", err.message);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      await adminDb.collection("telegram_link_codes").doc(code).set({
        uid,
        created_at: new Date(now).toISOString(),
        expires_at: expiresAt,
        used_at: null,
        chat_id: null,
      });
      return { code, expiresAt, ttlMs };
    } catch (err) {
      // Collision is astronomically unlikely (31^8); retry a few times anyway.
      if (attempt === 4) throw err;
    }
  }
  throw new Error("LINK_CODE_GENERATION_FAILED");
}

/**
 * Redeems a code for a Telegram chat. Returns `{ ok, uid, linked, user }` or
 * `{ ok: false, error }` — never throws for invalid input.
 *
 * `INVALID_CODE` / `CODE_EXPIRED` / `CODE_ALREADY_USED` are intentionally
 * indistinguishable in the bot's user-facing copy.
 */
export async function consumeLinkCode(rawCode, chatId, telegramUser = {}) {
  const code = normalizeLinkCode(rawCode);
  if (!code) return { ok: false, error: "INVALID_CODE" };
  if (!chatId) return { ok: false, error: "MISSING_CHAT_ID" };

  const chatIdStr = String(chatId);
  const ref = adminDb.collection("telegram_link_codes").doc(code);

  let snap;
  try {
    snap = await ref.get();
  } catch (err) {
    console.warn("[telegram-link] code lookup failed:", err.message);
    return { ok: false, error: "LOOKUP_FAILED" };
  }
  if (!snap.exists) return { ok: false, error: "INVALID_CODE" };

  const record = snap.data() || {};
  const now = Date.now();
  if (record.used_at) return { ok: false, error: "CODE_ALREADY_USED" };
  if (!record.expires_at || Number(record.expires_at) < now) return { ok: false, error: "CODE_EXPIRED" };

  const uid = String(record.uid || "");
  if (!uid) return { ok: false, error: "INVALID_CODE" };

  const userRef = adminDb.collection("users").doc(uid);
  let userSnap;
  try {
    userSnap = await userRef.get();
  } catch (err) {
    console.warn("[telegram-link] user lookup failed:", err.message);
    return { ok: false, error: "LOOKUP_FAILED" };
  }
  if (!userSnap.exists) return { ok: false, error: "USER_NOT_FOUND" };

  const telegramId = telegramUser?.id ? String(telegramUser.id) : "";

  try {
    // One Telegram chat belongs to exactly one platform account: detach any
    // other account currently holding this chat id (the /limit(1) resolution in
    // checkSubscriberAccess would otherwise pick an arbitrary winner).
    const holders = await adminDb
      .collection("users")
      .where("telegram_chat_id", "==", chatIdStr)
      .limit(5)
      .get();
    await Promise.all(
      holders.docs
        .filter((doc) => doc.id !== uid)
        .map((doc) =>
          doc.ref
            .set({ telegram_chat_id: "", telegram_linked_at: null, telegram_relinked_at: new Date(now).toISOString() }, { merge: true })
            .catch(() => {}),
        ),
    );

    // Same for the Telegram numeric id (Mini App auth resolves by telegram_id).
    let drainables = 0;
    let drainedCredits = 0;
    const orphanRefs = [];
    if (telegramId) {
      const idHolders = await adminDb
        .collection("users")
        .where("telegram_id", "==", telegramId)
        .limit(5)
        .get();
      await Promise.all(
        idHolders.docs
          .filter((doc) => doc.id !== uid)
          .map((doc) =>
            doc.ref.set({ telegram_id: "" }, { merge: true }).catch(() => {})),
      );
      // Auto-created Telegram-first accounts (uid starts with "tg_") become
      // orphans after linking. Their welcome credits belong to the same human —
      // carry them over once instead of stranding them on an invisible account.
      for (const doc of idHolders.docs) {
        if (doc.id === uid || !doc.id.startsWith("tg_")) continue;
        orphanRefs.push(doc);
      }
    }

    for (const orphan of orphanRefs) {
      const orphanData = orphan.data() || {};
      const orphanCredits = Number(orphanData.credits || 0);
      if (!(orphanCredits > 0) || orphanData.credits_transferred_at) continue;
      const mainSnap = await userRef.get();
      const mainCredits = Number(mainSnap.data()?.credits || 0);
      await orphan.ref.set(
        { credits: 0, credits_transferred_at: new Date(now).toISOString(), credits_transferred_to: uid },
        { merge: true },
      );
      await userRef.set({ credits: mainCredits + orphanCredits }, { merge: true });
      drainedCredits += orphanCredits;
      drainables += 1;
    }

    if (drainables) {
      console.log(`[telegram-link] carried ${drainedCredits} credits from ${drainables} orphan tg account(s) into ${uid}`);
    }

    await userRef.set(
      {
        telegram_chat_id: chatIdStr,
        telegram_id: telegramId || FieldValue.delete(),
        telegram_username: telegramUser?.username || "",
        telegram_linked_at: new Date(now).toISOString(),
        updated_date: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await ref.set(
      { used_at: new Date(now).toISOString(), chat_id: chatIdStr, uid },
      { merge: true },
    );

    return {
      ok: true,
      uid,
      chatId: chatIdStr,
      user: { id: uid, ...(userSnap.data() || {}) },
      transferredCredits: drainedCredits,
      linkedName: userSnap.data()?.full_name || "",
    };
  } catch (err) {
    console.error("[telegram-link] link persist failed:", err.message);
    return { ok: false, error: "LINK_PERSIST_FAILED" };
  }
}

/** Detaches Telegram from a platform account (web "فصل الحساب" / bot `/unlink`). */
export async function unlinkTelegram(uid) {
  if (!uid) return { ok: false, error: "MISSING_UID" };
  try {
    await adminDb.collection("users").doc(uid).set(
      {
        telegram_chat_id: "",
        telegram_id: "",
        telegram_username: "",
        telegram_linked_at: null,
        telegram_unlinked_at: new Date().toISOString(),
      },
      { merge: true },
    );
    return { ok: true };
  } catch (err) {
    console.error("[telegram-link] unlink failed:", err.message);
    return { ok: false, error: "UNLINK_FAILED" };
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Direct-login sessions (`/start login_<code>` / `/login <code>`)
 * The web login page issues a short-lived pending session; the student sends
 * the code to the bot; approveLoginSession() resolves the target account and
 * marks the session approved so the polling browser can mint a custom token.
 * ───────────────────────────────────────────────────────────────────────── */
export const LOGIN_SESSION_TTL_MS = 10 * 60 * 1000;

/** Creates a pending login session. Optionally binds it to a known uid. */
export async function createLoginSession({ uid = "", ttlMs = LOGIN_SESSION_TTL_MS } = {}) {
  const now = Date.now();
  const expiresAt = now + ttlMs;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      await adminDb.collection("telegram_login_sessions").doc(code).set({
        uid: String(uid || ""),
        status: "pending",
        created_at: new Date(now).toISOString(),
        expires_at: expiresAt,
        approved_at: null,
        chat_id: null,
      });
      return { code, expiresAt, ttlMs };
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
  throw new Error("LOGIN_SESSION_GENERATION_FAILED");
}

/**
 * Redeems a login code sent to the bot. Never throws for invalid input —
 * returns `{ ok:true, code, uid, userName }` or `{ ok:false, error }`.
 *
 * Resolution order:
 *  1. session bound to a uid (web asked "log THIS account in") → link the chat, done.
 *  2. anonymous session → find the platform account already linked to this
 *     Telegram chat / numeric id (the student linked before).
 */
export async function approveLoginSession(rawCode, chatId, telegramUser = {}) {
  const code = normalizeLinkCode(rawCode);
  if (!code) return { ok: false, error: "INVALID_CODE" };
  if (!chatId) return { ok: false, error: "MISSING_CHAT_ID" };

  const chatIdStr = String(chatId);
  const ref = adminDb.collection("telegram_login_sessions").doc(code);

  let snap;
  try {
    snap = await ref.get();
  } catch (err) {
    console.warn("[telegram-link] login session lookup failed:", err.message);
    return { ok: false, error: "LOOKUP_FAILED" };
  }
  if (!snap.exists) return { ok: false, error: "INVALID_CODE" };

  const session = snap.data() || {};
  const now = Date.now();
  if (session.status && session.status !== "pending") return { ok: false, error: "CODE_ALREADY_USED" };
  if (!session.expires_at || Number(session.expires_at) < now) return { ok: false, error: "CODE_EXPIRED" };

  let uid = String(session.uid || "");

  // Anonymous session: resolve the platform account via the Telegram linkage.
  if (!uid) {
    const telegramId = telegramUser?.id ? String(telegramUser.id) : "";
    try {
      const byChat = await adminDb
        .collection("users")
        .where("telegram_chat_id", "==", chatIdStr)
        .limit(1)
        .get();
      if (!byChat.empty) {
        uid = byChat.docs[0].id;
      } else if (telegramId) {
        const byId = await adminDb
          .collection("users")
          .where("telegram_id", "==", telegramId)
          .limit(1)
          .get();
        if (!byId.empty) uid = byId.docs[0].id;
      }
    } catch (err) {
      console.warn("[telegram-link] login user resolution failed:", err.message);
      return { ok: false, error: "LOOKUP_FAILED" };
    }
  }
  if (!uid) return { ok: false, error: "USER_NOT_FOUND" };

  try {
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { ok: false, error: "USER_NOT_FOUND" };
    const profile = userSnap.data() || {};

    if (session.uid) {
      await userRef.set(
        {
          telegram_chat_id: chatIdStr,
          telegram_id: telegramUser?.id ? String(telegramUser.id) : FieldValue.delete(),
          telegram_username: telegramUser?.username || "",
          telegram_linked_at: new Date(now).toISOString(),
          updated_date: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    await ref.set(
      {
        status: "approved",
        uid,
        chat_id: chatIdStr,
        approved_at: new Date(now).toISOString(),
      },
      { merge: true },
    );

    const userName =
      profile.displayName || profile.full_name || profile.first_name || profile.email || "";
    return { ok: true, code, uid, chatId: chatIdStr, userName };
  } catch (err) {
    console.error("[telegram-link] login approval failed:", err.message);
    return { ok: false, error: "APPROVAL_PERSIST_FAILED" };
  }
}
