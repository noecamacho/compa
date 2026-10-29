// COMPA service worker: Web Push alerts only (T-080). No fetch handler and no caching, so it never serves stale pages.
const FALLBACK = { title: "COMPA", body: "", url: "/notifications", tag: "compa" };

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Only same-origin pages: a payload must never send the person to another site (`/\\evil.com` parses as another host).
function safePath(url) {
  if (typeof url !== "string" || !url.startsWith("/")) return FALLBACK.url;
  const target = new URL(url, self.location.origin);
  return target.origin === self.location.origin ? target.pathname + target.search : FALLBACK.url;
}
const text = (value, fallback) => (typeof value === "string" ? value.slice(0, 300) : fallback);

function readPayload(data) {
  try {
    const payload = data ? data.json() : {};
    return { title: text(payload.title, FALLBACK.title), body: text(payload.body, FALLBACK.body), url: safePath(payload.url), tag: text(payload.tag, FALLBACK.tag) };
  } catch {
    return FALLBACK;
  }
}

// Every push shows a notification: Safari revokes push for sites that receive pushes silently.
self.addEventListener("push", (event) => {
  const { title, body, url, tag } = readPayload(event.data);
  event.waitUntil(self.registration.showNotification(title, { body, tag, renotify: true, icon: "/icon.png", badge: "/icon.png", data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!open) return self.clients.openWindow(target);
      return open
        .focus()
        .then((client) => client.navigate(target))
        .catch(() => self.clients.openWindow(target));
    }),
  );
});

// The browser rotated the subscription: subscribe again with the same key and tell the server (cookies ride along).
self.addEventListener("pushsubscriptionchange", (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options || !options.applicationServerKey) return;
  const locale = /^es(?:$|[-_])/i.test(self.navigator.language || "") ? "es" : "en";
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: options.applicationServerKey })
      .then((subscription) =>
        fetch("/api/push/subscriptions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...subscription.toJSON(), locale }),
        }),
      ),
  );
});
