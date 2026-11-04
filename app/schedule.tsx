"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { CalendarClock, Check, ChevronDown, CirclePause, Clock3, MoreHorizontal, Plus, Search, Trash2, Workflow } from "lucide-react"

type Status = "active" | "paused" | "completed"
type Kind = "scheduled" | "long"
type Repeat = "once" | "daily" | "weekly"
type ScheduledTask = {
  id: string
  title: string
  note: string
  kind: Kind
  repeat: Repeat
  status: Status
  step: number
  totalSteps: number
  due: string
  time?: string
  createdAt: number
}
const KEY = "evolingo.schedule.v1"
const TABS: { value: Status; label: string }[] = [
  { value: "active", label: "Aktív" },
  { value: "paused", label: "Szüneteltetve" },
  { value: "completed", label: "Befejezett" },
]
const repeatLabel: Record<Repeat, string> = { once: "Egyszeri", daily: "Naponta", weekly: "Hetente" }
function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
}
function readTasks(): ScheduledTask[] {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "[]") as ScheduledTask[]
    return Array.isArray(stored) ? stored.filter(item => item && typeof item.id === "string" && typeof item.title === "string" && ["active", "paused", "completed"].includes(item.status)) : []
  } catch { return [] }
}

export default function Schedule() {
  const [ready, setReady] = useState(false)
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [tab, setTab] = useState<Status>("active")
  const [query, setQuery] = useState("")
  const [formKind, setFormKind] = useState<Kind | null>(null)
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [repeat, setRepeat] = useState<Repeat>("once")
  const [due, setDue] = useState("")
  const [time, setTime] = useState("09:00")
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [total, setTotal] = useState(5)
  const [menu, setMenu] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => { setTasks(readTasks()); setReady(true) }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(KEY, JSON.stringify(tasks)) } catch { setError("A feladatokat nem sikerült elmenteni ezen az eszközön.") }
  }, [tasks, ready])

  const weekDays = useMemo(() => {
    const start = new Date(selectedDay + "T12:00:00")
    start.setDate(start.getDate() - (start.getDay() + 6) % 7)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index)
      return { key: dateKey(date), date: date.getDate(), label: ["H", "K", "Sze", "Cs", "P", "Szo", "V"][index] }
    })
  }, [selectedDay])
  const visible = useMemo(() => tasks
    .filter(item => item.status === tab && (item.title + " " + item.note).toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu")))
    .sort((a, b) => b.createdAt - a.createdAt), [tasks, tab, query])

  const update = (id: string, patch: Partial<ScheduledTask>) => {
    setTasks(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
    setMenu(null)
  }
  const start = (kind: Kind) => {
    setFormKind(kind); setTitle(""); setNote(""); setDue(kind === "scheduled" ? selectedDay : ""); setTime("09:00"); setTotal(5); setRepeat("once"); setError("")
  }
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = title.trim()
    if (!value || !formKind) return
    const next: ScheduledTask = {
      id: crypto.randomUUID(), title: value, note: note.trim(), kind: formKind,
      repeat: formKind === "long" ? "once" : repeat, status: "active", step: 0,
      totalSteps: formKind === "long" ? Math.max(2, Math.min(20, total)) : 1,
      due: formKind === "scheduled" ? due : "", time: formKind === "scheduled" ? time : "", createdAt: Date.now(),
    }
    setTasks(current => [next, ...current])
    setFormKind(null); setTab("active")
  }
  const advance = (item: ScheduledTask) => {
    const step = Math.min(item.totalSteps, item.step + 1)
    update(item.id, { step, status: step === item.totalSteps ? "completed" : "active" })
  }
  const completeScheduled = (item: ScheduledTask) => {
    if (item.repeat === "once") { update(item.id, { status: "completed", step: 1 }); return }
    // Repeating tasks are manually ticked off; advance their next planned day.
    // This does not represent execution by a background worker.
    const today = new Date(); today.setHours(12, 0, 0, 0)
    const planned = item.due ? new Date(item.due + "T12:00:00") : today
    const base = Number.isFinite(planned.getTime()) && planned > today ? planned : today
    base.setDate(base.getDate() + (item.repeat === "daily" ? 1 : 7))
    const due = [base.getFullYear(), String(base.getMonth() + 1).padStart(2, "0"), String(base.getDate()).padStart(2, "0")].join("-")
    update(item.id, { due, status: "active", step: 0 })
  }
  return <div className="evo-schedule">
    <header className="evo-schedule-heading"><h1>Ütemezés</h1><p>Saját feladatok és emlékeztetők</p></header>
    <div className="evo-schedule-week" aria-label="Dátum kiválasztása az új feladathoz">
      {weekDays.map(day => <button key={day.key} type="button" aria-label={day.key} aria-pressed={day.key === selectedDay}
        className={(day.key === selectedDay ? "is-selected " : "") + (day.key === dateKey(new Date()) ? "is-today" : "")}
        onClick={() => setSelectedDay(day.key)}><span>{day.label}</span><strong>{day.date}</strong></button>)}
    </div>
    <nav className="evo-schedule-tabs" aria-label="Feladatok állapota">
      {TABS.map(item => <button key={item.value} type="button" aria-current={tab === item.value ? "page" : undefined} className={tab === item.value ? "is-active" : ""} onClick={() => { setTab(item.value); setMenu(null) }}>{item.label}</button>)}
    </nav>
    <div className="evo-schedule-rule" />
    <section className="evo-schedule-list" aria-live="polite">
      {!ready ? null : visible.length ? visible.map(item => <article className="evo-schedule-card" key={item.id}>
        <div className="evo-schedule-card-head">
          <span className="evo-schedule-icon">{item.kind === "long" ? <Search size={23} strokeWidth={1.75} /> : <CalendarClock size={23} strokeWidth={1.75} />}</span>
          <span className="evo-schedule-card-copy"><strong>{item.title}</strong><small>{item.kind === "long" ? "Hosszú feladat" : repeatLabel[item.repeat]} · {item.status === "active" ? "Aktív" : item.status === "paused" ? "Szüneteltetve" : "Befejezve"}</small></span>
          <button className="evo-schedule-more" type="button" aria-label={item.title + " műveletei"} aria-expanded={menu === item.id} onClick={() => setMenu(menu === item.id ? null : item.id)}><MoreHorizontal size={22} /></button>
        </div>
        {item.kind === "long" && <div className="evo-schedule-progress"><div role="progressbar" aria-label="Feladat haladása" aria-valuenow={item.step} aria-valuemin={0} aria-valuemax={item.totalSteps}><span style={{ width: 100 * item.step / item.totalSteps + "%" }} /></div><small>{item.step}. lépés / {item.totalSteps}</small></div>}
        {item.note && <p className="evo-schedule-note">{item.note}</p>}
        {item.due && <p className="evo-schedule-date"><Clock3 size={14} /> {item.time ? <strong>{item.time}</strong> : null} {new Date(item.due + "T12:00:00").toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}</p>}
        {menu === item.id && <div className="evo-schedule-actions">
          {item.status === "active" && <button type="button" onClick={() => update(item.id, { status: "paused" })}><CirclePause size={16} /> Szüneteltetés</button>}
          {item.status !== "active" && <button type="button" onClick={() => update(item.id, { status: "active", ...(item.step === item.totalSteps ? { step: 0 } : {}) })}><Check size={16} /> Újraindítás</button>}
          {item.status !== "completed" && <button type="button" onClick={() => update(item.id, { status: "completed", step: item.totalSteps })}><Check size={16} /> Befejezés</button>}
          <button className="is-destructive" type="button" onClick={() => { setTasks(current => current.filter(task => task.id !== item.id)); setMenu(null) }}><Trash2 size={16} /> Törlés</button>
        </div>}
        {item.kind === "long" && item.status === "active" && <button type="button" className="evo-schedule-next" onClick={() => advance(item)}><Check size={16} /> Következő lépés kész</button>}
        {item.kind === "scheduled" && item.status === "active" && <button type="button" className="evo-schedule-next" onClick={() => completeScheduled(item)}><Check size={16} /> {item.repeat === "once" ? "Késznek jelölés" : "Alkalom kész"}</button>}
      </article>) : <div className="evo-schedule-empty"><CalendarClock size={26} strokeWidth={1.5} /><strong>{query ? "Nincs találat" : tab === "active" ? "Nincs aktív feladat" : tab === "paused" ? "Nincs szüneteltetett feladat" : "Még nincs befejezett feladat"}</strong><p>{query ? "Próbálj másik keresést." : "A saját feladataid itt jelennek meg. Újat alul hozhatsz létre."}</p></div>}
    </section>
    <div className="evo-schedule-bottom">
      <div className="evo-schedule-create">
        <button type="button" className="evo-schedule-long" onClick={() => start("long")}><Workflow size={20} /> Hosszú feladat</button>
        <button type="button" className="evo-schedule-new" onClick={() => start("scheduled")}><Plus size={21} /> Új feladat</button>
      </div>
      <label className="evo-schedule-search"><Search size={22} strokeWidth={1.7} /><input type="search" placeholder="Feladatok keresése" aria-label="Feladatok keresése" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    {error && <p className="evo-schedule-error" role="alert">{error}</p>}
    {formKind && <div className="evo-schedule-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setFormKind(null) }}>
      <form className="evo-schedule-dialog" onSubmit={create} aria-label="Feladat létrehozása">
        <div className="evo-schedule-dialog-head"><h2>{formKind === "long" ? "Hosszú feladat" : "Új feladat"}</h2><button type="button" onClick={() => setFormKind(null)} aria-label="Bezárás"><ChevronDown size={22} /></button></div>
        <label>Feladat neve<input required maxLength={100} value={title} autoFocus onChange={event => setTitle(event.target.value)} placeholder="Mit szeretnél elvégezni?" /></label>
        <label>Leírás (opcionális)<textarea rows={3} maxLength={800} value={note} onChange={event => setNote(event.target.value)} placeholder="Részletek…" /></label>
        {formKind === "long" ? <label>Lépések száma<input type="number" min={2} max={20} value={total} onChange={event => setTotal(Number(event.target.value) || 2)} /></label> : <>
          <label>Ismétlődés<select value={repeat} onChange={event => setRepeat(event.target.value as Repeat)}><option value="once">Egyszer</option><option value="daily">Naponta</option><option value="weekly">Hetente</option></select></label>
          <label>Dátum<input type="date" value={due} onChange={event => setDue(event.target.value)} /></label>
          <label>Időpont<input type="time" value={time} onChange={event => setTime(event.target.value)} /></label>
        </>}
        <p className="evo-schedule-disclaimer">A feladatok ezen az eszközön mentődnek. Automatikus háttérfuttatás és értesítés még nincs összekapcsolva.</p>
        <button className="evo-schedule-submit" type="submit"><Plus size={19} /> Létrehozás</button>
      </form>
    </div>}
  </div>
}
