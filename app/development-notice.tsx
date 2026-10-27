"use client"

import { useEffect, useRef, useState } from "react"

const DISMISS_KEY = "evolingo.notice.developments.v2"

export default function DevelopmentNotice() {
  const [visible, setVisible] = useState(false)
  const acknowledgeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(DISMISS_KEY) !== "dismissed")
    } catch {
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!visible) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    acknowledgeButton.current?.focus({ preventScroll: true })

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, "dismissed")
    } catch {
      // The button still dismisses the dialog if storage is unavailable.
    }
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
        <div className="ev-development-body">
          <img
            className="ev-development-icon"
            src="/images/development-warning.png"
            width={72}
            height={72}
            alt=""
            aria-hidden="true"
          />
          <h2 id="ev-development-heading" className="ev-development-heading">
            Fejlesztések
          </h2>
          <p id="ev-development-description" className="ev-development-description">
            Dávid továbbra is az Evölingo fejlesztésén dolgozik. Az alkalmazás ezért néha megakadhat, vagy nem töltődhetnek be bizonyos dolgok.
          </p>
        </div>
        <button
          ref={acknowledgeButton}
          type="button"
          className="ev-development-confirm"
          onClick={dismiss}
        >
          Értem!
        </button>
      </section>
    </div>
  )
}
