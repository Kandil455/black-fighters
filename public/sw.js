const BUILD_ASSETS = [];
const SW_VERSION = "__BUILD_VERSION__";
const CACHE_NAME = `iiiak-app-${SW_VERSION}`;
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/aik-icon.svg"];
const PRECACHE_URLS = [...new Set([...APP_SHELL, ...BUILD_ASSETS])];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isCacheableAsset(request) {
  return request.method === "GET" && isSameOrigin(new URL(request.url)) && (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image" ||
    request.destination === "manifest" ||
    request.url.includes("/assets/")
  );
}

async function putIfOk(cache, request, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  try {
    await cache.put(request, response.clone());
  } catch {
    // Cache quota or clone errors must never break navigation/fetch.
  }
}

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "reload" });
        await putIfOk(cache, url, response);
      } catch {
        // A missing/transient asset during install should not poison the worker.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => (
            cacheName.startsWith("iiiak-")
          ) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        await putIfOk(cache, "/index.html", response);
        return response;
      } catch {
        const cached = await caches.match("/index.html") || await caches.match("/");
        return cached || new Response("<!doctype html><html lang=\"ar\" dir=\"rtl\"><title>IIIAK دون اتصال</title><main style=\"font-family:sans-serif;padding:24px\"><h1>IIIAK</h1><p>أنت غير متصل حاليًا. تحقّق من الاتصال ثم حدّث الصفحة.</p></main></html>", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    })());
    return;
  }

  if (isCacheableAsset(request)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        await putIfOk(cache, request, response);
        return response;
      } catch {
        return new Response("", { status: 503, statusText: "Offline" });
      }
    })());
  }
});
