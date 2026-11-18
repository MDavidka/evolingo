export const VISUAL_PROTOCOL_VERSION = '1.0'

export type VisualNamespace =
  | 'icon'
  | 'chart'
  | 'map'
  | 'diagram'
  | 'metric'
  | 'data'
  | 'layout'
  | 'text'
  | 'file'
  | 'progress'
  | 'image'
  | 'media'
  | 'timeline'
  | 'steps'
  | 'process'
  | 'result'
  | 'table'
  | 'utility'
  | 'visual'

export interface VisualRegistryEntry {
  id: string
  namespace: VisualNamespace
  version: '1.0'
  supportedDataTypes: string[]
  requiredProps: string[]
  optionalProps: string[]
  interactions: string[]
  accessibilitySummary: string
  fallbackBehavior: string
  minRendererVersion: '1.0'
  status: 'implemented'
}

export const ICON_COMPONENTS = [
  'icon.single',
  'icon.labeled',
  'icon.grid',
  'icon.row',
  'icon.stack',
  'icon.comparison',
  'icon.badge',
  'icon.status',
  'icon.animated',
  'icon.category',
  'icon.legend',
  'icon.feature',
  'icon.process',
  'icon.layered',
] as const

export const CHART_COMPONENTS = [
  'chart.line',
  'chart.smoothLine',
  'chart.multiLine',
  'chart.area',
  'chart.gradientArea',
  'chart.stackedArea',
  'chart.streamgraph',
  'chart.bar',
  'chart.horizontalBar',
  'chart.groupedBar',
  'chart.stackedBar',
  'chart.divergingBar',
  'chart.lollipop',
  'chart.pie',
  'chart.donut',
  'chart.multiRingDonut',
  'chart.scatter',
  'chart.bubble',
  'chart.histogram',
  'chart.boxPlot',
  'chart.violin',
  'chart.radar',
  'chart.polar',
  'chart.waterfall',
  'chart.funnel',
  'chart.sankey',
  'chart.treemap',
  'chart.sunburst',
  'chart.candlestick',
  'chart.ohlc',
  'chart.range',
  'chart.errorBar',
  'chart.bullet',
  'chart.stepLine',
  'chart.sparkline',
  'chart.calendarHeatmap',
] as const

export const MAP_COMPONENTS = [
  'map.preview',
  'map.standard',
  'map.satellite',
  'map.hybrid',
  'map.location',
  'map.multiplePins',
  'map.pins',
  'map.route',
  'map.multiRoute',
  'map.polyline',
  'map.polygon',
  'map.circleOverlay',
  'map.cluster',
  'map.heatmap',
  'map.region',
  'map.regionHighlight',
  'map.geographicBounds',
  'map.distance',
  'map.coordinate',
  'map.terrain',
  'map.elevation',
  'map.annotation',
  'map.radius',
  'map.geographicComparison',
] as const

export const DIAGRAM_COMPONENTS = [
  'diagram.flowchart',
  'diagram.nodeGraph',
  'diagram.network',
  'diagram.tree',
  'diagram.hierarchy',
  'diagram.architecture',
  'diagram.dependency',
  'diagram.mindMap',
  'diagram.sequence',
  'diagram.stateMachine',
  'diagram.timeline',
  'diagram.circularProcess',
  'diagram.pipeline',
  'diagram.layeredStack',
  'diagram.venn',
  'diagram.matrix',
  'diagram.sankeyFlow',
  'diagram.relationship',
  'diagram.systemOverview',
  'diagram.entityRelationship',
] as const

export const METRIC_COMPONENTS = [
  'metric.value',
  'metric.kpi',
  'metric.change',
  'metric.trend',
  'metric.sparkline',
  'metric.progressBar',
  'metric.progressRing',
  'metric.circularGauge',
  'metric.linearGauge',
  'metric.segmentedGauge',
  'metric.battery',
  'metric.signal',
  'metric.temperature',
  'metric.speedometer',
  'metric.capacity',
  'metric.threshold',
  'metric.status',
  'metric.comparison',
  'metric.countdown',
  'metric.rangeIndicator',
] as const

