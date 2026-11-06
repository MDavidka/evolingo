const CACHE_NAME = "evolingo-shell-v3"
const APP_SHELL = ["/chat", "/offline.html", "/icon.svg"]

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("evolingo-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", event => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return
  // Versioned Next.js bundles are immutable and safe to cache by full request URL.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined)
        }
        return response
      }))
    )
    return
  }
  if (url.pathname.startsWith("/_next/")) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => undefined)
        }
        return response
      }).catch(async () => (await caches.match(request)) || (await caches.match("/chat")) || (await caches.match("/offline.html")) || Response.error())
    )
    return
  }

  if (url.pathname === "/icon.svg") {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)))
  }
})


// Use one recognizable Evölingo icon and concise Hungarian text across
// notifications. Stable tags replace duplicate alerts for the same event.
self.addEventListener("push", event => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch {
    payload = { body: event.data ? event.data.text() : "" }
  }
  const plain = value => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
  const title = plain(payload.title).slice(0, 80) || "Evölingo"
  const body = plain(payload.body).slice(0, 220) || "Új esemény vár rád az Evölingóban."
  const tag = plain(payload.tag).slice(0, 100) || "evolingo-update"
  const path = plain(payload.url)
  const url = path.startsWith("/") && !path.startsWith("//") ? path : "/chat"
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag,
      renotify: false,
      data: { url },
    })
  )
})

self.addEventListener("notificationclick", event => {
  event.notification.close()
  const targetPath = event.notification.data?.url || "/chat"
  const url = new URL(targetPath, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(async clients => {
        const existing = clients.find(client => new URL(client.url).origin === self.location.origin)
        if (existing) {
          if ("navigate" in existing) await existing.navigate(url)
          return existing.focus()
        }
        return self.clients.openWindow(url)
      })
  )
})
