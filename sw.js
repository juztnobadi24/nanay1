// sw.js
const CACHE_VERSION = 'juzt-iptv-v3'; // Increment this with each release
const CACHE_NAME = CACHE_VERSION;

// Function to strip version parameters for caching
function stripVersionParams(url) {
    return url.split('?')[0];
}

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/css/header.css',
  '/css/sidebar.css',
  '/css/player.css',
  '/css/modal.css',
  '/css/firebase-chat.css',
  '/css/loader.css',
  '/css/splash.css',
  '/css/toggle.css',
  '/js/app.js',
  '/js/header.js',
  '/js/sidebar.js',
  '/js/player.js',
  '/js/modal.js',
  '/js/utils.js',
  '/js/fullscreen.js',
  '/js/gesture-controls.js',
  '/js/firebase-config.js',
  '/js/firebase-chat.js',
  '/js/splash.js',
  '/juztlogoicon.webp',
  '/juztlogosplash.webp'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - strip version params for cache matching
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const cleanUrl = stripVersionParams(event.request.url);
  
  // For HTML pages - network first
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(cleanUrl, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(cleanUrl);
        })
    );
  } else {
    // For other assets - cache first with network fallback
    event.respondWith(
      caches.match(cleanUrl)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(cleanUrl, responseToCache);
            });
            return response;
          });
        })
    );
  }
});
