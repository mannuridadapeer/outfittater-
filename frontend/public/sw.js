// Minimal service worker — exists only so the browser offers "Install app".
// The fetch handler is a passthrough (no caching), so it never serves stale builds.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