export const DATA_COMPONENTS = [
  'data.heatmap',
  'data.matrix',
  'data.calendar',
  'data.distribution',
  'data.density',
  'data.treemap',
  'data.correlation',
  'data.cluster',
  'data.radial',
  'data.spectrum',
  'data.comparisonBars',
  'data.rangeBands',
  'data.frequency',
  'data.colorScale',
  'data.table',
  'data.compactTable',
  'data.timeline',
  'data.eventSeries',
  'data.jsonTree',
] as const

export const LAYOUT_COMPONENTS = [
  'layout.vertical',
  'layout.horizontal',
  'layout.grid',
  'layout.inline',
  'layout.overlay',
  'layout.scroll',
  'layout.expandable',
  'layout.section',
  'layout.legend',
  'layout.chartWithMetric',
  'layout.mapWithDetails',
  'layout.iconWithText',
] as const

export const TEXT_COMPONENTS = [
  'text.paragraph',
  'text.heading',
  'text.caption',
  'text.quote',
  'text.code',
  'text.math',
  'text.highlight',
  'text.copyable',
  'text.keyValue',
  'text.largeNumber',
  'text.collapsible',
] as const

export const FILE_COMPONENTS = [
  'file.download',
  'file.preview',
  'file.collection',
  'file.pdf',
  'file.docx',
  'file.xlsx',
  'file.pptx',
  'file.csv',
  'file.zip',
  'file.code',
  'file.image',
  'file.audio',
  'file.video',
  'file.export',
  'file.share',
  'file.progress',
] as const

export const PROGRESS_COMPONENTS = [
  'progress.ring',
  'progress.bar',
  'progress.segmented',
  'progress.steps',
  'progress.milestones',
  'progress.gauge',
  'progress.countdown',
  'progress.upload',
  'progress.download',
] as const

export const MEDIA_COMPONENTS = [
  'image.single',
  'image.carousel',
  'image.gallery',
  'image.bento',
  'image.zoomable',
  'image.beforeAfter',
  'image.annotated',
  'media.audio',
  'media.waveform',
  'media.video',
  'media.transcript',
] as const

export const TIMELINE_COMPONENTS = [
  'timeline.numbered',
  'timeline.vertical',
  'timeline.horizontal',
  'timeline.milestones',
  'timeline.events',
  'timeline.project',
  'steps.compact',
  'steps.expandable',
  'process.flow',
  'process.pipeline',
] as const

export const RESULT_COMPONENTS = [
  'result.phone',
  'result.address',
  'result.contact',
  'result.website',
  'result.largeValue',
  'result.copyable',
  'result.summary',
  'result.source',
  'result.product',
  'result.event',
  'result.weather',
  'result.comparison',
] as const

export const TABLE_COMPONENTS = [
  'table.simple',
  'table.compact',
  'table.sortable',
  'table.filterable',
  'table.comparison',
  'table.expandable',
  'table.heatmap',
  'table.dataBars',
  'table.exportable',
] as const

export const UTILITY_COMPONENTS = [
  'utility.unitConverter',
  'utility.currencyConverter',
  'utility.calculator',
  'utility.scientificCalculator',
  'utility.percentage',
  'utility.dateCalculator',
  'utility.timezoneConverter',
  'utility.loanCalculator',
  'utility.colorPicker',
  'utility.qrGenerator',
  'utility.wordCounter',
  'utility.textDiff',
  'utility.jsonFormatter',
  'utility.regexTester',
  'utility.timer',
  'utility.stopwatch',
] as const

