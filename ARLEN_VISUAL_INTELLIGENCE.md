# ARLEN_VISUAL_INTELLIGENCE.md

## Overview
Arlen Visual Intelligence integrates conversational generative UI directly into **Arlen Chat** (`ChatView` -> `ArlenMarkdownRenderer` -> `ArlenVisualBlockView`), enabling mixed Markdown, native visualizations, downloadable file rows, progress rings, carousels, numbered timelines, copyable results, maps, charts, and local deterministic utilities within a single streamed assistant turn.

## Pipeline
1. **VisualIntentRouter (`detectVisualIntent`):** Routes user requests (`lib/arlen/visual-intelligence.ts`).
2. **VisualSchemaValidator (`validateVisualSpec` & `ArlenVisualRegistry`):** Enforces allowlisted component IDs, coordinate bounds (`-90..90`, `-180..180`), finite numeric points, and composition depth limits.
3. **VisualResponseRenderer (`ArlenVisualBlockView`):** Backgroundless, margin-aligned native SwiftUI renderer (`ios/Sources/Evolingo/ArlenVisualIntelligence.swift`).
4. **ArtifactManager (`ArlenArtifactManager`):** Exports and shares real files via `UIActivityViewController`.
5. **UtilityEngine (`ArlenVisualUtilityRenderer`):** Local deterministic unit conversion and calculation without per-keystroke model calls.
