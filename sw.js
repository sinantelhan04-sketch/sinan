
const CACHE_NAME = 'tesisat-app-v2';
const DYNAMIC_CACHE_NAME = 'tesisat-dynamic-v2';

// Temel dosyaları önbelleğe al
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // API isteklerini ve Google reklamlarını cacheleme
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('googlesyndication') ||
      event.request.url.includes('google.com/maps')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache'de varsa döndür
        if (response) {
          return response;
        }

        // Yoksa network'ten çek ve cache'e at
        return fetch(event.request).then(
          (networkResponse) => {
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(() => {
          // Offline durumunda ve HTML isteği ise offline sayfasını (veya ana sayfayı) döndür
          if (event.request.headers.get('accept').includes('text/html')) {
             return caches.match('./index.html');
          }
        });
      })
  );
});