export const CUSTOM_VISUAL_COMPONENTS = [
  'visual.vector',
  'visual.diagram',
  'visual.flowchart',
  'visual.network',
  'visual.tree',
  'visual.hierarchy',
  'visual.geometry',
  'visual.equation',
  'visual.functionPlot',
  'visual.scientific',
  'visual.instrument',
  'visual.custom',
] as const

export type VisualComponentId =
  | (typeof ICON_COMPONENTS)[number]
  | (typeof CHART_COMPONENTS)[number]
  | (typeof MAP_COMPONENTS)[number]
  | (typeof DIAGRAM_COMPONENTS)[number]
  | (typeof METRIC_COMPONENTS)[number]
  | (typeof DATA_COMPONENTS)[number]
  | (typeof LAYOUT_COMPONENTS)[number]
  | (typeof TEXT_COMPONENTS)[number]
  | (typeof FILE_COMPONENTS)[number]
  | (typeof PROGRESS_COMPONENTS)[number]
  | (typeof MEDIA_COMPONENTS)[number]
  | (typeof TIMELINE_COMPONENTS)[number]
  | (typeof RESULT_COMPONENTS)[number]
  | (typeof TABLE_COMPONENTS)[number]
  | (typeof UTILITY_COMPONENTS)[number]
  | (typeof CUSTOM_VISUAL_COMPONENTS)[number]

export const CORE_140_VISUAL_COMPONENT_IDS: readonly VisualComponentId[] = [
  ...ICON_COMPONENTS,
  ...CHART_COMPONENTS,
  ...MAP_COMPONENTS.filter(
    id => !['map.preview', 'map.pins', 'map.region', 'map.elevation'].includes(id),
  ),
  ...DIAGRAM_COMPONENTS,
  ...METRIC_COMPONENTS,
  ...DATA_COMPONENTS.filter(id => id !== 'data.jsonTree'),
  ...LAYOUT_COMPONENTS,
]

export const ALL_VISUAL_COMPONENT_IDS: readonly VisualComponentId[] = [
  ...ICON_COMPONENTS,
  ...CHART_COMPONENTS,
  ...MAP_COMPONENTS,
  ...DIAGRAM_COMPONENTS,
  ...METRIC_COMPONENTS,
  ...DATA_COMPONENTS,
  ...LAYOUT_COMPONENTS,
  ...TEXT_COMPONENTS,
  ...FILE_COMPONENTS,
  ...PROGRESS_COMPONENTS,
  ...MEDIA_COMPONENTS,
  ...TIMELINE_COMPONENTS,
  ...RESULT_COMPONENTS,
  ...TABLE_COMPONENTS,
  ...UTILITY_COMPONENTS,
  ...CUSTOM_VISUAL_COMPONENTS,
]

export const VISUAL_COMPONENT_REGISTRY: Record<VisualComponentId, VisualRegistryEntry> = Object.fromEntries(
  ALL_VISUAL_COMPONENT_IDS.map(id => {
    const namespace = id.split('.')[0] as VisualNamespace
    return [
      id,
      {
        id,
        namespace,
        version: '1.0',
        supportedDataTypes: ['points', 'pins', 'nodes', 'items', 'files', 'steps', 'images', 'value', 'rows', 'matrix'],
        requiredProps: ['version', 'type', 'id', 'component'],
        optionalProps: ['title', 'subtitle', 'unit', 'options', 'children'],
        interactions: ['tap-inspect', 'copy', 'download', 'share', 'fullscreen'],
        accessibilitySummary: `Accessible ${namespace} component (${id})`,
        fallbackBehavior: 'accessible-text-summary',
        minRendererVersion: '1.0',
        status: 'implemented',
      },
    ]
  }),
) as Record<VisualComponentId, VisualRegistryEntry>

export interface VisualPoint {
  x: string
  y: number
  y2?: number
  size?: number
  series?: string
  open?: number
  high?: number
  low?: number
  close?: number
}

export interface VisualMapPin {
  id?: string
  title: string
  subtitle?: string
  lat: number
  lng: number
}

