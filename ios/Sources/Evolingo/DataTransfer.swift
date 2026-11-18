import Foundation
import CryptoKit

extension Notification.Name {
    static let evolingoNativeDataImported = Notification.Name("evolingo.native.data-imported")
}

private struct TransferMessage: Codable, Sendable {
    let role: String
    let content: String
    let id: String?
}

private struct TransferChatSession: Decodable, Sendable {
    let id: String
    let title: String?
    let createdAt: Double?
    let updatedAt: Double?
    let messages: [TransferMessage]
}

private struct TransferTask: Decodable, Sendable {
    let id: String
    let title: String
    let note: String?
    let kind: String
    let repeatRule: String?
    let repeatValue: String?
    let status: String?
    let step: Int?
    let totalSteps: Int?
    let due: String?
    let time: String?
    let createdAt: Double?
    enum CodingKeys: String, CodingKey {
        case id, title, note, kind, status, step, totalSteps, due, time, createdAt, repeatRule
        case repeatValue = "repeat"
    }
}

private struct TransferSpaceEntry: Decodable, Sendable {
    let id: String
    let name: String
    let kind: String
    let parent: String?
}

private struct TransferMachine: Codable, Sendable {
    let id: String
    let name: String
    let url: String
}

private struct TransferProfile: Decodable, Sendable {
    let userName: String?
    let avatarImage: String?
}

private struct TransferPackage: Decodable, Sendable {
    let format: String
    let version: Int
    let chatSessions: [TransferChatSession]?
    let activeChatSessionID: String?
    let legacyChatMessages: [TransferMessage]?
    let coworkMessages: [TransferMessage]?
    let schedule: [TransferTask]?
    let spaceEntries: [TransferSpaceEntry]?
    let spaceBlobs: [String: String]?
    let profile: TransferProfile?
    let integrationInterests: [String]?
    let machines: [TransferMachine]?
}

struct TransferSummary {
    let chats: Int
    let cowork: Int
    let tasks: Int
    let files: Int
    let folders: Int
    let profile: Bool
    let tools: Int

    var message: String {
        "Import kész: \(chats) beszélgetés, \(cowork) Cowork-munkamenet, \(tasks) feladat, \(files) fájl és \(folders) mappa került át; \(tools) eszközadat.\(profile ? " A profiladatok is átkerültek." : "")"
    }
}

@MainActor enum NativeDataTransfer {
    static func importPackage(from url: URL) async throws -> TransferSummary {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let package = try await Task.detached(priority: .userInitiated) { () throws -> TransferPackage in
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            if let size = attributes[.size] as? NSNumber, size.int64Value > 60 * 1024 * 1024 {
                throw TransferError.tooLarge
            }
            let data = try Data(contentsOf: url, options: .mappedIfSafe)
            guard data.count <= 60 * 1024 * 1024 else { throw TransferError.tooLarge }
            return try JSONDecoder().decode(TransferPackage.self, from: data)
        }.value
        guard package.format == "evolingo-ios-transfer", package.version == 1 else { throw TransferError.unsupported }

        let chatCount = try await mergeChats(package.chatSessions ?? [], namespace: "chat", activeID: package.activeChatSessionID)
        var legacyCount = 0
        if let legacy = package.legacyChatMessages, !legacy.isEmpty {
            let fingerprint = fingerprint(legacy)
            let key = "native.evolingo.chat.legacy-transfer-fingerprint"
            if UserDefaults.standard.string(forKey: key) != fingerprint {
                let session = makeSession(id: UUID().uuidString, title: nil, createdAt: nil, updatedAt: nil, messages: legacy)
                legacyCount = try await mergeChats([session], namespace: "chat", activeID: nil)
                if legacyCount > 0 { UserDefaults.standard.set(fingerprint, forKey: key) }
            }
        }

        var coworkCount = 0
        if let messages = package.coworkMessages, !messages.isEmpty {
            let fingerprint = fingerprint(messages)
            let fingerprintKey = "native.evolingo.cowork.transfer-fingerprint"
            if UserDefaults.standard.string(forKey: fingerprintKey) != fingerprint {
                coworkCount = try await mergeChats([
                    TransferChatSession(id: UUID().uuidString, title: nil, createdAt: nil, updatedAt: nil, messages: messages)
                ], namespace: "cowork", activeID: nil)
                if coworkCount > 0 { UserDefaults.standard.set(fingerprint, forKey: fingerprintKey) }
            }
        }

        let tasks = (package.schedule ?? []).compactMap(makeTask)
        let taskCount = await ScheduleModel().importTasks(tasks)
        let libraryResult = await importFiles(entries: package.spaceEntries ?? [], blobs: package.spaceBlobs ?? [:])
        let profileImported = await importProfile(package.profile)
        let toolsCount = try await importTools(interests: package.integrationInterests ?? [], machines: package.machines ?? [])

        NotificationCenter.default.post(name: .evolingoNativeDataImported, object: nil)

        return TransferSummary(chats: chatCount + legacyCount, cowork: coworkCount, tasks: taskCount,
                               files: libraryResult.files, folders: libraryResult.folders,
                               profile: profileImported, tools: toolsCount)
    }

