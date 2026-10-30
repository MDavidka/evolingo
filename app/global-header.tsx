"use client"

import { useEffect, useState } from "react"
import { PanelLeft, X, BookOpen, MessageCircle, Folder, Wrench, UserRound } from "lucide-react"
import "./global-header.css"

type Destination = "home" | "chat" | "space" | "utility" | "profile"

export default function GlobalHeader({ name, avatarImage, avatarFallback, onNavigate, title }: {
  name: string
  avatarImage: string
  avatarFallback: string
  onNavigate: (view: Destination) => void
  title?: string
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])
  const navigate = (destination: Destination) => { setOpen(false); onNavigate(destination) }
  return <>
    <header className="evo-global-header">
      <button type="button" className="evo-global-action" aria-label="Oldalsáv megnyitása" aria-expanded={open} aria-controls="evo-global-sidebar" onClick={() => setOpen(true)}>
        <PanelLeft size={21} strokeWidth={1.8} />
      </button>
      <span className="evo-global-title">{title ?? "Evölingo"}</span>
      <button type="button" className="evo-global-action" aria-label="Profil megnyitása" onClick={() => navigate("profile")}>
        <span className="evo-global-avatar">{avatarImage ? <img src={avatarImage} alt="" /> : avatarFallback ? <img src={avatarFallback} alt="" /> : <UserRound size={20} />}</span>
      </button>
    </header>
    {open && <div className="evo-global-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <nav id="evo-global-sidebar" className="evo-global-drawer" aria-label="Fő navigáció">
        <div className="evo-global-drawer-head"><strong>Evölingo</strong><button className="evo-global-action" onClick={() => setOpen(false)} aria-label="Oldalsáv bezárása"><X size={21} /></button></div>
        {([
          ["home", "Tanulás", BookOpen],
          ["chat", "AI Chat", MessageCircle],
          ["space", "Fájlok", Folder],
          ["utility", "Eszközök", Wrench],
          ["profile", "Profil", UserRound],
        ] as const).map(([destination, label, Icon]) => <button key={destination} type="button" className="evo-global-nav-item" onClick={() => navigate(destination)}><Icon size={20} strokeWidth={1.8} /><span>{label}</span></button>)}
      </nav>
    </div>}
  </>
}
