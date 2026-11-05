"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import {
  PanelLeft as SidebarSimpleIcon, Plus as PlusIcon, Ellipsis as DotsThreeIcon,
  Pencil as PencilSimpleIcon, Trash2 as TrashIcon, Search as MagnifyingGlassIcon,
  CalendarDays as ScheduleIcon, FolderOpen as FoldersIcon, LayoutGrid as PuzzlePieceIcon,
  Lightbulb as LightbulbIcon, SquarePen as NotePencilIcon, ChevronRight,
} from "lucide-react"
import { deleteChatSession, notifyChatSessionAction, readChatSessions, renameChatSession, type ChatSession } from "./chat-sessions"

export type AppTab = "ai" | "schedule" | "files" | "tools" | "profile" | "brainstorm"
type Props = { activeTab: AppTab; onSelect: (tab: AppTab) => void; avatarImage: string; avatar: string; userName: string; stars?: number; streak?: number; onOpenLeaderboard?: () => void }

const quickLinks = [
  { label: "Ütemezés", Icon: ScheduleIcon, target: "schedule" },
  { label: "Könyvtár", Icon: FoldersIcon, target: "files" },
  { label: "Eszközök", Icon: PuzzlePieceIcon, target: "tools" },
  { label: "Ötletbörze", Icon: LightbulbIcon, target: "brainstorm" },
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
  const [desktop, setDesktop] = useState(false)
  const [renderSidebar, setRenderSidebar] = useState(false)
  const [chats, setChats] = useState<ChatSession[]>([])
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const trigger = useRef<HTMLButtonElement>(null)
  const savedPageScroll = useRef(0)
  const dialog = useRef<HTMLElement>(null)
  const swipeStart = useRef<{ x: number; y: number; targetInPanel: boolean } | null>(null)
  const openRef = useRef(open)
  openRef.current = open

  const refresh = useCallback(() => setChats(readChatSessions()), [])
  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (window.matchMedia("(min-width: 1024px)").matches) { try { localStorage.setItem("evolingo.sidebar.desktop.v1", "closed") } catch {} }
    setMenuFor(null)
    document.body.style.overflow = ""
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }, [])
  const show = useCallback(() => {
    document.querySelector<HTMLTextAreaElement>(".ref-view-chat textarea")?.blur()
    // Témák and other long pages must reveal the same full-height foreground.
    // Preserve their scroll position and restore it only after the drawer closes.
    if (window.matchMedia("(max-width: 767px)").matches) {
      savedPageScroll.current = window.scrollY
      if (savedPageScroll.current > 0) window.scrollTo(0, 0)
    }
    setRenderSidebar(true)
    setOpen(true)
    if (window.matchMedia("(min-width: 1024px)").matches) { try { localStorage.setItem("evolingo.sidebar.desktop.v1", "open") } catch {} }
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)")
    const sync = () => {
      setDesktop(media.matches)
      if (media.matches) {
        let enabled = true
        try { enabled = localStorage.getItem("evolingo.sidebar.desktop.v1") !== "closed" } catch {}
        setOpen(enabled); setRenderSidebar(enabled)
      } else { setOpen(false); setRenderSidebar(false) }
    }
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("evo-desktop-sidebar-open", desktop && open)
    return () => document.documentElement.classList.remove("evo-desktop-sidebar-open")
  }, [desktop, open])

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
      if (openRef.current && !inside && !target.closest(".evo-sidebar-backdrop")) return
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
      else if (openRef.current && dx < 0) close()
    }
    const onTouchCancel = () => { swipeStart.current = null }
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && openRef.current) close() }
    // The white top sheet is a full-width screen above the secondary menu.
    // Dismiss on tap without activating links/buttons on the covered page.
    const onForegroundClick = (event: MouseEvent) => {
      if (!openRef.current || !window.matchMedia("(max-width: 767px)").matches) return
      const target = event.target
      if (!(target instanceof Element) || !target.closest(".app-shell")) return
      event.preventDefault()
      event.stopPropagation()
      close(false)
    }
    window.addEventListener("evolingo:chat-history-updated", onHistory)
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    document.addEventListener("touchcancel", onTouchCancel, { passive: true })
    document.addEventListener("keydown", onEscape)
    document.addEventListener("click", onForegroundClick, true)
    return () => {
      window.removeEventListener("evolingo:chat-history-updated", onHistory)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
      document.removeEventListener("touchcancel", onTouchCancel)
      document.removeEventListener("keydown", onEscape)
      document.removeEventListener("click", onForegroundClick, true)
      document.body.style.overflow = ""
    }
  }, [close, refresh, show])

  useEffect(() => {
    if (open && !desktop) {
      document.body.style.overflow = "hidden"
      requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>("button")?.focus())
    }
  }, [open, desktop])

  // Keep the underlying navigation mounted until the foreground sheet has
  // completed its return animation; remove both classes on unmount.
  useEffect(() => {
    document.documentElement.classList.toggle("evo-sidebar-layer-open", open)
    return () => document.documentElement.classList.remove("evo-sidebar-layer-open")
  }, [open])

  // iOS PWA (statusBarStyle "default"): the native strip around the Dynamic
  // Island is painted from <meta name="theme-color">, not from page CSS, so it
  // must follow the sidebar state explicitly. Open: the sidebar's own
  // background. Closed: restore the page's original theme colour.
  useEffect(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
    if (!metas.length) {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.content = "#ffffff"
      document.head.appendChild(meta)
      metas.push(meta)
    }
    metas.forEach(meta => { if (meta.dataset.evoBase === undefined) meta.dataset.evoBase = meta.content })
    const restore = () => metas.forEach(meta => { meta.content = meta.dataset.evoBase || "#ffffff" })
    if (!open) { restore(); return }
    const sidebar = dialog.current
    const bg = sidebar ? getComputedStyle(sidebar).backgroundColor : ""
    const color = bg && bg !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(bg) ? bg : "#ffffff"
    metas.forEach(meta => { meta.content = color })
    return restore
  }, [open, renderSidebar])

  useEffect(() => {
    document.documentElement.classList.toggle("evo-sidebar-layer-active", renderSidebar)
    const timer = renderSidebar && !open
      ? window.setTimeout(() => setRenderSidebar(false), 380)
      : undefined
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      document.documentElement.classList.remove("evo-sidebar-layer-active")
    }
  }, [open, renderSidebar])

  useEffect(() => {
    if (!open && !renderSidebar && savedPageScroll.current > 0) {
      const position = savedPageScroll.current
      savedPageScroll.current = 0
      requestAnimationFrame(() => window.scrollTo(0, position))
    }
  }, [open, renderSidebar])

  const trapFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (desktop || event.key !== "Tab" || !dialog.current) return
    const items = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const select = (tab: AppTab) => { savedPageScroll.current = 0; onSelect(tab); if (!desktop) close(false); else setMenuFor(null) }
  const startNew = () => { notifyChatSessionAction("new"); select("ai") }
  const openChat = (id: string) => { notifyChatSessionAction("open", id); select("ai") }
  const onProfile = () => select("profile")
  const grouped = ["Ma", "Tegnap", "Korábban"].map(group => ({ group, items: chats.filter(chat => dateGroup(chat.updatedAt) === group) })).filter(group => group.items.length)
  const visibleChats = grouped.map(group => ({ ...group, items: group.items.filter(chat => !query.trim() || chat.title.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu"))) })).filter(group => group.items.length)
  const usernameInitials = userName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("hu") || "EV"

  return <div className="evo-sidebar-host">
    <button type="button" className="evo-global-profile-button" onClick={onProfile} aria-label={`${userName} profilja`} aria-current={activeTab === "profile" ? "page" : undefined}>{avatarImage ? <img src={avatarImage} alt="" /> : <span className="evo-profile-initials">{usernameInitials}</span>}</button>
    <div className={`evo-morph-anchor ${open ? "is-sidebar-open" : ""}`}>
      <button ref={trigger} type="button" className="evo-morph-toggle" aria-label={open ? "Menü bezárása" : "Menü megnyitása"} aria-expanded={open} aria-controls="evo-global-sidebar" onClick={() => open ? close() : show()}><SidebarSimpleIcon size={24} aria-hidden="true" /></button>
    </div>
    {renderSidebar && <>
      <button className={`evo-sidebar-backdrop ${open ? "" : "is-closing"}`} type="button" aria-label="Menü bezárása" onClick={() => close()} />
      <aside id="evo-global-sidebar" ref={dialog} className={`evo-sidebar ${open ? "" : "is-closing"}`} role={desktop ? "complementary" : "dialog"} aria-modal={desktop ? undefined : open} aria-hidden={!open} aria-label="Menü" onKeyDown={trapFocus} >
        <div className="evo-sidebar-safe">
          <div className="evo-sidebar-heading">
            <button className="evo-sidebar-brand evo-sidebar-brand-action" type="button" onClick={() => close()} aria-label="Menü bezárása">Evölingo</button>
            <div className="evo-sidebar-tools"><button type="button" className="evo-sidebar-tool" aria-label="Beszélgetések keresése" aria-expanded={searchOpen} onClick={() => { setSearchOpen(value => !value); setQuery("") }}><MagnifyingGlassIcon size={21} /></button></div>
          </div>
          <div className="evo-sidebar-new-chat"><button type="button" className="evo-sidebar-chat-action" onClick={startNew}><NotePencilIcon size={20} /> Új beszélgetés</button></div>
          <nav className="evo-sidebar-nav" aria-label="Fő navigáció">
            {quickLinks.map(({ label, Icon, target }) => <button key={label} type="button" aria-current={activeTab === target ? "page" : undefined} onClick={() => select(target)}><Icon size={22} /><span>{label}</span></button>)}
          </nav>
          <div className="evo-sidebar-recent-heading"><span>Legutóbbiak</span><button type="button" aria-label="Új beszélgetés" onClick={startNew}><PlusIcon size={19} /></button></div>
          {searchOpen && <label className="evo-sidebar-search"><MagnifyingGlassIcon size={16} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Keresés a beszélgetésekben" /></label>}
          <div className="evo-sidebar-history">
            {visibleChats.length ? visibleChats.map(({ group, items }) => <section key={group}><h3>{group}</h3>{items.map(chat => <div className="evo-sidebar-chat" key={chat.id}>
              <button type="button" className="evo-sidebar-chat-title" onClick={() => openChat(chat.id)} title={chat.title}>{chat.title}</button>
              <button type="button" className="evo-sidebar-chat-menu" aria-label={`${chat.title} műveletei`} aria-expanded={menuFor === chat.id} onClick={() => setMenuFor(menuFor === chat.id ? null : chat.id)}><DotsThreeIcon size={20} /></button>
              {menuFor === chat.id && <div className="evo-sidebar-chat-actions"><button type="button" onClick={() => { const title = window.prompt("Beszélgetés átnevezése", chat.title); if (title !== null) renameChatSession(chat.id, title); setMenuFor(null) }}><PencilSimpleIcon size={15} /> Átnevezés</button><button type="button" onClick={() => { deleteChatSession(chat.id); setMenuFor(null) }}><TrashIcon size={15} /> Törlés</button></div>}
            </div>)}</section>) : <p className="evo-sidebar-empty">{query ? "Nincs ilyen beszélgetés." : "A beszélgetéseid itt jelennek meg."}</p>}
          </div>
          <div className="evo-sidebar-footer"><button type="button" className="evo-sidebar-account" onClick={onProfile}>{avatarImage ? <img src={avatarImage} alt="" /> : <span className="evo-profile-initials">{usernameInitials}</span>}<span className="evo-sidebar-account-name">{userName}</span><ChevronRight size={17} /></button></div>
        </div>
      </aside>
    </>}
  </div>
}