    private static func mergeChats(_ source: [TransferChatSession], namespace: String, activeID: String?) async throws -> Int {
        let sessions = source.compactMap(makeSession)
        do {
            return try await NativeChatStore.shared.merge(
                sessions, namespace: namespace, selectedSessionID: activeID.flatMap(UUID.init(uuidString:))
            )
        } catch {
            throw TransferError.storage
        }
    }

    private static func makeSession(_ item: TransferChatSession) -> ChatSession? {
        let messages = item.messages.suffix(16).compactMap { message -> ChatMessage? in
            guard (message.role == "user" || message.role == "assistant"), message.content.count <= 30000 else { return nil }
            return ChatMessage(role: message.role, content: message.content)
        }
        guard !messages.isEmpty else { return nil }
        let id = UUID(uuidString: item.id) ?? UUID()
        let now = Date()
        let created = item.createdAt.map { Date(timeIntervalSince1970: normalizedTimestamp($0)) } ?? now
        let updated = item.updatedAt.map { Date(timeIntervalSince1970: normalizedTimestamp($0)) } ?? created
        let title = item.title?.trimmingCharacters(in: .whitespacesAndNewlines)
        return ChatSession(id: id, title: title.flatMap { $0.isEmpty ? nil : String($0.prefix(72)) } ?? makeTitle(messages),
                           updatedAt: updated, messages: messages)
    }

    private static func makeSession(id: String, title: String?, createdAt: Double?, updatedAt: Double?, messages: [TransferMessage]) -> TransferChatSession {
        TransferChatSession(id: id, title: title, createdAt: createdAt, updatedAt: updatedAt, messages: messages)
    }

    private static func makeTitle(_ messages: [ChatMessage]) -> String {
        String((messages.first(where: { $0.role == "user" })?.content ?? "Beszélgetés").prefix(48))
    }

    private static func normalizedTimestamp(_ value: Double) -> Double {
        value > 10_000_000_000 ? value / 1000 : value
    }

    private static func fingerprint(_ messages: [TransferMessage]) -> String {
        let hash = SHA256.hash(data: (try? JSONEncoder().encode(messages)) ?? Data())
        return hash.map { String(format: "%02x", $0) }.joined()
    }

