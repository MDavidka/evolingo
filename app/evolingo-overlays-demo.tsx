"use client"
import { useEffect, useRef, useState } from "react"
import { Archive, Bell, Check, ChevronRight, Copy, Info, Pencil, Pin, Share2, Trash2, X } from "lucide-react"
import "./evolingo-overlays-demo.css"

type Overlay = "alert" | "dialog" | "sheet" | "popover" | "permission" | "full" | null
const examples: { id: Exclude<Overlay, null>; title: string; detail: string }[] = [
  { id: "alert", title: "01 / System alert", detail: "Destructive confirmation" },
  { id: "dialog", title: "02 / Edit dialog", detail: "Rename and short forms" },
  { id: "sheet", title: "03 / Bottom sheet", detail: "Mobile action menu" },
  { id: "popover", title: "04 / Floating popover", detail: "Contextual actions" },
  { id: "permission", title: "06 / Permission prompt", detail: "Explain before requesting access" },
  { id: "full", title: "08 / Full-screen modal", detail: "Complex creation flow" },
]
export default function OverlaysShowcase() {
  const [open, setOpen] = useState<Overlay>(null)
  const [toast, setToast] = useState("")
  const [name, setName] = useState("English practice")
  const [lesson, setLesson] = useState("")
  const [description, setDescription] = useState("")
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const show = (type: Exclude<Overlay, null>, element: HTMLButtonElement) => { triggerRef.current = element; setOpen(type) }
  const close = () => { setOpen(null); requestAnimationFrame(() => triggerRef.current?.focus()) }
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return }
      if (event.key !== "Tab") return
      const root = document.querySelector<HTMLElement>(".evo-overlays-demo__overlay")
      const nodes = Array.from(root?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? [])
      if (!nodes.length) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", keydown)
    requestAnimationFrame(() => closeRef.current?.focus())
    return () => { document.removeEventListener("keydown", keydown); previous?.focus() }
  }, [open])
  const notify = (message: string) => { setToast(message); close() }
  return <div className="evo-overlays-demo">
    {examples.slice(0, 4).map(example => <div className="evo-overlays-demo__specimen" key={example.id}>
      <span className="evo-overlays-demo__eyebrow">{example.title}</span>
      <button className="evo-overlays-demo__launch" type="button" onClick={event => show(example.id, event.currentTarget)}><span>{example.detail}</span><ChevronRight size={18}/></button>
    </div>)}
    <div className="evo-overlays-demo__specimen">
      <span className="evo-overlays-demo__eyebrow">05 / Toast</span>
      <div className="evo-overlays-demo__toasts">
        <button type="button" className="evo-overlays-demo__toast-dark" onClick={() => setToast("Changes saved")}><Check size={17}/> Changes saved <span>Undo</span></button>
        <button type="button" className="evo-overlays-demo__toast-light" onClick={() => setToast("No internet connection")}><Info size={17}/> No internet connection</button>
      </div>
    </div>
    <div className="evo-overlays-demo__specimen"><span className="evo-overlays-demo__eyebrow">06 / Permission prompt</span><button className="evo-overlays-demo__launch" type="button" onClick={event => show("permission", event.currentTarget)}>Notification pre-prompt <ChevronRight size={18}/></button></div>
    <div className="evo-overlays-demo__specimen"><span className="evo-overlays-demo__eyebrow">07 / Inline alert</span><div className="evo-overlays-demo__inline"><Info size={19}/><div><strong>Connection interrupted</strong><p>Your progress is saved. We'll reconnect automatically.</p></div></div></div>
    <div className="evo-overlays-demo__specimen"><span className="evo-overlays-demo__eyebrow">08 / Full-screen modal</span><button className="evo-overlays-demo__launch" type="button" onClick={event => show("full", event.currentTarget)}>New lesson <ChevronRight size={18}/></button></div>
    {toast && <div role="status" className="evo-overlays-demo__live"><Check size={17}/>{toast}<button type="button" onClick={() => setToast("")} aria-label="Dismiss notification"><X size={16}/></button></div>}
    {open && <div className={"evo-overlays-demo__overlay evo-overlays-demo__overlay--" + open} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
      <div className="evo-overlays-demo__panel" role="dialog" aria-modal="true" aria-labelledby="evo-overlay-title">
        {open === "alert" && <><div className="evo-overlays-demo__alert-copy"><h3 id="evo-overlay-title">Delete conversation?</h3><p>This conversation will be permanently deleted.</p></div><div className="evo-overlays-demo__alert-actions"><button ref={closeRef} type="button" onClick={close}>Cancel</button><button type="button" className="evo-overlays-demo__danger" onClick={() => notify("Demo: conversation not deleted")}>Delete</button></div></>}
        {open === "dialog" && <><div className="evo-overlays-demo__heading"><h3 id="evo-overlay-title">Rename conversation</h3><button ref={closeRef} aria-label="Close" onClick={close}><X size={19}/></button></div><input aria-label="Conversation name" value={name} onChange={event => setName(event.target.value)}/><div className="evo-overlays-demo__actions"><button onClick={close}>Cancel</button><button className="evo-overlays-demo__primary" onClick={() => notify("Demo: name updated")}>Save</button></div></>}
        {open === "sheet" && <><div className="evo-overlays-demo__handle"/><div className="evo-overlays-demo__heading"><h3 id="evo-overlay-title">Conversation options</h3><button ref={closeRef} aria-label="Close" onClick={close}><X size={19}/></button></div><div className="evo-overlays-demo__menu">{[[Pencil,"Rename"],[Archive,"Archive"],[Share2,"Share"],[Trash2,"Delete"]].map(([Icon,label]) => { const I = Icon as typeof Pencil; return <button key={label as string} onClick={() => notify("Demo: " + label)} className={label === "Delete" ? "evo-overlays-demo__danger" : ""}><I size={19}/>{label as string}</button> })}</div></>}
        {open === "popover" && <><h3 id="evo-overlay-title" className="evo-overlays-demo__sr">More options</h3><button ref={closeRef} className="evo-overlays-demo__sr-focus" onClick={close}>Close menu</button><div className="evo-overlays-demo__menu">{[[Copy,"Copy"],[Pencil,"Edit"],[Pin,"Pin"],[Trash2,"Delete"]].map(([Icon,label]) => { const I = Icon as typeof Pencil; return <button key={label as string} onClick={() => notify("Demo: " + label)} className={label === "Delete" ? "evo-overlays-demo__danger" : ""}>{label as string}<I size={18}/></button> })}</div></>}
        {open === "permission" && <><div className="evo-overlays-demo__heading"><Bell size={22}/><button ref={closeRef} aria-label="Close" onClick={close}><X size={19}/></button></div><h3 id="evo-overlay-title">Enable notifications</h3><p>Get reminders about your lessons.</p><button className="evo-overlays-demo__primary evo-overlays-demo__wide" onClick={() => notify("Demo only — no permission requested")}>Continue</button><button className="evo-overlays-demo__wide evo-overlays-demo__quiet" onClick={close}>Not now</button></>}
        {open === "full" && <><div className="evo-overlays-demo__heading"><button ref={closeRef} aria-label="Close" onClick={close}><X size={21}/></button><h3 id="evo-overlay-title">New lesson</h3><button onClick={() => notify("Demo: lesson not created")}>Create</button></div><label>LESSON NAME<input placeholder="Enter a title" value={lesson} onChange={event => setLesson(event.target.value)}/></label><label>DESCRIPTION<textarea placeholder="What's this lesson about?" rows={4} value={description} onChange={event => setDescription(event.target.value)}/></label></>}
      </div>
    </div>}
  </div>
}
