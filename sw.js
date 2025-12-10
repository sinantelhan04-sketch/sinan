
const CACHE_NAME = 'tesisat-app-v5'; // Cache versiyonu v5'e yükseltildi
const DYNAMIC_CACHE_NAME = 'tesisat-dynamic-v5';

// Kurulum sırasında SADECE kendi dosyalarımızı cache'le.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(err => {
            console.warn('Önbellekleme uyarısı:', err);
        });
      })
  );
  self.skipWaiting(); // Yeni SW hemen aktif olsun
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Eski cache temizleniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('googlesyndication') ||
      event.request.url.includes('google.com/maps') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

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
          if (event.request.headers.get('accept').includes('text/html')) {
             return caches.match('./index.html');
          }
        });
      })
  );
});
