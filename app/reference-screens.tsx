"use client"

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import ChatInterface from "./chat-interface"
import {
  ArrowRight, ArrowUp, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ChevronsUpDown, ChevronRight,
  CircleDot, CircleHelp, Cloud, Eye, EyeOff, FileText, Folder, GraduationCap, Grid2X2, Info, Landmark, List,
  LockKeyhole, LogOut, LogIn, Mic, MoreHorizontal, Plus, Search, Send, ShieldCheck, UserRound, Users, BarChart3, Check,
  X, Languages, Dna, ClipboardCheck, NotebookPen, Layers, Crown, PencilLine, Sparkles, type LucideIcon,
} from "lucide-react"

export type ReferenceView = "home" | "topic" | "selector" | "chat" | "space" | "utility" | "profile" | "auth"

type Props = {
  view: ReferenceView
  onUploadFile: () => void
  onPickFile: () => void
  topics: TopicData[]
  lessons: LessonData[]
  completedLessons: number[]
  readLessons: number[]
  activeLessonId: number
  userName: string
  avatarImage: string
  avatarFallback: string
  onView: (view: ReferenceView) => void
  onSelectLesson: (lessonId: number) => void
  onSelectMode: (mode: number) => void
  onContinue: () => void
  onEditProfile: (name: string) => void
  onEditAvatar: (file: File) => void
  onLogout: () => void
  onOpenFriends: () => void
  onOpenLeaderboard: () => void
}

type TopicData = { id: number; title: string; subtitle: string; lessonCount: number; lessonIds: number[] }
type LessonData = { id: number; title: string; summary: string; read: boolean; completed: boolean }

const initialFiles: SpaceEntry[] = []
type SpaceEntry = { id: string; name: string; detail: string; kind: "folder" | "pdf" | "note"; parent?: string; size?: number }
const SPACE_BLOBS_KEY = "evolingo.space-blobs.v1"

const actionTypes: { title: string; detail: string; icon: LucideIcon }[] = [
  { title: "Tanulás", detail: "Az anyag áttekintése és megértése.", icon: BookOpen },
  { title: "Gyakorlás", detail: "Interaktív feladatok és kérdések.", icon: PencilLine },
  { title: "Tudásfelmérés", detail: "Ellenőrizd, mennyire ismered az anyagot.", icon: ClipboardCheck },
  { title: "Tanulókártyák", detail: "Fogalmak és meghatározások ismétlése.", icon: Layers },
]

function Avatar({ name, src, fallback }: { name: string; src: string; fallback: string }) {
  return <span className="ref-avatar">{src ? <img src={src} alt={name} /> : <span className="ref-avatar-fallback"><img src={fallback} alt="" /></span>}</span>
}

function Header({ name, avatarImage, avatarFallback, onProfile, onHome, showCourse }: {
  name: string; avatarImage: string; avatarFallback: string; onProfile: () => void; onHome: () => void; showCourse: boolean
}) {
  const [courseOpen, setCourseOpen] = useState(false)
  const courseRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!courseRef.current?.contains(event.target as Node)) setCourseOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCourseOpen(false)
    }
    document.addEventListener("pointerdown", dismiss)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape) }
  }, [])
  return <header className="ref-topbar">
    {showCourse && <div className="ref-course-wrap" ref={courseRef}>
      <button className="ref-course" type="button" aria-haspopup="menu" aria-expanded={courseOpen} onClick={() => setCourseOpen(value => !value)}>
        <GraduationCap size={20} strokeWidth={1.8} /><strong>Erasmus</strong><span className="ref-course-chevron"><ChevronsUpDown size={13} /></span>
      </button>
      {courseOpen && <div className="ref-course-menu" role="menu" aria-label="Téma kiválasztása">
        <span className="ref-course-menu-label">Jelenlegi téma</span>
        <button className="ref-course-choice" type="button" role="menuitem" onClick={() => { setCourseOpen(false); onHome() }}>
          <GraduationCap size={17} /> Erasmus <Check size={17} />
        </button>
        <button className="ref-course-choice" type="button" role="menuitem" onClick={() => { setCourseOpen(false); onHome() }}>
          <BookOpen size={17} /> Összes téma
        </button>
      </div>}
    </div>}
    <button className="ref-profile-shortcut" type="button" onClick={() => { setCourseOpen(false); onProfile() }} aria-label="Profil megnyitása"><Avatar name={name} src={avatarImage} fallback={avatarFallback} /></button>
  </header>
}

