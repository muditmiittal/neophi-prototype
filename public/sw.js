// Small offline helper. Network first, so a new build is never hidden by an old cache;
// the cache is only used when the network is not there.
const CACHE = 'neophi-v3-public';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('/app');
    if (!response.ok) throw new Error('App shell unavailable');
    const html = await response.clone().text();
    await cache.put('/app', response);
    // Vite emits local hashed module, preload, CSS and font URLs in the shell.
    const listed = await fetch('/shell-assets.json');
    if (!listed.ok) throw new Error('App assets unavailable');
    const assets = [...await listed.json(), ...[...html.matchAll(/(?:src|href)="(\/assets\/[^"#]+)"/g)].map((match) => match[1])];
    await cache.addAll([...new Set([...assets, '/icons/icon-192.png'])]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('neophi-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find((item) => new URL(item.url).origin === self.location.origin);
    if (client) { await client.navigate('/app/today'); await client.focus(); }
    else await self.clients.openWindow('/app/today');
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (/^\/(api|webhooks)(\/|$)/.test(new URL(req.url).pathname)) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const shell = await caches.match(new URL(req.url).pathname.startsWith('/app') ? '/app' : '/');
          if (shell) return shell;
        }
        return new Response('Offline, and this page was not opened before.', {
          status: 503,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }),
  );
});
