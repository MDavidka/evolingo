"use client"

import { useEffect } from "react"

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

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
        // Ask for a fresh worker at startup and whenever an installed app returns
        // to the foreground; the timer catches long-running open app sessions.
        checkForUpdate()
        updateTimer = window.setInterval(checkForUpdate, 60_000)
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
