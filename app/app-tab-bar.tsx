"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Folder, Grid2X2, PanelLeft } from "lucide-react"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile"

type Props = {
  activeTab: AppTab
  onSelect: (tab: AppTab) => void
  avatarImage: string
  userName: string
}

const destinations = [
  { id: "learn", label: "Tanulás", Icon: BookOpen },
  { id: "ai", label: "AI", Icon: BookOpen },
  { id: "files", label: "Fájlok", Icon: Folder },
  { id: "tools", label: "Eszközök", Icon: Grid2X2 },
] as const

/** Shared navigation on every app screen. The trigger morphs into the menu. */
export default function AppTabBar({ activeTab, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchor = useRef<HTMLDivElement>(null)

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
    const onPointerDown = (event: PointerEvent) => {
      if (anchor.current && !anchor.current.contains(event.target as Node)) collapse()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") collapse()
    }
    window.addEventListener("evolingo:chat-message-sent", onSend)
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("evolingo:chat-message-sent", onSend)
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
      clearTimer()
    }
  }, [collapse, clearTimer])

  return (
    <div ref={anchor} className="evo-morph-anchor">
      <div className={`evo-tabbar evo-glass-rail evo-morph-rail ${expanded ? "is-expanded" : "is-compact"}`}>
        <nav aria-label="Fő navigáció">
          <button
            type="button"
            className="evo-morph-toggle"
            aria-label={expanded ? "Menü bezárása" : "Menü megnyitása"}
            aria-expanded={expanded}
            onClick={() => expanded ? collapse() : expand()}
          >
            <PanelLeft size={23} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {destinations.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`evo-morph-destination ${activeTab === id ? "is-active" : ""}`}
              aria-label={label}
              title={label}
              aria-current={activeTab === id ? "page" : undefined}
              tabIndex={expanded ? 0 : -1}
              aria-hidden={!expanded}
              onClick={() => { onSelect(id); collapse() }}
            >
              {id === "ai"
                ? <img className="evo-morph-ai-icon" src="/images/evolingo-ai-orb.svg" alt="" />
                : <Icon size={23} strokeWidth={1.8} aria-hidden="true" />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
