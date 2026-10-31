"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import ChatInterface from "./chat-interface"
import { buildLessonOverview } from "./intelligent-ui/lesson-overview"
/* Non-chat tabs and learning widgets are loaded only when needed.
   General AI chat stays available on the first paint. */
const Brainstorm = dynamic(() => import("./brainstorm"), { ssr: false })
const LibrarySpace = dynamic(() => import("./library-space"), { ssr: false })
const ToolsHub = dynamic(() => import("./tools-hub"), { ssr: false })
const IntelligentResponse = dynamic(() => import("./intelligent-ui/renderer"), { ssr: false })
import UnifiedSheet from "./unified-sheet"
import { AppHeader } from "@/components/app-header"
import { Tabs } from "@/components/arc/tabs/tabs"
import {
  ArrowRight, ArrowUp, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ChevronsUpDown, ChevronRight,
  CircleDot, CircleHelp, Eye, EyeOff, FileText, GraduationCap, Info, Landmark,
  LockKeyhole, LogOut, LogIn, Mic, MoreHorizontal, Plus, Search, Send, ShieldCheck, UserRound, Users, BarChart3, Check, LibraryBig,
  X, Languages, Dna, ClipboardCheck, Layers, Crown, PencilLine, Sparkles, type LucideIcon,
} from "lucide-react"

export type ReferenceView = "home" | "topic" | "selector" | "chat" | "brainstorm" | "space" | "utility" | "profile" | "auth"

