---
name: ios-motion
description: Add iOS motion that orients, gives feedback, explains, or delights — not decoration. Use when adding SwiftUI animation, transitions, matched geometry, or when UI feels static or noisy. Honor Reduce Motion.
paths: "**/*.swift"
---

# iOS motion

Motion is how a flat screen becomes a product. **One purposeful moment beats decoration everywhere.** Apply **ios-senior-ui-polish**.

## Four jobs (pick one per animation)

1. **Orient** — Where did that screen come from? Push/pop, sheets, tab switches.
2. **Feedback** — The tap registered (highlight, small scale, toggle).
3. **Explain** — A layout change that would be confusing if it jumped (expand, reorder, number count-up).
4. **Delight** — Extra, only after 1–3 are solid. Easy to delete. Never required to understand the UI.

If you cannot name the job, delete the animation.

## Timing and feel

- **180–300ms** for most UI. Springs for elements that settle; easing for fades
- Animate **position, size, and opacity together** — opacity-only feels cheap
- System: `.animation(.snappy, value:)`, `withAnimation`, navigation transitions
- iOS 26 controls already animate on interaction — do not wrap them in extra bounce

## Patterns

- Prefer `NavigationStack` and sheet transitions over custom full-screen covers
- `matchedGeometryEffect` for a card expanding into detail — one hero only
- Lists: implicit animations on insert/delete, not staggered circus
- Numbers: count-up only when the number *is* the moment

## Reduce Motion

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion
```

When true: cross-fade or instant, no large springs, no parallax, no confetti. Success still works as a layout (**ios-empty-error-success**).

Liquid Glass chrome already moves. Do not add competing blobs on the content layer.

## Do not

- Animate every row on appear
- Loop forever except for true indeterminate progress
- Block input until a 1s intro finishes
- Custom modal physics that fight the interactive pop gesture

## Checklist

- [ ] Each animation has a job
- [ ] Duration in the 180–300ms band unless explaining a long process
- [ ] Reduce Motion path exists
- [ ] No opacity-only hero
- [ ] System navigation carries orientation
