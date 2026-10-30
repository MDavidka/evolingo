import assert from "node:assert/strict"
import test from "node:test"
import { validateIntelligentUI, parseModelUI } from "./schema.ts"

const rule = { id: "rule-1", type: "grammar_rule", props: {
  title: "Present Perfect", rule: "have/has + past participle", examples: ["She has gone."]
} }

test("accepts an allowlisted, bounded grammar card", () => {
  const ui = validateIntelligentUI({ version: "1", blocks: [rule] })
  assert.equal(ui?.blocks[0].type, "grammar_rule")
})

test("accepts an optional plain-text layout without blocks", () => {
  assert.deepEqual(validateIntelligentUI({ version: "1", blocks: [] }), { version: "1", blocks: [] })
})

test("rejects unrecognized model-generated component types", () => {
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ id: "bad", type: "html", props: { html: "<script>alert(1)</script>" } }] }), null)
})

test("rejects unknown props, even on known blocks", () => {
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ ...rule, props: { ...rule.props, onClick: "delete" } }] }), null)
})

test("rejects duplicate IDs and more than three blocks", () => {
  assert.equal(validateIntelligentUI({ version: "1", blocks: [rule, rule] }), null)
  assert.equal(validateIntelligentUI({ version: "1", blocks: [rule, { ...rule, id: "rule-2" }, { ...rule, id: "rule-3" }, { ...rule, id: "rule-4" }] }), null)
})

test("rejects fabricated user-specific statistics from AI", () => {
  const progress = { id: "progress-1", type: "progress_bars", props: { title: "Haladásom", items: [{ label: "Tanulás", value: 2, max: 10 }] } }
  assert.equal(validateIntelligentUI({ version: "1", blocks: [progress] }), null)
  assert.notEqual(validateIntelligentUI({ version: "1", blocks: [progress] }, { allowUserProgress: true }), null)
})

test("rejects incorrect quiz indices", () => {
  const quiz = { id: "quiz-1", type: "quiz_choice", props: { question: "Melyik?", choices: ["A", "B"], correctIndex: 3, explanation: "Magyarázat" } }
  assert.equal(validateIntelligentUI({ version: "1", blocks: [quiz] }), null)
  assert.notEqual(validateIntelligentUI({ version: "1", blocks: [{ ...quiz, props: { ...quiz.props, correctIndex: 0 } }] }), null)
})

test("rejects too-long data and oversized flashcard arrays", () => {
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ ...rule, props: { ...rule.props, title: "a".repeat(150) } }] }), null)
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ id: "flash-1", type: "vocabulary_flashcard", props: { title: "Szavak", cards: Array.from({ length: 13 }, () => ({ front: "cat", back: "macska" })) } }] }), null)
})

test("parses fenced JSON but rejects arbitrary code", () => {
  const raw = JSON.stringify({ version: "1", blocks: [rule] })
  assert.equal(parseModelUI(raw)?.blocks.length, 1)
  assert.equal(parseModelUI("\x60\x60\x60json\n" + raw + "\n\x60\x60\x60")?.blocks.length, 1)
  assert.equal(parseModelUI("<script>run()</script>"), null)
})

test("rejects root keys and prototype tricks", () => {
  assert.equal(validateIntelligentUI({ version: "1", blocks: [], html: "x" }), null)
  assert.equal(parseModelUI('{"version":"1","blocks":[],"__proto__":{"admin":true}}'), null)
})


test("allows safe icon-and-badge educational concept cards", () => {
  const item = { id: "concept-1", type: "concept_card", props: {
    title: "A Present Perfect", description: "A múltat a jelennel kapcsolja össze.",
    icon: "idea", badge: "Nyelvtan"
  } }
  assert.equal(validateIntelligentUI({ version: "1", blocks: [item] })?.blocks[0].type, "concept_card")
  assert.equal(validateIntelligentUI({ version: "1", blocks: [
    { ...item, props: { ...item.props, icon: "untrusted-svg" } }
  ] }), null)
})

test("accepts valid structured JSON wrapped by model prose", () => {
  const raw = JSON.stringify({ version: "1", blocks: [rule] })
  assert.equal(parseModelUI("Ezek az elemek:\n" + raw + "\nKész.")?.blocks.length, 1)
})

test("accepts bounded example bar, line and donut charts", () => {
  for (const chartType of ["bar", "line", "donut"]) {
    const block = { id: "chart-1", type: "chart_card", props: { title: "Példaadatok", chartType, source: "example", unit: "pont", points: [{ label: "A", value: 2 }, { label: "B", value: 5 }] } }
    assert.equal(validateIntelligentUI({ version: "1", blocks: [block] })?.blocks[0].type, "chart_card")
  }
})

test("rejects fabricated verified progress and malformed numerical values", () => {
  const block = { id: "chart-1", type: "chart_card", props: { title: "Haladás", chartType: "donut", source: "verified", points: [{ label: "Kész", value: 3 }, { label: "Hátra", value: 7 }] } }
  assert.equal(validateIntelligentUI({ version: "1", blocks: [block] }), null)
  assert.equal(validateIntelligentUI({ version: "1", blocks: [block] }, { allowVerifiedCharts: true })?.blocks.length, 1)
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ ...block, props: { ...block.props, source: "example", points: [{ label: "Kész", value: -1 }, { label: "Hátra", value: 7 }] } }] }), null)
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ ...block, props: { ...block.props, source: "example", chartType: "html" } }] }), null)
})

test("rejects giant data arrays and unrecognized chart props", () => {
  const values = Array.from({ length: 9 }, (_, i) => ({ label: String(i), value: i }))
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ id: "chart-1", type: "chart_card", props: { title: "Minták", chartType: "line", source: "example", points: values } }] }), null)
  assert.equal(validateIntelligentUI({ version: "1", blocks: [{ id: "chart-1", type: "chart_card", props: { title: "Minták", chartType: "line", source: "example", points: values.slice(0, 3), onClick: "fetch()" } }] }), null)
})
