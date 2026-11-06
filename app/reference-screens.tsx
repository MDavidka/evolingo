"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import UnifiedSheet from "./unified-sheet"
import OverlaysShowcase from "./evolingo-overlays-demo"
import "./evolingo-button-demo.css"
import { AppHeader } from "@/components/app-header"
import { RefreshCw, ArrowUp, ArrowUpRight, Plus, SlidersHorizontal, ChevronDown, Ellipsis, Check, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Eye, EyeOff, Info, LogIn, ShieldCheck, UserRound, X, Crown, Bell, FolderOpen, CalendarDays, Settings2, LogOut, Component, Search, CheckCircle2, AlertCircle, LoaderCircle } from "lucide-react"

const Brainstorm = dynamic(() => import("./brainstorm"), { ssr: false })
const LibrarySpace = dynamic(() => import("./library-space"), { ssr: false })
const ToolsHub = dynamic(() => import("./tools-hub"), { ssr: false })
const Schedule = dynamic(() => import("./schedule"), { ssr: false })
const ChatInterface = dynamic(() => import("./chat-interface"), { ssr: false })

export type ReferenceView = "chat" | "brainstorm" | "schedule" | "space" | "utility" | "profile" | "auth"
type Props = {
  view: ReferenceView
  onUploadFile: () => void
  registerAuth: boolean
  onAuthModeChange: (register: boolean) => void
  userName: string
  avatarImage: string
  avatarFallback: string
  onView: (view: ReferenceView) => void
  onAppBack: () => void
  onEditProfile: (name: string) => void
  onEditAvatar: (file: File) => void
  onLogout: () => void
  notifications: boolean
  onChangeNotifications: (enabled: boolean) => void
}
type LucideIcon = typeof BookOpen

function Avatar({ name, src, fallback }: { name: string; src: string; fallback: string }) {
  return <span className="ref-avatar">{src ? <img src={src} alt={name} /> : <span className="ref-avatar-fallback"><img src={fallback} alt="" /></span>}</span>
}
function AuthScreen({ onBack, initialRegister, onModeChange }: { onBack: () => void; initialRegister: boolean; onModeChange: (register: boolean) => void }) {
  const [register, setRegister] = useState(initialRegister)
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState("")
  useEffect(() => setRegister(initialRegister), [initialRegister])
  return <div className="ref-auth">
    <AppHeader variant="task" className="ref-auth-header" left={<button type="button" aria-label="Vissza a chathez" onClick={onBack}><ChevronLeft size={21} /></button>} />
    <div className="ref-auth-content"><span className="ref-auth-mark"><BookOpen size={23} /> Evölingo</span><h1>{register ? "Csatlakozz az Evölingóhoz." : "Üdvözlünk újra."}</h1><p>{register ? "Hozz létre fiókot az AI-munkaterületedhez." : "Jelentkezz be az AI-munkaterületedhez."}</p>
      <form onSubmit={event => { event.preventDefault(); setNotice("A fiókos bejelentkezés még nincs beállítva. Vendégként továbbra is használhatod az alkalmazást.") }}>
        {register && <label htmlFor="ref-auth-name">Név<input id="ref-auth-name" autoComplete="name" placeholder="A neved" /></label>}
        <label htmlFor="ref-auth-email">E-mail-cím<input id="ref-auth-email" type="email" autoComplete="email" placeholder="nev@pelda.hu" required /></label>
        <label htmlFor="ref-auth-password"><span>Jelszó</span>{!register && <button type="button" className="ref-auth-forgot" onClick={() => setNotice("A jelszó-visszaállítás még nincs beállítva.")}>Elfelejtetted?</button>}<span className="ref-auth-password"><input id="ref-auth-password" type={showPassword ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} minLength={8} placeholder="Legalább 8 karakter" required /><button type="button" aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
        {!register && <label className="ref-auth-remember"><input type="checkbox" defaultChecked /> Bejelentkezve maradok</label>}
        <button type="submit" className="ref-auth-submit evo-wide-action">{register ? "Regisztráció" : "Bejelentkezés"}</button>
      </form>
      <p className="ref-auth-switch">{register ? "Már van fiókod?" : "Még nincs fiókod?"} <button type="button" onClick={() => { const next = !register; setRegister(next); onModeChange(next); setNotice("") }}>{register ? "Bejelentkezés" : "Regisztráció"}</button></p>
      {notice && <p className="ref-auth-notice" role="status">{notice}</p>}
    </div>
    <p className="ref-auth-terms">A folytatással elfogadod a felhasználási feltételeket és az adatvédelmi szabályzatot.</p>
  </div>
}

