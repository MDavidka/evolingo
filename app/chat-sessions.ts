export type StoredChatMessage = { role: "user" | "assistant"; content: string; id?: string; ui?: unknown }
export type ChatSession = { id: string; title: string; createdAt: number; updatedAt: number; messages: StoredChatMessage[] }

const SESSIONS_KEY = "evolingo.chat.sessions.v1"
const ACTIVE_KEY = "evolingo.chat.active-session.v1"
const LEGACY_KEY = "evolingo.chat.session.v1"
const MAX_SESSIONS = 40

function safeMessages(value: unknown): StoredChatMessage[] {
  if (!Array.isArray(value)) return []
  return value.slice(-16).filter((item): item is StoredChatMessage => !!item && typeof item === "object" &&
    ((item as StoredChatMessage).role === "user" || (item as StoredChatMessage).role === "assistant") &&
    typeof (item as StoredChatMessage).content === "string" && (item as StoredChatMessage).content.length <= 30000)
}

function makeTitle(messages: StoredChatMessage[]) {
  return messages.find(message => message.role === "user")?.content.trim().replace(/\s+/g, " ").slice(0, 72) || "Új beszélgetés"
}

export function readChatSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) return parsed.filter((item): item is ChatSession => !!item && typeof item === "object" &&
      typeof (item as ChatSession).id === "string" && typeof (item as ChatSession).createdAt === "number")
      .map(item => ({ ...item, messages: safeMessages(item.messages), title: typeof item.title === "string" ? item.title : makeTitle(safeMessages(item.messages)) }))
    const legacyRaw = sessionStorage.getItem(LEGACY_KEY)
    const legacy: unknown = legacyRaw ? JSON.parse(legacyRaw) : null
    const messages = safeMessages(legacy)
    if (messages.length) {
      const now = Date.now()
      const migrated = [{ id: crypto.randomUUID(), title: makeTitle(messages), createdAt: now, updatedAt: now, messages }]
      writeChatSessions(migrated)
      return migrated
    }
  } catch { /* Recover with an empty history if local storage is unavailable. */ }
  return []
}

export function writeChatSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS))) } catch {}
  window.dispatchEvent(new Event("evolingo:chat-history-updated"))
}

export function saveChatSession(id: string, messages: StoredChatMessage[]) {
  const safe = safeMessages(messages)
  const sessions = readChatSessions()
  const now = Date.now()
  const existing = sessions.find(session => session.id === id)
  const derivedTitle = makeTitle(existing?.messages ?? [])
  const title = existing && existing.title !== derivedTitle && existing.title !== "Új beszélgetés" ? existing.title : makeTitle(safe)
  const next: ChatSession = { id, title, createdAt: existing?.createdAt ?? now, updatedAt: now, messages: safe }
  writeChatSessions([next, ...sessions.filter(session => session.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt))
}

export function activeChatSessionId() {
  if (typeof window === "undefined") return ""
  try { return localStorage.getItem(ACTIVE_KEY) || "" } catch { return "" }
}

export function setActiveChatSessionId(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id) } catch {}
}

export function notifyChatSessionAction(action: "new" | "open", id?: string) {
  window.dispatchEvent(new CustomEvent(action === "new" ? "evolingo:chat-new" : "evolingo:chat-open", { detail: { id } }))
}

export function renameChatSession(id: string, title: string) {
  const sessions = readChatSessions()
  writeChatSessions(sessions.map(session => session.id === id ? { ...session, title: title.trim().slice(0, 72) || session.title } : session))
}

export function deleteChatSession(id: string) {
  writeChatSessions(readChatSessions().filter(session => session.id !== id))
}
