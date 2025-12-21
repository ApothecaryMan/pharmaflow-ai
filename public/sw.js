/**
 * PharmaFlow AI - Service Worker
 * Enables offline functionality and caching for PWA
 */

const CACHE_NAME = 'pharmaflow-v1';
const STATIC_CACHE = 'pharmaflow-static-v1';
const DYNAMIC_CACHE = 'pharmaflow-dynamic-v1';

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/app_icon.svg',
  '/logo_full.svg',
  '/logo_full_dark.svg',
  '/logo_outline.svg',
  '/logo_text.svg',
  '/logo_text_dark.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// External resources to cache
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght,wdth,GRAD,slnt,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC@8..144,100..1000,50..150,-200..150,-10..0,323..603,25..135,649..854,98..305,560..788,416..570,528..760&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@100..900&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      // Cache static assets, ignore failures for missing files
      return Promise.allSettled(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => console.log(`[SW] Failed to cache: ${url}`))
        )
      );
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // For API calls (like AI services), always go to network
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('/v1beta/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Don't cache non-successful responses
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone the response for caching
          const responseToCache = networkResponse.clone();

          // Cache dynamic content
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Network failed, try to return cached index.html for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Return a fallback for other requests
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
