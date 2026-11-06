"use client"

import { useMemo, useState } from "react"
import {
  Archive, ArrowLeft, ArrowUp, AudioLines, Bell, BookOpen, Bookmark,
  BrainCircuit, CalendarDays, ChartNoAxesColumn, Check, ChevronLeft,
  CircleHelp, Copy, Download, FileImage, FileSpreadsheet, FileText,
  Flame, Folder, FolderOpen, Globe, GraduationCap, House, Image,
  Languages, Lock, LogOut, Menu, Mic, MoreHorizontal, Palette,
  Paperclip, Pencil, Plus, RefreshCw, Search, Settings, Share2,
  ShieldCheck, Sparkles, SquarePen, Star, Target, Trash2, Trophy,
  UserRound, PanelLeft, type LucideIcon,
} from "lucide-react"
import "./evolingo-icons-demo.css"

type IconItem = { name: string; label: string; Icon: LucideIcon }
type IconGroup = { category: string; icons: IconItem[] }

const groups: IconGroup[] = [
  { category: "Navigation", icons: [
    { name: "panel-left", label: "Sidebar", Icon: PanelLeft },
    { name: "square-pen", label: "New chat", Icon: SquarePen },
    { name: "house", label: "Home", Icon: House },
    { name: "search", label: "Search", Icon: Search },
    { name: "chevron-left", label: "Back", Icon: ChevronLeft },
    { name: "ellipsis", label: "More", Icon: MoreHorizontal },
    { name: "arrow-left", label: "Previous", Icon: ArrowLeft },
    { name: "menu", label: "Menu", Icon: Menu },
  ] },
  { category: "AI & Chat", icons: [
    { name: "plus", label: "Add", Icon: Plus },
    { name: "mic", label: "Microphone", Icon: Mic },
    { name: "audio-lines", label: "Voice", Icon: AudioLines },
    { name: "arrow-up", label: "Send", Icon: ArrowUp },
    { name: "globe", label: "Web", Icon: Globe },
    { name: "brain-circuit", label: "Reasoning", Icon: BrainCircuit },
    { name: "sparkles", label: "AI", Icon: Sparkles },
    { name: "paperclip", label: "Attach", Icon: Paperclip },
  ] },
  { category: "Files & Content", icons: [
    { name: "folder", label: "Folder", Icon: Folder },
    { name: "folder-open", label: "Open folder", Icon: FolderOpen },
    { name: "file-text", label: "Document", Icon: FileText },
    { name: "file-image", label: "Image file", Icon: FileImage },
    { name: "file-spreadsheet", label: "Spreadsheet", Icon: FileSpreadsheet },
    { name: "book-open", label: "Book", Icon: BookOpen },
    { name: "image", label: "Media", Icon: Image },
    { name: "download", label: "Download", Icon: Download },
  ] },
  { category: "Actions", icons: [
    { name: "copy", label: "Copy", Icon: Copy },
    { name: "pencil", label: "Edit", Icon: Pencil },
    { name: "share-2", label: "Share", Icon: Share2 },
    { name: "trash-2", label: "Delete", Icon: Trash2 },
    { name: "archive", label: "Archive", Icon: Archive },
    { name: "bookmark", label: "Save", Icon: Bookmark },
    { name: "refresh-cw", label: "Retry", Icon: RefreshCw },
    { name: "check", label: "Done", Icon: Check },
  ] },
  { category: "System", icons: [
    { name: "settings", label: "Settings", Icon: Settings },
    { name: "bell", label: "Alerts", Icon: Bell },
    { name: "user-round", label: "Profile", Icon: UserRound },
    { name: "palette", label: "Appearance", Icon: Palette },
    { name: "shield-check", label: "Privacy", Icon: ShieldCheck },
    { name: "lock", label: "Lock", Icon: Lock },
    { name: "circle-help", label: "Help", Icon: CircleHelp },
    { name: "log-out", label: "Log out", Icon: LogOut },
  ] },
  { category: "Learning", icons: [
    { name: "graduation-cap", label: "Study", Icon: GraduationCap },
    { name: "calendar-days", label: "Schedule", Icon: CalendarDays },
    { name: "languages", label: "Language", Icon: Languages },
    { name: "trophy", label: "Leaderboard", Icon: Trophy },
    { name: "flame", label: "Streak", Icon: Flame },
    { name: "star", label: "Stars", Icon: Star },
    { name: "target", label: "Goals", Icon: Target },
    { name: "chart-no-axes-column", label: "Progress", Icon: ChartNoAxesColumn },
  ] },
]

const colors = [
  { label: "Graphite", value: "#202124" },
  { label: "Secondary", value: "#8E8E93" },
  { label: "iOS blue", value: "#007AFF" },
  { label: "Evolingo", value: "#FF7A00" },
] as const

