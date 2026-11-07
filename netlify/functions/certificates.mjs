import crypto from "node:crypto";
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

/**
 * POST /api/certificates
 *   { action: "issue", title, recipientName? } → { ok, certificate }
 *   { action: "list" }                         → { ok, certificates: [...] }
 *   { action: "verify", code }                 → { ok, valid, certificate }
 *
 * Certificates are issued BY the system to the learner directly — no institution
 * is named on them. The record lives in `certificates/{CODE}`, where the code is
 * both the document id and the public verification code, so verification needs no
 * extra index. Writes are server-only (Firestore rules deny client writes), and
 * `verify` is deliberately public so anyone holding a code can check it.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L: read aloud safely
const MAX_TITLE = 160;
const MAX_NAME = 80;
const MAX_PER_DAY = 12;

// Verification is public, so keep a light per-IP brake on guessing. Serverless
// instances are short-lived, so this is a speed bump, not a security boundary —
// the real protection is the 40-bit code space.
const verifyHits = new Map();
function throttled(ip) {
  const now = Date.now();
  const entry = verifyHits.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60_000;
  }
  entry.count += 1;
  verifyHits.set(ip, entry);
  if (verifyHits.size > 5000) verifyHits.clear();
  return entry.count > 30;
}

function randomCode() {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `BF-${out.slice(0, 4)}-${out.slice(4)}`;
}

function clean(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function publicView(data, code) {
  return {
    code,
    recipientName: data.recipient_name || "",
    title: data.title || "",
    issuedAt: data.issued_at?.toDate?.()?.toISOString?.() || data.issued_at_iso || null,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const body = parseBody(event);
    const { action } = body;

    if (action === "verify") {
      const ip = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
      if (throttled(ip)) return json(429, { ok: false, error: "TOO_MANY_REQUESTS" });
      const code = clean(body.code, 32).toUpperCase().replace(/\s/g, "");
      if (!/^BF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json(200, { ok: true, valid: false });
      const snap = await adminDb.collection("certificates").doc(code).get();
      if (!snap.exists) return json(200, { ok: true, valid: false });
      return json(200, { ok: true, valid: true, certificate: publicView(snap.data(), code) });
    }

    // Everything below is owner-scoped: the uid comes from the verified token.
    const user = await requireUser(event);

    if (action === "list") {
      const snap = await adminDb
        .collection("certificates")
        .where("owner_uid", "==", user.uid)
        .get();
      const certificates = snap.docs
        .map((doc) => {
          const data = doc.data() || {};
          return { ...publicView(data, doc.id), kind: data.kind || "completion" };
        })
        .sort((a, b) => String(b.issuedAt || "").localeCompare(String(a.issuedAt || "")));
      return json(200, { ok: true, certificates });
    }

    if (action !== "issue") return json(400, { ok: false, error: "UNKNOWN_ACTION" });

    const title = clean(body.title, MAX_TITLE);
    if (!title) return json(400, { ok: false, error: "TITLE_REQUIRED" });

    // Prefer an explicit name, then the profile name, then the token name.
    let recipientName = clean(body.recipientName, MAX_NAME);
    if (!recipientName) {
      const profile = await adminDb.collection("users").doc(user.uid).get();
      recipientName = clean(profile.exists ? profile.get("full_name") : "", MAX_NAME);
    }
    if (!recipientName) recipientName = clean(user.name, MAX_NAME) || "Student";
    if (!/[\p{L}]/u.test(recipientName)) return json(400, { ok: false, error: "NAME_REQUIRED" });

    // One equality filter only: a second range filter would need a composite
    // index that is not deployed. Count in memory instead (a user owns few).
    const owned = await adminDb.collection("certificates").where("owner_uid", "==", user.uid).get();
    const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
    const madeToday = owned.docs.filter((d) => {
      const at = d.get("issued_at")?.toDate?.()?.getTime?.() || Date.parse(d.get("issued_at_iso") || "") || 0;
      return at >= sinceMs;
    }).length;
    if (madeToday >= MAX_PER_DAY) return json(429, { ok: false, error: "DAILY_LIMIT_REACHED" });

    let code = randomCode();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const clash = await adminDb.collection("certificates").doc(code).get();
      if (!clash.exists) break;
      code = randomCode();
    }

    const record = {
      owner_uid: user.uid,
      recipient_name: recipientName,
      title,
      kind: clean(body.kind, 24) || "completion",
      issued_at: FieldValue.serverTimestamp(),
      issued_at_iso: new Date().toISOString(),
      issuer: "self", // issued by the system directly to the learner; no institution named
    };

    await adminDb.collection("certificates").doc(code).set(record);

    return json(200, {
      ok: true,
      certificate: { ...publicView({ ...record, issued_at: null }, code), kind: record.kind },
    });
  } catch (error) {
    return handleError(error);
  }
};
