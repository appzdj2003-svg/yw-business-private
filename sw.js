// Your World service worker: Web Push only (no offline caching).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Your World', { body: d.body || '', tag: d.tag, icon: '/icon-192.png', badge: '/icon-192.png', data: d, actions: d.actions || [], requireInteraction: !!d.actions }));
});
async function openUrl(url) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of all) { if (new URL(c.url).origin === self.location.origin) { c.postMessage({ type: 'yw-open', url }); return c.focus(); } }
  return self.clients.openWindow(url);
}
self.addEventListener('notificationclick', e => {
  const d = e.notification.data || {}; e.notification.close();
  if ((e.action === 'yes' || e.action === 'no') && d.t && d.api) {
    e.waitUntil(fetch(d.api + '/push/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: d.t, action: e.action }) })
      .then(r => r.json()).then(j => self.registration.showNotification(j.ok ? (e.action === 'yes' ? 'Approved' : 'Declined') : 'Not recorded', { body: j.msg || j.error || '', tag: 'act:' + d.tag, icon: '/icon-192.png', data: { url: d.url || '/' } }))
      .catch(() => self.registration.showNotification('Not recorded', { body: 'Couldn’t reach the server. Open the site to decide.', icon: '/icon-192.png', data: { url: d.url || '/' } }))
      .then(() => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage({ type: 'yw-actions' })))));
    return;
  }
  e.waitUntil(openUrl(d.url || '/'));
});
