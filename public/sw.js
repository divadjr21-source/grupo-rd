// Service worker: permite instalar o app, mostra um aviso sem internet e recebe as notificações.
// Não guarda dados dos chamados em cache — tudo continua vindo do servidor.
const CACHE = 'grupo-rd-v3'
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, '/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Só intercepta a abertura de páginas; o resto segue direto para a internet
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)))
  }
})

// Notificação recebida
self.addEventListener('push', (event) => {
  let dados = {}
  try { dados = event.data ? event.data.json() : {} } catch { dados = { corpo: event.data && event.data.text() } }
  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'Grupo RD', {
      body: dados.corpo || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: dados.url || '/' },
      vibrate: [120, 60, 120],
    })
  )
})

// Toque na notificação: abre a tela certa
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if ('focus' in j) {
          j.navigate(url)
          return j.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
