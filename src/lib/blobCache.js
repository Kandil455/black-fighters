/**
 * Framework-free bounded LRU cache for blob downloads (image bytes etc.).
 *
 * Why this exists: every mounted <SecureSummaryImage> used to re-fire an
 * authenticated /proxy-media request for the same URL, and an uncapped
 * in-session Map would grow without limit across a long lecture. This cache
 * dedupes concurrent requests for the same key, keeps at most `max` resolved
 * or in-flight entries, and evicts least-recently-used first. Failed loads
 * are evicted so a transient error stays retryable.
 *
 * Deliberately dependency-free so it runs under `node --test` (see
 * tests/blobCache.test.mjs) and can be reused by any client entry point.
 */

export class BoundedLruCache {
  constructor(max = 60) {
    if (!Number.isInteger(max) || max < 1) throw new Error("LRU_MAX_MUST_BE_POSITIVE_INT");
    this.max = max;
    this.map = new Map();
  }

  /** Cached value or undefined. Refreshes recency. */
  get(key) {
    const hit = this.map.get(key);
    if (hit === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  has(key) {
    return this.map.has(key);
  }

  delete(key) {
    this.map.delete(key);
  }

  get size() {
    return this.map.size;
  }
}

/**
 * Returns a deduplicating, bounded loader function:
 *   - same URL requested concurrently -> one underlying fetch, shared promise
 *   - same URL requested again later -> served from cache (no network)
 *   - failed fetch -> evicted immediately so the next call retries
 *   - cache full -> oldest entry evicted (LRU order refreshed on access)
 */
export function createBoundedLoader(load, max = 60) {
  const cache = new BoundedLruCache(max);
  return {
    load: (url) => {
      const key = String(url || "");
      if (!key) return Promise.reject(new Error("MISSING_URL"));
      const hit = cache.get(key);
      if (hit) return hit;
      const pending = Promise.resolve()
        .then(() => load(key))
        .catch((error) => {
          cache.delete(key); // failed URLs stay retryable
          throw error;
        });
      cache.set(key, pending);
      return pending;
    },
    cache,
  };
}