function ButtonsShowcase() {
  const [segment, setSegment] = useState("All")
  const [selectedChip, setSelectedChip] = useState(true)
  const base = "evo-buttons-demo__control"
  return <div className="evo-buttons-demo" aria-label="Modern iOS és ChatGPT stílusú gombok">
    <div className="evo-buttons-demo__group">
      <div className="evo-buttons-demo__heading">01 — Primary actions <span>iOS / ChatGPT</span></div>
      <div className="evo-buttons-demo__stack">
        <button type="button" className={base + " evo-buttons-demo__control--primary"}>Continue <ArrowUpRight aria-hidden="true" /></button>
        <button type="button" className={base + " evo-buttons-demo__control--secondary"}>Secondary action</button>
        <button type="button" className={base + " evo-buttons-demo__control--soft"}>Tertiary action</button>
      </div>
    </div>
    <div className="evo-buttons-demo__group">
      <div className="evo-buttons-demo__heading">02 — Glass &amp; floating</div>
      <div className="evo-buttons-demo__floating">
        <button type="button" className={base + " evo-buttons-demo__control--glass evo-buttons-demo__control--floating"}><SlidersHorizontal aria-hidden="true" />Customize</button>
        <button type="button" className={base + " evo-buttons-demo__control--glass evo-buttons-demo__control--round"} aria-label="További lehetőségek"><Ellipsis aria-hidden="true" /></button>
        <button type="button" className={base + " evo-buttons-demo__control--primary evo-buttons-demo__control--round"} aria-label="Új elem"><Plus aria-hidden="true" /></button>
      </div>
      <p className="evo-buttons-demo__caption">Floating toolbar · Translucent surface · Circular action</p>
    </div>
    <div className="evo-buttons-demo__group">
      <div className="evo-buttons-demo__heading">03 — ChatGPT-style controls</div>
      <div className="evo-buttons-demo__row">
        <button type="button" className={base + " evo-buttons-demo__control--soft evo-buttons-demo__control--compact"}><Plus aria-hidden="true" />Add files</button>
        <button type="button" className={base + " evo-buttons-demo__control--soft evo-buttons-demo__control--compact"}><SlidersHorizontal aria-hidden="true" />Tools</button>
        <button type="button" className={base + " evo-buttons-demo__control--primary evo-buttons-demo__control--round-compact"} aria-label="Küldés"><ArrowUp aria-hidden="true" /></button>
      </div>
    </div>
    <div className="evo-buttons-demo__group">
      <div className="evo-buttons-demo__heading">04 — Selection &amp; segmented</div>
      <div className="evo-buttons-demo__segment" role="group" aria-label="Szűrő választása">
        {["All", "Active", "Done"].map(item => <button key={item} type="button" aria-pressed={segment === item} onClick={() => setSegment(item)}>{item}</button>)}
      </div>
      <div className="evo-buttons-demo__row evo-buttons-demo__chips">
        <button type="button" aria-pressed={selectedChip} onClick={() => setSelectedChip(!selectedChip)} className={base + " evo-buttons-demo__chip " + (selectedChip ? "evo-buttons-demo__chip--selected" : "evo-buttons-demo__chip--unselected")}>{selectedChip && <Check aria-hidden="true" />}Selected</button>
        <button type="button" aria-pressed={!selectedChip} onClick={() => setSelectedChip(!selectedChip)} className={base + " evo-buttons-demo__chip " + (!selectedChip ? "evo-buttons-demo__chip--selected" : "evo-buttons-demo__chip--unselected")}>Unselected</button>
        <button type="button" disabled className={base + " evo-buttons-demo__chip evo-buttons-demo__chip--disabled"}>Disabled</button>
      </div>
    </div>
  </div>
}

