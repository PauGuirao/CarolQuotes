// -------------------------
// Caching Logic
// -------------------------
const CACHE_NAME = "v1";
const FILES_TO_CACHE = [
  "/index.html",
  "/styles.css",
  "/script.js",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-apple.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching app shell");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Claim any clients immediately so that the SW starts controlling them
      self.clients.claim(),
      // Optionally, clean up old caches here
    ])
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
