// ServeSync Service Worker — handles FCM background messages + asset caching

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config must be duplicated here (service workers can't import .env)
// These are public-safe values — the API key only works with your domain.
firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__            || '',
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__        || '',
  projectId:         self.__FIREBASE_PROJECT_ID__         || '',
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__     || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || '',
  appId:             self.__FIREBASE_APP_ID__             || '',
});

const messaging = firebase.messaging();

// Handle background push messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);
  const title = payload.notification?.title ?? 'ServeSync';
  const body  = payload.notification?.body  ?? 'You have a new notification';
  self.registration.showNotification(title, {
    body,
    icon: '/manifest.json',
    badge: '/manifest.json',
    data: payload.data ?? {},
  });
});

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.link ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ─── Asset caching ────────────────────────────────────────────────────────────
const CACHE_NAME = 'servesync-v3';  // bumped — forces old SW to discard stale cache
const ASSETS = ['/manifest.json'];  // only cache manifest, NOT index.html or JS/CSS

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept JS, CSS, or HTML — let them go straight to network.
  // This prevents the SW from serving stale index.html for JS module requests.
  const ext = url.pathname.split('.').pop();
  if (['js', 'css', 'html', 'mjs'].includes(ext)) return;

  // For everything else (images, fonts, manifest) use cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
