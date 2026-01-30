// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJfcIgJfuVQiNDfuU9g1SmB0D5F4rN7qM",
  authDomain: "catalog-app-by-anik.firebaseapp.com",
  projectId: "catalog-app-by-anik",
  storageBucket: "catalog-app-by-anik.appspot.com",
  messagingSenderId: "1092996883689",
  appId: "1:1092996883689:web:d5f3c1f1c9c5d9e1a2b3c4"
};

// Initialize Firebase in Service Worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || '新しい通知';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/manifest-icon.png',
    badge: payload.notification?.badge || '/manifest-badge.png',
    tag: 'new-order',
    requireInteraction: true,
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: '注文を確認'
      },
      {
        action: 'close',
        title: 'とじる'
      }
    ]
  };

  // Add sound if available
  if (payload.notification?.sound) {
    notificationOptions.sound = payload.notification.sound;
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app and navigate to order entries
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' || client.url.includes('index.html')) {
          // Focus existing window
          return client.focus().then((client) => {
            // Send message to navigate to order entries
            client.postMessage({
              type: 'NAVIGATE_TO_ORDERS',
              tab: 'orderEntries'
            });
          });
        }
      }
      // If no window open, open new one
      if (clients.openWindow) {
        return clients.openWindow('/index.html?tab=orderEntries');
      }
    })
  );
});

// Handle service worker updates
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});
