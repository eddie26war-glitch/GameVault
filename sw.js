const SHELL_CACHE = 'gamevault-v4.2-shell';
const IMAGE_CACHE = 'gamevault-v4.2-images';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const IMAGE_HOSTS = ['media.rawg.io', 'shared.steamstatic.com', 'cdn.cloudflare.steamstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('gamevault-') && key !== SHELL_CACHE && key !== IMAGE_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.destination === 'image' && IMAGE_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const stored = await cache.match(request);
      if (stored) return stored;
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') {
        event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
      }
      return response;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.put('./index.html', copy)));
      }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});
