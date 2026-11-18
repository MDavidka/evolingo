import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldTriggerWebSearch,
  normalizeSearchQuery,
  planSearchQueries,
  executeWebSearchTool,
  formatWebSearchContext,
  isSafePublicUrl,
  clearWebSearchCache,
} from './web-search.ts'
import { chatEventWriter } from './events.ts'

test('Test A & B — Explicit and automatic web search intent detection', () => {
  // Test A: Explicit search
  assert.equal(
    shouldTriggerWebSearch('Search the web for the latest Apple interface design guidelines.'),
    true,
  )
  assert.equal(
    normalizeSearchQuery('Search the web for the latest Apple interface design guidelines.'),
    'the latest Apple interface design guidelines',
  )

  // Test B: Automatic search for recent/current events and substantive topics
  assert.equal(shouldTriggerWebSearch('What happened in technology news today in 2026?'), true)
  assert.equal(shouldTriggerWebSearch('Current weather forecast in Budapest'), true)
  assert.equal(shouldTriggerWebSearch('SwiftUI navigation best practices'), true)

  // Non-search conversational greeting/acknowledgement prompts
  assert.equal(shouldTriggerWebSearch('Hello'), false)
  assert.equal(shouldTriggerWebSearch('Köszönöm'), false)
  assert.equal(shouldTriggerWebSearch('Hello', true), true)
})

test('Test C — Multi-query decomposition and deduplication', async () => {
  clearWebSearchCache()
  const queries = planSearchQueries('Compare SwiftUI vs React Native layout performance')
  assert.equal(queries.length, 2)

  const stepEvents = []
  const output = await executeWebSearchTool(
    { query: 'Compare SwiftUI vs React Native layout performance', count: 5, retrievePages: false },
    {
      callbacks: {
        onStepStarted: (stepId, status, label) => stepEvents.push({ type: 'started', stepId, status, label }),
        onStepCompleted: (stepId, label) => stepEvents.push({ type: 'completed', stepId, label }),
      },
      customFetcher: async q => [
        {
          id: '1',
          title: `Result for ${q}`,
          url: 'https://developer.apple.com/tutorials/swiftui',
          domain: 'developer.apple.com',
          faviconUrl: 'https://www.google.com/s2/favicons?domain=developer.apple.com&sz=64',
          snippet: 'Official SwiftUI documentation and performance guidance.',
          publishedAt: '2026-10-01',
          retrievedAt: new Date().toISOString(),
          source: 'developer.apple.com',
        },
        {
          id: '2',
          title: `Secondary for ${q}`,
          url: `https://reactnative.dev/docs/${encodeURIComponent(q)}`,
          domain: 'reactnative.dev',
          faviconUrl: 'https://www.google.com/s2/favicons?domain=reactnative.dev&sz=64',
          snippet: 'React Native architecture and layout engine.',
          retrievedAt: new Date().toISOString(),
          source: 'reactnative.dev',
        },
      ],
    },
  )

  assert.equal(output.status, 'completed')
  assert.equal(output.queries.length, 2)
  // Duplicate developer.apple.com URL across the two queries must be deduplicated
  assert.equal(output.results.length, 3)
  assert.ok(stepEvents.some(e => e.status === 'searching'))
  assert.ok(stepEvents.some(e => e.status === 'reviewing'))
  const formatted = formatWebSearchContext(output.results, output.query)
  assert.ok(formatted.includes('developer.apple.com'))
})

test('Test D — Failure recovery without fabricating results', async () => {
  clearWebSearchCache()
  const failed = await executeWebSearchTool(
    { query: 'Simulate provider failure', retrievePages: false },
    {
      customFetcher: async () => {
        throw new Error('Upstream provider HTTP 503 timeout')
      },
    },
  )
  assert.equal(failed.status, 'failed')
  assert.equal(failed.results.length, 0)
  assert.ok(failed.diagnostics.error?.includes('503'))
})

test('Test E — Structured streaming event contract and URL safety guard', () => {
  assert.equal(isSafePublicUrl('https://developer.apple.com/design/'), true)
  assert.equal(isSafePublicUrl('http://127.0.0.1:28500/api/chat'), false)
  assert.equal(isSafePublicUrl('http://localhost/admin'), false)
  assert.equal(isSafePublicUrl('http://192.168.1.1/status'), false)

  const write = chatEventWriter(crypto.randomUUID())
  const startedFrame = write({
    type: 'tool.started',
    executionId: 'search_01',
    tool: 'web_search',
    status: 'searching',
    title: 'Searching the web',
    query: 'iOS interface design guidelines',
    queries: ['iOS interface design guidelines'],
  })
  assert.ok(startedFrame.includes('"type":"tool.started"'))

  const stepFrame = write({
    type: 'tool.step.started',
    executionId: 'search_01',
    tool: 'web_search',
    stepId: 'step_review',
    status: 'reviewing',
    label: 'Reviewing relevant pages',
  })
  assert.ok(stepFrame.includes('"Reviewing relevant pages"'))

  const completedFrame = write({
    type: 'tool.completed',
    executionId: 'search_01',
    tool: 'web_search',
    status: 'completed',
    summary: 'Searched the web · 1 source',
    sourceCount: 1,
    durationMs: 210,
    query: 'iOS interface design guidelines',
    queries: ['iOS interface design guidelines'],
    results: [
      {
        id: 'src_1',
        title: 'Human Interface Guidelines',
        url: 'https://developer.apple.com/design/human-interface-guidelines',
        domain: 'developer.apple.com',
        snippet: 'Apple Human Interface Guidelines for iOS.',
        retrievedAt: new Date().toISOString(),
        source: 'developer.apple.com',
      },
    ],
  })
  assert.ok(completedFrame.includes('"Searched the web · 1 source"'))
})

test('Live external provider search and 1..15 source cap support', async () => {
  clearWebSearchCache()
  const fifteen = await executeWebSearchTool(
    { query: 'iOS 26 features', count: 15, retrievePages: false },
    {
      customFetcher: async () =>
        Array.from({ length: 18 }, (_, idx) => ({
          id: `item_${idx + 1}`,
          title: `Result ${idx + 1}`,
          url: `https://example${idx + 1}.com/article`,
          domain: `example${idx + 1}.com`,
          faviconUrl: `https://www.google.com/s2/favicons?domain=example${idx + 1}.com&sz=64`,
          snippet: `Detailed snippet ${idx + 1} for source validation.`,
          retrievedAt: new Date().toISOString(),
          source: `example${idx + 1}.com`,
        })),
    },
  )
  assert.equal(fifteen.status, 'completed')
  assert.equal(fifteen.results.length, 15)

  clearWebSearchCache()
  const live = await executeWebSearchTool({
    query: 'Search the web for the latest Apple interface design guidelines.',
    count: 15,
    retrievePages: true,
  })
  assert.equal(live.status, 'completed')
  assert.ok(live.results.length >= 1 && live.results.length <= 15)
  for (const item of live.results) {
    assert.ok(item.url.startsWith('http'))
    assert.ok(item.domain.length > 0)
    assert.ok(item.title.length > 0)
    assert.ok(item.faviconUrl && item.faviconUrl.startsWith('https://'))
  }
})