function InputsShowcase() {
  const [displayName, setDisplayName] = useState("Mdavid")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [search, setSearch] = useState("")
  const [compactSearch, setCompactSearch] = useState("")
  const [email, setEmail] = useState("hello@example.com")
  const [focusValue, setFocusValue] = useState("Evolingo")
  const [otp, setOtp] = useState("")
  return <div className="evo-inputs-demo">
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">01 — Soft system field</span><input className="evo-inputs-demo__field" aria-label="Your name" placeholder="Your name" /><small>Quiet surface · 54px · 18px radius</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">02 — Minimal outline</span><input className="evo-inputs-demo__field evo-inputs-demo__field--outline" aria-label="Email address" placeholder="Email address" type="email" autoComplete="email" /></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">03 — Apple search capsule</span><label className="evo-inputs-demo__search"><Search size={19} aria-hidden="true" /><input aria-label="Search anything" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search anything" /></label></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">04 — Inline editable field</span><label className="evo-inputs-demo__inline"><span>Display name</span><input aria-label="Display name" value={displayName} onChange={event => setDisplayName(event.target.value)} /><ChevronRight size={17} aria-hidden="true" /></label><small>Native Settings-style editing · no surrounding box</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">05 — Floating label</span><label className="evo-inputs-demo__floating"><span>Email</span><input aria-label="Email" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">06 — Compact search / filter</span><div className="evo-inputs-demo__compact"><label className="evo-inputs-demo__search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search files" value={compactSearch} onChange={event => setCompactSearch(event.target.value)} placeholder="Search files" /></label><button type="button" aria-label="Filter options" title="Filter options"><SlidersHorizontal size={19} /></button></div></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">07 — ChatGPT composer</span><div className="evo-inputs-demo__composer"><textarea aria-label="Ask anything" rows={2} placeholder="Ask anything" /><div className="evo-inputs-demo__composer-actions"><div><button type="button" aria-label="Add attachment"><Plus size={21} /></button><button type="button">Tools <ChevronDown size={15} /></button></div><button type="button" className="evo-inputs-demo__send" aria-label="Send message"><ArrowUp size={20} /></button></div></div><small>One quiet surface · no nested cards</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">08 — Multiline writing</span><textarea className="evo-inputs-demo__multiline" aria-label="Write your response" rows={4} placeholder="Write your response..." /></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">09 — OTP / verification</span><div className="evo-inputs-demo__otp"><input aria-label="Six digit verification code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]*" value={otp} onChange={event => setOtp(event.target.value.replace(/\\D/g, "").slice(0, 6))} /><div aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i}>{otp[i] ?? "·"}</span>)}</div></div></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">10 — Focused field</span><input className="evo-inputs-demo__field evo-inputs-demo__field--focus" aria-label="Focused example" value={focusValue} onChange={event => setFocusValue(event.target.value)} /><small>Subtle graphite focus · no blue glow</small></section>
    <section className="evo-inputs-demo__item"><span className="evo-inputs-demo__eyebrow">11 — Password visibility</span><div className="evo-inputs-demo__password"><input aria-label="Password" placeholder="Password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" /><button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></section>
  </div>
}

