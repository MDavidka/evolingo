"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, Folder, Grid2X2, UserRound, type LucideIcon } from "lucide-react"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile"

const tabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "learn", label: "Tanulás", icon: BookOpen },
  { id: "ai", label: "AI", icon: BookOpen },
  { id: "files", label: "Fájlok", icon: Folder },
  { id: "tools", label: "Eszközök", icon: Grid2X2 },
  { id: "profile", label: "Profil", icon: UserRound },
]

type Props = {
  activeTab: AppTab
  onSelect: (tab: AppTab) => void
  avatarImage: string
  userName: string
}

export default function AppTabBar({ activeTab, onSelect, avatarImage, userName }: Props) {
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleCollapse = () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setExpanded(false), 3500)
  }
  const openRail = () => {
    setExpanded(true)
    scheduleCollapse()
  }
  useEffect(() => () => { if (collapseTimer.current) clearTimeout(collapseTimer.current) }, [])
  return <>
    <style>{`
      .evo-tabbar.evo-glass-rail {
        position: fixed !important;
        left: auto !important;
        right: max(calc((100vw - 520px) / 2 + 17px), calc(env(safe-area-inset-right, 0px) + 17px)) !important;
        top: calc(env(safe-area-inset-top, 0px) + 94px) !important;
        bottom: auto !important;
        transform: none !important;
        width: 48px !important;
        height: min(310px, 39dvh) !important;
        min-height: 240px !important;
        max-height: 370px !important;
        padding: 7px 4px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 2px !important;
        border-radius: 999px !important;
        background: rgba(211, 219, 230, .44) !important;
        border: 1px solid rgba(255,255,255,.65) !important;
        box-shadow: 0 12px 36px rgba(25,39,60,.12), inset 0 1px 1px rgba(255,255,255,.7) !important;
        -webkit-backdrop-filter: blur(26px) saturate(145%);
        backdrop-filter: blur(26px) saturate(145%);
        z-index: 80;
      }
      .evo-glass-rail.is-compact { width: 48px !important; }
      .evo-glass-rail.is-compact .evo-tab { width: 100% !important; height: 100% !important; border-radius: 999px !important; }
      .evo-glass-rail.is-compact .evo-tab-content { justify-content: flex-start !important; padding-top: 35px; }
      .evo-glass-rail.is-compact .evo-tab-caption { display: none !important; }
      .evo-glass-rail.is-compact .evo-tab.is-active { background: transparent !important; box-shadow: none !important; }
      .evo-glass-rail.is-compact .evo-tab.is-active::before { content: "" !important; display: none !important; }
      .evo-glass-rail.is-compact .evo-tab-content > img,
      .evo-glass-rail.is-compact .evo-tab-content > svg { width: 29px !important; height: 29px !important; padding: 5px !important; border-radius: 50% !important; background: rgba(255,255,255,.74) !important; box-sizing: content-box !important; box-shadow: 0 3px 12px rgba(36,51,76,.09); }
      .evo-glass-rail.is-expanded { justify-content: space-evenly !important; }
      .evo-glass-rail.is-expanded .evo-tab { flex: 1 1 0 !important; height: auto !important; max-height: 62px !important; }
      .evo-glass-rail.is-expanded .evo-tab.is-active::before { opacity: 0 !important; }
      .evo-glass-rail .evo-tab {
        width: 38px !important;
        height: 43px !important;
        min-width: 0 !important;
        min-height: 0 !important;
        flex: none !important;
        padding: 4px 0 !important;
        border-radius: 22px !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #444d5a !important;
      }
      .evo-glass-rail .evo-tab.is-active {
        background: rgba(255,255,255,.68) !important;
        box-shadow: 0 2px 9px rgba(35,48,69,.09) !important;
        color: #171c25 !important;
      }
      .evo-glass-rail .evo-tab-content {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 3px !important;
        width: 100% !important;
        height: 100% !important;
      }
      .evo-glass-rail .evo-tab-caption { font-size: 8px !important; line-height: 12px !important; font-weight: 600 !important; white-space: nowrap; }
      .evo-glass-rail .evo-tab-avatar { width: 21px !important; height: 21px !important; border-radius: 50% !important; object-fit: cover; }
      .evo-glass-rail .evo-tab:focus-visible { outline: 2px solid #3277e6 !important; outline-offset: 2px; }
      @media (max-height: 620px) {
        .evo-tabbar.evo-glass-rail { height: min(270px, 55dvh) !important; min-height: 206px !important; }
        .evo-glass-rail .evo-tab-caption { display: none !important; }
        .evo-glass-rail.is-compact .evo-tab-content { padding-top: 23px; }
      }
      @media (prefers-reduced-motion: no-preference) {
        .evo-glass-rail .evo-tab { transition: background .2s ease, transform .2s ease !important; }
        .evo-glass-rail .evo-tab:active { transform: scale(.94); }
      }
    `}</style>
    <nav className={`evo-tabbar evo-glass-rail ${expanded ? "is-expanded" : "is-compact"}`} aria-label="Fő navigáció" onPointerEnter={event => { if (event.pointerType === "mouse") openRail() }} onPointerLeave={event => { if (event.pointerType === "mouse") scheduleCollapse() }} onFocus={openRail}>
      {(expanded ? tabs : tabs.filter(tab => tab.id === activeTab)).map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return <button
          type="button"
          key={id}
          className={active ? "evo-tab is-active" : "evo-tab"}
          aria-current={active ? "page" : undefined}
          aria-label={!expanded ? "Navigáció megnyitása" : id === "profile" ? `Profil: ${userName}` : label}
          onClick={() => { if (!expanded) openRail(); else { onSelect(id); scheduleCollapse() } }}
        >
          <span className="evo-tab-content">
            {id === "profile" && avatarImage
              ? <img className="evo-tab-avatar" src={avatarImage} alt="" />
              : id === "ai" ? <img src="/images/evolingo-ai-orb.svg" alt="" style={{ width: 21, height: 21, borderRadius: "50%" }} />
              : <Icon size={19} strokeWidth={1.8} aria-hidden="true" />}
            <span className="evo-tab-caption">{label}</span>
          </span>
        </button>
      })}
    </nav>
  </>
}
