"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Folder, Grid2X2 } from "lucide-react"
import LiquidGlassSurface from "./liquid-glass-surface"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile"

const tabs = [
  { id: "learn", label: "Tanulás", Icon: BookOpen },
  { id: "ai", label: "AI", Icon: BookOpen },
  { id: "files", label: "Fájlok", Icon: Folder },
  { id: "tools", label: "Eszközök", Icon: Grid2X2 },
] as const

type Props = {
  activeTab: AppTab
  onSelect: (tab: AppTab) => void
  avatarImage: string
  userName: string
}

export default function AppTabBar({ activeTab, onSelect }: Props) {
  // Keep all four destinations accessible even when labels are compacted.
  // The profile is a separate button in the top-right header.
  const [expanded, setExpanded] = useState(true)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setExpanded(false), 6000)
  }, [])

  useEffect(() => {
    const compactOnSend = () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
      setExpanded(false)
    }
    window.addEventListener("evolingo:chat-message-sent", compactOnSend)
    return () => window.removeEventListener("evolingo:chat-message-sent", compactOnSend)
  }, [])

  const reveal = useCallback(() => {
    setExpanded(true)
    scheduleCollapse()
  }, [scheduleCollapse])

  useEffect(() => {
    scheduleCollapse()
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
    }
  }, [scheduleCollapse])

  return (
    <LiquidGlassSurface kind="rail" className={`evo-tabbar evo-glass-rail ${expanded ? "is-expanded" : "is-compact"}`}>
    <nav aria-label="Fő navigáció"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") reveal()
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") scheduleCollapse()
      }}
      onFocusCapture={reveal}
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={activeTab === id ? "evo-tab is-active" : "evo-tab"}
          aria-current={activeTab === id ? "page" : undefined}
          aria-label={label}
          title={label}
          onClick={() => {
            onSelect(id)
            reveal()
          }}
        >
          <span className="evo-tab-content">
            {id === "ai" ? (
              <img className="evo-tab-ai-orb" src="/images/evolingo-ai-orb.svg" alt="" />
            ) : (
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span className="evo-tab-caption">{label}</span>
          </span>
        </button>
      ))}
    </nav>
    </LiquidGlassSurface>
  )
}
