"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, Check, Copy, MessageSquarePlus, Sparkles, Plus, Mic, ChevronDown } from "lucide-react"

type ChatMessage = { role: "user" | "assistant"; content: string }

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<number | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    const update = () => {
      const height = viewport?.height ?? window.innerHeight
      const top = viewport?.offsetTop ?? 0
      const keyboardOpen = window.innerHeight - height - top > 120
      root.style.setProperty("--evo-chat-visual-height", `${height}px`)
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
      root.style.removeProperty("--evo-chat-visual-top")
      root.style.removeProperty("--evo-chat-bottom")
    }
  }, [])

  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight
  }, [messages, busy, error])

  const resizeInput = () => {
    const field = input.current
    if (!field) return
    field.style.height = "auto"
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const next: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages(next)
    setDraft("")
    setBusy(true)
    setError("")
    if (input.current) input.current.style.height = "auto"
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
        cache: "no-store",
      })
      const payload = await response.json() as { reply?: string; error?: string }
      if (!response.ok || !payload.reply) throw new Error(payload.error || "Az AI jelenleg nem válaszol. Próbáld újra.")
      setMessages([...next, { role: "assistant", content: payload.reply }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nem sikerült elküldeni az üzenetet.")
    } finally {
      setBusy(false)
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
    if (busy) return
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

  return <><style>{`\n.evo-chat-frame{background:linear-gradient(180deg,#fff 0%,#fff 52%,#f5f6f9 66%,#d8deeb 82%,#8398b9 100%)!important;border:0!important;border-radius:0!important;color:#181818;min-height:0;}\n.evo-chat-messages{min-height:0!important;flex:1!important}.evo-chat-frame{height:var(--evo-chat-visual-height,100dvh)!important}.evo-chat-bottom{width:100%!important}.evo-chat-composer{max-width:100%!important}.evo-chat-bottom{position:relative!important;z-index:2!important}.evo-chat-toolbar{background:transparent!important;border:0!important;box-shadow:none!important;}\n.evo-chat-title{display:flex;align-items:center;gap:6px}.evo-chat-title span{display:none}.evo-chat-title strong{font-size:17px;font-weight:650}\n.evo-chat-welcome{padding-top:12vh}.evo-chat-welcome h1{font-size:26px;letter-spacing:-.8px}.evo-chat-welcome p{color:#6b7280;font-size:14px}\n.evo-chat-mark{background:transparent!important;border:0!important;box-shadow:none!important;width:68px;height:68px;margin-inline:auto}.evo-chat-mark img{width:100%;height:100%;object-fit:contain}\n.evo-chat-composer{background:#fff!important;border:1px solid #e9e9ed!important;border-radius:28px!important;box-shadow:0 5px 22px #33415513!important;display:flex;align-items:center;gap:7px;padding:7px 9px!important;min-height:54px}\n.evo-chat-composer textarea{flex:1;min-width:0;font-size:15px!important;background:transparent!important;resize:none}.evo-chat-attach,.evo-chat-mic{display:grid;place-items:center;flex:none;width:30px;height:36px;border:0;background:transparent;color:#9da1aa;padding:0}.evo-chat-model{display:flex;align-items:center;gap:3px;color:#666;font-size:12px;white-space:nowrap}.evo-chat-send{flex:none;border-radius:50%!important;width:38px!important;height:38px!important;background:#e3e5e9!important;color:#414650!important}.evo-chat-send:not(:disabled){background:#242424!important;color:#fff!important}.evo-chat-bottom{background:transparent!important;border:0!important;padding-bottom:max(12px,env(safe-area-inset-bottom))!important}.evo-chat-messages{scrollbar-width:none}.evo-chat-entry--assistant .evo-chat-bubble{background:transparent!important;box-shadow:none!important}.evo-chat-entry--user .evo-chat-bubble{border-radius:20px!important}\n@media(max-width:390px){.evo-chat-model{font-size:11px}.evo-chat-composer{gap:4px}.evo-chat-attach,.evo-chat-mic{width:25px}}\n`}</style><div className="evo-chat-frame">
    {messages.length > 0 && <div className="evo-chat-toolbar">
      <div className="evo-chat-title"><strong>Evölingo AI</strong><ChevronDown size={15} aria-hidden="true" /></div>
      <button type="button" className="evo-chat-new" onClick={startNewChat} disabled={busy} aria-label="Új beszélgetés" title="Új beszélgetés"><MessageSquarePlus size={21} strokeWidth={1.8} /></button>
    </div>}

    <div className="evo-chat-messages" ref={scroll} role="log" aria-label="Beszélgetés">
      {messages.length > 0 && <div className="evo-chat-thread">
        {messages.map((item, index) => <div key={index} className={`evo-chat-entry evo-chat-entry--${item.role}`}>
          {item.role === "assistant" && <span className="evo-chat-small-mark" aria-hidden="true"><Sparkles size={16} /></span>}
          <div className="evo-chat-entry-main"><div className="evo-chat-bubble">{item.content}</div>
            {item.role === "assistant" && <button type="button" className="evo-chat-copy" aria-label="Válasz másolása" onClick={() => void copyMessage(item.content, index)}>{copied === index ? <Check size={16} /> : <Copy size={16} />}<span>{copied === index ? "Másolva" : "Másolás"}</span></button>}
          </div>
        </div>)}
        {busy && <div className="evo-chat-entry evo-chat-entry--assistant"><span className="evo-chat-small-mark" aria-hidden="true"><Sparkles size={16} /></span><span className="evo-chat-thinking" role="status">Válasz írása<span className="evo-chat-dots">…</span></span></div>}
      </div>}
    </div>

    <div className="evo-chat-bottom">
      {error && <div className="evo-chat-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Hibaüzenet bezárása">×</button></div>}
      <form onSubmit={submit} className="evo-chat-composer">
        <button type="button" className="evo-chat-attach" aria-label="Fájlok hamarosan" title="Fájlok hamarosan" disabled><Plus size={21} /></button><textarea ref={input} value={draft} onChange={event => { setDraft(event.target.value); resizeInput() }} onKeyDown={keyDown} rows={1} maxLength={4000} aria-label="Üzenet írása" placeholder="Írj egy üzenetet..." />
        <span className="evo-chat-model">Evölingo <ChevronDown size={13} /></span><button type="button" className="evo-chat-mic" disabled aria-label="Hangbevitel hamarosan"><Mic size={19} /></button><button type="submit" className="evo-chat-send" disabled={!draft.trim() || busy} aria-label="Üzenet küldése"><ArrowUp size={20} strokeWidth={2.2} /></button>
      </form>
      
    </div>
  </div></>
}
