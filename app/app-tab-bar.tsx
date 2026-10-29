"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Folder, Grid2X2, PanelLeft } from "lucide-react"
import LiquidGlassSurface from "./liquid-glass-surface"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile"

type Props = {
  activeTab: AppTab
  onSelect: (tab: AppTab) => void
  avatarImage: string
  userName: string
}

const destinations = [
  { id: "learn", label: "Tanulás", Icon: PanelLeft },
  { id: "files", label: "Fájlok", Icon: Folder },
  { id: "tools", label: "Eszközök", Icon: Grid2X2 },
] as const

export default function AppTabBar({ activeTab, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const railRef = useRef<HTMLDivElement>(null)

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const collapse = useCallback(() => {
    clearTimer()
    setExpanded(false)
  }, [clearTimer])

  const scheduleCollapse = useCallback(() => {
    clearTimer()
    timer.current = setTimeout(() => setExpanded(false), 7000)
  }, [clearTimer])

  const expand = useCallback(() => {
    setExpanded(true)
    scheduleCollapse()
  }, [scheduleCollapse])

  useEffect(() => {
    const onSend = () => collapse()
    const onOutside = (event: PointerEvent) => {
      if (railRef.current && !railRef.current.contains(event.target as Node)) collapse()
    }
    window.addEventListener("evolingo:chat-message-sent", onSend)
    document.addEventListener("pointerdown", onOutside)
    return () => {
      window.removeEventListener("evolingo:chat-message-sent", onSend)
      document.removeEventListener("pointerdown", onOutside)
      clearTimer()
    }
  }, [collapse, clearTimer])

  return (
    <div ref={railRef} className="evo-morph-anchor">
      <LiquidGlassSurface kind="rail" className={`evo-tabbar evo-glass-rail evo-morph-rail ${expanded ? "is-expanded" : "is-compact"}`}>
        <nav aria-label="Fő navigáció" onPointerEnter={event => { if (event.pointerType === "mouse" && expanded) scheduleCollapse() }}>
          <button
            type="button"
            className="evo-morph-toggle"
            aria-label={expanded ? "Navigáció bezárása" : "Navigáció megnyitása"}
            aria-expanded={expanded}
            onClick={() => expanded ? collapse() : expand()}
          >
            <PanelLeft size={23} strokeWidth={1.9} aria-hidden="true" />
          </button>
          {destinations.slice(1).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`evo-morph-destination ${activeTab === id ? "is-active" : ""}`}
              aria-label={label}
              aria-current={activeTab === id ? "page" : undefined}
              tabIndex={expanded ? 0 : -1}
              onClick={() => { onSelect(id); collapse() }}
            >
              <Icon size={23} strokeWidth={1.85} aria-hidden="true" />
            </button>
          ))}
        </nav>
      </LiquidGlassSurface>
    </div>
  )
}
