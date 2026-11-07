"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { BottomSheet } from "./evo-ui-kit"
import { UIButton } from "./evo-ui-kit/button"
import { UISettingsGroup, UISettingsRow, UISettingsSwitchRow } from "./evo-ui-kit/settings"
import { AppHeader } from "@/components/app-header"
import { RefreshCw, ArrowUp, ArrowUpRight, Plus, SlidersHorizontal, ChevronDown, Ellipsis, Check, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Eye, EyeOff, Info, LogIn, ShieldCheck, UserRound, X, Crown, Bell, FolderOpen, CalendarDays, Settings2, LogOut, Component, Search, Pencil, Palette, Accessibility, Languages, Plug } from "lucide-react"

const Brainstorm = dynamic(() => import("./brainstorm"), { ssr: false })
const LibrarySpace = dynamic(() => import("./library-space"), { ssr: false })
const ToolsHub = dynamic(() => import("./tools-hub"), { ssr: false })
const Schedule = dynamic(() => import("./schedule"), { ssr: false })
const ChatInterface = dynamic(() => import("./chat-interface"), { ssr: false })
const Cowork = dynamic(() => import("./cowork"), { ssr: false })
const DemoLibrary = dynamic(() => import("./ui-library-screen"), { ssr: false })

export type ReferenceView = "cowork" | "chat" | "brainstorm" | "schedule" | "space" | "utility" | "profile" | "auth"
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
  if (view === "cowork") content = <Cowork />
  else if (view === "chat") content = <ChatInterface />
  else if (view === "brainstorm") content = <Brainstorm />
  else if (view === "schedule") content = <Schedule />
  else if (view === "space") content = <LibrarySpace />
  else if (view === "utility") content = <ToolsHub onUpload={props.onUploadFile} onOpenLibrary={() => onView("space")} />
  else if (view === "auth") content = <AuthScreen onBack={props.onAppBack} initialRegister={props.registerAuth} onModeChange={props.onAuthModeChange} />
  else content = <Profile name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onEdit={props.onEditProfile} onEditAvatar={props.onEditAvatar} onLogin={() => onView("auth")}
    onView={onView} notifications={props.notifications} onChangeNotifications={props.onChangeNotifications} onLogout={props.onLogout} />
  return <main className={"ref-app ref-view-" + view}>{content}</main>
}
