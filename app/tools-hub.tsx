"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronRight, FolderOpen, Plus, Search, Users, X } from "lucide-react"
import UnifiedSheet from "./unified-sheet"

type ToolHubProps = {
  onUpload: () => void
  onOpenLibrary: () => void
  onFriends: () => void
  onLeaderboard: () => void
}

type Integration = {
  id: string
  title: string
  description: string
  icon: string
  detail: string
  keywords: string
}

// Directory only: a listing does not represent an installed or authorized connection.
const integrations: Integration[] = [
  {
    id: "gmail", title: "Gmail", description: "E-mailek és üzenetek",
    icon: "gmail.svg", detail: "E-mailek és mellékletek felhasználása a tanuláshoz.",
    keywords: "gmail google levelezes email",
  },
  {
    id: "google-drive", title: "Google Drive", description: "Fájlok és dokumentumok",
    icon: "drive.svg", detail: "Dokumentumok és tananyagok kiválasztása a Google Drive-ból.",
    keywords: "google drive felho fajl dokumentum",
  },
  {
    id: "google-calendar", title: "Google Naptár", description: "Naptár és események",
    icon: "google-calendar.svg", detail: "Tanulási események és határidők áttekintése.",
    keywords: "google calendar naptar esemenyek",
  },
  {
    id: "github", title: "GitHub", description: "Projektek és adattárak",
    icon: "github.svg", detail: "Projektek, kódtárak és dokumentációk elérése.",
    keywords: "github kod repozitorium fejlesztes",
  },
  {
    id: "notion", title: "Notion", description: "Jegyzetek és tudásbázisok",
    icon: "notion.svg", detail: "Jegyzetek és tanulási anyagok elérése.",
    keywords: "notion jegyzetek tanulas",
  },
  {
    id: "slack", title: "Slack", description: "Csapatok és beszélgetések",
    icon: "slack.svg", detail: "Tanuláshoz kapcsolódó csatornák és üzenetek elérése.",
    keywords: "slack chat uzenetek csapat",
  },
]

