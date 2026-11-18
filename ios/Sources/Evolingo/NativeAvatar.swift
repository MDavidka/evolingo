import ImageIO
import CryptoKit
import SwiftUI
import UIKit
import UniformTypeIdentifiers

enum NativeImageProcessor {
    static func normalizedJPEG(from data: Data, inputLimit: Int, pixelLimit: Int,
                               outputLimit: Int, initialQuality: CGFloat,
                               minimumQuality: CGFloat = 0.38, qualityStep: CGFloat = 0.1) -> Data? {
        guard data.count <= inputLimit,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: pixelLimit,
                kCGImageSourceShouldCacheImmediately: true,
              ] as CFDictionary) else { return nil }

        var quality = initialQuality
        while quality >= minimumQuality {
            let output = NSMutableData()
            guard let destination = CGImageDestinationCreateWithData(
                output, UTType.jpeg.identifier as CFString, 1, nil
            ) else { return nil }
            CGImageDestinationAddImage(destination, image, [
                kCGImageDestinationLossyCompressionQuality: quality,
            ] as CFDictionary)
            guard CGImageDestinationFinalize(destination) else { return nil }
            if output.length <= outputLimit { return output as Data }
            quality -= qualityStep
        }
        return nil
    }
}

@MainActor enum NativeAvatarSupport {
    private static let imageCache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 3
        cache.totalCostLimit = 6 * 512 * 512 * 4
        return cache
    }()

    static func image(from data: Data) -> UIImage? {
        guard data.count <= 512 * 1024 else { return nil }
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        let key = digest as NSString
        if let cached = imageCache.object(forKey: key) { return cached }
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 512,
                kCGImageSourceShouldCacheImmediately: true,
              ] as CFDictionary) else { return nil }
        let decoded = UIImage(cgImage: thumbnail)
        imageCache.setObject(decoded, forKey: key, cost: thumbnail.bytesPerRow * thumbnail.height)
        return decoded
    }

    static func normalizedJPEG(from data: Data) async -> Data? {
        await Task.detached(priority: .userInitiated) {
            NativeImageProcessor.normalizedJPEG(from: data, inputLimit: 15 * 1024 * 1024,
                                                pixelLimit: 512, outputLimit: 512 * 1024,
                                                initialQuality: 0.78)
        }.value
    }
}

actor NativeProfileAvatarStore {
    static let shared = NativeProfileAvatarStore()
    private let legacyKey = "native.evolingo.profile.avatar"

    func load() throws -> Data? {
        let url = try fileURL()
        if FileManager.default.fileExists(atPath: url.path) {
            let data = try Data(contentsOf: url, options: .mappedIfSafe)
            UserDefaults.standard.removeObject(forKey: legacyKey)
            return data
        }
        guard let legacy = UserDefaults.standard.string(forKey: legacyKey),
              legacy.utf8.count <= 1024 * 1024,
              let comma = legacy.firstIndex(of: ","),
              legacy[..<comma].lowercased().hasPrefix("data:image/"),
              legacy[..<comma].lowercased().hasSuffix(";base64"),
              let data = Data(base64Encoded: String(legacy[legacy.index(after: comma)])),
              data.count <= 512 * 1024 else { return nil }
        try write(data, to: url)
        UserDefaults.standard.removeObject(forKey: legacyKey)
        return data
    }

    func containsAvatar() throws -> Bool {
        if FileManager.default.fileExists(atPath: try fileURL().path) { return true }
        return UserDefaults.standard.string(forKey: legacyKey) != nil
    }

    func save(_ data: Data) throws {
        try write(data, to: fileURL())
        UserDefaults.standard.removeObject(forKey: legacyKey)
    }

    private func write(_ data: Data, to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    private func fileURL() throws -> URL {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
        return root.appendingPathComponent("Evolingo", isDirectory: true)
            .appendingPathComponent("profile-avatar.jpg", isDirectory: false)
    }
}

@MainActor final class NativeAvatarModel: ObservableObject {
    static let shared = NativeAvatarModel()
    @Published private(set) var image: UIImage?
    @Published private(set) var isLoaded = false
    private var loadingTask: Task<Void, Never>?

    private init() {}

    func reload() async {
        guard !isLoaded else { return }
        if let loadingTask {
            await loadingTask.value
            return
        }
        let task = Task { [weak self] in
            do {
                if let data = try await NativeProfileAvatarStore.shared.load() {
                    self?.image = NativeAvatarSupport.image(from: data)
                }
            } catch {
                self?.image = nil
            }
            self?.isLoaded = true
        }
        loadingTask = task
        await task.value
        loadingTask = nil
    }

    func setImage(from source: Data) async -> Bool {
        guard let jpeg = await NativeAvatarSupport.normalizedJPEG(from: source) else { return false }
        do {
            try await NativeProfileAvatarStore.shared.save(jpeg)
            image = NativeAvatarSupport.image(from: jpeg)
            isLoaded = true
            return image != nil
        } catch { return false }
    }

    func importIfAbsent(dataURI: String) async -> Bool {
        guard !dataURI.isEmpty,
              dataURI.utf8.count <= 3 * 1024 * 1024,
              let comma = dataURI.firstIndex(of: ","),
              dataURI[..<comma].lowercased().hasPrefix("data:image/"),
              dataURI[..<comma].lowercased().hasSuffix(";base64"),
              let source = Data(base64Encoded: String(dataURI[dataURI.index(after: comma)])),
              let jpeg = await NativeAvatarSupport.normalizedJPEG(from: source) else { return false }
        do {
            let exists = try await NativeProfileAvatarStore.shared.containsAvatar()
            guard !exists else { return false }
            try await NativeProfileAvatarStore.shared.save(jpeg)
            image = NativeAvatarSupport.image(from: jpeg)
            isLoaded = true
            return image != nil
        } catch { return false }
    }
}

struct NativeAvatarView: View {
    @ObservedObject var model: NativeAvatarModel
    @AppStorage("native.evolingo.profile.name") private var displayName = "Evölingo vendég"
    let size: CGFloat

    var body: some View {
        Group {
            if let image = model.image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Text(initials).font(size >= 48 ? EvoFont.text(.title3, weight: .semibold) : EvoFont.text(.caption, weight: .semibold))
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(uiColor: .secondarySystemBackground))
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .accessibilityHidden(true)
        .task { await model.reload() }
    }

    private var initials: String {
        displayName.split(whereSeparator: \.isWhitespace).prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
    }
}
