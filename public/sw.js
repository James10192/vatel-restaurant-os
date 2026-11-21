/*
 * Service worker Vatel Restauration : notifications push UNIQUEMENT.
 * Volontairement sans gestionnaire `fetch` et sans Cache Storage : aucune page, réponse API,
 * donnée de compte ou de solde n'est jamais mise en cache (#10, #16). Le réseau reste la seule source.
 */
const FALLBACK = { title: 'Vatel Restauration', body: '', url: '/app' }

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)

self.addEventListener('push', (event) => {
  let message = FALLBACK
  try {
    message = { ...FALLBACK, ...event.data.json() }
  } catch {
    // Charge utile absente ou illisible : notification générique.
  }
  // Seuls les chemins internes sont suivis au clic (jamais une adresse externe reçue dans la charge utile).
  const url =
    typeof message.url === 'string' &&
    message.url.startsWith('/') &&
    !message.url.startsWith('//')
      ? message.url
      : '/app'
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/icons/vatel-192.png',
      lang: 'fr',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    event.notification.data?.url ?? '/app',
    self.location.origin,
  )
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find(
          (client) => new URL(client.url).origin === target.origin,
        )
        if (open)
          return open.focus().then((client) => client.navigate(target.href))
        return self.clients.openWindow(target.href)
      }),
  )
})
