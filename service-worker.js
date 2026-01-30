// Service Worker for Firebase Cloud Messaging
// Simplified version - Firebase is not needed in the service worker
console.log('Service Worker loaded');

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
    icon: '/manifest-icon.png',
    badge: '/manifest-badge.png',
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

// Service Worker lifecycle
self.addEventListener('install', () => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service Worker activating');
  self.clients.claim();
});


