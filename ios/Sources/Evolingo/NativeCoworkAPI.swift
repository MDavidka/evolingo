import Foundation

struct NativeCoworkEvent {
    let type: String
    let sequence: Int
    let payload: [String: Any]
}

struct NativeCoworkConversation: Decodable {
    let id: String
    let title: String
    let updated_at: String?
}

struct NativeCoworkMessage: Decodable {
    let role: String
    let content: String
}

struct NativeCoworkApproval: Identifiable {
    let id: String
    let actionDigest: String
    let toolName: String?
    let summary: String
    let risk: String
}

struct NativeCoworkActivity: Identifiable {
    let id: String
    var toolName: String
    var label: String
    var status: String
    var detail: String?
    var inputSummary: String?
    var durationMs: Int?
    var exitCode: Int?
}

enum NativeStreamTransport {
    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpMaximumConnectionsPerHost = 6
        config.waitsForConnectivity = false
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        config.timeoutIntervalForRequest = 45
        config.timeoutIntervalForResource = 3600
        return URLSession(configuration: config)
    }()

    static func prewarm(url: URL = URL(string: "https://api.sycord.site/api/state")!) {
        var req = URLRequest(url: url)
        req.httpMethod = "HEAD"
        req.timeoutInterval = 8
        session.dataTask(with: req) { _, _, _ in }.resume()
    }
}

@MainActor final class NativeCoworkAPI {
    static let shared = NativeCoworkAPI()
    private let baseURL = URL(string: "https://api.sycord.site")!
    private let session = NativeStreamTransport.session
    private var lastBootstrapAt = Date.distantPast

    private init() {}

    func bootstrapSession(force: Bool = false) async throws {
        if !force, Date().timeIntervalSince(lastBootstrapAt) < 300 { return }
        _ = try await request(path: "/api/state", method: "GET")
        lastBootstrapAt = Date()
    }

    func createConversation(title: String) async throws -> NativeCoworkConversation {
        let data = try await request(path: "/api/cowork/conversations", method: "POST", body: ["title": title])
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let value = object["conversation"] as? [String: Any],
              let id = value["id"] as? String else { throw failure("Beszélgetést nem sikerült létrehozni.") }
        return NativeCoworkConversation(id: id, title: value["title"] as? String ?? title, updated_at: value["updated_at"] as? String)
    }

    func messages(conversationID: String) async throws -> [NativeCoworkMessage] {
        let data = try await request(path: "/api/cowork/conversations/\(escaped(conversationID))/messages", method: "GET")
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let values = object["messages"] as? [[String: Any]] else { return [] }
        return values.compactMap { value in
            guard let role = value["role"] as? String, let content = value["content"] as? String else { return nil }
            return NativeCoworkMessage(role: role, content: content)
        }
    }

    func createRun(conversationID: String, prompt: String, mode: String, idempotencyKey: String) async throws -> String {
        let data = try await request(
            path: "/api/cowork/conversations/\(escaped(conversationID))/runs",
            method: "POST",
            body: ["prompt": prompt, "mode": mode],
            headers: ["Idempotency-Key": idempotencyKey]
        )
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let run = object["run"] as? [String: Any], let id = run["id"] as? String else {
            throw failure("A Cowork-futás nem indult el.")
        }
        return id
    }

    func snapshot(runID: String) async throws -> (sequence: Int, status: String, approvals: [NativeCoworkApproval]) {
        let data = try await request(path: "/api/cowork/runs/\(escaped(runID))/snapshot", method: "GET")
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        let run = object["run"] as? [String: Any] ?? [:]
        var sequence = run["seq_counter"] as? Int ?? 0
        let events = object["events"] as? [[String: Any]] ?? []
        if let terminal = events.first(where: { ["run.completed", "run.failed", "run.cancelled"].contains($0["type"] as? String ?? "") }),
           let terminalSequence = terminal["seq"] as? Int {
            sequence = min(sequence, max(0, terminalSequence - 1))
        }
        let approvalValues = object["approvals"] as? [[String: Any]] ?? []
        let approvals = approvalValues.compactMap { value -> NativeCoworkApproval? in
            guard let id = value["id"] as? String, let digest = value["action_digest"] as? String else { return nil }
            return NativeCoworkApproval(id: id, actionDigest: digest, toolName: value["tool_name"] as? String,
                                        summary: value["summary"] as? String ?? "Engedély szükséges.",
                                        risk: value["risk"] as? String ?? "medium")
        }
        return (sequence, run["status"] as? String ?? "unknown", approvals)
    }

    func stream(runID: String, after sequence: Int = 0, onEvent: (NativeCoworkEvent) -> Void) async throws {
        var components = URLComponents(url: baseURL.appending(path: "/api/cowork/runs/\(escaped(runID))/events"), resolvingAgainstBaseURL: false)!
        if sequence > 0 { components.queryItems = [URLQueryItem(name: "after_seq", value: String(sequence))] }
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.timeoutInterval = 60 * 60
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        if sequence > 0 { request.setValue(String(sequence), forHTTPHeaderField: "Last-Event-ID") }
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw failure("A Cowork-futás eseményei nem érhetők el.")
        }
        for try await line in bytes.lines {
            if Task.isCancelled { break }
            if line.hasPrefix("data: ") {
                let rawData = String(line.dropFirst(6))
                if let event = decodeDataLine(rawData) { onEvent(event) }
            }
        }
    }

    func decide(approval: NativeCoworkApproval, allow: Bool) async throws {
        _ = try await request(path: "/api/cowork/approvals/\(escaped(approval.id))/decision", method: "POST",
                              body: ["decision": allow ? "allow_once" : "deny", "action_digest": approval.actionDigest])
    }

    func cancel(runID: String) async throws {
        _ = try await request(path: "/api/cowork/runs/\(escaped(runID))/cancel", method: "POST")
    }

    private func request(path: String, method: String, body: [String: String]? = nil,
                         headers: [String: String] = [:]) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.timeoutInterval = 30
        request.setValue(baseURL.absoluteString, forHTTPHeaderField: "Origin")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw failure("A szerver válasza nem értelmezhető.") }
        guard (200...299).contains(http.statusCode) else {
            let payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = payload?["error"] as? String
            if http.statusCode == 401 {
                lastBootstrapAt = .distantPast
                throw failure("A Cowork-munkamenetet nem sikerült hitelesíteni.")
            }
            throw failure(message ?? "A Cowork-kérés nem sikerült (\(http.statusCode)).")
        }
        return data
    }

    private func decodeDataLine(_ rawData: String) -> NativeCoworkEvent? {
        guard let data = rawData.data(using: .utf8),
              let envelope = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let type = envelope["type"] as? String else { return nil }
        return NativeCoworkEvent(type: type, sequence: envelope["seq"] as? Int ?? 0,
                                 payload: envelope["payload"] as? [String: Any] ?? [:])
    }

    private func escaped(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/?#"))) ?? value
    }

    private func failure(_ message: String) -> NSError {
        NSError(domain: "NativeCoworkAPI", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}
