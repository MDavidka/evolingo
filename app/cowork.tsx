"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { IconArrowDown as ArrowDown, IconArrowUp as ArrowUp, IconBubble as Bubble, IconCheck as Check, IconChevronDown as ChevronDown, IconFolderOpen as FolderOpen, IconMicrophone as Mic, IconPlus as Plus, IconServer as Server, IconAdjustmentsHorizontal as SlidersHorizontal, IconSquare as Square, IconTerminal2 as Terminal, IconX as X } from "@tabler/icons-react"
import { BottomSheet, UISettingsGroup, UISettingsRow } from "./evo-ui-kit"
import "./cowork.css"
import "./chat-agent-plan.css"

type Message = { role: "user" | "assistant"; content: string }
type Conversation = { id: string; title: string; updated_at: string }
type PendingApproval = { id: string; action_digest: string; tool_name?: string; summary: string; risk: string; args_redacted?: Record<string, unknown> }
type CoworkActivity = { id: string; label: string; status: "running" | "completed" | "failed"; detail?: string }
const KEY = "evolingo.cowork.messages.v1"
const ACTIVE_RUN_KEY = "evolingo.cowork.active-run.v1"
const MAX_HISTORY = 24

export default function Cowork() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [inputOpen, setInputOpen] = useState(false)
  const [serverSheet, setServerSheet] = useState(false)
  const [toolsSheet, setToolsSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [activities, setActivities] = useState<CoworkActivity[]>([])
  const [agentMode, setAgentMode] = useState<"auto" | "plan" | "fast">("auto")
  const [traceExpanded, setTraceExpanded] = useState(true)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const [showJumpPill, setShowJumpPill] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const eventSource = useRef<EventSource | null>(null)
  const activeRunId = useRef<string | null>(null)
  const cancelAfterStart = useRef(false)
  const workspace = useRef<HTMLElement>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let active = true
    const restore = async () => {
      let savedMessages: Message[] = []
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(KEY) || "[]")
        if (Array.isArray(saved)) savedMessages = saved.filter((m): m is Message => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-MAX_HISTORY)
      } catch {}

      try {
        const listResponse = await fetch("/api/cowork/conversations", { cache: "no-store" })
        if (!listResponse.ok) throw new Error("Cowork history is unavailable.")
        const listData = await listResponse.json() as { conversations?: Conversation[] }
        let conversation = listData.conversations?.[0]
        if (!conversation) {
          const createdResponse = await fetch("/api/cowork/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Cowork conversation" }),
          })
          if (!createdResponse.ok) throw new Error("Cowork history is unavailable.")
          const createdData = await createdResponse.json() as { conversation?: Conversation }
          conversation = createdData.conversation
        }
        if (!conversation) throw new Error("Cowork conversation could not be opened.")

        const historyResponse = await fetch(`/api/cowork/conversations/${encodeURIComponent(conversation.id)}/messages`, { cache: "no-store" })
        if (!historyResponse.ok) throw new Error("Cowork messages are unavailable.")
        const historyData = await historyResponse.json() as { messages?: Message[] }
        const serverMessages = (historyData.messages || []).filter(message =>
          (message.role === "user" || message.role === "assistant") && typeof message.content === "string"
        ).slice(-MAX_HISTORY)
        if (active) {
          setConversationId(conversation.id)
          setMessages(serverMessages.length ? serverMessages : savedMessages)
          const savedRun = JSON.parse(localStorage.getItem(ACTIVE_RUN_KEY) || "null") as { conversationId?: string; runId?: string } | null
          if (savedRun?.conversationId === conversation.id && savedRun.runId) {
            const snapshotResponse = await fetch(`/api/cowork/runs/${encodeURIComponent(savedRun.runId)}/snapshot`, { cache: "no-store" })
            if (snapshotResponse.ok) {
              const snapshot = await snapshotResponse.json() as { run?: { status?: string }; approvals?: PendingApproval[] }
              if (snapshot.approvals) setApprovals(snapshot.approvals)
              if (snapshot.run && ["queued", "planning", "running", "verifying", "waiting_approval"].includes(String(snapshot.run.status))) {
                activeRunId.current = savedRun.runId
                setBusy(true)
                void resumeRun(savedRun.runId, conversation.id)
              } else localStorage.removeItem(ACTIVE_RUN_KEY)
            } else localStorage.removeItem(ACTIVE_RUN_KEY)
          }
        }
      } catch {
        if (active) {
          setMessages(savedMessages)
          setError("A beszélgetéselőzmények jelenleg nem érhetők el.")
        }
      } finally {
        if (active) setHydrated(true)
      }
    }
    void restore()
    return () => {
      controller.current?.abort()
      eventSource.current?.close()
    }
  }, [])
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX_HISTORY))) } catch {} }, [messages, hydrated])
  // Scroll only the conversation pane. When user scrolls up past threshold,
  // pause auto-follow and reveal the Jump to latest pill.
  const handleScroll = () => {
    const area = scrollArea.current
    if (!area) return
    const threshold = 28 // 20-28px threshold per UI_DESIGN_SYSTEM.md
    const { scrollHeight, scrollTop, clientHeight } = area
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isUp = distanceFromBottom > threshold
    setUserScrolledUp(isUp)
    setShowJumpPill(isUp && messages.length > 0)
  }

  useEffect(() => {
    const area = scrollArea.current
    if (area && !userScrolledUp) area.scrollTop = area.scrollHeight
  }, [messages, userScrolledUp])

  const jumpToLatest = () => {
    const area = scrollArea.current
    if (area) {
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" })
      setUserScrolledUp(false)
      setShowJumpPill(false)
    }
  }

  // iOS keyboard changes the visual viewport without reliably resizing 100svh.
  // Keep the entire Cowork surface (gradient + composer) inside that viewport.
  useEffect(() => {
    const element = workspace.current
    if (!element) return
    const viewport = window.visualViewport
    let restingHeight = viewport?.height ?? window.innerHeight
    const update = () => {
      const height = viewport?.height ?? window.innerHeight
      const top = viewport?.offsetTop ?? 0
      const focused = document.activeElement === textarea.current
      if (!focused && height > restingHeight) restingHeight = height
      const keyboardVisible = focused && restingHeight - height > 120
      element.style.setProperty("--cowork-viewport-height", Math.round(height) + "px")
      element.style.setProperty("--cowork-viewport-top", Math.round(top) + "px")
      element.classList.toggle("is-keyboard-visible", keyboardVisible)
    }
    const onFocus = () => requestAnimationFrame(update)
    update()
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    document.addEventListener("focusin", onFocus)
    document.addEventListener("focusout", onFocus)
    return () => {
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      document.removeEventListener("focusin", onFocus)
      document.removeEventListener("focusout", onFocus)
    }
  }, [])

  const resumeRun = async (runId: string, currentConversationId: string) => {
    const resumeAbort = new AbortController()
    controller.current = resumeAbort
    try {
      const response = await fetch(`/api/cowork/runs/${encodeURIComponent(runId)}/events`, { cache: "no-store", signal: resumeAbort.signal })
      if (!response.ok || !response.body) throw new Error("A futás eseményei nem érhetők el.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = "", answer = "", failed = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
        const frames = buffer.split("\n\n"); buffer = frames.pop() || ""
        for (const frame of frames) {
          const line = frame.split("\n").find(item => item.startsWith("data: "))
          if (!line) continue
          try {
            const envelope = JSON.parse(line.slice(6)) as { type?: string; payload?: Record<string, unknown> }
            const data = envelope.payload || {}
            if (envelope.type === "message.delta") answer += String(data.text_delta || "")
            if (envelope.type === "run.failed") failed = String(data.safe_error || "A Cowork futás nem sikerült.")
            if (envelope.type === "approval.required") setApprovals(items => [...items.filter(item => item.id !== data.approval_id), { id: String(data.approval_id || ""), action_digest: String(data.action_digest || ""), tool_name: typeof data.tool_name === "string" ? data.tool_name : undefined, summary: String(data.summary || "Cowork eszközengedélyt kér."), risk: String(data.risk || "medium") }])
            if (envelope.type === "approval.resolved") setApprovals(items => items.filter(item => item.id !== data.approval_id))
            if (envelope.type === "tool.started") setActivities(items => [...items.filter(item => item.id !== data.tool_call_id), { id: String(data.tool_call_id || ""), label: String(data.safe_label || data.name || "Eszközművelet"), status: "running" }])
            if (envelope.type === "tool.completed") setActivities(items => items.map(item => item.id === data.tool_call_id ? { ...item, status: "completed", detail: String(data.result_summary || "Sikeres") } : item))
            if (envelope.type === "tool.failed") setActivities(items => items.map(item => item.id === data.tool_call_id ? { ...item, status: "failed", detail: String(data.safe_message || "A művelet nem sikerült") } : item))
            if (answer) setMessages(current => [...current.filter(message => message.role !== "assistant"), { role: "assistant" as const, content: answer }].slice(-MAX_HISTORY))
          } catch {}
        }
      }
      if (failed) setError(failed)
      const history = await fetch(`/api/cowork/conversations/${encodeURIComponent(currentConversationId)}/messages`, { cache: "no-store" })
      if (history.ok) {
        const data = await history.json() as { messages?: Message[] }
        if (data.messages) setMessages(data.messages.filter(message => (message.role === "user" || message.role === "assistant") && typeof message.content === "string").slice(-MAX_HISTORY))
      }
    } catch (error) {
      if (!resumeAbort.signal.aborted) setError(error instanceof Error ? error.message : "A futás nem folytatható.")
    } finally {
      if (controller.current === resumeAbort) controller.current = null
      activeRunId.current = null
      localStorage.removeItem(ACTIVE_RUN_KEY)
      if (!resumeAbort.signal.aborted) setBusy(false)
    }
  }

  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    const content = draft.trim()
    if (!content || busy) return
    const next: Message[] = [...messages, { role: "user" as const, content }].slice(-MAX_HISTORY)
    setMessages(next)
    setDraft("")
    setInputOpen(false)
    textarea.current?.blur()
    setBusy(true)
    setError("")
    const abort = new AbortController()
    controller.current = abort
    // Coalesce streaming tokens to ~20 UI updates/second instead of rerendering
    // the entire conversation for every network chunk on mobile Safari.
    let flushTimer: ReturnType<typeof setTimeout> | null = null
    let pendingAnswer = ""
    const flush = () => {
      flushTimer = null
      if (!abort.signal.aborted && pendingAnswer) {
        setMessages([...next, { role: "assistant", content: pendingAnswer }])
      }
    }
    const scheduleFlush = () => {
      if (flushTimer === null) flushTimer = setTimeout(flush, 50)
    }
    try {
      if (!conversationId) throw new Error("A beszélgetés még nem érhető el.")
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(36).slice(2))
      const queued = await fetch(`/api/cowork/conversations/${encodeURIComponent(conversationId)}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ prompt: content, mode: agentMode === "plan" ? "plan" : "build" }),
        signal: abort.signal,
      })
      if (!queued.ok) {
        const data = await queued.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || "A Cowork futás nem indítható el.")
      }
      const queuedData = await queued.json() as { run?: { id: string } }
      const runId = queuedData.run?.id
      if (!runId) throw new Error("A futás nem indult el.")
      activeRunId.current = runId
      if (cancelAfterStart.current) {
        void fetch(`/api/cowork/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" })
        cancelAfterStart.current = false
      }
      localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({ conversationId, runId }))
      if (cancelAfterStart.current) {
        void fetch(`/api/cowork/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" })
        cancelAfterStart.current = false
      }
      const response = await fetch(`/api/cowork/runs/${encodeURIComponent(runId)}/events`, { signal: abort.signal })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || (response.status === 503
          ? "A Cowork munkakörnyezet jelenleg nincs biztonságosan beállítva."
          : "Az AI jelenleg nem érhető el."))
      }
      if (!response.body) throw new Error("Nem érkezett válasz.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = "", answer = "", terminalError = "", wasCancelled = false
      const applyFrame = (frame: string) => {
        const line = frame.split("\n").find(l => l.startsWith("data: "))
        if (!line) return
        try {
          const envelope = JSON.parse(line.slice(6)) as { type?: string; payload?: Record<string, unknown> }
          const data = envelope.payload || {}
          if (envelope.type === "run.failed") terminalError = String(data.safe_error || "A Cowork futás nem sikerült.")
          if (envelope.type === "run.cancelled") wasCancelled = true
          if (envelope.type === "message.delta") answer += String(data.text_delta || "")
          if (envelope.type === "message.completed" && !answer) {
            const parts = Array.isArray(data.parts) ? data.parts as Array<{ type?: string; text?: string }> : []
            answer += parts.filter(part => part.type === "text").map(part => part.text || "").join("")
          }
          if (envelope.type === "tool.started") setActivities(items => [...items.filter(item => item.id !== data.tool_call_id), { id: String(data.tool_call_id || ""), label: String(data.safe_label || data.name || "Eszközművelet"), status: "running" }])
          if (envelope.type === "tool.completed") setActivities(items => items.map(item => item.id === data.tool_call_id ? { ...item, status: "completed", detail: String(data.result_summary || "Sikeres") } : item))
          if (envelope.type === "tool.failed") setActivities(items => items.map(item => item.id === data.tool_call_id ? { ...item, status: "failed", detail: String(data.safe_message || "A művelet nem sikerült") } : item))
          if (envelope.type === "approval.required") {
            setApprovals(current => [...current.filter(item => item.id !== data.approval_id), {
              id: String(data.approval_id || ""), action_digest: String(data.action_digest || ""),
              tool_name: typeof data.tool_name === "string" ? data.tool_name : undefined,
              summary: String(data.summary || "Cowork eszközengedélyt kér."), risk: String(data.risk || "medium"),
            }])
          }
          if (envelope.type === "approval.resolved") setApprovals(current => current.filter(item => item.id !== data.approval_id))
          if (answer) { pendingAnswer = answer; scheduleFlush() }
        } catch {}
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
      if (terminalError) throw new Error(terminalError)
      if (!answer.trim() && !wasCancelled) throw new Error("Az AI nem adott választ.")
      if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null }
      pendingAnswer = answer
      flush()
      activeRunId.current = null
      localStorage.removeItem(ACTIVE_RUN_KEY)
      if (conversationId) {
        const historyResponse = await fetch(`/api/cowork/conversations/${encodeURIComponent(conversationId)}/messages`, { cache: "no-store" })
        if (historyResponse.ok) {
          const historyData = await historyResponse.json() as { messages?: Message[] }
          if (historyData.messages) setMessages(historyData.messages.filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-MAX_HISTORY))
        }
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Hiba történt.")
    } finally {
      if (flushTimer !== null) clearTimeout(flushTimer)
      controller.current = null
      setBusy(false)
    }
  }
  const decideApproval = async (approval: PendingApproval, decision: "allow_once" | "deny") => {
    try {
      const response = await fetch(`/api/cowork/approvals/${encodeURIComponent(approval.id)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, action_digest: approval.action_digest }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || "Az engedély nem menthető.")
      }
      setApprovals(current => current.filter(item => item.id !== approval.id))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Az engedély nem menthető.")
    }
  }
  const stop = () => {
    const runId = activeRunId.current
    if (runId) {
      void fetch(`/api/cowork/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" })
      return
    }
    if (controller.current) {
      cancelAfterStart.current = true
      return
    }
    setBusy(false)
  }
  const reset = async () => {
    if (activeRunId.current) void fetch(`/api/cowork/runs/${encodeURIComponent(activeRunId.current)}/cancel`, { method: "POST" })
    controller.current?.abort()
    setMessages([]); setActivities([]); setApprovals([]); setDraft(""); setError(""); setInputOpen(false); textarea.current?.blur()
    try {
      const response = await fetch("/api/cowork/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Cowork conversation" }),
      })
      if (!response.ok) throw new Error("New conversation could not be created.")
      const data = await response.json() as { conversation?: Conversation }
      setConversationId(data.conversation?.id || null)
    } catch {
      setConversationId(null)
      setError("Nem sikerült új beszélgetést létrehozni.")
    }
  }
  return <section ref={workspace} className="evo-cowork evo-ui-scope" aria-label="Cowork munkaterület">
    <div ref={scrollArea} className="evo-cowork__scroll" role="log" aria-live="polite" onScroll={handleScroll}>
      {approvals.length > 0 && <div className="evo-cowork__approvals" aria-label="Engedélykérések">{approvals.map(approval => <article key={approval.id} className="evo-cowork__approval">
        <strong>Engedély szükséges{approval.tool_name ? ` · ${approval.tool_name}` : ""}</strong>
        <p>{approval.summary}</p><small>Kockázat: {approval.risk}</small>
        <div><button type="button" onClick={() => void decideApproval(approval, "allow_once")}>Engedélyezés egyszer</button><button type="button" onClick={() => void decideApproval(approval, "deny")}>Elutasítás</button></div>
      </article>)}</div>}
      {messages.length === 0 ? <div className="evo-cowork__empty" aria-hidden="true"><span className="evo-cowork__mark"><FolderOpen size={26} strokeWidth={1.5}/></span><h1>Mit építsünk?</h1><p>Tervezés, fejlesztés és közös munka egy helyen.</p></div> :
        <div className="evo-cowork__messages">
          {messages.map((m, i) => {
            const isLastAssistant = m.role === "assistant" && i === messages.length - 1
            return (
              <article key={i} className={"evo-cowork__message evo-cowork__message--" + m.role}>
                {m.role === "assistant" && (!busy || !isLastAssistant) && (
                  <button
                    type="button"
                    className="evo-agent-worked-header"
                    aria-expanded={traceExpanded}
                    onClick={() => setTraceExpanded(v => !v)}
                  >
                    <span>worked for 1min</span>
                    <ChevronDown
                      size={13}
                      strokeWidth={1.85}
                      className={`evo-agent-chevron ${traceExpanded ? "is-rotated" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                )}
                {m.role === "assistant" && isLastAssistant && !busy && traceExpanded && activities.length > 0 && (
                  <div className="evo-agent-completed-row" style={{ marginBottom: 10 }}>
                    <Terminal size={17} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
                    <span>{activities.map(a => a.label).join(", ")}</span>
                  </div>
                )}
                <div>{m.content}</div>
              </article>
            )
          })}
          {(busy || (activities.some(a => a.status === "running"))) && (
            <div className="evo-agent-plan" aria-label="Cowork műveletek">
              <div className="evo-agent-working-label">
                <span className="evo-agent-shimmer">Working</span>
              </div>
              {activities.filter(a => a.status !== "running").length > 0 && (
                <div className="evo-agent-completed-row">
                  <Terminal size={17} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
                  <span>{activities.filter(a => a.status !== "running").map(a => a.label).join(", ")}</span>
                </div>
              )}
              {(() => {
                const running = activities.find(a => a.status === "running")
                const activeTitle = running?.label || "Executing workspace task"
                const activeDetail = running?.detail || "Inspecting configuration and running commands"
                return (
                  <div className="evo-agent-active-block">
                    <div className="evo-agent-header-row">
                      <button
                        type="button"
                        className="evo-agent-disclosure"
                        aria-expanded={traceExpanded}
                        onClick={() => setTraceExpanded(v => !v)}
                      >
                        <span className="evo-agent-shimmer">{activeTitle}</span>
                        <ChevronDown
                          size={13}
                          strokeWidth={1.85}
                          className={`evo-agent-chevron ${traceExpanded ? "" : "is-collapsed"}`}
                          aria-hidden="true"
                        />
                      </button>
                      <button type="button" className="evo-agent-skip" onClick={stop}>
                        Skip
                      </button>
                    </div>
                    {traceExpanded && (
                      <div className="evo-agent-subrows">
                        <div className="evo-agent-subrow">
                          <Bubble size={17} strokeWidth={1.75} className="evo-agent-row-icon" aria-hidden="true" />
                          <span>{activeDetail}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>}
    </div>
    {showJumpPill && (
      <button
        type="button"
        className="evo-cowork__jump-pill"
        onClick={jumpToLatest}
        aria-label="Ugrás a legfrissebb üzenetre"
      >
        <ArrowDown size={14} /> Legfrissebb
      </button>
    )}
    <div className="evo-cowork__dock">
      {messages.length === 0 && !busy && (
        <div className="evo-cowork__choosers">
          <button type="button" className="evo-cowork__capsule" onClick={() => setServerSheet(true)} aria-label="Szerver kiválasztása"><Server size={17} strokeWidth={1.75}/> Main Server <ChevronDown size={16}/></button>
          <button type="button" className="evo-cowork__capsule evo-cowork__capsule--quiet" onClick={reset} aria-label="Új munkamenet"><Plus size={17}/> Új</button>
        </div>
      )}
      <form className={`evo-cowork__composer ${inputOpen ? "is-open" : "is-idle"}`} onSubmit={send}>
        <div className="evo-cowork__input-line">
          {!inputOpen && <button type="button" className="evo-cowork__icon evo-cowork__idle-plus" onClick={() => setToolsSheet(true)} aria-label="Eszközök"><Plus size={23}/></button>}
          <textarea ref={textarea} value={draft} onFocus={() => setInputOpen(true)} onBlur={() => setInputOpen(false)} onChange={e => setDraft(e.target.value)} placeholder="Ask anything" rows={1} maxLength={12000} aria-label="Üzenet" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }}/>
          {!inputOpen && <div className="evo-cowork__idle-actions">
            <button type="button" className="evo-cowork__icon" aria-label="Hangbevitel" onClick={() => setError("Hangbevitel jelenleg nem érhető el a Coworkban.")}><Mic size={22}/></button>
            <button type={busy ? "button" : "submit"} className="evo-cowork__send" onClick={busy ? stop : undefined} disabled={!busy && !draft.trim()} aria-label={busy ? "Generálás leállítása" : "Küldés"}>{busy ? <Square size={18} fill="currentColor"/> : <ArrowUp size={23}/>}</button>
          </div>}
        </div>
        {inputOpen && <div className="evo-cowork__actions">
          <button type="button" className="evo-cowork__icon" onMouseDown={e => e.preventDefault()} onClick={() => setToolsSheet(true)} aria-label="Eszközök és mód kiválasztása"><Plus size={23}/></button>
          <button type="button" className="evo-cowork__icon" onMouseDown={e => e.preventDefault()} onClick={() => setToolsSheet(true)} aria-label="AI mód"><SlidersHorizontal size={22}/></button>
          <span className="evo-cowork__action-spacer"/>
          <button type="button" className="evo-cowork__icon" onMouseDown={e => e.preventDefault()} aria-label="Hangbevitel" onClick={() => setError("Hangbevitel jelenleg nem érhető el a Coworkban.")}><Mic size={22}/></button>
          <button type={busy ? "button" : "submit"} className="evo-cowork__send" onMouseDown={e => e.preventDefault()} onClick={busy ? stop : undefined} disabled={!busy && !draft.trim()} aria-label={busy ? "Generálás leállítása" : "Küldés"}>{busy ? <Square size={18} fill="currentColor"/> : <ArrowUp size={23}/>}</button>
        </div>}
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
