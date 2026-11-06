# Evolingo agent design instructions

This repository has a canonical mobile-first UI kit. For any task involving screen layouts, pop-ups, controls, or new components, read **UI_LIBRARY.md** and **app/evo-ui-kit/manifest.json** before editing visuals.

## Required behaviors
1. Reuse exported React components in `app/evo-ui-kit/index.ts` (`UIButton`, `BottomSheet`) and token variables in `app/evo-ui-kit/tokens.css`. Do not make visually similar one-off substitutes without a functional reason.
2. Apple Neutral / ChatGPT iOS-inspired: background white, surface `#F5F5F7`, text `#202127`, secondary `#8E8E93`, divider `#E5E5EA`. Keep border radii and size values consistent with the manifest; default buttons 50px, compact/icon controls 44px.
3. All new app pop-ups should use the **bottom-attached** `BottomSheet`: viewport full width, square bottom corners, top radius 26px, zero space under sheet, appropriate iOS safe-area padding and virtual keyboard behavior. Never substitute a centered dialog for an in-app pop-up without a documented platform requirement.
4. Design baseline for 390px-wide iPhones. Also validate 360px and 430px. Prevent horizontal overflow, truncated control labels and unusably small buttons. Keep tap targets >= 44 x 44px.
5. Prefer 20px Lucide icons with 1.75 stroke, SF Pro/Inter system font, neutral surfaces, and gentle motion. Respect reduced motion, focus visibility and screen-reader semantics.
6. UI Library specimens must be preview-only; don't trigger real permission requests, account changes, destructive operations, agent tasks, or data persistence.
7. Keep existing production views unaffected when updating the library; only migrate live screens intentionally, testing interactions and keyboard/safe areas.
8. If you add a new reusable component or revise tokens, update `UI_LIBRARY.md` and `app/evo-ui-kit/manifest.json`, and add/update an in-app specimen. Run `npm run build` and `npm run typecheck` where available.

## Preferred import

```tsx
import { UIButton, BottomSheet } from "@/app/evo-ui-kit"
```

Use `UIButton variant="primary" fullWidth` for form submit, `UIButton variant="secondary"` for cancel, and `UIButton size="icon" aria-label="..."` for icon-only actions.

See `UI_LIBRARY.md` for code examples and implementation guidance.
