// Service worker simples: permite instalar o app e mostra um aviso quando estiver sem internet.
// Não guarda dados dos chamados em cache — tudo continua vindo do servidor.
const CACHE = 'grupo-rd-v1'
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
