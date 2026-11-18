import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_VISUAL_COMPONENT_IDS,
  CORE_140_VISUAL_COMPONENT_IDS,
  VISUAL_COMPONENT_REGISTRY,
  validateVisualSpec,
  detectVisualIntent,
  applyConversationalVisualUpdate,
  splitMessageIntoBlocks,
} from './visual-intelligence.ts'

test('registry registers all 140 core identifiers and full extended component set', () => {
  assert.equal(CORE_140_VISUAL_COMPONENT_IDS.length, 140)
  assert.ok(ALL_VISUAL_COMPONENT_IDS.length >= 240)
  for (const id of ALL_VISUAL_COMPONENT_IDS) {
    assert.ok(VISUAL_COMPONENT_REGISTRY[id], `missing ${id}`)
    assert.equal(VISUAL_COMPONENT_REGISTRY[id].status, 'implemented')
  }
})

test('validates charts, maps, diagrams, icons, metrics, and rejects unsafe specs', () => {
  const validChart = validateVisualSpec({
    version: '1.0',
    type: 'visual',
    id: 'visual_001',
    component: 'chart.line',
    title: 'Revenue growth',
    data: {points: [{x: 'Jan', y: 120}, {x: 'Feb', y: 180}]},
  })
  assert.equal(validChart.ok, true)

  const badComponent = validateVisualSpec({
    version: '1.0',
    type: 'visual',
    id: 'v2',
    component: 'chart.nonExistent',
    data: {points: [{x: 'A', y: 1}]},
  })
  assert.equal(badComponent.ok, false)

  const badCoords = validateVisualSpec({
    version: '1.0',
    type: 'visual',
    id: 'v3',
    component: 'map.location',
    data: {pins: [{title: 'Invalid', lat: 140, lng: 19}]},
  })
  assert.equal(badCoords.ok, false)
})

test('supports all 16 acceptance test intents and conversational visual updates', () => {
  assert.equal(detectVisualIntent('Show this data as a line chart.'), 'chart.line')
  assert.equal(detectVisualIntent('Convert that into an area chart.'), 'chart.area')
  assert.equal(detectVisualIntent('Show the percentage distribution.'), 'chart.donut')
  assert.equal(detectVisualIntent('Create a donut visualization.'), 'chart.donut')
  assert.equal(detectVisualIntent('Compare these three values.'), 'chart.bar')
  assert.equal(detectVisualIntent('Display icons for cloud, security, networking, and storage.'), 'icon.grid')
  assert.equal(detectVisualIntent('Show these locations on a map.'), 'map.multiplePins')
  assert.equal(detectVisualIntent('Draw a route between these verified locations.'), 'map.route')
  assert.equal(detectVisualIntent('Visualize the relationships between these services.'), 'diagram.network')
  assert.equal(detectVisualIntent('Show this architecture as a diagram.'), 'diagram.architecture')
  assert.equal(detectVisualIntent('Display a circular progress indicator.'), 'metric.progressRing')
  assert.equal(detectVisualIntent('Create a heatmap from these values.'), 'data.heatmap')
  assert.equal(detectVisualIntent('Show a timeline of these events.'), 'diagram.timeline')

  const baseSpec = {
    version: '1.0',
    type: 'visual',
    id: 'rev_01',
    component: 'chart.bar',
    title: 'Monthly Revenue',
    data: {points: [{x: 'Jan', y: 100, series: 'Mobile'}, {x: 'Feb', y: 140, series: 'Mobile'}]},
  }

  const areaUpdate = applyConversationalVisualUpdate(baseSpec, 'Convert that into an area chart.')
  assert.equal(areaUpdate.component, 'chart.area')
  assert.equal(areaUpdate.id, 'rev_01')
  assert.equal(areaUpdate.data.points.length, 2)

  const fullscreenUpdate = applyConversationalVisualUpdate(areaUpdate, 'Make the chart fullscreen.')
  assert.equal(fullscreenUpdate.options?.fullscreen, true)

  const highlightUpdate = applyConversationalVisualUpdate(areaUpdate, 'Highlight Mobile series in the previous chart.')
  assert.equal(highlightUpdate.options?.highlightedSeries, 'Mobile')

  const altUpdate = applyConversationalVisualUpdate(baseSpec, 'Show the same data using another visualization.')
  assert.equal(altUpdate.component, 'chart.line')
})

test('streams mixed Markdown and visual blocks without leaking incomplete JSON', () => {
  const streamingPartial = 'Here is the trend:\n```arlen-visual\n{"version":"1.0","type":"visual"'
  const blocksWhileStreaming = splitMessageIntoBlocks(streamingPartial, true)
  assert.equal(blocksWhileStreaming.length, 1)
  assert.equal(blocksWhileStreaming[0].type, 'markdown')

  const completed =
    'Here is the trend:\n```arlen-visual\n{"version":"1.0","type":"visual","id":"v1","component":"chart.line","title":"Growth","data":{"points":[{"x":"Q1","y":10},{"x":"Q2","y":20}]}}\n```\nSummary complete.'
  const finalBlocks = splitMessageIntoBlocks(completed, false)
  assert.equal(finalBlocks.length, 3)
  assert.equal(finalBlocks[0].type, 'markdown')
  assert.equal(finalBlocks[1].type, 'visual')
  assert.equal(finalBlocks[2].type, 'markdown')
})