function DemoLibrary({ onBack }: { onBack: () => void }) {
  const [activeCategory, setActiveCategory] = useState("buttons")
  const categories = [
    { id: "buttons", title: "Buttons", content: <ButtonsShowcase /> },
    { id: "inputs", title: "Inputs", content: <InputsShowcase /> },
    { id: "overlays", title: "Popups & Alerts", content: <OverlaysShowcase /> },
    { id: "settings", title: "Settings", content: <div className="evo-demo-preview"><SettingRow icon={Settings2} title="Beállítási sor" subtitle="Meglévő közös komponens" /><SettingRow icon={Info} title="Információ" subtitle="Csak előnézet" /></div> },
    { id: "icons", title: "Icons", content: <div className="evo-demo-preview evo-demo-icons"><CheckCircle2 aria-label="Siker" /><AlertCircle aria-label="Figyelmeztetés" /><LoaderCircle aria-label="Betöltés" /><Search aria-label="Keresés" /><Component aria-label="Komponens" /></div> },
    { id: "typography", title: "Typography", content: <div className="evo-demo-preview"><h2>Címsor</h2><p>Normál szöveg a jelenlegi globális betűstílussal.</p><small>Másodlagos szöveg</small></div> },
  ]
  const active = categories.find(category => category.id === activeCategory) ?? categories[0]
  return <div className="ref-profile evo-demo-library evo-demo-library--segmented">
    <button type="button" className="evo-demo-back" onClick={onBack}><ChevronLeft size={20} /> Vissza a profilhoz</button>
    <h1>UI Library</h1>
    <p className="evo-demo-description">iOS és ChatGPT stílusú UI-elemek. Válassz kategóriát a navigációban; a bemutató nem módosítja a globális stílusokat.</p>
    <nav className="evo-demo-breadcrumb" aria-label="UI-elemek kategóriái">
      <span className="evo-demo-breadcrumb__root">Components</span>
      <ChevronRight size={15} aria-hidden="true" />
      <span className="evo-demo-breadcrumb__current">{active.title}</span>
    </nav>
    <div className="evo-demo-category-tabs" role="group" aria-label="UI elem típusa">
      {categories.map(category => <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.title}</button>)}
    </div>
    <section className="evo-demo-active-content" aria-label={active.title}>
      <h2>{active.title}</h2>
      {active.content}
    </section>
  </div>
}

