"use client"

import type { KeyboardEvent, ReactNode } from "react"

export type TabItem<Value extends string = string> = { value: Value; label: ReactNode }

export function Tabs<Value extends string>({ items, value, onChange, ariaLabel, variant = "segmented", className = "" }: {
  items: TabItem<Value>[]
  value: Value
  onChange: (value: Value) => void
  ariaLabel: string
  variant?: "segmented" | "underline"
  className?: string
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex(item => item.value === value)
    let next = current
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % items.length
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + items.length) % items.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = items.length - 1
    else return
    event.preventDefault()
    onChange(items[next].value)
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus()
  }

  return <div className={`arc-tabs arc-tabs--${variant} ${className}`.trim()} role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
    {items.map(item => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} className="arc-tab" onClick={() => onChange(item.value)}>{item.label}</button>)}
  </div>
}
