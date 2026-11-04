"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import UnifiedSheet from "./unified-sheet"
import { AppHeader } from "@/components/app-header"
import { RefreshCw, ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Eye, EyeOff, Info, LogIn, ShieldCheck, UserRound, X, Crown } from "lucide-react"

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

function Profile({ name, avatarImage, avatarFallback, onEdit, onEditAvatar, onLogin }: {
  name: string; avatarImage: string; avatarFallback: string; onEdit: (name: string) => void; onEditAvatar: (file: File) => void; onLogin: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [profileSheet, setProfileSheet] = useState<"security" | "subscription" | "help" | "about" | null>(null)
  const [restartState, setRestartState] = useState<"idle" | "busy" | "error">("idle")
  const [restartMessage, setRestartMessage] = useState("")
  const avatarPicker = useRef<HTMLInputElement>(null)
  const handle = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "tanulo"
  return <div className="ref-profile"><h1>Profil</h1><div className="ref-profile-identity"><Avatar name={name} src={avatarImage} fallback={avatarFallback} /><div><strong>{name}</strong><span>@{handle}</span></div><button type="button" className="ref-outline-pill" onClick={() => { setDraft(name); setEditing(true) }}>Szerkesztés</button></div><hr />
    <div className="ref-settings-group"><h2>Fiók</h2><SettingRow icon={LogIn} title="Bejelentkezés" subtitle="Fiók létrehozása vagy belépés" onClick={onLogin} /><SettingRow icon={UserRound} title="Személyes adatok" subtitle="Név, profilkép és felhasználónév" onClick={() => { setDraft(name); setEditing(true) }} /><SettingRow icon={ShieldCheck} title="Biztonság" subtitle="Jelszó és bejelentkezési védelem" onClick={() => setProfileSheet("security")} /><SettingRow icon={Crown} title="Előfizetés" subtitle="Csomagok és előfizetési előnyök" onClick={() => setProfileSheet("subscription")} /></div>
    <div className="ref-settings-group ref-support-group"><h2>Támogatás</h2><SettingRow icon={CircleHelp} title="Súgó és támogatás" subtitle="Segítség az AI-eszközök használatához" onClick={() => setProfileSheet("help")} /><SettingRow icon={Info} title="Az alkalmazásról" subtitle="Evölingo · AI-asszisztens" onClick={() => setProfileSheet("about")} /></div>
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
  else content = <Profile name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onEdit={props.onEditProfile} onEditAvatar={props.onEditAvatar} onLogin={() => onView("auth")} />
  return <main className={"ref-app ref-view-" + view}>{content}</main>
}
