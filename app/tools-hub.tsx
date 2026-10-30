"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, BarChart3, ChevronRight, Search, Send, Users, X } from "lucide-react"
import UnifiedSheet from "./unified-sheet"

type Filter = "all" | "learning" | "community" | "integrations"
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
  const [requestedProviders, setRequestedProviders] = useState<string[]>([])
  useEffect(() => {
    try { setRequestedProviders(JSON.parse(localStorage.getItem("evolingo.integration-interest.v1") || "[]") as string[]) } catch { setRequestedProviders([]) }
  }, [])
  const search = normalize(query)
  const matches = (value: string) => normalize(value).includes(search)
  const creation = useMemo(() => [
    { id: "send", name: "Tananyag feltöltése", description: "Dokumentum hozzáadása a tanuláshoz", icon: Send, action: onUpload, available: true },
  ], [onUpload])
  const community = [
    { id: "friends", name: "Barátok", description: "Kapcsolatok és közös tanulás", icon: Users, action: onFriends },
    { id: "leaderboard", name: "Ranglista", description: "Heti verseny csillagokért", icon: BarChart3, action: onLeaderboard },
  ]
  const visibleCreation = filter === "all" || filter === "learning" ? creation.filter(item => matches(item.name + " " + item.description)) : []
  const visibleCommunity = filter === "all" || filter === "community" ? community.filter(item => matches(item.name + " " + item.description)) : []
  const visibleIntegrations = filter === "all" || filter === "integrations" ? integrations.filter(item => matches(item.title + " " + item.description + " " + item.keywords)) : []
  const selected = integrations.find(item => item.id === selectedProvider)
  const hasResults = visibleCreation.length + visibleCommunity.length + visibleIntegrations.length > 0

  return <div className="ref-utility evo-tools-hub">
    <header className="evo-tools-heading">
      <h1>Eszközök</h1>
      <p>Minden eszközöd egy helyen.</p>
    </header>

    <label className="evo-tools-search">
      <Search size={20} strokeWidth={1.75} aria-hidden="true" />
      <input type="search" aria-label="Eszközök és integrációk keresése" placeholder="Keresés az eszközök között" value={query} onChange={event => setQuery(event.target.value)} />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery("")}><X size={18} /></button>}
    </label>

    <div className="evo-tools-filters" role="group" aria-label="Eszközök szűrése">
      {([["all", "Mind"], ["learning", "Tanulás"], ["community", "Közösség"], ["integrations", "Integrációk"]] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={filter === id} className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)}>{label}</button>
      )}
    </div>

    {visibleCreation.length > 0 && <section className="evo-tools-section" aria-labelledby="evo-tools-native-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-native-title">Tanulás</h2></div>
      <div className="evo-tools-creation-grid">
        {visibleCreation.map(({ id, name, description, icon: Icon, action, available }) =>
          <button key={id} type="button" className="evo-tools-creation-card" onClick={action} disabled={!available} aria-label={available ? name : name + " – hamarosan"}>
            <span className="evo-tools-icon"><Icon size={23} strokeWidth={1.75} /></span>
            <strong>{name}</strong>
            <small>{available ? description : "Hamarosan"}</small>
            {available && <ArrowUpRight className="evo-tools-card-arrow" size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>}

    {visibleCommunity.length > 0 && <section className="evo-tools-section" aria-labelledby="evo-tools-community-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-community-title">Közösség</h2></div>
      <div className="evo-tools-list">
        {visibleCommunity.map(({ id, name, description, icon: Icon, action }) =>
          <button key={id} type="button" className="evo-tools-nav-row" onClick={action}>
            <span className="evo-tools-icon"><Icon size={23} strokeWidth={1.75} /></span>
            <span className="evo-tools-row-copy"><strong>{name}</strong><small>{description}</small></span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>}

    {(filter === "all" || filter === "integrations") && <section className="evo-tools-section" aria-labelledby="evo-tools-plugins-title">
      <div className="evo-tools-section-heading"><h2 id="evo-tools-plugins-title">Integrációk</h2><span>{visibleIntegrations.length} szolgáltató</span></div>
      {visibleIntegrations.length > 0 && <div className="evo-tools-list">
        {visibleIntegrations.map(provider => <div className="evo-tools-integration-row" key={provider.id}>
          <span className="evo-tools-provider-logo">
            <img src={`https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${provider.logo}.svg`} alt="" loading="lazy" width="27" height="27" />
          </span>
          <span className="evo-tools-row-copy"><strong>{provider.title}</strong><small>{provider.description}</small><span className="evo-tools-coming-badge">Hamarosan</span></span>
          <button type="button" className="evo-tools-connect" onClick={() => setSelectedProvider(provider.id)} aria-label={provider.title + " részletei"}><ChevronRight size={19} aria-hidden="true" /></button>
        </div>)}
      </div>}
      <p className="evo-tools-disclaimer">A szolgáltatók megjelenése nem jelent aktív kapcsolatot. Csatlakoztatás csak hitelesített engedélyezési folyamattal lehetséges.</p>
    </section>}

    {!hasResults && <div className="evo-tools-empty"><Search size={24} strokeWidth={1.75} /><strong>Nincs találat</strong><p>Próbálj másik keresőkifejezést, vagy válassz másik szűrőt.</p><button type="button" onClick={() => { setQuery(""); setFilter("all") }}>Összes megjelenítése</button></div>}

    {selected && <UnifiedSheet backdropClassName="evo-tools-dialog-backdrop" sheetClassName="evo-tools-dialog" labelledBy="evo-tools-dialog-title" onClose={() => setSelectedProvider(null)}>
        <div className="evo-unified-sheet-header"><h2 id="evo-tools-dialog-title">{selected.title}</h2><button type="button" className="evo-tools-dialog-close" aria-label="Bezárás" onClick={() => setSelectedProvider(null)}><X size={20} /></button></div>
        <span className="evo-tools-provider-logo"><img src={`https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/${selected.logo}.svg`} alt="" width="28" height="28" /></span>
        <p>{selected.description}</p>
        <div className="evo-tools-dialog-status">{selected.id === "google-drive" ? "A Google Drive-ból közvetlenül választhatsz majd dokumentumokat és tananyagokat." : selected.id === "notion" ? "A Notion-oldalaidat és jegyzeteidet kapcsolhatod majd a tanulási anyagaidhoz." : selected.id === "github" ? "A GitHub-projektjeid dokumentációját és kódtárait érheted majd el." : "A Slack-csatornákból származó fontos tanulási anyagokat kapcsolhatod majd össze."}</div>
        <button type="button" className="evo-tools-dialog-connect" onClick={() => {
          const next = Array.from(new Set([...requestedProviders, selected.id]))
          setRequestedProviders(next)
          try { localStorage.setItem("evolingo.integration-interest.v1", JSON.stringify(next)) } catch {}
        }}>{requestedProviders.includes(selected.id) ? "Értesítést kérek · mentve" : "Értesíts, ha elérhető"}</button>
        <p className="evo-tools-dialog-footnote">Az érdeklődésed ezen az eszközön mentjük; értesítést még nem tudunk küldeni.</p>
    </UnifiedSheet>}
  </div>
}
