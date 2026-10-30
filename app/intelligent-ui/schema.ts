/** Evölingo Intelligent UI v1. Model data is never executable code. */
export type GrammarRuleBlock = { id: string; type: "grammar_rule"; props: { title: string; rule: string; examples: string[] } }
export type QuizChoiceBlock = { id: string; type: "quiz_choice"; props: { question: string; choices: string[]; correctIndex: number; explanation: string } }
/** Client projection: answer key and explanation remain on the server until grading. */
export type PublicQuizChoiceBlock = { id: string; type: "quiz_choice"; props: { question: string; choices: string[]; ticket: string } }
export type VocabularyFlashcardBlock = { id: string; type: "vocabulary_flashcard"; props: { title: string; cards: { front: string; back: string; example?: string }[] } }
export type ComparisonTableBlock = { id: string; type: "comparison_table"; props: { title: string; columns: [string, string]; rows: { label: string; left: string; right: string }[] } }
export type TenseTimelineBlock = { id: string; type: "tense_timeline"; props: { title: string; steps: { phase: "past" | "present" | "future"; label: string; detail: string }[] } }
export type StudyPlanBlock = { id: string; type: "study_plan"; props: { title: string; days: { day: string; task: string }[] } }
export type ConceptCardBlock = { id: string; type: "concept_card"; props: { title: string; description: string; icon: "idea" | "book" | "language" | "check"; badge?: string } }
export type ChartCardBlock = { id: string; type: "chart_card"; props: { title: string; chartType: "bar" | "line" | "donut"; source: "example" | "verified"; unit?: string; points: { label: string; value: number }[] } }
/** Pure, client-side calculation: no generated executable expressions. */
export type StudyCalculatorBlock = { id: string; type: "study_calculator"; props: { title: string; dailyMinutes: number; daysPerWeek: number; weeks: number } }
export type ProgressBarsBlock = { id: string; type: "progress_bars"; props: { title: string; items: { label: string; value: number; max: number }[] } }
export type IntelligentBlock = GrammarRuleBlock | QuizChoiceBlock | PublicQuizChoiceBlock | VocabularyFlashcardBlock | ComparisonTableBlock | TenseTimelineBlock | StudyPlanBlock | ConceptCardBlock | ChartCardBlock | StudyCalculatorBlock | ProgressBarsBlock
export type IntelligentUI = { version: "1"; blocks: IntelligentBlock[] }

type Obj = Record<string, unknown>
const obj = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x)
const keys = (x: Obj, allowed: string[]) => Object.keys(x).every(k => allowed.includes(k))
const txt = (x: unknown, n = 220): x is string => typeof x === "string" && !!x.trim() && x.length <= n && !/[\u0000-\u001f]/.test(x)
const texts = (x: unknown, min: number, max: number, n = 200): x is string[] => Array.isArray(x) && x.length >= min && x.length <= max && x.every(v => txt(v, n))
const rows = (x: unknown, min: number, max: number, f: (row: Obj) => boolean) => Array.isArray(x) && x.length >= min && x.length <= max && x.every(v => obj(v) && f(v))

