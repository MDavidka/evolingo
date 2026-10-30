import assert from "node:assert/strict"
import test from "node:test"
import { classifyVisualIntent, getVisualSelectionHint, shouldPlanVisuals, VISUAL_CAPABILITIES } from "./orchestrator.ts"
import { calculateLearningMinutes } from "./calculations.ts"
import { validateIntelligentUI } from "./schema.ts"

test("the orchestrator honors explicit text-only requests", () => {
  assert.equal(classifyVisualIntent("Válaszolj csak szöveggel!"), "text")
  assert.equal(classifyVisualIntent("Only text, no cards"), "text")
  assert.equal(shouldPlanVisuals("Szia!"), false)
})

test("selects quizzes, vocabulary, charts, grammar and calculators", () => {
  assert.equal(classifyVisualIntent("Kérdezz ki Present Simple-ből"), "quiz")
  assert.equal(classifyVisualIntent("Taníts meg 5 angol szót tanulókártyákkal"), "flashcards")
  assert.equal(classifyVisualIntent("Rajzolj grafikont a H 12 K 24 adatokból"), "chart")
  assert.equal(classifyVisualIntent("Mennyi a heti tanulási idő, ha naponta 30 percet tanulok?"), "calculator")
  assert.equal(classifyVisualIntent("Mi a Present Perfect?"), "grammar")
  assert.match(getVisualSelectionHint("Napi 30 perc tanulás"), /study_calculator/)
})

test("the model cannot register custom UI types through the manifest", () => {
  assert.ok(VISUAL_CAPABILITIES.includes("quiz_choice"))
  assert.ok(VISUAL_CAPABILITIES.includes("study_calculator"))
  assert.equal(VISUAL_CAPABILITIES.includes("executable_javascript"), false)
})

test("known calculator example has accurate localized-learning arithmetic", () => {
  const minutes = calculateLearningMinutes({ dailyMinutes: 30, daysPerWeek: 5, weeks: 4 })
  assert.equal(minutes, 600)
  assert.equal(minutes / 60, 10)
  assert.equal(calculateLearningMinutes({ dailyMinutes: 25, daysPerWeek: 5, weeks: 1 }), 125)
})

test("calculator rejects arbitrary formula inputs and out-of-range values", () => {
  for (const invalid of [
    { dailyMinutes: 0, daysPerWeek: 5, weeks: 1 },
    { dailyMinutes: 12, daysPerWeek: 5, weeks: 1 },
    { dailyMinutes: 25, daysPerWeek: 8, weeks: 1 },
    { dailyMinutes: 25, daysPerWeek: 5, weeks: 13 },
    { dailyMinutes: Infinity, daysPerWeek: 5, weeks: 1 },
  ]) assert.throws(() => calculateLearningMinutes(invalid))
})

test("schema validates only bounded, deterministic calculator fields", () => {
  const block = { id: "calc1", type: "study_calculator", props: {
    title: "Tanulási idő", dailyMinutes: 30, daysPerWeek: 5, weeks: 4,
  } }
  assert.ok(validateIntelligentUI({ version: "1", blocks: [block] }))
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{
    ...block, props: { ...block.props, expression: "eval('unsafe code')" },
  }] }), null)
})
