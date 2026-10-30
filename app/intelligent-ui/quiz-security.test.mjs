import assert from "node:assert/strict"
import test from "node:test"
import { issueQuizTicket, gradeQuizTicket } from "./quiz-security.ts"
import { projectVisualResponse } from "./visual-policy.ts"
import { validateIntelligentUI } from "./schema.ts"

process.env.EVO_VISUAL_QUIZ_SECRET = "test-visual-quiz-only-not-a-real-credential-2026"

const authored = {
  id: "q1", type: "quiz_choice", props: {
    question: "She ___ to school every day.",
    choices: ["going", "goes", "go"],
    correctIndex: 1,
    explanation: "Egyes szám harmadik személyben goes.",
  },
}

test("public projection never includes the answer key or explanation", () => {
  const projected = projectVisualResponse({ version: "1", blocks: [authored] })
  assert.ok(projected)
  const encoded = JSON.stringify(projected)
  assert.ok(!encoded.includes('"correctIndex"'))
  assert.ok(!encoded.includes('"explanation"'))
  assert.ok(!encoded.includes("Egyes szám"))
  assert.ok(validateIntelligentUI(projected, { allowPublicQuizzes: true }))
  assert.equal(validateIntelligentUI(projected), null, "Model author schema must reject public projection")
})

test("only the grading endpoint can reveal a sealed answer", () => {
  const client = issueQuizTicket(authored, 1_000_000)
  assert.equal("correctIndex" in client.props, false)
  const right = gradeQuizTicket(client.props.ticket, 1, 1_000_500)
  assert.equal(right.correct, true)
  assert.equal(right.correctIndex, 1)
  assert.match(right.explanation, /harmadik személyben/)
  assert.equal(gradeQuizTicket(client.props.ticket, 0, 1_000_500).correct, false)
})

test("tampering, bad index and expired tickets never grade", () => {
  const publicBlock = issueQuizTicket(authored, 1_000_000)
  const ticket = publicBlock.props.ticket
  const altered = ticket.slice(0, -2) + (ticket.slice(-2, -1) === "A" ? "B" : "A") + ticket.slice(-1)
  assert.throws(() => gradeQuizTicket(altered, 1, 1_000_500))
  assert.throws(() => gradeQuizTicket(ticket, -1, 1_000_500))
  assert.throws(() => gradeQuizTicket(ticket, 3, 1_000_500))
  assert.throws(() => gradeQuizTicket(ticket, 1.5, 1_000_500))
  assert.throws(() => gradeQuizTicket(ticket, 1, 1_000_000 + 72 * 60 * 60 * 1000 + 1))
})

test("untrusted model HTML and malformed choices never enter a quiz token", () => {
  const invalid = { ...authored, props: { ...authored.props, extra: "<script>alert(1)</script>" } }
  assert.equal(projectVisualResponse({ version: "1", blocks: [invalid] }), null)
  assert.throws(() => issueQuizTicket(invalid))
})

test("non-quiz visual blocks pass through unchanged", () => {
  const simple = { id: "rule1", type: "grammar_rule", props: {
    title: "Present Simple", rule: "Alany + ige", examples: ["I learn English."],
  } }
  const projected = projectVisualResponse({ version: "1", blocks: [simple] })
  assert.deepEqual(projected, { version: "1", blocks: [simple] })
})