type Props = {
  view: ReferenceView
  onUploadFile: () => void
  onPickFile: () => void
  topics: TopicData[]
  lessons: LessonData[]
  completedLessons: number[]
  readLessons: number[]
  activeLessonId: number
  selectedTopicId: number
  onSelectTopic: (topicId: number) => void
  registerAuth: boolean
  onAuthModeChange: (register: boolean) => void
  userName: string
  avatarImage: string
  avatarFallback: string
  onView: (view: ReferenceView) => void
  onAppBack: () => void
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
type LessonData = { id: number; title: string; level: string; summary: string; read: boolean; completed: boolean }
type StoredSpaceEntry = { kind?: "folder" | "pdf" | "note" }

const actionTypes: { title: string; detail: string; icon: LucideIcon }[] = [
  { title: "Tanulás", detail: "Az anyag áttekintése és megértése.", icon: BookOpen },
  { title: "Gyakorlás", detail: "Interaktív feladatok és kérdések.", icon: PencilLine },
  { title: "Tudásfelmérés", detail: "Ellenőrizd, mennyire ismered az anyagot.", icon: ClipboardCheck },
  { title: "Szókártyák", detail: "Fogalmak és meghatározások ismétlése.", icon: Layers },
]

function Avatar({ name, src, fallback }: { name: string; src: string; fallback: string }) {
  return <span className="ref-avatar">{src ? <img src={src} alt={name} /> : <span className="ref-avatar-fallback"><img src={fallback} alt="" /></span>}</span>
}

function Header({ name, avatarImage, avatarFallback, onProfile, onHome, onSelectCourse, topics, selectedTopicId, showCourse, courseName }: {
  name: string; avatarImage: string; avatarFallback: string; onProfile: () => void; onHome: () => void
  onSelectCourse: (id: number) => void; topics: TopicData[]; selectedTopicId: number | null
  showCourse: boolean; courseName?: string
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
  return <AppHeader variant="main" className="ref-topbar" center={showCourse ? <div className="ref-course-wrap" ref={courseRef}>
      <button className="ref-course" type="button" aria-haspopup="menu" aria-expanded={courseOpen} onClick={() => setCourseOpen(value => !value)}>
        <GraduationCap size={20} strokeWidth={1.75} /><strong>{courseName || "Témáim"}</strong><span className="ref-course-chevron"><ChevronsUpDown size={13} /></span>
      </button>
      {courseOpen && <div className="ref-course-menu" role="menu" aria-label="Téma kiválasztása">
        <span className="ref-course-menu-label">Jelenlegi téma</span>
        {topics.map(topic => <button key={topic.id} className="ref-course-choice" type="button" role="menuitem" onClick={() => { setCourseOpen(false); onSelectCourse(topic.id) }}>
          <GraduationCap size={17} /> {topic.title} {(selectedTopicId === topic.id || (selectedTopicId === null && topics[0]?.id === topic.id)) && <Check size={17} />}
        </button>)}
        <button className="ref-course-choice" type="button" role="menuitem" onClick={() => { setCourseOpen(false); onHome() }}>
          <BookOpen size={17} /> Összes téma
        </button>
      </div>}
    </div> : null} right={<button className="ref-profile-shortcut" type="button" onClick={() => { setCourseOpen(false); onProfile() }} aria-label="Profil megnyitása"><Avatar name={name} src={avatarImage} fallback={avatarFallback} /></button>} />
}

function Topics({ topics, lessons, onSelectTopic, onSelectLesson }: {
  topics: TopicData[]
  lessons: LessonData[]
  onSelectTopic: (id: number) => void
  onSelectLesson: (id: number) => void
}) {
  const [query, setQuery] = useState("")
  // The redesigned index is much shorter than the old path. Restoring its old
  // scroll offset can land users on an empty white screen after tab changes.
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(frame)
  }, [])

  const term = query.toLocaleLowerCase("hu").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  const contains = (value: string) => value.toLocaleLowerCase("hu").normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term)
  const matchingLessons = term
    ? lessons.filter(lesson => contains(lesson.title + " " + lesson.summary))
    : []
  const matchingLessonIds = new Set(matchingLessons.map(lesson => lesson.id))
  const filteredTopics = topics.filter(topic =>
    !term || contains(topic.title + " " + topic.subtitle) || topic.lessonIds.some(id => matchingLessonIds.has(id))
  )

  return <div className="ref-topics evo-learning-home">
    <div className="evo-learning-search" role="search">
      <Search size={21} strokeWidth={1.75} aria-hidden="true" />
      <input
        type="search"
        autoComplete="off"
        aria-label="Témák és leckék keresése"
        placeholder="Témák és leckék keresése"
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery("")}><X size={18} strokeWidth={1.75} /></button>}
    </div>

    <section className="evo-learning-section" aria-label="Saját témák és leckék">
      <div className="evo-learning-topic-list">
        {filteredTopics.map((topic, index) => {
          const Icon = index === 0 ? GraduationCap : index % 2 === 0 ? BookOpen : Languages
          return <button type="button" className="evo-learning-topic-card" key={topic.id} onClick={() => onSelectTopic(topic.id)}>
            <span className="evo-learning-topic-icon"><Icon size={24} strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="evo-learning-topic-copy">
              <strong>{topic.title}</strong>
              <span>{topic.lessonIds.length} lecke{topic.subtitle ? ` · ${topic.subtitle.includes("Nyelvtani szabályok") ? "Nyelvtan és kommunikáció" : topic.subtitle}` : ""}</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} className="evo-learning-chevron" aria-hidden="true" />
          </button>
        })}
        {filteredTopics.length === 0 && matchingLessons.length === 0 && <p className="evo-learning-empty">Nem található ilyen téma vagy lecke.</p>}
        {!term && <button type="button" className="evo-learning-library" onClick={() => onSelectTopic(-1)} disabled={!lessons.length}>
          <span className="evo-learning-library-icon"><LibraryBig size={23} strokeWidth={1.75} aria-hidden="true" /></span>
          <span><strong>Összes lecke</strong><small>Böngészd a tananyagokat</small></span>
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>}
      </div>
    </section>

    {term && matchingLessons.length > 0 && <section className="evo-learning-section" aria-labelledby="evo-learning-results-title">
      <div className="evo-learning-section-header"><h2 id="evo-learning-results-title">Talált leckék</h2><span>{matchingLessons.length} találat</span></div>
      <div className="evo-learning-lesson-list">
        {matchingLessons.map(lesson => <button type="button" className="evo-learning-lesson-row" key={lesson.id} onClick={() => onSelectLesson(lesson.id)}>
          <span className="evo-learning-lesson-icon"><BookOpen size={21} strokeWidth={1.75} aria-hidden="true" /></span>
          <span><strong>{lesson.title}</strong><small>{lesson.summary}</small></span>
          <ChevronRight size={19} strokeWidth={1.75} aria-hidden="true" />
        </button>)}
      </div>
    </section>}

  </div>
}

