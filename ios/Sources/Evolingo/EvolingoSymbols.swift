import SwiftUI

/// Baseline sizes at the default Dynamic Type setting.
enum EvoSymbolRole: Sendable {
    case standard, navigation, toolbar

    var points: CGFloat {
        switch self {
        case .standard: 20
        case .navigation: 21
        case .toolbar: 17
        }
    }
}

private struct EvoSymbolRoleKey: EnvironmentKey {
    static let defaultValue = EvoSymbolRole.standard
}

private struct EvoSymbolStrokeKey: EnvironmentKey {
    static let defaultValue: CGFloat = 1.75
}

extension EnvironmentValues {
    var evoSymbolRole: EvoSymbolRole {
        get { self[EvoSymbolRoleKey.self] }
        set { self[EvoSymbolRoleKey.self] = newValue }
    }
    var evoSymbolStroke: CGFloat {
        get { self[EvoSymbolStrokeKey.self] }
        set { self[EvoSymbolStrokeKey.self] = newValue }
    }
}

private struct EvoSymbolModifier: ViewModifier {
    let role: EvoSymbolRole
    let weight: Font.Weight
    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 20

    func body(content: Content) -> some View {
        content
            .environment(\.evoSymbolRole, role)
            .environment(\.evoSymbolStroke, weight == .medium ? 2 : 1.75)
            .font(.system(size: min(32, role.points * scale / 20), weight: weight))
            .symbolRenderingMode(.monochrome)
    }
}

extension View {
    /// Inherits foreground styling so destructive, selected, and inverted controls stay readable.
    func evoSymbol(_ role: EvoSymbolRole = .standard, weight: Font.Weight = .regular) -> some View {
        modifier(EvoSymbolModifier(role: role, weight: weight))
    }

    /// Apply to an icon-only control's label, not to decorative/status symbols.
    func evoIconTarget() -> some View {
        frame(minWidth: 44, minHeight: 44)
            .contentShape(Rectangle())
    }
}

/// Keeps native Label behavior, including icon-only toolbars and title-only contexts.
struct EvoSymbolLabel: View {
    private let title: Text
    private let systemImage: String
    private let role: EvoSymbolRole
    @Environment(\.displayScale) private var displayScale
    @Environment(\.layoutDirection) private var direction
    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 20

    nonisolated init(_ title: LocalizedStringKey, systemImage: String, role: EvoSymbolRole = .standard) {
        self.title = Text(title)
        self.systemImage = systemImage
        self.role = role
    }

    nonisolated init<S: StringProtocol>(_ title: S, systemImage: String, role: EvoSymbolRole = .standard) {
        self.title = Text(title)
        self.systemImage = systemImage
        self.role = role
    }

    var body: some View {
        Label { title } icon: {
            EvoIcon.nativeImage(systemName: systemImage, size: min(32, role.points * scale / 20),
                                scale: displayScale, rightToLeft: direction == .rightToLeft)
        }
    }
}

/// App-owned empty-state artwork uses the same CodeX family as the controls.
struct EvoUnavailableView: View {
    private let title: Text
    private let symbol: String
    private let detail: Text?
    @Environment(\.displayScale) private var displayScale

    nonisolated init(_ title: LocalizedStringKey, systemImage: String, description: Text? = nil) {
        self.title = Text(title)
        self.symbol = systemImage
        self.detail = description
    }

    nonisolated init<S: StringProtocol>(_ title: S, systemImage: String, description: Text? = nil) {
        self.title = Text(title)
        self.symbol = systemImage
        self.detail = description
    }

    var body: some View {
        ContentUnavailableView {
            Label { title.font(EvoFont.text(.headline, weight: .semibold)) } icon: {
                EvoIcon.nativeImage(systemName: symbol, size: 32, scale: displayScale)
            }
        } description: {
            if let detail { detail.font(EvoFont.text(.subheadline)) }
        }
    }

    @MainActor static func search(text: String) -> some View {
        EvoUnavailableView("Nincs találat", systemImage: "magnifyingglass",
                           description: Text("Próbálj másik keresést: \(text)"))
    }
}
