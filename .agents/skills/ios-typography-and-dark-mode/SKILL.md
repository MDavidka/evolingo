---
name: ios-typography-and-dark-mode
description: Set iOS type scales, weights, and dark-mode surfaces so UI looks premium and readable. Use when picking fonts, line heights, Dynamic Type, dark appearance, or when text feels cheap, loud, or low-contrast.
paths: "**/*.swift"
---

# iOS typography and dark mode

Good type is **spacing and hierarchy**, not a new font. Prefer SF Pro / system text styles. Apply **ios-senior-ui-polish**.

## Type

- Use **text styles** (`largeTitle`, `title2`, `headline`, `body`, `subheadline`, `caption`) so Dynamic Type works
- **Two weights** on a screen (regular + semibold/semibold). Skip ultra-thin
- **3–4 sizes** on a card, not six. Two close sizes read as a mistake — merge them
- Line height **shrinks as type grows**. Titles are tight; captions need air
- A heading **belongs to the text below**: more space above than below (about 3–4× vs 1×)
- Line length: body is not full-bleed on iPad; keep a readable measure
- `primary` for body, `secondary` for support. Pure black is loud; washed grey is unreadable
- **Tabular / monospaced digits** for money, timers, stats: `.monospacedDigit()`
- No orphans on large titles if you control breaks; don’t ship 56pt marketing headlines on iPhone
- Sentence case. Tighten tracking slightly on large titles if custom

## Dark mode

- **Darkest surface at the back.** Content layers step lighter. Do not put the darkest fill on the front card
- Greys need a **hint of hue** (cool or brand-tinted). Dead `#000` + `#111` looks like a hole
- Hairline separators over heavy shadows
- Liquid Glass stays on **chrome**. Content uses standard `systemBackground` / `secondarySystemBackground`
- Test elevated content on wallpaper and on scrolled media; add a scrim if type sits on photos
- Contrast: secondary labels still pass. Check Increase Contrast and Reduce Transparency

## Pairing with color

One accent. Color is for action and status, not for every heading. In dark mode, desaturate fills so they don’t glow.

## SwiftUI

```swift
Text(amount, format: .currency(code: "USD"))
    .font(.title.weight(.semibold))
    .monospacedDigit()
    .foregroundStyle(.primary)
```

- Prefer `Font.body` over `Font.system(size: 15)`
- `minimumScaleFactor` only for true single-line constraints (nav titles, tags)

## Checklist

- [ ] Text styles, not random pt sizes
- [ ] Two weights, few sizes
- [ ] Heading spacing attached downward
- [ ] Tabular numbers on data
- [ ] Dark: back is darkest, hue in the grey, glass not on the list
