// Service Worker for Firebase Cloud Messaging
// ONLY handles push notifications - no offline caching

// Listen for incoming push messages from FCM
self.addEventListener('push', function(event) {
    console.log('🔔 Push notification received:', event);
    
    if (event.data) {
        let notificationData = {};
        
        try {
            notificationData = event.data.json();
        } catch (e) {
            // If not JSON, just use the text
            notificationData = {
                notification: {
                    title: 'Notification',
                    body: event.data.text()
                }
            };
        }
        
        const { notification, data = {} } = notificationData;
        
        if (!notification) {
            console.log('No notification data in push message');
            return;
        }
        
        const options = {
            body: notification.body || '',
            icon: notification.icon || './icons/icon-192x192.png',
            badge: notification.badge || './icons/icon-96x96.png',
            tag: data.tag || 'default',
            requireInteraction: true,
            data: data,
            actions: [
                {
                    action: 'open',
                    title: 'アプリを開く'
                },
                {
                    action: 'close',
                    title: '閉じる'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(notification.title, options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    console.log('📍 Notification clicked:', event);
    
    if (event.action === 'close') {
        event.notification.close();
        return;
    }
    
    // Focus or open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Check if app is already open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' || client.url.includes('index.html')) {
                    return client.focus();
                }
            }
            // If not open, open it
            if (clients.openWindow) {
                return clients.openWindow('./index.html?tab=orderEntries');
            }
        })
    );
    
    event.notification.close();
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
    console.log('𝙭 Notification closed');
});

// Install event - minimal setup
self.addEventListener('install', function(event) {
    console.log('Service Worker installed');
    self.skipWaiting();
});

// Activate event - clean up old versions
self.addEventListener('activate', function(event) {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});
