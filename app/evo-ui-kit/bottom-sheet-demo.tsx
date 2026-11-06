"use client"

import { useMemo, useState, type FormEvent } from "react"
import {
  AlertTriangle, Bell, CalendarDays, Check, ChevronRight, Clock3, Copy,
  Download, FileText, Filter, Folder, Image, Info, Link2, ListChecks,
  LockKeyhole, MessageCircle, Mic, MoreHorizontal, Pencil, Plus,
  Search, Settings2, Share2, SlidersHorizontal, Sparkles, Trash2,
  Upload, WandSparkles, X, type LucideIcon,
} from "lucide-react"
import { UIButton } from "./button"
import { BottomSheet, type BottomSheetSize } from "./bottom-sheet"
import "./bottom-sheet-demo.css"

type SheetId =
  | "actions" | "context" | "confirm" | "create" | "edit" | "single"
  | "multiple" | "search" | "filters" | "date" | "permission"
  | "files" | "wizard" | "progress" | "agent"
type SheetExample = { id: SheetId; title: string; detail: string; Icon: LucideIcon; size: BottomSheetSize }
const examples: SheetExample[] = [
  { id: "actions", title: "Action menu", detail: "Share, rename, duplicate, delete", Icon: MoreHorizontal, size: "compact" },
  { id: "context", title: "Context actions", detail: "Actions for a selected file", Icon: FileText, size: "compact" },
  { id: "confirm", title: "Confirmation", detail: "Important or destructive operations", Icon: AlertTriangle, size: "compact" },
  { id: "create", title: "Simple form", detail: "Create a folder", Icon: Plus, size: "compact" },
  { id: "edit", title: "Multi-field form", detail: "Edit title and description", Icon: Pencil, size: "medium" },
  { id: "single", title: "Single selection", detail: "One option, one checkmark", Icon: Check, size: "compact" },
  { id: "multiple", title: "Multi-select", detail: "Checkbox preferences", Icon: ListChecks, size: "medium" },
  { id: "search", title: "Searchable picker", detail: "Search languages or items", Icon: Search, size: "expanded" },
  { id: "filters", title: "Filters", detail: "Sorting, categories and reset", Icon: Filter, size: "medium" },
  { id: "date", title: "Date and time", detail: "Schedule a reminder", Icon: CalendarDays, size: "compact" },
  { id: "permission", title: "Permission explanation", detail: "Explain before requesting access", Icon: Bell, size: "compact" },
  { id: "files", title: "Attachment menu", detail: "Choose a file source", Icon: Upload, size: "compact" },
  { id: "wizard", title: "Multi-step setup", detail: "Form steps with Back / Continue", Icon: WandSparkles, size: "medium" },
  { id: "progress", title: "Progress sheet", detail: "Operation status and finish", Icon: SlidersHorizontal, size: "compact" },
  { id: "agent", title: "AI task approval", detail: "Review agent action and approve", Icon: Sparkles, size: "medium" },
]

const languages = ["English", "Magyar", "Română", "Deutsch", "Français", "Italiano", "Español"]
const optionItems = ["Grammar", "Speaking", "Listening", "Writing"]

function ActionRow({ Icon, title, onClick, danger = false, trailing }: {
  Icon: LucideIcon
  title: string
  onClick: () => void
  danger?: boolean
  trailing?: string
}) {
  return <button type="button" className={"evo-sheet-demo__action" + (danger ? " evo-sheet-demo__action--danger" : "")} onClick={onClick}>
    <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
    <span>{title}</span>
    {trailing ? <small>{trailing}</small> : <ChevronRight size={17} aria-hidden="true" />}
  </button>
}

function Field({ label, value, onChange, placeholder, textarea = false, invalid = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  textarea?: boolean
  invalid?: boolean
}) {
  return <label className="evo-sheet-demo__field">
    <span>{label}</span>
    {textarea ?
      <textarea rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /> :
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-invalid={invalid} />}
  </label>
}

