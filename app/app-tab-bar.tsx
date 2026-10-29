"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Folder, Grid2X2, PanelLeft, Accessibility, Plus, Contrast, Eye, X } from "lucide-react"
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
  const [expanded, setExpanded] = useState(false)
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => { setExpanded(false); setAccessibilityOpen(false) }, 9000)
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

  useEffect(() => {
    document.documentElement.classList.toggle("evo-large-text", largeText)
    document.documentElement.classList.toggle("evo-high-contrast", highContrast)
    document.documentElement.classList.toggle("evo-reduced-motion", reduceMotion)
    return () => document.documentElement.classList.remove("evo-large-text", "evo-high-contrast", "evo-reduced-motion")
  }, [largeText, highContrast, reduceMotion])

  return (
    <>
    <button type="button" className="evo-home-menu-trigger" aria-label={expanded ? "Navigáció bezárása" : "Navigáció megnyitása"} aria-expanded={expanded} onClick={() => { setExpanded(value => !value); setAccessibilityOpen(false) }}><PanelLeft size={22} strokeWidth={1.9} /></button>
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
      {tabs.filter(tab => tab.id !== "ai").map(({ id, label, Icon }) => (
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
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            <span className="evo-tab-caption">{label}</span>
          </span>
        </button>
      ))}
      <button type="button" className="evo-a11y-launch" aria-label="Kisegítő lehetőségek" aria-expanded={accessibilityOpen} onClick={() => { setAccessibilityOpen(value => !value); setExpanded(true) }}><Accessibility size={22} strokeWidth={1.8}/></button>
    </nav>
    </LiquidGlassSurface>
    {expanded && accessibilityOpen && <section className="evo-a11y-panel" aria-label="Kisegítő lehetőségek">
      <div className="evo-a11y-heading"><strong>Kisegítő lehetőségek</strong><button type="button" onClick={() => setAccessibilityOpen(false)} aria-label="Bezárás"><X size={18}/></button></div>
      <button type="button" aria-pressed={largeText} onClick={() => setLargeText(value => !value)}><Plus size={18}/> Nagyobb szöveg <span>{largeText ? "Be" : "Ki"}</span></button>
      <button type="button" aria-pressed={highContrast} onClick={() => setHighContrast(value => !value)}><Contrast size={18}/> Erősebb kontraszt <span>{highContrast ? "Be" : "Ki"}</span></button>
      <button type="button" aria-pressed={reduceMotion} onClick={() => setReduceMotion(value => !value)}><Eye size={18}/> Kevesebb animáció <span>{reduceMotion ? "Be" : "Ki"}</span></button>
    </section>}
    </>
  )
}
