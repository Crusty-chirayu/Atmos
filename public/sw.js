// ATMOS Service Worker — PWA & Offline Support
const CACHE_VERSION = "v1";
const STATIC_CACHE = `atmos-static-${CACHE_VERSION}`;
const SHELL_CACHE = `atmos-shell-${CACHE_VERSION}`;
const WEATHER_CACHE = `atmos-weather-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

// Max TTL for cached weather data in seconds (30 minutes)
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

// Install event — pre-cache offline page & core brand assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event — clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (
              key.startsWith("atmos-") &&
              key !== STATIC_CACHE &&
              key !== SHELL_CACHE &&
              key !== WEATHER_CACHE
            ) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event — intelligently route requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // 1. STRICT PRIVACY EXCLUSION: Never cache sensitive user, AI, or auth endpoints
  if (
    url.pathname.startsWith("/api/user") ||
    url.pathname.startsWith("/api/ai") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/cron")
  ) {
    return; // Passthrough directly to network
  }

  // 2. Weather API endpoint caching (Network-First with bounded TTL fallback)
  if (url.pathname.startsWith("/api/weather")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const resClone = response.clone();
            caches.open(WEATHER_CACHE).then((cache) => {
              // Store alongside custom timestamp header
              const headers = new Headers(resClone.headers);
              headers.set("X-Atmos-Cached-At", Date.now().toString());
              resClone.blob().then((blob) => {
                const datedResponse = new Response(blob, {
                  status: resClone.status,
                  statusText: resClone.statusText,
                  headers,
                });
                cache.put(request, datedResponse);
              });
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            const cachedAt = Number(
              cached.headers.get("X-Atmos-Cached-At") || 0
            );
            const isFresh = Date.now() - cachedAt < WEATHER_CACHE_TTL_MS;
            // Clone and add header indicating cached response
            const headers = new Headers(cached.headers);
            headers.set("X-Atmos-Offline-Cached", "true");
            headers.set("X-Atmos-Cache-Expired", (!isFresh).toString());
            const blob = await cached.blob();
            return new Response(blob, {
              status: 200,
              statusText: "OK (From Cache)",
              headers,
            });
          }
          // No cached weather available
          return new Response(
            JSON.stringify({
              error:
                "Offline: No cached weather data available for this query.",
              offline: true,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  // 3. Static assets: Next.js bundles, fonts, icons, manifest (Cache-First)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, resClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. HTML Navigation (Network-First with App Shell & Offline page fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const resClone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put(request, resClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try exact match or shell match
          const cached = await caches.match(request);
          if (cached) return cached;

          // Fallback to pre-cached offline page
          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;

          return new Response(
            "Offline — Please check your network connection.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }
          );
        })
    );
    return;
  }
});

// Push notification received
self.addEventListener("push", (event) => {
  let data = {
    title: "ATMOS Weather Alert",
    body: "A weather threshold condition was met.",
    url: "/account",
    icon: "/icons/icon-192.png",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (_) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/account" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click — focus existing tab or open new tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/account";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
