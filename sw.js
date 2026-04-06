// sw.js - CORRECTED VERSION
const CACHE_VERSION = 'juzt-iptv-v11';
const CACHE_NAME = CACHE_VERSION;

// Only cache static assets - NO external requests
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/juztlogoicon.webp',
  '/juztlogosplash.webp'
];

// CSS files
const cssFiles = [
  '/css/main.css',
  '/css/header.css',
  '/css/sidebar.css',
  '/css/player.css',
  '/css/modal.css',
  '/css/firebase-chat.css',
  '/css/loader.css',
  '/css/splash.css',
  '/css/toggle.css'
];

// JS files
const jsFiles = [
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
  '/js/slideshow.js'
];

// Combine all static assets
const staticAssets = [...urlsToCache, ...cssFiles, ...jsFiles];

// Install event - cache only static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing v11...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        // Cache each file individually to handle failures
        return Promise.allSettled(
          staticAssets.map(url => 
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating v11...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('juzt-iptv-')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - NETWORK FIRST for everything, no offline fallback for streams
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // CRITICAL: NEVER intercept external requests (streams, APIs, images)
  // Let the browser handle them directly
  if (url.origin !== location.origin) {
    // For external requests, just pass through - don't try to cache
    return;
  }
  
  // For same-origin requests, try network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful GET responses for static assets
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Only fallback to cache for HTML and static assets
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For anything else, return a simple offline response
          return new Response('Offline - content not available', { status: 503 });
        });
      })
  );
});
