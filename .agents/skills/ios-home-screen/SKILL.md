---
name: ios-home-screen
description: Design iOS home, Today, dashboard, and first-tab screens so one metric or question leads. Use when building a home screen, dashboard, wallet, fitness today view, or asking what the user should see first after launch.
paths: "**/*.swift"
---

# iOS home screen

Apply **ios-senior-ui-polish** first. This skill is the first screen after launch (home, Today, dashboard, tab 1).

## The rule

The home screen answers **one question the user opened the app to ask**. That answer is the hero. Supporting stats stay quiet. Ads, promos, and tool grids do not outrank it.

## Lead with the moment

Match what is true *now*:

- Boarding pass and gate before seat upgrades
- Charge percent before kWh history
- Today’s workout before the annual plan
- Balance before the product-cross-sell carousel

If the hero is `"--"` or an empty ring, the screen has no job yet — fill it with the most useful number you already have, or an empty state that teaches (see **ios-empty-error-success**).

## Layout

```
[optional context line]
HERO (number, object, or photo)
quiet supporting row (2–3 facts max)
content they came for (list, timeline, cards)
primary action in the thumb zone
TabView
```

- Left-align the scan line. Do not center a stack of account labels.
- One hero metric. Give it a comparison (vs yesterday, vs target) — a naked number is weak.
- Content beats ads. If you must promote, demote it below the job or into a small banner the user can dismiss.
- Real `TabView`. Do not fake navigation with four equal circles in the body.
- One `.borderedProminent` on the screen. Secondary actions are menus, swipes, or `.plain`.

## Junior tells

| Junior | Senior |
|---|---|
| Promo cards above the user’s data | Data first |
| Four equal feature tiles | One job, tools in the tab bar or a quiet row |
| Everything centered | Leading edge for type and numbers |
| Five CTAs the same size | One weighted action |
| Dashboard of 9 equal cards | Hero + supporting + list |

## SwiftUI

- `TabView` for app sections. Let the system bar float / minimize on scroll.
- Hero: large `Text` with `.monospacedDigit()`, or one focal view (ring, map, card art).
- Supporting stats: `Grid` or a single `HStack` with `.secondary`.
- Primary action: toolbar-or-bottom only if it is the job; otherwise a prominent button above the tab bar, with safe-area padding.

## Checklist

- [ ] Can you name the one question this screen answers?
- [ ] Hero is that answer, not a promo
- [ ] Comparison or context on the number
- [ ] Thumb-zone primary action
- [ ] Tab bar is `TabView`, not a custom icon grid
