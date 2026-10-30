"use client"

import { useEffect } from "react"

/** The web manifest locks installed launches; this is a best-effort runtime enhancement. */
export default function OrientationLock() {
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    if (!standalone) return
    const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> }
    if (typeof orientation?.lock === "function") void orientation.lock("portrait").catch(() => undefined)
  }, [])
  return null
}
