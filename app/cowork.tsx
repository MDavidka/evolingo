"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowUp, Check, ChevronDown, FolderOpen, LoaderCircle, Mic, Plus, Server, SlidersHorizontal, Square, X } from "lucide-react"
import { BottomSheet, UIButton, UISettingsGroup, UISettingsRow } from "./evo-ui-kit"
import "./cowork.css"

type Message = { role: "user" | "assistant"; content: string }
const KEY = "evolingo.cowork.messages.v1"
const MAX_HISTORY = 24

export default function Cowork() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [serverSheet, setServerSheet] = useState(false)
  const [toolsSheet, setToolsSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [agentMode, setAgentMode] = useState<"auto" | "plan" | "fast">("auto")
  const controller = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) || "[]")
      if (Array.isArray(saved)) setMessages(saved.filter((m): m is Message => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-MAX_HISTORY))
    } catch {}
    setHydrated(true)
    return () => controller.current?.abort()
  }, [])
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX_HISTORY))) } catch {} }, [messages, hydrated])
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" }) }, [messages])

  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || busy) return
    const next: Message[] = [...messages, { role: "user", content }].slice(-MAX_HISTORY)
    setMessages(next)
    setDraft("")
    setBusy(true)
    setError("")
    const abort = new AbortController()
    controller.current = abort
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, agentMode }), signal: abort.signal,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || "Az AI jelenleg nem érhető el.")
      }
      if (!response.body) throw new Error("Nem érkezett válasz.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = "", answer = ""
      const applyFrame = (frame: string) => {
        const line = frame.split("\n").find(l => l.startsWith("data: "))
        if (!line) return
        try {
          const data = JSON.parse(line.slice(6)) as { type?: string; delta?: string; reply?: string; error?: string }
          if (data.type === "error") throw new Error(data.error || "Az AI nem válaszolt.")
          if (data.type === "delta" && data.delta) answer += data.delta
          if (data.type === "text" && data.reply) answer = data.reply
          if (answer) setMessages([...next, { role: "assistant", content: answer }])
        } catch (e) { if (e instanceof Error && frame.includes('"type":"error"')) throw e }
      }
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
        const frames = buffer.split("\n\n")
        buffer = frames.pop() || ""
        for (const frame of frames) applyFrame(frame)
      }
      if (buffer.trim()) applyFrame(buffer)
      if (!answer.trim()) throw new Error("Az AI nem adott választ.")
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Hiba történt.")
    } finally {
      controller.current = null
      setBusy(false)
    }
  }
  const stop = () => { controller.current?.abort(); setBusy(false) }
  const reset = () => { controller.current?.abort(); setMessages([]); setDraft(""); setError(""); textarea.current?.focus() }
  return <section className="evo-cowork evo-ui-scope" aria-label="Cowork munkaterület">
    <div className="evo-cowork__scroll" role="log" aria-live="polite">
      {messages.length === 0 ? <div className="evo-cowork__empty" aria-hidden="true"><span className="evo-cowork__mark"><FolderOpen size={26} strokeWidth={1.5}/></span><h1>Mit építsünk?</h1><p>Tervezés, fejlesztés és közös munka egy helyen.</p></div> :
        <div className="evo-cowork__messages">{messages.map((m, i) => <article key={i} className={"evo-cowork__message evo-cowork__message--" + m.role}>{m.content}</article>)}{busy && <div className="evo-cowork__thinking"><LoaderCircle size={17} className="evo-cowork__spin"/> Dolgozom…</div>}</div>}
      <div ref={bottom}/>
    </div>
    <div className="evo-cowork__dock">
      <div className="evo-cowork__choosers">
        <button type="button" className="evo-cowork__capsule" onClick={() => setServerSheet(true)} aria-label="Szerver kiválasztása"><Server size={17} strokeWidth={1.75}/> Main Server <ChevronDown size={16}/></button>
        <button type="button" className="evo-cowork__capsule evo-cowork__capsule--quiet" onClick={reset} aria-label="Új munkamenet"><Plus size={17}/> Új</button>
      </div>
      <form className="evo-cowork__composer" onSubmit={send}>
        <textarea ref={textarea} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask anything" rows={2} maxLength={12000} aria-label="Üzenet" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }}/>
        <div className="evo-cowork__actions">
          <button type="button" className="evo-cowork__icon" onClick={() => setToolsSheet(true)} aria-label="Eszközök és mód kiválasztása"><Plus size={24}/></button>
          <button type="button" className="evo-cowork__icon" onClick={() => setToolsSheet(true)} aria-label="AI mód"><SlidersHorizontal size={23}/></button>
          <span className="evo-cowork__action-spacer"/>
          <button type="button" className="evo-cowork__icon" aria-label="Hangbevitel" onClick={() => setError("Hangbevitel jelenleg nem érhető el a Coworkban.")}><Mic size={23}/></button>
          <button type={busy ? "button" : "submit"} className="evo-cowork__send" onClick={busy ? stop : undefined} disabled={!busy && !draft.trim()} aria-label={busy ? "Generálás leállítása" : "Küldés"}>{busy ? <Square size={19} fill="currentColor"/> : <ArrowUp size={24}/>}</button>
        </div>
      </form>
      {error && <p className="evo-cowork__error" role="status">{error} <button type="button" onClick={() => setError("")} aria-label="Bezárás"><X size={15}/></button></p>}
    </div>
    {serverSheet && <BottomSheet title="Szerverek" size="compact" onClose={() => setServerSheet(false)}>
      <UISettingsGroup title="Elérhető szerver">
        <UISettingsRow icon={Server} title="Main Server" description="Az alkalmazás jelenlegi AI-végpontja" trailing={<Check size={19} aria-label="Kiválasztva"/>} onClick={() => setServerSheet(false)} showChevron={false}/>
      </UISettingsGroup>
      <p className="evo-cowork__sheet-note">További szerverek akkor jelennek meg, ha a kapcsolatuk be van állítva.</p>
    </BottomSheet>}
    {toolsSheet && <BottomSheet title="Cowork mód" size="compact" onClose={() => setToolsSheet(false)}>
      <div className="evo-cowork__mode-list">
        {([{ id: "auto", title: "Automatikus", detail: "Az AI választja ki a megfelelő munkamódot" }, { id: "plan", title: "Tervezés", detail: "Összetett feladatok lépésekre bontása" }, { id: "fast", title: "Gyors", detail: "Közvetlen válasz rövidebb feladatokhoz" }] as const).map(option => <button key={option.id} type="button" className="evo-cowork__mode" onClick={() => { setAgentMode(option.id); setToolsSheet(false) }}><span><strong>{option.title}</strong><small>{option.detail}</small></span>{agentMode === option.id && <Check size={19}/>}</button>)}
      </div>
      <p className="evo-cowork__sheet-note">A Cowork az Evölingo meglévő AI-végpontját használja; önálló szerverparancsokat nem futtat.</p>
    </BottomSheet>}
  </section>
}
