"use client"

import { useEffect, useState } from "react"

const DISMISS_KEY = "evolingo.notice.developments.v1"

export default function DevelopmentNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(DISMISS_KEY) !== "dismissed")
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, "dismissed")
    } catch {
      // Dismissing still works when browser storage is disabled.
    }
  }

  if (!visible) return null

  return (
    <aside
      className="ev-system-notice"
      role="status"
      aria-live="polite"
      aria-label="Evölingo fejlesztési értesítés"
    >
      <img
        className="ev-system-notice__icon"
        src="/images/development-warning.png"
        alt=""
        aria-hidden="true"
        width={56}
        height={48}
      />
      <div className="ev-system-notice__content">
        <div className="ev-system-notice__meta">
          <span className="ev-system-notice__app">Evölingo</span>
          <span className="ev-system-notice__time">most</span>
        </div>
        <p className="ev-system-notice__title">Fejlesztések</p>
        <p className="ev-system-notice__message">
          Dávid továbbra is az Evölingo fejlesztésén dolgozik. Az alkalmazás ezért néha megakadhat, vagy nem töltődhetnek be bizonyos dolgok.
        </p>
      </div>
      <button
        type="button"
        className="ev-system-notice__close"
        onClick={dismiss}
        aria-label="Értesítés bezárása"
        title="Bezárás"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  )
}
