import SwiftUI
import UIKit
import AVFoundation
import NaturalLanguage

/// Measures short messages at their natural width, wrapping long text at the chat limit.
struct ChatMessageWidth: Layout {
    let maximum: CGFloat
    let contentSized: Bool

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        guard let child = subviews.first else { return .zero }
        let available = max(0, min(maximum, proposal.width ?? maximum))
        let width = contentSized ? min(available, child.sizeThatFits(.unspecified).width) : available
        return child.sizeThatFits(ProposedViewSize(width: width, height: nil))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        subviews.first?.place(at: bounds.origin, anchor: .topLeading,
                             proposal: ProposedViewSize(width: bounds.width, height: bounds.height))
    }
}

@MainActor final class ChatSpeechPlayer: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    @Published private(set) var activeID: UUID?
    private let synthesizer = AVSpeechSynthesizer()
    private var activeUtterance: AVSpeechUtterance?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func toggle(id: UUID, text: String) {
        if activeID == id { stop(); return }
        synthesizer.stopSpeaking(at: .immediate)
        let plainText = (try? AttributedString(markdown: text)).map { String($0.characters) } ?? text
        let utterance = AVSpeechUtterance(string: plainText)
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(plainText)
        if let language = recognizer.dominantLanguage {
            utterance.voice = AVSpeechSynthesisVoice(language: language.rawValue)
        }
        activeUtterance = utterance
        activeID = id
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        activeID = nil
        activeUtterance = nil
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        let finishedID = ObjectIdentifier(utterance)
        Task { @MainActor [weak self] in
            guard let self, let active = self.activeUtterance,
                  ObjectIdentifier(active) == finishedID else { return }
            self.activeID = nil
            self.activeUtterance = nil
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        let finishedID = ObjectIdentifier(utterance)
        Task { @MainActor [weak self] in
            guard let self, let active = self.activeUtterance,
                  ObjectIdentifier(active) == finishedID else { return }
            self.activeID = nil
            self.activeUtterance = nil
        }
    }
}

struct EvoScalePressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct ChatResponseActions: View {
    let message: ChatMessage
    @ObservedObject var speech: ChatSpeechPlayer
    @AppStorage private var feedback: String
    @State private var copied = false
    @State private var showText = false

    init(message: ChatMessage, speech: ChatSpeechPlayer) {
        self.message = message
        self.speech = speech
        _feedback = AppStorage(wrappedValue: "", "native.evolingo.feedback.\(message.id.uuidString)")
    }

    private static let iconColor = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let timestampFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "EEEE h:mm a"
        return f
    }()

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Button {
                UIPasteboard.general.string = message.content
                EvoHaptics.tap()
                copied = true
            } label: {
                EvoIcon(systemName: copied ? "checkmark" : "doc.on.doc")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(copied ? .green : Self.iconColor)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel(copied ? "Copied" : "Copy response")
            .task(id: copied) {
                guard copied else { return }
                try? await Task.sleep(for: .seconds(2))
                guard !Task.isCancelled else { return }
                copied = false
            }

            ShareLink(item: message.content) {
                EvoIcon(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(Self.iconColor)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Share or export response")

            Button {
                EvoHaptics.tap()
                showText = true
            } label: {
                EvoIcon(systemName: "text.cursor")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(Self.iconColor)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Select text")

            Button {
                feedback = feedback == "helpful" ? "" : "helpful"
                EvoHaptics.tap()
            } label: {
                EvoIcon(systemName: feedback == "helpful" ? "hand.thumbsup.fill" : "hand.thumbsup")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(feedback == "helpful" ? EvoTheme.Palette.ink : Self.iconColor)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Helpful")

            Button {
                feedback = feedback == "unhelpful" ? "" : "unhelpful"
                EvoHaptics.tap()
            } label: {
                EvoIcon(systemName: feedback == "unhelpful" ? "hand.thumbsdown.fill" : "hand.thumbsdown")
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(feedback == "unhelpful" ? EvoTheme.Palette.ink : Self.iconColor)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Not helpful")

            Text(Self.timestampFormatter.string(from: message.createdAt ?? Date()))
                .font(EvoFont.sized(11.5, weight: .regular, relativeTo: .caption2))
                .foregroundStyle(Self.iconColor)
                .padding(.leading, 2)

            Spacer(minLength: 0)
        }
        .padding(.top, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        .sheet(isPresented: $showText) {
            NavigationStack {
                ScrollView {
                    Text(message.content)
                        .font(.system(size: 16, weight: .regular))
                        .lineSpacing(7)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(20)
                }
                .navigationTitle("Select Text")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { showText = false }
                    }
                }
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }
}
