// Service Worker for PWA + Firebase Cloud Messaging
const CACHE_NAME = 'catalog-app-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/css/styles.css',
  '/css/auth.css',
  '/css/animations.css',
  '/css/design-system.css'
];

console.log('Service Worker loaded');

// Install event - cache app shell for offline support
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache static assets, non-critical failures are ok
        return Promise.all(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(() => {
              console.log(`Failed to cache ${url}, continuing...`);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network (app shell model)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Firebase API calls
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache successful responses
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Offline fallback
            return caches.match(event.request);
          });
      })
  );
});

// Handle background messages from FCM
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    console.log('Could not parse push event data as JSON');
    notificationData = {
      title: event.data.text() || '新しい通知',
      body: ''
    };
  }

  const title = notificationData.notification?.title || '📦 新しい注文が来ました!';
  const options = {
    body: notificationData.notification?.body || '新しい注文が到着しました',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23007bff" width="192" height="192"/><text x="96" y="140" font-size="100" fill="%23fff" text-anchor="middle">📦</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="%23007bff"/><text x="48" y="70" font-size="60" fill="%23fff" text-anchor="middle">📦</text></svg>',
    tag: 'new-order',
    requireInteraction: true,
    data: notificationData.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/index.html?tab=orderEntries');
      }
    })
  );
});


