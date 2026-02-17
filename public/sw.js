/// <reference lib="webworker" />

const CACHE_NAME = "bayit-beseder-v1";
const STATIC_ASSETS = ["/", "/dashboard", "/manifest.json"];

// ============================================
// Install: cache static assets
// ============================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ============================================
// Activate: clean old caches
// ============================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ============================================
// Fetch: network first, fallback to cache
// ============================================
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API calls and auth-related requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("/");
        });
      })
  );
});

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
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
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
  // This would check for pending tasks and show a notification
  // For now, it's a placeholder that the notifications.ts lib schedules
  self.registration.showNotification("בית בסדר", {
    body: "בדקו את המשימות שלכם להיום!",
    icon: "/icons/icon-192.png",
    tag: "periodic-reminder",
    dir: "rtl",
    lang: "he",
  });
}
