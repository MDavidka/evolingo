/** Shared, validation-only contract for shadcn Trace-style agent plans. */
export type AgentStepStatus = "pending" | "running" | "completed" | "error"
export type AgentStep = { id: string; title: string; status: AgentStepStatus }
export type AgentPlan = { id: "plan"; title: string; steps: AgentStep[] }
export type PlannedSubtask = { title: string; task: string }
export type PlanDraft = { title: string; subtasks: PlannedSubtask[] }

const stepStatuses = new Set<AgentStepStatus>(["pending", "running", "completed", "error"])
const clean = (value: unknown, limit: number) => typeof value === "string"
  ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit)
  : ""

/** Cheap local intent detection: short everyday questions get the original single-call path. */
export function shouldUseAgentPlan(text: string) {
  if (text.length < 18) return false
  if (/(?:\b(?:step[ -]?by[ -]?step|multi[ -]?step|multiple steps|plan and (?:execute|implement)|break (?:it|this) (?:down )?into steps|first .{2,60} then|research .{3,80} then|analy[sz]e .{3,80} (?:then|and) (?:write|build|create))\b|\b(?:lépésenként|több lépésben|többlépéses|lépésről lépésre|először .{2,60} majd|tervezd meg .{3,80} majd)\b)/i.test(text)) return true
  const numbered = text.match(/(?:^|\n)\s*(?:[1-9][.)]|[-*])\s+\S/gm) || []
  if (numbered.length >= 2) return true
  const directives = text.match(/(?:^|[.;\n])\s*(?:create|build|compare|research|analyze|analyse|summarize|write|design|generate|make|implement|check|tervezz|készíts|írj|hasonlítsd|elemezd|vizsgáld|ellenőrizd|javítsd|hozd létre)\b/gi) || []
  return directives.length >= 2 && text.length >= 85
}

/** Provider output is untrusted. Accept only small, bounded, actionable JSON. */
export function parseAgentPlanDraft(raw: string): PlanDraft | null {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start < 0 || end <= start || end - start > 4500) return null
  try {
    const candidate: unknown = JSON.parse(raw.slice(start, end + 1))
    if (!candidate || typeof candidate !== "object") return null
    const record = candidate as Record<string, unknown>
    if (!Array.isArray(record.steps) || record.steps.length < 2 || record.steps.length > 3) return null
    const title = clean(record.title, 78) || "Feladat megoldása"
    const subtasks: PlannedSubtask[] = []
    const seen = new Set<string>()
    for (const entry of record.steps) {
      if (!entry || typeof entry !== "object") return null
      const value = entry as Record<string, unknown>
      const name = clean(value.title, 78)
      const task = clean(value.task, 440)
      if (!name || !task || seen.has(name.toLocaleLowerCase())) return null
      seen.add(name.toLocaleLowerCase())
      subtasks.push({ title: name, task })
    }
    return { title, subtasks }
  } catch { return null }
}

export function toAgentPlan(draft: PlanDraft): AgentPlan {
  return { id: "plan", title: draft.title, steps: [
    ...draft.subtasks.map((step, index) => ({ id: "step-" + (index + 1), title: step.title, status: "pending" as const })),
    { id: "final", title: "Válasz összeállítása", status: "pending" },
  ] }
}

export function withStepStatus(plan: AgentPlan, id: string, status: AgentStepStatus): AgentPlan {
  return { ...plan, steps: plan.steps.map(step => step.id === id ? { ...step, status } : step) }
}

export function isAgentPlan(value: unknown): value is AgentPlan {
  if (!value || typeof value !== "object") return false
  const plan = value as Record<string, unknown>
  return plan.id === "plan" && typeof plan.title === "string" && plan.title.length > 0 && plan.title.length <= 100 &&
    Array.isArray(plan.steps) && plan.steps.length >= 2 && plan.steps.length <= 4 &&
    plan.steps.every((step: unknown) => {
      if (!step || typeof step !== "object") return false
      const row = step as Record<string, unknown>
      return typeof row.id === "string" && row.id.length > 0 && row.id.length <= 40 &&
        typeof row.title === "string" && row.title.length > 0 && row.title.length <= 100 && stepStatuses.has(row.status as AgentStepStatus)
    })
}
