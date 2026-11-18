---
name: ios-senior-ui-polish
description: Apple HIG and iOS 26 Liquid Glass mapping for the polish skill. Read when implementing navigation chrome, materials, or accessibility for a screen.
---

# HIG / Liquid Glass cheat sheet

## Layout and controls

- Minimum hit target **44pt**. Comfortable fields **44–48pt** tall.
- Support **Dynamic Type**. Do not clip large titles. Prefer `ScaledMetric` over magic font sizes.
- Semantic colors: `Color.primary`, `.secondary`, `.accentColor`, system backgrounds. One brand accent.
- Prefer `Label` + SF Symbols over custom icon fonts.
- Tab bar: real `TabView`. iOS 26 tab bars float and can minimize on scroll — do not fight that with a fake bottom bar.
- Search: `.searchable` with suggestions. Sheets for filters, not a full-screen website drawer unless the task is huge.
- Keyboards: `.textContentType`, `.keyboardType`, submit label, toolbar Done.

## Materials

| Layer | Use |
|---|---|
| Navigation (tab, toolbar, sidebar, floating controls) | System bars / Liquid Glass |
| Content (lists, cards, canvas) | Standard backgrounds; `ultraThinMaterial` only for overlays that are not the main canvas |
| Transient controls (slider thumb, toggle while dragging) | System — they glass themselves on interaction |

Do not apply `.glassEffect` to rows in a `List`.

## Accessibility

- VoiceOver: label the job, not the glyph. Combine image+text with `accessibilityElement(children: .combine)` where they are one control.
- Reduce Motion: skip large springs and parallax; keep a short opacity/offset fade.
- Reduce Transparency: text on a solid or thick material, not on busy photos.
- Contrast: secondary text still readable. Do not use light grey on glass over a photo without a scrim.

## Dark mode

Darkest surface at the back. Give greys a hint of hue (not pure `#000` slabs). Foreground content is the lightest layer. Do not invert a light-mode shadow stack.
