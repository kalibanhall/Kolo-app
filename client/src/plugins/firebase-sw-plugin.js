/**
 * Vite plugin that generates firebase-messaging-sw.js at build time
 * with Firebase config injected from environment variables.
 * This prevents hardcoding API keys in public source files.
 */
import fs from 'fs';
import path from 'path';

export default function firebaseSwPlugin() {
  const FIREBASE_SW_TEMPLATE = `// Firebase Cloud Messaging Service Worker
// Auto-generated at build time — DO NOT EDIT manually
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (injected at build time)
firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'KOLO Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/logo-kolo-192.png',
    badge: '/logo-kolo-96.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    actions: [
      { action: 'view', title: 'Voir' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});
`;

  function injectConfig(template, env) {
    return template
      .replace('__FIREBASE_API_KEY__', env.VITE_FIREBASE_API_KEY || '')
      .replace('__FIREBASE_AUTH_DOMAIN__', env.VITE_FIREBASE_AUTH_DOMAIN || '')
      .replace('__FIREBASE_PROJECT_ID__', env.VITE_FIREBASE_PROJECT_ID || '')
      .replace('__FIREBASE_STORAGE_BUCKET__', env.VITE_FIREBASE_STORAGE_BUCKET || '')
      .replace('__FIREBASE_MESSAGING_SENDER_ID__', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
      .replace('__FIREBASE_APP_ID__', env.VITE_FIREBASE_APP_ID || '');
  }

  return {
    name: 'firebase-sw-generator',

    // During dev, serve the SW with injected env vars
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/firebase-messaging-sw.js') {
          const content = injectConfig(FIREBASE_SW_TEMPLATE, process.env);
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Service-Worker-Allowed', '/');
          res.end(content);
          return;
        }
        next();
      });
    },

    // During build, write the generated SW to dist/
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const swPath = path.join(distDir, 'firebase-messaging-sw.js');

      const content = injectConfig(FIREBASE_SW_TEMPLATE, process.env);

      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      fs.writeFileSync(swPath, content, 'utf-8');
      console.log('\n✅ Firebase Messaging SW generated with env config\n');
    }
  };
}
