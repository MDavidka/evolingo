"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent as ReactTouchEvent } from "react"
import { PanelLeft, X, Plus, MoreHorizontal, Pencil, Trash2, Search, Library, FolderKanban, Puzzle, PenSquare, Lightbulb } from "lucide-react"
import { deleteChatSession, notifyChatSessionAction, readChatSessions, renameChatSession, type ChatSession } from "./chat-sessions"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile" | "brainstorm"
type Props = { activeTab: AppTab; onSelect: (tab: AppTab) => void; avatarImage: string; avatar: string; userName: string; stars?: number; streak?: number; onOpenLeaderboard?: () => void }

const quickLinks: { label: string; Icon: typeof Library; target: AppTab }[] = [
  { label: "Könyvtár", Icon: Library, target: "files" }, { label: "Témák", Icon: FolderKanban, target: "learn" },
  { label: "Ötletbörze", Icon: Lightbulb, target: "brainstorm" }, { label: "Eszközök", Icon: Puzzle, target: "tools" },
]

function dateGroup(timestamp: number) {
  const date = new Date(timestamp)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const day = new Date(date); day.setHours(0, 0, 0, 0)
  return day.getTime() === today.getTime() ? "Ma" : day.getTime() === yesterday.getTime() ? "Tegnap" : "Korábban"
}

