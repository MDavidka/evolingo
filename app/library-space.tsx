"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react"
import { mage } from "./mage-icons"
import { ChevronDown, ChevronRight, QrCode } from "lucide-react"
const ArrowDownToLine = mage("arrow-down")
const ArrowUpRight = mage("arrow-up-right")
const Check = mage("check")
const CheckSquare2 = mage("check-square")
const ChevronLeft = mage("arrow-left")
const Copy = mage("copy")
const File = mage("file")
const FileText = mage("file-records")
const Folder = mage("folder")
const FolderOpen = mage("folder-open")
const Cloud = mage("archive")
const Grid2X2 = mage("layout-grid")
const List = mage("playlist")
const MoreHorizontal = mage("dots-horizontal")
const Move = mage("arrows-all-direction")
const Pencil = mage("edit-pen")
const Plus = mage("plus")
const Search = mage("search")
const SlidersHorizontal = mage("settings")
const Share2 = mage("arrow-up-right")
const Trash2 = mage("trash")
const Upload = mage("file-upload")
const X = mage("x")

type FileKind = "folder" | "pdf" | "note"
type SpaceEntry = { id: string; name: string; detail: string; kind: FileKind; parent?: string; size?: number; modifiedAt?: number }
type SortKey = "name" | "date" | "size" | "type"
type Sheet = "new" | "view" | "sort" | "actions" | "rename" | "move" | "delete" | "preview" | "storage" | "qr" | null

const ENTRIES_KEY = "evolingo.space.v1"
const BLOBS_KEY = "evolingo.space-blobs.v1"
const VIEW_KEY = "evolingo.library.view.v2"
const SORT_KEY = "evolingo.library.sort.v1"
const TRASH_KEY = "evolingo.library.trash.v1"
const DOWNLOADS_KEY = "evolingo.library.downloads.v1"
type LibraryLocation = "home" | "files" | "downloads" | "trash"
const MAX_FILE_SIZE = 2 * 1024 * 1024
const SORT_LABELS: Record<SortKey, string> = {
  date: "Legutóbbi", name: "Név szerint", size: "Méret szerint", type: "Típus szerint",
}
const normalizeSearch = (value: string) =>
  value.toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

// The QR shortcut accepts only safe, ordinary HTTPS links.
function safeQrUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" || url.username || url.password ||
      url.hostname === "localhost" || url.hostname.endsWith(".local") ||
      url.hostname.endsWith(".internal") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)) return null
    return url.toString()
  } catch { return null }
}

