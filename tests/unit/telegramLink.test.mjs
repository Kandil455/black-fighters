/**
 * Link-code semantics (pure parts).
 *
 * The Firestore round-trip is exercised manually/E2E; what must never regress
 * silently is the code normalisation: it decides whether a user-typed string is
 * even allowed to reach Firestore, and the alphabet deliberately excludes
 * look-alike characters (0/O/1/I/L) that a user retyping from a screenshot would
 * get wrong.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLinkCode, LINK_CODE_TTL_MS } from "../../netlify/functions/_shared/telegram-link.mjs";

test("normalizeLinkCode accepts a canonical 8-char code", () => {
  assert.equal(normalizeLinkCode("ABCD2345"), "ABCD2345");
});

test("normalizeLinkCode is case- and separator-insensitive", () => {
  assert.equal(normalizeLinkCode("  abcd-2345 "), "ABCD2345");
  assert.equal(normalizeLinkCode("abcd 2345"), "ABCD2345");
});

test("normalizeLinkCode rejects look-alike characters and wrong lengths", () => {
  for (const bad of ["ABCD234", "ABCD23456", "ABCD234O", "ABCD234I", "ABCD234L", "ABCD2340", "ABCD2341", "", null, undefined, "<script>"]) {
    assert.equal(normalizeLinkCode(bad), "", `expected rejection for ${JSON.stringify(bad)}`);
  }
});

test("link codes expire within 15 minutes", () => {
  assert.ok(LINK_CODE_TTL_MS > 0, "ttl must be positive");
  assert.ok(LINK_CODE_TTL_MS <= 15 * 60 * 1000, "ttl longer than 15 minutes is too generous for a link credential");
});