function Topics({ topics, onSelect, onChat }: { topics: TopicData[]; onSelect: (lessonId: number) => void; onChat: () => void }) {
  const [query, setQuery] = useState("")
  const filtered = topics.filter(topic => `${topic.title} ${topic.subtitle}`.toLocaleLowerCase("hu").includes(query.toLocaleLowerCase("hu")))
  return <div className="ref-topics">
    <h1 className="ref-screen-heading">Tanulás</h1>
    <label className="ref-search"><Search size={19} /><input aria-label="Témák keresése" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="ref-topic-controls"><span>{topics.length} téma</span><button type="button" className="ref-dark-pill" onClick={() => onSelect(topics[0]?.id ?? 1)}><Plus size={17} /> Új lecke</button></div>
    <button type="button" className="evo-ai-shortcut" onClick={onChat}><span className="evo-ai-shortcut-icon"><img src="/images/evolingo-ai-orb.svg" alt="" style={{width:27,height:27,borderRadius:"50%"}} /></span><span><strong>Kérdezd az Evölingo AI-t</strong><small>Tanulás, gyakorlás, magyarázatok</small></span><ArrowRight size={17} className="evo-ai-shortcut-arrow" /></button>
    <div className="ref-topic-list">{filtered.slice(0, 3).map(({ id, title, subtitle, lessonCount, lessonIds }) => { const Icon = id === 1 ? Languages : id % 2 ? Landmark : Dna; return <button type="button" className="ref-topic-row" key={id} onClick={() => onSelect(lessonIds[0] || 1)}>
      <span className="ref-soft-icon"><Icon size={20} strokeWidth={1.8} /></span>
      <span className="ref-topic-copy"><strong>{title}</strong><small>{subtitle}</small><small>{lessonCount} lecke</small></span>
      <ChevronRight className="ref-chevron" size={19} />
    </button>})}{filtered.length === 0 && <p className="ref-empty">Nincs ilyen téma.</p>}</div>
  </div>
}

function TopicDetail({ topic, lessons, onSelectLesson, onBack }: { topic?: TopicData; lessons: LessonData[]; onSelectLesson: (id: number) => void; onBack: () => void }) {
  const [tab, setTab] = useState<"lessons" | "files" | "overview">("lessons")
  const [fileCount, setFileCount] = useState(0)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("evolingo.space.v1") || "[]") as SpaceEntry[]
      if (Array.isArray(saved)) setFileCount(saved.filter(entry => entry.kind !== "folder").length)
    } catch { /* File metadata is local to this browser. */ }
  }, [])
  const list = lessons.filter(lesson => topic?.lessonIds.includes(lesson.id))
  return <div className="ref-topic-detail">
    <button type="button" className="ref-topic-breadcrumb" onClick={onBack}><ChevronRight size={17} /> Saját témáim <ChevronRight size={16} /><strong>{topic?.title || "Erasmus"}</strong></button>
    <div className="ref-topic-detail-title"><div><h1>{topic?.title || "Erasmus"}</h1><p>{topic?.subtitle || "Angol nyelvtan és kommunikáció"}</p></div><button type="button" className="ref-topic-more" aria-label="Téma műveletei"><MoreHorizontal size={22} /></button></div>
    <div className="ref-topic-meta"><span><BookOpen size={19} />{list.length} lecke</span><span><FileText size={19} />{fileCount} fájl</span><span><Cloud size={19} />Saját téma</span></div>
    <div className="ref-topic-tabs" role="tablist" aria-label="Téma tartalma">
      <button type="button" role="tab" aria-selected={tab === "lessons"} onClick={() => setTab("lessons")}>Leckék</button>
      <button type="button" role="tab" aria-selected={tab === "files"} onClick={() => setTab("files")}>Fájlok</button>
      <button type="button" role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")}>Áttekintés</button>
    </div>
    {tab === "lessons" && <div className="ref-detail-lessons">{list.map((lesson, index) => <button type="button" key={lesson.id} className="ref-detail-lesson" onClick={() => onSelectLesson(lesson.id)}><span className="ref-detail-lesson-icon"><BookOpen size={20} /></span><span><strong>{lesson.title}</strong><small>{lesson.summary}</small><small>{lesson.completed ? "Befejezve" : lesson.read ? "Elkezdve" : `${index + 1}. lecke`}</small></span><ChevronRight size={19} /></button>)}</div>}
    {tab === "files" && <p className="ref-topic-empty">Ehhez a témához még nincs fájl hozzáadva.</p>}
    {tab === "overview" && <div className="ref-topic-overview"><h2>A témáról</h2><p>{topic?.subtitle || "Angol nyelvtan és kommunikáció"}</p><p>{list.length} lecke található ebben a témában.</p></div>}
  </div>
}

