import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

enum NativeOnDeviceAgentError: LocalizedError {
    case unavailable

    var errorDescription: String? {
        "A távoli AI-szolgáltatás nem érhető el, és az Apple Intelligence helyi modellje ezen az iPhone-on nem használható."
    }
}

enum NativeOnDeviceAgent {
    static func respond(to messages: [ChatMessage]) async throws -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            guard SystemLanguageModel.default.isAvailable else {
                throw NativeOnDeviceAgentError.unavailable
            }
            let instructions = """
            Te az Arlen alkalmazás segítőkész AI-asszisztense vagy. Válaszolj a felhasználó nyelvén, röviden és pontosan. Ne állítsd, hogy internetes keresést, alkalmazásműveletet vagy külső eszközt használtál. Jelezd, ha valamiben nem vagy biztos.
            """
            let session = LanguageModelSession(instructions: instructions)
            let transcript = messages.suffix(10).map { message in
                "\(message.role == "assistant" ? "Asszisztens" : "Felhasználó"): \(message.content)"
            }.joined(separator: "\n\n")
            let response = try await session.respond(to: transcript)
            let text = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty, text.utf16.count <= 30_000 else {
                throw NativeOnDeviceAgentError.unavailable
            }
            return text
        }
        #endif
        throw NativeOnDeviceAgentError.unavailable
    }
}
