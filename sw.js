
const CACHE_NAME = 'geo-quiz-v1';

const ASSETS_TO_CACHE = [
    '/',                     // index.html
    '/index.html',

    // CSS
    '/css/styles.css',

    // JS modules (app‐level)
    '/js/app.js',
    '/js/audioController.js',
    '/js/chartController.js',
    '/js/dataService.js',
    '/js/quizController.js',
    '/js/scoreService.js',
    '/js/utils.js',

    // Controllers
    '/js/controllers/appController.js',
    '/js/controllers/homeController.js',
    '/js/controllers/quizControllerUI.js',
    '/js/controllers/resultsController.js',
    '/js/controllers/scoresController.js',
    '/js/controllers/controlPanelController.js',
    '/js/controllers/authoringController.js',
    '/js/controllers/authoringHelpers.js',

    // Media
    '/media/background-music.mp3',
    '/media/finish-sound.mp3',

    // Built-in quiz JSON
    '/data/afrika.json',
    '/data/australie-novy-zeland.json',
    '/data/ceska-republika.json',
    '/data/evropa.json',
    '/data/jizni-amerika.json',
    '/data/kanada-usa.json',
    '/data/stredni-amerika.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const requestURL = new URL(event.request.url);

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request)
                .then(networkResponse => {
                    // If valid response, put into cache for future
                    if (
                        event.request.method === 'GET' &&
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === 'basic'
                    ) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => {

                    console.log("cache error")

                });
        })
    );
});