export interface VisualDiagramNode {
  id: string
  label: string
  subtitle?: string
  icon?: string
  group?: string
}

export interface VisualDiagramEdge {
  from: string
  to: string
  label?: string
}

export interface VisualIconItem {
  name: string
  label: string
  subtitle?: string
  badge?: string
  status?: 'ok' | 'warning' | 'error' | 'neutral' | string
}

export interface VisualFileItem {
  name: string
  subtitle?: string
  kind?: string
  url?: string
  content?: string
}

export interface VisualTimelineStep {
  number?: number
  title: string
  subtitle?: string
  status?: string
}

export interface VisualImageItem {
  url: string
  title?: string
  subtitle?: string
}

export interface VisualDataPayload {
  points?: VisualPoint[]
  pins?: VisualMapPin[]
  route?: Array<{lat: number; lng: number}>
  nodes?: VisualDiagramNode[]
  edges?: VisualDiagramEdge[]
  items?: VisualIconItem[]
  files?: VisualFileItem[]
  steps?: VisualTimelineStep[]
  images?: VisualImageItem[]
  segments?: number[]
  value?: number | string
  label?: string
  buttonTitle?: string
  previousValue?: number
  min?: number
  max?: number
  target?: number
  unit?: string
  fromUnit?: string
  toUnit?: string
  category?: string
  headers?: string[]
  rows?: Array<Array<string | number>>
  matrix?: number[][]
  xLabels?: string[]
  yLabels?: string[]
}

export interface VisualOptions {
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  animated?: boolean
  fullscreen?: boolean
  highlightedSeries?: string
  mapStyle?: 'standard' | 'satellite' | 'hybrid'
  radiusMeters?: number
  icon?: string
}

export interface VisualSpec {
  version: '1.0'
  type: 'visual'
  id: string
  component: VisualComponentId
  title?: string
  subtitle?: string
  unit?: string
  data?: VisualDataPayload
  options?: VisualOptions
  children?: VisualSpec[]
}

export type ChatContentBlock =
  | {type: 'markdown'; id: string; content: string}
  | {type: 'visual'; id: string; spec: VisualSpec}

const MAX_POINTS = 500
const MAX_NODES = 80
const MAX_DEPTH = 4

export function isRegisteredVisualComponent(id: string): id is VisualComponentId {
  return Object.prototype.hasOwnProperty.call(VISUAL_COMPONENT_REGISTRY, id)
}

