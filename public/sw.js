// sw.js — Service Worker CRM Piese Auto
// Gestionează notificări push

self.addEventListener('push', event => {
  if (!event.data) return

  const data = event.data.json()
  
  const icons = {
    factura_noua:  '🧾',
    sku_lipsa:     '⚠️',
    sku_adaugat:   '✅',
  }

  const options = {
    body:    data.body || '',
    icon:    '/icon-192.png',
    badge:   '/icon-72.png',
    tag:     data.type || 'crm',
    data:    { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(
      (icons[data.type] || '🔧') + ' CRM Auto — ' + (data.title || 'Notificare'),
      options
    )
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        return clients.openWindow(url)
      })
  )
})

self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))
