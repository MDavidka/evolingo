// Evolingo native iOS design system — SwiftUI, iOS 17+
// Derived from the Evolingo web UI kit semantic tokens (November 2026).
// Add to the EXISTING Xcode/SwiftPM iOS target; don't replace view models or data stores.
import SwiftUI
import UIKit

private extension Color {
    init(evoRGB value: UInt32) {
        self.init(
            .sRGB,
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255,
            opacity: 1
        )
    }
}

enum EvoTheme {
    enum Palette {
        static let canvas = Color(evoRGB: 0xFFFFFF)
        static let surface = Color(evoRGB: 0xF5F5F7)
        static let surfacePressed = Color(evoRGB: 0xEAEAEE)
        static let raised = Color(evoRGB: 0xFFFFFF)
        static let sidebar = Color(evoRGB: 0xF5F5F7)
        static let ink = Color(evoRGB: 0x1A1B20)
        // Readable secondary copy: high contrast on light backgrounds.
        static let secondary = Color(evoRGB: 0x55565C)
        // 8E8E93 is decorative/tertiary only; not for small informational text.
        static let tertiary = Color(evoRGB: 0x8E8E93)
        static let line = Color(evoRGB: 0xE2E2E8)
        static let lineStrong = Color(evoRGB: 0xC8C8D0)
        static let action = Color(evoRGB: 0x1A1B20)
        static let actionPressed = Color(evoRGB: 0x2E2F36)
        static let onAction = Color.white
        // Evolingo uses a quiet graphite accent. System blue is reserved for external links.
        static let link = Color(evoRGB: 0x2A2B32)
        static let success = Color(evoRGB: 0x1E7E4B)
        static let danger = Color(evoRGB: 0xC63B3B)
        static let activeRow = Color(evoRGB: 0xEEEEF2)
        static let messageUser = Color(evoRGB: 0xF0F1F4)
    }

    enum Symbol {
        // Exact requested colors in light appearance, adaptive readable colors in Dark Mode.
        static let primary = Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor.label.resolvedColor(with: traits)
                : UIColor(red: 24.0 / 255, green: 25.0 / 255, blue: 30.0 / 255, alpha: 1)
        })
        static let secondary = Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor.secondaryLabel.resolvedColor(with: traits)
                : UIColor(red: 90.0 / 255, green: 91.0 / 255, blue: 98.0 / 255, alpha: 1)
        })
    }

    enum Layout {
        static let gutter: CGFloat = 20
        static let gapXS: CGFloat = 4
        static let gapS: CGFloat = 8
        static let gapM: CGFloat = 12
        static let gapL: CGFloat = 16
        static let gapXL: CGFloat = 20
        static let gapXXL: CGFloat = 24
        static let radiusInput: CGFloat = 14
        static let radiusCard: CGFloat = 16
        static let radiusSheet: CGFloat = 26
        static let touch: CGFloat = 44
        static let standardControl: CGFloat = 50
        static let compactControl: CGFloat = 44
        static let toolbarHeight: CGFloat = 56
        static let iconSize: CGFloat = 20
        static let chatMaxWidth: CGFloat = 768
    }

    // SF system text styles automatically honor Dynamic Type.
    enum TypeScale {
        static let title: Font = EvoFont.text(.largeTitle, weight: .bold)
        static let section: Font = EvoFont.text(.title3, weight: .semibold)
        static let row: Font = EvoFont.text(.body, weight: .semibold)
        static let body: Font = EvoFont.text(.body)
        static let supporting: Font = EvoFont.text(.subheadline)
        static let caption: Font = EvoFont.text(.caption)
    }
}

// MARK: - Reusable buttons

struct EvoButtonStyle: ButtonStyle {
    enum Kind { case primary, secondary, tertiary, glass, danger }

    var kind: Kind = .primary
    var compact: Bool = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(compact ? EvoFont.text(.subheadline, weight: .semibold) : EvoFont.text(.body, weight: .semibold))
            .foregroundStyle(foreground)
            .frame(minHeight: compact ? EvoTheme.Layout.compactControl : EvoTheme.Layout.standardControl)
            .padding(.horizontal, compact ? 14 : 20)
            .background {
                if kind == .glass {
                    Capsule(style: .continuous)
                        .fill(.ultraThinMaterial)
                        .overlay(Capsule(style: .continuous).fill(Color.white.opacity(0.48)))
                } else {
                    Capsule(style: .continuous).fill(configuration.isPressed ? pressedBackground : background)
                }
            }
            .overlay(Capsule(style: .continuous).strokeBorder(border, lineWidth: 1))
            .shadow(color: kind == .glass ? Color.black.opacity(0.09) : .clear,
                    radius: kind == .glass ? 12 : 0, y: kind == .glass ? 4 : 0)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
            .contentShape(Capsule())
    }

    private var foreground: Color {
        switch kind {
        case .primary, .danger: return .white
        case .secondary, .tertiary, .glass: return EvoTheme.Palette.ink
        }
    }
    private var background: Color {
        switch kind {
        case .primary: return EvoTheme.Palette.action
        case .secondary: return .white
        case .tertiary: return EvoTheme.Palette.surface
        case .glass: return .white
        case .danger: return EvoTheme.Palette.danger
        }
    }
    private var pressedBackground: Color {
        switch kind {
        case .primary: return EvoTheme.Palette.actionPressed
        case .secondary, .tertiary, .glass: return EvoTheme.Palette.surfacePressed
        case .danger: return EvoTheme.Palette.danger.opacity(0.84)
        }
    }
    private var border: Color {
        switch kind {
        case .secondary: return EvoTheme.Palette.line
        case .glass: return Color.white.opacity(0.65)
        case .primary, .tertiary, .danger: return .clear
        }
    }
}