export function validateVisualSpec(raw: unknown, depth = 0): {ok: true; spec: VisualSpec} | {ok: false; error: string} {
  if (depth > MAX_DEPTH) return {ok: false, error: 'Maximum composition depth exceeded'}
  if (!raw || typeof raw !== 'object') return {ok: false, error: 'Visual spec must be an object'}
  const obj = raw as Record<string, unknown>
  if (obj.version !== undefined && obj.version !== '1.0') return {ok: false, error: 'Unsupported version'}
  if (obj.type !== undefined && obj.type !== 'visual') return {ok: false, error: 'Invalid block type'}
  if (obj.id !== undefined && (typeof obj.id !== 'string' || !/^[a-zA-Z0-9_.-]{1,64}$/.test(obj.id))) {
    return {ok: false, error: 'Invalid visual id'}
  }
  if (typeof obj.component !== 'string' || !isRegisteredVisualComponent(obj.component)) {
    return {ok: false, error: `Unregistered visual component: ${String(obj.component)}`}
  }

  const ns = VISUAL_COMPONENT_REGISTRY[obj.component].namespace
  const data = (obj.data && typeof obj.data === 'object' ? obj.data : {}) as Record<string, unknown>

  if (Array.isArray(data.points)) {
    if (data.points.length === 0 || data.points.length > MAX_POINTS) {
      return {ok: false, error: 'Invalid points array length'}
    }
    for (const pt of data.points) {
      if (!pt || typeof pt !== 'object') return {ok: false, error: 'Invalid point object'}
      const p = pt as Record<string, unknown>
      if (typeof p.x !== 'string' || typeof p.y !== 'number' || !Number.isFinite(p.y)) {
        return {ok: false, error: 'Point requires string x and finite number y'}
      }
    }
  } else if (Array.isArray(obj.data)) {
    if (obj.data.length === 0 || obj.data.length > MAX_POINTS) {
      return {ok: false, error: 'Invalid data array length'}
    }
  } else if (ns === 'chart') {
    return {ok: false, error: 'Chart component requires non-empty data.points or data array'}
  }

  if (Array.isArray(data.pins)) {
    if (data.pins.length === 0 || data.pins.length > 100) return {ok: false, error: 'Invalid pins count'}
    for (const pin of data.pins) {
      if (!pin || typeof pin !== 'object') return {ok: false, error: 'Invalid pin'}
      const p = pin as Record<string, unknown>
      if (typeof p.title !== 'string' || typeof p.lat !== 'number' || typeof p.lng !== 'number') {
        return {ok: false, error: 'Pin requires title, lat, lng'}
      }
      if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
        return {ok: false, error: 'Pin coordinates out of bounds'}
      }
    }
  } else if (ns === 'map') {
    return {ok: false, error: 'Map component requires verified data.pins'}
  }

  if (Array.isArray(data.nodes)) {
    if (data.nodes.length === 0 || data.nodes.length > MAX_NODES) return {ok: false, error: 'Invalid diagram nodes count'}
  } else if (ns === 'diagram') {
    return {ok: false, error: 'Diagram component requires data.nodes'}
  }

  let validatedChildren: VisualSpec[] | undefined
  if (Array.isArray(obj.children)) {
    if (obj.children.length > 12) return {ok: false, error: 'Too many layout children'}
    validatedChildren = []
    for (const child of obj.children) {
      const res = validateVisualSpec(child, depth + 1)
      if (!res.ok) return res
      validatedChildren.push(res.spec)
    }
  }

  return {
    ok: true,
    spec: {
      version: '1.0',
      type: 'visual',
      id: typeof obj.id === 'string' ? obj.id : 'visual_auto',
      component: obj.component,
      title: typeof obj.title === 'string' ? obj.title.slice(0, 140) : undefined,
      subtitle: typeof obj.subtitle === 'string' ? obj.subtitle.slice(0, 200) : undefined,
      unit: typeof obj.unit === 'string' ? obj.unit.slice(0, 24) : undefined,
      data: data as VisualDataPayload,
      options: (obj.options && typeof obj.options === 'object' ? obj.options : undefined) as VisualOptions | undefined,
      children: validatedChildren,
    },
  }
}

