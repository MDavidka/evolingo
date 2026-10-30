"use client"

import { useEffect, useRef, type ReactNode, type PointerEvent } from "react"

type UnifiedSheetProps = {
  children: ReactNode
  onClose: () => void
  labelledBy: string
  backdropClassName?: string
  sheetClassName?: string
  role?: "dialog" | "alertdialog"
  dragHandle?: boolean
}

export default function UnifiedSheet({ children, onClose, labelledBy, backdropClassName = "", sheetClassName = "", role = "dialog", dragHandle = true }: UnifiedSheetProps) {
  const startY = useRef<number | null>(null)
  const dialogRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current()
      } else if (event.key === "Tab" && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    firstFocusable?.focus()
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  const startDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "mouse") {
      startY.current = event.clientY
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }
  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (startY.current === null) return
    if (event.clientY - startY.current > 80) onClose()
    startY.current = null
  }

  return <div className={"evo-unified-sheet-backdrop " + backdropClassName} role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialogRef} className={"evo-unified-sheet " + sheetClassName} role={role} aria-modal="true" aria-labelledby={labelledBy} onPointerUp={endDrag} onPointerCancel={() => { startY.current = null }}>
      {dragHandle && <span className="evo-unified-sheet-grabber" aria-hidden="true" onPointerDown={startDrag} onPointerUp={endDrag} onPointerCancel={() => { startY.current = null }} />}
      {children}
    </section>
  </div>
}
