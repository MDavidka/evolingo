"use client"

import { useEffect, useState, type FormEvent } from "react"
import { AlignLeft, BadgeCheck, Blocks, BookOpen, Bug, Check, Circle, FileText, Lightbulb, LoaderCircle, Palette, Plus, Puzzle, Repeat2, Target, Type, Wrench, X } from "lucide-react"
import { EmptyState, SkeletonList } from "@/components/arc/loading-states"

export type BuilderTask = {
  id: string
  icon: string
  name: string
  description: string
  plan: string
  markdown: string
  approved: boolean
  createdAt: number
}

const KEY = "evolingo.brainstorm.v1"
const MIGRATED_KEY = "evolingo.brainstorm.shared-migrated.v1"
const UPDATE_EVENT = "evolingo:brainstorm-updated"
const taskIcons: Record<string, typeof FileText> = {
  "🔠": Type, "🔤": Type, "🎨": Palette, "🧹": AlignLeft, "🧩": Puzzle,
  "🔘": Circle, "🧱": Blocks, "🎯": Target, "🐛": Bug, "🔁": Repeat2,
  "⚫": Circle, "🗺️": BookOpen, "🗺": BookOpen, "📚": BookOpen,
  "🛠️": Wrench, "🛠": Wrench, "✅": BadgeCheck,
}

function taskMarkdown(name: string, description: string, plan = "") {
  return `# ${name}\n\n${description}\n${plan.trim() ? `\n## Terv\n\n${plan.trim()}\n` : ""}`
}

export function readBrainstormItems(): BuilderTask[] {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item): BuilderTask[] => {
      if (!item || typeof item !== "object") return []
      const value = item as Record<string, unknown>
      // Migrate the earlier brainstorm entries into the builder task format.
      const name = typeof value.name === "string" ? value.name : typeof value.text === "string" ? value.text.slice(0, 56) : ""
      const description = typeof value.description === "string" ? value.description : typeof value.text === "string" ? value.text.slice(56).trim() || value.text : ""
      const plan = typeof value.plan === "string" ? value.plan : ""
      if (!name) return []
      return [{
        id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
        icon: typeof value.icon === "string" ? value.icon : "",
        name,
        description,
        plan,
        markdown: typeof value.markdown === "string" ? value.markdown : taskMarkdown(name, description, plan),
        approved: value.approved === true,
        createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      }]
    })
  } catch { return [] }
}

