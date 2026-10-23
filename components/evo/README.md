# Evolingo UI primitives

Small, reusable React components used by the Home and Review screens. They share the existing Evolingo tokens and CSS classes so the app keeps a single visual language without adding another runtime dependency.

## Available components

- `EvoButton`: primary, secondary, and ghost variants; supports leading/trailing icons, native button attributes, disabled state, and form button types.
- `EvoCard`: semantic section wrapper for a bordered surface.
- `EvoProgress`: bounded progress indicator with accessible progressbar semantics and a text label.
- `EvoStatusBadge`: neutral, success, and warning status treatments.
- `EvoEmptyState`: consistent empty-state icon, title, explanation, and optional action.
- `EvoSectionHeading`: shared heading and optional action layout.
- `EvoMetric`: compact label/value/detail display for stats.

## Usage

```tsx
import { EvoButton, EvoCard, EvoProgress } from "@/components/evo/ui";

<EvoCard className="evo-today-card" aria-labelledby="today-title">
  <h2 id="today-title">Today's goal</h2>
  <EvoProgress value={2} max={3} label="Daily learning activity goal" />
  <EvoButton onClick={continueLesson}>Continue lesson</EvoButton>
</EvoCard>
```

## Design and accessibility rules

- Use existing CSS variables and semantic color roles. Do not introduce one-off hex colors in components.
- Keep touch controls at least 44px tall and preserve visible keyboard focus.
- Buttons must have a clear action and use native disabled semantics when unavailable.
- Progress indicators must expose a label, current value, and maximum.
- Honor `prefers-reduced-motion` in CSS for animated state changes.
- Use these shared primitives before adding another one-off button, metric, card, or empty state.
