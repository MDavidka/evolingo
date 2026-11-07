"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, ExternalLink, FolderOpen, Plus, Search, Server, Trash2, X } from "lucide-react"
import { BottomSheet, UIButton } from "./evo-ui-kit"

type ToolHubProps = {
  onUpload: () => void
  onOpenLibrary: () => void
}

type MachineRecord = { id: string; name: string; url: string }
const MACHINES_KEY = "evolingo.utility.machines.v1"

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

export default function ToolsHub({ onUpload, onOpenLibrary }: ToolHubProps) {
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [requestedProviders, setRequestedProviders] = useState<string[]>([])
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [storage, setStorage] = useState<{ used: number; total: number } | null>(null)
  const [machines, setMachines] = useState<MachineRecord[]>([])
  const [machineForm, setMachineForm] = useState(false)
  const [machineInfo, setMachineInfo] = useState<string | null>(null)
  const [machineDeleteConfirm, setMachineDeleteConfirm] = useState(false)
  const [machineName, setMachineName] = useState("")
  const [machineUrl, setMachineUrl] = useState("")
  const [machineError, setMachineError] = useState("")

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("evolingo.integration-interest.v1") || "[]")
      setRequestedProviders(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [])
    } catch { setRequestedProviders([]) }

    try {
      const storedMachines = JSON.parse(localStorage.getItem(MACHINES_KEY) || "[]") as MachineRecord[]
      if (Array.isArray(storedMachines)) setMachines(storedMachines.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.url === "string"))
    } catch {}

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
    { id: "library", name: "Saját tárhely", description: fileCount === null ? "Fájlok" : fileCount + " fájl", Icon: FolderOpen, action: onOpenLibrary },
    ...machines.map(machine => ({ id: machine.id, name: machine.name, description: "Külső gép · vezérlőpult", Icon: Server, action: () => setMachineInfo(machine.id) })),
    { id: "new-machine", name: "Új gép", description: "Szerver hozzáadása", Icon: Plus, action: () => { setMachineName(""); setMachineUrl(""); setMachineError(""); setMachineForm(true) } },
  ], [fileCount, onOpenLibrary, machines])
  const visibleStorage = storageActions.filter(item => matches(item.name + " " + item.description + " fájl tárhely felhő"))
  const matchingIntegrations = integrations.filter(item => matches(item.title + " " + item.description + " " + item.keywords))
  const visibleIntegrations = search || showAll ? matchingIntegrations : matchingIntegrations.slice(0, 3)
  const selected = integrations.find(item => item.id === selectedId)
  const usage = storage && storage.total > 0 ? Math.min(100, Math.max(0, 100 * storage.used / storage.total)) : null
  const hasResults = visibleStorage.length + matchingIntegrations.length > 0

  const persistMachines = (next: MachineRecord[]) => {
    try {
      localStorage.setItem(MACHINES_KEY, JSON.stringify(next))
      setMachines(next)
      return true
    } catch { setMachineError("Nem sikerült menteni a gépet."); return false }
  }
  const addMachine = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    let url: URL
    try { url = new URL(machineUrl.trim()) } catch { setMachineError("Adj meg egy érvényes HTTPS-címet."); return }
    if (url.protocol !== "https:" || url.username || url.password) { setMachineError("Csak biztonságos HTTPS-cím használható."); return }
    if (!machineName.trim()) { setMachineError("Add meg a gép nevét."); return }
    if (persistMachines([...machines, { id: crypto.randomUUID(), name: machineName.trim().slice(0, 80), url: url.toString() }])) setMachineForm(false)
  }
  const currentMachine = machines.find(machine => machine.id === machineInfo)

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
        </div> : <button type="button" className="evo-tools-storage-upload" onClick={onUpload}><Plus size={16} /> Fájl feltöltése</button>}
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

    {!hasResults && <div className="evo-tools-empty">
      <Search size={25} strokeWidth={1.6} aria-hidden="true" />
      <strong>Nincs találat</strong>
      <p>Próbálj másik keresőkifejezést.</p>
      <button type="button" onClick={() => setQuery("")}>Keresés törlése</button>
    </div>}

    {selected && <BottomSheet
      title={selected.title}
      description="Integráció részletei"
      size="compact"
      onClose={() => setSelectedId(null)}
      footer={<UIButton fullWidth variant="primary" disabled={requestedProviders.includes(selected.id)} onClick={() => saveInterest(selected.id)}>
        {requestedProviders.includes(selected.id) ? "Érdeklődés mentve" : "Érdekel ez az integráció"}
      </UIButton>}
    >
      <div className="evo-tools-kit-sheet">
        <ProviderLogo provider={selected} />
        <p>{selected.detail}</p>
        <div className="evo-tools-dialog-status">Ez az integráció még nem csatlakoztatható az Evölingóhoz.</div>
        <p className="evo-tools-dialog-footnote">Az érdeklődés csak ezen az eszközön mentődik; nem jelent feliratkozást vagy értesítést.</p>
      </div>
    </BottomSheet>}

    {machineForm && <BottomSheet title="Új gép" description="Külső vezérlőpult hozzáadása" size="medium" dismissible={false} onClose={() => setMachineForm(false)}
      footer={<UIButton fullWidth type="submit" form="evo-tools-machine-form">Gép hozzáadása</UIButton>}
    >
      <form id="evo-tools-machine-form" className="evo-tools-machine-form evo-ui-kit-form" onSubmit={addMachine}>
        <label>Gép neve<input value={machineName} onChange={event => setMachineName(event.target.value)} placeholder="Saját szerver" maxLength={80} required /></label>
        <label>HTTPS vezérlőpult címe<input type="url" value={machineUrl} onChange={event => setMachineUrl(event.target.value)} placeholder="https://example.com" required /></label>
        <p>Ez egy külső gép vezérlőpultjának helyben mentett hivatkozása. Az Evölingo még nem kapcsolódik a szerverhez, és nem jelzi annak állapotát.</p>
        {machineError && <p role="alert" className="evo-tools-machine-error">{machineError}</p>}
      </form>
    </BottomSheet>}

    {currentMachine && <BottomSheet
      title={machineDeleteConfirm ? "Hivatkozás eltávolítása?" : currentMachine.name}
      description={machineDeleteConfirm ? "Ez a hivatkozás eltűnik a mentett gépek közül." : "Külső gép · a kapcsolat állapota nincs ellenőrizve"}
      size="compact"
      role={machineDeleteConfirm ? "alertdialog" : "dialog"}
      dismissible={!machineDeleteConfirm}
      onClose={() => { setMachineInfo(null); setMachineDeleteConfirm(false) }}
      footer={machineDeleteConfirm ? <div className="evo-kit-confirm-actions">
        <UIButton variant="secondary" fullWidth onClick={() => setMachineDeleteConfirm(false)}>Mégse</UIButton>
        <UIButton variant="danger" fullWidth onClick={() => {
          persistMachines(machines.filter(item => item.id !== currentMachine.id))
          setMachineInfo(null)
          setMachineDeleteConfirm(false)
        }}>Eltávolítás</UIButton>
      </div> : undefined}
    >
      {machineDeleteConfirm ?
        <p className="evo-kit-confirm-description">A vezérlőpult webcímét eltávolítjuk a helyi listából. A távoli gép adatai nem változnak.</p> :
        <div className="evo-tools-kit-sheet">
          <a className="evo-tools-machine-link" href={currentMachine.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} /> Vezérlőpult megnyitása</a>
          <UIButton variant="secondary" fullWidth onClick={() => setMachineDeleteConfirm(true)}><Trash2 size={17} /> Hivatkozás eltávolítása</UIButton>
        </div>}
    </BottomSheet>}
  </div>
}
