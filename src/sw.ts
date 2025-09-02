// Service Worker for offline functionality
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
  skipWaiting(): void;
  addEventListener(type: string, listener: (event: any) => void): void;
};

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up outdated caches
cleanupOutdatedCaches();

// Cache API responses with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache images with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache CSS and JS files with StaleWhileRevalidate
registerRoute(
  ({ request }) => 
    request.destination === 'style' || 
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// Handle offline fallback for navigation requests
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ request }) => {
    try {
      return await fetch(request);
    } catch (error) {
      // Return cached offline page or main app shell
      const cache = await caches.open('offline-cache');
      const cachedResponse = await cache.match('/');
      return cachedResponse || new Response('Offline - Please check your connection', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }
);

// Listen for messages from the main thread
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});