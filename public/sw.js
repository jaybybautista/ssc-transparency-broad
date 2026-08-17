/* eslint-disable no-restricted-globals */
/**
 * Service worker for the SSC Virtual Board.
 *
 * The goal is campus wifi that drops halfway through a page load, not a fully
 * offline app. The board's content lives in Firestore and must stay live, so
 * this caches the *application* and deliberately never caches data.
 *
 * The failure everyone hits with service workers is serving a stale build
 * forever. Three things prevent that here:
 *
 *  1. Navigations are network-first. A fresh deploy is picked up the moment the
 *     network is reachable; the cache only answers when the network does not.
 *  2. Static assets are cache-first, which is safe *only* because Create React
 *     App fingerprints them (main.6606cdaa.js). A new build produces new names,
 *     so a cached file can never shadow a newer one.
 *  3. The worker never calls skipWaiting on its own. A new version waits, the
 *     page notices and offers a reload — swapping code under a half-filled form
 *     is worse than a short delay.
 */

const VERSION = 'ssc-board-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

/** Hosts whose responses must always come from the network. */
const NEVER_CACHE = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebasestorage.googleapis.com',
  'www.google-analytics.com',
  'www.googletagmanager.com',
  'apis.google.com',
  'accounts.google.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Only the entry point. Everything else is picked up as it is requested,
      // which avoids a fragile hardcoded list of hashed filenames.
      cache.addAll(['/', '/index.html', '/manifest.json', '/ssc_logo.svg']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

/** The page asks for the swap once the visitor accepts it. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Live data, authentication and uploads always go to the network. A cached
  // announcement would be worse than no announcement.
  if (NEVER_CACHE.some((host) => url.hostname.endsWith(host))) return;

  // Cross-origin (fonts, CDNs) — let the browser handle it normally.
  if (url.origin !== self.location.origin) return;

  // ---- navigations: network first, cache as a safety net ----
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch (error) {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match('/index.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // ---- fingerprinted build output: cache first ----
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      })()
    );
    return;
  }

  // ---- everything else on our origin: try network, fall back to cache ----
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (error) {
        const cache = await caches.open(ASSET_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        throw error;
      }
    })()
  );
});
