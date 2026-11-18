import SwiftUI
import UIKit

struct CodexVectorLayer {
    let path: Path
    let filled: Bool
    let evenOdd: Bool
}

/// Rasterizes compiled vector paths once per style and display scale for native image controls.
@MainActor enum CodexArtwork {
    private static let cache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 256
        cache.totalCostLimit = 4 * 1024 * 1024
        return cache
    }()

    static func image(symbol: String, size: CGFloat, scale: CGFloat,
                      stroke: CGFloat, rightToLeft: Bool) -> UIImage? {
        guard let name = CodexCatalog.aliases[symbol] else { return nil }
        let mirrors = rightToLeft && ["chevron.left", "chevron.right", "arrow.uturn.backward"].contains(symbol)
        let key = "\(name)|\(size)|\(scale)|\(stroke)|\(mirrors)" as NSString
        if let cached = cache.object(forKey: key) { return cached }
        guard let layers = CodexCatalog.layers(for: name) else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.opaque = false
        format.scale = scale
        let image = UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format).image { context in
            let cg = context.cgContext
            cg.scaleBy(x: size / 24, y: size / 24)
            if mirrors {
                cg.translateBy(x: 24, y: 0)
                cg.scaleBy(x: -1, y: 1)
            }
            cg.setStrokeColor(UIColor.black.cgColor)
            cg.setFillColor(UIColor.black.cgColor)
            cg.setLineWidth(stroke)
            cg.setLineCap(.round)
            cg.setLineJoin(.round)
            for layer in layers {
                cg.addPath(layer.path.cgPath)
                if layer.filled {
                    cg.drawPath(using: layer.evenOdd ? .eoFill : .fill)
                } else {
                    cg.strokePath()
                }
            }
        }.withRenderingMode(.alwaysTemplate)
        let pixels = Int(ceil(size * scale))
        cache.setObject(image, forKey: key, cost: pixels * pixels * 4)
        return image
    }
}

/// Semantic names preserve existing actions and state while drawing Tabler artwork.
struct EvoIcon: View {
    let systemName: String
    @Environment(\.evoSymbolRole) private var role
    @Environment(\.evoSymbolStroke) private var stroke
    @Environment(\.displayScale) private var displayScale
    @Environment(\.layoutDirection) private var layoutDirection
    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 20

    @MainActor static func nativeImage(systemName: String, size: CGFloat = 20,
                                       scale: CGFloat = 3, stroke: CGFloat = 1.75,
                                       rightToLeft: Bool = false) -> Image {
        if let image = CodexArtwork.image(symbol: systemName, size: size, scale: scale,
                                         stroke: stroke, rightToLeft: rightToLeft) {
            return Image(uiImage: image).renderingMode(.template)
        }
        return Image(systemName: systemName)
    }

    var body: some View {
        if let image = CodexArtwork.image(symbol: systemName,
                                          size: min(32, role.points * scale / 20),
                                          scale: displayScale, stroke: stroke,
                                          rightToLeft: layoutDirection == .rightToLeft) {
            Image(uiImage: image).renderingMode(.template)
        } else {
            // Preserve a meaningful control if a future feature introduces an unmapped symbol.
            Image(systemName: systemName)
        }
    }
}
