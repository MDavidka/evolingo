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

const apiURL = () => process.env.ZRO_API_KEY?.trim()
  ? "https://zro.moonmath.ai/v1/chat/completions"
  : "https://openrouter.ai/api/v1/chat/completions"
const FAST_MODEL = () => process.env.EVO_AI_FAST_MODEL?.trim() || (process.env.ZRO_API_KEY?.trim() ? "deepseek-v4-flash-0731" : "")

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
  const candidates = process.env.ZRO_API_KEY?.trim()
    ? Array.from(new Set([model, model === "deepseek-v4-flash-0731" ? "deepseek-v4.1-flash" : "deepseek-v4-flash-0731"]))
    : [model]
  let response: Response | null = null
  let lastStatus = 502
  for (let attempt = 0; attempt < 2; attempt++) {
    const candidateModel = candidates[attempt % candidates.length]
    const res = await fetch(apiURL(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey, Connection: "keep-alive" },
      body: JSON.stringify({
        model: candidateModel,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: false,
        ...(candidateModel.startsWith("deepseek-") ? { thinking: { type: "disabled" } } : {}),
        ...(candidateModel.startsWith("nvidia/nemotron-3.5-") ? { reasoning: { effort: "none" } } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.any([parentSignal, AbortSignal.timeout(timeoutMs)]),
    })
    if (res.ok) {
      response = res
      break
    }
    lastStatus = res.status
    if (res.status !== 429 && res.status !== 502 && res.status !== 503 && res.status !== 504) break
    await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)))
  }
  if (!response || !response.ok) throw new Error(lastStatus === 429 ? "Az AI jelenleg túlterhelt." : "A tervezési lépés nem érhető el.")
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
    'Reply with one valid JSON object only, no Markdown: {"title":"brief task summary","steps":[{"title":"short visible step name","task":"specific independent subtask","commands":["short sub-action 1","short sub-action 2"]},{"title":"second step","task":"specific independent subtask","commands":["short sub-action 1"]}] }.',
    "Use 2 steps, or at most 3 if really necessary. Keep each task under 20 words.",
    "Never claim you can browse the web, access apps, inspect repositories, run commands or change files. No tool access exists.",
    "Short titles, no filler; use the same language as the user's message.",
  ].join(" ")
  if (!lastMessage || lastMessage.role !== "user") return null
  try {
    const raw = await shortCompletion(apiKey, FAST_MODEL() || model, planningInstructions, context, 240, 4_500, signal)
    return parseAgentPlanDraft(raw)
  } catch {
    return null
  }
}

/**
 * Fast structured plan execution: generates a bounded multi-step plan and immediately
 * streams the final response guided by the structured steps, avoiding multi-call rate limits.
 */
export async function executeAgentPlan(options: AgentRunOptions): Promise<string> {
  const { system, signal, emit, streamFinal } = options
  const draft = await createPlan(options)
  if (!draft || signal.aborted) return streamFinal(system)

  let plan: AgentPlan = toAgentPlan(draft)
  const update = (id: string, status: "pending" | "running" | "completed" | "error", detail?: string) => {
    plan = withStepStatus(plan, id, status, detail)
    emit("plan", { id: "plan", plan })
  }
  emit("plan", { id: "plan", plan })

  for (let index = 0; index < draft.subtasks.length; index++) {
    const step = draft.subtasks[index]
    const stepId = "step-" + (index + 1)
    update(stepId, "running", step.task)
    emit("status", { phase: "step_running", label: step.title, detail: step.task })
    update(stepId, "completed", step.task)
  }

  update("final", "running")
  const context = draft.subtasks.map((step, index) =>
    `Step ${index + 1} (${step.title}): ${step.task}`).join("\n")
  const synthesisSystem = system + "\nFollow this structured plan to answer the user's request thoroughly and concisely without repeating internal plan metadata:\n" + context
  try {
    const final = await streamFinal(synthesisSystem)
    update("final", "completed")
    return final
  } catch (error) {
    update("final", "error")
    throw error
  }
}
