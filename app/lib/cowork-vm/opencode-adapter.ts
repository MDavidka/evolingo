import type { OpenCodeEvent } from "@opencode/client"
import { redactSecrets } from "./sandbox-broker.ts"
import type { CoworkEventEnvelope, CoworkEventType } from "./types.ts"

type NativeEvent = {
  id: string
  created: number
  type: string
  data: Record<string, unknown>
}

type AdaptedEvent = Omit<CoworkEventEnvelope, "seq">

function safeDate(created: number): string {
  const date = new Date(created)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function safeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function safeText(value: unknown, max = 2000): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "")
  return redactSecrets(text).slice(0, max)
}

/** Translate documented OpenCode V2 events into the app's persisted protocol. */
export class OpenCodeEventAdapter {
  private readonly toolNames = new Map<string, string>()
  private readonly toolStartedAt = new Map<string, number>()
  private readonly textTails = new Map<string, string>()

  private static friendlyToolLabel(name: string, input: Record<string, unknown>): string {
    const cleanName = name.toLowerCase()
    const path = typeof input.path === "string" ? input.path : (typeof input.filePath === "string" ? input.filePath : "")
    const shortPath = path ? path.split("/").slice(-2).join("/") : ""
    if (cleanName.includes("read")) return shortPath ? `Read ${shortPath}` : "Read file"
    if (cleanName.includes("write")) return shortPath ? `Write ${shortPath}` : "Write file"
    if (cleanName.includes("edit") || cleanName.includes("patch")) return shortPath ? `Edit ${shortPath}` : "Edit file"
    if (cleanName.includes("glob") || cleanName.includes("list")) return shortPath ? `List ${shortPath}` : "Explore workspace"
    if (cleanName.includes("grep") || cleanName.includes("search")) {
      const q = typeof input.pattern === "string" ? input.pattern : (typeof input.query === "string" ? input.query : "")
      return q ? `Search "${q.slice(0, 32)}"` : "Search code"
    }
    if (cleanName.includes("bash") || cleanName.includes("shell") || cleanName.includes("exec")) {
      const cmd = typeof input.command === "string" ? input.command.trim().split("\n")[0] : ""
      return cmd ? `Run ${cmd.slice(0, 40)}` : "Run shell command"
    }
    return name.slice(0, 80)
  }

  private redactSafeDelta(partKey: string, incoming: string): string {
    let buffered = (this.textTails.get(partKey) || "") + incoming
    const lastWhitespace = Math.max(buffered.lastIndexOf(" "), buffered.lastIndexOf("\n"), buffered.lastIndexOf("\t"))
    let retainFrom = lastWhitespace + 1
    const priorWordStart = Math.max(
      buffered.lastIndexOf(" ", Math.max(0, retainFrom - 2)),
      buffered.lastIndexOf("\n", Math.max(0, retainFrom - 2)),
      buffered.lastIndexOf("\t", Math.max(0, retainFrom - 2)),
    ) + 1
    const priorWord = buffered.slice(priorWordStart, Math.max(priorWordStart, retainFrom - 1))
    if (/^bearer$/i.test(priorWord) || /\b(?:api[_-]?key|secret|password|access_token|private_key)\s*[:=]\s*$/i.test(buffered.slice(0, retainFrom))) {
      retainFrom = priorWordStart
    }

    const begin = buffered.lastIndexOf("-----BEGIN ")
    const end = buffered.lastIndexOf("-----END ")
    if (begin > end) retainFrom = Math.min(retainFrom, begin)

    if (buffered.length > 32768 && retainFrom === 0) {
      this.textTails.set(partKey, "")
      return "[long unbroken text segment omitted]"
    }
    const safePrefix = buffered.slice(0, retainFrom)
    buffered = buffered.slice(retainFrom)
    this.textTails.set(partKey, buffered)
    return safePrefix ? redactSecrets(safePrefix) : ""
  }

