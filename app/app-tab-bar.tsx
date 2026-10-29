"use client"

import { BookOpen, Folder, Grid2X2, Sparkles, UserRound, type LucideIcon } from "lucide-react"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile"

const tabs: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "learn", label: "Tanulás", icon: BookOpen },
  { id: "ai", label: "AI", icon: Sparkles },
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
  return <nav className="evo-tabbar" aria-label="Fő navigáció">
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
            : <Icon size={23} strokeWidth={1.85} aria-hidden="true" />}
          <span className="evo-tab-caption">{label}</span>
        </span>
      </button>
    })}
  </nav>
}
