import Foundation

struct NativeLibraryImportResult: Sendable {
    let files: Int
    let folders: Int
    let failureCount: Int
}

actor NativeLibraryImporter {
    static let shared = NativeLibraryImporter()
    private let defaultsIndexKey = "native.evolingo.library.web-import-index.v1"

    func importEntries(_ entries: [NativeWebLibraryEntry], rootDirectory: URL) throws -> NativeLibraryImportResult {
        let manager = FileManager.default
        try manager.createDirectory(at: rootDirectory, withIntermediateDirectories: true)
        let root = rootDirectory.standardizedFileURL
        let indexURL = try indexFileURL()
        let defaults = UserDefaults.standard
        var index: [String: String]
        if manager.fileExists(atPath: indexURL.path) {
            index = try JSONDecoder().decode([String: String].self, from: Data(contentsOf: indexURL, options: .mappedIfSafe))
        } else {
            index = defaults.dictionary(forKey: defaultsIndexKey) as? [String: String] ?? [:]
        }
        var foldersByID: [String: NativeWebLibraryEntry] = [:]
        for entry in entries where entry.kind == "folder" {
            guard !entry.id.isEmpty, entry.id.count <= 128, foldersByID[entry.id] == nil else { continue }
            foldersByID[entry.id] = entry
        }

        var folderURLs: [String: URL] = [:]
        var resolving = Set<String>()
        var createdFolders = 0
        var failures = 0

        func safeName(_ value: String) -> String {
            let leaf = value.split(separator: "/").last.map(String.init) ?? ""
            let filtered = String(leaf.unicodeScalars.filter {
                !CharacterSet.controlCharacters.contains($0) && $0 != ":" && $0 != "\\"
            }.prefix(180)).trimmingCharacters(in: .whitespacesAndNewlines)
            guard filtered != ".", filtered != ".." else { return "" }
            return filtered
        }

        func isInside(_ url: URL) -> Bool {
            let candidate = url.standardizedFileURL.path
            return candidate == root.path || candidate.hasPrefix(root.path + "/")
        }

        func uniqueURL(_ name: String, in directory: URL) -> URL {
            let initial = directory.appendingPathComponent(name)
            guard manager.fileExists(atPath: initial.path) else { return initial }
            let base = initial.deletingPathExtension().lastPathComponent
            let ext = initial.pathExtension
            var suffix = 2
            while true {
                let candidate = directory.appendingPathComponent("\(base) (\(suffix))\(ext.isEmpty ? "" : ".\(ext)")")
                if !manager.fileExists(atPath: candidate.path) { return candidate }
                suffix += 1
            }
        }

        func indexedURL(for id: String, parent: URL, directory: Bool) -> URL? {
            guard let relative = index[id], !relative.hasPrefix("/"),
                  !relative.split(separator: "/").contains("..") else { return nil }
            let url = root.appendingPathComponent(relative).standardizedFileURL
            guard isInside(url), url.deletingLastPathComponent().standardizedFileURL == parent.standardizedFileURL else { return nil }
            var isDirectory: ObjCBool = false
            guard manager.fileExists(atPath: url.path, isDirectory: &isDirectory), isDirectory.boolValue == directory else { return nil }
            return url
        }

        func remember(_ url: URL, for id: String) {
            let rootPrefix = root.path + "/"
            let path = url.standardizedFileURL.path
            guard path.hasPrefix(rootPrefix) else { return }
            index[id] = String(path.dropFirst(rootPrefix.count))
        }

        func folderURL(for id: String?) -> URL? {
            guard let id, let entry = foldersByID[id] else { return nil }
            if let existing = folderURLs[id] { return existing }
            guard resolving.insert(id).inserted else { return nil }
            let parent = folderURL(for: entry.parent) ?? root
            resolving.remove(id)
            let name = safeName(entry.name)
            guard !name.isEmpty else { failures += 1; return nil }
            if let indexed = indexedURL(for: id, parent: parent, directory: true) {
                folderURLs[id] = indexed
                return indexed
            }
            let destination = uniqueURL(name, in: parent)
            do {
                try manager.createDirectory(at: destination, withIntermediateDirectories: false)
                createdFolders += 1
                folderURLs[id] = destination
                remember(destination, for: id)
                return destination
            } catch {
                failures += 1
                return nil
            }
        }

        for id in foldersByID.keys.sorted() { _ = folderURL(for: id) }
        var createdFiles = 0
        for entry in entries where entry.kind != "folder" {
            guard let data = entry.data, !data.isEmpty, data.count <= 20 * 1024 * 1024 else {
                failures += 1
                continue
            }
            let name = safeName(entry.name)
            guard !name.isEmpty else { failures += 1; continue }
            let parent = folderURL(for: entry.parent) ?? root
            if let indexed = indexedURL(for: entry.id, parent: parent, directory: false),
               (try? Data(contentsOf: indexed, options: .mappedIfSafe)) == data {
                continue
            }
            do {
                let destination = uniqueURL(name, in: parent)
                try data.write(to: destination, options: [.atomic, .completeFileProtectionUnlessOpen])
                createdFiles += 1
                remember(destination, for: entry.id)
            } catch {
                failures += 1
            }
        }

        if index.count > 20_000 {
            index = Dictionary(uniqueKeysWithValues: index.keys.sorted().suffix(20_000).compactMap { key in index[key].map { (key, $0) } })
        }
        do {
            try manager.createDirectory(at: indexURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            let data = try JSONEncoder().encode(index)
            try data.write(to: indexURL, options: [.atomic, .completeFileProtectionUnlessOpen])
            defaults.removeObject(forKey: defaultsIndexKey)
        } catch {
            failures += 1
        }
        return NativeLibraryImportResult(files: createdFiles, folders: createdFolders, failureCount: failures)
    }

    private func indexFileURL() throws -> URL {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
        return root.appendingPathComponent("Evolingo", isDirectory: true)
            .appendingPathComponent("web-library-import-index.json", isDirectory: false)
    }
}

actor NativeLibraryFileSystem {
    static let shared = NativeLibraryFileSystem()

    func saveNote(name: String, text: String, directory: URL) throws -> URL {
        let cleaned = String(name.unicodeScalars.filter {
            !CharacterSet.controlCharacters.contains($0) && $0 != "/" && $0 != "\\" && $0 != ":"
        }.prefix(160)).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty, cleaned != ".", cleaned != ".." else {
            throw CocoaError(.fileWriteInvalidFileName)
        }
        let manager = FileManager.default
        try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        let initial = directory.appendingPathComponent(cleaned)
        var destination = initial
        if manager.fileExists(atPath: initial.path) {
            let base = initial.deletingPathExtension().lastPathComponent
            let ext = initial.pathExtension
            var suffix = 2
            repeat {
                destination = directory.appendingPathComponent("\(base) (\(suffix))\(ext.isEmpty ? "" : ".\(ext)")")
                suffix += 1
            } while manager.fileExists(atPath: destination.path)
        }
        try Data(text.utf8).write(to: destination, options: [.atomic, .completeFileProtectionUnlessOpen])
        return destination
    }

    func permanentlyDelete(_ items: [(id: String, url: URL)]) -> (deleted: Set<String>, failures: Int) {
        var deleted = Set<String>()
        var failures = 0
        for item in items {
            do {
                if FileManager.default.fileExists(atPath: item.url.path) {
                    try FileManager.default.removeItem(at: item.url)
                }
                deleted.insert(item.id)
            } catch {
                failures += 1
            }
        }
        return (deleted, failures)
    }
}

actor NativeTrashStore {
    static let shared = NativeTrashStore()
    private let defaultsKey = "native.evolingo.library.trash.v1"

    func load(trashDirectory: URL) throws -> [LocalTrashItem] {
        let url = try stateURL()
        let manager = FileManager.default
        let fileExists = manager.fileExists(atPath: url.path)
        let records: [LocalTrashItem]
        if fileExists {
            records = try JSONDecoder().decode([LocalTrashItem].self, from: Data(contentsOf: url, options: .mappedIfSafe))
        } else if let oldData = UserDefaults.standard.data(forKey: defaultsKey) {
            records = try JSONDecoder().decode([LocalTrashItem].self, from: oldData)
        } else {
            records = []
        }
        let available = records.filter { manager.fileExists(atPath: trashDirectory.appendingPathComponent($0.id).path) }
            .sorted { $0.trashedAt > $1.trashedAt }
        if !fileExists || available.map(\.id) != records.sorted(by: { $0.trashedAt > $1.trashedAt }).map(\.id) {
            try write(available, to: url)
        }
        UserDefaults.standard.removeObject(forKey: defaultsKey)
        return available
    }

    func save(_ items: [LocalTrashItem]) throws {
        try write(items, to: stateURL())
        UserDefaults.standard.removeObject(forKey: defaultsKey)
    }

    private func write(_ items: [LocalTrashItem], to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(items)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    private func stateURL() throws -> URL {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
        return root.appendingPathComponent("Evolingo", isDirectory: true)
            .appendingPathComponent("library-trash.json", isDirectory: false)
    }
}