function AuthScreen({ onBack }: { onBack: () => void }) {
  const [register, setRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState("")
  return <div className="ref-auth">
    <header className="ref-auth-header"><button type="button" aria-label="Vissza a tanuláshoz" onClick={onBack}><ChevronRight size={21} /></button><span className="ref-auth-mark"><BookOpen size={23} /> evölingo</span></header>
    <div className="ref-auth-content"><h1>{register ? "Csatlakozz az Evölingóhoz." : "Üdvözlünk újra."}</h1><p>{register ? "Hozz létre fiókot, és őrizd meg a tanulási haladásod." : "Jelentkezz be, és folytasd ott, ahol abbahagytad."}</p>
      <form onSubmit={event => { event.preventDefault(); setNotice("A fiókos bejelentkezés még nincs beállítva. Vendégként továbbra is tanulhatsz ezen az eszközön.") }}>
        {register && <label htmlFor="ref-auth-name">Név<input id="ref-auth-name" autoComplete="name" placeholder="A neved" /></label>}
        <label htmlFor="ref-auth-email">E-mail-cím<input id="ref-auth-email" type="email" autoComplete="email" placeholder="nev@pelda.hu" required /></label>
        <label htmlFor="ref-auth-password"><span>Jelszó</span><button type="button" className="ref-auth-forgot" onClick={() => setNotice("A jelszó-visszaállítás még nincs beállítva.")}>Elfelejtetted?</button><span className="ref-auth-password"><input id="ref-auth-password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} minLength={8} placeholder="Legalább 8 karakter" required /><button type="button" aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
        {!register && <label className="ref-auth-remember"><input type="checkbox" defaultChecked /> Bejelentkezve maradok</label>}
        <button type="submit" className="ref-auth-submit">{register ? "Regisztráció" : "Bejelentkezés"} <ArrowRight size={18} /></button>
      </form>
      <div className="ref-auth-divider"><span /> vagy <span /></div>
      <button type="button" className="ref-auth-provider" onClick={() => setNotice("Az Apple-fiókos bejelentkezés még nincs beállítva.")}>Folytatás Apple-fiókkal</button>
      <button type="button" className="ref-auth-provider" onClick={() => setNotice("A Google-fiókos bejelentkezés még nincs beállítva.")}>Folytatás Google-fiókkal</button>
      <p className="ref-auth-switch">{register ? "Már van fiókod?" : "Még nincs fiókod?"} <button type="button" onClick={() => { setRegister(value => !value); setNotice("") }}>{register ? "Bejelentkezés" : "Regisztráció"}</button></p>
      {notice && <p className="ref-auth-notice" role="status">{notice}</p>}
    </div>
    <p className="ref-auth-terms">A folytatással elfogadod a felhasználási feltételeket és az adatvédelmi szabályzatot.</p>
  </div>
}

function LessonSelector({ lesson, onSelectMode, onContinue }: { lesson?: LessonData; onSelectMode: (mode: number) => void; onContinue: () => void }) {
  const [selected, setSelected] = useState(0)
  return <div className="ref-selector">
    <h1>Hogyan tovább?</h1>
    <div className="ref-action-list" role="radiogroup" aria-label="Lecke módja">
      {actionTypes.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.title} role="radio" aria-checked={selected === index} className={`ref-action-card ${selected === index ? "is-selected" : ""}`} onClick={() => { setSelected(index); onSelectMode(index) }}>
        <span className="ref-soft-icon"><Icon size={21} strokeWidth={1.8} /></span><span className="ref-action-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
        {selected === index ? <CheckCircle2 className="ref-selected-check" size={20} /> : <span className="ref-unselected-dot" />}
      </button>})}
    </div>
    <button type="button" className="ref-continue" onClick={onContinue}>Folytatás <ArrowRight size={18} /></button>
  </div>
}