function Profile({ name, avatarImage, avatarFallback, onEdit, onEditAvatar, onLogin, onView, notifications, onChangeNotifications, onLogout }: {
  name: string; avatarImage: string; avatarFallback: string; onEdit: (name: string) => void; onEditAvatar: (file: File) => void; onLogin: () => void
  onView: (view: ReferenceView) => void; notifications: boolean; onChangeNotifications: (enabled: boolean) => void; onLogout: () => void
}) {
  const [demoOpen, setDemoOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [permissionHint, setPermissionHint] = useState("")
  const [draft, setDraft] = useState(name)
  const [profileSheet, setProfileSheet] = useState<"security" | "subscription" | "help" | "about" | null>(null)
  const [restartState, setRestartState] = useState<"idle" | "busy" | "error">("idle")
  const [restartMessage, setRestartMessage] = useState("")
  const avatarPicker = useRef<HTMLInputElement>(null)
  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"
  if (demoOpen) return <DemoLibrary onBack={() => setDemoOpen(false)} />
  return <div className="ref-profile"><h1>Profil</h1><div className="ref-profile-identity"><Avatar name={name} src={avatarImage} fallback={avatarFallback} /><div><strong>{name}</strong><span>@{handle}</span></div><button type="button" className="ref-outline-pill" onClick={() => { setDraft(name); setEditing(true) }}>Szerkesztés</button></div><hr />
    <div className="ref-settings-group"><h2>Fiók</h2><SettingRow icon={LogIn} title="Bejelentkezés" subtitle="Fiók létrehozása vagy belépés" onClick={onLogin} /><SettingRow icon={UserRound} title="Személyes adatok" subtitle="Név, profilkép és felhasználónév" onClick={() => { setDraft(name); setEditing(true) }} /><SettingRow icon={ShieldCheck} title="Biztonság" subtitle="Jelszó és bejelentkezési védelem" onClick={() => setProfileSheet("security")} /><SettingRow icon={Crown} title="Előfizetés" subtitle="Csomagok és előfizetési előnyök" onClick={() => setProfileSheet("subscription")} /></div>
    <div className="ref-settings-group"><h2>AI és adatok</h2>
      <SettingRow icon={BookOpen} title="Beszélgetések" subtitle="AI chat és előzmények" onClick={() => onView("chat")} />
      <SettingRow icon={FolderOpen} title="Könyvtár" subtitle="Fájlok és dokumentumok" onClick={() => onView("space")} />
      <SettingRow icon={CalendarDays} title="Ütemezés" subtitle="Saját feladatok" onClick={() => onView("schedule")} />
      <SettingRow icon={Settings2} title="Alkalmazások" subtitle="Csatlakoztatható eszközök" onClick={() => onView("utility")} />
    </div>
    <div className="ref-settings-group"><h2>Értesítések</h2>
      <button type="button" className="ref-setting-row" role="switch" aria-checked={notifications} onClick={async () => {
        if (notifications) { onChangeNotifications(false); return }
        if (!("Notification" in window)) { setPermissionHint("A böngésző nem támogatja az értesítéseket."); return }
        try { const permission = await Notification.requestPermission(); if (permission === "granted") onChangeNotifications(true); else setPermissionHint("Az értesítési engedély nem lett megadva.") }
        catch { setPermissionHint("Az értesítéseket most nem lehet engedélyezni.") }
      }}><Bell size={20} strokeWidth={1.75} /><span><strong>Böngészőértesítések</strong><small>{notifications ? "Engedélyezve" : "Kikapcsolva"}</small></span><span className={"evo-ai-settings-toggle" + (notifications ? " is-on" : "")} aria-hidden="true"><span /></span></button>
      {permissionHint && <p role="status" className="evo-ai-settings-hint">{permissionHint}</p>}
    </div>
    <div className="ref-settings-group"><h2>Megjelenés</h2><SettingRow icon={Settings2} title="Világos mód" subtitle="A sötét mód később érkezik" /></div>
    <div className="ref-settings-group ref-support-group"><h2>Támogatás</h2><SettingRow icon={CircleHelp} title="Súgó és támogatás" subtitle="Segítség az AI-eszközök használatához" onClick={() => setProfileSheet("help")} /><SettingRow icon={Info} title="Az alkalmazásról" subtitle="Evölingo · AI-asszisztens" onClick={() => setProfileSheet("about")} /></div>
    <div className="ref-settings-group"><SettingRow icon={LogOut} title="Kijelentkezés" subtitle="Vendégfiók" onClick={onLogout} /></div>
    <div className="ref-settings-group"><h2>Fejlesztői eszközök</h2><SettingRow icon={Component} title="Buttons" subtitle="iOS és ChatGPT stílusú gombok, UI előnézet" onClick={() => setDemoOpen(true)} /></div>
    {process.env.NODE_ENV === "development" && <div className="ref-settings-group"><h2>Fejlesztői eszközök</h2><button type="button" className="ref-setting-row" disabled={restartState === "busy"} onClick={async () => { if (!window.confirm("A fejlesztői szerver frissül a legújabb main commitra, majd újraindul. Folytatod?")) return; setRestartState("busy"); setRestartMessage("Frissítés és újraindítás…"); try { const response = await fetch("/api/dev/restart", { method: "POST" }); const data = await response.json() as { commit?: string; error?: string }; if (!response.ok) throw new Error(data.error || "Az újraindítás nem sikerült."); setRestartMessage(`Újraindítás a ${data.commit} commiton…`) } catch (error) { setRestartState("error"); setRestartMessage(error instanceof Error ? error.message : "Az újraindítás nem sikerült.") } }}><RefreshCw size={19} /><span><strong>{restartState === "busy" ? "Újraindítás…" : "Szerver újraindítása a legújabb commiton"}</strong><small>A main ág legújabb változatának betöltése</small></span><ChevronRight size={18} /></button>{restartMessage && <p role="status" className="profile-restart-status">{restartMessage}</p>}</div>}
    {profileSheet && <UnifiedSheet backdropClassName="ref-modal-backdrop" sheetClassName="ref-edit-modal ref-profile-info-modal" labelledBy="ref-profile-info-title" onClose={() => setProfileSheet(null)}><div className="ref-profile-info-heading"><h2 id="ref-profile-info-title">{{ security: "Biztonság", subscription: "Előfizetés", help: "Súgó és támogatás", about: "Az alkalmazásról" }[profileSheet]}</h2><button type="button" aria-label="Bezárás" onClick={() => setProfileSheet(null)}><X size={20} /></button></div>{profileSheet === "help" ? <p>Az AI-csevegésben kérdéseket tehetsz fel, a fájljaidat a Könyvtárban, a feladataidat az Ütemezésben kezelheted.</p> : profileSheet === "about" ? <p>Az Evölingo AI-asszisztens beszélgetéshez, fájlkezeléshez és feladatok szervezéséhez.</p> : <><p>{profileSheet === "security" ? "A biztonsági beállítások megnyitásához előbb jelentkezz be." : "Az előfizetési csomagok megtekintéséhez előbb jelentkezz be."}</p><button className="ref-dark-pill evo-wide-action" type="button" onClick={onLogin}>Bejelentkezés</button></>}</UnifiedSheet>}
    {editing && <UnifiedSheet backdropClassName="ref-modal-backdrop" sheetClassName="ref-edit-modal" labelledBy="ref-edit-title" onClose={() => setEditing(false)}><form onSubmit={event => { event.preventDefault(); if (draft.trim()) onEdit(draft.trim()); setEditing(false) }}><div><h2 id="ref-edit-title">Profil szerkesztése</h2><button type="button" aria-label="Bezárás" onClick={() => setEditing(false)}><X size={20} /></button></div><label htmlFor="ref-name">Megjelenített név</label><input id="ref-name" value={draft} maxLength={32} onChange={event => setDraft(event.target.value)} /><input ref={avatarPicker} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onEditAvatar(file); event.target.value = "" }} /><button className="ref-avatar-edit" type="button" onClick={() => avatarPicker.current?.click()}>Profilkép módosítása</button><button className="ref-dark-pill evo-wide-action" type="submit">Mentés</button></form></UnifiedSheet>}
  </div>
}

