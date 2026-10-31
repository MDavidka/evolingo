"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

const DISMISS_KEY = "evolingo.notice.developments.v2"

export default function DevelopmentNotice() {
  const [visible, setVisible] = useState(false)
  const acknowledgeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Do not interrupt the general chat startup or steal focus from its composer.
    if (window.location.pathname === "/chat" || window.location.pathname === "/") return
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "dismissed") return
    } catch { /* Storage can be restricted in private browsing. */ }

    // Let the app finish its own post-splash notification transition.
    // Keep checking until there is no other dialog to avoid stacked sheets.
    let activationTimer: number | undefined
    const maybeShow = () => {
      if (activationTimer !== undefined || document.querySelector(".learn-splash, .system-notice-backdrop")) return
      activationTimer = window.setTimeout(() => {
        activationTimer = undefined
        if (document.querySelector(".learn-splash, .system-notice-backdrop")) return
        setVisible(true)
        observer.disconnect()
      }, 550)
    }
    const observer = new MutationObserver(maybeShow)
    observer.observe(document.body, { childList: true, subtree: true })
    maybeShow()
    return () => {
      observer.disconnect()
      if (activationTimer !== undefined) window.clearTimeout(activationTimer)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    acknowledgeButton.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, "dismissed")
    } catch { /* The dialog still closes when storage is unavailable. */ }
  }

  if (!visible) return null

  return (
    <div className="ev-development-overlay">
      <section
        className="ev-development-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ev-development-heading"
        aria-describedby="ev-development-description"
      >
        <div className="ev-development-handle" aria-hidden="true" />
        <button type="button" className="ev-development-close" aria-label="Bezárás" onClick={dismiss}>
          <X size={19} aria-hidden="true" />
        </button>
        <div className="ev-development-body">
          <div className="ev-development-icon-wrap">
            <img className="ev-development-icon" src="/images/development-warning.png" width={52} height={52} alt="" aria-hidden="true" />
          </div>
          <span className="ev-development-eyebrow">EVÖLINGO · HÍREK</span>
          <h2 id="ev-development-heading" className="ev-development-heading">Fejlesztések</h2>
          <p id="ev-development-description" className="ev-development-description">
            Dávid továbbra is fejleszti az Evölingót. Egyes funkciók ezért időnként lassabban működhetnek, vagy átmenetileg nem érhetők el.
          </p>
        </div>
        <button ref={acknowledgeButton} type="button" className="ev-development-confirm" onClick={dismiss}>Értem</button>
      </section>
    </div>
  )
}
