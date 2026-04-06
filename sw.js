
const CACHE_NAME = 'tesisat-app-v11'; // Cache versiyonu v11
const DYNAMIC_CACHE_NAME = 'tesisat-dynamic-v11';

// Temel dosyalar. Hata almamak için sadece kök dizinleri ekliyoruz.
// 'index.html' yerine './' kullanımı bazı sunucularda daha güvenlidir.
const urlsToCache = [
  './',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(err => {
            console.warn('Önbellek kurulum uyarısı:', err);
        });
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
  // Harici kaynakları ve API isteklerini cacheleme stratejisinden çıkar
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
        );
      })
  );
});
