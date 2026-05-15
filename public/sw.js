// public/sw.js  —  Service Worker
// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Cache-First for static assets, Network-Only for /api/ routes.
// Bump CACHE_VERSION whenever you deploy new JS/CSS to bust stale caches.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'ionmaster-v2';

const PRECACHE = [
    '/',
    '/index.html',
    '/3lite-style.css',
    '/js/data.js',
    '/js/app.js',
    '/js/audio.js',
    '/js/state.js',
    '/js/ui.js',
    '/js/game.js',
    '/js/api.js',
];

// ── Install: pre-cache core assets ────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())   // activate immediately
    );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys
                .filter(k => k !== CACHE_VERSION)
                .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())    // take control without reload
    );
});

// ── Fetch: cache-first for assets, network-only for API ──────────────────────
self.addEventListener('fetch', event => {
    // Never cache API calls — always go to network
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // Cache images on first fetch
                if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(event.request.url)) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
