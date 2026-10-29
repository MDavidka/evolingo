"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, Check, Copy, Sparkles, Plus, Mic, ChevronDown } from "lucide-react"
import IntelligentResponse from "./intelligent-ui/renderer"
import { validateIntelligentUI, type IntelligentUI } from "./intelligent-ui/schema"

type ChatMessage = { role: "user" | "assistant"; content: string; id?: string; ui?: IntelligentUI }
const SESSION_KEY = "evolingo.chat.session.v1"

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<number | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed)) {
        const safe = parsed.slice(-16).filter((item): item is ChatMessage =>
          !!item && typeof item === "object" && (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" && item.content.length <= 30000
        ).map(item => ({ ...item, ui: item.ui ? validateIntelligentUI(item.ui) ?? undefined : undefined }))
        setMessages(safe)
      }
    } catch { /* Keep empty conversation when session data is unavailable. */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || busy || enhancing) return
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-16))) } catch {}
  }, [messages, hydrated, busy, enhancing])

  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    const update = () => {
      const height = viewport?.height ?? window.innerHeight
      const top = viewport?.offsetTop ?? 0
      const keyboardOpen = window.innerHeight - height - top > 120
      root.style.setProperty("--evo-chat-visual-height", `${height}px`)
      root.style.setProperty("--evo-chat-layout-height", `${window.innerHeight}px`)
      root.style.setProperty("--evo-chat-visual-top", `${top}px`)
      root.style.setProperty("--evo-chat-bottom", keyboardOpen ? "10px" : "max(14px, env(safe-area-inset-bottom, 0px))")
    }
    update()
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      root.style.removeProperty("--evo-chat-visual-height")
      root.style.removeProperty("--evo-chat-layout-height")
      root.style.removeProperty("--evo-chat-visual-top")
      root.style.removeProperty("--evo-chat-bottom")
    }
  }, [])

  useEffect(() => {
    const container = scroll.current
    if (!container) return
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    if (distance < 140) container.scrollTop = container.scrollHeight
  }, [messages, busy, error])

  const resizeInput = () => {
    const field = input.current
    if (!field) return
    field.style.height = "auto"
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy || enhancing) return
    const next: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: "user", content }]
    const assistantId = crypto.randomUUID()
    setMessages(next)
    window.dispatchEvent(new CustomEvent("evolingo:chat-message-sent"))
    input.current?.blur()
    setDraft("")
    setBusy(true)
    setError("")
    if (input.current) input.current.style.height = "auto"

    let answered = false
    let completed = false
    let streamReply = ""
    let frame: number | null = null
    const acceptEvent = (raw: string) => {
      try {
        const event = JSON.parse(raw) as { type?: string; reply?: string; delta?: string; ui?: unknown; error?: string }
        if (event.type === "delta" && typeof event.delta === "string" && event.delta) {
          streamReply += event.delta
          if (streamReply.length > 30000) throw new Error("Túl hosszú válasz.")
          answered = true
          setStreaming(true)
          if (frame === null) frame = requestAnimationFrame(() => {
            frame = null
            const snapshot = streamReply
            setMessages(old => {
              const existing = old.some(msg => msg.id === assistantId)
              return existing
                ? old.map(msg => msg.id === assistantId ? { ...msg, content: snapshot } : msg)
                : [...old, { id: assistantId, role: "assistant", content: snapshot }]
            })
          })
        } else if (event.type === "text" && typeof event.reply === "string" && event.reply.trim()) {
          if (frame !== null) { cancelAnimationFrame(frame); frame = null }
          answered = true
          setMessages(old => {
            const existing = old.some(msg => msg.id === assistantId)
            return existing
              ? old.map(msg => msg.id === assistantId ? { ...msg, content: event.reply as string } : msg)
              : [...old, { id: assistantId, role: "assistant", content: event.reply as string }]
          })
          setStreaming(false)
          setBusy(false)
          setEnhancing(true)
        } else if (event.type === "ui" && event.ui) {
          const ui = validateIntelligentUI(event.ui)
          if (ui) setMessages(old => old.map(msg => msg.id === assistantId ? { ...msg, ui } : msg))
        } else if (event.type === "error") {
          setError(answered ? "A válasz megszakadt; a már megjelent szöveg megmaradt." : event.error || "Az AI jelenleg nem válaszol. Próbáld újra.")
        } else if (event.type === "done") completed = true
      } catch { /* Malformed event is not rendered or executed. */ }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12).map(({ role, content }) => ({ role, content })), interactive: true }),
        cache: "no-store",
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(payload.error || "Az AI jelenleg nem válaszol. Próbáld újra.")
      }
      const type = response.headers.get("content-type") || ""
      if (!type.includes("text/event-stream")) {
        // Older deployments/clients continue to work with the JSON reply.
        const payload = await response.json() as { reply?: string; error?: string }
        if (!payload.reply) throw new Error(payload.error || "Az AI nem adott választ.")
        setMessages([...next, { id: assistantId, role: "assistant", content: payload.reply }])
        answered = true
        return
      }
      if (!response.body) throw new Error("A válasz nem olvasható.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          if (buffer.length > 60000) throw new Error("A válasz túl hosszú.")
          const segments = buffer.split("\n\n")
          buffer = segments.pop() || ""
          for (const segment of segments) {
            const line = segment.split("\n").find(part => part.startsWith("data: "))
            if (line) acceptEvent(line.slice(6))
          }
        }
        buffer += decoder.decode()
        if (buffer.trim()) {
          const line = buffer.split("\n").find(part => part.startsWith("data: "))
          if (line) acceptEvent(line.slice(6))
        }
      } finally {
        reader.releaseLock()
      }
      if (!answered) throw new Error("Az AI nem adott választ.")
      if (!completed) setError("A kapcsolat megszakadt; a már megjelent válasz megmaradt.")
    } catch (cause) {
      setError(answered ? "A kapcsolat megszakadt; a már megjelent válasz megmaradt." : cause instanceof Error ? cause.message : "Nem sikerült elküldeni az üzenetet.")
    } finally {
      if (frame !== null) cancelAnimationFrame(frame)
      setBusy(false)
      setEnhancing(false)
      setStreaming(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(draft)
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      event.preventDefault()
      void send(draft)
    }
  }

  function startNewChat() {
    if (busy || enhancing) return
    setMessages([])
    setDraft("")
    setError("")
    setCopied(null)
    input.current?.focus()
  }

  async function copyMessage(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(index)
    } catch {
      setError("A másolás nem sikerült.")
    }
  }

  return <><style>{`\n.evo-chat-frame{background:transparent!important;border:0!important;border-radius:0!important;color:#181818;min-height:0;}\n.evo-chat-messages{min-height:0!important;flex:1!important}.evo-chat-frame{height:var(--evo-chat-visual-height,100dvh)!important}.evo-chat-bottom{width:100%!important}.evo-chat-composer{max-width:100%!important}.evo-chat-bottom{position:relative!important;z-index:2!important}.evo-chat-toolbar{background:transparent!important;border:0!important;box-shadow:none!important;}\n.evo-chat-title{display:flex;align-items:center;gap:6px}.evo-chat-title span{display:none}.evo-chat-title strong{font-size:17px;font-weight:650}\n.evo-chat-welcome{padding-top:12vh}.evo-chat-welcome h1{font-size:26px;letter-spacing:-.8px}.evo-chat-welcome p{color:#6b7280;font-size:14px}\n.evo-chat-mark{background:transparent!important;border:0!important;box-shadow:none!important;width:68px;height:68px;margin-inline:auto}.evo-chat-mark img{width:100%;height:100%;object-fit:contain}\n.evo-chat-composer{background:#fff!important;border:1px solid #e9e9ed!important;border-radius:28px!important;box-shadow:0 5px 22px #33415513!important;display:flex;align-items:center;gap:7px;padding:7px 9px!important;min-height:54px}\n.evo-chat-composer textarea{flex:1;min-width:0;font-size:15px!important;background:transparent!important;resize:none}.evo-chat-attach,.evo-chat-mic{display:grid;place-items:center;flex:none;width:30px;height:36px;border:0;background:transparent;color:#9da1aa;padding:0}.evo-chat-model{display:flex;align-items:center;gap:3px;color:#666;font-size:12px;white-space:nowrap}.evo-chat-send{flex:none;border-radius:50%!important;width:38px!important;height:38px!important;background:#e3e5e9!important;color:#414650!important}.evo-chat-send:not(:disabled){background:#242424!important;color:#fff!important}.evo-chat-bottom{background:transparent!important;border:0!important;padding-bottom:max(12px,env(safe-area-inset-bottom))!important}.evo-chat-messages{scrollbar-width:none}.evo-chat-entry--assistant .evo-chat-bubble{background:transparent!important;box-shadow:none!important}.evo-chat-entry--user .evo-chat-bubble{border-radius:20px!important}\n@media(max-width:390px){.evo-chat-model{font-size:11px}.evo-chat-composer{gap:4px}.evo-chat-attach,.evo-chat-mic{width:25px}}\n`}</style><div className="evo-chat-frame">
    <div className="evo-chat-messages" ref={scroll} role="log" aria-label="Beszélgetés">
      {messages.length > 0 && <div className="evo-chat-thread">
        {messages.map((item, index) => <div key={index} className={`evo-chat-entry evo-chat-entry--${item.role}`}>
          {item.role === "assistant" && <span className="evo-chat-small-mark" aria-hidden="true"><Sparkles size={16} /></span>}
          <div className="evo-chat-entry-main"><div className="evo-chat-bubble">{item.content}</div>
            {item.role === "assistant" && item.ui && <IntelligentResponse ui={item.ui} messageId={item.id} />}
            {item.role === "assistant" && <button type="button" className="evo-chat-copy" aria-label="Válasz másolása" onClick={() => void copyMessage(item.content, index)}>{copied === index ? <Check size={16} /> : <Copy size={16} />}<span>{copied === index ? "Másolva" : "Másolás"}</span></button>}
          </div>
        </div>)}
        {enhancing && <div className="evo-iui-loading" role="status">Tanulási elemek előkészítése…</div>}
        {busy && !streaming && <div className="evo-chat-entry evo-chat-entry--assistant"><span className="evo-chat-small-mark" aria-hidden="true"><Sparkles size={16} /></span><span className="evo-chat-thinking" role="status">Válasz írása<span className="evo-chat-dots">…</span></span></div>}
      </div>}
    </div>

    <div className="evo-chat-bottom">
      {error && <div className="evo-chat-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Hibaüzenet bezárása">×</button></div>}
      <div className="evo-composer-surface">
      <form onSubmit={submit} className="evo-chat-composer">
        <button type="button" className="evo-chat-attach" aria-label="Fájlok hamarosan" title="Fájlok hamarosan" disabled><Plus size={21} /></button><textarea ref={input} value={draft} onChange={event => { setDraft(event.target.value); resizeInput() }} onKeyDown={keyDown} rows={1} maxLength={4000} aria-label="Üzenet írása" placeholder="Írj egy üzenetet..." />
        <span className="evo-chat-model">Evölingo <ChevronDown size={13} /></span><button type="button" className="evo-chat-mic" disabled aria-label="Hangbevitel hamarosan"><Mic size={19} /></button><button type="submit" className="evo-chat-send" disabled={!draft.trim() || busy || enhancing} aria-label="Üzenet küldése"><ArrowUp size={20} strokeWidth={2.2} /></button>
      </form>
      </div>
      
    </div>
  </div></>
}