export default function IconsShowcase() {
  const [category, setCategory] = useState("All")
  const [query, setQuery] = useState("")
  const [size, setSize] = useState(20)
  const [stroke, setStroke] = useState(1.75)
  const [color, setColor] = useState("#202124")
  const [copyResult, setCopyResult] = useState("")

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return groups
      .filter((group) => category === "All" || category === group.category)
      .map((group) => ({
        ...group,
        icons: group.icons.filter((item) => (
          !needle || [item.name, item.label, group.category].some((text) => text.toLowerCase().includes(needle))
        )),
      }))
      .filter((group) => group.icons.length > 0)
  }, [category, query])

  const visibleCount = visibleGroups.reduce((total, group) => total + group.icons.length, 0)

  const copyIconName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name)
      setCopyResult(name)
    } catch {
      setCopyResult("unavailable")
    }
  }

  return (
    <div className="evo-icons-showcase">
      <div className="evo-icons-showcase__intro">
        <span className="evo-icons-showcase__eyebrow">ICON LIBRARY · LUCIDE</span>
        <h3>Apple Neutral icons</h3>
        <p>Monochrome, optically balanced icons for iOS-style navigation and ChatGPT-inspired interfaces. Tap an icon to copy its Lucide name.</p>
      </div>

      <label className="evo-icons-showcase__search">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">Search icons</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icons..." type="search" autoComplete="off" />
      </label>

      <div className="evo-icons-showcase__filters" role="group" aria-label="Icon category">
        {["All", ...groups.map((group) => group.category)].map((item) => (
          <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>

      <div className="evo-icons-showcase__count" aria-live="polite">
        <span>{visibleCount} of 48 icons</span>
        {copyResult && <span className="evo-icons-showcase__feedback" role="status">{copyResult === "unavailable" ? "Copy unavailable" : "Copied: " + copyResult}</span>}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="evo-icons-showcase__empty">No matching icons. Try another search.</p>
      ) : visibleGroups.map((group) => (
        <section key={group.category} className="evo-icons-showcase__group">
          <div className="evo-icons-showcase__group-heading"><h4>{group.category}</h4><span>{group.icons.length}</span></div>
          <div className="evo-icons-showcase__grid">
            {group.icons.map(({ name, label, Icon }) => (
              <button className="evo-icons-showcase__tile" type="button" key={name} title={"Copy icon name: " + name}
                aria-label={"Copy " + label + " icon name (" + name + ")"}
                onClick={() => { void copyIconName(name) }}>
                <Icon size={21} strokeWidth={1.75} aria-hidden="true" />
                <span>{label}</span>
                <small>{name}</small>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="evo-icons-showcase__group evo-icons-showcase__playground">
        <div className="evo-icons-showcase__group-heading"><h4>Icon playground</h4><span>Live preview</span></div>
        <p className="evo-icons-showcase__hint">Compare icon sizes, stroke weights and Apple Neutral colors.</p>
        <div className="evo-icons-showcase__controls">
          <div className="evo-icons-showcase__control">
            <span>Size</span>
            <div role="group" aria-label="Icon size">
              {[16, 20, 24, 28].map((option) => (
                <button key={option} type="button" aria-pressed={size === option} onClick={() => setSize(option)}>{option}</button>
              ))}
            </div>
          </div>
          <div className="evo-icons-showcase__control">
            <span>Stroke</span>
            <div role="group" aria-label="Icon stroke width">
              {[1.5, 1.75, 2, 2.5].map((option) => (
                <button key={option} type="button" aria-pressed={stroke === option} onClick={() => setStroke(option)}>{option}</button>
              ))}
            </div>
          </div>
          <div className="evo-icons-showcase__control">
            <span>Color</span>
            <div className="evo-icons-showcase__colors" role="group" aria-label="Icon color">
              {colors.map((option) => (
                <button type="button" key={option.value} aria-label={option.label} aria-pressed={color === option.value}
                  title={option.label} style={{ backgroundColor: option.value }}
                  onClick={() => setColor(option.value)}>{color === option.value && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="evo-icons-showcase__example" aria-label="Icon style preview">
          {[PanelLeft, SquarePen, Folder, ArrowUp].map((Icon, index) => <Icon key={index} size={size} strokeWidth={stroke} color={color} aria-hidden="true" />)}
        </div>
        <p className="evo-icons-showcase__spec">{size}px · {stroke}px stroke · {color}</p>
      </section>

      <section className="evo-icons-showcase__group">
        <div className="evo-icons-showcase__group-heading"><h4>Icon button treatments</h4></div>
        <div className="evo-icons-showcase__buttons">
          <div><span className="evo-icons-showcase__button evo-icons-showcase__button--plain"><Plus size={20} /></span><small>Plain</small></div>
          <div><span className="evo-icons-showcase__button evo-icons-showcase__button--soft"><Search size={20} /></span><small>Soft</small></div>
          <div><span className="evo-icons-showcase__button evo-icons-showcase__button--primary"><ArrowUp size={20} /></span><small>Primary</small></div>
          <div><span className="evo-icons-showcase__button evo-icons-showcase__button--outline"><MoreHorizontal size={20} /></span><small>Outline</small></div>
        </div>
      </section>
      <p className="evo-icons-showcase__note">Defaults: 20px icon · 1.75px stroke · 44×44px touch target · transparent icon background. Gallery only; live app icons are unchanged.</p>
    </div>
  )
}
