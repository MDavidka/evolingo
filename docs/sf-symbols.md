# Evölingo iconography — Apple SF Symbols semantics

This specification records the intended SF Symbols for a **future native SwiftUI
iOS build** and their web-safe counterparts in the current Next.js/PWA.

## Platform distinction

- **Native iOS:** render Apple's SF Symbols through SwiftUI `Image(systemName:)`
  or UIKit `UIImage(systemName:)`. The operating system provides the artwork.
- **Web/PWA:** use the independently licensed Phosphor React symbols already
  installed (`@phosphor-icons/react`), with shapes and optical sizing chosen to
  correspond to the native names. Web pages do **not** bundle, export, scrape,
  or redistribute Apple SF Symbols assets or Apple's symbol font.
- Do not use SF Symbols for the app icon, logo, trademarks, or marketing imagery.
- Symbol availability varies by iOS version. Verify names and availability in
  the current [SF Symbols app](https://developer.apple.com/sf-symbols/).

Source guidance: https://developer.apple.com/design/human-interface-guidelines/sf-symbols

## Navigation mapping

| Control | Native SF Symbol | Evölingo web equivalent |
|---|---|---|
| Floating sidebar button | `sidebar.left` | Phosphor `SidebarSimple` |
| AI chat | `bubble.left.and.bubble.right` | `ChatCircleDots` |
| Témák | `graduationcap` | `GraduationCap` |
| Könyvtár | `folder` | `Folder` |
| Eszközök | `square.grid.2x2` | `SquaresFour` |
| Ötletbörze | `lightbulb` | `Lightbulb` |
| Profil | `person.crop.circle` | `UserCircle` |
| Új beszélgetés | `square.and.pencil` | `NotePencil` |
| Keresés | `magnifyingglass` | `MagnifyingGlass` |
| Több művelet | `ellipsis` | `DotsThree` |
| Bezárás | `xmark` | `X` |
| Hozzáadás | `plus` | `Plus` |

## Content and composer mapping

| Control | Native SF Symbol | Web equivalent |
|---|---|---|
| Course picker | `graduationcap` | `GraduationCap` |
| Course expand | `chevron.down` | `CaretDown` |
| Topic/lesson forward | `chevron.right` | `CaretRight` |
| Lessons | `books.vertical` | `Books` |
| Read/lesson | `book.closed` | `BookOpen` |
| Folder row | `folder` | `Folder` |
| Document row | `doc` | `File` |
| Text/PDF row | `doc.text` | `FileText` |
| View grid | `square.grid.2x2` | `SquaresFour` |
| View list | `list.bullet` | `List` |
| Cloud storage | `cloud` | `Cloud` |
| Send | `arrow.up` | `ArrowUp` |
| Copy | `doc.on.doc` | `Copy` |
| Microphone | `mic` | `Microphone` |
| Camera | `camera` | `Camera` |
| Gallery | `photo` | `Image` |

## Native example

```swift
import SwiftUI

struct NavigationItem: View {
    let title: String
    let symbol: String
    let isSelected: Bool

    var body: some View {
        Label {
            Text(title)
        } icon: {
            Image(systemName: symbol)
                .symbolRenderingMode(.monochrome)
                .symbolVariant(isSelected ? .fill : .none)
                .font(.system(size: 21, weight: isSelected ? .semibold : .regular))
                .frame(width: 24, height: 24)
        }
        .foregroundStyle(isSelected ? Color.primary : Color.primary.opacity(0.88))
        .frame(minHeight: 44)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// NavigationItem(title: "Könyvtár", symbol: "folder", isSelected: true)
```

## Visual rules

- On mobile, use **21–22 pt visual glyph size** in sidebar rows, 18–20 pt in
  dense menus, and 23–24 pt in the floating sidebar control.
- `regular` for unselected, `fill` or semibold for selected navigation
  (only where the symbol supports an appropriate variant).
- Keep icon color `#202127`, secondary ink `#7C7D84`, and the selected
  surface `#F1F1F3` on white.
- Keep a minimum **44 × 44 pt tap target**. Symbols are decorative when the
  control already has a visible label; the button needs an accessibility name.
- Avoid platform-asset downloads or font embedding as a web fallback.

**Current web code:** `app/app-tab-bar.tsx` (native names as
`nativeSymbol` metadata), `app/reference-screens.tsx`,
`app/library-space.tsx`, and `app/chat-interface.tsx`.