function TopicDetail({ topic, lessons, onSelectLesson, onBack, showAll = false }: { topic?: TopicData; lessons: LessonData[]; onSelectLesson: (id: number) => void; onBack: () => void; showAll?: boolean }) {
  const [tab, setTab] = useState<"lessons" | "files" | "overview">("lessons")
  const [fileCount, setFileCount] = useState(0)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("evolingo.space.v1") || "[]") as StoredSpaceEntry[]
      if (Array.isArray(saved)) setFileCount(saved.filter(entry => entry.kind !== "folder").length)
    } catch { /* File metadata is local to this browser. */ }
  }, [])
  const list = showAll ? lessons : lessons.filter(lesson => topic?.lessonIds.includes(lesson.id))
  const overviewUI = buildLessonOverview(list, topic?.id ?? 0)
  const progressPercent = list.length ? Math.round((list.filter(lesson => lesson.completed).length / list.length) * 100) : 0
  const levels = [...new Set(list.map(lesson => lesson.level).filter(Boolean))]
  const topicTitle = showAll ? "Összes lecke" : topic?.title || "Témáim"
  const topicTitleParts = topicTitle.split(/(A1[–-]B2)/g)
  return <div className="ref-topic-detail">
    <button type="button" className="ref-topic-breadcrumb" aria-label="Vissza a témákhoz" onClick={onBack}><ChevronRight size={17} /> Vissza a témákhoz</button>
    <div className="ref-topic-detail-title"><div><h1>{topicTitleParts.map((part, index) => /^(A1[–-]B2)$/.test(part) ? <span key={index} className="ref-topic-level-range">{part}</span> : part)}</h1><p>{showAll ? "Böngészd az összes tananyagot" : topic?.subtitle || ""}</p></div><button type="button" className="ref-topic-more" aria-label="Téma műveletei"><MoreHorizontal size={22} /></button></div>
    <div className="ref-topic-meta"><span><BookOpen size={19} />{list.length} lecke</span>{fileCount > 0 && <span><FileText size={19} />{fileCount} fájl</span>}</div>
    <Tabs<"lessons" | "files" | "overview"> className="ref-topic-tabs" ariaLabel="Téma tartalma" value={tab} onChange={setTab} items={[
      { value: "lessons", label: "Leckék" },
      { value: "files", label: "Fájlok" },
      { value: "overview", label: "Áttekintés" },
    ]} />
    {tab === "lessons" && <div className="ref-detail-lessons">{levels.map(level => <section className="ref-detail-level" key={level} aria-labelledby={`ref-level-${level}`}><h2 id={`ref-level-${level}`}>{level} szint</h2>{list.filter(lesson => lesson.level === level).map(lesson => <button type="button" key={lesson.id} className="ref-detail-lesson" onClick={() => onSelectLesson(lesson.id)}><span className="ref-detail-lesson-icon"><BookOpen size={20} /></span><span><strong>{lesson.title}</strong><small>{lesson.summary}</small><small>{lesson.completed ? "Befejezve" : lesson.read ? "Elkezdve" : "Még nem kezdted el"}</small></span><ChevronRight size={19} /></button>)}</section>)}</div>}
    {tab === "files" && <p className="ref-topic-empty">Ehhez a témához még nincs fájl hozzáadva.</p>}
    {tab === "overview" && <div className="ref-topic-overview"><h2>Statisztika</h2><p>Haladásod: {progressPercent}% · {list.filter(lesson => lesson.completed).length} / {list.length} lecke kész</p><IntelligentResponse ui={overviewUI} messageId={"topic-" + (topic?.id ?? "all")} verifiedData /></div>}
  </div>
}