export function detectVisualIntent(prompt: string): VisualComponentId | null {
  const q = prompt.toLowerCase()
  if (/\b(convert\s+\d|unit converter|km to miles|kg to lb|celsius to fahrenheit)\b/.test(q)) return 'utility.unitConverter'
  if (/\b(loan payment|mortgage calculator)\b/.test(q)) return 'utility.loanCalculator'
  if (/\b(excel report|xlsx|export pdf|download.*file)\b/.test(q)) return 'file.collection'
  if (/\b(phone number|telefonszám|call|copyable)\b/.test(q)) return 'result.phone'
  if (/\b(carousel|image gallery|show examples)\b/.test(q)) return 'image.carousel'
  if (/\b(numbered timeline|process steps|explain process)\b/.test(q)) return 'timeline.numbered'
  if (/\b(line chart|show the growth|trend over time)\b/.test(q)) return 'chart.line'
  if (/\b(area chart|convert.*area|make.*area)\b/.test(q)) return 'chart.area'
  if (/\b(donut|percentage distribution)\b/.test(q)) return 'chart.donut'
  if (/\b(pie chart)\b/.test(q)) return 'chart.pie'
  if (/\b(compare.*values|bar chart)\b/.test(q)) return 'chart.bar'
  if (/\b(grouped bar)\b/.test(q)) return 'chart.groupedBar'
  if (/\b(scatter|correlation)\b/.test(q)) return 'chart.scatter'
  if (/\b(candlestick|ohlc)\b/.test(q)) return 'chart.candlestick'
  if (/\b(heatmap)\b/.test(q)) return 'data.heatmap'
  if (/\b(route between|draw a route)\b/.test(q)) return 'map.route'
  if (/\b(on a map|where is.*located|show these locations)\b/.test(q)) return 'map.multiplePins'
  if (/\b(icons for|show these icons|symbol grid|icons?\b|symbols?\b)\b/.test(q)) return 'icon.grid'
  if (/\b(architecture.*diagram|system overview)\b/.test(q)) return 'diagram.architecture'
  if (/\b(relationships between|network graph|connected)\b/.test(q)) return 'diagram.network'
  if (/\b(flowchart)\b/.test(q)) return 'diagram.flowchart'
  if (/\b(timeline of|historical sequence)\b/.test(q)) return 'diagram.timeline'
  if (/\b(circular progress|progress ring|progress\b)\b/.test(q)) return 'metric.progressRing'
  if (/\b(gauge)\b/.test(q)) return 'metric.circularGauge'
  if (/\b(kpi|metrics|statistics|stats)\b/.test(q)) return 'metric.kpi'
  if (/\b(map|location|landmarks?|city|london|paris|budapest|tokyo|new york|rome|berlin)\b/.test(q)) return 'map.preview'
  if (/\b(steps|how to|guide|roadmap|plan|workflow)\b/.test(q)) return 'timeline.numbered'
  if (/\b(compare|versus|\bvs\b|ranking|top \d+)\b/.test(q)) return 'chart.bar'
  return null
}

export function applyConversationalVisualUpdate(previous: VisualSpec, followUpPrompt: string): VisualSpec {
  const q = followUpPrompt.toLowerCase()
  const updated: VisualSpec = JSON.parse(JSON.stringify(previous))
  updated.options = {...(updated.options || {})}

  const nextComponent = detectVisualIntent(followUpPrompt)
  if (nextComponent && VISUAL_COMPONENT_REGISTRY[nextComponent].namespace === VISUAL_COMPONENT_REGISTRY[previous.component].namespace) {
    updated.component = nextComponent
  } else if (q.includes('another visualization') || q.includes('different chart')) {
    updated.component = previous.component === 'chart.bar' ? 'chart.line' : 'chart.bar'
  }

  if (q.includes('fullscreen')) {
    updated.options.fullscreen = true
  }

  const highlightMatch = followUpPrompt.match(/highlight\s+(?:the\s+)?([a-zA-Z0-9_-]+)(?:\s+series|\s+users)?/i)
  if (highlightMatch) {
    updated.options.highlightedSeries = highlightMatch[1]
  }

  return updated
}

export function splitMessageIntoBlocks(content: string, isStreaming = false): ChatContentBlock[] {
  const blocks: ChatContentBlock[] = []
  const regex = /```(?:arlen-visual|visual)\s*\n([\s\S]*?)(?:```|$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let blockIdx = 0

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index).trim()
    if (before) {
      blocks.push({type: 'markdown', id: `md_${blockIdx++}`, content: before})
    }
    const rawBlock = match[0]
    const isClosed = rawBlock.endsWith('```')
    const jsonBody = match[1].trim()
    if (isClosed) {
      try {
        const parsed = JSON.parse(jsonBody)
        const validated = validateVisualSpec(parsed)
        if (validated.ok) {
          blocks.push({type: 'visual', id: validated.spec.id, spec: validated.spec})
        } else {
          blocks.push({
            type: 'markdown',
            id: `fallback_${blockIdx++}`,
            content: `*(Visual summary: ${String(parsed?.title || parsed?.component || 'data')})*`,
          })
        }
      } catch {
        blocks.push({
          type: 'markdown',
          id: `fallback_${blockIdx++}`,
          content: '*(Visualization data could not be decoded.)*',
        })
      }
    } else if (!isStreaming) {
      // Closed stream with unclosed fence: omit raw incomplete JSON
    }
    lastIndex = match.index + rawBlock.length
  }

  const tail = content.slice(lastIndex).trim()
  if (tail) {
    blocks.push({type: 'markdown', id: `md_${blockIdx++}`, content: tail})
  }
  return blocks
}

