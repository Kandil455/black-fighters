/**
 * Store-API contracts.
 *
 * History (this test exists because of two real outages):
 *  1. `Users` is hand-written while every other collection uses
 *     `createEntityStore`. A caller asked for `Users.filter(...)` and the method
 *     simply did not exist — the leaderboard query threw, was swallowed by a
 *     `.catch(() => [])`, and rendered an empty page with no error anywhere.
 *  2. `entities.User.filter({}, "-total_xp", 100)` dropped the sort and the limit
 *     because the adapter only accepted `filters`, turning a bounded query into a
 *     full-collection scan sorted in memory.
 *
 * The runner reads source (no Firebase needed), so it fails fast in CI when a
 * method is called that the store does not implement.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");

test("every method the API layer calls on Users actually exists", () => {
  const api = read("src/api/index.js");
  const firestore = read("src/lib/firestore.js");

  const usersBlock = firestore.slice(
    firestore.indexOf("export const Users"),
    firestore.indexOf("// ─── USER SETTINGS"),
  );
  assert.ok(usersBlock.length > 0, "could not locate the Users store");

  const called = [...new Set([...api.matchAll(/\bUsers\.([a-zA-Z_]+)\s*\(/g)].map((m) => m[1]))];
  const defined = [...new Set([...usersBlock.matchAll(/^\s{2}(?:async\s+)?([a-zA-Z_]+)\s*\(/gm)].map((m) => m[1]))];

  assert.ok(called.length > 0, "no Users.* calls found — did the API layer change shape?");
  const missing = called.filter((name) => !defined.includes(name));
  assert.deepEqual(
    missing,
    [],
    `Users.${missing.join(", Users.")} is called but not implemented — the call throws and is usually swallowed, producing an empty page instead of an error`,
  );
});

test("the generic entity store accepts (filters, sortOrder, maxResults)", () => {
  const firestore = read("src/lib/firestore.js");
  assert.ok(
    /async filter\(filters = \{\}, sortOrder = null, maxResults = null\)/.test(firestore),
    "the store filter signature lost sortOrder/maxResults — bounded queries silently become full scans",
  );
});

test("the User adapter forwards sortOrder and maxResults", () => {
  const api = read("src/api/index.js");
  const start = api.indexOf("  User: {");
  const adapter = api.slice(start, api.indexOf("\n  },", start));

  assert.ok(
    /filter:\s*async \(filters = \{\}, sortOrder = null, maxResults = null\)/.test(adapter),
    "entities.User.filter must accept (filters, sortOrder, maxResults); dropping them turned the leaderboard into an unbounded scan",
  );
  // The generic path must delegate to the store (bounded + server-ordered),
  // not scan everything and sort in memory.
  assert.ok(
    /Users\.filter\(filters, sortOrder, maxResults\)/.test(adapter),
    "the User adapter must delegate to Users.filter(filters, sortOrder, maxResults)",
  );
  assert.ok(
    !/const all = await Users\.getAll\(\)/.test(adapter),
    "the User adapter is scanning every user document again instead of delegating",
  );
});

test("bulk user reads are batched, not one request per id", () => {
  const firestore = read("src/lib/firestore.js");
  assert.ok(
    /async getMany\(ids = \[\], \{ chunkSize = 30 \} = \{\}\)/.test(firestore),
    "Users.getMany must batch ids (Firestore caps `in` at 30) — the per-id N+1 is what made /groups and /friends slow",
  );
  assert.ok(
    /documentId\(\)/.test(firestore),
    "Users.getMany should use a documentId() `in` query",
  );
});