function AuthScreen({ onBack, initialRegister, onModeChange }: { onBack: () => void; initialRegister: boolean; onModeChange: (register: boolean) => void }) {
  const [register, setRegister] = useState(initialRegister)
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState("")
  useEffect(() => setRegister(initialRegister), [initialRegister])
  return <div className="ref-auth">
    <AppHeader variant="task" className="ref-auth-header" left={<button type="button" aria-label="Vissza a tanuláshoz" onClick={onBack}><ChevronRight size={21} /></button>} />
    <div className="ref-auth-content"><span className="ref-auth-mark"><BookOpen size={23} /> Evölingo</span><h1>{register ? "Csatlakozz az Evölingóhoz." : "Üdvözlünk újra."}</h1><p>{register ? "Hozz létre fiókot, és őrizd meg a tanulási haladásod." : "Jelentkezz be, és folytasd ott, ahol abbahagytad."}</p>
      <form onSubmit={event => { event.preventDefault(); setNotice("A fiókos bejelentkezés még nincs beállítva. Vendégként továbbra is tanulhatsz ezen az eszközön.") }}>
        {register && <label htmlFor="ref-auth-name">Név<input id="ref-auth-name" autoComplete="name" placeholder="A neved" /></label>}
        <label htmlFor="ref-auth-email">E-mail-cím<input id="ref-auth-email" type="email" autoComplete="email" placeholder="nev@pelda.hu" required /></label>
        <label htmlFor="ref-auth-password"><span>Jelszó</span><button type="button" className="ref-auth-forgot" onClick={() => setNotice("A jelszó-visszaállítás még nincs beállítva.")}>Elfelejtetted?</button><span className="ref-auth-password"><input id="ref-auth-password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} minLength={8} placeholder="Legalább 8 karakter" required /><button type="button" aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
        {!register && <label className="ref-auth-remember"><input type="checkbox" defaultChecked /> Bejelentkezve maradok</label>}
        <button type="submit" className="ref-auth-submit evo-wide-action">{register ? "Regisztráció" : "Bejelentkezés"} <ArrowUpRight size={20} strokeWidth={2.2} aria-hidden="true" /></button>
      </form>
      <div className="ref-auth-divider"><span /> vagy <span /></div>
      <button type="button" className="ref-auth-provider" onClick={() => setNotice("Az Apple-fiókos bejelentkezés még nincs beállítva.")}>Folytatás Apple-fiókkal</button>
      <button type="button" className="ref-auth-provider" onClick={() => setNotice("A Google-fiókos bejelentkezés még nincs beállítva.")}>Folytatás Google-fiókkal</button>
      <p className="ref-auth-switch">{register ? "Már van fiókod?" : "Még nincs fiókod?"} <button type="button" onClick={() => { const next = !register; setRegister(next); onModeChange(next); setNotice("") }}>{register ? "Bejelentkezés" : "Regisztráció"}</button></p>
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
        <span className="ref-soft-icon"><Icon size={21} strokeWidth={1.75} /></span><span className="ref-action-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
        {selected === index ? <CheckCircle2 className="ref-selected-check" size={20} /> : <span className="ref-unselected-dot" />}
      </button>})}
    </div>
    <button type="button" className="ref-continue evo-wide-action" onClick={onContinue}>Folytatás <ArrowUpRight size={20} strokeWidth={2.2} aria-hidden="true" /></button>
  </div>
}

function Profile({ name, avatarImage, avatarFallback, onEdit, onEditAvatar, onLogin }: {
  name: string; avatarImage: string; avatarFallback: string; onEdit: (name: string) => void; onEditAvatar: (file: File) => void; onLogin: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [profileSheet, setProfileSheet] = useState<"security" | "subscription" | "help" | "about" | null>(null)
  const avatarPicker = useRef<HTMLInputElement>(null)
  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"
  return <div className="ref-profile"><h1>Profil</h1><div className="ref-profile-identity"><Avatar name={name} src={avatarImage} fallback={avatarFallback} /><div><strong>{name}</strong><span>@{handle}</span></div><button type="button" className="ref-outline-pill" onClick={() => { setDraft(name); setEditing(true) }}>Szerkesztés</button></div><hr />
    <div className="ref-settings-group"><h2>Fiók</h2><SettingRow icon={LogIn} title="Bejelentkezés" subtitle="Fiók létrehozása vagy belépés" onClick={onLogin} /><SettingRow icon={UserRound} title="Személyes adatok" subtitle="Név, profilkép és felhasználónév" onClick={() => { setDraft(name); setEditing(true) }} /><SettingRow icon={ShieldCheck} title="Biztonság" subtitle="Jelszó és bejelentkezési védelem" onClick={() => setProfileSheet("security")} /><SettingRow icon={Crown} title="Előfizetés" subtitle="Csomagok és előfizetési előnyök" onClick={() => setProfileSheet("subscription")} /></div>
    <div className="ref-settings-group ref-support-group"><h2>Támogatás</h2><SettingRow icon={CircleHelp} title="Súgó és támogatás" subtitle="Segítség a tanuláshoz és az alkalmazás használatához" onClick={() => setProfileSheet("help")} /><SettingRow icon={Info} title="Az alkalmazásról" subtitle="Evölingo · Tanulás személyre szabottan" onClick={() => setProfileSheet("about")} /></div>
    {profileSheet && <UnifiedSheet backdropClassName="ref-modal-backdrop" sheetClassName="ref-edit-modal ref-profile-info-modal" labelledBy="ref-profile-info-title" onClose={() => setProfileSheet(null)}><div className="ref-profile-info-heading"><h2 id="ref-profile-info-title">{{ security: "Biztonság", subscription: "Előfizetés", help: "Súgó és támogatás", about: "Az alkalmazásról" }[profileSheet]}</h2><button type="button" aria-label="Bezárás" onClick={() => setProfileSheet(null)}><X size={20} /></button></div>{profileSheet === "help" ? <p>A leckéket a Tanulás lapon találod. Az AI-csevegésben kérdéseket tehetsz fel, a fájljaidat pedig az Eszközök lapon kezelheted.</p> : profileSheet === "about" ? <p>Az Evölingo személyre szabott tanulási élményt kínál leckékkel és AI-támogatással.</p> : <><p>{profileSheet === "security" ? "A biztonsági beállítások megnyitásához előbb jelentkezz be." : "Az előfizetési csomagok megtekintéséhez előbb jelentkezz be."}</p><button className="ref-dark-pill evo-wide-action" type="button" onClick={onLogin}>Bejelentkezés</button></>}</UnifiedSheet>}
    {editing && <UnifiedSheet backdropClassName="ref-modal-backdrop" sheetClassName="ref-edit-modal" labelledBy="ref-edit-title" onClose={() => setEditing(false)}><form onSubmit={event => { event.preventDefault(); if (draft.trim()) onEdit(draft.trim()); setEditing(false) }}><div><h2 id="ref-edit-title">Profil szerkesztése</h2><button type="button" aria-label="Bezárás" onClick={() => setEditing(false)}><X size={20} /></button></div><label htmlFor="ref-name">Megjelenített név</label><input id="ref-name" value={draft} maxLength={32} onChange={event => setDraft(event.target.value)} /><input ref={avatarPicker} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onEditAvatar(file); event.target.value = "" }} /><button className="ref-avatar-edit" type="button" onClick={() => avatarPicker.current?.click()}>Profilkép módosítása</button><button className="ref-dark-pill evo-wide-action" type="submit">Mentés</button></form></UnifiedSheet>}
  </div>
}

