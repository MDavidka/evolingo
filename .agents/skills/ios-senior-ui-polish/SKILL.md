---
name: ios-senior-ui-polish
description: Take a SwiftUI iOS screen from correct to senior using hierarchy, spacing, thumb-zone reach, and native patterns. Use when designing or reviewing any iOS screen, when UI feels basic, cheap, flat, or unfinished, or when the user mentions polish, premium, HIG, Liquid Glass, spacing, or visual weight.
paths: "**/*.swift"
---

# iOS senior UI polish

Apply this on every visual change. Prefer system SwiftUI over custom chrome.

## Diagnose with four levers

A basic screen is not ugly. It is **invisible**: equal weight, no job, no reach.

1. **One job** — Say what the screen is for in one sentence. One action leads. Everything else supports.
2. **Reach** — Primary tap lives in the thumb zone (bottom). Price and CTA travel together. Do not bury the action in the nav bar.
3. **Rhythm** — Group, space, repeat. Left-aligned scan line. Never center body text. Rows share one beat.
4. **Native patterns** — `NavigationStack`, `TabView`, sheets, `List`/`Form` rows. Do not invent mini-website controls people must decode.

Fix hierarchy by **ordering**, not by deleting features.

## Four dials (turn surroundings down first)

Size · Weight · Colour · Space.

Do not make the hero bigger until the rest is quieter. `.secondary` and smaller type demote. One accent color for action. Space groups before borders do.

## Four refinement decisions

Same content, different finish:

| Decision | Question | iOS move |
|---|---|---|
| Priority | What wins? | One `.borderedProminent`. Largest number is the job. |
| Grouping | What belongs? | Label sits tighter to its value than to the row above. Drop extra `Divider`s. |
| Rhythm | What repeats? | One row height, one section gap, one corner radius. |
| Visual weight | What is heavy? | Blur test: the smallest thing must not be the loudest. |

**Spacing is relationship, not pixels.** Four levels: inside a pair (label↔value) → related items → groups → major sections. Padding around a group must beat the largest gap inside it. Use an 8pt grid (`4, 8, 16, 24, 32, 48`).

## Buttons

- One solid fill per screen (`.borderedProminent`). Others `.bordered` or `.plain`.
- Horizontal padding ≈ half the height (48pt control → ~24pt).
- Corner radius ≈ a quarter of height, or use system `capsule` / `roundedRect`.
- Label one weight step above body. White-on-color: bump weight.
- States that exist: default, pressed, disabled, loading. Focus must not shift layout.
- Destructive actions use `.destructive` and an extra step or undo — not a second equal fill.

## iOS 26 / Liquid Glass

Standard `TabView`, toolbars, navigation bars, sheets, and system controls pick up Liquid Glass when built with the current SDK. Use them.

- Glass is the **navigation layer** (tab bar, sidebar, floating toolbar). Content stays on standard materials.
- Do not put Liquid Glass on lists, cards, media, or stacked custom glass blobs.
- Custom chrome: `.glassEffect` only for a control that belongs in that top layer. Prefer `.regular` for text-heavy chrome; `.clear` only over rich media.
- Wrap sibling glass pieces in `GlassEffectContainer` so they blend instead of stacking.
- Test Reduce Transparency and Reduce Motion. If you draw custom glass, those settings must still keep text readable.

See [reference.md](reference.md) for the HIG cheat sheet.

## SwiftUI defaults that look junior

- Centered `VStack` of equal-weight text
- Generic 4-icon “nav” that is not `TabView`
- Placeholder `"--"` as a hero
- Rainbow cards, gradient buttons, drop shadows on every row
- More than three type sizes on one card
- Pure black labels on white (`primary` / `secondary` instead)

## Checklist

- [ ] One sentence for the screen’s job
- [ ] One primary action, in reach
- [ ] Surroundings quieter than the hero
- [ ] System navigation, not custom chrome
- [ ] One fill, 8pt spacing, Dynamic Type, 44pt targets
- [ ] Glass on chrome only; content readable with Reduce Transparency
