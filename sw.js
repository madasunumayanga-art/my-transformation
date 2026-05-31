const CACHE_NAME = 'transform-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_CHECK') {
    const { pending } = e.data;
    if (!pending || pending.length === 0) return;
    self.registration.showNotification('⏰ Pending Habits', {
      body: pending.slice(0,3).map(h=>h.emoji+' '+h.label).join(', '),
      icon: '/my-transformation/icons/icon-192.png',
      tag: 'hourly-check',
      renotify: true,
    });
  }
});
