/// <reference lib="webworker" />

const CACHE_VERSION = "v7";
const CACHE_NAME = `bayit-beseder-${CACHE_VERSION}`;

// These JS/CSS chunks change on every deploy — cache them aggressively
// but always validate on network (cache-first with revalidation).
const STATIC_ASSET_PATTERNS = [
  /\/_next\/static\//,   // Next.js static assets (chunks, css, images)
  /\/icons\//,           // App icons
  /\/manifest\.json$/,   // PWA manifest
];

// Pages and API-adjacent paths — use stale-while-revalidate
// so the user sees content immediately while we check for updates.
const PAGE_PATHS = [
  "/",
  "/dashboard",
  "/tasks",
  "/shopping",
  "/weekly",
  "/stats",
  "/settings",
  "/emergency",
  "/playlists",
  "/offline",
];

// The offline fallback page — shown when a navigation fails with no cache.
const OFFLINE_URL = "/offline";

// ============================================
// Install: pre-cache pages only (not chunks —
// chunks are versioned and handled lazily)
// ============================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PAGE_PATHS).catch(() => {
        // Some pages may not be pre-renderable; ignore failures
      })
    )
  );
  // Activate immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ============================================
// Activate: clean old caches + notify clients
// ============================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove all old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      // Take control of all open tabs immediately
      await self.clients.claim();

      // Tell every client there's a new version available
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
      }
    })()
  );
});

// ============================================
// Fetch strategy:
//   • Static assets (_next/static) → cache-first
//   • Pages / navigation requests   → stale-while-revalidate
//   • API / auth requests            → network-only (skip SW)
// ============================================
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Only handle http(s) requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith("http")) return;

  // Skip API calls, auth, and Supabase
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // --- JS chunks: network-first to avoid stale chunk errors after deploy ---
  if (url.pathname.match(/\/_next\/static\/chunks\//)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // --- Other static assets (CSS, images, icons): cache-first ---
  if (STATIC_ASSET_PATTERNS.some((re) => re.test(url.pathname))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // --- Pages and RSC payloads: NETWORK-FIRST ---
  // Serving the cached HTML first (stale-while-revalidate) meant the installed
  // app showed the PREVIOUS deploy on every open, and a fixed bug stayed
  // visible until the app was opened twice. The cache is now only the offline
  // fallback; online users always get the current deploy.
  if (isPageRequest(event.request, url)) {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  // --- Stale-while-revalidate for everything else ---
  event.respondWith(staleWhileRevalidate(event.request));
});

// ============================================
// Cache-first: serve from cache, fetch in background only if missing
// ============================================
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // No cache hit + network failed — nothing we can do for static assets
    return new Response("Offline", { status: 503 });
  }
}

// ============================================
// Network-first: try network, fall back to cache (for JS chunks)
// Prevents ChunkLoadError after deploys
// ============================================
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
      return response;
    }
    // A chunk that 404s after a deploy: prefer a cached copy over a hard failure.
    const cached = await caches.match(request);
    return cached ?? response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}

// ============================================
// Pages: network-first with a short timeout, cache only as offline fallback
// ============================================
const PAGE_NETWORK_TIMEOUT_MS = 4000;

function isPageRequest(request, url) {
  if (request.mode === "navigate") return true;
  if (request.headers.get("accept")?.includes("text/html")) return true;
  // Next.js client-side navigation fetches the RSC payload of a page
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return true;
  return false;
}

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), PAGE_NETWORK_TIMEOUT_MS)
      ),
    ]);
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offlinePage = await cache.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
    }
    return new Response("Offline", { status: 503 });
  }
}

// ============================================
// Stale-while-revalidate: serve cached immediately,
// update cache in background, avoid stale chunk errors
// ============================================
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Start network fetch regardless (update in background)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  // Return cached if available, otherwise wait for network
  if (cached) return cached;

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  // Both failed — serve the offline page for navigation requests,
  // or a bare 503 for everything else (sub-resources).
  const isNavigation =
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"));

  if (isNavigation) {
    const offlinePage = await cache.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;
  }

  // Last-resort: try root as generic fallback
  const rootFallback = await cache.match("/");
  return rootFallback ?? new Response("Offline", { status: 503 });
}

// ============================================
// Push notification handler
// ============================================
self.addEventListener("push", (event) => {
  let data = {
    title: "בית בסדר",
    body: "יש לכם משימות לביצוע היום!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "task-reminder",
    data: { url: "/dashboard" },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      dir: "rtl",
      lang: "he",
      vibrate: [200, 100, 200],
      actions: [
        { action: "open", title: "פתיחה" },
        { action: "dismiss", title: "סגירה" },
      ],
      data: data.data,
    })
  );
});

// ============================================
// Notification click handler
// ============================================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  if (event.action === "dismiss") return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ============================================
// Periodic background sync (for scheduled reminders)
// ============================================
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "task-reminder-sync") {
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  self.registration.showNotification("בית בסדר", {
    body: "בדקו את המשימות שלכם להיום!",
    icon: "/icons/icon-192.png",
    tag: "periodic-reminder",
    dir: "rtl",
    lang: "he",
  });
}
