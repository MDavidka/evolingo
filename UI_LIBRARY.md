# Evolingo UI Library — canonical specification (v1)

**Status:** UI Library + reusable React primitives + site-wide neutral theme + Profile 3.0 settings primitives (v1.2). For new app work, use these reusable components and the machine-readable [manifest](app/evo-ui-kit/manifest.json), not screenshots or one-off copies.

**Location in app:** Profile → Fejlesztői eszközök → UI Library.

## Design intent

Apple Neutral / ChatGPT-like iOS: quiet white surfaces, graphite typography, generous but not excessive spacing, visually related controls and cards. Avoid vibrant gradients, heavy glass, floating centered app popups, arbitrary control dimensions, tiny touch targets and horizontal scrolling at 360px.

### Canonical tokens

Source: `app/evo-ui-kit/tokens.css`. Use the CSS variables to make themes consistently updateable.

| Role | CSS variable | Value |
|---|---|---|
| Screen | `--evo-ui-canvas` | `#FFFFFF` |
| Secondary surface | `--evo-ui-surface` | `#F5F5F7` |
| Text | `--evo-ui-text` | `#202127` |
| Muted text | `--evo-ui-muted` | `#8E8E93` |
| Divider/border | `--evo-ui-border` | `#E5E5EA` |
| Strong border | `--evo-ui-border-strong` | `#D1D1D6` |
| Primary action | `--evo-ui-primary` | `#202127` |
| Link/focus | `--evo-ui-link` / `--evo-ui-focus` | `#007AFF` |
| Success | `--evo-ui-success` | `#34C759` |
| Destructive | `--evo-ui-danger` | `#FF3B30` |

Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 px. Card radius: 16px. Inputs: 14px. Bottom-sheet top radius: 26px; bottom corners: **0px**. Pill radius: 999px. Lucide icons: 20px, stroke 1.75. Font: SF Pro system fallback to Inter.

## Reusable components

Import from `app/evo-ui-kit/index.ts` (client components).

### UIButton

```tsx
import { UIButton } from "@/app/evo-ui-kit"

<UIButton variant="primary" fullWidth onClick={submit}>Create folder</UIButton>
<UIButton variant="secondary" onClick={cancel}>Cancel</UIButton>
<UIButton variant="tertiary" size="compact" onClick={addFile}>Add files</UIButton>
<UIButton variant="ghost" size="icon" aria-label="More options" onClick={showMenu}>
  <MoreHorizontal size={20} />
</UIButton>
```

Variants: `primary`, `secondary`, `tertiary`, `ghost`, `danger`, `glass`. Sizes: `standard` (50px), `compact` (44px), `icon` (44×44px). `fullWidth` makes the button span its container. `disabled` and normal HTML button props are supported. Use full-width submit buttons on small devices instead of inventing a fixed width. Text wraps if space is constrained.

### UISettingsGroup, UISettingsRow, UISettingsSwitchRow, UISwitch

The Profile 3.0 design uses reusable, borderless account/preferences rows from `app/evo-ui-kit/settings.tsx`, styled through `app/evo-ui-kit/settings.css` with the canonical kit tokens.

```tsx
import { UISettingsGroup, UISettingsRow, UISettingsSwitchRow } from "@/app/evo-ui-kit"
import { UserRound, Bell, Palette } from "lucide-react"

<UISettingsGroup title="Account">
  <UISettingsRow icon={UserRound} title="Personal details" onClick={openProfileEditor} />
  <UISettingsRow icon={Palette} title="Appearance" value="Light" showChevron={false}/>
  <UISettingsSwitchRow icon={Bell} title="Notifications"
    checked={notifications} onChange={toggleNotifications}/>
</UISettingsGroup>
```

- White-on-white groups with no filled containers or row dividers. Section labels at 12px. Settings rows at least 54px, icons 20px/1.75 stroke.
- Navigable rows are buttons; value-only rows are non-clickable divs. Chevron appears only when a row has a working action. Never create fake interactive settings.
- Switches use monochrome track and accessible role/checked state, with a minimum 44px target.
- Settings components receive app behavior through props, and never implement their own navigation, permissions or persistence.
- Profile uses `app/profile-v3.css` scoped to `.ref-profile-v3`; it replaces oversized cards and redundant in-profile shortcuts while keeping main navigation accessible.
- "Animációk csökkentése" is functional, per-device, saved in localStorage and applied through `html[data-evo-reduce-motion="true"]`.

### BottomSheet

```tsx
"use client"
import { useState } from "react"
import { UIButton, BottomSheet } from "@/app/evo-ui-kit"

function FolderExample() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  function create() {
    // Real save happens in the caller, then close on success.
    setOpen(false)
  }
  return (
    <>
      <UIButton onClick={() => setOpen(true)}>New folder</UIButton>
      {open && (
        <BottomSheet
          title="New folder"
          description="Organize your files"
          size="compact"
          dismissible={false}
          onClose={() => setOpen(false)}
          footer={<UIButton fullWidth disabled={!name.trim()} onClick={create}>Create folder</UIButton>}
        >
          <label htmlFor="folder-name">Folder name</label>
          <input id="folder-name" value={name} onChange={e => setName(e.target.value)} />
        </BottomSheet>
      )}
    </>
  )
}
```

