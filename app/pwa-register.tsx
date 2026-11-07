"use client"

import { useEffect } from "react"

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      let reloaded = false
      const removeDevelopmentWorker = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const controlled = registrations.some(registration => registration.active?.scriptURL === new URL("/sw.js", location.origin).href)
        await Promise.all(registrations.map(registration => registration.unregister()))
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.filter(key => key.startsWith("evolingo-shell-")).map(key => caches.delete(key)))
        if (controlled && !reloaded) {
          reloaded = true
          location.reload()
        }
      }
      void removeDevelopmentWorker().catch(() => {})
      return
    }

    let registration: ServiceWorkerRegistration | undefined
    let updateTimer: number | undefined
    let reloaded = false

    const checkForUpdate = () => {
      if (document.visibilityState !== "visible" || !registration) return
      void registration.update().catch(() => {})
    }

    const onControllerChange = () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    }

    const registerWorker = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        // register() already performs a worker update check. Avoid a second
        // immediate request; also check on focus/visibility and less often on idle.
        updateTimer = window.setInterval(checkForUpdate, 10 * 60_000)
        document.addEventListener("visibilitychange", checkForUpdate)
        window.addEventListener("focus", checkForUpdate)
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
      } catch {
        // The app remains usable online if service-worker setup is unavailable.
      }
    }

    if (document.readyState === "complete") void registerWorker()
    else window.addEventListener("load", registerWorker, { once: true })

    return () => {
      window.removeEventListener("load", registerWorker)
      document.removeEventListener("visibilitychange", checkForUpdate)
      window.removeEventListener("focus", checkForUpdate)
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      if (updateTimer !== undefined) window.clearInterval(updateTimer)
    }
  }, [])
  return null
}
