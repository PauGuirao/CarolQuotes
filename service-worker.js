// Ejemplo básico de service worker
self.addEventListener('install', event => {
    event.waitUntil(
      caches.open('v1').then(cache => {
        return cache.addAll([
          '/index.html',
          '/styles.css',
          '/script.js',
          '/manifest.json',
          '/icon-192x192.png',
          '/icon-512x512.png'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', event => {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  });
  self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Acertijazos';
    const options = {
      body: data.body || 'Hay un nuevo acertijo esperando!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  });
  
  