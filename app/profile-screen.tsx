"use client"
import { useEffect, useRef, useState } from "react"
import "./profile-v3.css"
import { BottomSheet } from "./evo-ui-kit"
import { UIButton } from "./evo-ui-kit/button"
import { UISettingsGroup, UISettingsRow, UISettingsSwitchRow } from "./evo-ui-kit/settings"
import { IconRefresh as RefreshCw, IconAdjustmentsHorizontal as SlidersHorizontal, IconHelpCircle as CircleHelp, IconInfoCircle as Info, IconLogin as LogIn, IconShieldCheck as ShieldCheck, IconUser as UserRound, IconCrown as Crown, IconBell as Bell, IconLogout as LogOut, IconComponents as Component, IconPencil as Pencil, IconPalette as Palette, IconAccessible as Accessibility, IconLanguage as Languages, IconPlug as Plug, IconDownload as Download } from "@tabler/icons-react"
import dynamic from "next/dynamic"
import type { ReferenceView } from "./reference-screens"
import { readChatSessions } from "./chat-sessions"

const DemoLibrary = dynamic(() => import("./ui-library-screen"), { ssr: false })

function Avatar({ name, src, fallback }: { name: string; src: string; fallback: string }) {
  return <span className="ref-avatar">{src ? <img src={src} alt={name} /> : <span className="ref-avatar-fallback"><img src={fallback} alt="" /></span>}</span>
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : JSON.parse(value) as T
  } catch { return fallback }
}

export default function Profile({ name, avatarImage, avatarFallback, onEdit, onEditAvatar, onLogin, onView, notifications, onChangeNotifications, onLogout }: {
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
  const [exportMessage, setExportMessage] = useState("")
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

  const exportForNativeApp = () => {
    try {
      let legacyChatMessages: unknown[] = []
      try {
        const raw = sessionStorage.getItem("evolingo.chat.session.v1")
        const value: unknown = raw ? JSON.parse(raw) : []
        if (Array.isArray(value)) legacyChatMessages = value
      } catch {}
      const coworkMessages = readLocalJSON<unknown[]>("evolingo.cowork.messages.v1", [])
      const schedule = readLocalJSON<unknown[]>("evolingo.schedule.v1", [])
      const spaceEntries = readLocalJSON<Array<{ id?: unknown; name?: unknown; kind?: unknown; parent?: unknown }>>("evolingo.space.v1", [])
        .filter(item => typeof item.id === "string" && typeof item.name === "string" && typeof item.kind === "string")
      const spaceBlobs = readLocalJSON<Record<string, string>>("evolingo.space-blobs.v1", {})
      const machines = readLocalJSON<Array<{ id?: unknown; name?: unknown; url?: unknown }>>("evolingo.utility.machines.v1", [])
        .filter(item => typeof item.id === "string" && typeof item.name === "string" && typeof item.url === "string")
      const transfer = {
        format: "evolingo-ios-transfer",
        version: 1,
        exportedAt: new Date().toISOString(),
        chatSessions: readChatSessions(),
        activeChatSessionID: localStorage.getItem("evolingo.chat.active-session.v1"),
        legacyChatMessages,
        coworkMessages,
        schedule,
        spaceEntries,
        spaceBlobs,
        profile: readLocalJSON("evolingo.ai.profile.v1", null),
        integrationInterests: readLocalJSON<string[]>("evolingo.integration-interest.v1", []),
        machines,
      }
      const blob = new Blob([JSON.stringify(transfer)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "evolingo-ios-transfer.json"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
      setExportMessage("Export letöltve. Mentsd a Fájlokba, majd az iOS app Profil → Adatok importálása menüjében válaszd ki.")
    } catch {
      setExportMessage("Az export nem sikerült. Ellenőrizd, hogy a böngésző engedélyezi-e a letöltést.")
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

      <UISettingsGroup title="Adatok átvitele">
        <UISettingsRow icon={Download} title="Exportálás iOS-apphoz" description="Beszélgetések, feladatok, fájlok és beállítások" onClick={exportForNativeApp} />
        <p className="evo-profile-v3__hint">Az export privát beszélgetéseket és fájltartalmakat is tartalmazhat. Csak a saját iPhone-odra mentsd.</p>
        {exportMessage && <p className="evo-profile-v3__hint" role="status">{exportMessage}</p>}
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

