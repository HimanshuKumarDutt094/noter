const CACHE_NAME = "app-shell-v1";
const ASSET_CACHE = "asset-cache-v1";
const PRECACHE_URLS = ["/", "index.html"];

function isHashedAsset(path) {
  return (
    /\.[0-9a-f]{6,}\./i.test(path) ||
    /\.(?:js|css|png|jpg|svg|webp|woff2?|wasm|data)$/.test(path)
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation / index.html -> network-first
  if (
    request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname.endsWith("index.html")
  ) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // For hashed/static assets -> cache-first
  if (
    isHashedAsset(url.pathname) ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.endsWith(".data")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        });
      })
    );
    return;
  }
});
