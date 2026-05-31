// ── Service Worker v1.0 ── Transformation Tracker ──────────────────────────

const CACHE_NAME = 'transform-v1';
const ASSETS = ['/', '/index.html'];

// ── Install & cache ──────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (offline fallback) ─────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || '⏰ Habit Reminder', {
      body: data.body || 'You have pending habits to complete!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'habit-reminder',
      renotify: true,
      requireInteraction: false,
      actions: data.actions || [],
      data: data.habitIds || []
    })
  );
});

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action && e.action.startsWith('done_')) {
    // Mark habit done directly from notification
    const habitId = e.action.replace('done_', '');
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'MARK_DONE', habitId });
          clients[0].focus();
        } else {
          self.clients.openWindow('/index.html?markDone=' + habitId);
        }
      })
    );
  } else {
    // Open app
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) { clients[0].focus(); }
        else { self.clients.openWindow('/index.html'); }
      })
    );
  }
});

// ── Background sync for scheduled notifications ──────────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_CHECK') {
    // Triggered by the page to show a notification
    const { pending } = e.data;
    if (!pending || pending.length === 0) return;

    const actions = pending.slice(0, 2).map(h => ({
      action: `done_${h.id}`,
      title: `✓ ${h.label.length > 20 ? h.label.slice(0,20)+'…' : h.label}`
    }));

    self.registration.showNotification('⏰ Pending Habits', {
      body: `${pending.length} task${pending.length>1?'s':''} waiting: ${pending.map(h=>h.emoji+' '+h.label).slice(0,2).join(', ')}${pending.length>2?' +more':''}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'hourly-check',
      renotify: true,
      requireInteraction: false,
      actions,
      data: { habitIds: pending.map(h => h.id) }
    });
  }
});
