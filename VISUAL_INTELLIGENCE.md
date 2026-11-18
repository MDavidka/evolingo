# Arlen Visual Intelligence Engine (`VISUAL_INTELLIGENCE.md`)

## 1. Architecture Overview
Arlen Visual Intelligence is a 5-layer native generative UI system integrated directly into **Arlen Chat**:
1. **Layer 1 — Visual Intent Detection (`detectVisualIntent`):** Analyzes user prompts and follow-up edits in `lib/arlen/visual-intelligence.ts`.
2. **Layer 2 — Visual Component Registry (`VISUAL_COMPONENT_REGISTRY` & `ArlenVisualRegistry`):** Typed registry of **140** component and composition identifiers across 7 namespaces (`icon.*`, `chart.*`, `map.*`, `diagram.*`, `metric.*`, `data.*`, `layout.*`).
3. **Layer 3 — Structured Response Protocol (`arlen-visual` v1.0):** Versioned JSON specification embedded in fenced ` ```arlen-visual ` blocks alongside conversational Markdown.
4. **Layer 4 — Native Rendering Engine (`ArlenVisualIntelligence.swift`):** Pure SwiftUI + `Swift Charts` + `MapKit` + SF Symbols renderer inside `ArlenMarkdownRenderer`.
5. **Layer 5 — Interaction Controller:** Supports point/pin/node selection, series highlighting, copy summary, and fullscreen sheet expansion.

---

## 2. Specification Schema (`v1.0`)
```json
{
  "version": "1.0",
  "type": "visual",
  "id": "visual_001",
  "component": "chart.area",
  "title": "Revenue growth",
  "subtitle": "Q1–Q3",
  "unit": "$",
  "data": {
    "points": [
      {"x": "Jan", "y": 120, "series": "Mobile"},
      {"x": "Feb", "y": 180, "series": "Mobile"},
      {"x": "Mar", "y": 240, "series": "Mobile"}
    ]
  },
  "options": {
    "showGrid": true,
    "showTooltip": true,
    "animated": true,
    "highlightedSeries": "Mobile"
  }
}
```

---

## 3. Component Registry Coverage Report (140 / 140 Implemented)

| Namespace | Count | Registered Component Identifiers | Status |
| :--- | :--- | :--- | :--- |
| `icon.*` | 14 | `icon.single`, `icon.labeled`, `icon.grid`, `icon.row`, `icon.stack`, `icon.comparison`, `icon.badge`, `icon.status`, `icon.animated`, `icon.category`, `icon.legend`, `icon.feature`, `icon.process`, `icon.layered` | Implemented & Verified |
| `chart.*` | 36 | `chart.line`, `chart.smoothLine`, `chart.multiLine`, `chart.area`, `chart.gradientArea`, `chart.stackedArea`, `chart.streamgraph`, `chart.bar`, `chart.horizontalBar`, `chart.groupedBar`, `chart.stackedBar`, `chart.divergingBar`, `chart.lollipop`, `chart.pie`, `chart.donut`, `chart.multiRingDonut`, `chart.scatter`, `chart.bubble`, `chart.histogram`, `chart.boxPlot`, `chart.violin`, `chart.radar`, `chart.polar`, `chart.waterfall`, `chart.funnel`, `chart.sankey`, `chart.treemap`, `chart.sunburst`, `chart.candlestick`, `chart.ohlc`, `chart.range`, `chart.errorBar`, `chart.bullet`, `chart.stepLine`, `chart.sparkline`, `chart.calendarHeatmap` | Implemented & Verified |
| `map.*` | 20 | `map.standard`, `map.satellite`, `map.hybrid`, `map.location`, `map.multiplePins`, `map.route`, `map.multiRoute`, `map.polyline`, `map.polygon`, `map.circleOverlay`, `map.cluster`, `map.heatmap`, `map.regionHighlight`, `map.geographicBounds`, `map.distance`, `map.coordinate`, `map.terrain`, `map.annotation`, `map.radius`, `map.geographicComparison` | Implemented & Verified |
| `diagram.*` | 20 | `diagram.flowchart`, `diagram.nodeGraph`, `diagram.network`, `diagram.tree`, `diagram.hierarchy`, `diagram.architecture`, `diagram.dependency`, `diagram.mindMap`, `diagram.sequence`, `diagram.stateMachine`, `diagram.timeline`, `diagram.circularProcess`, `diagram.pipeline`, `diagram.layeredStack`, `diagram.venn`, `diagram.matrix`, `diagram.sankeyFlow`, `diagram.relationship`, `diagram.systemOverview`, `diagram.entityRelationship` | Implemented & Verified |
| `metric.*` | 20 | `metric.value`, `metric.kpi`, `metric.change`, `metric.trend`, `metric.sparkline`, `metric.progressBar`, `metric.progressRing`, `metric.circularGauge`, `metric.linearGauge`, `metric.segmentedGauge`, `metric.battery`, `metric.signal`, `metric.temperature`, `metric.speedometer`, `metric.capacity`, `metric.threshold`, `metric.status`, `metric.comparison`, `metric.countdown`, `metric.rangeIndicator` | Implemented & Verified |
| `data.*` | 18 | `data.heatmap`, `data.matrix`, `data.calendar`, `data.distribution`, `data.density`, `data.treemap`, `data.correlation`, `data.cluster`, `data.radial`, `data.spectrum`, `data.comparisonBars`, `data.rangeBands`, `data.frequency`, `data.colorScale`, `data.table`, `data.compactTable`, `data.timeline`, `data.eventSeries` | Implemented & Verified |
| `layout.*` | 12 | `layout.vertical`, `layout.horizontal`, `layout.grid`, `layout.inline`, `layout.overlay`, `layout.scroll`, `layout.expandable`, `layout.section`, `layout.legend`, `layout.chartWithMetric`, `layout.mapWithDetails`, `layout.iconWithText` | Implemented & Verified |

---

## 4. Extension Guidelines
1. Add the new identifier to the appropriate namespace array in `lib/arlen/visual-intelligence.ts`.
2. Add validation rules in `validateVisualSpec` and `ArlenVisualRegistry.decodeAndValidate`.
3. Map the component to its shared native primitive in `ArlenVisualIntelligence.swift`.
4. Add unit/acceptance coverage in `lib/arlen/visual-intelligence.test.mjs`.
