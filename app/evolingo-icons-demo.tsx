"use client"

import { useMemo, useState } from "react"
import { IconArchive as Archive, IconArrowLeft as ArrowLeft, IconArrowUp as ArrowUp, IconWaveSine as AudioLines, IconBell as Bell, IconBook as BookOpen, IconBookmark as Bookmark, IconBrain as BrainCircuit, IconCalendar as CalendarDays, IconChartBar as ChartNoAxesColumn, IconCheck as Check, IconChevronLeft as ChevronLeft, IconHelpCircle as CircleHelp, IconCopy as Copy, IconDownload as Download, IconFileTypeJpg as FileImage, IconFileSpreadsheet as FileSpreadsheet, IconFileText as FileText, IconFlame as Flame, IconFolder as Folder, IconFolderOpen as FolderOpen, IconWorld as Globe, IconSchool as GraduationCap, IconHome as House, IconPhoto as Image, IconLanguage as Languages, IconLock as Lock, IconLogout as LogOut, IconMenu2 as Menu, IconMicrophone as Mic, IconDots as MoreHorizontal, IconPalette as Palette, IconPaperclip as Paperclip, IconPencil as Pencil, IconPlus as Plus, IconRefresh as RefreshCw, IconSearch as Search, IconSettings as Settings, IconShare as Share2, IconShieldCheck as ShieldCheck, IconSparkles as Sparkles, IconEdit as SquarePen, IconStar as Star, IconTarget as Target, IconTrash as Trash2, IconTrophy as Trophy, IconUser as UserRound, IconLayoutSidebar as PanelLeft, type Icon as TablerIcon } from "@tabler/icons-react"
import "./evolingo-icons-demo.css"

type IconItem = { name: string; label: string; Icon: TablerIcon }
type IconGroup = { category: string; icons: IconItem[] }

const groups: IconGroup[] = [
  { category: "Navigation", icons: [
    { name: "IconLayoutSidebar", label: "Sidebar", Icon: PanelLeft },
    { name: "IconEdit", label: "New chat", Icon: SquarePen },
    { name: "IconHome", label: "Home", Icon: House },
    { name: "IconSearch", label: "Search", Icon: Search },
    { name: "IconChevronLeft", label: "Back", Icon: ChevronLeft },
    { name: "IconDots", label: "More", Icon: MoreHorizontal },
    { name: "IconArrowLeft", label: "Previous", Icon: ArrowLeft },
    { name: "IconMenu2", label: "Menu", Icon: Menu },
  ] },
  { category: "AI & Chat", icons: [
    { name: "IconPlus", label: "Add", Icon: Plus },
    { name: "IconMicrophone", label: "Microphone", Icon: Mic },
    { name: "IconWaveSine", label: "Voice", Icon: AudioLines },
    { name: "IconArrowUp", label: "Send", Icon: ArrowUp },
    { name: "IconWorld", label: "Web", Icon: Globe },
    { name: "IconBrain", label: "Reasoning", Icon: BrainCircuit },
    { name: "IconSparkles", label: "AI", Icon: Sparkles },
    { name: "IconPaperclip", label: "Attach", Icon: Paperclip },
  ] },
  { category: "Files & Content", icons: [
    { name: "IconFolder", label: "Folder", Icon: Folder },
    { name: "IconFolderOpen", label: "Open folder", Icon: FolderOpen },
    { name: "IconFileText", label: "Document", Icon: FileText },
    { name: "IconFileTypeJpg", label: "Image file", Icon: FileImage },
    { name: "IconFileSpreadsheet", label: "Spreadsheet", Icon: FileSpreadsheet },
    { name: "IconBook", label: "Book", Icon: BookOpen },
    { name: "IconPhoto", label: "Media", Icon: Image },
    { name: "IconDownload", label: "Download", Icon: Download },
  ] },
  { category: "Actions", icons: [
    { name: "IconCopy", label: "Copy", Icon: Copy },
    { name: "IconPencil", label: "Edit", Icon: Pencil },
    { name: "IconShare", label: "Share", Icon: Share2 },
    { name: "IconTrash", label: "Delete", Icon: Trash2 },
    { name: "IconArchive", label: "Archive", Icon: Archive },
    { name: "IconBookmark", label: "Save", Icon: Bookmark },
    { name: "IconRefresh", label: "Retry", Icon: RefreshCw },
    { name: "IconCheck", label: "Done", Icon: Check },
  ] },
  { category: "System", icons: [
    { name: "IconSettings", label: "Settings", Icon: Settings },
    { name: "IconBell", label: "Alerts", Icon: Bell },
    { name: "IconUser", label: "Profile", Icon: UserRound },
    { name: "IconPalette", label: "Appearance", Icon: Palette },
    { name: "IconShieldCheck", label: "Privacy", Icon: ShieldCheck },
    { name: "IconLock", label: "Lock", Icon: Lock },
    { name: "IconHelpCircle", label: "Help", Icon: CircleHelp },
    { name: "IconLogout", label: "Log out", Icon: LogOut },
  ] },
  { category: "Learning", icons: [
    { name: "IconSchool", label: "Study", Icon: GraduationCap },
    { name: "IconCalendar", label: "Schedule", Icon: CalendarDays },
    { name: "IconLanguage", label: "Language", Icon: Languages },
    { name: "IconTrophy", label: "Leaderboard", Icon: Trophy },
    { name: "IconFlame", label: "Streak", Icon: Flame },
    { name: "IconStar", label: "Stars", Icon: Star },
    { name: "IconTarget", label: "Goals", Icon: Target },
    { name: "IconChartBar", label: "Progress", Icon: ChartNoAxesColumn },
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
        <p>Monochrome, optically balanced icons for iOS-style navigation and ChatGPT-inspired interfaces. Tap an icon to copy its Tabler export name.</p>
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