function saveTasks(tasks: BuilderTask[]) {
  try { localStorage.setItem(KEY, JSON.stringify(tasks)) } catch {}
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

async function syncSharedTasks() {
  if (localStorage.getItem(MIGRATED_KEY) !== "1") {
    const localTasks = readBrainstormItems()
    for (const task of localTasks) {
      const migrated = await fetch("/api/brainstorm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) })
      if (!migrated.ok) throw new Error("A korábbi feladatok megosztása nem sikerült.")
    }
    localStorage.setItem(MIGRATED_KEY, "1")
  }
  const response = await fetch("/api/brainstorm", { cache: "no-store" })
  if (!response.ok) throw new Error("A közös feladatlista nem érhető el.")
  const payload = await response.json() as { tasks?: BuilderTask[] }
  const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
  saveTasks(tasks)
  return tasks
}

/** AI builders can enqueue a draft for explicit user approval through this client event. */
export async function queueBuilderTask(input: { icon?: string; name: string; description: string; plan?: string; markdown?: string }) {
  const icon = input.icon?.trim().slice(0, 8) || ""
  const name = input.name.trim().slice(0, 80)
  const description = input.description.trim().slice(0, 500)
  const plan = input.plan?.trim().slice(0, 10000) || ""
  if (!name || !description || typeof window === "undefined") return
  const task: BuilderTask = { id: crypto.randomUUID(), icon, name, description, plan, markdown: input.markdown?.trim().slice(0, 12000) || taskMarkdown(name, description, plan), approved: false, createdAt: Date.now() }
  const response = await fetch("/api/brainstorm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) })
  if (!response.ok) throw new Error("A feladat mentése nem sikerült.")
  await syncSharedTasks()
}

export async function readApprovedBrainstormItems(): Promise<string[]> {
  const tasks = await syncSharedTasks()
  return tasks.filter(task => task.approved)
    .map(task => `${task.name}: ${task.description}${task.plan ? `\nTerv: ${task.plan}` : ""}`.slice(0, 700)).slice(0, 20)
}

export default function Brainstorm() {
  const [tasks, setTasks] = useState<BuilderTask[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [icon, setIcon] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [plan, setPlan] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const retryLoad = async () => {
    setLoading(true); setLoadError(false)
    let timeout = 0
    try {
      const result = await Promise.race([
        syncSharedTasks(),
        new Promise<never>((_, reject) => { timeout = window.setTimeout(() => reject(new Error("Betöltési időtúllépés")), 8000) }),
      ])
      setTasks(result)
    } catch { setLoadError(true) }
    finally { window.clearTimeout(timeout); setLoading(false) }
  }
  useEffect(() => {
    let active = true
    let hasLoaded = false
    let timeout: number | undefined
    const sync = () => setTasks(readBrainstormItems())
    const refresh = () => {
      if (!hasLoaded) {
        window.clearTimeout(timeout)
        timeout = window.setTimeout(() => { if (active && !hasLoaded) { setLoadError(true); setLoading(false) } }, 8000)
      }
      void syncSharedTasks().then(result => {
        if (!active) return
        hasLoaded = true
        window.clearTimeout(timeout)
        setTasks(result); setLoadError(false); setLoading(false)
      }).catch(() => {
        if (!active) return
        hasLoaded = true
        window.clearTimeout(timeout)
        setLoadError(true); setLoading(false)
      })
    }
    sync()
    refresh()
    window.addEventListener("storage", sync)
    window.addEventListener(UPDATE_EVENT, sync)
    window.addEventListener("focus", refresh)
    const timer = window.setInterval(refresh, 15000)
    return () => {
      active = false
      window.clearTimeout(timeout)
      window.removeEventListener("storage", sync)
      window.removeEventListener(UPDATE_EVENT, sync)
      window.removeEventListener("focus", refresh)
      window.clearInterval(timer)
    }
  }, [])

  const update = async (change: (old: BuilderTask[]) => BuilderTask[]) => {
    if (saving) return
    setSaving(true)
    setNotice("")
    try {
    const next = change(tasks)
    const priorIds = new Set(tasks.map(task => task.id))
    const nextIds = new Set(next.map(task => task.id))
    const responses = await Promise.all([
      ...next.filter(task => !priorIds.has(task.id)).map(task => fetch("/api/brainstorm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) })),
      ...next.filter(task => priorIds.has(task.id) && tasks.find(old => old.id === task.id)?.approved !== task.approved).map(task => fetch("/api/brainstorm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, approved: task.approved }) })),
      ...tasks.filter(task => !nextIds.has(task.id)).map(task => fetch(`/api/brainstorm?id=${encodeURIComponent(task.id)}`, { method: "DELETE" })),
    ])
    if (responses.some(response => !response.ok)) throw new Error("Mentés sikertelen")
    await syncSharedTasks().then(setTasks)
    return true
    } catch {
      setNotice("A módosítás nem sikerült. Próbáld újra.")
      return false
    } finally { setSaving(false) }
  }
  const download = (task: BuilderTask) => {
    const blob = new Blob([task.markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${task.name.toLocaleLowerCase("hu").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "feladat"}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = name.trim()
    const shortDescription = description.trim()
    if (!title || !shortDescription) return
    if (saving) return
    setSaving(true); setNotice("")
    try {
      await queueBuilderTask({ icon, name: title, description: shortDescription, plan })
      setName(""); setDescription(""); setPlan(""); setIcon(""); setFormOpen(false)
      setTasks(readBrainstormItems()); setNotice("Feladat elmentve")
      window.setTimeout(() => setNotice(current => current === "Feladat elmentve" ? "" : current), 2600)
    } catch { setNotice("A feladat mentése nem sikerült. Próbáld újra.") }
    finally { setSaving(false) }
  }

  const waiting = tasks.filter(task => !task.approved).length
  return <main className="evo-brainstorm">
    <header className="evo-brainstorm-header">
      <span className="evo-brainstorm-icon"><Lightbulb size={22} /></span>
      <div><h1>Ötletbörze</h1><p>Közös AI builder munkaterv, minden felhasználó számára. A feladat jóváhagyás után aktív.</p></div>
    </header>
    <section className="evo-brainstorm-section">
      <div className="evo-brainstorm-section-title"><div><h2>Builder feladatok</h2><p>{waiting ? `${waiting} feladat vár jóváhagyásra` : "Nincs jóváhagyásra váró feladat"}</p></div><div className="evo-brainstorm-section-tools"><span className="evo-brainstorm-count">{tasks.length}</span><button className="evo-brainstorm-add-button" type="button" aria-label="Feladat hozzáadása" title="Feladat hozzáadása" onClick={() => setFormOpen(open => !open)}><Plus size={19} /></button></div></div>
      {notice && <p className="evo-brainstorm-notice" role="status">{notice}</p>}
      {formOpen && <form className="evo-brainstorm-form" onSubmit={submitTask}>
        <label className="evo-brainstorm-icon-field"><span>Ikon</span><input value={icon} onChange={event => setIcon(event.target.value)} maxLength={8} placeholder="✨" aria-label="Feladat ikonja" /></label>
        <label><span>Rövid cím</span><input required value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder="Például: Mobilnézet javítása" /></label>
        <label><span>Rövid leírás</span><input required value={description} onChange={event => setDescription(event.target.value)} maxLength={500} placeholder="Mit kell elkészíteni?" /></label>
        <label><span>Hosszú terv</span><textarea value={plan} onChange={event => setPlan(event.target.value)} maxLength={10000} rows={5} placeholder="Lépések, elfogadási feltételek, érintett fájlok…" /></label>
        <div className="evo-brainstorm-form-footer"><span>Minden felhasználó számára látható lesz.</span><button type="submit" disabled={saving || !name.trim() || !description.trim()}>{saving && <LoaderCircle size={15} className="arc-save-spinner" aria-hidden="true" />}{saving ? "Mentés…" : "Mentés feladatként"}</button></div>
      </form>}
      {loading ? <SkeletonList count={4} variant="card" /> : loadError ? <EmptyState title="Nem sikerült betölteni" description="A közös feladatlista most nem érhető el." action={<button className="evo-brainstorm-retry" type="button" onClick={() => void retryLoad()}>Újra</button>} /> : tasks.length ? <div className="evo-brainstorm-list">{tasks.map(task => <article key={task.id} className={`evo-brainstorm-task${task.approved ? " is-approved" : ""}`}>
        <div className="evo-brainstorm-task-heading"><span className="evo-brainstorm-task-icon">{(() => { const Icon = taskIcons[task.icon] ?? FileText; return <Icon size={17} strokeWidth={1.75} aria-hidden="true" /> })()}</span><div className="evo-brainstorm-task-copy"><h3>{task.name}</h3><p>{task.description}</p></div>{task.approved && <span className="evo-brainstorm-check"><Check size={15} /></span>}</div>
        <button className="evo-brainstorm-file" type="button" onClick={() => download(task)}><FileText size={16} /><span>{task.name.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "feladat"}.md</span><span className="evo-brainstorm-file-action">Letöltés</span></button>
        <div className="evo-brainstorm-task-footer"><small>{new Date(task.createdAt).toLocaleDateString("hu-HU")} · {task.approved ? "Jóváhagyva" : "Jóváhagyásra vár"}</small><div>{!task.approved && <button type="button" className="evo-brainstorm-dismiss" disabled={saving} aria-label="Feladat elvetése" onClick={() => void update(old => old.filter(item => item.id !== task.id))}><X size={17} /></button>}<button type="button" className="evo-brainstorm-approve" disabled={saving} onClick={() => void update(old => old.map(item => item.id === task.id ? { ...item, approved: !item.approved } : item))}>{saving && <LoaderCircle size={14} className="arc-save-spinner" aria-hidden="true" />}{task.approved ? "Visszavonás" : "Jóváhagyás"}</button></div></div>
      </article>)}</div> : <div className="evo-brainstorm-empty"><span><FileText size={22} /></span><strong>A munkaterület üres</strong><p>Az AI builder rövid nevű és leírású feladatokat, valamint hozzájuk tartozó .md fájlokat tesz ide ellenőrzésre.</p></div>}
    </section>
  </main>
}
