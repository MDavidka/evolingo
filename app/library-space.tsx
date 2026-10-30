"use client"

import { LiquidGlassButton } from "./liquid-glass-button"
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react"
import {
  ArrowDownToLine, ArrowUpRight, Check, CheckSquare2, ChevronLeft, Copy, File, FileText, Folder,
  FolderOpen, Grid2X2, HardDrive, List, MoreHorizontal, Move, Pencil, Plus, Search,
  Share2, SlidersHorizontal, Trash2, Upload, X,
} from "lucide-react"

type FileKind = "folder" | "pdf" | "note"
type SpaceEntry = { id: string; name: string; detail: string; kind: FileKind; parent?: string; size?: number; modifiedAt?: number }
type SortKey = "name" | "date" | "size" | "type"
type Sheet = "new" | "sort" | "actions" | "rename" | "move" | "delete" | "preview" | null

const ENTRIES_KEY = "evolingo.space.v1"
const BLOBS_KEY = "evolingo.space-blobs.v1"
const VIEW_KEY = "evolingo.library.view.v1"
const SORT_KEY = "evolingo.library.sort.v1"
const MAX_FILE_SIZE = 2 * 1024 * 1024
const SORT_LABELS: Record<SortKey, string> = {
  date: "Legutóbbi", name: "Név szerint", size: "Méret szerint", type: "Típus szerint",
}
const normalizeSearch = (value: string) =>
  value.toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

function readBlobs() {
  try { return JSON.parse(localStorage.getItem(BLOBS_KEY) || "{}") as Record<string, string> } catch { return {} }
}

