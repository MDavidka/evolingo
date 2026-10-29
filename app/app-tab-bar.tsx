"use client"

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
  return <>
    <style>{`
      .evo-tabbar.evo-glass-rail {
        position: fixed !important;
        left: auto !important;
        right: max(10px, env(safe-area-inset-right, 0px)) !important;
        top: 50% !important;
        bottom: auto !important;
        transform: translateY(-50%) !important;
        width: 64px !important;
        height: auto !important;
        max-height: min(440px, 72dvh) !important;
        padding: 10px 6px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 4px !important;
        border-radius: 999px !important;
        background: rgba(211, 219, 230, .44) !important;
        border: 1px solid rgba(255,255,255,.65) !important;
        box-shadow: 0 12px 36px rgba(25,39,60,.12), inset 0 1px 1px rgba(255,255,255,.7) !important;
        -webkit-backdrop-filter: blur(26px) saturate(145%);
        backdrop-filter: blur(26px) saturate(145%);
        z-index: 80;
      }
      .evo-glass-rail .evo-tab {
        width: 50px !important;
        height: 57px !important;
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
      .evo-glass-rail .evo-tab-caption { font-size: 9px !important; line-height: 12px !important; font-weight: 600 !important; white-space: nowrap; }
      .evo-glass-rail .evo-tab-avatar { width: 24px !important; height: 24px !important; border-radius: 50% !important; object-fit: cover; }
      .evo-glass-rail .evo-tab:focus-visible { outline: 2px solid #3277e6 !important; outline-offset: 2px; }
      @media (max-height: 620px) {
        .evo-glass-rail .evo-tab { height: 47px !important; }
        .evo-glass-rail .evo-tab-caption { display: none !important; }
      }
      @media (prefers-reduced-motion: no-preference) {
        .evo-glass-rail .evo-tab { transition: background .2s ease, transform .2s ease !important; }
        .evo-glass-rail .evo-tab:active { transform: scale(.94); }
      }
    `}</style>
    <nav className="evo-tabbar evo-glass-rail" aria-label="Fő navigáció">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return <button
          type="button"
          key={id}
          className={active ? "evo-tab is-active" : "evo-tab"}
          aria-current={active ? "page" : undefined}
          aria-label={id === "profile" ? `Profil: ${userName}` : label}
          onClick={() => onSelect(id)}
        >
          <span className="evo-tab-content">
            {id === "profile" && avatarImage
              ? <img className="evo-tab-avatar" src={avatarImage} alt="" />
              : id === "ai" ? <img src="/images/evolingo-ai-orb.svg" alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />
              : <Icon size={22} strokeWidth={1.8} aria-hidden="true" />}
            <span className="evo-tab-caption">{label}</span>
          </span>
        </button>
      })}
    </nav>
  </>
}