struct EvoIconButton: View {
    let systemName: String
    let accessibilityText: String
    var isSelected = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            EvoIcon(systemName: systemName).evoSymbol(.standard)
                .foregroundStyle(EvoTheme.Symbol.primary)
                .frame(width: EvoTheme.Layout.touch, height: EvoTheme.Layout.touch)
                .background(isSelected ? EvoTheme.Palette.activeRow : EvoTheme.Palette.raised,
                            in: Circle())
                .overlay(Circle().strokeBorder(EvoTheme.Palette.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityText)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Containers & reusable rows

struct EvoCard<Content: View>: View {
    var inset: CGFloat = 16
    let content: Content

    init(inset: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.inset = inset
        self.content = content()
    }

    var body: some View {
        content
            .padding(inset)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(EvoTheme.Palette.raised,
                        in: RoundedRectangle(cornerRadius: EvoTheme.Layout.radiusCard, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: EvoTheme.Layout.radiusCard, style: .continuous)
                .strokeBorder(EvoTheme.Palette.line, lineWidth: 1))
    }
}

struct EvoNavigationRow: View {
    let title: String
    let symbol: String
    var selected = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                EvoIcon(systemName: symbol).evoSymbol(.navigation)
                    .frame(width: 24)
                Text(title).font(EvoTheme.TypeScale.body)
                Spacer(minLength: 8)
            }
            .foregroundStyle(EvoTheme.Symbol.primary)
            .padding(.horizontal, 14)
            .frame(minHeight: 48)
            .background(selected ? EvoTheme.Palette.activeRow : .clear,
                        in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct EvoSectionHeader: View {
    let title: String
    var body: some View {
        Text(title)
            .font(EvoTheme.TypeScale.section)
            .foregroundStyle(EvoTheme.Symbol.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct EvoChatMessage<Content: View>: View {
    var isFromUser: Bool
    let content: Content

    init(isFromUser: Bool, @ViewBuilder content: () -> Content) {
        self.isFromUser = isFromUser
        self.content = content()
    }

    var body: some View {
        HStack {
            if isFromUser { Spacer(minLength: 44) }
            content
                .font(EvoTheme.TypeScale.body)
                .foregroundStyle(EvoTheme.Symbol.primary)
                .padding(.vertical, isFromUser ? 10 : 0)
                .padding(.horizontal, isFromUser ? 14 : 0)
                .background(isFromUser ? EvoTheme.Palette.messageUser : .clear,
                            in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            if !isFromUser { Spacer(minLength: 0) }
        }
        .frame(maxWidth: EvoTheme.Layout.chatMaxWidth)
    }
}

// Integrate into existing ChatView via .safeAreaInset(edge: .bottom).
// Never use a fixed .overlay(alignment: .bottom) for the keyboard composer.
struct EvoChatComposer: View {
    @Binding var text: String
    var onSend: () -> Void

    private var canSend: Bool { !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Üzenet…", text: $text, axis: .vertical)
                .font(EvoTheme.TypeScale.body)
                .lineLimit(1...5)
                .tint(EvoTheme.Palette.ink)
                .accessibilityLabel("Üzenet")
                .padding(.vertical, 12)
                .padding(.leading, 16)

            Button(action: onSend) {
                EvoIcon(systemName: "arrow.up").evoSymbol(.toolbar, weight: .medium)
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(canSend ? EvoTheme.Palette.action : EvoTheme.Palette.tertiary,
                                in: Circle())
                    .frame(width: EvoTheme.Layout.touch, height: EvoTheme.Layout.touch)
            }
            .disabled(!canSend)
            .accessibilityLabel("Küldés")
            .padding(.trailing, 6)
            .padding(.bottom, 2)
        }
        .background(EvoTheme.Palette.surface,
                    in: RoundedRectangle(cornerRadius: 25, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 25, style: .continuous)
            .strokeBorder(EvoTheme.Palette.line, lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .frame(maxWidth: EvoTheme.Layout.chatMaxWidth)
        .frame(maxWidth: .infinity)
        .background(EvoTheme.Palette.canvas)
    }
}

struct EvoTextInputModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(EvoTheme.TypeScale.body)
            .foregroundStyle(EvoTheme.Symbol.primary)
            .padding(.horizontal, 16)
            .frame(minHeight: EvoTheme.Layout.standardControl)
            .background(EvoTheme.Palette.surface,
                        in: RoundedRectangle(cornerRadius: EvoTheme.Layout.radiusInput))
            .overlay(RoundedRectangle(cornerRadius: EvoTheme.Layout.radiusInput)
                .strokeBorder(EvoTheme.Palette.line, lineWidth: 1))
    }
}

extension View {
    func evoScreenBackground() -> some View {
        self.background(EvoTheme.Palette.canvas.ignoresSafeArea())
    }
    func evoTextInput() -> some View { modifier(EvoTextInputModifier()) }
}