export default function BottomSheetShowcase() {
  const [active, setActive] = useState<SheetId | null>(null)
  const [toast, setToast] = useState("")
  const [name, setName] = useState("")
  const [title, setTitle] = useState("English practice")
  const [description, setDescription] = useState("")
  const [validation, setValidation] = useState(false)
  const [selection, setSelection] = useState("System")
  const [multi, setMulti] = useState<string[]>(["Grammar", "Speaking"])
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("Recent")
  const [category, setCategory] = useState("All")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("09:00")
  const [step, setStep] = useState(1)
  const [agentApproved, setAgentApproved] = useState(false)
  const [progress, setProgress] = useState(62)

  const current = examples.find(item => item.id === active)
  const filteredLanguages = useMemo(
    () => languages.filter(language => language.toLowerCase().includes(query.toLowerCase())),
    [query]
  )
  const close = () => { setActive(null); setValidation(false) }
  const simulated = (text: string) => { close(); setToast("Preview only · " + text) }
  const openExample = (id: SheetId) => {
    setToast("")
    setValidation(false)
    setActive(id)
    if (id === "wizard") setStep(1)
    if (id === "progress") setProgress(62)
    if (id === "agent") setAgentApproved(false)
  }
  const toggleMulti = (value: string) => setMulti(items =>
    items.includes(value) ? items.filter(item => item !== value) : [...items, value]
  )
  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) { setValidation(true); return }
    simulated('Folder "' + name.trim() + '" created (not saved)')
    setName("")
  }
  const pair = (secondary: string, primary: string, onPrimary: () => void) => (
    <div className="evo-sheet-demo__footer-pair">
      <UIButton variant="secondary" onClick={close} fullWidth>{secondary}</UIButton>
      <UIButton onClick={onPrimary} fullWidth>{primary}</UIButton>
    </div>
  )

  const footer = () => {
    switch (active) {
      case "confirm": return <div className="evo-sheet-demo__footer-pair"><UIButton variant="secondary" fullWidth onClick={close}>Cancel</UIButton><UIButton variant="danger" fullWidth onClick={() => simulated("Action confirmed; no data deleted")}>Confirm</UIButton></div>
      case "create": return <UIButton type="submit" form="evo-sheet-demo-create" fullWidth>Create folder</UIButton>
      case "edit": return pair("Cancel", "Save", () => simulated("Form changes not saved"))
      case "multiple": return <UIButton fullWidth onClick={() => simulated(multi.length + " selections applied")}>Apply selections</UIButton>
      case "filters": return <div className="evo-sheet-demo__footer-pair"><UIButton variant="secondary" fullWidth onClick={() => { setSort("Recent"); setCategory("All") }}>Reset</UIButton><UIButton fullWidth onClick={() => simulated(sort + " · " + category)}>Apply</UIButton></div>
      case "date": return <UIButton fullWidth disabled={!date} onClick={() => simulated("Reminder date selected")}>Schedule reminder</UIButton>
      case "permission": return <div className="evo-sheet-demo__footer-stack"><UIButton fullWidth onClick={() => simulated("No device permission requested")}>Continue</UIButton><UIButton fullWidth variant="ghost" onClick={close}>Not now</UIButton></div>
      case "wizard": return <div className="evo-sheet-demo__footer-pair"><UIButton variant="secondary" fullWidth onClick={() => step === 1 ? close() : setStep(value => Math.max(1, value - 1))}>{step === 1 ? "Cancel" : "Back"}</UIButton><UIButton fullWidth onClick={() => step === 3 ? simulated("Setup completed") : setStep(value => Math.min(3, value + 1))}>{step === 3 ? "Finish" : "Continue"}</UIButton></div>
      case "progress": return <UIButton fullWidth onClick={() => { if (progress < 100) setProgress(100); else simulated("Preview finished") }}>{progress < 100 ? "Complete preview" : "Done"}</UIButton>
      case "agent": return <div className="evo-sheet-demo__footer-pair"><UIButton variant="secondary" fullWidth onClick={() => simulated("Agent action rejected")}>Reject</UIButton><UIButton fullWidth onClick={() => { setAgentApproved(true); simulated("Agent action approved (no task run)") }}>Approve</UIButton></div>
      default: return null
    }
  }

  const content = () => {
    switch (active) {
      case "actions":
        return <div className="evo-sheet-demo__actions">
          <ActionRow Icon={Share2} title="Share" onClick={() => simulated("Share action")} />
          <ActionRow Icon={Pencil} title="Rename" onClick={() => simulated("Rename action")} />
          <ActionRow Icon={Copy} title="Duplicate" onClick={() => simulated("Duplicate action")} />
          <ActionRow Icon={Trash2} title="Delete" danger onClick={() => simulated("Delete action not performed")} />
        </div>
      case "context":
        return <div className="evo-sheet-demo__actions">
          <div className="evo-sheet-demo__file-info"><FileText size={23} /><span><strong>Study notes.pdf</strong><small>PDF · 2.4 MB · Demo</small></span></div>
          <ActionRow Icon={Share2} title="Share file" onClick={() => simulated("Share file")} />
          <ActionRow Icon={Link2} title="Copy link" onClick={() => simulated("Link copied in preview")} />
          <ActionRow Icon={Download} title="Download" onClick={() => simulated("No download started")} />
          <ActionRow Icon={Trash2} title="Remove" danger onClick={() => simulated("File not deleted")} />
        </div>
      case "confirm":
        return <div className="evo-sheet-demo__message">
          <AlertTriangle size={23} color="#ff3b30" />
          <p>This action cannot be undone. This is a preview; no data will be deleted.</p>
        </div>
      case "create":
        return <form id="evo-sheet-demo-create" onSubmit={create}>
          <Field label="Folder name" value={name} onChange={value => { setName(value); setValidation(false) }} placeholder="Enter folder name" invalid={validation} />
          {validation && <p className="evo-sheet-demo__error" role="alert">Enter a folder name to continue.</p>}
        </form>
      case "edit":
        return <div className="evo-sheet-demo__fields">
          <Field label="Title" value={title} onChange={setTitle} placeholder="Name this lesson" />
          <Field label="Description" value={description} onChange={setDescription} placeholder="Optional description" textarea />
          <p className="evo-sheet-demo__hint">Save demonstrates the UI and does not modify any lessons.</p>
        </div>
      case "single":
        return <div className="evo-sheet-demo__actions">
          {["System", "Light", "Dark"].map(option => <button type="button" className="evo-sheet-demo__option" key={option} onClick={() => { setSelection(option); simulated(option + " selected") }}>
            <span>{option}</span>{selection === option && <Check size={20} />}
          </button>)}
        </div>
      case "multiple":
        return <div className="evo-sheet-demo__actions">
          {optionItems.map(option => <label key={option} className="evo-sheet-demo__option">
            <span>{option}</span>
            <input type="checkbox" checked={multi.includes(option)} onChange={() => toggleMulti(option)} />
          </label>)}
        </div>
      case "search":
        return <div className="evo-sheet-demo__search-panel">
          <label className="evo-sheet-demo__search"><Search size={18} /><input aria-label="Search languages" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search languages" /></label>
          <div className="evo-sheet-demo__actions">
            {filteredLanguages.length ? filteredLanguages.map(language => <button type="button" className="evo-sheet-demo__option" key={language} onClick={() => simulated(language + " selected")}><span>{language}</span><ChevronRight size={17} /></button>) :
              <p className="evo-sheet-demo__hint">No languages found.</p>}
          </div>
        </div>
      case "filters":
        return <div className="evo-sheet-demo__fields">
          <div><span className="evo-sheet-demo__label">Sort by</span><div className="evo-sheet-demo__segments" role="group" aria-label="Sort files">
            {["Recent","Name","Type"].map(item => <button type="button" key={item} aria-pressed={sort===item} onClick={()=>setSort(item)}>{item}</button>)}
          </div></div>
          <div><span className="evo-sheet-demo__label">Category</span><div className="evo-sheet-demo__chips" role="group" aria-label="Choose file category">
            {["All","Documents","Images","Folders"].map(item=><button type="button" key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}
          </div></div>
        </div>
      case "date":
        return <div className="evo-sheet-demo__fields">
          <label className="evo-sheet-demo__field"><span>Date</span><input type="date" value={date} onChange={event=>setDate(event.target.value)} /></label>
          <label className="evo-sheet-demo__field"><span>Time</span><input type="time" value={time} onChange={event=>setTime(event.target.value)} /></label>
          <p className="evo-sheet-demo__hint">This preview does not create a real reminder.</p>
        </div>
      case "permission":
        return <div className="evo-sheet-demo__message"><Bell size={26} /><p>Enable reminders for lessons and upcoming tasks. Your browser or iPhone controls actual notification access.</p><div className="evo-sheet-demo__info"><Info size={16} /> This example will not request notification permission.</div></div>
      case "files":
        return <div className="evo-sheet-demo__actions">
          <ActionRow Icon={Upload} title="Choose from Files" onClick={()=>simulated("No file selected")} />
          <ActionRow Icon={Image} title="Choose from Photos" onClick={()=>simulated("No image selected")} />
          <ActionRow Icon={FileText} title="Recent documents" onClick={()=>simulated("Open recent files")} />
        </div>
      case "wizard":
        return <div className="evo-sheet-demo__fields">
          <div className="evo-sheet-demo__step-meta">Step {step} of 3</div>
          <div className="evo-sheet-demo__steps"><span data-done={step>=1}/><span data-done={step>=2}/><span data-done={step>=3}/></div>
          {step===1 ? <Field label="Project name" value={name} onChange={setName} placeholder="Example project" /> :
            step===2 ? <div className="evo-sheet-demo__message"><Settings2 size={23}/><p>Choose your default settings after creating the project.</p></div> :
            <div className="evo-sheet-demo__message"><Check size={23}/><p>Review your configuration and finish the example.</p></div>}
        </div>
      case "progress":
        return <div className="evo-sheet-demo__fields">
          <div className="evo-sheet-demo__progress-copy"><span>Processing example file</span><strong>{progress}%</strong></div>
          <div className="evo-sheet-demo__progress-track"><span style={{width:progress+"%"}}/></div>
          <p className="evo-sheet-demo__hint">{progress < 100 ? "Preview progress only; no background work is running." : "Preview complete."}</p>
        </div>
      case "agent":
        return <div className="evo-sheet-demo__fields">
          <div className="evo-sheet-demo__message"><Sparkles size={24}/><p>An assistant wants to create a study schedule. Review and approve before anything is changed.</p></div>
          <div className="evo-sheet-demo__summary">
            <span><CalendarDays size={18}/> Create a study schedule</span>
            <span><Clock3 size={18}/> One week</span>
            <span><LockKeyhole size={18}/> Approval required</span>
          </div>
          <p className="evo-sheet-demo__hint">{agentApproved ? "Previous approval was simulated." : "Approving here never runs an actual AI task."}</p>
        </div>
      default: return null
    }
  }

  return <div className="evo-sheet-demo">
    <header className="evo-sheet-demo__intro">
      <span className="evo-sheet-demo__eyebrow">EVOLINGO UI KIT / EDGE-TO-EDGE</span>
      <h3>Bottom sheets & forms</h3>
      <p>All pop-up examples open from the device bottom. One shared layout for actions, forms, selection, permissions and AI workflows.</p>
      <div className="evo-sheet-demo__principle"><Check size={16} /> Full viewport width · no bottom gap · safe-area aware</div>
    </header>
    <div className="evo-sheet-demo__grid">
      {examples.map(({ id, title: label, detail, Icon, size }) => <button className="evo-sheet-demo__launch" type="button" key={id} onClick={() => openExample(id)}>
        <span className="evo-sheet-demo__launch-icon"><Icon size={19} strokeWidth={1.75}/></span>
        <span className="evo-sheet-demo__launch-copy"><strong>{label}</strong><small>{detail}</small></span>
        <span className="evo-sheet-demo__size">{size}</span>
        <ChevronRight size={17} className="evo-sheet-demo__launch-chevron" />
      </button>)}
    </div>
    <p className="evo-sheet-demo__note">Examples use a reusable accessible BottomSheet with focus management, Escape and drag dismissal where safe, pinned actions, visual viewport keyboard adjustment and reduced-motion handling.</p>

    {toast && <div className="evo-sheet-demo__toast" role="status"><Check size={17}/><span>{toast}</span><button type="button" aria-label="Dismiss" onClick={()=>setToast("")}><X size={17}/></button></div>}
    {active && current && <BottomSheet
      title={active==="confirm" ? "Confirm action?" : current.title}
      description={active==="search" ? "Choose a language" : active==="wizard" ? "New project setup" : undefined}
      size={current.size}
      dismissible={!["create","edit","wizard"].includes(active)}
      role={active==="confirm" ? "alertdialog" : "dialog"}
      onClose={close}
      footer={footer()}
    >{content()}</BottomSheet>}
  </div>
}
