"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { BottomSheet } from "./evo-ui-kit"
import BottomSheetShowcase from "./evo-ui-kit/bottom-sheet-demo"
import { UIButton } from "./evo-ui-kit/button"
import { UISettingsGroup, UISettingsRow, UISettingsSwitchRow } from "./evo-ui-kit/settings"
import CardsShowcase from "./evolingo-cards-demo"
import ButtonsV2Showcase from "./evolingo-buttons-v2"
import DesignSystemShowcase from "./evolingo-design-system-demo"
import IconsShowcase from "./evolingo-icons-demo"
import AIComponentsShowcase from "./evolingo-ai-components-demo"
import MenusShowcase from "./evolingo-menus-demo"
import "./evolingo-button-demo.css"
import "./evo-ui-kit/library-normalize.css"
import { AppHeader } from "@/components/app-header"
import { RefreshCw, ArrowUp, ArrowUpRight, Plus, SlidersHorizontal, ChevronDown, Ellipsis, Check, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Eye, EyeOff, Info, LogIn, ShieldCheck, UserRound, X, Crown, Bell, FolderOpen, CalendarDays, Settings2, LogOut, Component, Search, Pencil, Palette, Accessibility, Languages, Plug } from "lucide-react"

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
        <UIButton type="submit" fullWidth className="ref-auth-submit evo-wide-action">{register ? "Regisztráció" : "Bejelentkezés"}</UIButton>
      </form>
      <p className="ref-auth-switch">{register ? "Már van fiókod?" : "Még nincs fiókod?"} <button type="button" onClick={() => { const next = !register; setRegister(next); onModeChange(next); setNotice("") }}>{register ? "Bejelentkezés" : "Regisztráció"}</button></p>
      {notice && <p className="ref-auth-notice" role="status">{notice}</p>}
    </div>
    <p className="ref-auth-terms">A folytatással elfogadod a felhasználási feltételeket és az adatvédelmi szabályzatot.</p>
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
    { id: "buttons", title: "Buttons", content: <ButtonsV2Showcase /> },
    { id: "inputs", title: "Inputs", content: <InputsShowcase /> },
    { id: "cards", title: "Cards", content: <CardsShowcase /> },
    { id: "design-system", title: "Design System", content: <DesignSystemShowcase /> },
    { id: "overlays", title: "Bottom Sheets & Forms", content: <BottomSheetShowcase /> },
    { id: "settings", title: "Menus & Settings", content: <MenusShowcase /> },
    { id: "icons", title: "Icons", content: <IconsShowcase /> },
    { id: "ai-components", title: "AI Components", content: <AIComponentsShowcase /> },
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
  const [notificationPending, setNotificationPending] = useState(false)
  const [draft, setDraft] = useState(name)
  const [profileSheet, setProfileSheet] = useState<"security" | "subscription" | "help" | "about" | "accessibility" | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [restartState, setRestartState] = useState<"idle" | "busy" | "error">("idle")
  const [restartMessage, setRestartMessage] = useState("")
  const [restartConfirm, setRestartConfirm] = useState(false)
  const avatarPicker = useRef<HTMLInputElement>(null)

  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"
  const editProfile = () => { setDraft(name); setEditing(true) }

  useEffect(() => {
    let enabled = false
    try {
      const saved = localStorage.getItem("evolingo.profile.reduce-motion")
      enabled = saved === "true" || (saved === null && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    } catch {
      enabled = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    }
    setReducedMotion(enabled)
    document.documentElement.dataset.evoReduceMotion = enabled ? "true" : "false"
  }, [])

  const changeReducedMotion = (enabled: boolean) => {
    setReducedMotion(enabled)
    document.documentElement.dataset.evoReduceMotion = enabled ? "true" : "false"
    try { localStorage.setItem("evolingo.profile.reduce-motion", String(enabled)) } catch { /* Restricted storage: session-only. */ }
  }

  const changeNotifications = async (enabled: boolean) => {
    if (!enabled) { onChangeNotifications(false); setPermissionHint(""); return }
    if (!("Notification" in window)) {
      setPermissionHint("Ez a böngésző nem támogatja az értesítéseket.")
      return
    }
    setNotificationPending(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        onChangeNotifications(true)
        setPermissionHint("")
      } else {
        setPermissionHint("Az értesítési engedélyt a böngészőben tudod módosítani.")
      }
    } catch {
      setPermissionHint("Az értesítéseket most nem lehet engedélyezni.")
    } finally {
      setNotificationPending(false)
    }
  }

  if (demoOpen) return <DemoLibrary onBack={() => setDemoOpen(false)} />

  return <div className="ref-profile ref-profile-v3 evo-ui-scope">
    <header className="evo-profile-v3__heading"><h1>Profil</h1></header>

    <button className="evo-profile-v3__identity" type="button" onClick={editProfile} aria-label="Profil szerkesztése">
      <Avatar name={name} src={avatarImage} fallback={avatarFallback} />
      <span className="evo-profile-v3__identity-copy">
        <strong>{name}</strong>
        <small>@{handle}</small>
      </span>
      <span className="evo-profile-v3__edit" aria-hidden="true"><Pencil size={18} strokeWidth={1.75}/></span>
    </button>

    <div className="evo-profile-v3__sections">
      <UISettingsGroup title="Személyre szabás">
        <UISettingsRow icon={SlidersHorizontal} title="Személyre szabás" onClick={() => setProfileSheet("accessibility")}/>
        <UISettingsRow icon={Palette} title="Megjelenés" value="Világos" showChevron={false}/>
      </UISettingsGroup>

      <UISettingsGroup title="Fiók">
        <UISettingsRow icon={UserRound} title="Személyes adatok" onClick={editProfile}/>
        <UISettingsRow icon={LogIn} title="Bejelentkezés" onClick={onLogin}/>
        <UISettingsRow icon={ShieldCheck} title="Biztonság" onClick={() => setProfileSheet("security")}/>
        <UISettingsRow icon={Crown} title="Előfizetés" onClick={() => setProfileSheet("subscription")}/>
      </UISettingsGroup>

      <UISettingsGroup title="Alkalmazás">
        <UISettingsSwitchRow
          icon={Bell} title="Értesítések"
          description={notifications ? "Bekapcsolva" : "Kikapcsolva"}
          checked={notifications} pending={notificationPending}
          onChange={enabled => { void changeNotifications(enabled) }}
        />
        {permissionHint && <p className="evo-profile-v3__hint" role="status">{permissionHint}</p>}
        <UISettingsRow icon={Accessibility} title="Kisegítő lehetőségek" onClick={() => setProfileSheet("accessibility")}/>
        <UISettingsRow icon={Languages} title="Nyelv" value="Magyar" showChevron={false}/>
        <UISettingsRow icon={Plug} title="Kapcsolt szolgáltatások" onClick={() => onView("utility")}/>
      </UISettingsGroup>

      <UISettingsGroup title="Támogatás">
        <UISettingsRow icon={CircleHelp} title="Súgó és támogatás" onClick={() => setProfileSheet("help")}/>
        <UISettingsRow icon={Info} title="Az alkalmazásról" onClick={() => setProfileSheet("about")}/>
        <UISettingsRow icon={Component} title="UI Library" onClick={() => setDemoOpen(true)}/>
      </UISettingsGroup>

      {process.env.NODE_ENV === "development" && <UISettingsGroup title="Fejlesztői eszközök">
        <UISettingsRow icon={RefreshCw} title={restartState === "busy" ? "Újraindítás…" : "Szerver újraindítása"} onClick={restartState === "busy" ? undefined : () => setRestartConfirm(true)} disabled={restartState === "busy"}/>
        {restartMessage && <p role="status" className="evo-profile-v3__hint">{restartMessage}</p>}
      </UISettingsGroup>}

      <div className="evo-profile-v3__signout">
        <UISettingsRow icon={LogOut} title="Kijelentkezés" showChevron={false} onClick={onLogout}/>
      </div>
    </div>
    <footer className="evo-profile-v3__footer">Evölingo</footer>

    {restartConfirm && <BottomSheet
      title="Fejlesztői szerver újraindítása?"
      description="A legújabb main commit betöltése megszakíthatja az aktuális munkamenetet."
      size="compact" dismissible={false} role="alertdialog"
      onClose={() => setRestartConfirm(false)}
      footer={<div className="evo-kit-confirm-actions">
        <UIButton variant="secondary" fullWidth onClick={() => setRestartConfirm(false)}>Mégse</UIButton>
        <UIButton fullWidth onClick={async () => {
          setRestartConfirm(false)
          setRestartState("busy")
          setRestartMessage("Frissítés és újraindítás…")
          try {
            const response = await fetch("/api/dev/restart", { method: "POST" })
            const data = await response.json() as { commit?: string; error?: string }
            if (!response.ok) throw new Error(data.error || "Az újraindítás nem sikerült.")
            setRestartMessage("Újraindítás a " + data.commit + " commiton…")
          } catch (error) {
            setRestartState("error")
            setRestartMessage(error instanceof Error ? error.message : "Az újraindítás nem sikerült.")
          }
        }}>Újraindítás</UIButton>
      </div>}
    >
      <p className="evo-kit-confirm-description">Folytatod a fejlesztői szerver frissítését és újraindítását?</p>
    </BottomSheet>}

    {profileSheet && <BottomSheet
      title={{
        security: "Biztonság",
        subscription: "Előfizetés",
        help: "Súgó és támogatás",
        about: "Az alkalmazásról",
        accessibility: "Kisegítő lehetőségek",
      }[profileSheet]}
      size={profileSheet === "accessibility" ? "medium" : "compact"}
      onClose={() => setProfileSheet(null)}
    >
      {profileSheet === "accessibility" ? <div className="evo-profile-v3__accessibility">
        <UISettingsSwitchRow
          icon={Accessibility} title="Animációk csökkentése"
          description="Kevesebb mozgás és áttűnés az alkalmazásban"
          checked={reducedMotion} onChange={changeReducedMotion}
        />
        <p>A szövegméretet és a további kisegítő beállításokat az iPhone vagy a böngésző rendszerbeállításaiban módosíthatod. Az animációs beállítást ezen az eszközön mentjük.</p>
      </div> : <div className="ref-profile-kit-sheet">
        {profileSheet === "help" ?
          <p>Az AI-csevegésben kérdéseket tehetsz fel, a fájljaidat a Könyvtárban, a feladataidat az Ütemezésben kezelheted.</p> :
        profileSheet === "about" ?
          <p>Az Evölingo AI-asszisztens beszélgetéshez, fájlkezeléshez és feladatok szervezéséhez.</p> :
          <>
            <p>{profileSheet === "security" ? "A biztonsági beállítások megnyitásához előbb jelentkezz be." : "Az előfizetési csomagok megtekintéséhez előbb jelentkezz be."}</p>
            <UIButton fullWidth onClick={onLogin}>Bejelentkezés</UIButton>
          </>
        }
      </div>}
    </BottomSheet>}

    {editing && <BottomSheet title="Profil szerkesztése" size="medium" dismissible={false} onClose={() => setEditing(false)}
      footer={<UIButton fullWidth type="submit" form="ref-profile-edit-form" disabled={!draft.trim()}>Mentés</UIButton>}
    >
      <form id="ref-profile-edit-form" className="ref-profile-kit-form" onSubmit={event => {
        event.preventDefault()
        if (!draft.trim()) return
        onEdit(draft.trim())
        setEditing(false)
      }}>
        <label htmlFor="ref-name">Megjelenített név</label>
        <input id="ref-name" value={draft} maxLength={32} autoComplete="nickname" onChange={event => setDraft(event.target.value)} />
        <input ref={avatarPicker} type="file" accept="image/*" hidden onChange={event => {
          const file = event.target.files?.[0]
          if (file) onEditAvatar(file)
          event.target.value = ""
        }} />
        <UIButton variant="secondary" fullWidth onClick={() => avatarPicker.current?.click()}>Profilkép módosítása</UIButton>
      </form>
    </BottomSheet>}
  </div>
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