    private static func makeTask(_ item: TransferTask) -> NativeTask? {
        let kind: TaskKind
        switch item.kind {
        case "long": kind = .long
        case "scheduled", "reminder": kind = .reminder
        default: return nil
        }
        let title = item.title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return nil }
        let state: TaskState
        switch item.status {
        case "paused": state = .paused
        case "completed": state = .completed
        default: state = .active
        }
        let repeatValue = item.repeatRule ?? item.repeatValue ?? "once"
        let repeatRule: TaskRepeat = repeatValue == "daily" ? .daily : repeatValue == "weekly" ? .weekly : .once
        var dueAt: Date?
        if let day = item.due, !day.isEmpty {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = .current
            formatter.dateFormat = "yyyy-MM-dd HH:mm"
            dueAt = formatter.date(from: "\(day) \(item.time ?? "09:00")")
        }
        let date = item.createdAt.map { Date(timeIntervalSince1970: normalizedTimestamp($0)) } ?? .now
        return NativeTask(id: UUID(uuidString: item.id) ?? UUID(), title: String(title.prefix(100)),
                          note: String((item.note ?? "").prefix(800)), kind: kind, repeatRule: repeatRule,
                          state: state, step: max(0, item.step ?? 0), totalSteps: min(20, max(1, item.totalSteps ?? 1)),
                          dueAt: dueAt, createdAt: date)
    }

    private static func importFiles(entries: [TransferSpaceEntry], blobs: [String: String]) async -> (files: Int, folders: Int) {
        guard !entries.isEmpty else { return (0, 0) }
        var seenIDs = Set<String>()
        let libraryEntries = entries.prefix(5_000).compactMap { entry -> NativeWebLibraryEntry? in
            guard !entry.id.isEmpty, entry.id.count <= 128, entry.name.count <= 512,
                  entry.kind.count <= 32, seenIDs.insert(entry.id).inserted else { return nil }
            var bytes: Data?
            if entry.kind != "folder", let encoded = blobs[entry.id],
               let comma = encoded.firstIndex(of: ","),
               encoded[..<comma].hasSuffix(";base64") {
                let payload = encoded[encoded.index(after: comma)...]
                let maxBase64Bytes = ((20 * 1024 * 1024 + 2) / 3) * 4
                if payload.utf8.count <= maxBase64Bytes,
                   let decoded = Data(base64Encoded: String(payload)), decoded.count <= 20 * 1024 * 1024 {
                    bytes = decoded
                }
            }
            return NativeWebLibraryEntry(id: entry.id, name: entry.name, kind: entry.kind,
                                         parent: entry.parent, data: bytes)
        }
        return await LocalLibraryModel().importWebEntries(Array(libraryEntries))
    }

    private static func importProfile(_ profile: TransferProfile?) async -> Bool {
        guard let name = profile?.userName?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty else { return false }
        let defaults = UserDefaults.standard
        let key = "native.evolingo.profile.name"
        let existing = defaults.string(forKey: key)
        var changed = false
        if existing == nil || existing == "Evölingo vendég" {
            defaults.set(String(name.prefix(32)), forKey: key)
            changed = true
        }
        if let avatar = profile?.avatarImage,
           defaults.string(forKey: "native.evolingo.profile.avatar") == nil {
            let importedAvatar = await NativeAvatarModel.shared.importIfAbsent(dataURI: avatar)
            changed = importedAvatar || changed
        }
        return changed
    }

    private static func importTools(interests: [String], machines: [TransferMachine]) async throws -> Int {
        let defaults = UserDefaults.standard
        let interestKey = "native.evolingo.integration-interest.v1"
        let existingInterests = Set(defaults.stringArray(forKey: interestKey) ?? [])
        let mergedInterests = existingInterests.union(interests)
        defaults.set(Array(mergedInterests), forKey: interestKey)
        let incoming = machines.compactMap { machine -> NativeMachine? in
            guard !machine.id.isEmpty, machine.name.count <= 80,
                  !machine.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let url = NativeHTTPSAddress.validatedURL(machine.url) else { return nil }
            return NativeMachine(id: machine.id, name: machine.name, url: url.absoluteString)
        }
        do {
            let machineCount = try await NativeMachineStore.shared.merge(incoming)
            return mergedInterests.subtracting(existingInterests).count + machineCount
        } catch {
            throw TransferError.storage
        }
    }
}

private enum TransferError: Error, LocalizedError, Sendable {
    case tooLarge
    case unsupported
    case storage
    var errorDescription: String? {
        switch self {
        case .tooLarge: "Az exportfájl nagyobb a megengedett 60 MB-nál."
        case .unsupported: "Ez az exportfájl nem támogatott Evölingo-formátumú."
        case .storage: "A beszélgetési előzményeket nem sikerült biztonságosan menteni."
        }
    }
}
