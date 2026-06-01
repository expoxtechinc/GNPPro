self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11087293
}
self.lary = ""

// Safe environment guard to skip monetag in development/sandboxed testing
const isDev = self.location.hostname === 'localhost' || 
              self.location.hostname === '127.0.0.1' || 
              self.location.hostname.includes('.run.app') || 
              self.location.hostname.includes('webcontainer') || 
              self.location.hostname.includes('stackblitz');

if (!isDev) {
  try {
    importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');
  } catch (e) {
    console.warn('Monetag service worker fallback load error:', e);
  }
} else {
  console.log('Development mode detected: Skipping Monetag service worker importScripts to prevent unexpected token parser errors.');
}

const CACHE_NAME = 'global-news-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (isDev) {
    return; // Bypass completely in development, preview, and sandbox environments
  }
  
  // Let browser make external API calls and firebase calls directly
  if (e.request.url.includes('firestore.googleapis.com') || e.request.url.includes('firebase') || e.request.url.includes('identitytoolkit')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Only return the index offline fallback for page navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/');
        }
        return Promise.reject(new Error('Network request failed'));
      });
    })
  );
});
