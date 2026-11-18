# Evolingo agent design instructions

This repository has a canonical mobile-first UI kit. For any task involving screen layouts, pop-ups, controls, or new components, read **UI_LIBRARY.md** and **app/evo-ui-kit/manifest.json** before editing visuals.

## Required behaviors
1. Reuse exported React components in `app/evo-ui-kit/index.ts` (`UIButton`, `BottomSheet`, `UISettingsGroup`, `UISettingsRow`, `UISettingsSwitchRow`, `UISwitch`) and token variables in `app/evo-ui-kit/tokens.css`. Do not make visually similar one-off substitutes without a functional reason.
2. Apple Neutral / ChatGPT iOS-inspired: background white, surface `#F5F5F7`, text `#202127`, secondary `#8E8E93`, divider `#E5E5EA`. Keep border radii and size values consistent with the manifest; default buttons 50px, compact/icon controls 44px.
3. All new app pop-ups should use the **bottom-attached** `BottomSheet`: viewport full width, square bottom corners, top radius 26px, zero space under sheet, appropriate iOS safe-area padding and virtual keyboard behavior. Never substitute a centered dialog for an in-app pop-up without a documented platform requirement.
4. Design baseline for 390px-wide iPhones. Also validate 360px and 430px. Prevent horizontal overflow, truncated control labels and unusably small buttons. Keep tap targets >= 44 x 44px.
5. Prefer 20px Tabler icons with 1.75 stroke, SF Pro/Inter system font, neutral surfaces, and gentle motion. Respect reduced motion, focus visibility and screen-reader semantics.
6. UI Library specimens must be preview-only; don't trigger real permission requests, account changes, destructive operations, agent tasks, or data persistence.
7. The live app is now opted in to `app/evo-ui-kit/site-theme.css` from `app/layout.tsx`. Migrate new live-screen controls deliberately using the shared exports while preserving existing data, gestures, and keyboard/safe areas. Do not reintroduce the old green/sage mobile palette.
8. If you add a new reusable component or revise tokens, update `UI_LIBRARY.md` and `app/evo-ui-kit/manifest.json`, and add/update an in-app specimen. Run `npm run build` and `npm run typecheck` where available.

## Preferred import

```tsx
import { UIButton, BottomSheet } from "@/app/evo-ui-kit"
```

Use `UIButton variant="primary" fullWidth` for form submit, `UIButton variant="secondary"` for cancel, and `UIButton size="icon" aria-label="..."` for icon-only actions.

Profile 3.0 is the current reference for borderless monochrome settings: `app/reference-screens.tsx`, `app/profile-v3.css`. Reuse the settings primitives instead of creating new row components. Never render non-action rows as clickable buttons or show chevrons for controls that do nothing.

See `UI_LIBRARY.md` for code examples and implementation guidance.

## Native iOS / SwiftUI development

This repository also contains a native iOS application in `ios/`, built with SwiftUI and Swift Package Manager (`ios/Package.swift`, iOS 17 minimum). The React UI kit instructions above apply to the web application. Do not apply web components, CSS pixels, browser viewport behavior, or web keyboard handling to the native iOS target.

For every task that changes or reviews native iOS code:

1. Inspect the relevant Swift source, `ios/Package.swift`, and this file before editing. Do not redesign unrelated screens.
2. Discover project-local skills under `.agents/skills/*/SKILL.md` and read the applicable files before modifying code. Select skills from their descriptions and task scope; do not require the user to name them. Start with `ios-dev` and `swiftui` for ordinary SwiftUI work. Add `ios-home-screen` for the first tab or post-launch screen; `swiftui-ui-patterns` / `swiftui-view-refactor` for layout or view changes; `ios-senior-ui-polish` / `hig` for design critique and HIG; `ios-input-and-forms` for keyboard, text entry, and composer behavior; `ios-motion` for animation; `guide-swift-concurrency` / `swift-concurrency-expert` for concurrency; `guide-swiftui-performance-audit` / `swiftui-performance-audit` for rendering and scrolling performance; and `ios-typography-and-dark-mode` for type, Dynamic Type, and color scheme. Use other installed Apple API skills when their framework is in scope.
3. Follow Apple Human Interface Guidelines and use native SwiftUI behavior, bundled Inter typography with Dynamic Type, VoiceOver semantics, Reduce Motion, and minimum 44 × 44 pt hit targets.
4. Keep the Evolingo native palette neutral: canvas `#FFFFFF`, surface `#F5F5F7`, primary text `#202127`, secondary text `#626267`, border `#E5E5EA`. Prefer subtle shadows and restrained translucency. Avoid unnecessary gradients, oversized blur, and decorative colors.
5. Respect status bar / Dynamic Island, home-indicator, and keyboard safe areas. Use SwiftUI layout constraints and `.safeAreaInset(edge: .bottom)` for anchored controls. Do not use `UIScreen.main.bounds`, fixed screen-height calculations, web viewport techniques, manual keyboard-height subtraction, or `.ignoresSafeArea()` on an entire interactive screen. A decorative background may extend into safe areas while interactive content remains inside them.
6. For the agent chat, preserve 17 pt AI body text, 16 pt user text, compact content-sized right-aligned user bubbles, left-aligned bubble-free AI messages, 24–28 pt message spacing, 56–60 pt idle composer height, and a content-driven composer capped at 180 pt. Keep 48 pt of breathing room after the latest message inside the scroll content. Follow new messages unless the user scrolls upward; preserve position through keyboard changes and streaming.
7. Make the smallest maintainable change and preserve existing message models, backend calls, navigation actions, persistence, and other working behavior unless the task explicitly asks otherwise.
8. Validate using the available Swift/xtool or Xcode tools. Run relevant tests when the user asks or the change requires them. Check supported layout widths, keyboard and safe-area behavior, accessibility, and scroll stability where tooling allows. Clearly distinguish builds, automated tests, simulator/device checks, and unverified behavior; never claim a test that did not run.

9. Native app-provided iconography currently uses Tabler Icons from `@tabler/icons-react` through `EvoIcon`, `.evoSymbol`, and `EvoSymbolLabel`: 20 pt standard, 21 pt navigation, 17 pt small toolbar, Regular or Medium weight, monochrome rendering, primary `#202127`, secondary `#626267`, and at least 44 × 44 pt interactive targets. Keep Dynamic Type support, readable Dark Mode equivalents, and meaningful error/selection/inverted colors. Tabler SVGs are pinned under `ios/ThirdParty/Tabler` and compiled into native paths using `ios/scripts/import_tabler_icons.py`; preserve its MIT notice and record derived variants. SF-style names remain semantic keys. App-owned tabs and empty states also use Tabler template images; OS-owned prompts and share sheets stay native. A future unmapped key falls back to SF Symbols to keep its action usable.

10. Native text uses the bundled Inter Regular/Medium/SemiBold/Bold fonts through `EvoFont`, registered before the first scene. Preserve once-per-start chat autofocus after history restoration, the soft top scroll edge on iOS 26+, the compatible graduated-material fallback, and optical alignment of response actions while retaining distinct 44 pt hit areas. The app icon source is `ios/Resources/AppIconSource.svg`.

Installed native iOS skill sources live in `.agents/skills/`. Their `SKILL.md` files are the task-level guidance; continue to discover and read only the relevant ones on each future task.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
