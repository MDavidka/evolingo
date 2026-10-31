import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { shouldUseAgentPlan, parseAgentPlanDraft, toAgentPlan, withStepStatus, isAgentPlan } from './chat-agent-plan.ts'

test('simple questions keep the fast path', () => {
  for (const request of ['Szia', 'What is the EU?', 'Explain photosynthesis briefly', 'Translate this: hello']) {
    assert.equal(shouldUseAgentPlan(request), false, request)
  }
})

test('explicit multistep prompts enter the plan path', () => {
  assert.equal(shouldUseAgentPlan('First compare the approaches then write a detailed implementation guide.'), true)
  assert.equal(shouldUseAgentPlan('Készítsd el a tervet lépésről lépésre, majd részletezd a folyamatot.'), true)
  assert.equal(shouldUseAgentPlan('Update this UI:\n1. Redesign sidebar\n2. Fix safe area'), true)
})

test('plan parser validates titles, distinct tasks and size boundaries', () => {
  const result = parseAgentPlanDraft('{"title":"Design review","steps":[{"title":"Audit layout","task":"Inspect spacing"},{"title":"Check contrast","task":"Validate readability"}]}')
  assert.ok(result)
  assert.equal(result.subtasks.length, 2)
  assert.equal(parseAgentPlanDraft('{"steps":[{"title":"One","task":"A"}]}'), null)
  assert.equal(parseAgentPlanDraft('{"steps":[{"title":"One","task":"A"},{"title":"One","task":"B"}]}'), null)
  assert.equal(parseAgentPlanDraft('totally invalid'), null)
})

test('step updates do not mutate and are valid for persistence', () => {
  const draft = parseAgentPlanDraft('{"title":"Test","steps":[{"title":"Part A","task":"Solve A"},{"title":"Part B","task":"Solve B"}]}')
  assert.ok(draft)
  const plan = toAgentPlan(draft)
  const running = withStepStatus(plan, 'step-1', 'running')
  const done = withStepStatus(running, 'step-1', 'completed')
  assert.equal(plan.steps[0].status, 'pending')
  assert.equal(done.steps[0].status, 'completed')
  assert.equal(done.steps.at(-1).status, 'pending')
  assert.equal(isAgentPlan(done), true)
  assert.equal(isAgentPlan({ ...done, steps: [{ title: '<script>' }] }), false)
})