function SettingRow({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle?: string; onClick?: () => void }) {
  return <button type="button" className="ref-setting-row" onClick={onClick}><Icon size={19} strokeWidth={1.75} /><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span><ChevronRight size={18} /></button>
}

export default function ReferenceScreens(props: Props) {
  const { view, onView, userName, avatarImage, avatarFallback } = props
  useEffect(() => { if (view !== "chat") window.scrollTo(0, 0) }, [view])
  let content: ReactNode
  if (view === "chat") content = <ChatInterface />
  else if (view === "brainstorm") content = <Brainstorm />
  else if (view === "schedule") content = <Schedule />
  else if (view === "space") content = <LibrarySpace />
  else if (view === "utility") content = <ToolsHub onUpload={props.onUploadFile} onOpenLibrary={() => onView("space")} />
  else if (view === "auth") content = <AuthScreen onBack={props.onAppBack} initialRegister={props.registerAuth} onModeChange={props.onAuthModeChange} />
  else content = <Profile name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onEdit={props.onEditProfile} onEditAvatar={props.onEditAvatar} onLogin={() => onView("auth")}
    onView={onView} notifications={props.notifications} onChangeNotifications={props.onChangeNotifications} onLogout={props.onLogout} />
  return <main className={"ref-app ref-view-" + view}>{content}</main>
}
