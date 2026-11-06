"use client"
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import "./bottom-sheet.css"

export type BottomSheetSize = "compact" | "medium" | "expanded"
export type BottomSheetProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: BottomSheetSize
  dismissible?: boolean
  role?: "dialog" | "alertdialog"
  closeLabel?: string
}

export function BottomSheet({
  title, description, children, footer, onClose, size = "compact",
  dismissible = true, role = "dialog", closeLabel = "Close sheet",
}: BottomSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [expanded, setExpanded] = useState(size === "expanded")
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const panelRef = useRef<HTMLElement>(null)
  const dragY = useRef<number | null>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const requestClose = () => {
    if (closeTimer.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCloseRef.current()
      return
    }
    setClosing(true)
    closeTimer.current = setTimeout(() => onCloseRef.current(), 200)
  }

  useEffect(() => {
    setMounted(true)
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current) }
  }, [])

  useEffect(() => {
    if (!mounted) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter(node => node.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => {
      const input = panelRef.current?.querySelector<HTMLElement>('input[autofocus], textarea[autofocus]')
      ;(input ?? focusable()[0] ?? panelRef.current)?.focus({ preventScroll: true })
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault()
        requestClose()
      }
      if (event.key !== "Tab") return
      const items = focusable()
      if (!items.length) { event.preventDefault(); panelRef.current?.focus(); return }
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true })
    }
    // Parent keeps this dialog mounted while open; onClose is accessed through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, dismissible])

  useEffect(() => {
    if (!mounted) return
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => {
      // When the keyboard shrinks the visual viewport, keep content above it.
      const occluded = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardOffset(Math.round(occluded))
    }
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    update()
    return () => {
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
    }
  }, [mounted])

  const onHandleStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!dismissible) return
    dragY.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onHandleEnd = (event: PointerEvent<HTMLDivElement>) => {
    const from = dragY.current
    dragY.current = null
    if (from === null || !dismissible) return
    const distance = event.clientY - from
    if (distance > 75) {
      if (expanded && size !== "expanded") setExpanded(false)
      else requestClose()
    } else if (distance < -75) setExpanded(true)
  }

  if (!mounted) return null
  return createPortal(
    <div
      className={"evo-ui-scope evo-ui-sheet-backdrop" + (closing ? " evo-ui-sheet-backdrop--closing" : "")}
      role="presentation"
      onPointerDown={event => { if (dismissible && event.target === event.currentTarget) requestClose() }}
      style={{ "--evo-sheet-keyboard-offset": keyboardOffset + "px" } as React.CSSProperties}
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={"evo-ui-sheet evo-ui-sheet--" + (expanded ? "expanded" : size)}
      >
        <div className="evo-ui-sheet__grabber-zone"
          onPointerDown={onHandleStart}
          onPointerUp={onHandleEnd}
          onPointerCancel={() => { dragY.current = null }}>
          <span className="evo-ui-sheet__grabber" aria-hidden="true" />
        </div>
        <header className="evo-ui-sheet__header">
          <div className="evo-ui-sheet__header-copy">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className="evo-ui-sheet__close" aria-label={closeLabel} onClick={requestClose}>
            <X size={19} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>
        <div className="evo-ui-sheet__content">{children}</div>
        {footer && <footer className="evo-ui-sheet__footer">{footer}</footer>}
        <div className="evo-ui-sheet__safe-area" aria-hidden="true" />
      </section>
    </div>, document.body
  )
}