`BottomSheet` props: `title`, `description?`, `children`, `footer?`, `onClose`, `size?: "compact"|"medium"|"expanded"`, `dismissible?`, `role?: "dialog"|"alertdialog"`, `closeLabel?`.

- **The panel spans the entire viewport width** and is anchored at `bottom: 0` (or directly above the mobile keyboard while editing). Desktop content is centered *inside* the full-width shell.
- Rounded top corners, zero bottom corner radius, solid white sheet background through the home-indicator safe area.
- Compact = natural content height; medium = medium minimum height; expanded = ~94dvh, constrained by safe area and keyboard. Scroll content only; footer stays visible.
- Supports backdrop dismiss and grabber swipe only when `dismissible` is true. For unsaved data, keep `dismissible={false}` and provide explicit close/cancel.
- Dialog semantics, basic focus trap/return, Escape, scroll lock, reduced-motion styles, visual viewport keyboard offset. Browser behavior must still be checked on real iOS Safari/PWA devices for new screen integrations.
- Keep controls at least 44×44px tappable and labels visible with Dynamic Type / increased text size.

### Bottom-sheet preview catalog

`app/evo-ui-kit/bottom-sheet-demo.tsx` has 15 demo-only sheet types:
1. Action menu
2. Context actions
3. Confirmation/destructive
4. Simple form
5. Multi-field form
6. Single selection
7. Multi-select
8. Searchable picker
9. Filters
10. Date/time
11. Permission explanation
12. Attachment menu
13. Multi-step setup
14. Progress
15. AI task approval

Every preview is non-persistent; permission examples **never** request real device access.

## Library category index

| Category | Source |
|---|---|
| Buttons & Inputs | `app/reference-screens.tsx`, `app/evolingo-button-demo.css` |
| Cards | `app/evolingo-cards-demo.tsx`, `app/evolingo-cards-demo.css` |
| Design System | `app/evolingo-design-system-demo.tsx`, `app/evolingo-design-system-demo.css` |
| Bottom Sheets & Forms | `app/evo-ui-kit/bottom-sheet-demo.tsx` |
| Menus & Settings | `app/evolingo-menus-demo.tsx`, `app/evolingo-menus-demo.css` |
| Icons | `app/evolingo-icons-demo.tsx`, `app/evolingo-icons-demo.css` |
| AI Components | `app/evolingo-ai-components-demo.tsx`, `app/evolingo-ai-components-demo.css` |
| Typography | `app/reference-screens.tsx` |

`app/evo-ui-kit/library-normalize.css` applies uniform mobile-only gallery sizing and focus/touch improvements. The other gallery styles now consume the canonical palette variables where they were formerly hard-coded. Alternative palettes *shown as specimens* in Design System remain intentionally different colors.

**Site-wide adoption:** `app/layout.tsx` now loads `app/evo-ui-kit/tokens.css` and `app/evo-ui-kit/site-theme.css` last, bringing the same color and responsive shape tokens to all main views. The shared `BottomSheet` is used for Chat attachments, Schedule creation/task actions, Library file operations, Utilities integrations and machine forms, Profile info/editing and Brainstorm creation. Shared `UIButton` powers live Send, Schedule creation, several Library form actions and bottom-sheet submits. Existing data handlers and persistence remain unchanged.

**Compatibility:** Some specialized interaction controls (calendar day cells, task progress, floating sidebar navigation, large editor/composer surfaces) retain their feature-specific DOM and layout rules. They inherit neutral tokens but have not been reimplemented from scratch. This is intentional to avoid breaking gestures, keyboard positioning and backend workflows. Verify all screens on an actual iPhone before claiming a pixel-perfect migration; build checks alone do not establish interactive browser correctness.

## AI implementation contract

1. Read `AGENTS.md` and `app/evo-ui-kit/manifest.json` before generating UI.
2. Reuse existing exports first; build new variants using the same tokens instead of adding new one-off grays and button heights.
3. Use bottom-attached `BottomSheet` for new in-app popups. Do not create a centered modal.
4. Design around 390px but validate 360px, 430px, 768px and desktop. Do not hardcode widths that overflow small phones.
5. Preserve keyboard visibility and safe areas. Keep primary form action pinned to the bottom sheet footer.
6. Ensure selection, disabled, pending, error and destructive states have accessible text labels. Never rely on color alone.
7. The UI Library must not perform real backend actions, persist account changes, or request device permissions.
8. If you change a reusable component, update the manifest, this document and its gallery specimen. Verify `npm run typecheck` and `npm run build`.

## QA acceptance checklist

- [ ] Gallery specimens are readable at 360/390/430px without horizontal scroll.
- [ ] Standard button = 50px; compact and icon targets = at least 44px.
- [ ] All buttons, inputs and menu groups share canonical typography, borders and radii.
- [ ] Bottom sheet reaches the viewport bottom and covers the home indicator safe area.
- [ ] Input remains visible above iOS keyboard and footer does not overlap it.
- [ ] Scroll stays inside expanded sheet; background remains locked.
- [ ] Dismissal is prevented when losing unsaved data would be harmful.
- [ ] Focus ring, keyboard navigation, screen-reader label and reduced motion work.
- [ ] AI-friendly manifest and docs remain accurate.
- [ ] Build and typecheck pass on main.

