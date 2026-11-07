"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import AppTabBar, { type AppTab } from "./app-tab-bar"
import ReferenceScreens, { type ReferenceView } from "./reference-screens"

type PublicProfile = {
  userName: string
  avatarImage: string
  notifications: boolean
  compactMode: boolean
}
const PROFILE_CACHE = "evolingo.ai.profile.v1"
const DEFAULT_PROFILE: PublicProfile = {
  userName: "Evölingo vendég",
  avatarImage: "",
  notifications: false,
  compactMode: false,
}
const TAB_PATH: Record<AppTab, string> = {
  ai: "/chat",
  cowork: "/cowork",
  schedule: "/utemezes",
  files: "/konyvtar",
  tools: "/eszkozok",
  profile: "/profil",
  brainstorm: "/otletborze",
}
const ROUTE_VIEW: Record<string, ReferenceView> = {
  "/chat": "chat",
  "/cowork": "cowork",
  "/eszkozok": "utility",
  "/konyvtar": "space",
  "/utemezes": "schedule",
  "/profil": "profile",
  "/otletborze": "brainstorm",
  "/belepes": "auth",
  "/regisztracio": "auth",
}
function isAvatarImage(value: unknown): value is string {
  return typeof value === "string" && (value === "" || value.startsWith("data:image/")) && value.length <= 5_000_000
}
function loadCachedProfile(): PublicProfile | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(PROFILE_CACHE) || "null")
    if (!data || typeof data !== "object") return null
    const record = data as Record<string, unknown>
    return {
      userName: typeof record.userName === "string" && record.userName.trim() ? record.userName.slice(0, 32) : DEFAULT_PROFILE.userName,
      avatarImage: isAvatarImage(record.avatarImage) ? record.avatarImage : "",
      notifications: record.notifications === true,
      compactMode: record.compactMode === true,
    }
  } catch { return null }
}

export default function App() {
  const pathname = usePathname()
  const router = useRouter()
  const view = ROUTE_VIEW[pathname] ?? null
  const [profile, setProfile] = useState<PublicProfile>(DEFAULT_PROFILE)
  const [message, setMessage] = useState("")
  const hydrated = useRef(false)

  useEffect(() => {
    const local = loadCachedProfile()
    if (local) setProfile(local)
    hydrated.current = true
    let canceled = false
    fetch("/api/state", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Profile unavailable")
        return response.json() as Promise<{ state?: Record<string, unknown> }>
      })
      .then(result => {
        if (canceled || !result.state) return
        const data = result.state
        setProfile(previous => ({
          userName: typeof data.userName === "string" && data.userName.trim() ? data.userName.slice(0, 32) : previous.userName,
          avatarImage: isAvatarImage(data.avatarImage) ? data.avatarImage : previous.avatarImage,
          notifications: typeof data.notifications === "boolean" ? data.notifications : previous.notifications,
          compactMode: typeof data.compactMode === "boolean" ? data.compactMode : previous.compactMode,
        }))
      })
      .catch(() => {
        // The guest profile remains usable from the local cache without MongoDB.
      })
    return () => { canceled = true }
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    try { localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile)) } catch {}
  }, [profile])

  useEffect(() => {
    if (view !== "chat") window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname, view])

  const updateProfile = useCallback((patch: Partial<PublicProfile>) => {
    setProfile(current => ({ ...current, ...patch }))
    setMessage("")
    const payload = { ...patch, clientUpdatedAt: Date.now() }
    void fetch("/api/state", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(response => {
      if (!response.ok) throw new Error("Save unavailable")
    }).catch(() => setMessage("A módosítás csak ezen az eszközön lett elmentve."))
  }, [])

  const changeAvatar = useCallback((file: File) => {
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      setMessage("Válassz egy legfeljebb 2 MB méretű képet.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (isAvatarImage(reader.result)) updateProfile({ avatarImage: reader.result })
      else setMessage("A profilképet nem sikerült beolvasni.")
    }
    reader.onerror = () => setMessage("A profilképet nem sikerült beolvasni.")
    reader.readAsDataURL(file)
  }, [updateProfile])

  const navigate = useCallback((next: ReferenceView) => {
    const paths: Record<ReferenceView, string> = {
      cowork: "/cowork", chat: "/chat", schedule: "/utemezes", space: "/konyvtar", utility: "/eszkozok",
      brainstorm: "/otletborze", profile: "/profil", auth: "/belepes",
    }
    router.push(paths[next])
  }, [router])

  const uploadFromTools = useCallback(() => {
    router.push("/konyvtar?upload=1")
  }, [router])

  const activeTab: AppTab = pathname === "/cowork" ? "cowork"
    : pathname === "/utemezes" ? "schedule"
    : pathname === "/konyvtar" ? "files"
    : pathname === "/eszkozok" ? "tools"
    : pathname === "/profil" ? "profile"
    : pathname === "/otletborze" ? "brainstorm"
    : "ai"

  // The catch-all page owns the real 404. Do not mount a chat composer behind it.
  if (!view) return null

  return <>
    <main className="app-shell reference-shell evo-ai-app-shell">
      <section className="screen-content evo-ai-screen-content">
        <ReferenceScreens
          view={view}
          userName={profile.userName}
          avatarImage={profile.avatarImage}
          avatarFallback="/images/evolingo-ai-orb.svg"
          onView={navigate}
          onUploadFile={uploadFromTools}
          registerAuth={pathname === "/regisztracio"}
          onAuthModeChange={register => router.push(register ? "/regisztracio" : "/belepes")}
          onAppBack={() => router.push("/chat")}
          onEditProfile={name => updateProfile({ userName: name })}
          onEditAvatar={changeAvatar}
          notifications={profile.notifications}
          onChangeNotifications={enabled => updateProfile({ notifications: enabled })}
          onLogout={() => setMessage("Vendégfiókból nem szükséges kijelentkezni.")}
        />
      </section>
    </main>
    {view !== "auth" && <AppTabBar
      activeTab={activeTab}
      onSelect={tab => router.push(TAB_PATH[tab])}
      avatarImage={profile.avatarImage}
      avatar="fox"
      userName={profile.userName}
    />}
    {message && <div className="evo-ai-profile-notice" role="status">
      <span>{message}</span>
      <button type="button" onClick={() => setMessage("")} aria-label="Értesítés bezárása">Rendben</button>
    </div>}
  </>
}
