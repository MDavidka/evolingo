import SwiftUI
import CoreText
import UIKit

/// Bundled Inter weights, scaled with the corresponding native text style.
enum EvoFont {
    static func text(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        let size: CGFloat
        switch style {
        case .largeTitle: size = 34
        case .title: size = 28
        case .title2: size = 22
        case .title3: size = 20
        case .headline, .body: size = 17
        case .callout: size = 16
        case .subheadline: size = 15
        case .footnote: size = 13
        case .caption: size = 12
        case .caption2: size = 11
        @unknown default: size = 17
        }
        return .custom(name(weight), size: size, relativeTo: style)
    }

    /// Use only when the caller has already scaled its size with @ScaledMetric.
    static func fixed(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom(name(weight), fixedSize: size)
    }

    static func sized(_ size: CGFloat, weight: Font.Weight = .regular,
                      relativeTo style: Font.TextStyle = .body) -> Font {
        .custom(name(weight), size: size, relativeTo: style)
    }

    private static func name(_ weight: Font.Weight) -> String {
        if weight == .bold || weight == .heavy || weight == .black { return "Inter-Bold" }
        if weight == .semibold { return "Inter-SemiBold" }
        if weight == .medium { return "Inter-Medium" }
        return "Inter-Regular"
    }
}

@MainActor enum EvoTypography {
    private static var registered = false

    static func registerFonts() {
        guard !registered else { return }
        registered = true
        for name in ["Inter-Regular", "Inter-Medium", "Inter-SemiBold", "Inter-Bold"] {
            guard let url = Bundle.module.url(forResource: name, withExtension: "ttf") else {
                NSLog("Evolingo: bundled font missing: %@", name)
                continue
            }
            var error: Unmanaged<CFError>?
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error)
            if UIFont(name: name, size: 17) == nil {
                NSLog("Evolingo: font unavailable after registration: %@", name)
            }
        }
    }

    static var licenseText: String {
        guard let url = Bundle.module.url(forResource: "Inter-OFL", withExtension: "txt") else { return "SIL Open Font License 1.1 — Inter Project Authors" }
        return (try? String(contentsOf: url, encoding: .utf8)) ?? "SIL Open Font License 1.1 — Inter Project Authors"
    }
}
