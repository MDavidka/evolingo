# Evölingo · Streamline Flex Remix icons

## Source and license

Evölingo's global sidebar and selected Témák, Könyvtár and AI chat controls
use **actual vector paths** from the **Flex Remix Free** collection, designed
by **Streamline / Webalys LLC**.

- Collection: https://www.streamlinehq.com/icons/flex-remix-free
- Upstream free SVG sources: https://github.com/webalys-hq/streamline-vectors/tree/main/flex/remix
- License: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- Attribution: **Icons by Streamline** — https://www.streamlinehq.com
- Changes made: isolated each original icon's SVG path, removed original XML
  wrappers and metadata, and rendered in the UI using `fill="currentColor"`.
  The original right-sidebar symbol is horizontally mirrored for a left sidebar.
- No assets from the paid 4,220-icon Flex Remix package were included.

This attribution is also accessible from the shared navigation sidebar.
The icons are UI decorations, not a standalone downloadable icon library.

## Included symbols

| Evölingo use | Original free Streamline filename |
|---|---|
| Global sidebar | `interface-essential/layout-right-sidebar.svg` (mirrored) |
| General AI chat | `interface-essential/help-chat-1.svg` |
| Témák | `work-education/graduation-cap.svg` |
| Könyvtár | `interface-essential/label-folder-tag.svg` |
| Eszközök | `interface-essential/dashboard-3.svg` |
| Ötletbörze | `interface-essential/lightbulb.svg` |
| Profil menu | `interface-essential/contact-book.svg` |
| Új beszélgetés | `interface-essential/feather-pen.svg` |
| Search | `interface-essential/magnifying-glass.svg` |
| Copy | `interface-essential/copy-2.svg` |

All paths are stored in `app/flex-remix-icon.tsx`. This component includes
only the necessary vectors, does not download icons at runtime, and does not
depend on a paid Streamline account. Other existing symbols remain in place
until a properly licensed, accurate Flex Remix equivalent is available.

## Design rules

- Use a monochrome style with `currentColor`, consistently on white surfaces.
- 22–24px navigation icons, 18–21px secondary actions, and at least 44px
  clickable target size.
- Keep the avatar as an actual image, not an icon placeholder.
- Maintain appropriate text labels and accessibility names on controls.
- Do not replace application-specific illustrations with generic icons.
- Do not publish paid Streamline artwork without a relevant license.
