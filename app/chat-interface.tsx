"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ClipboardEvent, type FormEventHandler } from "react"
import { ArrowUp, Check, Copy, Plus, Camera, Image as ImageIcon, FileText, Mic, X } from "lucide-react"
import { Button as AppsButton } from "@openai/apps-sdk-ui/components/Button"
import { BottomSheet } from "./evo-ui-kit"
import ChatRichText from "./chat-rich-text"
import AgentPlanView from "./chat-agent-plan-view"
import { isAgentPlan, type AgentPlan } from "./chat-agent-plan"
import { MAX_IMAGE_BYTES, MAX_TEXT_BYTES, IMAGE_TYPES, TEXT_EXTENSIONS, type ChatAttachment } from "./chat-attachments"
import { activeChatSessionId, readChatSessions, saveChatSession, setActiveChatSessionId } from "./chat-sessions"

type ChatMessage = { role: "user" | "assistant"; content: string; id?: string; attachmentName?: string; plan?: AgentPlan }
const SESSION_KEY = "evolingo.chat.session.v1"

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<number | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const scroll = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLDivElement>(null)
  const turnSpacer = useRef<HTMLDivElement>(null)
  const latestSentUser = useRef<string | null>(null)
  const followNewestTurn = useRef(true)
  const wasAtBottom = useRef(true)
  const wasAtBottomOnFocus = useRef(true)
  const blurTimer = useRef<number | null>(null)
  const streamingAssistantId = useRef<string | null>(null)
  const requestController = useRef<AbortController | null>(null)
  useEffect(() => () => { requestController.current?.abort() }, [])

  const resetTurnPosition = () => {
    latestSentUser.current = null
    streamingAssistantId.current = null
    followNewestTurn.current = true
    if (turnSpacer.current) turnSpacer.current.style.height = "0px"
  }

  useEffect(() => {
    try {
      const sessions = readChatSessions()
      let activeId = activeChatSessionId()
      let active = sessions.find(session => session.id === activeId)
      if (!active && sessions.length) { active = sessions[0]; activeId = active.id }
      if (!active) {
        const raw = sessionStorage.getItem(SESSION_KEY)
        const parsed: unknown = raw ? JSON.parse(raw) : null
        if (Array.isArray(parsed)) {
          const safe = parsed.slice(-16).filter((item): item is ChatMessage =>
            !!item && typeof item === "object" && (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" && item.content.length <= 30000
          ).map(({ role, content, id, plan }) => ({ role, content, id, ...(isAgentPlan(plan) ? { plan } : {}) }))
          setMessages(safe)
        }
        activeId = crypto.randomUUID()
      } else {
        setMessages(active.messages.slice(-16).map(({ role, content, id, plan }) => ({ role, content, id, ...(isAgentPlan(plan) ? { plan } : {}) })))
      }
      setSessionId(activeId)
      setActiveChatSessionId(activeId)
    } catch { /* Keep empty conversation when session data is unavailable. */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || busy) return
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-16))) } catch {}
    if (sessionId) saveChatSession(sessionId, messages)
  }, [messages, hydrated, busy, sessionId])

  useEffect(() => {
    const onNew = () => startNewChat(false)
    const onOpen = (event: Event) => {
      if (busy) return
      const id = (event as CustomEvent<{ id?: string }>).detail?.id
      const selected = readChatSessions().find(session => session.id === id)
      if (!selected) return
      const safe = selected.messages.slice(-16).map(({ role, content, id, plan }) => ({ role, content, id, ...(isAgentPlan(plan) ? { plan } : {}) }))
      resetTurnPosition()
      setSessionId(selected.id)
      setActiveChatSessionId(selected.id)
      setMessages(safe)
      setDraft("")
      setError("")
      setCopied(null)
    }
    window.addEventListener("evolingo:chat-new", onNew)
    window.addEventListener("evolingo:chat-open", onOpen)
    return () => { window.removeEventListener("evolingo:chat-new", onNew); window.removeEventListener("evolingo:chat-open", onOpen) }
  }, [busy])

  useEffect(() => {
    if (!hydrated) return
    // Make the composer ready on arrival. iOS may still require a user tap
    // before displaying its software keyboard.
    const frame = requestAnimationFrame(() => {
      if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"][aria-modal="true"]')) return
      input.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [hydrated])

  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    let frame = 0
    const update = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const height = viewport?.height ?? window.innerHeight
        const top = viewport?.offsetTop ?? 0
        const keyboardOpen = !!viewport && window.innerHeight - height > 120
        root.style.setProperty("--evo-chat-visual-height", `${height}px`)
        root.style.setProperty("--evo-chat-visual-top", `${top}px`)
        if (keyboardOpen) {
          if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
          blurTimer.current = null
          root.classList.add("evo-keyboard-open")
        } else {
          if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
          blurTimer.current = null
          root.classList.remove("evo-keyboard-open")
        }
      })
    }
    update()
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      if (frame) cancelAnimationFrame(frame)
      if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
      root.classList.remove("evo-keyboard-open")
      root.style.removeProperty("--evo-chat-visual-height")
      root.style.removeProperty("--evo-chat-visual-top")
    }
  }, [])

  useEffect(() => {
    const container = scroll.current
    if (!container) return
    const sentId = latestSentUser.current
    const spacer = turnSpacer.current
    if (sentId && spacer) {
      const sent = container.querySelector<HTMLElement>(`.evo-chat-entry--user[data-message-id="${sentId}"]`)
      if (sent) {
        // Newly sent messages start beneath the navigation; older messages
        // keep scrolling under the translucent/blurred status area.
        const top = container.getBoundingClientRect().top
        const userTop = sent.getBoundingClientRect().top - top + container.scrollTop
        const headerBottom = document.querySelector<HTMLElement>(".evo-global-profile-button")?.getBoundingClientRect().bottom
        const clearTop = Math.max(92, (headerBottom ?? top + 80) - top + 24)

        // Update the trailing spacer without resetting it to zero on every
        // streamed chunk: this avoids repeated layout shifts on iOS Safari.
        const afterUser = container.scrollHeight - userTop - spacer.offsetHeight
        const required = Math.max(0, container.clientHeight - afterUser + 22)
        if (Math.abs(spacer.offsetHeight - required) > 1) spacer.style.height = required + "px"

        if (followNewestTurn.current) {
          const assistants = container.querySelectorAll<HTMLElement>(".evo-chat-entry--assistant")
          const lastAssistant = assistants[assistants.length - 1]
          const replyReachesBottom = !!lastAssistant &&
            lastAssistant.getBoundingClientRect().bottom - sent.getBoundingClientRect().top > container.clientHeight - clearTop - 32
          container.scrollTop = replyReachesBottom
            ? container.scrollHeight - container.clientHeight
            : Math.max(0, userTop - clearTop)
        }
        return
      }
    }
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    if (wasAtBottom.current || distance < 140) container.scrollTop = container.scrollHeight
  }, [messages, busy, error])

  const handleInputFocus = () => {
    setInputFocused(true)
    const container = scroll.current
    wasAtBottomOnFocus.current = !!container && container.scrollHeight - container.scrollTop - container.clientHeight < 140
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
    blurTimer.current = null
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      const container = scroll.current
      if (container && wasAtBottomOnFocus.current) container.scrollTop = container.scrollHeight
    }))
  }

  const handleInputBlur = () => {
    setInputFocused(false)
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => {
      const root = document.documentElement
      root.classList.remove("evo-keyboard-open")
      root.style.setProperty("--evo-chat-visual-height", `${window.innerHeight}px`)
      root.style.setProperty("--evo-chat-visual-top", "0px")
      blurTimer.current = null
    }, 250)
  }

  // Keep the browser in charge of the contenteditable caret. Sync only when
  // the draft is cleared or changed by an external action.
  useEffect(() => {
    const element = input.current
    if (element && element.innerText !== draft) element.textContent = draft
  }, [draft])

  const readEditor: FormEventHandler<HTMLDivElement> = event => {
    const text = event.currentTarget.innerText.replace(/\r/g, "")
    if (text.length > 4000) {
      event.currentTarget.textContent = text.slice(0, 4000)
      const selection = window.getSelection()
      selection?.selectAllChildren(event.currentTarget)
      selection?.collapseToEnd()
    }
    setDraft(text.slice(0, 4000))
  }

  const pasteEditor = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData("text/plain")
    const selection = window.getSelection()
    const current = input.current
    if (!current || !selection) return
    const selected = selection.toString().length
    const available = Math.max(0, 4000 - (current.innerText.length - selected))
    const insert = text.slice(0, available)
    const range = selection.rangeCount ? selection.getRangeAt(0) : null
    if (!range || !current.contains(range.commonAncestorContainer)) return
    range.deleteContents()
    const node = document.createTextNode(insert)
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    setDraft(current.innerText)
  }

  async function send(text: string) {
    const content = text.trim()
    if ((!content && !attachment) || busy) return
    const userId = crypto.randomUUID()
    latestSentUser.current = userId
    followNewestTurn.current = true
    const next: ChatMessage[] = [...messages, { id: userId, role: "user", content: content || "Elemezd a csatolt fájlt.", ...(attachment ? { attachmentName: attachment.name } : {}) }]
    const assistantId = crypto.randomUUID()
    streamingAssistantId.current = assistantId
    // Persist the user turn before the network call, so navigation never loses it.
    if (sessionId) saveChatSession(sessionId, next)
    setMessages(next)
    window.dispatchEvent(new CustomEvent("evolingo:chat-message-sent"))
    input.current?.blur()
    setDraft("")
    const sentAttachment = attachment
    setAttachment(null)
    setBusy(true)
    setError("")

    let answered = false
    let completed = false
    let streamReply = ""
    let renderedReply = ""
    let flushTimer: number | null = null
    const flushReply = () => {
      flushTimer = null
      const snapshot = streamReply
      if (!snapshot || snapshot === renderedReply) return
      renderedReply = snapshot
      setMessages(old => {
        const existing = old.some(msg => msg.id === assistantId)
        return existing
          ? old.map(msg => msg.id === assistantId ? { ...msg, content: snapshot } : msg)
          : [...old, { id: assistantId, role: "assistant", content: snapshot }]
      })
    }
    const acceptEvent = (raw: string) => {
      try {
        const event = JSON.parse(raw) as { type?: string; reply?: string; delta?: string; plan?: unknown; error?: string }
        if (event.type === "plan" && isAgentPlan(event.plan)) {
          // The fixed plan id is replaced in place, not appended as a new bubble.
          const plan = event.plan
          setStreaming(true)
          setMessages(old => {
            const existing = old.some(msg => msg.id === assistantId)
            return existing
              ? old.map(msg => msg.id === assistantId ? { ...msg, plan } : msg)
              : [...old, { id: assistantId, role: "assistant", content: "", plan }]
          })
        } else if (event.type === "delta" && typeof event.delta === "string" && event.delta) {
          streamReply += event.delta
          if (streamReply.length > 30000) throw new Error("Túl hosszú válasz.")
          if (!answered) {
            answered = true
            setStreaming(true)
            // Render the first token immediately; batch subsequent ones
            // to avoid reparsing Markdown on every incoming network event.
            flushReply()
          } else if (flushTimer === null) {
            flushTimer = window.setTimeout(flushReply, 40)
          }
        } else if (event.type === "text" && typeof event.reply === "string" && event.reply.trim()) {
          if (flushTimer !== null) { window.clearTimeout(flushTimer); flushTimer = null }
          answered = true
          renderedReply = event.reply
          streamReply = event.reply
          setMessages(old => {
            const existing = old.some(msg => msg.id === assistantId)
            return existing
              ? old.map(msg => msg.id === assistantId ? { ...msg, content: event.reply as string } : msg)
              : [...old, { id: assistantId, role: "assistant", content: event.reply as string }]
          })
        } else if (event.type === "error") {
          setError(answered ? "A válasz megszakadt; a már megjelent szöveg megmaradt." : "Az AI jelenleg nem válaszol. Próbáld újra.")
        } else if (event.type === "done") completed = true
      } catch { /* Malformed event is not rendered or executed. */ }
    }

    const controller = new AbortController()
    requestController.current = controller
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8).map(({ role, content }) => ({ role, content })), interactive: true, agentMode: "auto", attachment: sentAttachment }),
        cache: "no-store",
        signal: controller.signal,
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
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
          if (buffer.length > 60000) throw new Error("A válasz túl hosszú.")
          // Incremental SSE parsing avoids allocating a full split array per chunk.
          let boundary = buffer.indexOf("\n\n")
          while (boundary !== -1) {
            const segment = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const line = segment.split("\n").find(part => part.startsWith("data: "))
            if (line) acceptEvent(line.slice(6))
            boundary = buffer.indexOf("\n\n")
          }
        }
        buffer += decoder.decode().replace(/\r\n/g, "\n")
        if (buffer.trim()) {
          const line = buffer.split("\n").find(part => part.startsWith("data: "))
          if (line) acceptEvent(line.slice(6))
        }
      } finally {
        reader.releaseLock()
      }
      if (!answered) throw new Error("Az AI nem adott választ.")
      if (flushTimer !== null) { window.clearTimeout(flushTimer); flushTimer = null }
      // Preserve any trailing partial delta when an older provider omits
      // its final text event.
      flushReply()
      if (!completed) setError("A kapcsolat megszakadt; a már megjelent válasz megmaradt.")
    } catch (cause) {
      setError(answered ? "A kapcsolat megszakadt; a már megjelent válasz megmaradt." : "Nem sikerült elküldeni az üzenetet. Próbáld újra.")
    } finally {
      if (flushTimer !== null) window.clearTimeout(flushTimer)
      if (requestController.current === controller) requestController.current = null
      setBusy(false)
      setStreaming(false)
    }
  }

  async function chooseAttachment(file: File | undefined) {
    if (!file) return
    setError("")
    const image = IMAGE_TYPES.some(type => type === file.type)
    const textFile = TEXT_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!image && !textFile) { setError("Nem támogatott fájltípus."); return }
    if (file.size > (image ? MAX_IMAGE_BYTES : MAX_TEXT_BYTES)) {
      setError(image ? "A kép legfeljebb 2 MB lehet." : "A szövegfájl legfeljebb 96 KB lehet.")
      return
    }
    if (image) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") setAttachment({ kind: "image", name: file.name, mime: file.type, data: reader.result })
      }
      reader.onerror = () => setError("A kép nem olvasható.")
      reader.readAsDataURL(file)
    } else {
      try {
        const value = (await file.text()).slice(0, 12000)
        if (!value.trim()) { setError("A fájl üres."); return }
        setAttachment({ kind: "text", name: file.name, mime: "text/plain", data: value })
      } catch { setError("A fájl nem olvasható.") }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(draft)
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send(draft)
    }
  }

  function startNewChat(focus = true) {
    if (busy) return
    resetTurnPosition()
    const nextId = crypto.randomUUID()
    setSessionId(nextId)
    setActiveChatSessionId(nextId)
    setMessages([])
    setDraft("")
    setError("")
    setCopied(null)
    if (focus) input.current?.focus()
  }

  async function copyMessage(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(index)
    } catch {
      setError("A másolás nem sikerült.")
    }
  }

  const useSuggestion = (value: string) => {
    setDraft(value)
    if (input.current) {
      input.current.textContent = value
      input.current.focus()
    }
  }
  return <><style>{`\n.evo-chat-frame{background:transparent!important;border:0!important;border-radius:0!important;color:#181818;min-height:0;}\n.evo-chat-messages{min-height:0!important;flex:1!important}.evo-chat-bottom{width:100%!important}.evo-chat-composer{max-width:100%!important}.evo-chat-toolbar{background:transparent!important;border:0!important;box-shadow:none!important;}\n.evo-chat-title{display:flex;align-items:center;gap:6px}.evo-chat-title span{display:none}.evo-chat-title strong{font-size:var(--evo-size-row);font-weight:650}\n.evo-chat-welcome{padding-top:12vh}.evo-chat-welcome h1{font-size:var(--evo-size-hero);letter-spacing:-.8px}.evo-chat-welcome p{color:#6b7280;font-size:var(--evo-size-support)}\n.evo-chat-mark{background:transparent!important;border:0!important;box-shadow:none!important;width:68px;height:68px;margin-inline:auto}.evo-chat-mark img{width:100%;height:100%;object-fit:contain}\n.evo-chat-composer{background:#fff!important;border:1px solid #e9e9ed!important;border-radius:26px !important;box-shadow:0 5px 22px #0000000b!important;display:flex;align-items:center;gap:7px;padding:7px 9px!important;min-height:54px}\n.evo-chat-composer[data-focused="true"]{border-radius:14px!important;box-shadow:0 5px 20px #00000012!important}.evo-composer-surface:has(.evo-chat-composer[data-focused="true"]){border-radius:18px!important}\n.evo-chat-composer [contenteditable]{flex:1;min-width:0;font-size:var(--evo-size-body) !important;background:transparent!important;resize:none}.evo-chat-attach,.evo-chat-mic{display:grid;place-items:center;flex:none;width:44px;height:44px;border:0;background:transparent;color:#9da1aa;padding:0}.evo-chat-model{display:flex;align-items:center;gap:5px;flex:none;min-height:32px;padding:0 9px;border:1px solid #e8e8ec;border-radius:999px;background:#fafafa;color:#45464a;font-size:var(--evo-size-meta);white-space:nowrap}.evo-chat-send{flex:none;border-radius:50%!important;width:44px!important;height:44px!important;background:#e3e5e9!important;color:#414650!important}.evo-chat-send:not(:disabled){background:#242424!important;color:#fff!important}.evo-chat-bottom{background:transparent!important;border:0!important;padding-inline:12px}.evo-chat-messages{scrollbar-width:none}.evo-chat-entry--assistant .evo-chat-bubble{background:transparent!important;box-shadow:none!important}.evo-chat-entry--user .evo-chat-bubble{border-radius:18px !important}\n.evo-chat-composer-controls{display:contents}.evo-chat-attach{order:1}.evo-chat-composer [contenteditable]{order:2}.evo-chat-model{order:3}.evo-chat-send{order:4}
@media(max-width:480px){.ref-view-chat .evo-chat-composer{display:flex!important;flex-direction:row!important;align-items:center!important;gap:5px!important;min-height:58px!important;padding:7px 10px!important;border-radius:999px!important}.ref-view-chat .evo-chat-composer [contenteditable]{order:2!important;flex:1 1 0!important;width:0!important;min-width:0!important;min-height:36px!important;max-height:110px!important;padding:7px 2px!important;line-height:22px!important;overflow-y:auto;scrollbar-width:none}.ref-view-chat .evo-chat-composer-controls{display:contents!important}.ref-view-chat .evo-chat-attach{order:1!important;width:44px!important;min-width:44px!important;height:44px!important;color:#262830!important}.ref-view-chat .evo-chat-model{order:3!important;min-height:38px!important;padding:0 3px!important;border:0!important;background:transparent!important;color:#292b31!important;font-size:13px!important;font-weight:600!important}.evo-chat-model-prefix{display:none}.ref-view-chat .evo-chat-mic{order:4!important;width:44px!important;min-width:44px!important;height:44px!important;color:#292b31!important}.ref-view-chat .evo-chat-send{order:5!important;width:44px!important;min-width:44px!important;height:44px!important;margin-left:0!important}}
@media(max-width:390px){.ref-view-chat .evo-chat-composer{gap:3px!important;padding-inline:8px!important}.ref-view-chat .evo-chat-model{font-size:12px!important}.ref-view-chat .evo-chat-attach{width:44px!important;min-width:44px!important}.ref-view-chat .evo-chat-mic{width:44px!important;min-width:44px!important}}\n.evo-chat-attachment-preview{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 13px;margin-bottom:8px;border:1px solid #e5e7eb;border-radius:16px;background:#f7f7f8;color:#444;font-size:var(--evo-size-meta)}.evo-chat-attachment-preview span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.evo-chat-attachment-preview button{flex:none;width:44px;height:44px;min-width:44px;border:0;background:transparent;color:#666;font-size:var(--evo-size-section)}\n`}</style><div className="evo-chat-frame">
    <div className={`evo-chat-messages${messages.length ? " has-messages" : ""}`} ref={scroll}
      onTouchMove={() => { followNewestTurn.current = false }}
      onWheel={() => { followNewestTurn.current = false }}
      onScroll={event => {
        const node = event.currentTarget
        wasAtBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80
      }}
      role="log" aria-label="Beszélgetés">
      {messages.length === 0 && hydrated && <div className="evo-ai-chat-welcome">
        <h1>Miben segíthetek?</h1>
        <div className="evo-ai-chat-suggestions">
          {["Foglald össze a fájlomat", "Tervezd meg a hetem", "Ötletelj velem", "Írj egy e-mailt"].map(item =>
            <button key={item} type="button" onClick={() => useSuggestion(item)}>{item}</button>)}
        </div>
      </div>}
      {messages.length > 0 && <div className="evo-chat-thread">
        {messages.map((item, index) => <div key={item.id ?? `${item.role}-${index}`} data-message-id={item.id} className={`evo-chat-entry evo-chat-entry--${item.role}`}>
          <div className="evo-chat-entry-main">
            {item.role === "assistant" && item.plan && <AgentPlanView plan={item.plan} />}
            {(item.role === "user" || item.content) && <div className="evo-chat-bubble">
              {item.role === "assistant" ? (
                busy && streaming && streamingAssistantId.current === item.id
                  ? <span className="evo-chat-live-text">{item.content}</span>
                  : <ChatRichText text={item.content} />
              ) : item.content}
            </div>}
            {item.role === "assistant" && !!item.content && <button type="button" className="evo-chat-copy" aria-label="Válasz másolása" onClick={() => void copyMessage(item.content, index)}>{copied === index ? <Check size={16} /> : <Copy size={16} />}<span>{copied === index ? "Másolva" : "Másolás"}</span></button>}
          </div>
        </div>)}
        {busy && !streaming && <div className="evo-chat-entry evo-chat-entry--assistant"><span className="evo-chat-thinking" role="status">Válasz írása<span className="evo-chat-dots">…</span></span></div>}
        <div ref={turnSpacer} className="evo-chat-turn-spacer" aria-hidden="true" />
      </div>}
    </div>
    {messages.length > 0 && <div className="evo-chat-top-fade" aria-hidden="true" />}

    <div className="evo-chat-bottom">
      {error && <div className="evo-chat-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Hibaüzenet bezárása">×</button></div>}
      <div className="evo-composer-surface">
      {attachment && <div className="evo-chat-attachment-preview">{attachment.kind === "image" && <img src={attachment.data} alt="Csatolt kép előnézete" style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover" }} />}<span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Melléklet eltávolítása">×</button></div>}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={event => { void chooseAttachment(event.target.files?.[0]); event.target.value = "" }} />
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,.txt,.md,.csv,.json,.tsv" hidden onChange={event => { void chooseAttachment(event.target.files?.[0]); event.target.value = "" }} />
      {attachMenuOpen && <BottomSheet title="Melléklet hozzáadása" size="compact" onClose={() => setAttachMenuOpen(false)}><div className="evo-chat-kit-actions">
        <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); cameraInput.current?.click() }}><Camera size={19} /><span><strong>Fotó készítése</strong><small>Új kép a kamerával</small></span></button>
        <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); fileInput.current?.click() }}><ImageIcon size={19} /><span><strong>Kép a galériából</strong><small>JPG, PNG vagy WebP</small></span></button>
        <button type="button" role="menuitem" onClick={() => { setAttachMenuOpen(false); fileInput.current?.click() }}><FileText size={19} /><span><strong>Jegyzet vagy fájl</strong><small>TXT, MD, CSV, JSON vagy TSV</small></span></button>

      </div></BottomSheet>}
      <form onSubmit={submit} className="evo-chat-composer" data-focused={inputFocused}>
        <div ref={input} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Üzenet írása" data-placeholder="Írj egy üzenetet…" data-empty={!draft} onInput={readEditor} onPaste={pasteEditor} onFocus={handleInputFocus} onBlur={handleInputBlur} onKeyDown={keyDown} spellCheck={false} autoCorrect="off" />
        <div className="evo-chat-composer-controls">
          <button type="button" className="evo-chat-attach" aria-label="Melléklet hozzáadása" aria-expanded={attachMenuOpen} onClick={() => setAttachMenuOpen(value => !value)} disabled={busy}><Plus size={21} /></button>

          <button type="button" className="evo-chat-mic" aria-label="Hangbevitel hamarosan" title="Hangbevitel hamarosan" disabled><Mic size={18} strokeWidth={1.8} /></button>
          <AppsButton type="submit" color="primary" variant="solid" size="2xl" uniform pill className="evo-chat-send evo-arc-primary" loading={busy} disabled={!draft.trim() && !attachment} aria-label="Üzenet küldése"><ArrowUp size={20} strokeWidth={1.75} /></AppsButton>
        </div>
      </form>
      </div>
      
    </div>
  </div></>
}
