"use client"

import { useEffect } from "react"

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const registerWorker = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
    }
    if (document.readyState === "complete") registerWorker()
    else window.addEventListener("load", registerWorker, { once: true })
    return () => window.removeEventListener("load", registerWorker)
  }, [])
  return null
}
