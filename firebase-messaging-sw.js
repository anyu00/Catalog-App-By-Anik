// Firebase Cloud Messaging Service Worker
// Handles background push notifications from Firebase
// This file works with both root domain and GitHub Pages subdirectories

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');

console.log('[FCM-SW] Firebase Messaging Service Worker loaded');

// Initialize Firebase (minimal config for messaging)
const firebaseConfig = {
  apiKey: "AIzaSyAoVXVwzp_L5aOhT3cOqW7PU3D-8V7OCII",
  authDomain: "yuken-order-system.firebaseapp.com",
  projectId: "yuken-order-system",
  storageBucket: "yuken-order-system.appspot.com",
  messagingSenderId: "376626913184",
  appId: "1:376626913184:web:8c8197c17f8cc89757e6b8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message', payload);

  const notificationData = payload.notification || {};
  const title = notificationData.title || '📦 新しい注文が来ました!';
  const options = {
    body: notificationData.body || '新しい注文が到着しました',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23007bff" width="192" height="192"/><text x="96" y="140" font-size="100" fill="%23fff" text-anchor="middle">📦</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="%23007bff"/><text x="48" y="70" font-size="60" fill="%23fff" text-anchor="middle">📦</text></svg>',
    tag: 'new-order',
    requireInteraction: true,
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

console.log('Firebase Messaging Service Worker initialized');
