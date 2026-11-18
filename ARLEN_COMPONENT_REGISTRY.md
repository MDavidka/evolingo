# ARLEN_COMPONENT_REGISTRY.md

## Registered Component Namespaces (240+ Identifiers)
All components are registered in `lib/arlen/visual-intelligence.ts` (`ALL_VISUAL_COMPONENT_IDS`) and rendered natively in `ios/Sources/Evolingo/ArlenVisualIntelligence.swift`:

- **REF-01 Progress & Files (`progress.*`, `file.*`):**
  - `progress.ring`, `progress.bar`, `progress.segmented`, `progress.steps`, `progress.milestones`, `progress.gauge`, `progress.countdown`, `progress.upload`, `progress.download`
  - `file.download`, `file.preview`, `file.collection`, `file.pdf`, `file.docx`, `file.xlsx`, `file.pptx`, `file.csv`, `file.zip`, `file.code`, `file.image`, `file.audio`, `file.video`, `file.export`, `file.share`, `file.progress`
- **REF-02 Media, Headings & Timelines (`text.*`, `image.*`, `media.*`, `timeline.*`, `steps.*`, `process.*`):**
  - `text.heading`, `text.paragraph`, `text.caption`, `text.quote`, `text.code`, `text.math`, `text.highlight`, `text.copyable`, `text.keyValue`, `text.largeNumber`, `text.collapsible`
  - `image.carousel`, `image.single`, `image.gallery`, `image.bento`, `image.zoomable`, `image.beforeAfter`, `image.annotated`, `media.audio`, `media.waveform`, `media.video`, `media.transcript`
  - `timeline.numbered`, `timeline.vertical`, `timeline.horizontal`, `timeline.milestones`, `timeline.events`, `timeline.project`, `steps.compact`, `steps.expandable`, `process.flow`, `process.pipeline`
- **REF-03 Structured Results (`result.*`):**
  - `result.phone`, `result.address`, `result.contact`, `result.website`, `result.largeValue`, `result.copyable`, `result.summary`, `result.source`, `result.product`, `result.event`, `result.weather`, `result.comparison`
- **REF-04 Maps (`map.*`):**
  - `map.preview`, `map.standard`, `map.satellite`, `map.hybrid`, `map.location`, `map.multiplePins`, `map.pins`, `map.route`, `map.multiRoute`, `map.polyline`, `map.polygon`, `map.circleOverlay`, `map.cluster`, `map.heatmap`, `map.region`, `map.regionHighlight`, `map.geographicBounds`, `map.distance`, `map.coordinate`, `map.terrain`, `map.elevation`, `map.annotation`, `map.radius`, `map.geographicComparison`
- **Charts, Metrics, Icons, Data, Tables, Utilities & Custom Visuals (`chart.*`, `metric.*`, `icon.*`, `data.*`, `table.*`, `utility.*`, `visual.*`, `layout.*`):**
  - 36 statistical charts, 20 metrics/gauges, 14 icon compositions, 19 data/heatmap views, 9 table views, 16 interactive utilities, 12 custom visual primitives, and 12 layout compositions.
