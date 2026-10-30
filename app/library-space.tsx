"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import {
  ArrowDownToLine, Check, CheckSquare2, ChevronLeft, Copy, File, FileText, Folder,
  FolderOpen, Grid2X2, HardDrive, List, MoreHorizontal, Move, Pencil, Plus, Search,
  Share2, SlidersHorizontal, Trash2, Upload, X,
} from "lucide-react"

type FileKind = "folder" | "pdf" | "note"
type SpaceEntry = { id: string; name: string; detail: string; kind: FileKind; parent?: string; size?: number; modifiedAt?: number }
type SortKey = "name" | "date" | "size" | "type"
type Sheet = "new" | "sort" | "actions" | "rename" | "move" | "delete" | "preview" | null

const ENTRIES_KEY = "evolingo.space.v1"
const BLOBS_KEY = "evolingo.space-blobs.v1"
const MAX_FILE_SIZE = 2 * 1024 * 1024

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
  const normalizedQuery = query.trim().toLocaleLowerCase("hu-HU")
  const visible = useMemo(() => entries
    .filter(item => normalizedQuery ? item.name.toLocaleLowerCase("hu-HU").includes(normalizedQuery) : item.parent === (folder || undefined))
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
    const id = crypto.randomUUID()
    const dot = entry.name.lastIndexOf(".")
    const name = dot > 0 ? `${entry.name.slice(0, dot)} másolat${entry.name.slice(dot)}` : `${entry.name} másolat`
    const copy = { ...entry, id, name, modifiedAt: Date.now() }
    if (entry.kind !== "folder") { const blobs = readBlobs(); if (blobs[entry.id]) { blobs[id] = blobs[entry.id]; localStorage.setItem(BLOBS_KEY, JSON.stringify(blobs)) } }
    persist([...entries, copy]); setSheet(null); setNotice("Másolat létrehozva.")
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

  const moveTo = (parent?: string) => {
    if (!active) return
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
  const beginLongPress = (entry: SpaceEntry) => { suppressClick.current = false; longPress.current = setTimeout(() => { suppressClick.current = true; setSelectionMode(true); setSelected(new Set([entry.id])); navigator.vibrate?.(10) }, 450) }
  const cancelLongPress = () => { if (longPress.current) clearTimeout(longPress.current); longPress.current = null }
  const openActions = (entry: SpaceEntry) => { setActive(entry); setSheet("actions") }
  const openRename = () => { if (active) setDraftName(active.name); setSheet("rename") }
  const folders = entries.filter(item => item.kind === "folder" && item.id !== active?.id)
  const hasRealStorage = storageUsed != null && storageTotal != null && storageTotal > 0

  return <div className="ref-space library-space">
    <input ref={filePicker} className="ref-hidden-file" type="file" multiple aria-label="Fájl kiválasztása" onChange={uploadFile} />

    <div className="library-title-row">
      <div className="library-title-copy">
        {folder && <button className="library-back" type="button" onClick={() => setFolder(entries.find(item => item.id === folder)?.parent || null)}><ChevronLeft size={20} /> Saját fájlok</button>}
        <h1>{folderName}</h1>
      </div>
      <div className="library-toolbar" aria-label="Könyvtár műveletek">
        <button type="button" aria-label="Keresés" onClick={() => searchInput.current?.focus()}><Search size={21} /></button>
        <button type="button" aria-label={view === "list" ? "Rácsnézet" : "Listanézet"} onClick={() => setView(current => current === "list" ? "grid" : "list")}>{view === "list" ? <Grid2X2 size={20} /> : <List size={21} />}</button>
        <button className="library-new-button" type="button" aria-label="Új elem" onClick={() => { setDraftName(""); setSheet("new") }}><Plus size={22} /></button>
        <button type="button" aria-label="További beállítások" onClick={() => setSheet("sort")}><MoreHorizontal size={22} /></button>
      </div>
    </div>

    <label className="library-search">
      <Search size={19} aria-hidden="true" />
      <input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="Keresés a fájlok között" enterKeyHint="search" autoComplete="off" />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => { setQuery(""); searchInput.current?.focus() }}><X size={16} /></button>}
    </label>

    {hasRealStorage && <button type="button" className="library-storage" onClick={() => setNotice(`${formatSize(storageUsed)} / ${formatSize(storageTotal)}`)}>
      <span><HardDrive size={18} /> Tárhely</span><small>{formatSize(storageUsed)} / {formatSize(storageTotal)}</small>
      <i><b style={{ width: `${Math.min(100, (storageUsed / storageTotal) * 100)}%` }} /></i>
    </button>}

    {selectionMode && <div className="library-selection-bar">
      <button type="button" onClick={() => { setSelectionMode(false); setSelected(new Set()) }}><X size={20} /> Kész</button>
      <strong>{selected.size} kijelölve</strong>
      <button type="button" disabled={!selected.size} aria-label="Kijelöltek törlése" onClick={() => setSheet("delete")}><Trash2 size={20} /></button>
    </div>}

    {loading ? <div className="library-loading" role="status"><span /> <span /> <span /></div> : visible.length ? <div className={`library-files ${view === "grid" ? "is-grid" : "is-list"}`} onScroll={() => searchInput.current?.blur()}>
      {visible.map(entry => <article className={`library-file ${selected.has(entry.id) ? "is-selected" : ""}`} key={entry.id} onPointerDown={() => beginLongPress(entry)} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress}>
        <button className="library-file-open" type="button" onClick={() => openEntry(entry)}>
          <span className="library-file-icon"><FileIcon kind={entry.kind} /></span>
          <span className="library-file-copy"><strong>{entry.name}</strong><small>{entry.kind === "folder" ? `${entries.filter(item => item.parent === entry.id).length} elem` : `${formatSize(entry.size)} · ${formatDate(entry.modifiedAt)}`}</small></span>
          {selectionMode && <span className="library-check" aria-hidden="true">{selected.has(entry.id) && <Check size={15} />}</span>}
        </button>
        {!selectionMode && <button className="library-file-more" type="button" aria-label={`${entry.name} műveletei`} onClick={() => openActions(entry)}><MoreHorizontal size={21} /></button>}
      </article>)}
    </div> : <div className="library-empty">
      <FolderOpen size={48} strokeWidth={1.5} />
      <h2>{query ? "Nincs találat" : "Még nincsenek fájljaid"}</h2>
      <p>{query ? "Próbálj másik keresést." : "A feltöltött fájljaid itt jelennek meg."}</p>
      {!query && <button type="button" onClick={() => setSheet("new")}><Plus size={18} /> Fájl hozzáadása</button>}
    </div>}

    {notice && <div className="library-toast" role="status">{notice}<button type="button" aria-label="Bezárás" onClick={() => setNotice("")}><X size={16} /></button></div>}

    {sheet && <div className="library-sheet-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setSheet(null) }}>
      <div ref={sheetRef} className={`library-sheet library-sheet--${sheet}`} role="dialog" aria-modal="true" aria-label={sheet === "new" ? "Új elem" : sheet === "sort" ? "Rendezés" : sheet === "preview" ? "Fájl előnézete" : "Fájlműveletek"} onTouchStart={event => { sheetTouchY.current = event.touches[0]?.clientY ?? null }} onTouchEnd={event => { const start = sheetTouchY.current; sheetTouchY.current = null; if (start != null && (event.changedTouches[0]?.clientY ?? start) - start > 80) setSheet(null) }}>
        <div className="library-sheet-handle" aria-hidden="true" />
        <div className="library-sheet-heading"><h2>{sheet === "new" ? "Új" : sheet === "sort" ? "Rendezés" : sheet === "rename" ? "Átnevezés" : sheet === "move" ? "Áthelyezés" : sheet === "delete" ? "Törlés" : sheet === "preview" ? active?.name : active?.name}</h2><button type="button" aria-label="Bezárás" onClick={() => setSheet(null)}><X size={20} /></button></div>

        {sheet === "new" && <div className="library-sheet-actions">
          <button type="button" onClick={() => { setSheet(null); filePicker.current?.click() }}><Upload size={21} /><span><strong>Fájl feltöltése</strong><small>Dokumentum kiválasztása az eszközről</small></span></button>
          <div className="library-new-folder"><label htmlFor="library-folder-name"><Folder size={21} /><span>Új mappa</span></label><div><input id="library-folder-name" value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Mappa neve" maxLength={80} /><button type="button" disabled={!draftName.trim()} onClick={createFolder}>Létrehozás</button></div></div>
        </div>}

        {sheet === "sort" && <div className="library-sheet-actions">
          {([['name', 'Név'], ['date', 'Módosítás dátuma'], ['size', 'Méret'], ['type', 'Típus']] as [SortKey, string][]).map(([value, label]) => <button type="button" key={value} onClick={() => { setSort(value); setSheet(null) }}><SlidersHorizontal size={20} /><span><strong>{label}</strong></span>{sort === value && <Check size={19} />}</button>)}
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

        {sheet === "rename" && <form className="library-form" onSubmit={event => { event.preventDefault(); rename() }}><label htmlFor="library-rename">Új név</label><input id="library-rename" value={draftName} onChange={event => setDraftName(event.target.value)} maxLength={120} /><button type="submit" disabled={!draftName.trim()}>Mentés</button></form>}

        {sheet === "move" && <div className="library-sheet-actions"><button type="button" onClick={() => moveTo()}><FolderOpen size={20} /><span><strong>Saját fájlok</strong><small>Gyökérmappa</small></span></button>{folders.map(item => <button type="button" key={item.id} onClick={() => moveTo(item.id)}><Folder size={20} /><span><strong>{item.name}</strong></span></button>)}</div>}

        {sheet === "delete" && <div className="library-confirm"><Trash2 size={28} /><p>{selected.size > 1 ? `${selected.size} elem véglegesen törlődik.` : `A(z) „${active?.name || entries.find(item => selected.has(item.id))?.name || "kijelölt elem"}” véglegesen törlődik.`}</p><div><button type="button" onClick={() => setSheet(null)}>Mégse</button><button className="is-destructive" type="button" onClick={() => deleteEntries(selected.size ? selected : new Set(active ? [active.id] : []))}>Törlés</button></div></div>}

        {sheet === "preview" && active && <div className="library-preview"><iframe src={readBlobs()[active.id]} title={`${active.name} előnézete`} sandbox="" /><div><button type="button" onClick={() => download(active)}><ArrowDownToLine size={19} /> Letöltés</button><button type="button" onClick={() => void share(active)}><Share2 size={19} /> Megosztás</button></div></div>}
      </div>
    </div>}
  </div>
}
