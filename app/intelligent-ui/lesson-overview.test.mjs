import assert from "node:assert/strict"
import test from "node:test"
import { buildLessonOverview } from "./lesson-overview.ts"
import { validateIntelligentUI } from "./schema.ts"

const lessons = [
  { id: 1, title: "Present Simple", summary: "Szokások, napi rutinok", read: true, completed: true },
  { id: 2, title: "Past Simple", summary: "Befejezett múltbeli események", read: true, completed: false },
  { id: 3, title: "Present Perfect", summary: "Múltbeli tapasztalat és jelen", read: false, completed: false },
]

test("lesson overview builds all three reusable validated blocks", () => {
  const ui = buildLessonOverview(lessons, 1)
  assert.deepEqual(ui.blocks.map(block => block.type), ["chart_card", "vocabulary_flashcard", "quiz_choice"])
  assert.equal(validateIntelligentUI(ui), null, "AI must not claim verified progress")
  assert.notEqual(validateIntelligentUI(ui, { allowVerifiedCharts: true }), null)
})

test("chart uses actual completion flags and never fabricates seven-day activity", () => {
  const ui = buildLessonOverview(lessons)
  const block = ui.blocks[0]
  assert.equal(block.type, "chart_card")
  if (block.type !== "chart_card") return
  assert.deepEqual(block.props.points.map(point => point.value), [1, 1, 1])
  assert.equal(block.props.source, "verified")
  assert.ok(block.props.points.every(point => !point.label.includes("nap")))
})

test("quiz answer index resolves to the title matching the actual summary", () => {
  const ui = buildLessonOverview(lessons, 2)
  const block = ui.blocks.find(value => value.type === "quiz_choice")
  assert.ok(block && block.type === "quiz_choice")
  if (block?.type !== "quiz_choice") return
  assert.equal(block.props.choices[block.props.correctIndex], lessons[0].title)
})

test("empty lessons do not show fake progress or example questions", () => {
  assert.deepEqual(buildLessonOverview([]), { version: "1", blocks: [] })
})

test("incomplete and duplicate lesson data falls back to actual charts", () => {
  const data = [{ ...lessons[0], title: "Grammar", summary: "" }, { ...lessons[1], title: "Grammar" }]
  const ui = buildLessonOverview(data, 3)
  assert.deepEqual(ui.blocks.map(block => block.type), ["chart_card"])
})
