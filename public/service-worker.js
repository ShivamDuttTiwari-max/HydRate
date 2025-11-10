// Hydrate App Service Worker - Glassy Blue Theme
const CACHE_NAME = 'hydrate-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'snooze') {
    // Schedule a new notification in 5 minutes
    setTimeout(() => {
      self.registration.showNotification('Time to Hydrate!', {
        body: 'Snooze time is up! Drink water for mental clarity.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [150, 50, 150],
        requireInteraction: true,
        tag: 'hydration-reminder',
        actions: [
          { action: 'dismiss', title: 'Done!' }
        ]
      });
    }, 5 * 60 * 1000); // 5 minutes
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background sync for reliable notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'hydration-reminder') {
    event.waitUntil(
      self.registration.showNotification('Time to Hydrate!', {
        body: 'Drink a glass of water for mental clarity and better focus.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [150, 50, 150],
        requireInteraction: true,
        tag: 'hydration-reminder',
        actions: [
          { action: 'snooze', title: 'Snooze 5min' },
          { action: 'dismiss', title: 'Done!' }
        ]
      })
    );
  }
});

// Push event for external notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Drink a glass of water for mental clarity.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [150, 50, 150],
    requireInteraction: true,
    tag: 'hydration-reminder',
    actions: [
      { action: 'snooze', title: 'Snooze 5min' },
      { action: 'dismiss', title: 'Done!' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Time to Hydrate!', options)
  );
});