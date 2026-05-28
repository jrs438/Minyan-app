// Minimal service worker for PWA installability
// Does not aggressively cache — we want the app fresh every load.

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Pass through — network-first behavior. Offline support is a v2 concern.
});
