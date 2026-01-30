// Service Worker for Firebase Cloud Messaging
console.log('Service Worker script loaded');

try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
  console.log('Firebase scripts imported successfully');
} catch (error) {
  console.error('Error importing Firebase scripts:', error);
}

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJfcIgJfuVQiNDfuU9g1SmB0D5F4rN7qM",
  authDomain: "catalog-app-by-anik.firebaseapp.com",
  projectId: "catalog-app-by-anik",
  storageBucket: "catalog-app-by-anik.appspot.com",
  messagingSenderId: "1092996883689",
  appId: "1:1092996883689:web:d5f3c1f1c9c5d9e1a2b3c4"
};

try {
  // Initialize Firebase in Service Worker
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized in Service Worker');

  // Get messaging instance
  const messaging = firebase.messaging();
  console.log('Messaging instance created');

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);

    const notificationTitle = payload.notification?.title || '新しい通知';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/manifest-icon.png',
      badge: payload.notification?.badge || '/manifest-badge.png',
      tag: 'new-order',
      requireInteraction: true,
      data: payload.data || {},
      sound: '/notification-sound.mp3'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('Service Worker initialization error:', error);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app and navigate to order entries
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('index.html') || client.url === '/') {
          return client.focus().then((client) => {
            // Navigate to order entries
            client.postMessage({
              type: 'NAVIGATE_TO_ORDERS',
              tab: 'orderEntries'
            });
          });
        }
      }
      // Open new window if none exist
      if (clients.openWindow) {
        return clients.openWindow('/index.html?tab=orderEntries');
      }
    })
  );
});

// Service Worker lifecycle
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(clients.claim());
});

