import {
  parseAgentPlanDraft, toAgentPlan, withStepStatus,
  type AgentPlan, type PlanDraft,
} from "./chat-agent-plan"

type Role = "user" | "assistant"
export type ProviderMessage = { role: Role; content: unknown }
type EmitEvent = (type: string, data?: Record<string, unknown>) => void
export type AgentRunOptions = {
  apiKey: string
  model: string
  messages: ProviderMessage[]
  system: string
  signal: AbortSignal
  emit: EmitEvent
  streamFinal: (system: string) => Promise<string>
}

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const FAST_MODEL = () => process.env.EVO_AI_FAST_MODEL?.trim() || ""

/** Non-streamed, short intermediate drafts: used only for real subtasks. */
async function shortCompletion(
  apiKey: string,
  model: string,
  system: string,
  messages: ProviderMessage[],
  maxTokens: number,
  timeoutMs: number,
  parentSignal: AbortSignal,
) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.2,
      max_tokens: maxTokens,
      stream: false,
      ...(model.startsWith("nvidia/nemotron-3.5-") ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.any([parentSignal, AbortSignal.timeout(timeoutMs)]),
  })
  if (!response.ok) throw new Error(response.status === 429 ? "Az AI jelenleg túlterhelt." : "A tervezési lépés nem érhető el.")
  const result = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
  const content = result.choices?.[0]?.message?.content
  const answer = typeof content === "string" ? content : Array.isArray(content)
    ? content.map(part => part && typeof part === "object" && "text" in part ? String(part.text) : "").join("") : ""
  if (!answer.trim() || answer.length > 9000) throw new Error("A tervezési válasz érvénytelen.")
  return answer.trim()
}

/** Returns null when a plan cannot be produced fast: caller falls back to ordinary streaming. */
async function createPlan({ apiKey, model, messages, signal }: AgentRunOptions): Promise<PlanDraft | null> {
  const lastMessage = messages[messages.length - 1]
  const context = messages.slice(-4)
  const planningInstructions = [
    "You are organizing an assistant's work on a multi-part user request.",
    'Reply with one valid JSON object only, no Markdown: {"title":"brief task summary","steps":[{"title":"short visible step name","task":"specific independent subtask"},{"title":"second step","task":"specific independent subtask"}] }.',
    "Use 2 steps, or at most 3 if really necessary. Each step must be independently solvable in parallel using only the conversation content; the assistant will combine results afterwards.",
    "Never claim you can browse the web, access apps, inspect repositories, run commands or change files. No tool access exists.",
    "Short titles, no filler; use the same language as the user's message.",
  ].join(" ")
  if (!lastMessage || lastMessage.role !== "user") return null
  try {
    const raw = await shortCompletion(apiKey, FAST_MODEL() || model, planningInstructions, context, 270, 6_500, signal)
    return parseAgentPlanDraft(raw)
  } catch {
    return null
  }
}

/**
 * Genuine multi-step work: parallel, independent provider calls compute subtasks,
 * then a separate streamed synthesis produces the user-facing answer.
 * Status events reflect completed calls, never artificial timers.
 */
export async function executeAgentPlan(options: AgentRunOptions): Promise<string> {
  const { apiKey, model, messages, system, signal, emit, streamFinal } = options
  const draft = await createPlan(options)
  if (!draft || signal.aborted) return streamFinal(system)

  let plan: AgentPlan = toAgentPlan(draft)
  const update = (id: string, status: "pending" | "running" | "completed" | "error") => {
    plan = withStepStatus(plan, id, status)
    emit("plan", { id: "plan", plan })
  }
  emit("plan", { id: "plan", plan })

  const notes = await Promise.all(draft.subtasks.map(async (step, index) => {
    const stepId = "step-" + (index + 1)
    update(stepId, "running")
    try {
      const taskSystem = [
        "You are completing ONE subtask in an assistant's plan using only the given conversation.",
        "Give concise, factual working notes in the user's language (at most 250 words).",
        "No unsupported claims of web research, source verification, tool use or completed actions.",
        "These notes are internal drafting material, not the final user-facing answer.",
        "Your assigned subtask: " + step.task,
      ].join(" ")
      const note = await shortCompletion(apiKey, FAST_MODEL() || model, taskSystem, messages.slice(-5), 430, 10_000, signal)
      update(stepId, "completed")
      return { title: step.title, text: note.slice(0, 2600) }
    } catch {
      update(stepId, "error")
      return null
    }
  }))

  const completedNotes = notes.filter((value): value is { title: string; text: string } => value !== null)
  update("final", "running")
  const context = completedNotes.length ? completedNotes.map((note, index) =>
    "Draft " + (index + 1) + " — " + note.title + ":\n" + note.text).join("\n\n") : ""
  const synthesisSystem = completedNotes.length
    ? system + "\nSeveral independent drafting subtasks have completed. The following notes are unverified draft material, not tool results or external evidence. Check consistency and answer the original user message completely. Do not repeat the plan, internal notes, or claim external actions.\n" + context
    : system
  try {
    const final = await streamFinal(synthesisSystem)
    update("final", "completed")
    return final
  } catch (error) {
    update("final", "error")
    throw error
  }
}