export default function AppTabBar({ activeTab, onSelect, avatarImage, userName }: Props) {
  const [open, setOpen] = useState(false)
  const [chats, setChats] = useState<ChatSession[]>([])
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const openRef = useRef(open)
  openRef.current = open

  const refresh = useCallback(() => setChats(readChatSessions()), [])
  const close = useCallback(() => { setOpen(false); setMenuFor(null); document.body.style.overflow = ""; requestAnimationFrame(() => trigger.current?.focus()) }, [])
  const show = useCallback(() => {
    document.querySelector<HTMLTextAreaElement>(".ref-view-chat textarea")?.blur()
    setOpen(true)
  }, [])

  useEffect(() => {
    refresh()
    const onHistory = () => refresh()
    const onFocusIn = (event: FocusEvent) => { if ((event.target as HTMLElement | null)?.matches(".ref-view-chat textarea")) close() }
    let startX = 0; let startY = 0
    const onTouchStart = (event: globalThis.TouchEvent) => { const touch = event.touches[0]; startX = touch.clientX; startY = touch.clientY }
    const onTouchEnd = (event: globalThis.TouchEvent) => {
      const touch = event.changedTouches[0]; const dx = touch.clientX - startX; const dy = touch.clientY - startY
      if (Math.abs(dy) > 80) return
      if (!openRef.current && startX <= 20 && dx >= 60) show()
      else if (openRef.current && dx <= -60) close()
    }
    const onPointerStart = (event: PointerEvent) => { touchStart.current = { x: event.clientX, y: event.clientY } }
    const onPointerEnd = (event: PointerEvent) => {
      const start = touchStart.current; touchStart.current = null
      if (!start || Math.abs(event.clientY - start.y) > 80) return
      const dx = event.clientX - start.x
      if (!openRef.current && start.x <= 20 && dx >= 60) show()
      else if (openRef.current && dx <= -60) close()
    }
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && openRef.current) close() }
    window.addEventListener("evolingo:chat-history-updated", onHistory)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    document.addEventListener("pointerdown", onPointerStart)
    document.addEventListener("pointerup", onPointerEnd)
    document.addEventListener("keydown", onEscape)
    return () => {
      window.removeEventListener("evolingo:chat-history-updated", onHistory)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
      document.removeEventListener("pointerdown", onPointerStart)
      document.removeEventListener("pointerup", onPointerEnd)
      document.removeEventListener("keydown", onEscape)
      document.body.style.overflow = ""
    }
  }, [close, refresh, show])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>("button")?.focus())
    }
  }, [open])

  const trapFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !dialog.current) return
    const items = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const select = (tab: AppTab) => { onSelect(tab); close() }
  const startNew = () => { notifyChatSessionAction("new"); select("ai") }
  const openChat = (id: string) => { notifyChatSessionAction("open", id); select("ai") }
  const onProfile = () => select("profile")
  const grouped = ["Ma", "Tegnap", "Korábban"].map(group => ({ group, items: chats.filter(chat => dateGroup(chat.updatedAt) === group) })).filter(group => group.items.length)
  const visibleChats = grouped.map(group => ({ ...group, items: group.items.filter(chat => !query.trim() || chat.title.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu"))) })).filter(group => group.items.length)
  const usernameInitials = userName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("hu") || "EV"

  return <div className="evo-sidebar-host">\n    {activeTab !== "profile" && <button type="button" className="evo-global-profile-button" onClick={onProfile} aria-label={`${userName} profilja`}>{avatarImage ? <img src={avatarImage} alt="" /> : <span>{usernameInitials}</span>}</button>}
    <div className={`evo-morph-anchor ${open ? "is-sidebar-open" : ""}`}>
      <button ref={trigger} type="button" className="evo-morph-toggle" aria-label={open ? "Menü bezárása" : "Menü megnyitása"} aria-expanded={open} onClick={() => open ? close() : show()}><PanelLeft size={22} /></button>
    </div>
    {open && <>
      <button className="evo-sidebar-backdrop" type="button" aria-label="Menü bezárása" onClick={close} />
      <aside ref={dialog} className="evo-sidebar" role="dialog" aria-modal="true" aria-label="Menü" onKeyDown={trapFocus} onTouchStart={(event: ReactTouchEvent<HTMLElement>) => { const point = event.touches[0]; touchStart.current = { x: point.clientX, y: point.clientY } }} onTouchEnd={(event: ReactTouchEvent<HTMLElement>) => { const point = event.changedTouches[0]; const start = touchStart.current; touchStart.current = null; if (start && point.clientX - start.x <= -60 && Math.abs(point.clientY - start.y) < 80) close() }}>
        <div className="evo-sidebar-safe">
          <div className="evo-sidebar-heading">
            <strong className="evo-sidebar-brand">Evölingo</strong>
            <div className="evo-sidebar-tools"><button type="button" className="evo-sidebar-tool" aria-label="Beszélgetések keresése" aria-expanded={searchOpen} onClick={() => { setSearchOpen(value => !value); setQuery("") }}><Search size={21} /></button><button type="button" className="evo-sidebar-tool evo-sidebar-close" onClick={close} aria-label="Menü bezárása"><X size={20} /></button></div>
          </div>
          <nav className="evo-sidebar-nav" aria-label="Fő navigáció">
            {quickLinks.map(({ label, Icon, target }) => <button key={label} type="button" aria-current={activeTab === target ? "page" : undefined} onClick={() => select(target)}><Icon size={22} strokeWidth={1.75} /><span>{label}</span></button>)}
          </nav>
          <div className="evo-sidebar-recent-heading"><span>Legutóbbiak</span><button type="button" aria-label="Új beszélgetés" onClick={startNew}><Plus size={19} /></button></div>
          {searchOpen && <label className="evo-sidebar-search"><Search size={16} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Keresés a beszélgetésekben" /></label>}
          <div className="evo-sidebar-history">
            {visibleChats.length ? visibleChats.map(({ group, items }) => <section key={group}><h3>{group}</h3>{items.map(chat => <div className="evo-sidebar-chat" key={chat.id}>
              <button type="button" className="evo-sidebar-chat-title" onClick={() => openChat(chat.id)} title={chat.title}>{chat.title}</button>
              <button type="button" className="evo-sidebar-chat-menu" aria-label={`${chat.title} műveletei`} aria-expanded={menuFor === chat.id} onClick={() => setMenuFor(menuFor === chat.id ? null : chat.id)}><MoreHorizontal size={18} /></button>
              {menuFor === chat.id && <div className="evo-sidebar-chat-actions"><button type="button" onClick={() => { const title = window.prompt("Beszélgetés átnevezése", chat.title); if (title !== null) renameChatSession(chat.id, title); setMenuFor(null) }}><Pencil size={14} /> Átnevezés</button><button type="button" onClick={() => { deleteChatSession(chat.id); setMenuFor(null) }}><Trash2 size={14} /> Törlés</button></div>}
            </div>)}</section>) : <p className="evo-sidebar-empty">{query ? "Nincs ilyen beszélgetés." : "A beszélgetéseid itt jelennek meg."}</p>}
          </div>
          <div className="evo-sidebar-footer"><button type="button" className="evo-sidebar-chat-action" onClick={startNew}><PenSquare size={20} /> Chat</button><button type="button" className="evo-sidebar-user-button" aria-label={`Profil: ${userName}`} onClick={onProfile}>{avatarImage ? <img src={avatarImage} alt="" /> : <span>{usernameInitials}</span>}</button></div>
        </div>
      </aside>
    </>}
  </div>
}