function blockValid(b: unknown, allowProgress: boolean, allowVerifiedCharts: boolean, allowPublicQuizzes: boolean): b is IntelligentBlock {
  if (!obj(b) || !keys(b, ["id", "type", "props"]) || !txt(b.id, 48) || !/^[a-z0-9][a-z0-9-]{0,47}$/i.test(b.id) || !obj(b.props)) return false
  const p = b.props
  switch (b.type) {
    case "grammar_rule": return keys(p, ["title", "rule", "examples"]) && txt(p.title, 100) && txt(p.rule, 480) && texts(p.examples, 1, 5)
    case "quiz_choice": return (
      keys(p, ["question", "choices", "correctIndex", "explanation"]) && txt(p.question, 260) && texts(p.choices, 2, 5, 160) &&
      typeof p.correctIndex === "number" && Number.isInteger(p.correctIndex) && (p.correctIndex as number) >= 0 &&
      (p.correctIndex as number) < (p.choices as string[]).length && txt(p.explanation, 400)
    ) || (
      allowPublicQuizzes && keys(p, ["question", "choices", "ticket"]) &&
      txt(p.question, 260) && texts(p.choices, 2, 5, 160) &&
      typeof p.ticket === "string" && /^[A-Za-z0-9_-]{80,2700}$/.test(p.ticket)
    )
    case "vocabulary_flashcard": return keys(p, ["title", "cards"]) && txt(p.title, 100) && rows(p.cards, 1, 12, v => keys(v, ["front", "back", "example"]) && txt(v.front, 120) && txt(v.back, 180) && (v.example === undefined || txt(v.example, 180)))
    case "comparison_table": return keys(p, ["title", "columns", "rows"]) && txt(p.title, 100) && texts(p.columns, 2, 2, 80) && rows(p.rows, 1, 8, v => keys(v, ["label", "left", "right"]) && txt(v.label, 90) && txt(v.left, 200) && txt(v.right, 200))
    case "tense_timeline": return keys(p, ["title", "steps"]) && txt(p.title, 100) && rows(p.steps, 2, 5, v => keys(v, ["phase", "label", "detail"]) && ["past", "present", "future"].includes(String(v.phase)) && txt(v.label, 120) && txt(v.detail, 240))
    case "study_plan": return keys(p, ["title", "days"]) && txt(p.title, 100) && rows(p.days, 1, 7, v => keys(v, ["day", "task"]) && txt(v.day, 50) && txt(v.task, 180))
    case "concept_card": return keys(p, ["title", "description", "icon", "badge"]) && txt(p.title, 100) && txt(p.description, 480) && ["idea", "book", "language", "check"].includes(String(p.icon)) && (p.badge === undefined || txt(p.badge, 36))
    case "chart_card": return keys(p, ["title", "chartType", "source", "unit", "points"]) &&
      txt(p.title, 100) && ["bar", "line", "donut"].includes(String(p.chartType)) &&
      (p.source === "example" || (allowVerifiedCharts && p.source === "verified")) &&
      (p.unit === undefined || txt(p.unit, 18)) &&
      rows(p.points, 2, 8, v => keys(v, ["label", "value"]) && txt(v.label, 40) &&
        typeof v.value === "number" && Number.isFinite(v.value) && v.value >= 0 && v.value <= 100000)
    case "study_calculator": return keys(p, ["title", "dailyMinutes", "daysPerWeek", "weeks"]) &&
      txt(p.title, 100) && Number.isInteger(p.dailyMinutes) && typeof p.dailyMinutes === "number" && p.dailyMinutes >= 5 && p.dailyMinutes <= 120 && p.dailyMinutes % 5 === 0 &&
      Number.isInteger(p.daysPerWeek) && typeof p.daysPerWeek === "number" && p.daysPerWeek >= 1 && p.daysPerWeek <= 7 &&
      Number.isInteger(p.weeks) && typeof p.weeks === "number" && p.weeks >= 1 && p.weeks <= 12
    case "progress_bars": return allowProgress && keys(p, ["title", "items"]) && txt(p.title, 100) && rows(p.items, 1, 8, v => keys(v, ["label", "value", "max"]) && txt(v.label, 90) && typeof v.value === "number" && typeof v.max === "number" && Number.isFinite(v.max) && Number.isFinite(v.value) && v.max > 0 && v.max <= 1000000 && v.value >= 0 && v.value <= v.max)
    default: return false
  }
}
export function validateIntelligentUI(input: unknown, opts?: { allowUserProgress?: boolean; allowVerifiedCharts?: boolean; allowPublicQuizzes?: boolean }): IntelligentUI | null {
  if (!obj(input) || !keys(input, ["version", "blocks"]) || input.version !== "1" || !Array.isArray(input.blocks) || input.blocks.length > 3) return null
  const ids = new Set<string>()
  for (const b of input.blocks) {
    if (!blockValid(b, opts?.allowUserProgress === true, opts?.allowVerifiedCharts === true, opts?.allowPublicQuizzes === true) || ids.has(b.id)) return null
    ids.add(b.id)
  }
  return input as unknown as IntelligentUI
}
export function parseModelUI(raw: string): IntelligentUI | null {
  if (raw.length > 14000) return null
  const clean = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "")
  const candidates = [clean]
  // Some compatible providers wrap a valid JSON object in short explanatory
  // text despite instructions. Extracting is safe: validation still rejects
  // every unknown component, prop or oversized data value.
  const first = clean.indexOf("{")
  const last = clean.lastIndexOf("}")
  if (first >= 0 && last > first) candidates.push(clean.slice(first, last + 1))
  for (const candidate of candidates) {
    try {
      const parsed = validateIntelligentUI(JSON.parse(candidate))
      if (parsed) return parsed
    } catch {}
  }
  return null
}
