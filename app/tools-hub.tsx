"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, BarChart3, CalendarDays, ChevronRight, Search, Send, Users, X } from "lucide-react"

type Filter = "all" | "mine" | "plugins"
type ToolHubProps = {
  onUpload: () => void
  onFriends: () => void
  onLeaderboard: () => void
}

type Integration = {
  id: string
  title: string
  description: string
  logo: string
  keywords: string
}

// These are directory entries, not installed integrations. Only an authenticated
// server response can promote a provider to the user's connected section.
const integrations: Integration[] = [
  { id: "google-drive", title: "Google Drive", description: "Dokumentumok és fájlok elérése.", logo: "googledrive", keywords: "google drive dokumentumok felhő fájlok" },
  { id: "notion", title: "Notion", description: "Jegyzetek és tanulási anyagok.", logo: "notion", keywords: "notion jegyzetek tanulás" },
  { id: "github", title: "GitHub", description: "Projektek és kódtárak.", logo: "github", keywords: "github kód fejlesztés" },
  { id: "slack", title: "Slack", description: "Csapatok és beszélgetések.", logo: "slack", keywords: "slack üzenetek csapat" },
]

const normalize = (value: string) => value.toLocaleLowerCase("hu").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

export default function ToolsHub({ onUpload, onFriends, onLeaderboard }: ToolHubProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const search = normalize(query)
  const matches = (value: string) => normalize(value).includes(search)
  const nativeVisible = filter !== "plugins"
  const integrationsVisible = filter !== "mine"
  const creation = useMemo(() => [
    { id: "send", name: "Fájlküldés", description: "Fájlok megosztása", icon: Send, action: onUpload, available: true },
    { id: "planner", name: "Tervező", description: "Tervek és időbeosztás", icon: CalendarDays, action: undefined, available: false },
  ], [onUpload])
  const community = [
    { id: "friends", name: "Barátok", description: "Kapcsolatok", icon: Users, action: onFriends },
    { id: "leaderboard", name: "Tanterem és ranglista", description: "Közösség és eredmények", icon: BarChart3, action: onLeaderboard },
  ]
  const visibleCreation = nativeVisible ? creation.filter(item => matches(item.name + " " + item.description)) : []
  const visibleCommunity = nativeVisible ? community.filter(item => matches(item.name + " " + item.description)) : []
  const visibleIntegrations = integrationsVisible ? integrations.filter(item => matches(item.title + " " + item.description + " " + item.keywords)) : []
  const selected = integrations.find(item => item.id === selectedProvider)
  const hasResults = visibleCreation.length + visibleCommunity.length + visibleIntegrations.length > 0

  return <div className="ref-utility evo-tools-hub">
    <header className="evo-tools-heading">
      <h1>Eszközök</h1>
      <p>Minden eszközöd egy helyen.</p>
    </header>

    <label className="evo-tools-search">
      <Search size={20} strokeWidth={1.8} aria-hidden="true" />
      <input type="search" aria-label="Eszközök és bővítmények keresése" placeholder="Keresés az eszközök között" value={query} onChange={event => setQuery(event.target.value)} />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery("")}><X size={18} /></button>}
    </label>

    <div className="evo-tools-filters" role="group" aria-label="Eszközök szűrése">
      {([["all", "Összes"], ["mine", "Saját"], ["plugins", "Bővítmények"]] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={filter === id} className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)}>{label}</button>
      )}
    </div>

    {visibleCreation.length > 0 && <section className="evo-tools-section" aria-labelledby="evo-tools-native-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-native-title">Alkotás és szervezés</h2><span>Beépített</span></div>
      <div className="evo-tools-creation-grid">
        {visibleCreation.map(({ id, name, description, icon: Icon, action, available }) =>
          <button key={id} type="button" className="evo-tools-creation-card" onClick={action} disabled={!available} aria-label={available ? name : name + " – hamarosan"}>
            <span className="evo-tools-icon"><Icon size={23} strokeWidth={1.8} /></span>
            <strong>{name}</strong>
            <small>{available ? description : "Hamarosan"}</small>
            {available && <ArrowUpRight className="evo-tools-card-arrow" size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>}

    {visibleCommunity.length > 0 && <section className="evo-tools-section" aria-labelledby="evo-tools-community-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-community-title">Közösség</h2><span>Beépített</span></div>
      <div className="evo-tools-list">
        {visibleCommunity.map(({ id, name, description, icon: Icon, action }) =>
          <button key={id} type="button" className="evo-tools-nav-row" onClick={action}>
            <span className="evo-tools-icon"><Icon size={23} strokeWidth={1.8} /></span>
            <span className="evo-tools-row-copy"><strong>{name}</strong><small>{description}</small></span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>}

    {integrationsVisible && <section className="evo-tools-section" aria-labelledby="evo-tools-plugins-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-plugins-title">Bővítmények</h2><span>{visibleIntegrations.length} elérhető szolgáltató</span></div>
      {visibleIntegrations.length > 0 && <div className="evo-tools-list">
        {visibleIntegrations.map(provider => <div className="evo-tools-integration-row" key={provider.id}>
          <span className="evo-tools-provider-logo">
            <img src={`https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${provider.logo}.svg`} alt="" loading="lazy" width="27" height="27" />
          </span>
          <span className="evo-tools-row-copy"><strong>{provider.title}</strong><small>{provider.description}</small></span>
          <button type="button" className="evo-tools-connect" onClick={() => setSelectedProvider(provider.id)} aria-label={provider.title + " csatlakoztatási lehetőségei"}>Részletek</button>
        </div>)}
      </div>}
      <p className="evo-tools-disclaimer">A szolgáltatók megjelenése nem jelent aktív kapcsolatot. Csatlakoztatás csak hitelesített engedélyezési folyamattal lehetséges.</p>
    </section>}

    {!hasResults && <div className="evo-tools-empty"><Search size={24} strokeWidth={1.7} /><strong>Nincs találat</strong><p>Próbálj másik keresőkifejezést, vagy válassz másik szűrőt.</p><button type="button" onClick={() => { setQuery(""); setFilter("all") }}>Összes megjelenítése</button></div>}

    {selected && <div className="evo-tools-dialog-backdrop" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) setSelectedProvider(null) }}>
      <section className="evo-tools-dialog" role="dialog" aria-modal="true" aria-labelledby="evo-tools-dialog-title">
        <button type="button" className="evo-tools-dialog-close" aria-label="Bezárás" onClick={() => setSelectedProvider(null)}><X size={20} /></button>
        <span className="evo-tools-provider-logo"><img src={`https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${selected.logo}.svg`} alt="" width="28" height="28" /></span>
        <h2 id="evo-tools-dialog-title">{selected.title}</h2>
        <p>{selected.description}</p>
        <div className="evo-tools-dialog-status">Még nincs beállítva az Evölingo hitelesített kapcsolata ehhez a szolgáltatóhoz.</div>
        <button type="button" disabled className="evo-tools-dialog-connect">Csatlakozás nem elérhető</button>
        <p className="evo-tools-dialog-footnote">A csatlakozás akkor válik elérhetővé, ha a szolgáltató valódi engedélyezési folyamata be van kötve.</p>
      </section>
    </div>}
  </div>
}
