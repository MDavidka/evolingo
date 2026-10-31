"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { mage } from "./mage-icons"
const SidebarSimpleIcon = mage("dash-menu")
const XIcon = mage("x")
const PlusIcon = mage("plus")
const DotsThreeIcon = mage("dots-horizontal")
const PencilSimpleIcon = mage("edit-pen")
const TrashIcon = mage("trash")
const MagnifyingGlassIcon = mage("search")
const BooksIcon = mage("book-text")
const FoldersIcon = mage("folder")
const PuzzlePieceIcon = mage("dashboard-4")
const LightbulbIcon = mage("light-bulb")
const ChatCircleDotsIcon = mage("message-dots-round")
const NotePencilIcon = mage("note-text")
const UserCircleIcon = mage("user-circle")

import { deleteChatSession, notifyChatSessionAction, readChatSessions, renameChatSession, type ChatSession } from "./chat-sessions"

export type AppTab = "learn" | "ai" | "files" | "tools" | "profile" | "brainstorm"
type Props = { activeTab: AppTab; onSelect: (tab: AppTab) => void; avatarImage: string; avatar: string; userName: string; stars?: number; streak?: number; onOpenLeaderboard?: () => void }

const quickLinks = [
  { label: "AI chat", Icon: ChatCircleDotsIcon, target: "ai" },
  { label: "Témák", Icon: BooksIcon, target: "learn" },
  { label: "Könyvtár", Icon: FoldersIcon, target: "files" },
  { label: "Eszközök", Icon: PuzzlePieceIcon, target: "tools" },
  { label: "Ötletbörze", Icon: LightbulbIcon, target: "brainstorm" },
  { label: "Profil", Icon: UserCircleIcon, target: "profile" },
] as const

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
  const swipeStart = useRef<{ x: number; y: number; targetInPanel: boolean } | null>(null)
  const openRef = useRef(open)
  openRef.current = open

  const refresh = useCallback(() => setChats(readChatSessions()), [])
  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    setMenuFor(null)
    document.body.style.overflow = ""
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }, [])
  const show = useCallback(() => {
    document.querySelector<HTMLTextAreaElement>(".ref-view-chat textarea")?.blur()
    setOpen(true)
  }, [])

  useEffect(() => {
    refresh()
    const onHistory = () => refresh()
    const onFocusIn = (event: FocusEvent) => { if (openRef.current && (event.target as HTMLElement | null)?.matches(".ref-view-chat textarea")) close(false) }
    // iOS-friendly sidebar gestures: reserve the 0–23px OS back-swipe area,
    // only open from the left header zone and close by dragging the drawer left.
    const onTouchStart = (event: globalThis.TouchEvent) => {
      swipeStart.current = null
      if (event.touches.length !== 1) return
      const target = event.target
      if (!(target instanceof Element) ||
          target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], .evo-chat-composer, .library-sheet, .evo-chat-sheet')) return
      const touch = event.touches[0]
      const inside = !!target.closest(".evo-sidebar")
      if (!openRef.current && (touch.clientX < 24 || touch.clientX > 100)) return
      if (openRef.current && !inside) return
      swipeStart.current = { x: touch.clientX, y: touch.clientY, targetInPanel: inside }
    }
    const onTouchEnd = (event: globalThis.TouchEvent) => {
      const start = swipeStart.current
      swipeStart.current = null
      if (!start || !event.changedTouches.length) return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.abs(dy) > 55 || Math.abs(dx) < 75 || Math.abs(dx) < Math.abs(dy) * 1.6) return
      if (!openRef.current && dx > 0) show()
      else if (openRef.current && start.targetInPanel && dx < 0) close()
    }
    const onTouchCancel = () => { swipeStart.current = null }
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && openRef.current) close() }
    window.addEventListener("evolingo:chat-history-updated", onHistory)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    document.addEventListener("touchcancel", onTouchCancel, { passive: true })
    document.addEventListener("keydown", onEscape)
    return () => {
      window.removeEventListener("evolingo:chat-history-updated", onHistory)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
      document.removeEventListener("touchcancel", onTouchCancel)
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

  const select = (tab: AppTab) => { onSelect(tab); close(false) }
  const startNew = () => { notifyChatSessionAction("new"); select("ai") }
  const openChat = (id: string) => { notifyChatSessionAction("open", id); select("ai") }
  const onProfile = () => select("profile")
  const grouped = ["Ma", "Tegnap", "Korábban"].map(group => ({ group, items: chats.filter(chat => dateGroup(chat.updatedAt) === group) })).filter(group => group.items.length)
  const visibleChats = grouped.map(group => ({ ...group, items: group.items.filter(chat => !query.trim() || chat.title.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu"))) })).filter(group => group.items.length)
  const usernameInitials = userName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("hu") || "EV"

  return <div className="evo-sidebar-host">
    <button type="button" className="evo-global-profile-button" onClick={onProfile} aria-label={`${userName} profilja`} aria-current={activeTab === "profile" ? "page" : undefined}>{avatarImage ? <img src={avatarImage} alt="" /> : <span className="evo-profile-initials">{usernameInitials}</span>}</button>
    <div className={`evo-morph-anchor ${open ? "is-sidebar-open" : ""}`}>
      <button ref={trigger} type="button" className="evo-morph-toggle" aria-label={open ? "Menü bezárása" : "Menü megnyitása"} aria-expanded={open} onClick={() => open ? close() : show()}><SidebarSimpleIcon size={24} weight="regular" aria-hidden="true" /></button>
    </div>
    {open && <>
      <button className="evo-sidebar-backdrop" type="button" aria-label="Menü bezárása" onClick={() => close()} />
      <aside ref={dialog} className="evo-sidebar" role="dialog" aria-modal="true" aria-label="Menü" onKeyDown={trapFocus} >
        <div className="evo-sidebar-safe">
          <div className="evo-sidebar-heading">
            <strong className="evo-sidebar-brand">Evölingo</strong>
            <div className="evo-sidebar-tools"><button type="button" className="evo-sidebar-tool" aria-label="Beszélgetések keresése" aria-expanded={searchOpen} onClick={() => { setSearchOpen(value => !value); setQuery("") }}><MagnifyingGlassIcon size={21} weight="regular" /></button><button type="button" className="evo-sidebar-tool evo-sidebar-close" onClick={() => close()} aria-label="Menü bezárása"><XIcon size={20} weight="regular" /></button></div>
          </div>
          <nav className="evo-sidebar-nav" aria-label="Fő navigáció">
            {quickLinks.map(({ label, Icon, target }) => <button key={label} type="button" aria-current={activeTab === target ? "page" : undefined} onClick={() => select(target)}><Icon size={22} weight="regular" /><span>{label}</span></button>)}
          </nav>
          <div className="evo-sidebar-recent-heading"><span>Legutóbbiak</span><button type="button" aria-label="Új beszélgetés" onClick={startNew}><PlusIcon size={19} weight="regular" /></button></div>
          {searchOpen && <label className="evo-sidebar-search"><MagnifyingGlassIcon size={16} weight="regular" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Keresés a beszélgetésekben" /></label>}
          <div className="evo-sidebar-history">
            {visibleChats.length ? visibleChats.map(({ group, items }) => <section key={group}><h3>{group}</h3>{items.map(chat => <div className="evo-sidebar-chat" key={chat.id}>
              <button type="button" className="evo-sidebar-chat-title" onClick={() => openChat(chat.id)} title={chat.title}>{chat.title}</button>
              <button type="button" className="evo-sidebar-chat-menu" aria-label={`${chat.title} műveletei`} aria-expanded={menuFor === chat.id} onClick={() => setMenuFor(menuFor === chat.id ? null : chat.id)}><DotsThreeIcon size={20} weight="bold" /></button>
              {menuFor === chat.id && <div className="evo-sidebar-chat-actions"><button type="button" onClick={() => { const title = window.prompt("Beszélgetés átnevezése", chat.title); if (title !== null) renameChatSession(chat.id, title); setMenuFor(null) }}><PencilSimpleIcon size={15} weight="regular" /> Átnevezés</button><button type="button" onClick={() => { deleteChatSession(chat.id); setMenuFor(null) }}><TrashIcon size={15} weight="regular" /> Törlés</button></div>}
            </div>)}</section>) : <p className="evo-sidebar-empty">{query ? "Nincs ilyen beszélgetés." : "A beszélgetéseid itt jelennek meg."}</p>}
          </div>
          <div className="evo-sidebar-footer"><button type="button" className="evo-sidebar-chat-action" onClick={startNew}><NotePencilIcon size={20} weight="regular" /> Új beszélgetés</button></div>
        </div>
      </aside>
    </>}
  </div>
}