function normalize(value: string) {
  return value.toLocaleLowerCase("hu").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

function ProviderLogo({ provider }: { provider: Integration }) {
  return <span className="evo-tools-provider-logo">
    <img
      src={"/icons/svgl/" + provider.icon}
      alt=""
      width={39}
      height={39}
      loading="lazy"
    />
  </span>
}

export default function ToolsHub({ onUpload, onOpenLibrary, onFriends, onLeaderboard }: ToolHubProps) {
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [requestedProviders, setRequestedProviders] = useState<string[]>([])
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [storage, setStorage] = useState<{ used: number; total: number } | null>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("evolingo.integration-interest.v1") || "[]")
      setRequestedProviders(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [])
    } catch { setRequestedProviders([]) }

    // The library supports local files, with server-backed space when available.
    // Only show a quota meter when the API supplies a genuine used/total value.
    try {
      const local = JSON.parse(localStorage.getItem("evolingo.space.v1") || "[]")
      if (Array.isArray(local)) setFileCount(local.filter(entry => entry && entry.kind !== "folder").length)
    } catch {}

    let cancelled = false
    fetch("/api/space", { cache: "no-store" }).then(async response => {
      if (!response.ok) return null
      return response.json() as Promise<{
        available?: boolean
        entries?: { kind?: string }[]
        storageUsed?: number
        storageTotal?: number
      }>
    }).then(data => {
      if (cancelled || !data || data.available !== true) return
      if (Array.isArray(data.entries)) setFileCount(data.entries.filter(entry => entry.kind !== "folder").length)
      if (typeof data.storageUsed === "number" && Number.isFinite(data.storageUsed) &&
          typeof data.storageTotal === "number" && Number.isFinite(data.storageTotal) && data.storageTotal > 0) {
        setStorage({ used: Math.max(0, data.storageUsed), total: data.storageTotal })
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const search = normalize(query)
  const matches = (value: string) => normalize(value).includes(search)
  const storageActions = useMemo(() => [
    { id: "library", name: "Könyvtár", description: fileCount === null ? "Saját fájlok" : fileCount + " fájl", Icon: FolderOpen, action: onOpenLibrary },
    { id: "upload", name: "Új fájl", description: "Fájl feltöltése", Icon: Plus, action: onUpload },
  ], [fileCount, onOpenLibrary, onUpload])
  const visibleStorage = storageActions.filter(item => matches(item.name + " " + item.description + " fájl tárhely felhő"))
  const community = [
    { id: "friends", name: "Barátok", description: "Kapcsolatok és közös tanulás", Icon: Users, action: onFriends },
    { id: "leaderboard", name: "Ranglista", description: "Heti verseny csillagokért", Icon: BarChart3, action: onLeaderboard },
  ]
  const visibleCommunity = community.filter(item => matches(item.name + " " + item.description))
  const matchingIntegrations = integrations.filter(item => matches(item.title + " " + item.description + " " + item.keywords))
  const visibleIntegrations = search || showAll ? matchingIntegrations : matchingIntegrations.slice(0, 5)
  const selected = integrations.find(item => item.id === selectedId)
  const usage = storage && storage.total > 0 ? Math.min(100, Math.max(0, 100 * storage.used / storage.total)) : null
  const hasResults = visibleStorage.length + visibleCommunity.length + matchingIntegrations.length > 0

  const saveInterest = (id: string) => {
    const next = Array.from(new Set([...requestedProviders, id]))
    setRequestedProviders(next)
    try { localStorage.setItem("evolingo.integration-interest.v1", JSON.stringify(next)) } catch {}
  }

  return <div className="ref-utility evo-tools-hub">
    <label className="evo-tools-search">
      <Search size={23} strokeWidth={1.75} aria-hidden="true" />
      <input
        type="search"
        autoComplete="off"
        aria-label="Alkalmazások és eszközök keresése"
        placeholder="Alkalmazások keresése"
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery("")}><X size={18} /></button>}
    </label>

    {visibleStorage.length > 0 && <section className="evo-tools-storage-section" aria-labelledby="evo-tools-storage-title">
      <div className="evo-tools-storage-heading">
        <h1 id="evo-tools-storage-title">{storage ? "Felhőtárhely" : "Tárhely"}</h1>
        {usage !== null ? <div className="evo-tools-storage-usage">
          <div className="evo-tools-storage-track" role="progressbar" aria-label="Tárhelyhasználat" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage)}>
            <span style={{ width: usage + "%" }} />
          </div>
        </div> : <span className="evo-tools-storage-subtitle">Helyi fájlok</span>}
      </div>
      <div className="evo-tools-storage-grid">
        {visibleStorage.map(({ id, name, description, Icon, action }) =>
          <button key={id} type="button" className="evo-tools-storage-card" onClick={action}>
            <span className="evo-tools-card-top"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            <span className="evo-tools-card-bottom"><strong>{name}</strong><small>{description}</small></span>
          </button>
        )}
      </div>
    </section>}

    {visibleIntegrations.length > 0 && <section className="evo-tools-apps-section" aria-labelledby="evo-tools-apps-title">
      <div className="evo-tools-section-heading">
        <h2 id="evo-tools-apps-title">Alkalmazások</h2>
        {!search && <button className="evo-tools-discover" type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>
          {showAll ? "Kevesebb" : "Felfedezés"}
        </button>}
      </div>
      <div className="evo-tools-apps-list">
        {visibleIntegrations.map(provider =>
          <button key={provider.id} type="button" className="evo-tools-app-row" onClick={() => setSelectedId(provider.id)} aria-label={provider.title + " részletei"}>
            <ProviderLogo provider={provider} />
            <span className="evo-tools-row-copy"><strong>{provider.title}</strong><small>{provider.description}</small></span>
            <ChevronRight size={21} strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>}

    {visibleCommunity.length > 0 && <section className="evo-tools-community-section" aria-labelledby="evo-tools-community-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-community-title">Közösség</h2></div>
      <div className="evo-tools-apps-list">
        {visibleCommunity.map(({ id, name, description, Icon, action }) =>
          <button key={id} type="button" className="evo-tools-app-row" onClick={action}>
            <span className="evo-tools-community-icon"><Icon size={23} strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="evo-tools-row-copy"><strong>{name}</strong><small>{description}</small></span>
            <ChevronRight size={21} strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>}

    {!hasResults && <div className="evo-tools-empty">
      <Search size={25} strokeWidth={1.6} aria-hidden="true" />
      <strong>Nincs találat</strong>
      <p>Próbálj másik keresőkifejezést.</p>
      <button type="button" onClick={() => setQuery("")}>Keresés törlése</button>
    </div>}

    {selected && <UnifiedSheet
      backdropClassName="evo-tools-dialog-backdrop"
      sheetClassName="evo-tools-dialog"
      labelledBy="evo-tools-dialog-title"
      onClose={() => setSelectedId(null)}
    >
      <div className="evo-tools-dialog-heading">
        <h2 id="evo-tools-dialog-title">{selected.title}</h2>
        <button type="button" className="evo-tools-dialog-close" aria-label="Bezárás" onClick={() => setSelectedId(null)}><X size={20} /></button>
      </div>
      <ProviderLogo provider={selected} />
      <p>{selected.detail}</p>
      <div className="evo-tools-dialog-status">Ez az integráció még nem csatlakoztatható az Evölingóhoz.</div>
      <button
        className="evo-tools-dialog-connect"
        type="button"
        disabled={requestedProviders.includes(selected.id)}
        onClick={() => saveInterest(selected.id)}
      >{requestedProviders.includes(selected.id) ? "Érdeklődés mentve" : "Érdekel ez az integráció"}</button>
      <p className="evo-tools-dialog-footnote">Az érdeklődés csak ezen az eszközön mentődik; nem jelent feliratkozást vagy értesítést.</p>
    </UnifiedSheet>}
  </div>
}