function SettingRow({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle?: string; onClick?: () => void }) {
  return <button type="button" className="ref-setting-row" onClick={onClick}><Icon size={19} strokeWidth={1.75} /><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span><ChevronRight size={18} /></button>
}

export default function ReferenceScreens(props: Props) {
  const { view, userName, avatarImage, avatarFallback, onView, onAppBack, onSelectLesson, onSelectMode, onContinue, onEditProfile, topics, lessons, activeLessonId, selectedTopicId, onSelectTopic, registerAuth, onAuthModeChange } = props
  useEffect(() => {
    // Each tab starts at its own top instead of inheriting the previous page scroll.
    if (view !== "chat" && view !== "home") window.scrollTo(0, 0)
  }, [view])
  const selectedTopic = topics.find(topic => topic.id === selectedTopicId) ?? topics[0]
  let content: ReactNode
  if (view === "home") content = <Topics topics={topics} lessons={lessons} onSelectTopic={id => { onSelectTopic(id); onView("topic") }} onSelectLesson={id => { onSelectLesson(id); onView("selector") }} />
  else if (view === "topic") content = <TopicDetail topic={selectedTopicId === -1 ? undefined : selectedTopic} showAll={selectedTopicId === -1} lessons={lessons} onSelectLesson={id => { onSelectLesson(id); onView("selector") }} onBack={() => onView("home")} />
  else if (view === "selector") content = <LessonSelector lesson={lessons.find(item => item.id === activeLessonId)} onSelectMode={onSelectMode} onContinue={onContinue} />
  else if (view === "chat") content = <ChatInterface />
  else if (view === "brainstorm") content = <Brainstorm />
  else if (view === "space") content = <LibrarySpace />
  else if (view === "utility") content = <ToolsHub onUpload={props.onUploadFile} onFriends={props.onOpenFriends} onLeaderboard={props.onOpenLeaderboard} />
  else if (view === "auth") content = <AuthScreen onBack={onAppBack} initialRegister={registerAuth} onModeChange={onAuthModeChange} />
  else content = <Profile name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onEdit={onEditProfile} onEditAvatar={props.onEditAvatar} onLogin={() => onView("auth")} />

  if (view === "auth") return <main className="ref-app ref-view-auth">{content}</main>
  return <main className={`ref-app ref-view-${view}`}>
    {/* Könyvtár uses the app-level floating sidebar/profile; do not render an empty page header. */}
    {view !== "space" && <Header key={view} name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onProfile={() => onView("profile")} onHome={() => onView("home")} onSelectCourse={id => { onSelectTopic(id); onView("topic") }} topics={topics} selectedTopicId={selectedTopicId} showCourse={view === "home" || view === "topic"} courseName={selectedTopicId === -1 ? "Összes lecke" : (selectedTopic?.title || "Témáim").replace(/\s+A1[–-]B2\s*$/, "")} />}
    {content}
  </main>
}
