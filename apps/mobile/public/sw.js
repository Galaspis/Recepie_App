/* Kort service worker: keeps the app shell and recipe photos available offline. */
const CACHE = "kort-v4"; // bumped 2026-10-20: new icon files under the same names

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live data (our API) is never cached by the worker.
  if (url.pathname.startsWith("/api/")) return;

  const isImage =
    req.destination === "image" || /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(url.pathname);

  if (isImage) {
    // Photos: cache first, then network.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        } catch {
          return hit ?? Response.error();
        }
      }),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    // App shell and bundles: network first, cached copy when offline.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          if (req.mode === "navigate") {
            const shell = await cache.match("/");
            if (shell) return shell;
          }
          return Response.error();
        }
      })(),
    );
  }
});
