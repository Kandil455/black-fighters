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
import { adminAuth, adminDb, FieldValue } from "./firebase-admin.mjs";

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

  const fallbackCode = generateCode();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = attempt === 0 ? fallbackCode : generateCode();
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
      if (attempt === 2) {
        console.warn("[telegram-link] Using memory fallback for link code:", err.message);
        return { code, expiresAt, ttlMs, memoryFallback: true };
      }
    }
  }
  return { code: fallbackCode, expiresAt, ttlMs };
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
    if (telegramId) {
      const idHolders = await adminDb
        .collection("users")
        .where("telegram_id", "==", telegramId)
        .limit(5)
        .get();
      await Promise.all(
        idHolders.docs
          .filter((doc) => doc.id !== uid)
          .map((doc) => doc.ref.set({ telegram_id: "" }, { merge: true }).catch(() => {})),
      );
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

    return { ok: true, uid, chatId: chatIdStr, user: { id: uid, ...(userSnap.data() || {}) } };
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

/**
 * Checks if a user or code is currently linked.
 */
export async function checkUserLinkStatus(uid, rawCode = "") {
  if (!uid) return { ok: false, linked: false };
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return { ok: true, linked: false };
    const data = snap.data() || {};
    const linked = Boolean(data.telegram_chat_id);
    return {
      ok: true,
      linked,
      telegramChatId: data.telegram_chat_id || "",
      telegramUsername: data.telegram_username || "",
    };
  } catch (err) {
    console.warn("[telegram-link] checkUserLinkStatus error:", err.message);
    return { ok: false, linked: false, error: err.message };
  }
}

/**
 * Creates a short-lived Telegram Login Session for web QR/bot handshake sign-in.
 */
export async function createLoginSession({ ttlMs = LINK_CODE_TTL_MS } = {}) {
  const code = generateCode();
  const now = Date.now();
  const expiresAt = now + ttlMs;

  await adminDb.collection("telegram_login_sessions").doc(code).set({
    code,
    status: "pending",
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt,
    uid: null,
    chat_id: null,
  });

  return { code, expiresAt, ttlMs };
}

/**
 * Approves a login session when user taps `/start login_<code>` or `/login <code>` in Telegram bot.
 */
export async function approveLoginSession(rawCode, chatId, telegramUser = {}) {
  const code = normalizeLinkCode(rawCode);
  if (!code) return { ok: false, error: "INVALID_CODE" };
  if (!chatId) return { ok: false, error: "MISSING_CHAT_ID" };

  const chatIdStr = String(chatId);
  const sessionRef = adminDb.collection("telegram_login_sessions").doc(code);
  const snap = await sessionRef.get();
  if (!snap.exists) return { ok: false, error: "INVALID_SESSION" };

  const session = snap.data() || {};
  const now = Date.now();
  if (session.status === "approved" || session.status === "consumed") {
    return { ok: true, alreadyApproved: true, uid: session.uid };
  }
  if (!session.expires_at || Number(session.expires_at) < now) {
    return { ok: false, error: "SESSION_EXPIRED" };
  }

  // Find existing user by telegram_id or telegram_chat_id, or create a new user
  const tgIdStr = telegramUser?.id ? String(telegramUser.id) : chatIdStr;
  let uid = `tg_${tgIdStr}`;
  let userDoc = null;

  try {
    let userSnap = await adminDb
      .collection("users")
      .where("telegram_id", "==", tgIdStr)
      .limit(1)
      .get();
    if (userSnap.empty) {
      userSnap = await adminDb
        .collection("users")
        .where("telegram_chat_id", "==", chatIdStr)
        .limit(1)
        .get();
    }
    if (!userSnap.empty) {
      uid = userSnap.docs[0].id;
      userDoc = userSnap.docs[0].data();
    }
  } catch (err) {
    console.warn("[telegram-link] user lookup error in approveLoginSession:", err.message);
  }

  const displayName =
    [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ") ||
    telegramUser?.username ||
    "Fighter";

  const userRef = adminDb.collection("users").doc(uid);
  const baseUserFields = {
    telegram_id: tgIdStr,
    telegram_chat_id: chatIdStr,
    telegram_username: telegramUser?.username || "",
    updated_date: FieldValue.serverTimestamp(),
  };

  if (!userDoc) {
    baseUserFields.full_name = displayName;
    baseUserFields.role = "user";
    baseUserFields.subscription_plan = "free";
    baseUserFields.subscription_status = "inactive";
    baseUserFields.credits = 15;
    baseUserFields.created_date = FieldValue.serverTimestamp();
  }

  await userRef.set(baseUserFields, { merge: true });

  await sessionRef.set(
    {
      status: "approved",
      uid,
      chat_id: chatIdStr,
      telegram_user: {
        id: tgIdStr,
        username: telegramUser?.username || "",
        first_name: telegramUser?.first_name || "",
      },
      approved_at: new Date(now).toISOString(),
    },
    { merge: true }
  );

  return { ok: true, uid, chatId: chatIdStr, userName: displayName };
}

/**
 * Polls a login session from the browser; if approved, mints a Firebase customToken.
 */
export async function pollLoginSession(rawCode) {
  const code = normalizeLinkCode(rawCode);
  if (!code) return { ok: false, error: "INVALID_CODE" };

  const sessionRef = adminDb.collection("telegram_login_sessions").doc(code);
  const snap = await sessionRef.get();
  if (!snap.exists) return { ok: false, error: "INVALID_SESSION" };

  const session = snap.data() || {};
  const now = Date.now();
  if (!session.expires_at || Number(session.expires_at) < now) {
    return { ok: false, status: "expired" };
  }

  if (session.status !== "approved") {
    return { ok: true, status: session.status || "pending" };
  }

  const uid = session.uid;
  if (!uid) return { ok: false, error: "MISSING_UID_IN_APPROVED_SESSION" };

  let customToken = null;
  try {
    customToken = await adminAuth.createCustomToken(uid, {
      telegram_id: session.chat_id || "",
      telegram_username: session.telegram_user?.username || "",
    });
  } catch (tokenErr) {
    console.warn("[telegram-link] customToken generation failed:", tokenErr.message);
  }

  return {
    ok: true,
    status: "approved",
    uid,
    customToken,
    telegramUser: session.telegram_user || {},
  };
}
