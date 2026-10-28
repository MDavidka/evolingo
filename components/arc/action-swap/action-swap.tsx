"use client"

/**
 * Local, lightweight Action Swap control following the public Arc UI API.
 * Source reference: https://uiarc.dev/components/action-swap
 * This adaptation uses CSS transitions so it works in Evolingo without Motion.
 * Swap the files for the registry implementation when installing @uiarc/action-swap.
 */
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import styles from "./action-swap.module.css"

export type ActionSwapState = {
  id: string
  label: string
  icon?: ReactNode
  tone?: "neutral" | "accent" | "success" | "warning" | "quiet"
  pendingLabel?: string
  holdFor?: number
}
type ActionSwapProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick" | "onChange" | "value"> & {
  states: ActionSwapState[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string, state: ActionSwapState) => void
  onAction?: (next: ActionSwapState, current: ActionSwapState) => void | PromiseLike<unknown>
  failureLabel?: string
  size?: "sm" | "md" | "lg"
}

export function ActionSwap({
  states, value, defaultValue, onValueChange, onAction,
  failureLabel = "Próbáld újra", size = "sm",
  className = "", disabled, ...rest
}: ActionSwapProps) {
  const [internal, setInternal] = useState(defaultValue ?? states[0]?.id ?? "")
  const [pending, setPending] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState("")
  const busy = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const actualId = value === undefined ? internal : value
  const index = Math.max(0, states.findIndex(state => state.id === actualId))
  const current = states[index]
  const busyNow = pending !== null

  useEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer)
    timers.current = []
  }, [])

  if (!current || states.length < 2) return null

  const schedule = (callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay)
    timers.current.push(timer)
  }
  const commit = (next: ActionSwapState) => {
    if (value === undefined) setInternal(next.id)
    onValueChange?.(next.id, next)
    setStatus(next.label)
    if (next.holdFor && next.holdFor > 0) {
      schedule(() => {
        const after = states[(states.findIndex(state => state.id === next.id) + 1) % states.length]
        if (value === undefined) setInternal(after.id)
        onValueChange?.(after.id, after)
        setStatus(after.label)
      }, next.holdFor)
    }
  }
  const act = async () => {
    if (busy.current || disabled || states.length < 2) return
    busy.current = true
    setFailed(false)
    const next = states[(index + 1) % states.length]
    try {
      const result = onAction?.(next, current)
      if (result && typeof result.then === "function") {
        setPending(next.pendingLabel || next.label)
        setStatus(next.pendingLabel || next.label)
        await result
      }
      commit(next)
    } catch {
      setFailed(true)
      setStatus(failureLabel)
      schedule(() => setFailed(false), 1800)
    } finally {
      busy.current = false
      setPending(null)
    }
  }

  const visibleLabel = failed ? failureLabel : pending ?? current.label
  return <>
    <button
      {...rest}
      type={rest.type ?? "button"}
      className={[styles.root, styles[size], className].filter(Boolean).join(" ")}
      data-tone={failed ? "warning" : current.tone ?? "neutral"}
      aria-label={visibleLabel}
      aria-busy={busyNow}
      aria-disabled={busyNow || disabled}
      disabled={disabled}
      onClick={() => { void act() }}
    >
      <span className={styles.icon} aria-hidden="true" key={pending ? "pending" : actualId}>
        {current.icon}
      </span>
      <span className={styles.label} aria-hidden="true" key={visibleLabel}>{visibleLabel}</span>
    </button>
    <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{status}</span>
  </>
}
