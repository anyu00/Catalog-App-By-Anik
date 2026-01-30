// Service Worker for Firebase Cloud Messaging
// This handles push notifications even when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');

// Initialize Firebase in Service Worker
const firebaseConfig = {
    apiKey: "AIzaSyDg4Lw8TkH7r4xT4z1y9q2w3e5r8t0u1v2w3",
    authDomain: "catalog-app-anik.firebaseapp.com",
    projectId: "catalog-app-anik",
    storageBucket: "catalog-app-anik.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || '新しい注文があります';
    const notificationOptions = {
        body: payload.notification?.body || '新しい注文が届きました',
        icon: '/📦',
        badge: '/📦',
        tag: 'order-notification',
        requireInteraction: true,
        sound: 'notification.mp3',
        data: payload.data || {}
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.notification);
    event.notification.close();
    
    // Open/focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