function formatSize(bytes?: number) {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} MB`
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "Helyi fájl"
  return new Intl.DateTimeFormat("hu-HU", { month: "short", day: "numeric", year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric" }).format(timestamp)
}

function kindLabel(kind: FileKind) {
  return kind === "folder" ? "Mappa" : kind === "pdf" ? "PDF" : "Dokumentum"
}

function FileIcon({ kind, size = 23 }: { kind: FileKind; size?: number }) {
  return kind === "folder" ? <Folder size={size} /> : kind === "pdf" ? <FileText size={size} /> : <File size={size} />
}

export default function LibrarySpace() {
  const filePicker = useRef<HTMLInputElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const sheetTouchY = useRef<number | null>(null)
  const [entries, setEntries] = useState<SpaceEntry[]>([])
  const [view, setView] = useState<"list" | "grid">("list")
  const [folder, setFolder] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("date")
  const [sheet, setSheet] = useState<Sheet>(null)
  const [active, setActive] = useState<SpaceEntry | null>(null)
  const [draftName, setDraftName] = useState("")
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(true)
  const [storageUsed, setStorageUsed] = useState<number | null>(null)
  const [storageTotal, setStorageTotal] = useState<number | null>(null)
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY)
      if (v === "list" || v === "grid") setView(v)
      const o = localStorage.getItem(SORT_KEY)
      if (o === "date" || o === "name" || o === "size" || o === "type") setSort(o)
    } catch {}
  }, [])
  const changeView = (next: "list" | "grid") => {
    setView(next)
    try { localStorage.setItem(VIEW_KEY, next) } catch {}
  }
  const changeSort = (next: SortKey) => {
    setSort(next)
    try { localStorage.setItem(SORT_KEY, next) } catch {}
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ENTRIES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SpaceEntry[]
        if (Array.isArray(parsed)) setEntries(parsed)
      }
    } catch { setNotice("A mentett fájlok nem tölthetők be ezen az eszközön.") }
    setLoading(false)
    let cancelled = false
    fetch("/api/space", { cache: "no-store" }).then(async response => {
      if (!response.ok) return
      const data = await response.json() as { entries?: SpaceEntry[]; storageUsed?: number; storageTotal?: number; available?: boolean }
      if (cancelled || data.available !== true) return
      if (Array.isArray(data.entries)) setEntries(data.entries)
      if (Number.isFinite(data.storageUsed)) setStorageUsed(Math.max(0, Number(data.storageUsed)))
      if (Number.isFinite(data.storageTotal)) setStorageTotal(Math.max(0, Number(data.storageTotal)))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!sheet) return
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const frame = requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>("button, input")?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null)
      if (event.key !== "Tab" || !sheetRef.current) return
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [sheet])

  const persist = (next: SpaceEntry[]) => {
    setEntries(next)
    try { localStorage.setItem(ENTRIES_KEY, JSON.stringify(next)) }
    catch { setNotice("A módosítást nem sikerült elmenteni.") }
  }

  const folderName = folder ? entries.find(item => item.id === folder)?.name || "Saját fájlok" : "Saját fájlok"
  const normalizedQuery = normalizeSearch(query)
  const visible = useMemo(() => entries
    .filter(item => normalizedQuery ? normalizeSearch(item.name).includes(normalizedQuery) : item.parent === (folder || undefined))
    .sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1
      if (b.kind === "folder" && a.kind !== "folder") return 1
      if (sort === "name") return a.name.localeCompare(b.name, "hu-HU")
      if (sort === "size") return (b.size || 0) - (a.size || 0)
      if (sort === "type") return kindLabel(a.kind).localeCompare(kindLabel(b.kind), "hu-HU") || a.name.localeCompare(b.name, "hu-HU")
      return (b.modifiedAt || 0) - (a.modifiedAt || 0) || a.name.localeCompare(b.name, "hu-HU")
    }), [entries, folder, normalizedQuery, sort])

  const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])]
    event.target.value = ""
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) { setNotice(`${file.name}: a fájl legfeljebb 2 MB lehet.`); return }
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result !== "string") { setNotice("A fájlt nem sikerült beolvasni."); return }
        const id = crypto.randomUUID()
        const next: SpaceEntry = { id, name: file.name, detail: "", kind: file.type === "application/pdf" ? "pdf" : "note", parent: folder || undefined, size: file.size, modifiedAt: Date.now() }
        try {
          const blobs = readBlobs(); blobs[id] = reader.result; localStorage.setItem(BLOBS_KEY, JSON.stringify(blobs))
          setEntries(current => { const updated = [...current, next]; localStorage.setItem(ENTRIES_KEY, JSON.stringify(updated)); return updated })
          setNotice(`${file.name} feltöltve.`)
        } catch { setNotice("A helyi tárhely megtelt; a fájl nem lett elmentve.") }
      }
      reader.onerror = () => setNotice("A fájlt nem sikerült beolvasni.")
      reader.readAsDataURL(file)
    })
  }

  const createFolder = () => {
    const name = draftName.trim()
    if (!name) return
    persist([...entries, { id: crypto.randomUUID(), name, detail: "0 elem", kind: "folder", parent: folder || undefined, modifiedAt: Date.now() }])
    setDraftName(""); setSheet(null)
  }

  const openEntry = (entry: SpaceEntry) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    if (selectionMode) { toggleSelection(entry.id); return }
    if (entry.kind === "folder") { setFolder(entry.id); setQuery(""); return }
    const url = readBlobs()[entry.id]
    if (!url) { setNotice(`${entry.name} tartalma nem érhető el ezen az eszközön.`); return }
    setActive(entry); setSheet("preview")
  }

  const download = (entry: SpaceEntry) => {
    const url = readBlobs()[entry.id]
    if (!url) { setNotice(`${entry.name} tartalma nem érhető el ezen az eszközön.`); return }
    const link = document.createElement("a"); link.href = url; link.download = entry.name; link.click(); setSheet(null)
  }

  const duplicate = (entry: SpaceEntry) => {
    // Duplicating a folder must include all nested items and their local file blobs.
    const originals: SpaceEntry[] = [entry]
    const seen = new Set([entry.id])
    for (let i = 0; i < originals.length; i++) {
      if (originals[i].kind !== "folder") continue
      for (const child of entries) {
        if (child.parent === originals[i].id && !seen.has(child.id)) {
          originals.push(child)
          seen.add(child.id)
        }
      }
    }
    const ids = new Map(originals.map(item => [item.id, crypto.randomUUID()]))
    const dot = entry.name.lastIndexOf(".")
    const copyName = dot > 0 ? entry.name.slice(0, dot) + " másolat" + entry.name.slice(dot) : entry.name + " másolat"
    const copies: SpaceEntry[] = originals.map(item => ({
      ...item,
      id: ids.get(item.id)!,
      parent: item.id === entry.id ? entry.parent : ids.get(item.parent || ""),
      name: item.id === entry.id ? copyName : item.name,
      modifiedAt: Date.now(),
    }))
    try {
      const blobs = readBlobs()
      for (const item of originals) {
        const source = blobs[item.id]
        if (source) blobs[ids.get(item.id)!] = source
      }
      localStorage.setItem(BLOBS_KEY, JSON.stringify(blobs))
      persist([...entries, ...copies])
      setSheet(null)
      setNotice("Másolat létrehozva.")
    } catch {
      setNotice("Nincs elég hely a másolat mentéséhez.")
    }
  }

  const share = async (entry: SpaceEntry) => {
    const url = readBlobs()[entry.id]
    try {
      if (url && navigator.share) {
        const blob = await fetch(url).then(response => response.blob())
        const file = new globalThis.File([blob], entry.name, { type: blob.type })
        if (!navigator.canShare || navigator.canShare({ files: [file] })) await navigator.share({ title: entry.name, files: [file] })
        else await navigator.share({ title: entry.name })
      } else if (navigator.share) await navigator.share({ title: entry.name })
      else { setNotice("A megosztás ezen az eszközön nem támogatott."); return }
      setSheet(null)
    } catch (error) { if ((error as DOMException).name !== "AbortError") setNotice("A megosztás nem sikerült.") }
  }

  const rename = () => {
    if (!active || !draftName.trim()) return
    persist(entries.map(item => item.id === active.id ? { ...item, name: draftName.trim(), modifiedAt: Date.now() } : item))
    setSheet(null); setActive(null)
  }

  const isDescendantOf = (folderId: string, parentId: string) => {
    const visited = new Set<string>()
    let cursor: string | undefined = folderId
    while (cursor && !visited.has(cursor)) {
      if (cursor === parentId) return true
      visited.add(cursor)
      cursor = entries.find(item => item.id === cursor)?.parent
    }
    return false
  }
  const moveTo = (parent?: string) => {
    if (!active) return
    if (active.kind === "folder" && parent && isDescendantOf(parent, active.id)) {
      setNotice("Mappa nem helyezhető a saját almappájába.")
      return
    }
    persist(entries.map(item => item.id === active.id ? { ...item, parent, modifiedAt: Date.now() } : item))
    setSheet(null); setActive(null); setNotice("Elem áthelyezve.")
  }

  const deleteEntries = (ids: Set<string>) => {
    const withChildren = new Set(ids)
    let changed = true
    while (changed) { changed = false; entries.forEach(item => { if (item.parent && withChildren.has(item.parent) && !withChildren.has(item.id)) { withChildren.add(item.id); changed = true } }) }
    persist(entries.filter(item => !withChildren.has(item.id)))
    const blobs = readBlobs(); withChildren.forEach(id => delete blobs[id]); try { localStorage.setItem(BLOBS_KEY, JSON.stringify(blobs)) } catch {}
    setSheet(null); setActive(null); setSelected(new Set()); setSelectionMode(false); setNotice("Törölve.")
  }

  const toggleSelection = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const beginLongPress = (entry: SpaceEntry, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (selectionMode || event.pointerType === "mouse") return
    suppressClick.current = false
    pointerOrigin.current = { x: event.clientX, y: event.clientY }
    if (longPress.current) clearTimeout(longPress.current)
    longPress.current = setTimeout(() => {
      suppressClick.current = true
      setSelectionMode(true)
      setSelected(new Set([entry.id]))
      navigator.vibrate?.(10)
    }, 450)
  }
  const moveLongPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = pointerOrigin.current
    if (origin && (Math.abs(event.clientX - origin.x) > 9 || Math.abs(event.clientY - origin.y) > 9)) cancelLongPress()
  }
  const cancelLongPress = () => {
    if (longPress.current) clearTimeout(longPress.current)
    longPress.current = null
    pointerOrigin.current = null
  }
  const openActions = (entry: SpaceEntry) => { setActive(entry); setSheet("actions") }
  const openRename = () => { if (active) setDraftName(active.name); setSheet("rename") }
  const folders = entries.filter(item => item.kind === "folder" && item.id !== active?.id && (active?.kind !== "folder" || !isDescendantOf(item.id, active.id)))
  const hasRealStorage = storageUsed != null && storageTotal != null && storageTotal > 0

  return <div className="ref-space library-space">
    <input ref={filePicker} className="ref-hidden-file" type="file" multiple aria-label="Fájl kiválasztása" onChange={uploadFile} />

    <div className="library-title-row">
      <div className="library-title-copy">
        {folder && <button className="library-back" type="button" aria-label="Vissza az előző mappába" onClick={() => setFolder(entries.find(item => item.id === folder)?.parent || null)}><ChevronLeft size={19} /> Vissza</button>}
        <h1>{folder ? folderName : "Könyvtár"}</h1>
        <p className="library-subtitle">{folder ? "A mappa fájljai és almappái" : "Minden dokumentumod egy helyen."}</p>
      </div>
      <LiquidGlassButton className="library-add-primary" variant="primary" size="compact" icon={Plus} onClick={() => { setDraftName(""); setSheet("new") }} aria-label="Új fájl vagy mappa hozzáadása">Új</LiquidGlassButton>
    </div>

    <label className="library-search">
      <Search size={20} strokeWidth={1.8} aria-hidden="true" />
      <input ref={searchInput} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setQuery("") }} placeholder="Fájlok és mappák keresése" aria-label="Keresés a könyvtárban" enterKeyHint="search" autoComplete="off" />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => { setQuery(""); searchInput.current?.focus() }}><X size={16} /></button>}
    </label>

    <div className="library-controls" aria-label="Könyvtár nézete és rendezése">
      <span className="library-result-count" aria-live="polite">{loading ? "Betöltés…" : normalizedQuery ? `${visible.length} találat` : `${visible.length} elem`}</span>
      <div className="library-controls-actions">
        <button className="library-sort-button" type="button" aria-label={`Rendezés: ${SORT_LABELS[sort]}`} onClick={() => setSheet("sort")}><SlidersHorizontal size={17} strokeWidth={1.8} /><span>{SORT_LABELS[sort]}</span></button>
        <div className="library-view-switch" role="group" aria-label="Megjelenítés">
          <button type="button" aria-label="Listanézet" aria-pressed={view === "list"} className={view === "list" ? "is-active" : ""} onClick={() => changeView("list")}><List size={19} strokeWidth={1.8} /></button>
          <button type="button" aria-label="Rácsnézet" aria-pressed={view === "grid"} className={view === "grid" ? "is-active" : ""} onClick={() => changeView("grid")}><Grid2X2 size={18} strokeWidth={1.8} /></button>
        </div>
      </div>
    </div>

    {hasRealStorage && <button type="button" className="library-storage" onClick={() => setNotice(`${formatSize(storageUsed)} / ${formatSize(storageTotal)}`)}>
      <span><HardDrive size={18} /> Tárhely</span><small>{formatSize(storageUsed)} / {formatSize(storageTotal)}</small>
      <i><b style={{ width: `${Math.min(100, (storageUsed / storageTotal) * 100)}%` }} /></i>
    </button>}

    {selectionMode && <div className="library-selection-bar">
      <button type="button" onClick={() => { setSelectionMode(false); setSelected(new Set()) }}><X size={20} /> Kész</button>
      <strong>{selected.size} kijelölve</strong>
      <button type="button" disabled={!selected.size} aria-label="Kijelöltek törlése" onClick={() => setSheet("delete")}><Trash2 size={20} /></button>
    </div>}

    {loading ? <div className="library-loading" role="status"><span /> <span /> <span /></div> : visible.length ? <div className={`library-files ${view === "grid" ? "is-grid" : "is-list"}`}>
      {visible.map(entry => <article className={`library-file ${selected.has(entry.id) ? "is-selected" : ""}`} key={entry.id}>
        <button className="library-file-open" type="button" aria-label={selectionMode ? `${entry.name} kijelölése` : entry.kind === "folder" ? `${entry.name} mappa megnyitása` : `${entry.name} előnézete`} aria-pressed={selectionMode ? selected.has(entry.id) : undefined} onPointerDown={event => beginLongPress(entry, event)} onPointerMove={moveLongPress} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={() => openEntry(entry)}>
          <span className="library-file-icon"><FileIcon kind={entry.kind} /></span>
          <span className="library-file-copy"><strong title={entry.name}>{entry.name}</strong><small>{entry.kind === "folder" ? `${entries.filter(item => item.parent === entry.id).length} elem` : `${formatSize(entry.size)} · ${formatDate(entry.modifiedAt)}`}</small></span>
          {selectionMode && <span className="library-check" aria-hidden="true">{selected.has(entry.id) && <Check size={15} />}</span>}
        </button>
        {!selectionMode && <button className="library-file-more" type="button" aria-label={`${entry.name} műveletei`} onClick={() => openActions(entry)}><MoreHorizontal size={21} /></button>}
      </article>)}
    </div> : <div className="library-empty">
      <FolderOpen size={48} strokeWidth={1.5} />
      <h2>{query ? "Nincs találat" : folder ? "Ez a mappa üres" : "Még nincsenek fájljaid"}</h2>
      <p>{query ? "Próbálj más kifejezést, vagy töröld a keresést." : "Tölts fel egy dokumentumot, vagy rendezd mappákba a fájljaidat."}</p>
      {query ? <button className="library-empty-clear" type="button" onClick={() => setQuery("")}>Keresés törlése</button> : <div className="library-empty-actions">
        <button className="library-empty-upload evo-wide-action" type="button" onClick={() => filePicker.current?.click()}>Fájl feltöltése <ArrowUpRight size={20} aria-hidden="true" /></button>
        <button className="library-empty-folder" type="button" onClick={() => { setDraftName(""); setSheet("new") }}><Folder size={18} /> Új mappa</button>
      </div>}
    </div>}

    {notice && <div className="library-toast" role="status">{notice}<button type="button" aria-label="Bezárás" onClick={() => setNotice("")}><X size={16} /></button></div>}

    {sheet && <div className="library-sheet-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setSheet(null) }}>
      <div ref={sheetRef} className={`library-sheet library-sheet--${sheet}`} role="dialog" aria-modal="true" aria-label={sheet === "new" ? "Új elem" : sheet === "sort" ? "Rendezés" : sheet === "preview" ? "Fájl előnézete" : "Fájlműveletek"}>
        <div className="library-sheet-handle" aria-hidden="true" onTouchStart={event => { sheetTouchY.current = event.touches[0]?.clientY ?? null }} onTouchEnd={event => { const start = sheetTouchY.current; sheetTouchY.current = null; if (start != null && (event.changedTouches[0]?.clientY ?? start) - start > 80) setSheet(null) }} />
        <div className="library-sheet-heading"><h2>{sheet === "new" ? "Új elem" : sheet === "sort" ? "Rendezés" : sheet === "rename" ? "Átnevezés" : sheet === "move" ? "Áthelyezés" : sheet === "delete" ? "Törlés" : sheet === "preview" ? active?.name : active?.name}</h2><button type="button" aria-label="Bezárás" onClick={() => setSheet(null)}><X size={20} /></button></div>

        {sheet === "new" && <div className="library-sheet-actions">
          <button type="button" onClick={() => { setSheet(null); filePicker.current?.click() }}><Upload size={21} /><span><strong>Fájl feltöltése</strong><small>Legfeljebb 2 MB · az eszközödről</small></span></button>
          <div className="library-new-folder"><label htmlFor="library-folder-name"><Folder size={21} /><span>Új mappa</span></label><div><input id="library-folder-name" value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Mappa neve" maxLength={80} /><button type="button" disabled={!draftName.trim()} onClick={createFolder}>Létrehozás</button></div></div>
        </div>}

        {sheet === "sort" && <div className="library-sheet-actions">
          {([['name', 'Név'], ['date', 'Módosítás dátuma'], ['size', 'Méret'], ['type', 'Típus']] as [SortKey, string][]).map(([value, label]) => <button type="button" key={value} aria-pressed={sort === value} onClick={() => { changeSort(value); setSheet(null) }}><span><strong>{label}</strong></span>{sort === value && <Check size={19} />}</button>)}
          <button type="button" onClick={() => { setSelectionMode(true); setSheet(null) }}><CheckSquare2 size={20} /><span><strong>Több elem kijelölése</strong></span></button>
        </div>}

        {sheet === "actions" && active && <div className="library-sheet-actions">
          {active.kind !== "folder" && <button type="button" onClick={() => { const url = readBlobs()[active.id]; if (!url) setNotice("A fájl nem érhető el."); else setSheet("preview") }}><FileText size={20} /><span><strong>Előnézet</strong></span></button>}
          <button type="button" onClick={openRename}><Pencil size={20} /><span><strong>Átnevezés</strong></span></button>
          <button type="button" onClick={() => setSheet("move")}><Move size={20} /><span><strong>Áthelyezés</strong></span></button>
          <button type="button" onClick={() => duplicate(active)}><Copy size={20} /><span><strong>Másolat készítése</strong></span></button>
          {active.kind !== "folder" && <><button type="button" onClick={() => download(active)}><ArrowDownToLine size={20} /><span><strong>Letöltés</strong></span></button><button type="button" onClick={() => void share(active)}><Share2 size={20} /><span><strong>Megosztás</strong></span></button></>}
          <button className="is-destructive" type="button" onClick={() => setSheet("delete")}><Trash2 size={20} /><span><strong>Törlés</strong></span></button>
        </div>}

        {sheet === "rename" && <form className="library-form" onSubmit={event => { event.preventDefault(); rename() }}><label htmlFor="library-rename">Új név</label><input id="library-rename" value={draftName} onChange={event => setDraftName(event.target.value)} maxLength={120} /><button className="evo-wide-action" type="submit" disabled={!draftName.trim()}>Mentés <ArrowUpRight size={20} aria-hidden="true" /></button></form>}

        {sheet === "move" && <div className="library-sheet-actions"><button type="button" onClick={() => moveTo()}><FolderOpen size={20} /><span><strong>Saját fájlok</strong><small>Gyökérmappa</small></span></button>{folders.map(item => <button type="button" key={item.id} onClick={() => moveTo(item.id)}><Folder size={20} /><span><strong>{item.name}</strong></span></button>)}</div>}

        {sheet === "delete" && <div className="library-confirm"><Trash2 size={28} /><p>{selected.size > 1 ? `${selected.size} elem véglegesen törlődik.` : `A(z) „${active?.name || entries.find(item => selected.has(item.id))?.name || "kijelölt elem"}” véglegesen törlődik.`}</p><div><button type="button" onClick={() => setSheet(null)}>Mégse</button><button className="is-destructive" type="button" onClick={() => deleteEntries(selected.size ? selected : new Set(active ? [active.id] : []))}>Törlés</button></div></div>}

        {sheet === "preview" && active && <div className="library-preview"><iframe src={readBlobs()[active.id]} title={`${active.name} előnézete`} sandbox="" /><div><button type="button" onClick={() => download(active)}><ArrowDownToLine size={19} /> Letöltés</button><button type="button" onClick={() => void share(active)}><Share2 size={19} /> Megosztás</button></div></div>}
      </div>
    </div>}
  </div>
}