export function visualIntelligencePromptInstruction(): string {
  return [
    'VISUAL INTELLIGENCE MODE IS ACTIVE BY DEFAULT: Regularly and proactively enrich your answers with one or more fenced ```arlen-visual JSON blocks alongside concise Markdown whenever the topic involves icons/symbols, places/cities/locations, steps/timelines/how-to guides, comparisons/rankings, numbers/metrics/progress, files/templates, contacts/phone numbers, conversions/calculations, or visual concepts.',
    'Infer user intent smoothly through typos or shorthand (for example, treat "optimial icons for London" as "optimal icons for London" and immediately render an icon.grid and/or map.preview without asking pedantic clarification questions).',
    'Schema: {"version":"1.0","type":"visual","id":"visual_001","component":"<id>","title":"...","subtitle":"...","unit":"...","data":{...},"options":{...}}.',
    'Key components matching Arlen iOS UI:',
    '- Icon grid: component="icon.grid", title="Optimal Icons", data={"items":[{"name":"building.columns","label":"Landmarks","subtitle":"Big Ben & Tower Bridge"},{"name":"tram.fill","label":"Transport","subtitle":"Underground & double-decker"},{"name":"crown","label":"Heritage","subtitle":"Royal palaces"},{"name":"theatermasks","label":"Culture","subtitle":"West End & museums"}]}.',
    '- Progress ring (REF-01): component="progress.ring", data={"value":75,"max":100}, subtitle="Complete".',
    '- File download rows (REF-01): component="file.collection" or "file.download", data={"files":[{"name":"Analytics Report.xlsx","subtitle":"Excel spreadsheet · Example","content":"Metric,Value\\nGrowth,75%"}]}.',
    '- Icon + heading (REF-02): component="text.heading", title="Heading text", options={"icon":"evo.builder.orb"}.',
    '- Image carousel (REF-02): component="image.carousel", data={"images":[{"url":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800","title":"London"}]}.',
    '- Numbered timeline (REF-02): component="timeline.numbered", data={"steps":[{"number":1,"title":"Planning","subtitle":"Requirements and architecture","status":"Complete"},{"number":2,"title":"Development","subtitle":"Implementing core components","status":"In progress"}]}.',
    '- Copyable phone/value with black pill button (REF-03): component="result.phone" or "result.copyable", subtitle="Cargus Románia – ügyfélszolgálat", data={"value":"021 9330","buttonTitle":"Szám másolása"}.',
    '- Segmented bar (REF-03): component="progress.segmented", data={"segments":[42,26,32]}.',
    '- Standalone large number (REF-03): component="text.largeNumber", data={"value":"10,5486"}, subtitle="Caption".',
    '- Inline satellite/standard map preview (REF-04): component="map.preview" or "map.satellite", data={"pins":[{"title":"Location","lat":51.5074,"lng":-0.1278}]}, options={"mapStyle":"satellite"}.',
    '- Interactive utilities: component="utility.unitConverter" | "utility.calculator" | "utility.loanCalculator" | "utility.percentage", data={"value":5,"fromUnit":"km","toUnit":"mi","category":"length"}.',
    '- Charts: chart.(line|area|bar|horizontalBar|donut|pie|scatter), data={"points":[{"x":"Jan","y":120}]}.',
  ].join(' ')
}
