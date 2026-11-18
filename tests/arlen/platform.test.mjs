import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modes, modeInstruction } from '../../lib/arlen/modes.ts'
import { modelProfile, profileFor, coworkModel, coworkPermissions } from '../../lib/arlen/models.ts'
import { selectContext } from '../../lib/arlen/context.ts'
import { chatEventWriter, chatEventSchema } from '../../lib/arlen/events.ts'

test('Chat is request-scoped without execution capabilities; Dev and Cowork have distinct lifecycles', () => {
  assert.equal(modes.chat.executionUI, false)
  assert.equal(modes.chat.lifecycle, 'request')
  assert.equal(modes.dev.lifecycle, 'project')
  assert.equal(modes.cowork.lifecycle, 'durable-run')
  assert.ok(!modes.chat.capabilities.includes('execution'))
  assert.notEqual(modeInstruction('dev'), modeInstruction('cowork'))
})

test('model routing honors profiles, fallback order and bounded budgets without configuring embeddings implicitly', () => {
  const profile = modelProfile('coding', { ARLEN_MODEL_CODING: 'provider/coder', ARLEN_MODEL_CODING_FALLBACKS: 'provider/backup,provider/coder', ARLEN_MODEL_CODING_MAX_TOKENS: '999999' })
  assert.deepEqual(profile.candidates, ['provider/coder', 'provider/backup'])
  assert.equal(profile.maxTokens, 2400)
  assert.equal(modelProfile('embeddings', {}).primary, undefined)
  assert.equal(profileFor('chat'), 'fast')
  assert.equal(profileFor('chat', { vision: true }), 'vision')
  assert.equal(profileFor('chat', { complex: true }), 'balanced')
  assert.equal(coworkModel({ ARLEN_COWORK_MODEL: 'provider/worker' }), 'provider/worker')
})

test('context retrieval excludes other owners, projects, runs, unconsented and irrelevant memory', () => {
  const base = { ownerId: 'alice', text: 'timer settings' }
  const records = [
    { ...base, id: 'session', category: 'session', sessionId: 's1' },
    { ...base, id: 'wrong-session', category: 'session', sessionId: 's2' },
    { ...base, id: 'other-owner', category: 'session', sessionId: 's1', ownerId: 'bob' },
    { ...base, id: 'no-consent', category: 'user', consent: false },
    { ...base, id: 'consented', category: 'user', consent: true },
    { ...base, id: 'unrelated', category: 'user', consent: true, text: 'vacation' },
    { ...base, id: 'project', category: 'project', projectId: 'p1' },
    { ...base, id: 'other-project', category: 'project', projectId: 'p2' },
    { ...base, id: 'execution', category: 'execution', sessionId: 's1', runId: 'r1' },
    { ...base, id: 'other-run', category: 'execution', sessionId: 's1', runId: 'r2' },
  ]
  const scope = { ownerId: 'alice', sessionId: 's1', projectId: 'p1', runId: 'r1' }
  assert.deepEqual(selectContext(records, scope, 'timer').map(r => r.id).sort(), ['consented', 'execution', 'project', 'session'])
  assert.deepEqual(selectContext(records, scope, 'timer', 0), [])
  assert.ok(selectContext(records, scope, 'timer', 20).reduce((n, r) => n + r.text.length, 0) <= 20)
  assert.throws(() => selectContext(records, scope, 'timer', Infinity))
})

test('Chat SSE envelopes retain legacy payloads, monotonic sequence, unique IDs and validated data', () => {
  const session = crypto.randomUUID()
  const write = chatEventWriter(session)
  const parse = frame => JSON.parse(frame.split('\ndata: ')[1].trim())
  const a = parse(write({ type: 'delta', delta: 'Hello' }))
  const b = parse(write({ type: 'done' }))
  assert.equal(a.delta, 'Hello')
  assert.equal(a.sessionId, session)
  assert.equal(a.sequence, 1)
  assert.equal(b.sequence, 2)
  assert.notEqual(a.eventId, b.eventId)
  assert.equal(chatEventSchema.safeParse(a).success, true)
  assert.throws(() => write({ type: 'plan', steps: [] }))
  assert.throws(() => write({ type: 'delta', delta: 'x'.repeat(30001) }))
})

test('Cowork never grants blanket execution and plan mode denies mutations', () => {
  for (const planOnly of [false, true]) {
    const rules = coworkPermissions(planOnly)
    const effective = action => rules.filter(r => r.action === '*' || r.action === action).at(-1)?.effect
    for (const action of ['read', 'glob', 'grep', 'list']) assert.equal(effective(action), 'allow')
    for (const action of ['shell', 'edit', 'unknown', 'subagent', 'webfetch']) assert.equal(effective(action), planOnly ? 'deny' : 'ask')
    assert.equal(rules.some(r => r.action === '*' && r.effect === 'allow'), false)
  }
})

const { validateDevSource } = await import('../../lib/arlen/dev-source.ts')
test('Dev rejects missing source, unknown components, unsupported actions and preserves unrelated source files', () => {
  const project = { name: 'Counter', description: 'A counter', files: {
    'src/App.tsx': 'export default function App() { return null }',
    'src/app.ui.json': JSON.stringify({ schema: 'arlen-app/v1', title: 'Counter', nodes: [{ type: 'Button', label: 'Add', action: { type: 'increment', key: 'count' } }] }),
  } }
  const valid = validateDevSource(project, { 'src/helpers.ts': 'export const retained = true' })
  assert.equal(valid.files['src/helpers.ts'], 'export const retained = true')
  assert.throws(() => validateDevSource({ ...project, files: undefined }))
  for (const node of [{ type: 'InventedComponent' }, { type: 'Button', action: { type: 'shell', command: 'rm' } }, { type: 'Button', variant: 'invented' }]) {
    assert.throws(() => validateDevSource({ ...project, files: { ...project.files,
      'src/app.ui.json': JSON.stringify({ schema: 'arlen-app/v1', title: 'Invalid', nodes: [node] }),
    } }))
  }
})
