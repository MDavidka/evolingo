"use client"

import { useEffect, useState } from "react"
import { BottomSheet, UIButton } from "./evo-ui-kit"

const DISMISS_KEY = "evolingo.notice.developments.v2"

export default function DevelopmentNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Preserve the existing startup guard: do not interrupt /chat or another splash.
    if (window.location.pathname === "/chat" || window.location.pathname === "/") return
    try {
      if (localStorage.getItem(DISMISS_KEY) === "dismissed") return
    } catch { /* Storage might be restricted. */ }

    let activationTimer: number | undefined
    const maybeShow = () => {
      if (activationTimer !== undefined || document.querySelector(".learn-splash, .system-notice-backdrop, .evo-ui-sheet-backdrop")) return
      activationTimer = window.setTimeout(() => {
        activationTimer = undefined
        if (document.querySelector(".learn-splash, .system-notice-backdrop, .evo-ui-sheet-backdrop")) return
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

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, "dismissed")
    } catch { /* The sheet should still close when storage is unavailable. */ }
  }

  return visible ? <BottomSheet
    title="Fejlesztések"
    description="Evölingo · Hírek"
    size="compact"
    onClose={dismiss}
    footer={<UIButton fullWidth onClick={dismiss}>Értem</UIButton>}
  >
    <div className="evo-development-content">
      <div className="evo-development-icon">
        <img src="/images/development-warning.png" width={48} height={48} alt="" aria-hidden="true" />
      </div>
      <p>Dávid továbbra is fejleszti az Evölingót. Egyes funkciók ezért időnként lassabban működhetnek, vagy átmenetileg nem érhetők el.</p>
    </div>
  </BottomSheet> : null
}
