# Evölingo — iOS, no-AI-slop guardrails

This project note translates the supplied Evölingo reference and the existing design guidance into concrete rules for future UI work. It is a new project-specific guideline, not a copy of a separate source file.

## Visual direction

- Use a white canvas, near-black primary text, quiet neutral borders, and the existing orange accent only when it has a real product meaning.
- Keep the fox mascot and blue notebook asset that already belong to the app. Do not redraw brand assets or add decorative illustrations to empty space.
- Prefer a restrained system-like sans-serif, consistent alignment, deliberate whitespace, and a small number of radii.
- Use flat surfaces first. No default glassmorphism, gratuitous gradients, blur, large shadows, glow rings, floating badges, or decorative color washes.
- Keep the existing horizontal project shelf and the existing lesson flows. Improve clipping, sizing, hierarchy, and touch precision without inventing a new information architecture.

## Interaction and accessibility

- All primary touch targets should be at least 44 CSS pixels where practical.
- Preserve visible keyboard focus, readable contrast, semantic labels, and reduced-motion support.
- Use short, purposeful feedback transitions only; never animate the background for decoration.
- Do not fake learning progress, authentication, persistence, or production security.
- Test narrow iPhone widths first, then a centered mobile-width layout on desktop. Avoid horizontal page overflow; horizontal scrolling is limited to the project shelf.

## Implementation contract

- Keep Next.js and the existing component behavior. Add design overrides in a small, clearly named CSS layer rather than appending another patch to the legacy stylesheet.
- Keep project card labels fully visible; icons must not overlap text or be clipped by the card container.
- Retain safe-area spacing for the top and bottom of the viewport.
- The production deployment is not replaced automatically by a preview. Review the branch preview before merging.
