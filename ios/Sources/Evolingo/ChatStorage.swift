import Foundation

struct StoredChatState: Codable, Sendable {
    var sessions: [ChatSession]
    var currentSessionID: UUID
}

actor NativeChatStore {
    static let shared = NativeChatStore()

    func load(namespace: String) throws -> StoredChatState? {
        let defaults = UserDefaults.standard
        let keys = Keys(namespace: namespace)
        let fileURL = try stateURL(namespace: namespace)
        let fileExists = FileManager.default.fileExists(atPath: fileURL.path)
        var state: StoredChatState?
        if fileExists {
            let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
            state = try JSONDecoder().decode(StoredChatState.self, from: data)
        }
        var changed = false

        if let legacyData = defaults.data(forKey: keys.sessions),
           let legacySessions = try? JSONDecoder().decode([ChatSession].self, from: legacyData) {
            var merged = state?.sessions ?? []
            var ids = Set(merged.map(\.id))
            for session in legacySessions where ids.insert(session.id).inserted {
                merged.append(session)
                changed = true
            }
            if state == nil || changed {
                state = StoredChatState(sessions: merged, currentSessionID: state?.currentSessionID ?? UUID())
            }
        }

        if state == nil {
            let oldMessages = defaults.data(forKey: keys.messages) ?? keys.legacy.flatMap { defaults.data(forKey: $0) }
            if let oldMessages, let messages = try? JSONDecoder().decode([ChatMessage].self, from: oldMessages), !messages.isEmpty {
                let session = ChatSession(id: UUID(), title: "Új beszélgetés", updatedAt: .now, messages: messages)
                state = StoredChatState(sessions: [session], currentSessionID: session.id)
                changed = true
            }
        }

        guard var state else { return nil }
        state.sessions = Array(state.sessions.sorted { $0.updatedAt > $1.updatedAt }.prefix(40))
        let requestedID = defaults.string(forKey: keys.current).flatMap(UUID.init(uuidString:))
        if let requestedID, state.sessions.contains(where: { $0.id == requestedID }) {
            state.currentSessionID = requestedID
        } else if !state.sessions.contains(where: { $0.id == state.currentSessionID }), let first = state.sessions.first {
            state.currentSessionID = first.id
            changed = true
        }

        if changed || !fileExists {
            try write(state, to: fileURL)
        }
        defaults.set(state.currentSessionID.uuidString, forKey: keys.current)
        defaults.removeObject(forKey: keys.sessions)
        defaults.removeObject(forKey: keys.messages)
        if let legacy = keys.legacy { defaults.removeObject(forKey: legacy) }
        return state
    }

    func save(_ state: StoredChatState, namespace: String) throws {
        let fileURL = try stateURL(namespace: namespace)
        try write(state, to: fileURL)
        let keys = Keys(namespace: namespace)
        let defaults = UserDefaults.standard
        defaults.set(state.currentSessionID.uuidString, forKey: keys.current)
        defaults.removeObject(forKey: keys.sessions)
        defaults.removeObject(forKey: keys.messages)
        if let legacy = keys.legacy { defaults.removeObject(forKey: legacy) }
    }

    func merge(_ incoming: [ChatSession], namespace: String, selectedSessionID: UUID?) throws -> Int {
        var state = try load(namespace: namespace) ?? StoredChatState(sessions: [], currentSessionID: UUID())
        var knownIDs = Set(state.sessions.map(\.id))
        let additions = Array(incoming.filter { knownIDs.insert($0.id).inserted }
            .prefix(max(0, 40 - state.sessions.count)))
        state.sessions = Array((additions + state.sessions).sorted { $0.updatedAt > $1.updatedAt }.prefix(40))
        if let selectedSessionID, state.sessions.contains(where: { $0.id == selectedSessionID }) {
            state.currentSessionID = selectedSessionID
        } else if let first = additions.first {
            state.currentSessionID = first.id
        }
        try save(state, namespace: namespace)
        return additions.count
    }

    private func write(_ state: StoredChatState, to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(state)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    private func stateURL(namespace: String) throws -> URL {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
        return root.appendingPathComponent("Evolingo", isDirectory: true)
            .appendingPathComponent("\(namespace)-chats.json", isDirectory: false)
    }

    private struct Keys {
        let sessions: String
        let current: String
        let messages: String
        let legacy: String?

        init(namespace: String) {
            sessions = namespace == "chat" ? "native.evolingo.sessions.v1" : "native.evolingo.\(namespace).sessions.v1"
            current = namespace == "chat" ? "native.evolingo.current-session.v1" : "native.evolingo.\(namespace).current-session.v1"
            messages = namespace == "chat" ? "native.evolingo.chat.v1" : "native.evolingo.\(namespace).messages.v1"
            legacy = namespace == "chat" ? nil : "native.evolingo.\(namespace).v1"
        }
    }
}