type QrDetector = new (options: { formats: string[] }) => {
  detect(source: ImageBitmap): Promise<Array<{ rawValue?: string }>>
}

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
  const qrPicker = useRef<HTMLInputElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const sheetTouchY = useRef<number | null>(null)
  const [entries, setEntries] = useState<SpaceEntry[]>([])
  const [view, setView] = useState<"list" | "grid">("list")
  const [folder, setFolder] = useState<string | null>(null)
  const [location, setLocation] = useState<LibraryLocation>("home")
  const [deletedEntries, setDeletedEntries] = useState<SpaceEntry[]>([])
  const [downloadedIds, setDownloadedIds] = useState<string[]>([])
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
  const [qrValue, setQrValue] = useState("")
  const [qrError, setQrError] = useState("")
  useEffect(() => {
    try {
      const trashed = JSON.parse(localStorage.getItem(TRASH_KEY) || "[]")
      if (Array.isArray(trashed)) setDeletedEntries(trashed.filter((entry): entry is SpaceEntry => entry && typeof entry.id === "string"))
      const downloads = JSON.parse(localStorage.getItem(DOWNLOADS_KEY) || "[]")
      if (Array.isArray(downloads)) setDownloadedIds(downloads.filter((id): id is string => typeof id === "string"))
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
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of entries) if (entry.parent) counts.set(entry.parent, (counts.get(entry.parent) || 0) + 1)
    return counts
  }, [entries])
  const localBytes = useMemo(() => entries.reduce((sum, entry) => sum + (entry.kind === "folder" ? 0 : (entry.size || 0)), 0), [entries])
  const normalizedQuery = normalizeSearch(query)
  const visible = useMemo(() => (location === "trash" ? deletedEntries.filter(item => !item.parent || !deletedEntries.some(parent => parent.id === item.parent)) : location === "downloads" ? entries.filter(item => downloadedIds.includes(item.id)) : entries)
    .filter(item => normalizedQuery ? normalizeSearch(item.name).includes(normalizedQuery) : location === "files" ? item.parent === (folder || undefined) : true)
    .sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1
      if (b.kind === "folder" && a.kind !== "folder") return 1
      if (sort === "name") return a.name.localeCompare(b.name, "hu-HU")
      if (sort === "size") return (b.size || 0) - (a.size || 0)
      if (sort === "type") return kindLabel(a.kind).localeCompare(kindLabel(b.kind), "hu-HU") || a.name.localeCompare(b.name, "hu-HU")
      return (b.modifiedAt || 0) - (a.modifiedAt || 0) || a.name.localeCompare(b.name, "hu-HU")
    }), [entries, deletedEntries, downloadedIds, location, folder, normalizedQuery, sort])

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
    if (entry.kind === "folder") { setLocation("files"); setFolder(entry.id); setQuery(""); return }
    const url = readBlobs()[entry.id]
    if (!url) { setNotice(`${entry.name} tartalma nem érhető el ezen az eszközön.`); return }
    setActive(entry); setSheet("preview")
  }

  const download = (entry: SpaceEntry) => {
    const url = readBlobs()[entry.id]
    if (!url) { setNotice(`${entry.name} tartalma nem érhető el ezen az eszközön.`); return }
    const link = document.createElement("a"); link.href = url; link.download = entry.name; link.click(); setSheet(null)
    const next = [entry.id, ...downloadedIds.filter(id => id !== entry.id)]
    setDownloadedIds(next)
    try { localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(next)) } catch {}
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
    const removed = entries.filter(item => withChildren.has(item.id))
    const next = [...deletedEntries.filter(item => !withChildren.has(item.id)), ...removed]
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(next))
      setDeletedEntries(next)
      persist(entries.filter(item => !withChildren.has(item.id)))
      setSheet(null); setActive(null); setSelected(new Set()); setSelectionMode(false)
      setNotice("Áthelyezve a Nemrég töröltek közé.")
    } catch { setNotice("Nem sikerült áthelyezni a fájlokat.") }
  }
  const restoreEntry = (entry: SpaceEntry) => {
    const restoreIds = new Set([entry.id])
    let changed = true
    while (changed) { changed = false; deletedEntries.forEach(item => { if (item.parent && restoreIds.has(item.parent) && !restoreIds.has(item.id)) { restoreIds.add(item.id); changed = true } }) }
    const restored = deletedEntries.filter(item => restoreIds.has(item.id))
      .map(item => ({ ...item, parent: item.parent && (restoreIds.has(item.parent) || entries.some(existing => existing.id === item.parent)) ? item.parent : undefined }))
    const remaining = deletedEntries.filter(item => !restoreIds.has(item.id))
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(remaining))
      setDeletedEntries(remaining)
      persist([...entries, ...restored])
      setNotice("Visszaállítva a Saját fájlok közé.")
    } catch { setNotice("Nem sikerült visszaállítani.") }
  }
  const permanentlyDelete = (entry: SpaceEntry) => {
    if (!window.confirm("Véglegesen törlöd ezt az elemet? Ez nem vonható vissza.")) return
    const ids = new Set([entry.id])
    let changed = true
    while (changed) { changed = false; deletedEntries.forEach(item => { if (item.parent && ids.has(item.parent) && !ids.has(item.id)) { ids.add(item.id); changed = true } }) }
    const next = deletedEntries.filter(item => !ids.has(item.id))
    try {
      localStorage.setItem(TRASH_KEY, JSON.stringify(next))
      const blobs = readBlobs(); ids.forEach(id => delete blobs[id]); localStorage.setItem(BLOBS_KEY, JSON.stringify(blobs))
      setDeletedEntries(next)
      setDownloadedIds(current => { const updated = current.filter(id => !ids.has(id)); try { localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated)) } catch {} return updated })
      setNotice("Véglegesen törölve.")
    } catch { setNotice("Nem sikerült véglegesen törölni.") }
  }

  const toggleSelection = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const beginLongPress = (entry: SpaceEntry, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (location === "trash" || location === "downloads" || selectionMode || event.pointerType === "mouse") return
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
  const usagePercent = hasRealStorage ? Math.min(100, Math.max(0, (storageUsed! / storageTotal!) * 100)) : null

  const importQrImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setQrError("")
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setQrError("Válassz egy legfeljebb 10 MB méretű képet.")
      return
    }
    const Detector = (window as Window & { BarcodeDetector?: QrDetector }).BarcodeDetector
    if (!Detector || typeof createImageBitmap !== "function") {
      setQrError("Ez a böngésző nem támogatja a QR-kódok képből történő felismerését. A hivatkozást kézzel is beillesztheted.")
      return
    }
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(file)
      const values = await new Detector({ formats: ["qr_code"] }).detect(bitmap)
      const code = values.find(item => item.rawValue)?.rawValue
      if (!code) { setQrError("A kiválasztott képen nem található felismerhető QR-kód."); return }
      setQrValue(code)
      if (!safeQrUrl(code)) setQrError("A beolvasott kód nem tartalmaz megnyitható HTTPS-hivatkozást.")
    } catch {
      setQrError("A QR-kódot nem sikerült beolvasni. Próbálj másik képet.")
    } finally {
      bitmap?.close()
    }
  }
  const openQr = () => { setQrValue(""); setQrError(""); setSheet("qr") }

  return <div className="ref-space library-space">
    <input ref={filePicker} className="ref-hidden-file" type="file" multiple aria-label="Fájl kiválasztása" onChange={uploadFile} />
    <input ref={qrPicker} className="ref-hidden-file" type="file" accept="image/*" aria-label="QR-kód képfájl kiválasztása" onChange={event => { void importQrImage(event) }} />

    <div className="library-search" role="search">
      <Search size={20} strokeWidth={1.8} aria-hidden="true" />
      <input ref={searchInput} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setQuery("") }} placeholder="Fájlok és mappák keresése" aria-label="Fájlok és mappák keresése" enterKeyHint="search" autoComplete="off" />
      {query && <button type="button" aria-label="Keresés törlése" onClick={() => { setQuery(""); searchInput.current?.focus() }}><X size={16} /></button>}
    </div>

    <div className="library-toolbar">
      {folder || location !== "home" ? <div className="library-location">
        <button className="library-back" type="button" aria-label="Vissza" onClick={() => { if (folder) setFolder(entries.find(item => item.id === folder)?.parent || null); else setLocation("home"); setQuery("") }}><ChevronLeft size={20} aria-hidden="true" /></button>
        <h1 title={folderName}>{folder ? folderName : location === "files" ? "Saját fájlok" : location === "downloads" ? "Letöltések" : "Nemrég töröltek"}</h1>
      </div> : <div className="library-quick-actions">
        <button className="library-quick-button" type="button" aria-label="Tárhely áttekintése" aria-haspopup="dialog" onClick={() => setSheet("storage")}>
          <span className="library-storage-ring" style={usagePercent === null ? undefined : { background: `conic-gradient(#5e5e62 ${usagePercent}%, #dedee1 0)` }} aria-hidden="true"><span /></span>
        </button>
        <button className="library-quick-button" type="button" aria-label="QR-kód beolvasása" aria-haspopup="dialog" onClick={openQr}><QrCode size={24} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>}
      <div className="library-toolbar-actions">
        <button className="library-view-button" type="button" aria-label="Nézet és rendezés" aria-haspopup="dialog" onClick={() => setSheet("view")}>{view === "list" ? <Grid2X2 size={22} strokeWidth={1.85} aria-hidden="true" /> : <List size={22} strokeWidth={1.85} aria-hidden="true" />}</button>
        <button className="library-add-primary" type="button" aria-label="Új fájl vagy mappa hozzáadása" onClick={() => { if (location === "trash" || location === "downloads") { setLocation("files"); setFolder(null) } setDraftName(""); setSheet("new") }}><Plus size={20} strokeWidth={1.85} aria-hidden="true" /><span>Új</span></button>
      </div>
    </div>
    {location === "home" && !normalizedQuery && <div className="library-home">
      <section aria-labelledby="library-favorites-heading">
        <h2 id="library-favorites-heading" className="library-home-heading">Kedvencek <ChevronDown size={18} /></h2>
        <div className="library-home-group">
          <button type="button" onClick={() => { setLocation("downloads"); setFolder(null) }}><ArrowDownToLine size={21} /><span>Letöltések</span><ChevronRight size={20} /></button>
        </div>
      </section>
      <section aria-labelledby="library-locations-heading">
        <h2 id="library-locations-heading" className="library-home-heading">Helyek <ChevronDown size={18} /></h2>
        <div className="library-home-group">
          <button type="button" onClick={() => { setLocation("files"); setFolder(null) }}><Cloud size={21} /><span>Saját fájlok</span><ChevronRight size={20} /></button>
          {entries.filter(item => item.kind === "folder" && !item.parent).map(entry => <button type="button" key={entry.id} onClick={() => { setLocation("files"); setFolder(entry.id) }}><Folder size={21} /><span>{entry.name}<small>{folderCounts.get(entry.id) || 0} elem</small></span><ChevronRight size={20} /></button>)}
          <button type="button" onClick={() => { setLocation("trash"); setFolder(null) }}><Trash2 size={21} /><span>Nemrég töröltek{deletedEntries.length > 0 && <small>{deletedEntries.length} elem</small>}</span><ChevronRight size={20} /></button>
        </div>
      </section>
    </div>}
    {normalizedQuery && <p className="library-results-status" aria-live="polite">{visible.length} találat</p>}

    {selectionMode && <div className="library-selection-bar">
      <button type="button" onClick={() => { setSelectionMode(false); setSelected(new Set()) }}><X size={20} /> Kész</button>
      <strong>{selected.size} kijelölve</strong>
      <button type="button" disabled={!selected.size} aria-label="Kijelöltek törlése" onClick={() => setSheet("delete")}><Trash2 size={20} /></button>
    </div>}

    {(location === "home" && !normalizedQuery) ? null : loading ? <div className="library-loading" role="status"><span /> <span /> <span /></div> : visible.length ? <div className={`library-files ${view === "grid" ? "is-grid" : "is-list"}`}>
      {visible.map(entry => <article className={`library-file ${selected.has(entry.id) ? "is-selected" : ""}`} key={entry.id}>
        <button className="library-file-open" type="button" aria-label={location === "trash" ? `${entry.name} visszaállítása` : selectionMode ? `${entry.name} kijelölése` : entry.kind === "folder" ? `${entry.name} mappa megnyitása` : `${entry.name} előnézete`} aria-pressed={selectionMode ? selected.has(entry.id) : undefined} onPointerDown={event => beginLongPress(entry, event)} onPointerMove={moveLongPress} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={() => location === "trash" ? restoreEntry(entry) : openEntry(entry)}>
          <span className="library-file-icon"><FileIcon kind={entry.kind} /></span>
          <span className="library-file-copy"><strong title={entry.name}>{entry.name}</strong><small>{entry.kind === "folder" ? `${folderCounts.get(entry.id) || 0} elem` : `${formatSize(entry.size)} · ${formatDate(entry.modifiedAt)}`}</small></span>
          {location === "trash" && <span className="library-restore-label">Visszaállítás</span>}
          {selectionMode && location !== "trash" && <span className="library-check" aria-hidden="true">{selected.has(entry.id) && <Check size={15} />}</span>}
        </button>
        {location === "trash" ? <button className="library-file-more" type="button" aria-label={entry.name + " végleges törlése"} onClick={() => permanentlyDelete(entry)}><Trash2 size={19} /></button> : !selectionMode && <button className="library-file-more" type="button" aria-label={`${entry.name} műveletei`} onClick={() => openActions(entry)}><MoreHorizontal size={21} /></button>}
      </article>)}
    </div> : location === "files" && !folder && !query ? <div className="library-empty library-empty--quiet" role="status">
      <span className="library-visually-hidden">A Könyvtár üres. Az Új gombbal létrehozhatsz mappát vagy feltölthetsz fájlt.</span>
    </div> : <div className="library-empty">
      <FolderOpen size={38} strokeWidth={1.5} />
      <h2>{query ? "Nincs találat" : location === "trash" ? "Nincsenek törölt elemek" : location === "downloads" ? "Még nincs letöltés" : "Ez a mappa üres"}</h2>
      <p>{query ? "Próbálj más kifejezést, vagy töröld a keresést." : location === "downloads" ? "Az Evölingóból letöltött fájlok itt jelennek meg." : location === "trash" ? "A törölt fájlok és mappák itt állíthatók vissza." : "Itt még nincsenek fájlok."}</p>
      {query && <button className="library-empty-clear" type="button" onClick={() => setQuery("")}>Keresés törlése</button>}
    </div>}

    {notice && <div className="library-toast" role="status">{notice}<button type="button" aria-label="Bezárás" onClick={() => setNotice("")}><X size={16} /></button></div>}

    {sheet && <div className="library-sheet-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setSheet(null) }}>
      <div ref={sheetRef} className={`library-sheet library-sheet--${sheet}`} role="dialog" aria-modal="true" aria-label={sheet === "new" ? "Új elem" : sheet === "view" ? "Nézet és rendezés" : sheet === "sort" ? "Rendezés" : sheet === "storage" ? "Tárhely" : sheet === "qr" ? "QR-kód beolvasása" : sheet === "preview" ? "Fájl előnézete" : "Fájlműveletek"}>
        <div className="library-sheet-handle" aria-hidden="true" onTouchStart={event => { sheetTouchY.current = event.touches[0]?.clientY ?? null }} onTouchEnd={event => { const start = sheetTouchY.current; sheetTouchY.current = null; if (start != null && (event.changedTouches[0]?.clientY ?? start) - start > 80) setSheet(null) }} />
        <div className="library-sheet-heading"><h2>{sheet === "new" ? "Új elem" : sheet === "view" ? "Nézet és rendezés" : sheet === "sort" ? "Rendezés" : sheet === "storage" ? "Tárhely" : sheet === "qr" ? "QR-kód beolvasása" : sheet === "rename" ? "Átnevezés" : sheet === "move" ? "Áthelyezés" : sheet === "delete" ? "Törlés" : sheet === "preview" ? active?.name : active?.name}</h2><button type="button" aria-label="Bezárás" onClick={() => setSheet(null)}><X size={20} /></button></div>

        {sheet === "storage" && <div className="library-storage-overview">
          <span className="library-storage-overview-icon"><Cloud size={24} strokeWidth={1.6} aria-hidden="true" /></span>
          <strong>{hasRealStorage ? formatSize(storageUsed!) + " / " + formatSize(storageTotal!) : formatSize(localBytes)}</strong>
          <p>{hasRealStorage ? "Felhasznált felhőtárhely" : "Helyben tárolt fájlok mérete"}</p>
          <small>{entries.filter(item => item.kind !== "folder").length} fájl · {entries.filter(item => item.kind === "folder").length} mappa</small>
          {!hasRealStorage && <small>A Könyvtár az eszközöd böngészőjében tárolja az adataidat. A felhőtárhely nincs beállítva.</small>}
        </div>}

        {sheet === "qr" && <div className="library-qr-sheet">
          <p>Válassz egy QR-kódot tartalmazó képet, vagy illeszd be a benne található hivatkozást.</p>
          <button className="library-qr-pick" type="button" onClick={() => qrPicker.current?.click()}><QrCode size={20} strokeWidth={1.8} /> Kép kiválasztása</button>
          <label htmlFor="library-qr-url">HTTPS-hivatkozás</label>
          <input id="library-qr-url" type="url" inputMode="url" value={qrValue} onChange={event => { setQrValue(event.target.value); setQrError("") }} placeholder="https://..." autoCapitalize="off" spellCheck={false} />
          {qrError && <p className="library-qr-error" role="alert">{qrError}</p>}
          <button className="library-qr-open" type="button" disabled={!safeQrUrl(qrValue)} onClick={() => { const link = safeQrUrl(qrValue); if (link) { window.open(link, "_blank", "noopener,noreferrer"); setSheet(null) } }}>Hivatkozás megnyitása</button>
          <small>A QR-beolvasás elérhetősége a böngészőtől függ. A hivatkozást nem küldjük szerverre.</small>
        </div>}

        {sheet === "new" && <div className="library-sheet-actions">
          <button type="button" onClick={() => { setSheet(null); filePicker.current?.click() }}><Upload size={21} /><span><strong>Fájl feltöltése</strong><small>Legfeljebb 2 MB · az eszközödről</small></span></button>
          <div className="library-new-folder"><label htmlFor="library-folder-name"><Folder size={21} /><span>Új mappa</span></label><div><input id="library-folder-name" value={draftName} onChange={event => setDraftName(event.target.value)} placeholder="Mappa neve" maxLength={80} /><button type="button" disabled={!draftName.trim()} onClick={createFolder}>Létrehozás</button></div></div>
        </div>}

        {sheet === "view" && <div className="library-sheet-actions">
          <button type="button" aria-pressed={view === "list"} onClick={() => { changeView("list"); setSheet(null) }}><List size={20} /><span><strong>Listanézet</strong><small>Fájlok részletes sorokban</small></span>{view === "list" && <Check size={19} />}</button>
          <button type="button" aria-pressed={view === "grid"} onClick={() => { changeView("grid"); setSheet(null) }}><Grid2X2 size={20} /><span><strong>Rácsnézet</strong><small>Fájlok kártyákon</small></span>{view === "grid" && <Check size={19} />}</button>
          <button type="button" onClick={() => setSheet("sort")}><SlidersHorizontal size={20} /><span><strong>Rendezés</strong><small>{SORT_LABELS[sort]}</small></span></button>
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

        {sheet === "delete" && <div className="library-confirm"><Trash2 size={28} /><p>{selected.size > 1 ? `${selected.size} elem a Nemrég töröltek közé kerül.` : `A(z) „${active?.name || entries.find(item => selected.has(item.id))?.name || "kijelölt elem"}” véglegesen törlődik.`}</p><div><button type="button" onClick={() => setSheet(null)}>Mégse</button><button className="is-destructive" type="button" onClick={() => deleteEntries(selected.size ? selected : new Set(active ? [active.id] : []))}>Törlés</button></div></div>}

        {sheet === "preview" && active && <div className="library-preview"><iframe src={readBlobs()[active.id]} title={`${active.name} előnézete`} sandbox="" /><div><button type="button" onClick={() => download(active)}><ArrowDownToLine size={19} /> Letöltés</button><button type="button" onClick={() => void share(active)}><Share2 size={19} /> Megosztás</button></div></div>}
      </div>
    </div>}
  </div>
}
