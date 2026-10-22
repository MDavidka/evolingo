# Evölingo Design Decisions

- Use a calm, content-first workspace: warm near-white canvas, charcoal text, one restrained orange action accent, and quiet project-specific notebook colors.
- Keep the mobile composition narrow and deliberate: 16px page gutters, a centered 480px desktop canvas, and safe-area-aware bottom controls.
- Set an 8px rhythm with 4px half-steps; align text and controls optically rather than relying on decorative separators.
- Use Inter with a compact wordmark, a 16–18px greeting, 14px body copy, 13px card titles, and 11–12px navigation labels.
- Project tiles stay compact (about 108 × 70px) and content-led; a custom spiral notebook SVG replaces pictographic emoji.
- Each project gets a repeatable accent derived from its name; Erasmus+ remains blue as the default project.
- The add tile uses a dashed circular plus; the separate floating action remains distinct and easy to reach.
- Use semantic CSS tokens for surface, border, text, accent, radius, spacing, focus and elevation.
- Elevation has four steps: base, card, raised control and overlay; each uses restrained tight, medium and diffuse shadows with a hairline.
- Dark-mode tokens preserve contrast and make raised surfaces slightly lighter than the base.
- Frosted glass is reserved for genuinely floating controls, the sheet and the navigation; project cards remain mostly opaque for clarity.
- The bottom sheet uses a 28px top radius, a visible drag handle, and a soft fade that separates it from the page.
- The floating tab bar is 56–60px tall with a 24px radius; the active tab gets one animated filled pill, not nested selection fills.
- Icon-only actions have accessible names and at least 44px hit areas; focus-visible styles remain clear and unobscured.
- Motion is limited to transform and opacity over 150–250ms, with a reduced-motion fallback.
- Preserve app routes, learning progress, project persistence and screen behavior; make visual changes at the existing component and CSS boundaries.
- Logo and user photos use `next/image` with explicit dimensions and unoptimized remote/data-URL rendering where appropriate.
