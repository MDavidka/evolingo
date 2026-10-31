"use client"

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

/** Lightweight, dependency-free Trace primitives with the shadcn Plan API shape.
 * Uses native button/ARIA disclosure instead of introducing another UI framework.
 * See https://ui.shadcn.com/docs/ai-elements/base/plan */
type TraceStatus = "running" | "error" | "pending"
const TraceContext = createContext<{ open: boolean; setOpen: (value: boolean) => void } | null>(null)
const join = (...names: Array<string | undefined>) => names.filter(Boolean).join(" ")

export function Trace({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="trace" className={join("evo-trace", className)} {...props} />
}
export function TraceLine({ className, status, ...props }: ComponentProps<"span"> & { status?: TraceStatus }) {
  return <span data-slot="trace-line" data-status={status} className={join("evo-trace-line", className)} {...props} />
}
export function TraceIcon({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="trace-icon" className={join("evo-trace-icon", className)} aria-hidden="true" {...props} />
}
export function TraceTitle({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="trace-title" className={join("evo-trace-title", className)} {...props} />
}
export function TraceDescription({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="trace-description" className={join("evo-trace-description", className)} {...props} />
}
export function TraceCollapsible({ className, open, defaultOpen = false, onOpenChange, children, ...props }:
  Omit<ComponentProps<"div">, "children"> & { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const expanded = open ?? uncontrolled
  const setOpen = (value: boolean) => {
    if (open === undefined) setUncontrolled(value)
    onOpenChange?.(value)
  }
  return <TraceContext.Provider value={{ open: expanded, setOpen }}>
    <div data-slot="trace-collapsible" className={join("evo-trace-collapsible", className)} {...props}>{children}</div>
  </TraceContext.Provider>
}
export function TraceCollapsibleTrigger({ className, children, ...props }: ComponentProps<"button">) {
  const ctx = useContext(TraceContext)
  if (!ctx) return null
  return <button type="button" data-slot="trace-collapsible-trigger" className={join("evo-trace-trigger", className)} aria-expanded={ctx.open} onClick={() => ctx.setOpen(!ctx.open)} {...props}>
    {children}<ChevronRight size={16} strokeWidth={1.7} className="evo-trace-chevron" aria-hidden="true" />
  </button>
}
export function TraceCollapsibleContent({ className, ...props }: ComponentProps<"div">) {
  const ctx = useContext(TraceContext)
  if (!ctx) return null
  return <div data-slot="trace-collapsible-content" className={join("evo-trace-content", className)} hidden={!ctx.open} {...props} />
}
