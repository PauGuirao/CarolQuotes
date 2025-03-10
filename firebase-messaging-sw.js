// Import Firebase scripts for the compat version
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js"
);

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDL0DkMeKuCbPSzDA0TT56q3pO1I08rT1k",
  authDomain: "carolquotes-eff2e.firebaseapp.com",
  projectId: "carolquotes-eff2e",
  storageBucket: "carolquotes-eff2e.firebasestorage.app",
  messagingSenderId: "251432655094",
  appId: "1:251432655094:web:5f20dd75c907500709b4d7",
  measurementId: "G-5JNTDYBL7B",
});

const messaging = firebase.messaging();

// Handle background messages for push notifications
messaging.onBackgroundMessage(function (payload) {
  console.log("[service-worker.js] Received background message ", payload);
  const test = payload.data;
  console.log(test);
  const notificationTitle = payload.notification?.title || "Background Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have received a new message.",
    icon: "/icon-192x192.png",
  };

  //self.registration.showNotification(notificationTitle, notificationOptions);
});

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
