const CACHE_NAME = 'finzilla-v30';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/app.css',
    './js/app.js',
    './js/storage.js',
    './js/i18n.js',
    './js/charts.js',
    './js/csv-import.js',
    './js/alerts.js',
    './js/goals.js',
    './js/reports.js',
    './js/tags.js',
    './js/stock-api.js',
    './js/stock-alerts.js',
    './js/notifications.js',
    './js/export.js',
    './js/widgets.js',
    './js/currency.js',
    './js/data-updates.js',
    './js/firebase-config.js',
    './js/auth.js',
    './pages/bank.html',
    './pages/credit.html',
    './pages/stocks.html',
    './pages/training.html',
    './pages/pension.html',
    './pages/gemel.html',
    './pages/funds-update.html',
    './pages/market-update.html',
    './pages/mygemel.html',
    './pages/mygemel-training.html',
    './pages/mygemel-pension.html',
    './pages/mygemel-gemel.html',
    './data/mygemel-funds.js',
    './pages/assets.html',
    './pages/goals.html',
    './pages/pension-calc.html',
    './pages/reports.html',
    './pages/settings.html',
    './data/sample-data.js',
    './data/market-funds.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching app assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((error) => {
                console.log('Cache addAll failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
            .catch(() => {
                // Return offline page if available
                return caches.match('/index.html');
            })
    );
});
