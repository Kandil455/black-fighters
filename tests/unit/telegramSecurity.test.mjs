/**
 * Telegram security contracts.
 *
 * These pin the fixes for three shipped vulnerabilities, each of which was
 * exploitable in production:
 *   1. The bot token was hardcoded in `telegram-engine.mjs` and shipped inside
 *      the browser bundle by `src/lib/directUpload.js`.
 *   2. `/alpha`, `/omega` and `/link <admin email>` granted the caller the highest
 *      privileges — no wait, `/alpha` DID: it silently linked the caller's chat
 *      to the admin uid.
 *   3. `/start link_<uid>` trusted a uid that is publicly visible on /u/:id, so
 *      anyone could attach their chat to somebody else's account.
 *
 * They read the shipped source directly, so reintroducing any of these patterns
 * fails CI with the reason inline.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

// The exact token that was leaked; must never reappear anywhere in the repo.
const LEAKED_TOKEN = "7601463756:AAFhPfm52g1x2epMhL7W2W35udCEyq8JDHA";
const LEAKED_ALPHA_CHAT_ID = "5923929978";

const BOT_TOKEN_LITERAL = /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/;

function walk(dir, out = []) {
  for (const entry of globSync(`${dir}/**/*.{js,mjs,jsx,cjs,json}`)) out.push(entry);
  return out;
}

test("no Telegram bot token literal exists in client or server source", () => {
  const files = [...walk("src"), ...walk("netlify"), ...walk("api"), ...walk("scripts")];
  const offenders = [];
  for (const file of files) {
    const source = read(file);
    if (source.includes(LEAKED_TOKEN)) offenders.push(`${file} (leaked token)`);
    else if (BOT_TOKEN_LITERAL.test(source) && !file.includes("test")) offenders.push(`${file} (token-shaped literal)`);
  }
  assert.deepEqual(
    offenders,
    [],
    "A Telegram bot token literal is in the source tree. Tokens are server env only " +
      "(TELEGRAM_BOT_TOKEN) — a token in source is public the moment it is pushed.",
  );
});

test("server code fails closed when the bot token is absent (no hardcoded default)", () => {
  const engine = read("netlify/functions/_shared/telegram-engine.mjs");
  assert.equal(engine.includes(LEAKED_ALPHA_CHAT_ID), false, "leaked Alpha chat id returned");
  assert.equal(/DEFAULT_BOT_TOKEN|DEFAULT_ALPHA_CHAT_ID/.test(engine), false, "hardcoded credential fallback returned");
  assert.ok(/BOT_TOKEN_RE/.test(engine), "token format validation was removed");
});

test("client no longer contains the direct-to-Telegram uploader", () => {
  assert.equal(existsSync("src/lib/directUpload.js"), false, "src/lib/directUpload.js is back — it shipped BOT_TOKEN to the browser");
  const mediaUpload = read("src/lib/mediaUpload.js");
  assert.equal(BOT_TOKEN_LITERAL.test(mediaUpload), false, "a token-shaped literal appeared in the client uploader");
  assert.ok(mediaUpload.includes("telegram-upload"), "uploads must go through the server endpoint");
});

test("no client module imports server-only Telegram code", () => {
  const offenders = [];
  for (const file of walk("src")) {
    const source = read(file);
    if (/services\/telegramBot|_shared\/telegram-engine|_shared\/telegram-v5/.test(source) && !source.includes("must not")) {
      // Comments are allowed to name the removed module; imports are not.
      if (/from\s+["'][^"']*(services\/telegramBot|_shared\/telegram-engine|_shared\/telegram-v5)["']/.test(source)) {
        offenders.push(file);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "A browser module imports server-only Telegram code. It cannot work there " +
      "(no token) and it ships the server source into the client bundle.",
  );
});

test("the admin backdoor commands are gone", () => {
  const engine = read("netlify/functions/_shared/telegram-engine.mjs");
  assert.equal(/text\s*===\s*["']\/alpha["']/.test(engine), false, "`/alpha` backdoor command returned");
  assert.equal(/text\s*===\s*["']\/omega["']/.test(engine), false, "`/omega` backdoor command returned");
  assert.equal(
    /\/link\s+ibrahimkandil000@gmail\.com/.test(engine),
    false,
    "the email-typed admin backdoor returned",
  );
  assert.equal(
    /up3y6pub7IgB1PpEMTcMASO2ei33/.test(engine),
    false,
    "hardcoded admin uid returned to the engine",
  );
});

test("account linking requires a single-use code, never an email or uid", () => {
  const engine = read("netlify/functions/_shared/telegram-engine.mjs");
  assert.equal(
    /where\(\s*["']email["']\s*,\s*["']==["']/.test(engine),
    false,
    "linking by email is back — anyone who knows an address could claim the account",
  );
  assert.ok(engine.includes("consumeLinkCode"), "the link-code consumer is not wired into the dispatcher");

  const link = read("netlify/functions/_shared/telegram-link.mjs");
  assert.ok(link.includes("expires_at"), "link codes must expire");
  assert.ok(link.includes("used_at"), "link codes must be single-use");
});

test("the webhook refuses to run without TELEGRAM_WEBHOOK_SECRET", () => {
  const webhook = read("netlify/functions/telegram-webhook.mjs");
  assert.ok(
    /503/.test(webhook) && /WEBHOOK_NOT_CONFIGURED/.test(webhook),
    "the webhook must fail closed (503) when the secret is not configured",
  );
  assert.ok(
    /telegram_processed_updates/.test(webhook),
    "webhook idempotency must be persisted in Firestore",
  );
});

test("firestore rules keep Telegram identity server-owned", () => {
  const rules = read("firestore.rules");
  for (const field of ["telegram_chat_id", "telegram_id"]) {
    assert.ok(rules.includes(`'${field}'`), `${field} is not in protectedUserFields() — a client could hijack a bot session`);
  }
  for (const collection of [
    "telegram_link_codes",
    "telegram_outbox",
    "telegram_notify_state",
    "telegram_quiz_sessions",
    "telegram_rate_limits",
  ]) {
    assert.ok(rules.includes(collection), `no server-only rule for ${collection}`);
  }
});