  map(
    upstream: OpenCodeEvent,
    context: { runId: string; conversationId: string },
  ): AdaptedEvent[] {
    const event = upstream as NativeEvent
    const data = safeObject(event.data)
    const eventBase = {
      event_id: `evt_${event.id}`,
      run_id: context.runId,
      conversation_id: context.conversationId,
      ts: safeDate(event.created),
    }
    const make = (type: CoworkEventType, payload: Record<string, unknown>, suffix = ""): AdaptedEvent => ({
      ...eventBase,
      event_id: suffix ? `${eventBase.event_id}_${suffix}` : eventBase.event_id,
      type,
      payload,
    } as AdaptedEvent)

    switch (event.type) {
      case "session.execution.started":
        return [make("run.status", { status: "running", reason: "OpenCode execution started" })]
      case "session.execution.succeeded":
        // Avalingo's verifier must run before it emits run.completed.
        return [make("run.status", { status: "verifying", reason: "OpenCode execution finished" })]
      case "session.execution.failed":
        return [make("run.failed", { safe_error: "OpenCode execution failed.", fatal: false })]
      case "session.execution.interrupted":
        return [make("run.status", { status: "interrupted", reason: "OpenCode execution was interrupted" })]
      case "session.text.started":
        return [make("message.started", {
          message_id: String(data.assistantMessageID || event.id),
          role: "assistant",
        })]
      case "session.text.delta":
      {
        const messageId = String(data.assistantMessageID || event.id)
        const partId = String(data.ordinal ?? 0)
        const textDelta = this.redactSafeDelta(`${messageId}:${partId}`, String(data.delta || ""))
        return textDelta ? [make("message.delta", {
          message_id: messageId,
          part_id: partId,
          text_delta: textDelta,
        })] : []
      }
      case "session.text.ended": {
        const messageId = String(data.assistantMessageID || event.id)
        const partId = String(data.ordinal ?? 0)
        const tail = this.textTails.get(`${messageId}:${partId}`) || ""
        this.textTails.delete(`${messageId}:${partId}`)
        const finalText = safeText(data.text, 12000)
        const finalDelta = tail ? make("message.delta", {
          message_id: messageId,
          part_id: partId,
          text_delta: redactSecrets(tail),
        }, "tail") : null
        // The caller should persist each returned event. Emit the final pending safe text
        // before the canonical completed part when the upstream delta stream held a tail.
        return [...(finalDelta ? [finalDelta] : []), make("message.completed", {
          message_id: messageId,
          role: "assistant",
          parts: [{ type: "text", text: finalText }],
        })]
      }
      case "session.tool.input.started": {
        const callId = String(data.id || "")
        const name = String(data.name || "tool")
        if (callId) this.toolNames.set(callId, name)
        return []
      }
      case "session.tool.called": {
        const callId = String(data.id || event.id)
        const name = this.toolNames.get(callId) || "OpenCode tool"
        this.toolStartedAt.set(callId, Number(event.created) || Date.now())
        const rawInput = safeObject(data.input)
        let redactedInput: Record<string, unknown> = {}
        try { redactedInput = JSON.parse(safeText(rawInput, 12000)) as Record<string, unknown> } catch {}
        return [make("tool.started", {
          tool_call_id: callId,
          name,
          safe_label: OpenCodeEventAdapter.friendlyToolLabel(name, redactedInput),
          args_redacted: redactedInput,
        })]
      }
      case "session.tool.success": {
        const callId = String(data.id || event.id)
        const started = this.toolStartedAt.get(callId)
        const durationMs = started ? Math.max(0, (Number(event.created) || Date.now()) - started) : 0
        this.toolStartedAt.delete(callId)
        const content = Array.isArray(data.content) ? data.content : []
        const output = content
          .filter((part): part is Record<string, unknown> => !!part && typeof part === "object" && (part as Record<string, unknown>).type === "text")
          .map(part => safeText(part.text, 12000))
          .join("\n")
        this.toolNames.delete(callId)
        return [make("tool.completed", {
          tool_call_id: callId,
          result_summary: output.slice(0, 1000) || "Tool completed.",
          exit_code: 0,
          duration_ms: durationMs,
        })]
      }
      case "session.tool.failed": {
        const callId = String(data.id || event.id)
        const started = this.toolStartedAt.get(callId)
        const durationMs = started ? Math.max(0, (Number(event.created) || Date.now()) - started) : 0
        this.toolStartedAt.delete(callId)
        this.toolNames.delete(callId)
        return [make("tool.failed", {
          tool_call_id: callId,
          error_code: "OPENCODE_TOOL_FAILED",
          safe_message: safeText(data.error || "OpenCode tool failed.", 1000),
          retryable: false,
          duration_ms: durationMs,
        })]
      }
      default:
        return []
    }
  }
}
