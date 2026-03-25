// BUILD_VERSION is bumped on every deploy - changing this line triggers SW update
const CACHE_VERSION = "finance-v7";

self.addEventListener("install", (event) => {
  // Activate immediately, don't wait for old SW to stop
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete ALL old caches on activation so fresh assets are fetched
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip API requests - always network
  if (request.url.includes("/api/")) return;

  // HTML navigation requests: ALWAYS network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS/CSS with content-hash in filename (Vite adds hashes): cache-first is fine
  // Other assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
