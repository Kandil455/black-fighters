/**
 * Unit tests for the bounded LRU blob cache (src/lib/blobCache.js).
 *
 * These encode the performance/robustness contract the summary-image pipeline
 * depends on: one network fetch per URL per session (dedupe), bounded memory
 * (LRU eviction), and retry-ability after failures. Runs on the built-in
 * node:test runner — no browser, no Firebase, no extra deps.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BoundedLruCache, createBoundedLoader } from "../../src/lib/blobCache.js";

test("BoundedLruCache evicts least-recently-used beyond max", () => {
  const c = new BoundedLruCache(3);
  c.set("a", 1); c.set("b", 2); c.set("c", 3);
  assert.equal(c.size, 3);
  c.set("d", 4); // pushes out "a"
  assert.equal(c.has("a"), false);
  assert.equal(c.has("b"), true);
  assert.equal(c.has("d"), true);
});

test("BoundedLruCache get() refreshes recency (survives eviction)", () => {
  const c = new BoundedLruCache(3);
  c.set("a", 1); c.set("b", 2); c.set("c", 3);
  assert.equal(c.get("a"), 1); // "a" is now most-recent
  c.set("d", 4); // pushes out "b" instead
  assert.equal(c.has("a"), true);
  assert.equal(c.has("b"), false);
});

test("createBoundedLoader dedupes concurrent loads into one fetch", async () => {
  let calls = 0;
  const { load } = createBoundedLoader(async (url) => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 5));
    return `blob-for-${url}`;
  }, 10);

  const [r1, r2, r3] = await Promise.all([
    load("u1"), load("u1"), load("u1"),
  ]);
  assert.equal(calls, 1, "concurrent duplicate requests must hit one fetch");
  assert.equal(r1, "blob-for-u1");
  assert.equal(r2, "blob-for-u1");
  assert.equal(r3, "blob-for-u1");
});

test("createBoundedLoader serves repeat loads from cache without refetch", async () => {
  let calls = 0;
  const { load } = createBoundedLoader(async (url) => { calls += 1; return `b-${url}`; }, 10);
  await load("u1");
  await load("u1");
  assert.equal(calls, 1);
});

test("failed loads are evicted so the next call retries", async () => {
  let attempts = 0;
  const { load, cache } = createBoundedLoader(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("NETWORK_DOWN");
    return "recovered";
  }, 10);

  await assert.rejects(() => load("flaky"), /NETWORK_DOWN/);
  assert.equal(cache.size, 0, "failed entry must not occupy cache space");
  const second = await load("flaky");
  assert.equal(second, "recovered");
  assert.equal(attempts, 2);
});

test("cache stays bounded while streaming many URLs (LRU, not unbounded Map)", async () => {
  let calls = 0;
  const { load, cache } = createBoundedLoader(async (url) => { calls += 1; return url; }, 5);
  for (let i = 0; i < 50; i += 1) await load(`u${i}`);
  assert.equal(cache.size, 5, "cache must never exceed max");
  assert.equal(calls, 50);
  // Oldest 45 were evicted; re-requesting them refetches.
  await load("u0");
  assert.equal(calls, 51);
});

test("empty/missing URL rejects without touching the loader", async () => {
  let calls = 0;
  const { load } = createBoundedLoader(async () => { calls += 1; return "x"; }, 10);
  await assert.rejects(() => load(""), /MISSING_URL/);
  await assert.rejects(() => load(null), /MISSING_URL/);
  assert.equal(calls, 0);
});

test("constructor rejects non-positive bounds", () => {
  assert.throws(() => new BoundedLruCache(0));
  assert.throws(() => new BoundedLruCache(-1));
  assert.throws(() => new BoundedLruCache(1.5));
});