function Space() {
  const filePicker = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<SpaceEntry[]>(initialFiles)
  const [view, setView] = useState<"list" | "grid">("list")
  const [folder, setFolder] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [newMenu, setNewMenu] = useState(false)
  const [notice, setNotice] = useState("")
  const [storageUsed, setStorageUsed] = useState<number | null>(null)
  const folderName = folder ? entries.find(item => item.id === folder)?.name || "Saját fájlok" : null
  useEffect(() => {
    try { const saved = localStorage.getItem("evolingo.space.v1"); if (saved) { const parsed = JSON.parse(saved) as SpaceEntry[]; if (Array.isArray(parsed)) setEntries(parsed) } } catch { /* Keep the visible starter collection. */ }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch("/api/space", { cache: "no-store" }).then(async response => {
      if (!response.ok) return
      const data = await response.json() as { entries?: SpaceEntry[]; storageUsed?: number; available?: boolean }
      if (cancelled) return
      if (Array.isArray(data.entries)) setEntries(data.entries)
      if (data.available === true && typeof data.storageUsed === "number" && Number.isFinite(data.storageUsed)) setStorageUsed(Math.max(0, data.storageUsed))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const update = (next: SpaceEntry[]) => { setEntries(next); try { localStorage.setItem("evolingo.space.v1", JSON.stringify(next)) } catch { setNotice("A módosítást nem sikerült elmenteni.") } }
  const persistEntries = (next: SpaceEntry[]) => update(next)
  const startUpload = () => filePicker.current?.click()
  const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setNotice("A fájl legfeljebb 2 MB lehet."); return }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") { setNotice("A fájlt nem sikerült beolvasni."); return }
      const id = crypto.randomUUID()
      const entry: SpaceEntry = { id, name: file.name, detail: `Fájl · ${(file.size / (1024 * 1024)).toLocaleString("hu-HU", { maximumFractionDigits: 2 })} MB`, kind: file.type === "application/pdf" ? "pdf" : "note", parent: folder || undefined, size: file.size }
      try {
        const blobs = JSON.parse(localStorage.getItem(SPACE_BLOBS_KEY) || "{}") as Record<string, string>
        blobs[id] = reader.result
        localStorage.setItem(SPACE_BLOBS_KEY, JSON.stringify(blobs))
        persistEntries([...entries, entry])
        setNotice("A fájl ezen az eszközön lett elmentve.")
      } catch { setNotice("A tárhely megtelt; a fájl nem lett elmentve.") }
    }
    reader.onerror = () => setNotice("A fájlt nem sikerült beolvasni.")
    reader.readAsDataURL(file)
  }
  const newFolder = () => { const name = window.prompt("Új mappa neve"); if (name?.trim()) persistEntries([...entries, { id: crypto.randomUUID(), name: name.trim(), detail: "0 elem", kind: "folder", parent: undefined }]); setNewMenu(false) }
  const rename = (entry: SpaceEntry) => { const name = window.prompt("Új név", entry.name); if (name?.trim()) persistEntries(entries.map(item => item.id === entry.id ? { ...item, name: name.trim() } : item)); setMenuFor(null) }
  const move = (entry: SpaceEntry) => { const folders = entries.filter(item => item.kind === "folder" && item.id !== entry.id); const choice = window.prompt("Áthelyezés mappába (név vagy üres a gyökérhez)", folders[0]?.name || ""); if (choice !== null) { const target = folders.find(item => item.name.toLocaleLowerCase("hu") === choice.trim().toLocaleLowerCase("hu")); if (choice.trim() && !target) setNotice("Ilyen mappa nem található."); else persistEntries(entries.map(item => item.id === entry.id ? { ...item, parent: target?.id } : item)); } setMenuFor(null) }
  const visible = entries.filter(item => item.parent === (folder || undefined))
  return <div className="ref-space">
    <input ref={filePicker} className="ref-hidden-file" type="file" aria-label="Fájl kiválasztása" onChange={uploadFile} />
    {folder && <button className="ref-back-link" type="button" onClick={() => setFolder(null)}><ChevronRight size={17} /> Saját fájlok</button>}
    <div className="ref-storage"><div><span><Cloud size={16} /> Tárhely</span><span>{storageUsed === null ? "" : `${(storageUsed / 1024).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} GB / 5 GB`}</span></div><div className="ref-storage-track"><i style={{ width: storageUsed === null ? 0 : `${Math.min(100, storageUsed / (5 * 1024) * 100)}%` }} /></div></div>
    <div className="ref-space-heading"><h1>{folderName || "Saját fájlok"}</h1><div className="ref-space-actions"><button className="ref-icon-button" type="button" aria-label="Rácsnézet" onClick={() => setView(value => value === "list" ? "grid" : "list")}>{view === "list" ? <Grid2X2 size={19} /> : <List size={19} />}</button><div className="ref-new-wrap"><button className="ref-outline-pill" type="button" onClick={() => setNewMenu(value => !value)}><Plus size={17} /> Új</button>{newMenu && <div className="ref-new-menu"><button type="button" onClick={newFolder}>Új mappa</button><button type="button" onClick={() => { setNewMenu(false); startUpload() }}>Fájl feltöltése</button></div>}</div></div></div>
    <div className={`ref-file-list ${view === "grid" ? "is-grid" : ""}`}>{visible.map(entry => <div className="ref-file-row" key={entry.id}>
      <button type="button" className="ref-file-open" onClick={() => {
        if (entry.kind === "folder") { setFolder(entry.id); return }
        if (entry.kind === "pdf") {
          try { const blobs = JSON.parse(localStorage.getItem(SPACE_BLOBS_KEY) || "{}") as Record<string, string>; if (blobs[entry.id]) { const link = document.createElement("a"); link.href = blobs[entry.id]; link.download = entry.name; link.click(); return } } catch {}
          setNotice(`${entry.name} fájltartalma nem érhető el ezen az eszközön.`)
          return
        }
        setNotice(`${entry.name} megnyitása`)
      }}>
        <span className="ref-soft-icon">{entry.kind === "folder" ? <Folder size={21} /> : entry.kind === "pdf" ? <FileText size={20} /> : <NotebookPen size={20} />}</span>
        <span className="ref-file-copy"><strong>{entry.name}</strong><small>{entry.detail}</small></span>
      </button>
      <button type="button" className="ref-more" aria-label={`${entry.name} műveletek`} onClick={() => setMenuFor(menuFor === entry.id ? null : entry.id)}><MoreHorizontal size={20} /></button>
      {menuFor === entry.id && <div className="ref-file-menu"><button type="button" onClick={() => rename(entry)}>Átnevezés</button><button type="button" onClick={() => move(entry)}>Áthelyezés</button><button type="button" onClick={() => { persistEntries(entries.filter(item => item.id !== entry.id)); try { const blobs = JSON.parse(localStorage.getItem(SPACE_BLOBS_KEY) || "{}") as Record<string, string>; delete blobs[entry.id]; localStorage.setItem(SPACE_BLOBS_KEY, JSON.stringify(blobs)) } catch {}; setMenuFor(null) }}>Törlés</button></div>}
    </div>)}</div>
    {notice && <div className="ref-inline-notice" role="status">{notice}<button type="button" aria-label="Bezárás" onClick={() => setNotice("")}><X size={15} /></button></div>}
  </div>
}

function Utility({ onSpace, onUpload, onFriends, onLeaderboard }: { onSpace: () => void; onUpload: () => void; onFriends: () => void; onLeaderboard: () => void }) {
  return <div className="ref-utility"><h1 className="ref-screen-heading">Eszközök</h1><h2>ALKOTÁS ÉS SZERVEZÉS</h2><div className="ref-utility-grid">
    <button type="button" className="ref-utility-card" onClick={onUpload}><span className="ref-soft-icon"><Send size={21} /></span><strong>Fájlküldés</strong><small>Fájlok megosztása</small><ArrowUpRight className="ref-utility-arrow" size={15} /></button>
    <button type="button" className="ref-utility-card" onClick={() => {}} aria-disabled="true"><span className="ref-soft-icon"><CalendarDays size={21} /></span><strong>Tervező</strong><small>Tervek és időbeosztás</small><ArrowUpRight className="ref-utility-arrow" size={15} /></button>
  </div>
    <section className="ref-utility-community" aria-label="Közösség">
      <h2>KÖZÖSSÉG</h2>
      <button type="button" className="ref-utility-community-link" onClick={onFriends}><Users size={20} /><span>Barátok</span><ChevronRight size={18} /></button>
      <button type="button" className="ref-utility-community-link" onClick={onLeaderboard}><BarChart3 size={20} /><span>Tanterem és ranglista</span><ChevronRight size={18} /></button>
    </section>
    <h2 className="ref-coming-heading">HAMAROSAN</h2><div className="ref-coming"><span className="ref-soft-icon"><Layers size={21} /></span><div><strong>Még több alkotási lehetőség</strong><p>Hamarosan új eszközökkel bővül a munkaterület.</p></div><LockKeyhole size={15} /></div></div>
}

function Profile({ name, avatarImage, avatarFallback, onEdit, onEditAvatar, onLogout, onLogin }: {
  name: string; avatarImage: string; avatarFallback: string; onEdit: (name: string) => void; onEditAvatar: (file: File) => void; onLogout: () => void; onLogin: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [logoutNote, setLogoutNote] = useState("")
  const avatarPicker = useRef<HTMLInputElement>(null)
  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"
  return <div className="ref-profile"><h1>Profil</h1><div className="ref-profile-identity"><Avatar name={name} src={avatarImage} fallback={avatarFallback} /><div><strong>{name}</strong><span>@{handle}</span></div><button type="button" className="ref-outline-pill" onClick={() => { setDraft(name); setEditing(true) }}>Szerkesztés</button></div><hr />
    <div className="ref-settings-group"><h2>Fiók</h2><SettingRow icon={LogIn} title="Bejelentkezés" subtitle="Fiók létrehozása vagy belépés" onClick={onLogin} /><SettingRow icon={UserRound} title="Személyes adatok" subtitle="Név, profilkép és felhasználónév" onClick={() => { setDraft(name); setEditing(true) }} /><SettingRow icon={ShieldCheck} title="Biztonság" subtitle="Jelszó és bejelentkezés" onClick={() => setLogoutNote("A biztonsági beállítások vendégfióknál nem érhetők el.")} /><SettingRow icon={Crown} title="Előfizetés" subtitle="Csomag és szolgáltatások" onClick={() => setLogoutNote("Előfizetési beállítások nem érhetők el.")} /></div>
    <div className="ref-settings-group ref-support-group"><h2>Támogatás</h2><SettingRow icon={CircleHelp} title="Súgó és támogatás" /><SettingRow icon={Info} title="Az alkalmazásról" /></div>
    <button className="ref-logout" type="button" onClick={() => { onLogout(); setLogoutNote("A kijelentkezés vendégfióknál nem érhető el.") }}><LogOut size={18} /> Kijelentkezés</button>
    {logoutNote && <p className="ref-profile-notice" role="status">{logoutNote}</p>}
    {editing && <div className="ref-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(false) }}><form className="ref-edit-modal" role="dialog" aria-modal="true" aria-labelledby="ref-edit-title" onSubmit={event => { event.preventDefault(); if (draft.trim()) onEdit(draft.trim()); setEditing(false) }}><div><h2 id="ref-edit-title">Profil szerkesztése</h2><button type="button" aria-label="Bezárás" onClick={() => setEditing(false)}><X size={20} /></button></div><label htmlFor="ref-name">Megjelenített név</label><input id="ref-name" value={draft} maxLength={32} onChange={event => setDraft(event.target.value)} /><input ref={avatarPicker} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onEditAvatar(file); event.target.value = "" }} /><button className="ref-avatar-edit" type="button" onClick={() => avatarPicker.current?.click()}>Profilkép módosítása</button><button className="ref-dark-pill" type="submit">Mentés</button></form></div>}
  </div>
}

function SettingRow({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle?: string; onClick?: () => void }) {
  return <button type="button" className="ref-setting-row" onClick={onClick}><Icon size={19} strokeWidth={1.8} /><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span><ChevronRight size={18} /></button>
}

export default function ReferenceScreens(props: Props) {
  const { view, userName, avatarImage, avatarFallback, onView, onSelectLesson, onSelectMode, onContinue, onEditProfile, onLogout, topics, lessons, activeLessonId } = props
  let content: ReactNode
  if (view === "home") content = <Topics topics={topics} onSelect={id => { onSelectLesson(id); onView("topic") }} onChat={() => onView("chat")} />
  else if (view === "topic") content = <TopicDetail topic={topics[0]} lessons={lessons} onSelectLesson={id => { onSelectLesson(id); onView("selector") }} onBack={() => onView("home")} />
  else if (view === "selector") content = <LessonSelector lesson={lessons.find(item => item.id === activeLessonId)} onSelectMode={onSelectMode} onContinue={onContinue} />
  else if (view === "chat") content = <ChatInterface />
  else if (view === "space") content = <Space />
  else if (view === "utility") content = <Utility onSpace={() => onView("space")} onUpload={props.onUploadFile} onFriends={props.onOpenFriends} onLeaderboard={props.onOpenLeaderboard} />
  else if (view === "auth") content = <AuthScreen onBack={() => onView("home")} />
  else content = <Profile name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onEdit={onEditProfile} onEditAvatar={props.onEditAvatar} onLogout={onLogout} onLogin={() => onView("auth")} />

  if (view === "auth") return <main className="ref-app ref-view-auth">{content}</main>
  return <main className={`ref-app ref-view-${view}`}>
    <Header key={view} name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onProfile={() => onView("profile")} onHome={() => onView("home")} showCourse={view === "home" || view === "topic"} />
    {content}
  </main>
}
