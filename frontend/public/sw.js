const CACHE_NAME = 'signalwire-agent-builder-v2';
const STATIC_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Cache opened');
        return cache.addAll(STATIC_CACHE);
      })
      .catch((error) => {
        console.error('SW: Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline, but always try network first for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip SSE streams and WebSocket connections - let them pass through directly
  if (url.pathname.includes('/stream') || url.pathname.includes('/ws') || 
      request.headers.get('accept') === 'text/event-stream' ||
      request.headers.get('cache-control') === 'no-cache') {
    return; // Let the browser handle these directly
  }

  // For other API calls, always try network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If network fails, return a custom offline response for API calls
          return new Response(
            JSON.stringify({ 
              error: 'Network unavailable', 
              message: 'Please check your internet connection' 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/') || new Response(
                '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            }
            
            // For other requests, just fail
            return new Response('Network error', { status: 408 });
          });
      })
  );
});

// Handle background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync tasks here
      console.log('SW: Background sync triggered')
    );
  }
});

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
    tag: 'signalwire-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification('SignalWire Agent Builder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
}); 