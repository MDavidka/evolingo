import SwiftUI
import UIKit
import PhotosUI
import UniformTypeIdentifiers

@MainActor enum EvoHaptics {
    private static let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private static let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private static let selectionFeedback = UISelectionFeedbackGenerator()
    private static let notificationFeedback = UINotificationFeedbackGenerator()

    static var isEnabled: Bool {
        UserDefaults.standard.object(forKey: "native.evolingo.haptics.enabled") as? Bool ?? true
    }

    static func prepare() {
        guard isEnabled else { return }
        lightImpact.prepare()
        mediumImpact.prepare()
        selectionFeedback.prepare()
        notificationFeedback.prepare()
    }

    static func tap() {
        guard isEnabled else { return }
        lightImpact.impactOccurred()
        lightImpact.prepare()
    }
    static func send() {
        guard isEnabled else { return }
        mediumImpact.impactOccurred()
        mediumImpact.prepare()
    }
    static func selection() {
        guard isEnabled else { return }
        selectionFeedback.selectionChanged()
        selectionFeedback.prepare()
    }
    static func success() {
        guard isEnabled else { return }
        notificationFeedback.notificationOccurred(.success)
        notificationFeedback.prepare()
    }
    static func warning() {
        guard isEnabled else { return }
        notificationFeedback.notificationOccurred(.warning)
        notificationFeedback.prepare()
    }
    static func failure() {
        guard isEnabled else { return }
        notificationFeedback.notificationOccurred(.error)
        notificationFeedback.prepare()
    }
}

@main struct EvolingoApp: App {
    init() {
        EvoTypography.registerFonts()
        UIScrollView.appearance().bounces = true
        UIScrollView.appearance().alwaysBounceVertical = true
    }
    var body: some Scene { WindowGroup { NativeRootView() } }
}

struct NativeChatArtifact: Codable, Identifiable, Equatable, Sendable {
    var id: String
    var title: String
    var kind: String // "link" | "file"
    var target: String
}

struct NativeWebSearchSource: Codable, Identifiable, Equatable, Sendable {
    var id: String
    var title: String
    var url: String
    var domain: String
    var faviconUrl: String? = nil
    var snippet: String
    var publishedAt: String? = nil
    var verifiedPage: Bool? = nil

    static func parseList(_ raw: Any?) -> [NativeWebSearchSource] {
        guard let items = raw as? [[String: Any]] else { return [] }
        return items.enumerated().compactMap { idx, dict in
            guard let title = dict["title"] as? String,
                  let url = dict["url"] as? String,
                  !title.isEmpty, !url.isEmpty else { return nil }
            let domain = (dict["domain"] as? String) ?? (URL(string: url)?.host ?? "web")
            let snippet = (dict["snippet"] as? String) ?? title
            let id = (dict["id"] as? String) ?? "src_\(idx + 1)"
            return NativeWebSearchSource(
                id: id,
                title: title,
                url: url,
                domain: domain,
                faviconUrl: dict["faviconUrl"] as? String,
                snippet: snippet,
                publishedAt: dict["publishedAt"] as? String,
                verifiedPage: dict["verifiedPage"] as? Bool
            )
        }
    }
}

struct NativeWebSearchActivity: Codable, Equatable, Sendable {
    var executionId: String
    var status: String // pending | searching | reviewing | reading | preparing | completed | failed | cancelled
    var title: String
    var queries: [String]
    var activeStepLabel: String? = nil
    var summary: String? = nil
    var sources: [NativeWebSearchSource] = []
    var errorMessage: String? = nil
    var durationMs: Int? = nil

    var isOngoing: Bool {
        status == "pending" || status == "searching" || status == "reviewing" || status == "reading" || status == "preparing"
    }
}

struct ChatMessage: Codable, Identifiable, Sendable {
    var id = UUID()
    var role: String
    var content: String
    var attachmentName: String? = nil
    var plan: NativeAgentPlan? = nil
    var searchActivity: NativeWebSearchActivity? = nil
    var createdAt: Date? = Date()
    var durationSeconds: Int? = nil
    var toolSummary: String? = nil
    var artifacts: [NativeChatArtifact]? = nil
}

enum NativeAgentStepStatus: String, Codable, Sendable {
    case pending, running, completed, error
}

struct NativeAgentSubcommand: Codable, Identifiable, Sendable {
    let id: String
    let label: String
    let status: NativeAgentStepStatus
    var detail: String? = nil
}

struct NativeAgentStep: Codable, Identifiable, Sendable {
    let id: String
    let title: String
    let status: NativeAgentStepStatus
    var detail: String? = nil
    var subcommands: [NativeAgentSubcommand]? = nil
}

struct NativeAgentPlan: Codable, Sendable {
    let id: String
    let title: String
    let steps: [NativeAgentStep]

    static func validated(_ value: Any?) -> NativeAgentPlan? {
        guard let value = value as? [String: Any],
              value["id"] as? String == "plan",
              let title = value["title"] as? String,
              !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              title.count <= 100,
              let rawSteps = value["steps"] as? [[String: Any]], (2...4).contains(rawSteps.count) else { return nil }
        let steps = rawSteps.compactMap { item -> NativeAgentStep? in
            guard let id = item["id"] as? String, !id.isEmpty, id.count <= 40,
                  let title = item["title"] as? String, !title.isEmpty, title.count <= 100,
                  let statusText = item["status"] as? String,
                  let status = NativeAgentStepStatus(rawValue: statusText) else { return nil }
            let detail = (item["detail"] as? String).flatMap { $0.isEmpty ? nil : String($0.prefix(240)) }
            let rawSubs = item["subcommands"] as? [[String: Any]]
            let subcommands = rawSubs?.compactMap { sub -> NativeAgentSubcommand? in
                guard let subID = sub["id"] as? String, !subID.isEmpty,
                      let subLabel = sub["label"] as? String, !subLabel.isEmpty,
                      let subStatusText = sub["status"] as? String,
                      let subStatus = NativeAgentStepStatus(rawValue: subStatusText) else { return nil }
                let subDetail = (sub["detail"] as? String).flatMap { $0.isEmpty ? nil : String($0.prefix(240)) }
                return NativeAgentSubcommand(id: String(subID.prefix(48)), label: String(subLabel.prefix(120)), status: subStatus, detail: subDetail)
            }
            return NativeAgentStep(id: id, title: title, status: status, detail: detail, subcommands: subcommands)
        }
        guard steps.count == rawSteps.count, Set(steps.map(\.id)).count == steps.count else { return nil }
        return NativeAgentPlan(id: "plan", title: title, steps: steps)
    }
}

private struct EvoShimmerText: View {
    let text: String
    var font: Font = EvoFont.sized(15, weight: .medium, relativeTo: .subheadline)
    var baseColor: Color = Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255) // #A1A1A6
    var highlightColor: Color = Color(red: 98.0 / 255, green: 98.0 / 255, blue: 105.0 / 255) // #626269
    var active: Bool = true
    @State private var phase: CGFloat = -0.7
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    private var animate: Bool { active && !systemReduceMotion && !reduceMotion }

    var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(baseColor)
            .overlay {
                if animate {
                    GeometryReader { geo in
                        let w = max(60, geo.size.width)
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.0),
                                .init(color: highlightColor, location: 0.5),
                                .init(color: .clear, location: 1.0),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: w * 0.72)
                        .offset(x: phase * w * 1.65)
                    }
                    .mask(Text(text).font(font))
                    .allowsHitTesting(false)
                }
            }
            .onAppear {
                guard animate else { return }
                phase = -0.7
                withAnimation(.linear(duration: 2.0).repeatForever(autoreverses: false)) {
                    phase = 1.25
                }
            }
            .onChange(of: animate) { _, isNowAnimating in
                if isNowAnimating {
                    phase = -0.7
                    withAnimation(.linear(duration: 2.0).repeatForever(autoreverses: false)) {
                        phase = 1.25
                    }
                } else {
                    phase = -0.7
                }
            }
    }
}

struct NativeInfoMarker: Identifiable, Equatable, Sendable {
    var id: String { phase }
    let phase: String
    let label: String
    let detail: String?
    let symbol: String
    var isActive: Bool
}

/// Backgroundless iOS-style live agent status and disclosure row matching the reference design:
/// Top header row: shimmering status/task label + inline chevron + optional right-aligned underlined "Skip" action.
/// Indented sub-row: thought-bubble or terminal icon + live step/command explanation.
private struct NativeInfoMarkerBanner: View {
    let marker: NativeInfoMarker
    var onSkip: (() -> Void)? = nil
    @State private var isExpanded: Bool = true
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    private static let mutedText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let subtitleText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .center, spacing: 8) {
                Button {
                    EvoHaptics.tap()
                    if systemReduceMotion || reduceMotion {
                        isExpanded.toggle()
                    } else {
                        withAnimation(.easeInOut(duration: 0.21)) {
                            isExpanded.toggle()
                        }
                    }
                } label: {
                    HStack(alignment: .center, spacing: 5) {
                        if marker.isActive {
                            EvoShimmerText(
                                text: marker.label,
                                font: EvoFont.sized(15, weight: .medium, relativeTo: .subheadline),
                                baseColor: Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255),
                                highlightColor: Color(red: 98.0 / 255, green: 98.0 / 255, blue: 105.0 / 255),
                                active: true
                            )
                            .id(marker.label)
                            .transition(.opacity)
                        } else {
                            Text(marker.label)
                                .font(EvoFont.sized(15, weight: .medium, relativeTo: .subheadline))
                                .foregroundStyle(Self.mutedText)
                        }
                        EvoIcon(systemName: "chevron.down")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Self.subtitleText)
                            .frame(width: 14, height: 14)
                            .rotationEffect(.degrees(isExpanded ? 0 : -90))
                            .animation((systemReduceMotion || reduceMotion) ? nil : .easeInOut(duration: 0.20), value: isExpanded)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(EvoScalePressButtonStyle())

                Spacer(minLength: 12)

                if marker.isActive, let onSkip {
                    Button {
                        EvoHaptics.tap()
                        onSkip()
                    } label: {
                        Text("Skip")
                            .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                            .underline()
                            .foregroundStyle(Self.subtitleText)
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(EvoScalePressButtonStyle())
                    .accessibilityLabel("Skip current agent step")
                }
            }
            .animation((systemReduceMotion || reduceMotion) ? nil : .easeInOut(duration: 0.24), value: marker.label)

            if isExpanded {
                HStack(alignment: .top, spacing: 9) {
                    EvoIcon(systemName: subRowSymbol)
                        .evoSymbol(.toolbar, weight: .regular)
                        .foregroundStyle(Self.mutedText)
                        .frame(width: 17, height: 17)
                        .padding(.top, 2)

                    Text(subRowText)
                        .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.mutedText)
                        .lineSpacing(3.5)
                        .fixedSize(horizontal: false, vertical: true)
                        .id(subRowText)
                        .transition(.opacity)
                }
                .padding(.leading, 2)
                .animation((systemReduceMotion || reduceMotion) ? nil : .easeInOut(duration: 0.24), value: subRowText)
            }
        }
        .padding(.vertical, 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }

    private var subRowSymbol: String {
        switch marker.phase {
        case "tool": return "terminal"
        case "analyzing_attachment": return "doc.text"
        default: return "thought.bubble"
        }
    }

    private var subRowText: String {
        if let detail = marker.detail, !detail.isEmpty {
            return detail
        }
        return marker.label
    }
}

/// Backgroundless iOS-style agent task & nested subcommand view matching the reference design:
/// Completed tasks/commands collapse to a clean terminal/thought row; the active task shows a shimmering disclosure header,
/// optional "Skip" button, and indented subtools/explanations below.
private struct NativeAgentPlanView: View {
    let plan: NativeAgentPlan
    var onSkip: (() -> Void)? = nil
    @State private var expanded: Bool = true
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    private static let mutedText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let subtitleText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93

    private var runningStep: NativeAgentStep? {
        plan.steps.first(where: { $0.status == .running })
    }
    private var completedSteps: [NativeAgentStep] {
        plan.steps.filter { $0.status == .completed }
    }
    private var isAllCompleted: Bool {
        !plan.steps.isEmpty && plan.steps.allSatisfy { $0.status == .completed }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if !completedSteps.isEmpty {
                HStack(alignment: .top, spacing: 10) {
                    EvoIcon(systemName: "terminal")
                        .evoSymbol(.toolbar, weight: .regular)
                        .foregroundStyle(Self.mutedText)
                        .frame(width: 17, height: 17)
                        .padding(.top, 2)

                    Text(completedSummaryText)
                        .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.mutedText)
                        .lineSpacing(3.5)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            if let activeStep = runningStep {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(alignment: .center, spacing: 8) {
                        Button {
                            EvoHaptics.tap()
                            if systemReduceMotion || reduceMotion {
                                expanded.toggle()
                            } else {
                                withAnimation(.easeInOut(duration: 0.21)) {
                                    expanded.toggle()
                                }
                            }
                        } label: {
                            HStack(alignment: .center, spacing: 5) {
                                EvoShimmerText(
                                    text: activeStep.title,
                                    font: EvoFont.sized(15, weight: .medium, relativeTo: .subheadline),
                                    baseColor: Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255),
                                    highlightColor: Color(red: 98.0 / 255, green: 98.0 / 255, blue: 105.0 / 255),
                                    active: true
                                )
                                EvoIcon(systemName: "chevron.down")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Self.subtitleText)
                                    .frame(width: 14, height: 14)
                                    .rotationEffect(.degrees(expanded ? 0 : -90))
                                    .animation((systemReduceMotion || reduceMotion) ? nil : .easeInOut(duration: 0.20), value: expanded)
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())

                        Spacer(minLength: 12)

                        if let onSkip {
                            Button {
                                EvoHaptics.tap()
                                onSkip()
                            } label: {
                                Text("Skip")
                                    .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                                    .underline()
                                    .foregroundStyle(Self.subtitleText)
                                    .frame(minWidth: 44, minHeight: 44)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(EvoScalePressButtonStyle())
                            .accessibilityLabel("Skip active task")
                        }
                    }

                    if expanded {
                        VStack(alignment: .leading, spacing: 7) {
                            HStack(alignment: .top, spacing: 9) {
                                EvoIcon(systemName: "thought.bubble")
                                    .evoSymbol(.toolbar, weight: .regular)
                                    .foregroundStyle(Self.mutedText)
                                    .frame(width: 17, height: 17)
                                    .padding(.top, 2)

                                Text(activeStep.detail ?? activeStep.title)
                                    .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                                    .foregroundStyle(Self.mutedText)
                                    .lineSpacing(3.5)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(.leading, 2)

                            if let subs = activeStep.subcommands, !subs.isEmpty {
                                ForEach(subs) { sub in
                                    HStack(alignment: .top, spacing: 9) {
                                        EvoIcon(systemName: "terminal")
                                            .evoSymbol(.toolbar, weight: .regular)
                                            .foregroundStyle(Self.mutedText)
                                            .frame(width: 16, height: 16)
                                            .padding(.top, 2)

                                        VStack(alignment: .leading, spacing: 2) {
                                            if sub.status == .running {
                                                EvoShimmerText(
                                                    text: sub.label,
                                                    font: EvoFont.sized(14, weight: .regular, relativeTo: .subheadline),
                                                    baseColor: Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255),
                                                    highlightColor: Color(red: 98.0 / 255, green: 98.0 / 255, blue: 105.0 / 255),
                                                    active: true
                                                )
                                                if let detail = sub.detail, !detail.isEmpty {
                                                    Text(detail)
                                                        .font(EvoFont.sized(13.5, weight: .regular, relativeTo: .caption))
                                                        .foregroundStyle(Self.mutedText)
                                                        .lineLimit(2)
                                                }
                                            } else {
                                                Text(sub.label)
                                                    .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                                                    .foregroundStyle(Self.mutedText)
                                                    .lineLimit(1)
                                            }
                                        }
                                    }
                                    .padding(.leading, 20)
                                    .transition(.opacity.combined(with: .offset(y: 4)))
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Agent plan: \(plan.title)")
    }

    private var completedSummaryText: String {
        let titles = completedSteps.filter { $0.id != "final" }.map(\.title)
        if titles.isEmpty {
            return "Inspected context and prepared response"
        }
        if titles.count == 1 {
            return titles[0]
        }
        let allButLast = titles.dropLast().joined(separator: ", ")
        return "\(allButLast), and \(titles.last!)"
    }
}

/// Backgroundless iOS-style tool & Bash execution trace matching the reference screenshot:
/// - Completed tool calls collapse to single-line terminal rows (`[>-] Inspected previous library files...`)
/// - Active task header shows subtle shimmering text + disclosure chevron + right-aligned `Skip` control
/// - Indented subtools / Bash commands show live explanations while running and shrink to 1 line when done
private struct NativeToolExecutionCard: View {
    let activities: [NativeCoworkActivity]
    var onSkip: (() -> Void)? = nil
    @State private var isExpanded: Bool = true
    @State private var selectedActivityID: String?
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    private static let mutedText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let subtitleText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93

    private var runningActivities: [NativeCoworkActivity] {
        activities.filter { $0.status == "running" }
    }
    private var primaryRunningActivity: NativeCoworkActivity? {
        runningActivities.last
    }
    private var completedActivities: [NativeCoworkActivity] {
        activities.filter { $0.status != "running" }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !completedActivities.isEmpty {
                let uniqueLabels = Array(NSOrderedSet(array: completedActivities.map(\.label))).compactMap { $0 as? String }
                let compactedText = uniqueLabels.count <= 1
                    ? (uniqueLabels.first ?? "Completed workspace tool")
                    : "\(uniqueLabels.dropLast().joined(separator: ", ")), and \(uniqueLabels.last!)"
                HStack(alignment: .top, spacing: 10) {
                    EvoIcon(systemName: toolSymbol(for: completedActivities.last?.toolName ?? "terminal"))
                        .evoSymbol(.toolbar, weight: .regular)
                        .foregroundStyle(completedActivities.contains(where: { $0.status == "failed" }) ? EvoTheme.Palette.danger : Self.mutedText)
                        .frame(width: 17, height: 17)
                        .padding(.top, 2)

                    Text(compactedText)
                        .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(completedActivities.contains(where: { $0.status == "failed" }) ? EvoTheme.Palette.danger : Self.mutedText)
                        .lineSpacing(3.5)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .animation((systemReduceMotion || reduceMotion) ? nil : .easeOut(duration: 0.20), value: compactedText)
            }

            if let running = primaryRunningActivity {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(alignment: .center, spacing: 8) {
                        Button {
                            EvoHaptics.tap()
                            if systemReduceMotion || reduceMotion {
                                isExpanded.toggle()
                            } else {
                                withAnimation(.easeInOut(duration: 0.21)) {
                                    isExpanded.toggle()
                                }
                            }
                        } label: {
                            HStack(alignment: .center, spacing: 5) {
                                EvoShimmerText(
                                    text: running.label,
                                    font: EvoFont.sized(15, weight: .medium, relativeTo: .subheadline),
                                    baseColor: Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255),
                                    highlightColor: Color(red: 98.0 / 255, green: 98.0 / 255, blue: 105.0 / 255),
                                    active: true
                                )
                                EvoIcon(systemName: "chevron.down")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Self.subtitleText)
                                    .frame(width: 14, height: 14)
                                    .rotationEffect(.degrees(isExpanded ? 0 : -90))
                                    .animation((systemReduceMotion || reduceMotion) ? nil : .easeInOut(duration: 0.20), value: isExpanded)
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())

                        Spacer(minLength: 12)

                        if let onSkip {
                            Button {
                                EvoHaptics.tap()
                                onSkip()
                            } label: {
                                Text("Skip")
                                    .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                                    .underline()
                                    .foregroundStyle(Self.subtitleText)
                                    .frame(minWidth: 44, minHeight: 44)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(EvoScalePressButtonStyle())
                            .accessibilityLabel("Skip running tool")
                        }
                    }

                    if isExpanded {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(runningActivities) { activeItem in
                                HStack(alignment: .top, spacing: 9) {
                                    EvoIcon(systemName: activeItem.id == running.id ? "thought.bubble" : toolSymbol(for: activeItem.toolName))
                                        .evoSymbol(.toolbar, weight: .regular)
                                        .foregroundStyle(Self.mutedText)
                                        .frame(width: 17, height: 17)
                                        .padding(.top, 2)

                                    Text(activeItem.id == running.id ? (activeItem.detail ?? activeItem.inputSummary ?? activeItem.label) : activeItem.label)
                                        .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                                        .foregroundStyle(Self.mutedText)
                                        .lineSpacing(3.5)
                                        .lineLimit(activeItem.id == running.id ? 3 : 1)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                .padding(.leading, 2)
                                .transition(.opacity.combined(with: .offset(y: 4)))
                            }

                            if let input = running.inputSummary, !input.isEmpty, running.detail != nil {
                                HStack(alignment: .top, spacing: 8) {
                                    EvoIcon(systemName: toolSymbol(for: running.toolName))
                                        .evoSymbol(.toolbar, weight: .regular)
                                        .foregroundStyle(Self.mutedText)
                                        .frame(width: 16, height: 16)
                                        .padding(.top, 2)
                                    Text(input)
                                        .font(.system(size: 13, design: .monospaced))
                                        .foregroundStyle(Self.mutedText)
                                        .lineLimit(2)
                                }
                                .padding(.leading, 20)
                                .transition(.opacity.combined(with: .offset(y: 4)))
                            }
                        }
                    }
                }
                .animation((systemReduceMotion || reduceMotion) ? nil : .easeOut(duration: 0.20), value: runningActivities.map(\.id))
            }
        }
        .padding(.vertical, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }

    private func completedSummary(for activity: NativeCoworkActivity) -> String {
        if let detail = activity.detail, !detail.isEmpty, detail != "Completed" {
            return "\(activity.label) — \(detail)"
        }
        return activity.label
    }

    private func toolSymbol(for toolName: String) -> String {
        let lower = toolName.lowercased()
        if lower.contains("bash") || lower.contains("shell") || lower.contains("exec") { return "terminal" }
        if lower.contains("read") || lower.contains("doc") { return "doc.text" }
        if lower.contains("write") || lower.contains("edit") || lower.contains("patch") { return "pencil" }
        if lower.contains("search") || lower.contains("grep") { return "magnifyingglass" }
        if lower.contains("glob") || lower.contains("list") || lower.contains("folder") { return "folder" }
        if lower.contains("vm") || lower.contains("server") { return "server.rack" }
        return "terminal"
    }
}

struct ChatAttachment {
    let name: String
    let kind: String
    let mime: String
    let data: String

    var requestValue: [String: String] {
        ["name": name, "kind": kind, "mime": mime, "data": data]
    }
}

struct ChatSession: Codable, Identifiable, Sendable {
    var id: UUID
    var title: String
    var updatedAt: Date
    var messages: [ChatMessage]
    var remoteID: String? = nil
    var activeRunID: String? = nil
}

/// Compact activity header matching the Working & Verdict Redesign:
/// - In WORKING mode: small text-only gray shimmer `Working` (`#A1A1A6` -> `#626269`, `2.0s` loop).
/// - In VERDICT mode: compact `worked for 1min  ^` (`13pt/18pt` `#8E8E93` with `180°` rotating disclosure chevron).
private struct NativeWorkedHeaderView: View {
    let durationSeconds: Int?
    let isWorking: Bool
    var isExpanded: Bool = false
    var onTap: (() -> Void)? = nil
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    private static let secondaryGray = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let tertiaryGray = Color(red: 174.0 / 255, green: 174.0 / 255, blue: 178.0 / 255) // #AEAEB2

    private var labelText: String {
        if isWorking { return "Working" }
        let secs = max(1, durationSeconds ?? 60)
        if secs < 45 {
            return "worked for \(secs)s"
        }
        let mins = max(1, Int(round(Double(secs) / 60.0)))
        return "worked for \(mins)min"
    }

    var body: some View {
        Button {
            if let onTap {
                EvoHaptics.tap()
                onTap()
            }
        } label: {
            HStack(alignment: .center, spacing: 6) {
                if isWorking {
                    EvoShimmerText(
                        text: labelText,
                        font: EvoFont.sized(14, weight: .medium, relativeTo: .subheadline),
                        baseColor: Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255),
                        highlightColor: Color(red: 98.0 / 255, green: 98.0 / 255, blue: 105.0 / 255),
                        active: true
                    )
                } else {
                    Text(labelText)
                        .font(EvoFont.sized(13.5, weight: .regular, relativeTo: .footnote))
                        .foregroundStyle(Self.secondaryGray)

                    EvoIcon(systemName: "chevron.down")
                        .font(.system(size: 11.5, weight: .medium))
                        .foregroundStyle(Self.tertiaryGray)
                        .frame(width: 14, height: 14)
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .animation((systemReduceMotion || reduceMotion) ? nil : .easeInOut(duration: 0.20), value: isExpanded)
                }
                Spacer(minLength: 0)
            }
            .frame(minWidth: 44, minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(EvoScalePressButtonStyle())
        .accessibilityLabel(isWorking ? "Working" : "\(labelText), double tap to \(isExpanded ? "collapse" : "expand") task history")
    }
}

private struct NativeToolSummaryRow: View {
    let summary: String
    private static let mutedText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            EvoIcon(systemName: "terminal")
                .evoSymbol(.toolbar, weight: .regular)
                .foregroundStyle(Self.mutedText)
                .frame(width: 17, height: 17)
                .padding(.top, 2)

            Text(summary)
                .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                .foregroundStyle(Self.mutedText)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct NativeArtifactLinksView: View {
    let artifacts: [NativeChatArtifact]
    @Environment(\.openURL) private var openURL
    @State private var copiedID: String?

    private static let artifactBlue = Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255) // #3988D5

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            ForEach(artifacts) { item in
                Button {
                    EvoHaptics.tap()
                    if item.kind == "link", let url = URL(string: item.target) {
                        openURL(url)
                    } else {
                        UIPasteboard.general.string = item.target
                        copiedID = item.id
                    }
                } label: {
                    HStack(alignment: .center, spacing: 8) {
                        EvoIcon(systemName: item.kind == "link" ? "globe" : "chevron.left.forwardslash.chevron.right")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Self.artifactBlue)
                            .frame(width: 18, height: 18)

                        Text(copiedID == item.id ? "\(item.title) (Copied)" : item.title)
                            .font(EvoFont.sized(16, weight: .medium, relativeTo: .body))
                            .foregroundStyle(Self.artifactBlue)
                            .lineSpacing(5)
                            .fixedSize(horizontal: false, vertical: true)

                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(EvoScalePressButtonStyle())
            }
        }
        .padding(.top, 2)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private enum NativeVerdictExtractor {
    static func extractVerdict(from raw: String, fallbackToolSummary: String?) -> String {
        let cleaned = raw
            .replacingOccurrences(of: #"(?m)^\s*[-*•]?\s*\[([^\]]+)\]\((https?://[^\s)]+)\)\s*$"#, with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let blocks = cleaned
            .components(separatedBy: "\n\n")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && !$0.hasPrefix("```") }

        guard !blocks.isEmpty else {
            if let summary = fallbackToolSummary, !summary.isEmpty {
                return "Completed the requested workspace operations: \(summary)."
            }
            return "Completed the request and verified the current state."
        }

        // Prefer a concise 1-2 paragraph verdict without dumping entire multi-page logs.
        let substantive = blocks.filter { block in
            let lower = block.lowercased()
            return !lower.hasPrefix("i'll check ") && !lower.hasPrefix("let me check ") && !lower.hasPrefix("checking ")
        }
        let pool = substantive.isEmpty ? blocks : substantive
        if pool.count == 1 {
            return pool[0]
        }
        // If there is an explicit summary/verdict/conclusion section at the end, pick it; otherwise take the core opening + concluding verdict.
        if let lastIdx = pool.lastIndex(where: { $0.range(of: #"(?i)\b(verdict|summary|conclusion|bottom line|összegzés|eredmény|konklúzió)\b"#, options: .regularExpression) != nil }) {
            return pool.suffix(from: lastIdx).prefix(2).joined(separator: "\n\n")
        }
        let first = pool[0]
        if first.count >= 140 || pool.count == 2 {
            return first
        }
        return "\(first)\n\n\(pool[1])"
    }

    static func extractArtifacts(from message: ChatMessage, cowork: Bool, activities: [NativeCoworkActivity]) -> [NativeChatArtifact] {
        var result: [NativeChatArtifact] = message.artifacts ?? []
        var seen = Set(result.map(\.target))

        let text = message.content
        // 1. Markdown links: [Title](https://...)
        if let regex = try? NSRegularExpression(pattern: #"\[([^\]]+)\]\((https?://[^\s)]+)\)"#) {
            let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
            for match in regex.matches(in: text, range: nsRange) {
                if let titleRange = Range(match.range(at: 1), in: text),
                   let urlRange = Range(match.range(at: 2), in: text) {
                    let title = String(text[titleRange]).trimmingCharacters(in: .whitespacesAndNewlines)
                    let url = String(text[urlRange]).trimmingCharacters(in: .whitespacesAndNewlines)
                    if !url.isEmpty, !seen.contains(url) {
                        seen.insert(url)
                        result.append(NativeChatArtifact(id: "link-\(result.count)", title: title.isEmpty ? url : title, kind: "link", target: url))
                    }
                }
            }
        }

        // 2. Bare URLs: https://...
        if let urlRegex = try? NSRegularExpression(pattern: #"https?://[^\s)<>"'`]+"#) {
            let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
            for match in urlRegex.matches(in: text, range: nsRange) {
                if let r = Range(match.range, in: text) {
                    let rawURL = String(text[r]).trimmingCharacters(in: CharacterSet(charactersIn: ".,;:!?"))
                    if !rawURL.isEmpty, !seen.contains(rawURL) {
                        seen.insert(rawURL)
                        let label: String
                        if rawURL.lowercased().hasSuffix(".ipa") {
                            let file = URL(string: rawURL)?.lastPathComponent ?? "Evolingo.ipa"
                            label = "\(file) letöltése"
                        } else if let host = URL(string: rawURL)?.host {
                            let path = URL(string: rawURL)?.lastPathComponent ?? ""
                            label = (!path.isEmpty && path != "/") ? "\(host) · \(path)" : host
                        } else {
                            label = rawURL
                        }
                        result.append(NativeChatArtifact(id: "url-\(result.count)", title: label, kind: "link", target: rawURL))
                    }
                }
            }
        }

        // 3. File / workspace artifacts (`path/to/file.ext` or `/workspace/...`)
        if let fileRegex = try? NSRegularExpression(pattern: #"(?:`([^`\n]+\.(?:ipa|swift|ts|tsx|js|mjs|py|sh|json|md|html|css|yml|yaml|txt))`|(/workspace/[^\s`<>"',;)]+|/var/lib/caddy/downloads/[^\s`<>"',;)]+|/root/[^\s`<>"',;)]+\.ipa))"#) {
            let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
            for match in fileRegex.matches(in: text, range: nsRange) {
                let candidateRange = Range(match.range(at: 1), in: text) ?? Range(match.range(at: 2), in: text)
                if let r = candidateRange {
                    let path = String(text[r]).trimmingCharacters(in: CharacterSet(charactersIn: ".,;:"))
                    if !path.isEmpty, !seen.contains(path) {
                        seen.insert(path)
                        let display: String
                        if path.lowercased().hasSuffix(".ipa") {
                            display = "IPA fájl a munkakönyvtárban (\(URL(fileURLWithPath: path).lastPathComponent))"
                        } else {
                            display = path
                        }
                        result.append(NativeChatArtifact(id: "file-\(result.count)", title: display, kind: "file", target: path))
                    }
                }
            }
        }

        // 4. Activity file paths from Cowork tools
        for act in activities {
            if let input = act.inputSummary, input.hasPrefix("/"), !seen.contains(input) {
                seen.insert(input)
                result.append(NativeChatArtifact(id: "act-\(result.count)", title: input, kind: "file", target: input))
            }
        }

        return Array(result.prefix(6))
    }

    static func toolSummary(for message: ChatMessage, cowork: Bool, activities: [NativeCoworkActivity]) -> String? {
        if let explicit = message.toolSummary, !explicit.isEmpty {
            return explicit
        }
        if let plan = message.plan {
            let titles = plan.steps.filter { $0.id != "final" }.map(\.title)
            if !titles.isEmpty {
                if titles.count == 1 { return titles[0] }
                return "\(titles.dropLast().joined(separator: ", ")), and \(titles.last!)"
            }
        }
        let done = activities.filter { $0.status != "running" }
        if !done.isEmpty {
            let labels = Array(NSOrderedSet(array: done.map(\.label))).compactMap { $0 as? String }
            if labels.count == 1 { return labels[0] }
            if labels.count > 1 {
                return "\(labels.dropLast().joined(separator: ", ")), and \(labels.last!)"
            }
        }
        if cowork {
            return "Inspected previous library files, extracted sources, and project configuration"
        }
        return nil
    }
}

private struct ChatTopProgressiveBlurOverlay: View {
    var height: CGFloat = 134

    var body: some View {
        ZStack(alignment: .top) {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask(
                    LinearGradient(
                        stops: [
                            .init(color: .black, location: 0.0),
                            .init(color: .black.opacity(0.85), location: 0.42),
                            .init(color: .black.opacity(0.25), location: 0.78),
                            .init(color: .clear, location: 1.0),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            LinearGradient(
                stops: [
                    .init(color: Color.white.opacity(0.95), location: 0.0),
                    .init(color: Color.white.opacity(0.82), location: 0.44),
                    .init(color: Color.white.opacity(0.38), location: 0.78),
                    .init(color: Color.white.opacity(0.0), location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .frame(height: height)
        .frame(maxWidth: .infinity)
        .ignoresSafeArea(.container, edges: .top)
        .allowsHitTesting(false)
    }
}

private struct NativeMarkdownText: View {
    let value: String
    @ScaledMetric(relativeTo: .body) private var fontSize: CGFloat = 17.0
    @State private var revealed = false
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    private static let primaryInk = Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255) // #202127
    private static let secondaryCode = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let linkBlue = Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255) // #3988D5

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, para in
                if para.hasPrefix("```") {
                    codeBlock(para)
                } else {
                    Text(styledParagraph(para))
                        .font(.system(size: fontSize, weight: .regular))
                        .foregroundStyle(Self.primaryInk)
                        .tint(Self.linkBlue)
                        .lineSpacing(8.5)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .opacity(revealed || systemReduceMotion || reduceMotion ? 1 : 0.0)
        .onAppear {
            guard !systemReduceMotion, !reduceMotion else { revealed = true; return }
            withAnimation(.easeOut(duration: 0.24)) {
                revealed = true
            }
        }
    }

    private func styledParagraph(_ raw: String) -> AttributedString {
        // Transform inline file/artifact code spans like `cowork-audit.md` or `Evolingo.ipa` into `</> filename.ext`
        let filePreprocessed = raw.replacingOccurrences(
            of: #"`([^`\n]+\.(?:ipa|md|swift|ts|tsx|js|mjs|py|sh|json|html|css|yml|yaml|txt|pdf|zip|sql|plist))`"#,
            with: "`</> $1`",
            options: .regularExpression
        )
        guard var attr = try? AttributedString(markdown: filePreprocessed, options: .init(interpretedSyntax: .full)) else {
            return AttributedString(raw)
        }
        for run in attr.runs {
            let range = run.range
            if run.link != nil {
                attr[range].foregroundColor = Self.linkBlue
            } else if run.inlinePresentationIntent?.contains(.code) == true {
                let textSlice = String(attr[range].characters)
                if textSlice.hasPrefix("</> ") || textSlice.contains(".ipa") || textSlice.contains(".md") {
                    attr[range].foregroundColor = Self.linkBlue
                    attr[range].font = .system(size: fontSize, weight: .medium)
                } else {
                    attr[range].foregroundColor = Self.secondaryCode
                    attr[range].font = .system(size: fontSize - 0.5, weight: .regular)
                }
            } else if run.inlinePresentationIntent?.contains(.stronglyEmphasized) == true {
                attr[range].font = .system(size: fontSize, weight: .semibold)
                attr[range].foregroundColor = Self.primaryInk
            }
        }
        return attr
    }

    private var paragraphs: [String] {
        value.components(separatedBy: "\n\n").filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private func codeBlock(_ raw: String) -> some View {
        let lines = raw.components(separatedBy: .newlines)
        let body = lines.dropFirst().dropLast(raw.hasSuffix("```") ? 1 : 0).joined(separator: "\n")
        return Text(body)
            .font(.system(size: 13.5, weight: .regular, design: .monospaced))
            .foregroundStyle(Self.primaryInk)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(EvoTheme.Palette.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct ChatBottomYPreferenceKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

private struct ChatWelcomeView: View {
    let choosePrompt: (String) -> Void

    private let prompts: [(title: String, symbol: String, text: String)] = [
        ("Grammar & Writing", "text.book.closed.fill", "Help review and polish my draft."),
        ("Explain Simply", "sparkles", "Explain a complex concept with clear, simple examples."),
        ("Weekly Planning", "calendar.badge.clock", "Help organize my tasks and schedule for the week.")
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    EvoIcon(systemName: "sparkles")
                        .evoSymbol(.standard, weight: .semibold)
                        .foregroundStyle(EvoTheme.Palette.link)
                    Text("Arlen AI")
                        .font(EvoFont.text(.caption, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(0.5)
                        .foregroundStyle(EvoTheme.Palette.secondary)
                }
                Text("How can I help you today?")
                    .font(EvoFont.text(.largeTitle, weight: .semibold))
                    .foregroundStyle(EvoTheme.Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Choose a suggested topic below or ask anything to get started.")
                    .font(EvoFont.text(.subheadline))
                    .foregroundStyle(EvoTheme.Palette.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.bottom, 6)

            VStack(spacing: 10) {
                ForEach(prompts, id: \.title) { prompt in
                    Button {
                        EvoHaptics.tap()
                        choosePrompt(prompt.text)
                    } label: {
                        HStack(spacing: 12) {
                            EvoIcon(systemName: prompt.symbol)
                                .evoSymbol(.toolbar, weight: .medium)
                                .foregroundStyle(EvoTheme.Palette.link)
                                .frame(width: 28, height: 28)
                                .background(EvoTheme.Palette.surfacePressed, in: Circle())
                            Text(prompt.title)
                                .font(EvoFont.text(.body, weight: .medium))
                                .foregroundStyle(EvoTheme.Palette.ink)
                            Spacer(minLength: 8)
                            EvoIcon(systemName: "arrow.up.left")
                                .evoSymbol(.toolbar, weight: .medium)
                                .foregroundStyle(EvoTheme.Palette.secondary)
                        }
                        .padding(.horizontal, 16)
                        .frame(minHeight: 52)
                        .background(EvoTheme.Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(EvoTheme.Palette.line, lineWidth: 1))
                        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("A javaslat bekerül az üzenetmezőbe; küldés előtt szerkesztheted.")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 32)
        .accessibilityElement(children: .contain)
    }
}

private struct FailedChatRequest {
    let text: String
    let attachment: ChatAttachment?
}

@MainActor final class ChatModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published private(set) var sessions: [ChatSession] = []
    @Published private(set) var currentSessionID = UUID()
    @Published private(set) var isRestoring = true
    @Published private(set) var storageUnavailable = false
    @Published var draft = ""
    @Published var loading = false
    @Published var error: String?
    @Published var agentMode = "auto"
    @Published var attachment: ChatAttachment?
    @Published private(set) var failedMessageIDs: Set<UUID> = []
    @Published private(set) var retryUnavailableMessageIDs: Set<UUID> = []
    @Published private(set) var coworkActivities: [NativeCoworkActivity] = []
    @Published private(set) var coworkApprovals: [NativeCoworkApproval] = []
    @Published private(set) var activeCoworkRunID: String?
    @Published private(set) var activeMarker: NativeInfoMarker?
    private var coworkMessageIDs: [String: UUID] = [:]
    private var coworkPendingText: [String: String] = [:]
    private var coworkQueuedPrompts: [(originalDraft: String, attachment: ChatAttachment?, userMessage: ChatMessage)] = []
    private var coworkLastRenderedAt = Date.distantPast
    private var coworkRunTerminal = false
    private var cancelCoworkWhenStarted = false
    private let namespace: String
    private var pendingReload = false
    private var persistenceTask: Task<Void, Never>?
    private var failedRequests: [UUID: FailedChatRequest] = [:]
    private var failedRequestOrder: [UUID] = []
    init(namespace: String = "chat") {
        self.namespace = namespace
        if namespace == "cowork" { agentMode = "auto" }
        let initial = ChatSession(id: currentSessionID, title: "Új beszélgetés", updatedAt: .now, messages: [])
        sessions = [initial]
    }
    func save() {
        if messages.count > 16 { messages = Array(messages.suffix(16)) }
        guard !messages.isEmpty else {
            sessions.removeAll { $0.id == currentSessionID }
            persist()
            return
        }
        let firstPrompt = messages.first(where: { $0.role == "user" })?.content
        let title = firstPrompt.map { String($0.split(whereSeparator: \.isNewline).joined(separator: " ").prefix(48)) } ?? "Új beszélgetés"
        if let index = sessions.firstIndex(where: { $0.id == currentSessionID }) {
            sessions[index].messages = messages
            sessions[index].title = title
            sessions[index].updatedAt = Date()
        } else {
            sessions.insert(ChatSession(id: currentSessionID, title: title, updatedAt: Date(), messages: messages), at: 0)
        }
        sessions.sort { $0.updatedAt > $1.updatedAt }
        if sessions.count > 40 { sessions = Array(sessions.prefix(40)) }
        persist()
    }
    func restoreFromDisk() async {
        guard isRestoring else { return }
        await reloadFromDisk()
        isRestoring = false
    }

    func restoreCowork() async {
        guard namespace == "cowork", !isRestoring, !loading else { return }
        do {
            try await NativeCoworkAPI.shared.bootstrapSession()
            guard let index = sessions.firstIndex(where: { $0.id == currentSessionID }),
                  let conversationID = sessions[index].remoteID,
                  let runID = sessions[index].activeRunID else { return }
            let remoteMessages = try await NativeCoworkAPI.shared.messages(conversationID: conversationID)
            if !remoteMessages.isEmpty {
                messages = remoteMessages.filter { $0.role == "user" || $0.role == "assistant" }
                    .map { ChatMessage(role: $0.role, content: $0.content) }
                save()
            }
            let snapshot = try await NativeCoworkAPI.shared.snapshot(runID: runID)
            if ["completed", "failed", "cancelled", "interrupted"].contains(snapshot.status) {
                try await refreshCoworkMessages(conversationID: conversationID)
                setActiveRun(nil)
                return
            }
            coworkApprovals = snapshot.approvals
            activeCoworkRunID = runID
            coworkRunTerminal = false
            loading = true
            try await NativeCoworkAPI.shared.stream(runID: runID, after: snapshot.sequence) { [weak self] event in
                self?.applyCoworkEvent(event)
            }
            try await refreshCoworkMessages(conversationID: conversationID)
            activeCoworkRunID = nil
            setActiveRun(nil)
            coworkApprovals = []
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    func decideCoworkApproval(_ approval: NativeCoworkApproval, allow: Bool) async {
        do {
            try await NativeCoworkAPI.shared.decide(approval: approval, allow: allow)
            coworkApprovals.removeAll { $0.id == approval.id }
            EvoHaptics.success()
        } catch {
            self.error = error.localizedDescription
            EvoHaptics.failure()
        }
    }

    func cancelCoworkRun() {
        guard namespace == "cowork" else { return }
        guard let runID = activeCoworkRunID else { cancelCoworkWhenStarted = true; return }
        Task {
            do { try await NativeCoworkAPI.shared.cancel(runID: runID) }
            catch { self.error = error.localizedDescription; EvoHaptics.failure() }
        }
    }

    func cancelActiveSend() {
        if namespace == "cowork" {
            cancelCoworkRun()
        }
        loading = false
        activeMarker = nil
    }

    func retryRestore() async {
        guard storageUnavailable else { return }
        storageUnavailable = false
        isRestoring = true
        await reloadFromDisk()
        isRestoring = false
    }

    func reloadFromDisk() async {
        guard !loading else { pendingReload = true; return }
        await persistenceTask?.value
        do {
            guard let restored = try await NativeChatStore.shared.load(namespace: namespace) else { return }
            sessions = restored.sessions
            currentSessionID = restored.currentSessionID
            messages = sessions.first(where: { $0.id == currentSessionID })?.messages ?? []
            if sessions.isEmpty {
                sessions = [ChatSession(id: currentSessionID, title: "Új beszélgetés", updatedAt: .now, messages: [])]
            }
            storageUnavailable = false
            error = nil
        } catch {
            storageUnavailable = false
        }
    }
    private func persist() {
        guard !storageUnavailable else { return }
        let snapshot = StoredChatState(sessions: sessions, currentSessionID: currentSessionID)
        let namespace = namespace
        let previous = persistenceTask
        persistenceTask = Task { [weak self] in
            await previous?.value
            do {
                try await NativeChatStore.shared.save(snapshot, namespace: namespace)
            } catch {
                guard let self else { return }
                self.error = "A beszélgetést nem sikerült biztonságosan elmenteni."
                EvoHaptics.failure()
            }
        }
    }
    private func setRemoteConversationID(_ remoteID: String) {
        guard let index = sessions.firstIndex(where: { $0.id == currentSessionID }) else { return }
        sessions[index].remoteID = remoteID
        persist()
    }
    private func setActiveRun(_ runID: String?) {
        guard let index = sessions.firstIndex(where: { $0.id == currentSessionID }) else { return }
        sessions[index].activeRunID = runID
        persist()
    }
    private func refreshCoworkMessages(conversationID: String, runDurationSeconds: Int? = nil, runToolSummary: String? = nil) async throws {
        let remoteMessages = try await NativeCoworkAPI.shared.messages(conversationID: conversationID)
        let filtered = remoteMessages.filter { $0.role == "user" || $0.role == "assistant" }
        // Collapse consecutive assistant messages within a single turn into the final verdict message.
        var collapsed: [ChatMessage] = []
        for item in filtered {
            if item.role == "assistant", let lastIndex = collapsed.indices.last, collapsed[lastIndex].role == "assistant" {
                collapsed[lastIndex].content = item.content
            } else {
                collapsed.append(ChatMessage(role: item.role, content: item.content))
            }
        }
        if let lastIdx = collapsed.lastIndex(where: { $0.role == "assistant" }) {
            if let runDurationSeconds { collapsed[lastIdx].durationSeconds = max(1, runDurationSeconds) }
            if let runToolSummary, !runToolSummary.isEmpty { collapsed[lastIdx].toolSummary = runToolSummary }
        }
        messages = collapsed
        save()
    }
    private func applyCoworkEvent(_ event: NativeCoworkEvent) {
        let payload = event.payload
        switch event.type {
        case "run.queued":
            activeMarker = NativeInfoMarker(phase: "queued", label: "Working", detail: "Preparing Incus VM workspace", symbol: "thought.bubble", isActive: true)
        case "run.started":
            let mode = (payload["mode"] as? String) ?? agentMode
            activeMarker = NativeInfoMarker(phase: "started", label: mode == "plan" ? "Planning" : "Working", detail: mode == "plan" ? "Inspecting context and structuring tasks" : "Executing Cowork agent session", symbol: "thought.bubble", isActive: true)
        case "message.started":
            guard let remoteID = payload["message_id"] as? String else { return }
            activeMarker = NativeInfoMarker(phase: "streaming", label: "Working", detail: "Drafting response", symbol: "thought.bubble", isActive: true)
            coworkPendingText[remoteID] = ""
            if let lastIndex = messages.indices.last, messages[lastIndex].role == "assistant" {
                coworkMessageIDs[remoteID] = messages[lastIndex].id
            } else {
                let message = ChatMessage(role: "assistant", content: "")
                coworkMessageIDs[remoteID] = message.id
                messages.append(message)
            }
        case "message.delta":
            guard let delta = payload["text_delta"] as? String, !delta.isEmpty else { return }
            let remoteID = payload["message_id"] as? String ?? "default"
            let current = (coworkPendingText[remoteID] ?? "") + delta
            coworkPendingText[remoteID] = current
            let now = Date()
            if coworkMessageIDs[remoteID] == nil {
                if let lastIndex = messages.indices.last, messages[lastIndex].role == "assistant" {
                    coworkMessageIDs[remoteID] = messages[lastIndex].id
                    messages[lastIndex].content = current
                } else {
                    let message = ChatMessage(role: "assistant", content: current)
                    coworkMessageIDs[remoteID] = message.id
                    messages.append(message)
                }
                coworkLastRenderedAt = now
                activeMarker = NativeInfoMarker(phase: "streaming", label: "Working", detail: "Writing response", symbol: "thought.bubble", isActive: true)
            } else if now.timeIntervalSince(coworkLastRenderedAt) >= 0.025,
                      let id = coworkMessageIDs[remoteID],
                      let index = messages.firstIndex(where: { $0.id == id }) {
                messages[index].content = current
                coworkLastRenderedAt = now
            }
        case "message.completed":
            let parts = payload["parts"] as? [[String: Any]] ?? []
            let text = parts.filter { $0["type"] as? String == "text" }.compactMap { $0["text"] as? String }.joined()
            let remoteID = payload["message_id"] as? String ?? "default"
            let finalContent = !text.isEmpty ? text : (coworkPendingText[remoteID] ?? "")
            if !finalContent.isEmpty {
                coworkPendingText[remoteID] = finalContent
                if let id = coworkMessageIDs[remoteID], let index = messages.firstIndex(where: { $0.id == id }) { messages[index].content = finalContent }
                else if let index = messages.lastIndex(where: { $0.role == "assistant" }) { messages[index].content = finalContent }
                else { messages.append(ChatMessage(role: "assistant", content: finalContent)) }
            }
        case "tool.started":
            let id = payload["tool_call_id"] as? String ?? UUID().uuidString
            let toolName = payload["name"] as? String ?? "tool"
            let label = payload["safe_label"] as? String ?? toolName
            var inputSummary: String?
            if let args = payload["args_redacted"] as? [String: Any] {
                if let cmd = args["command"] as? String, !cmd.isEmpty { inputSummary = "$ " + cmd }
                else if let path = (args["path"] as? String) ?? (args["filePath"] as? String), !path.isEmpty { inputSummary = path }
                else if let query = (args["query"] as? String) ?? (args["pattern"] as? String), !query.isEmpty { inputSummary = "query: " + query }
            }
            activeMarker = NativeInfoMarker(phase: "tool", label: label, detail: toolName, symbol: "terminal", isActive: true)
            coworkActivities.removeAll { $0.id == id || ($0.toolName == toolName && $0.label == label && $0.inputSummary == inputSummary && $0.status == "running") }
            coworkActivities.append(NativeCoworkActivity(
                id: id,
                toolName: toolName,
                label: label,
                status: "running",
                detail: nil,
                inputSummary: inputSummary,
                durationMs: nil,
                exitCode: nil
            ))
        case "tool.output":
            let id = payload["tool_call_id"] as? String ?? ""
            if let delta = payload["text_delta"] as? String, !delta.isEmpty,
               let index = coworkActivities.firstIndex(where: { $0.id == id }) {
                let existing = coworkActivities[index].detail ?? ""
                coworkActivities[index].detail = String((existing + delta).suffix(600))
            }
        case "tool.completed", "tool.failed":
            let id = payload["tool_call_id"] as? String ?? ""
            if let index = coworkActivities.firstIndex(where: { $0.id == id }) {
                coworkActivities[index].status = event.type == "tool.completed" ? "completed" : "failed"
                coworkActivities[index].detail = payload[event.type == "tool.completed" ? "result_summary" : "safe_message"] as? String
                coworkActivities[index].durationMs = payload["duration_ms"] as? Int
                coworkActivities[index].exitCode = payload["exit_code"] as? Int
            }
            if coworkActivities.allSatisfy({ $0.status != "running" }) {
                activeMarker = NativeInfoMarker(phase: "synthesizing", label: "Working", detail: "Synthesizing tool results", symbol: "thought.bubble", isActive: true)
            }
        case "approval.required":
            guard let id = payload["approval_id"] as? String, let digest = payload["action_digest"] as? String else { return }
            activeMarker = NativeInfoMarker(phase: "approval", label: "Waiting for approval", detail: payload["summary"] as? String ?? (payload["tool_name"] as? String), symbol: "lock.shield", isActive: true)
            coworkApprovals.removeAll { $0.id == id }
            coworkApprovals.append(NativeCoworkApproval(id: id, actionDigest: digest,
                toolName: payload["tool_name"] as? String, summary: payload["summary"] as? String ?? "Engedély szükséges.",
                risk: payload["risk"] as? String ?? "medium"))
        case "approval.resolved":
            if let id = payload["approval_id"] as? String { coworkApprovals.removeAll { $0.id == id } }
            activeMarker = NativeInfoMarker(phase: "running", label: "Working", detail: "Resuming session", symbol: "thought.bubble", isActive: true)
        case "run.status":
            let status = payload["status"] as? String ?? ""
            if status == "interrupted" {
                coworkRunTerminal = true
                activeMarker = nil
                error = "A Cowork-futás megszakadt. Küldd el újra az üzenetet."
            } else if status == "verifying" {
                activeMarker = NativeInfoMarker(phase: "verifying", label: "Verifying", detail: "Checking output consistency", symbol: "thought.bubble", isActive: true)
            } else if status == "running" {
                activeMarker = NativeInfoMarker(phase: "running", label: "Working", detail: "Executing agent steps", symbol: "thought.bubble", isActive: true)
            }
        case "run.completed":
            coworkRunTerminal = true
            activeMarker = nil
        case "run.failed":
            coworkRunTerminal = true
            activeMarker = nil
            error = payload["safe_error"] as? String ?? "A Cowork-futás nem sikerült."
        case "run.cancelled":
            coworkRunTerminal = true
            activeMarker = nil
            error = "A Cowork-futás leállítva."
        default: break
        }
    }
    private func performCoworkSend(originalDraft: String, attachment sentAttachment: ChatAttachment?, userMessage: ChatMessage) async {
        defer {
            loading = false
            activeMarker = nil
            if pendingReload { pendingReload = false; Task { await reloadFromDisk() } }
        }
        activeMarker = NativeInfoMarker(phase: "connecting", label: "Kapcsolódás a munkakörnyezethez…", detail: "Cowork VM", symbol: "server.rack", isActive: true)
        do {
            try await NativeCoworkAPI.shared.bootstrapSession()
            var conversationID = sessions.first(where: { $0.id == currentSessionID })?.remoteID
            if conversationID == nil {
                let conversation = try await NativeCoworkAPI.shared.createConversation(title: String(userMessage.content.prefix(80)))
                conversationID = conversation.id
                setRemoteConversationID(conversation.id)
            }
            guard let conversationID else { throw NSError(domain: "NativeCoworkAPI", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cowork-beszélgetés nem érhető el."]) }
            if sentAttachment?.kind == "image" {
                throw NSError(domain: "NativeCoworkAPI", code: 2, userInfo: [NSLocalizedDescriptionKey: "A Cowork jelenleg szöveges mellékleteket támogat."])
            }
            var prompt = userMessage.content
            if let attachment = sentAttachment {
                prompt += "\n\nAttached file: \(attachment.name)\n```\n\(attachment.data)\n```"
            }
            guard prompt.count <= 12_000 else { throw NSError(domain: "NativeCoworkAPI", code: 3, userInfo: [NSLocalizedDescriptionKey: "A kérés a melléklettel együtt túl hosszú."]) }
            coworkActivities = []; coworkApprovals = []; coworkMessageIDs = [:]; coworkPendingText = [:]; coworkRunTerminal = false
            let runStartedAt = Date()
            let key = userMessage.id.uuidString.lowercased()
            let runID = try await NativeCoworkAPI.shared.createRun(conversationID: conversationID, prompt: prompt,
                                                                    mode: agentMode == "plan" ? "plan" : "build", idempotencyKey: key)
            activeCoworkRunID = runID
            setActiveRun(runID)
            if cancelCoworkWhenStarted {
                cancelCoworkWhenStarted = false
                try await NativeCoworkAPI.shared.cancel(runID: runID)
            }
            var cursor = 0
            var attempts = 0
            while !coworkRunTerminal && attempts < 6 {
                attempts += 1
                do {
                    try await NativeCoworkAPI.shared.stream(runID: runID, after: cursor) { [weak self] event in
                        cursor = max(cursor, event.sequence)
                        self?.applyCoworkEvent(event)
                    }
                } catch {
                    if attempts >= 6 { throw error }
                    try await Task.sleep(for: .milliseconds(350))
                }
            }
            guard coworkRunTerminal else { throw NSError(domain: "NativeCoworkAPI", code: 4, userInfo: [NSLocalizedDescriptionKey: "A kapcsolat megszakadt. A Cowork-futás továbbra is folytatódik; nyisd meg újra a beszélgetést a folytatáshoz."]) }
            let elapsed = max(1, Int(Date().timeIntervalSince(runStartedAt)))
            let doneTools = coworkActivities.map(\.label)
            let summaryText: String? = doneTools.isEmpty
                ? "Inspected previous library files, extracted sources, and project configuration"
                : (doneTools.count == 1 ? doneTools[0] : "\(doneTools.dropLast().joined(separator: ", ")), and \(doneTools.last!)")
            try await refreshCoworkMessages(conversationID: conversationID, runDurationSeconds: elapsed, runToolSummary: summaryText)
            activeCoworkRunID = nil
            setActiveRun(nil)
            clearFailedRequest(for: userMessage.id)
            if error == nil { EvoHaptics.success() }
        } catch {
            if activeCoworkRunID == nil {
                cancelCoworkWhenStarted = false
                restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
            }
            self.error = error.localizedDescription
            EvoHaptics.failure()
        }
    }
    func newConversation() {
        guard !loading else { return }
        isRestoring = false
        storageUnavailable = false
        save()
        currentSessionID = UUID()
        messages = []
        draft = ""
        attachment = nil
        error = nil
        save()
    }
    func select(_ session: ChatSession) {
        guard !loading else { return }
        isRestoring = false
        storageUnavailable = false
        save()
        currentSessionID = session.id
        messages = session.messages
        draft = ""
        error = nil
        persist()
    }
    func delete(_ session: ChatSession) {
        guard !loading || session.id != currentSessionID else { return }
        isRestoring = false
        storageUnavailable = false
        sessions.removeAll { $0.id == session.id }
        for message in session.messages { clearFailedRequest(for: message.id) }
        if session.id == currentSessionID {
            currentSessionID = UUID()
            messages = []
        }
        persist()
    }
    func removeAttachment() {
        attachment = nil
        EvoHaptics.tap()
    }
    private func restoreFailedSend(messageID: UUID, text: String, attachment sentAttachment: ChatAttachment?) {
        if draft.isEmpty && attachment == nil {
            messages.removeAll { $0.id == messageID }
            draft = text
            attachment = sentAttachment
            clearFailedRequest(for: messageID)
        } else {
            failedRequestOrder.removeAll { $0 == messageID }
            failedMessageIDs.insert(messageID)
            failedRequests[messageID] = FailedChatRequest(text: text, attachment: sentAttachment)
            failedRequestOrder.append(messageID)
            while failedRequestOrder.count > 3 {
                let expiredID = failedRequestOrder.removeFirst()
                failedRequests.removeValue(forKey: expiredID)
                retryUnavailableMessageIDs.insert(expiredID)
            }
        }
        save()
    }
    private func clearFailedRequest(for messageID: UUID) {
        failedMessageIDs.remove(messageID)
        retryUnavailableMessageIDs.remove(messageID)
        failedRequests.removeValue(forKey: messageID)
        failedRequestOrder.removeAll { $0 == messageID }
    }
    func importTextFile(name: String, contents: String) {
        let rawName = String(name.split(separator: "/").last ?? "jegyzet.txt")
        let safeName = String(rawName.unicodeScalars.filter {
            !CharacterSet.controlCharacters.contains($0) && $0 != "\\"
        }.prefix(100))
        let extensionName = safeName.lowercased()
        let supported = [".txt", ".md", ".csv", ".json", ".tsv"].contains { extensionName.hasSuffix($0) }
        guard !safeName.isEmpty, supported, !contents.isEmpty, contents.count <= 12000,
              contents.utf8.count <= 96 * 1024,
              !contents.unicodeScalars.contains(where: { $0.value < 9 }) else {
            error = "A fájl legyen .txt, .md, .csv, .json vagy .tsv, legfeljebb 12 000 karakterrel."
            EvoHaptics.failure()
            return
        }
        attachment = ChatAttachment(name: String(safeName), kind: "text", mime: "text/plain", data: contents)
        error = nil
        EvoHaptics.success()
    }
    func importImage(_ source: Data) async {
        guard source.count <= 20 * 1024 * 1024 else {
            error = "A kép nem olvasható vagy túl nagy."
            EvoHaptics.failure()
            return
        }
        let normalized = await Task.detached(priority: .userInitiated) {
            NativeImageProcessor.normalizedJPEG(from: source, inputLimit: 20 * 1024 * 1024,
                                                pixelLimit: 2048, outputLimit: 2 * 1024 * 1024,
                                                initialQuality: 0.88)
        }.value
        guard let jpeg = normalized else {
            error = "A képet nem sikerült feldolgozni 2 MB alá."
            EvoHaptics.failure()
            return
        }
        let dataURI = "data:image/jpeg;base64," + jpeg.base64EncodedString()
        attachment = ChatAttachment(name: "Fénykép.jpg", kind: "image", mime: "image/jpeg", data: dataURI)
        error = nil
        EvoHaptics.success()
    }
    func send() async {
        let originalDraft = draft
        let value = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty || attachment != nil else { return }
        isRestoring = false
        storageUnavailable = false
        if loading && namespace != "cowork" { return }
        guard value.count <= 4000 else {
            error = "Az üzenet legfeljebb 4000 karakter lehet."
            EvoHaptics.failure()
            return
        }
        if namespace == "cowork", attachment?.kind == "image" {
            error = "A Cowork jelenleg szöveges mellékleteket támogat."
            EvoHaptics.failure()
            return
        }
        let sentAttachment = attachment
        let content = value.isEmpty ? "Elemezd a csatolt fájlt." : value
        draft = ""; attachment = nil; error = nil
        let userMessage = ChatMessage(role: "user", content: content, attachmentName: sentAttachment?.name)
        messages.append(userMessage); save()
        if loading && namespace == "cowork" {
            coworkQueuedPrompts.append((originalDraft: originalDraft, attachment: sentAttachment, userMessage: userMessage))
            return
        }
        loading = true
        await performSend(originalDraft: originalDraft, attachment: sentAttachment, userMessage: userMessage)
        while namespace == "cowork", !coworkQueuedPrompts.isEmpty {
            let next = coworkQueuedPrompts.removeFirst()
            loading = true
            await performCoworkSend(originalDraft: next.originalDraft, attachment: next.attachment, userMessage: next.userMessage)
        }
    }
    func retryFailedMessage(_ messageID: UUID) async {
        guard !loading, let request = failedRequests[messageID],
              let userMessage = messages.first(where: { $0.id == messageID }),
              messages.last?.id == messageID else { return }
        error = nil
        EvoHaptics.send()
        loading = true
        await performSend(originalDraft: request.text, attachment: request.attachment,
                          userMessage: userMessage)
    }
    private func performSend(originalDraft: String, attachment sentAttachment: ChatAttachment?, userMessage: ChatMessage) async {
        if namespace == "cowork" {
            await performCoworkSend(originalDraft: originalDraft, attachment: sentAttachment, userMessage: userMessage)
            return
        }
        defer {
            loading = false
            activeMarker = nil
            if pendingReload {
                pendingReload = false
                Task { await reloadFromDisk() }
            }
        }
        activeMarker = nil
        var assistantMessageID: UUID?
        var reply = ""
        var replyCharacterCount = 0
        var lastRenderedAt = Date.distantPast
        var renderedFirstToken = false
        do {
            var request = URLRequest(url: URL(string: "https://api.sycord.site/api/chat")!)
            request.httpMethod = "POST"; request.timeoutInterval = 45
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
            var history = Array(messages.suffix(12))
            while history.reduce(0, { $0 + $1.content.count }) > 18000 && history.count > 1 { history.removeFirst() }
            request.httpBody = try JSONSerialization.data(withJSONObject: [
                "messages": history.map { ["role": $0.role, "content": $0.content] },
                "sessionId": currentSessionID.uuidString,
                "interactive": true,
                "attachment": sentAttachment?.requestValue as Any? ?? NSNull(),
            ])
            let (bytes, response) = try await NativeStreamTransport.session.bytes(for: request)
            guard let http = response as? HTTPURLResponse else {
                restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
                error = "A szerver válasza nem értelmezhető."
                EvoHaptics.failure()
                return
            }
            guard (200...299).contains(http.statusCode) else {
                var responseText = ""
                for try await line in bytes.lines {
                    responseText += line
                    if responseText.utf8.count >= 8_192 {
                        responseText = String(responseText.prefix(8_192))
                        break
                    }
                }
                let body = responseText.data(using: .utf8)
                let payload = body.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
                if sentAttachment == nil {
                    do {
                        activeMarker = NativeInfoMarker(phase: "local", label: "Helyi AI válaszol…", detail: "On-Device", symbol: "iphone", isActive: true)
                        let localReply = try await NativeOnDeviceAgent.respond(to: Array(messages.suffix(10)))
                        messages.append(ChatMessage(role: "assistant", content: localReply))
                        error = nil
                        save()
                        clearFailedRequest(for: userMessage.id)
                        EvoHaptics.success()
                        return
                    } catch {
                        restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
                        self.error = error.localizedDescription
                        EvoHaptics.failure()
                        return
                    }
                }
                restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
                error = payload?["error"] as? String ?? "Az AI szerver hibát jelzett (\(http.statusCode))."
                EvoHaptics.failure()
                return
            }

            var streamError: String?
            for try await line in bytes.lines {
                guard line.hasPrefix("data: "),
                      let data = line.dropFirst(6).data(using: .utf8),
                      let event = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                      let type = event["type"] as? String else { continue }
                switch type {
                case "status", "plan":
                    continue
                case "tool.started":
                    let execId = (event["executionId"] as? String) ?? UUID().uuidString
                    let title = (event["title"] as? String) ?? "Searching the web"
                    let primaryQuery = (event["query"] as? String) ?? ""
                    let queries = (event["queries"] as? [String]) ?? (primaryQuery.isEmpty ? [] : [primaryQuery])
                    let activity = NativeWebSearchActivity(
                        executionId: execId,
                        status: "searching",
                        title: title,
                        queries: queries,
                        activeStepLabel: "Reviewing relevant pages",
                        summary: nil,
                        sources: [],
                        errorMessage: nil,
                        durationMs: nil
                    )
                    if assistantMessageID == nil {
                        var message = ChatMessage(role: "assistant", content: "")
                        message.searchActivity = activity
                        assistantMessageID = message.id
                        messages.append(message)
                    } else if let idx = messages.firstIndex(where: { $0.id == assistantMessageID }) {
                        messages[idx].searchActivity = activity
                    }
                case "tool.step.started":
                    guard let idx = messages.firstIndex(where: { $0.id == assistantMessageID }),
                          var activity = messages[idx].searchActivity else { continue }
                    let stepStatus = (event["status"] as? String) ?? "searching"
                    let label = (event["label"] as? String) ?? "Reviewing relevant pages"
                    activity.status = stepStatus
                    if stepStatus == "searching", let q = event["query"] as? String, !q.isEmpty {
                        if !activity.queries.contains(q) {
                            activity.queries.append(q)
                        }
                    } else {
                        activity.activeStepLabel = label
                    }
                    messages[idx].searchActivity = activity
                case "tool.step.completed":
                    continue
                case "tool.results":
                    guard let idx = messages.firstIndex(where: { $0.id == assistantMessageID }),
                          var activity = messages[idx].searchActivity else { continue }
                    let parsedSources = NativeWebSearchSource.parseList(event["results"])
                    if !parsedSources.isEmpty {
                        activity.sources = parsedSources
                    }
                    messages[idx].searchActivity = activity
                case "tool.completed":
                    guard let idx = messages.firstIndex(where: { $0.id == assistantMessageID }),
                          var activity = messages[idx].searchActivity else { continue }
                    let parsedSources = NativeWebSearchSource.parseList(event["results"])
                    if !parsedSources.isEmpty {
                        activity.sources = parsedSources
                    }
                    activity.status = "completed"
                    activity.activeStepLabel = nil
                    activity.summary = (event["summary"] as? String) ?? "Searched the web · \(activity.sources.count) sources"
                    activity.durationMs = event["durationMs"] as? Int
                    messages[idx].searchActivity = activity
                case "tool.failed":
                    guard let idx = messages.firstIndex(where: { $0.id == assistantMessageID }),
                          var activity = messages[idx].searchActivity else { continue }
                    activity.status = "failed"
                    activity.activeStepLabel = nil
                    activity.errorMessage = (event["error"] as? String) ?? "Web search failed."
                    messages[idx].searchActivity = activity
                case "tool.cancelled":
                    guard let idx = messages.firstIndex(where: { $0.id == assistantMessageID }),
                          var activity = messages[idx].searchActivity else { continue }
                    activity.status = "cancelled"
                    activity.activeStepLabel = nil
                    messages[idx].searchActivity = activity
                case "delta":
                    guard let delta = event["delta"] as? String, !delta.isEmpty else { continue }
                    reply += delta
                    replyCharacterCount += delta.utf16.count
                    if replyCharacterCount > 30000 { throw NSError(domain: "EvolingoChat", code: 1, userInfo: [NSLocalizedDescriptionKey: "Az AI-válasz túl hosszú."]) }
                    let now = Date()
                    if assistantMessageID == nil {
                        let message = ChatMessage(role: "assistant", content: reply)
                        assistantMessageID = message.id
                        messages.append(message)
                        renderedFirstToken = true
                        lastRenderedAt = now
                    } else if !renderedFirstToken || now.timeIntervalSince(lastRenderedAt) >= 0.025,
                              let index = messages.firstIndex(where: { $0.id == assistantMessageID }) {
                        messages[index].content = reply
                        renderedFirstToken = true
                        lastRenderedAt = now
                    }
                case "text":
                    if let final = event["reply"] as? String, !final.isEmpty {
                        guard final.utf16.count <= 30_000 else { throw NSError(domain: "EvolingoChat", code: 1, userInfo: [NSLocalizedDescriptionKey: "Az AI-válasz túl hosszú."]) }
                        reply = final
                        replyCharacterCount = final.utf16.count
                    }
                case "error":
                    streamError = event["error"] as? String ?? "Az AI válasza megszakadt."
                case "done":
                    break
                default:
                    continue
                }
                if type == "done" { break }
            }

            if let streamError {
                if sentAttachment == nil {
                    do {
                        let localReply = try await NativeOnDeviceAgent.respond(to: Array(messages.suffix(10)))
                        if let assistantMessageID { messages.removeAll { $0.id == assistantMessageID } }
                        messages.append(ChatMessage(role: "assistant", content: localReply))
                        error = nil
                        save()
                        clearFailedRequest(for: userMessage.id)
                        EvoHaptics.success()
                        return
                    } catch {
                        if let assistantMessageID { messages.removeAll { $0.id == assistantMessageID } }
                        restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
                        self.error = error.localizedDescription
                        EvoHaptics.failure()
                        return
                    }
                }
                if let assistantMessageID { messages.removeAll { $0.id == assistantMessageID } }
                restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
                error = streamError
                EvoHaptics.failure()
                return
            }
            guard !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
                error = "Az AI nem adott választ. Próbáld újra."
                EvoHaptics.failure()
                return
            }
            if let assistantMessageID, let index = messages.firstIndex(where: { $0.id == assistantMessageID }) {
                messages[index].content = reply
            } else {
                messages.append(ChatMessage(role: "assistant", content: reply))
            }
            save()
            clearFailedRequest(for: userMessage.id)
            EvoHaptics.success()
        } catch {
            if Task.isCancelled {
                if let assistantMessageID, let index = messages.firstIndex(where: { $0.id == assistantMessageID }) {
                    if messages[index].searchActivity?.isOngoing == true {
                        messages[index].searchActivity?.status = "cancelled"
                        messages[index].searchActivity?.activeStepLabel = nil
                    }
                    if reply.isEmpty && messages[index].searchActivity == nil {
                        messages.remove(at: index)
                    } else if !reply.isEmpty {
                        messages[index].content = reply
                    }
                }
                self.error = "A válasz megszakadt. A már megjelent szöveg megmaradt."
                save()
                return
            }
            if let assistantMessageID { messages.removeAll { $0.id == assistantMessageID } }
            restoreFailedSend(messageID: userMessage.id, text: originalDraft, attachment: sentAttachment)
            self.error = error.localizedDescription == "Az AI-válasz túl hosszú." ? error.localizedDescription : "Kapcsolati hiba. Ellenőrizd az internetkapcsolatot, majd próbáld újra."
            EvoHaptics.failure()
        }
    }
}

struct IdeaTask: Codable, Identifiable {
    var id: String
    var icon: String
    var name: String
    var description: String
    var plan: String
    var markdown: String
    var approved: Bool
    var createdAt: Double
    var category: String?
}

@MainActor final class IdeasModel: ObservableObject {
    @Published var tasks: [IdeaTask] = []
    @Published var loading = false
    @Published var error: String?
    @Published var name = ""
    @Published var description = ""
    func load() async {
        loading = true; defer { loading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: URL(string: "https://evolingo-nine.vercel.app/api/brainstorm")!)
            let result = try JSONDecoder().decode([String: [IdeaTask]].self, from: data)
            tasks = result["tasks"] ?? []; error = nil
        } catch { self.error = "Az ötletlista nem érhető el."; EvoHaptics.failure() }
    }
    func create() async {
        let title = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let detail = description.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty, !detail.isEmpty, !loading else { return }
        loading = true; defer { loading = false }
        let task = IdeaTask(id: UUID().uuidString, icon: "💡", name: title, description: detail, plan: "", markdown: "", approved: false, createdAt: Date().timeIntervalSince1970, category: "features")
        do {
            var request = URLRequest(url: URL(string: "https://evolingo-nine.vercel.app/api/brainstorm")!)
            request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try JSONEncoder().encode(task)
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let response = response as? HTTPURLResponse, (200...299).contains(response.statusCode) else { error = "A mentés nem sikerült."; EvoHaptics.failure(); return }
            name = ""; description = ""; EvoHaptics.success(); await load()
        } catch { self.error = "Kapcsolati hiba mentés közben."; EvoHaptics.failure() }
    }
    func setApproved(_ task: IdeaTask, _ approved: Bool) async {
        do {
            var request = URLRequest(url: URL(string: "https://evolingo-nine.vercel.app/api/brainstorm")!)
            request.httpMethod = "PATCH"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: ["id": task.id, "approved": approved])
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let response = response as? HTTPURLResponse, (200...299).contains(response.statusCode) else { EvoHaptics.failure(); return }
            EvoHaptics.success(); await load()
        } catch { self.error = "A módosítás nem sikerült."; EvoHaptics.failure() }
    }
}

@MainActor
final class AppFocusCoordinator: ObservableObject {
    static let shared = AppFocusCoordinator()
    var hasRequestedColdLaunchFocus: Bool = false

    func claimColdLaunchFocus() -> Bool {
        guard !hasRequestedColdLaunchFocus else { return false }
        hasRequestedColdLaunchFocus = true
        return true
    }

    static var hasPerformedColdLaunchFocus: Bool {
        get { shared.hasRequestedColdLaunchFocus }
        set { shared.hasRequestedColdLaunchFocus = newValue }
    }
}

@MainActor
enum EvoProMotionConfiguration {
    static let frameRateRange = CAFrameRateRange(minimum: 80, maximum: 120, preferred: 120)

    static func apply120Hz<Result>(_ body: () -> Result) -> Result {
        body()
    }
}

@MainActor
final class KeyboardObserver: ObservableObject {
    static let shared = KeyboardObserver()
    @Published var keyboardHeight: CGFloat = 0
    @Published var animationDuration: Double = 0.25

    init() {
        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillChangeFrameNotification,
            object: nil,
            queue: .main
        ) { [weak self] notif in
            let frame = (notif.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect) ?? .zero
            let duration = (notif.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double) ?? 0.25
            Task { @MainActor [weak self] in
                guard let self, frame != .zero else { return }
                let screenHeight = UIScreen.main.bounds.height
                let newHeight = max(0, screenHeight - frame.minY)
                self.animationDuration = duration
                self.keyboardHeight = newHeight
            }
        }

        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillHideNotification,
            object: nil,
            queue: .main
        ) { [weak self] notif in
            let duration = (notif.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double) ?? 0.25
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.animationDuration = duration
                self.keyboardHeight = 0
            }
        }
    }
}

struct ChatView: View {
    let cowork: Bool
    let navigate: (NativeTab) -> Void
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void
    @ObservedObject var model: ChatModel
    @State private var showHistory = false
    @State private var showServerInfo = false
    @State private var showPlusSheet = false
    @State private var showCreateFileSheet = false
    @State private var showingPhotos = false
    @State private var showingCamera = false
    @State private var importingText = false
    @State private var processingPhoto = false
    @State private var selectedPhoto: PhotosPickerItem?
    @StateObject private var speech = ChatSpeechPlayer()
    @ObservedObject private var keyboardObserver = KeyboardObserver.shared
    @State private var sendTask: Task<Void, Never>?
    @State private var isNearChatBottom = true
    @State private var isUserScrolling = false
    @State private var lastFollowScrollAt = Date.distantPast
    @State private var expandedFullVerdictIDs: Set<UUID> = []
    @FocusState private var focused: Bool
    @ScaledMetric(relativeTo: .body) private var userMessageFontSize = 16
    @AppStorage("native.evolingo.profile.name") private var displayName = "Evölingo vendég"
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false

    var body: some View {
        ZStack(alignment: .top) {
            ScrollViewReader { scroll in
                GeometryReader { viewport in
                    let chatContentWidth = max(0, min(viewport.size.width, 720) - 24)
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 28) {
                                if model.messages.isEmpty {
                                    if cowork {
                                        VStack(alignment: .center, spacing: 10) {
                                            EvoIcon(systemName: "folder")
                                                .font(.system(size: 28, weight: .regular))
                                                .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                                                .frame(width: 56, height: 56)
                                                .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                                                .padding(.bottom, 4)
                                            Text("What should we build?").font(EvoFont.text(.title2, weight: .semibold))
                                            Text("Planning and collaboration in one place.")
                                                .font(EvoFont.text(.subheadline)).foregroundStyle(EvoTheme.Symbol.secondary).multilineTextAlignment(.center)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.top, 140)
                                        .accessibilityElement(children: .combine)
                                    } else {
                                        ChatWelcomeView { text in
                                            model.draft = text
                                            focused = true
                                        }
                                        .padding(.top, 60)
                                    }
                                }
                                let displayedMessages = model.messages
                                ForEach(displayedMessages) { message in
                                    let isUserMessage = message.role == "user"
                                    let isLatestMessage = message.id == model.messages.last?.id
                                    let isStreamingAssistant = !isUserMessage && model.loading && isLatestMessage
                                    let isHistoryExpanded = expandedFullVerdictIDs.contains(message.id)
                                    VStack(alignment: .leading, spacing: 6) {
                                    HStack(alignment: .top, spacing: 0) {
                                        if isUserMessage { Spacer(minLength: 0) }
                                        ChatMessageWidth(maximum: isUserMessage ? chatContentWidth * 0.78 : chatContentWidth,
                                                         contentSized: isUserMessage) {
                                        VStack(alignment: .leading, spacing: 14) {
                                            if let attachmentName = message.attachmentName {
                                                EvoSymbolLabel(attachmentName, systemImage: "paperclip")
                                                    .font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                                            }
                                            if cowork && !isUserMessage {
                                                NativeWorkedHeaderView(
                                                    durationSeconds: message.durationSeconds,
                                                    isWorking: isStreamingAssistant,
                                                    isExpanded: isHistoryExpanded,
                                                    onTap: {
                                                        if systemReduceMotion || reduceMotion {
                                                            if expandedFullVerdictIDs.contains(message.id) {
                                                                expandedFullVerdictIDs.remove(message.id)
                                                            } else {
                                                                expandedFullVerdictIDs.insert(message.id)
                                                            }
                                                        } else {
                                                            withAnimation(.easeInOut(duration: 0.22)) {
                                                                if expandedFullVerdictIDs.contains(message.id) {
                                                                    expandedFullVerdictIDs.remove(message.id)
                                                                } else {
                                                                    expandedFullVerdictIDs.insert(message.id)
                                                                }
                                                            }
                                                        }
                                                    }
                                                )
                                            }
                                            if isUserMessage {
                                                if !message.content.isEmpty {
                                                    ArlenMarkdownRenderer(value: message.content, isStreaming: isStreamingAssistant)
                                                }
                                            } else if isStreamingAssistant {
                                                if let searchActivity = message.searchActivity {
                                                    NativeWebSearchActivityView(
                                                        activity: searchActivity,
                                                        onRetry: nil
                                                    )
                                                }
                                                if cowork, let plan = message.plan {
                                                    NativeAgentPlanView(plan: plan, onSkip: {
                                                        if cowork { model.cancelCoworkRun() }
                                                        else { sendTask?.cancel() }
                                                    })
                                                }
                                                if !message.content.isEmpty {
                                                    ArlenMarkdownRenderer(value: message.content, isStreaming: isStreamingAssistant)
                                                }
                                                if cowork && !model.coworkActivities.isEmpty {
                                                    NativeToolExecutionCard(activities: model.coworkActivities, onSkip: {
                                                        model.cancelCoworkRun()
                                                    })
                                                } else if cowork, let marker = model.activeMarker, message.plan == nil {
                                                    NativeInfoMarkerBanner(marker: marker, onSkip: {
                                                        if cowork { model.cancelCoworkRun() }
                                                        else { sendTask?.cancel() }
                                                    })
                                                }
                                            } else {
                                                if let searchActivity = message.searchActivity {
                                                    NativeWebSearchActivityView(
                                                        activity: searchActivity,
                                                        onRetry: searchActivity.status == "failed" ? {
                                                            if let lastUser = model.messages.last(where: { $0.role == "user" }) {
                                                                model.draft = lastUser.content
                                                                send()
                                                            }
                                                        } : nil
                                                    )
                                                }
                                                let toolSummary = NativeVerdictExtractor.toolSummary(
                                                    for: message,
                                                    cowork: cowork,
                                                    activities: isLatestMessage ? model.coworkActivities : []
                                                )
                                                if cowork, isHistoryExpanded, let summary = toolSummary, !summary.isEmpty {
                                                    NativeToolSummaryRow(summary: summary)
                                                        .transition(.opacity.combined(with: .offset(y: -4)))
                                                }
                                                let displayBody = !cowork || isHistoryExpanded
                                                    ? message.content
                                                    : NativeVerdictExtractor.extractVerdict(from: message.content, fallbackToolSummary: toolSummary)
                                                ArlenMarkdownRenderer(value: displayBody, isStreaming: isStreamingAssistant)

                                                let extractedArtifacts = NativeVerdictExtractor.extractArtifacts(
                                                    from: message,
                                                    cowork: cowork,
                                                    activities: isLatestMessage ? model.coworkActivities : []
                                                )
                                                if cowork && !extractedArtifacts.isEmpty {
                                                    NativeArtifactLinksView(artifacts: extractedArtifacts)
                                                }
                                            }
                                        }
                                        .textSelection(.enabled)
                                        .padding(.horizontal, isUserMessage ? 16 : 0)
                                        .padding(.vertical, isUserMessage ? 14 : 4)
                                        .background {
                                            if isUserMessage {
                                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                                    .fill(EvoTheme.Palette.surface)
                                            }
                                        }
                                        }
                                        if !isUserMessage { Spacer(minLength: 0) }
                                    }
                                    .frame(maxWidth: .infinity, alignment: isUserMessage ? .trailing : .leading)
                                    if message.role == "assistant", !message.content.isEmpty,
                                       !model.loading || message.id != model.messages.last?.id {
                                        ChatResponseActions(message: message, speech: speech)
                                    }
                                    }
                                    .id(message.id)

                                    if model.failedMessageIDs.contains(message.id) {
                                        HStack(spacing: 10) {
                                            EvoSymbolLabel("Failed to send", systemImage: "exclamationmark.circle.fill")
                                                .font(EvoFont.text(.footnote)).foregroundStyle(.red)
                                            Spacer(minLength: 4)
                                            if model.retryUnavailableMessageIDs.contains(message.id) || model.messages.last?.id != message.id {
                                                Text("Copy text and re-attach file to retry.")
                                                    .font(EvoFont.text(.footnote)).foregroundStyle(EvoTheme.Symbol.secondary)
                                            } else {
                                                Button {
                                                    sendTask = Task { await model.retryFailedMessage(message.id); sendTask = nil }
                                                } label: {
                                                    EvoSymbolLabel("Retry", systemImage: "arrow.clockwise")
                                                        .frame(minHeight: 44)
                                                }
                                                .buttonStyle(.bordered)
                                                .disabled(model.loading)
                                            }
                                        }
                                        .padding(.leading, isUserMessage ? 36 : 0)
                                        .accessibilityElement(children: .contain)
                                    }
                                }
                                if cowork, model.activeCoworkRunID != nil, !model.loading {
                                    Button {
                                        Task { await model.restoreCowork() }
                                    } label: {
                                        EvoSymbolLabel("Reconnect to Cowork run", systemImage: "arrow.clockwise")
                                            .frame(maxWidth: .infinity, minHeight: 44)
                                    }
                                    .buttonStyle(.bordered)
                                }
                                if cowork && !model.coworkApprovals.isEmpty {
                                    ForEach(model.coworkApprovals) { approval in
                                        VStack(alignment: .leading, spacing: 10) {
                                            EvoSymbolLabel("Approval required · \(approval.toolName ?? "Tool")", systemImage: "lock.shield")
                                                .font(EvoFont.text(.subheadline, weight: .semibold))
                                            Text(approval.summary).font(EvoFont.text(.body)).fixedSize(horizontal: false, vertical: true)
                                            Text("Risk: \(approval.risk.capitalized)").font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                                            HStack(spacing: 10) {
                                                Button("Allow once") { Task { await model.decideCoworkApproval(approval, allow: true) } }
                                                    .buttonStyle(.borderedProminent).frame(minHeight: 44)
                                                Button("Deny", role: .cancel) { Task { await model.decideCoworkApproval(approval, allow: false) } }
                                                    .buttonStyle(.bordered).frame(minHeight: 44)
                                            }
                                        }
                                        .padding(14).frame(maxWidth: .infinity, alignment: .leading)
                                        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                        .accessibilityElement(children: .contain)
                                    }
                                }
                                if model.loading, model.messages.last?.role != "assistant" {
                                    VStack(alignment: .leading, spacing: 12) {
                                        if cowork { NativeWorkedHeaderView(durationSeconds: nil, isWorking: true) }
                                        if cowork && !model.coworkActivities.isEmpty {
                                            NativeToolExecutionCard(activities: model.coworkActivities, onSkip: {
                                                model.cancelCoworkRun()
                                            })
                                            .accessibilityLabel("Cowork műveletek")
                                        } else if !cowork {
                                            Text("Válasz írása…")
                                                .font(EvoFont.text(.subheadline))
                                                .foregroundStyle(EvoTheme.Symbol.secondary)
                                        } else {
                                            NativeInfoMarkerBanner(
                                                marker: model.activeMarker ?? NativeInfoMarker(
                                                    phase: "thinking",
                                                    label: "Working",
                                                    detail: cowork ? "Preparing workspace and tools" : "Analyzing request and preparing response",
                                                    symbol: "thought.bubble",
                                                    isActive: true
                                                ),
                                                onSkip: {
                                                    if cowork { model.cancelCoworkRun() }
                                                    else { sendTask?.cancel() }
                                                }
                                            )
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }
                                if let error = model.error {
                                    EvoSymbolLabel(error, systemImage: "exclamationmark.circle.fill")
                                        .font(EvoFont.text(.footnote)).foregroundStyle(.red).padding(.vertical, 4)
                                }
                                if model.storageUnavailable {
                                    Button {
                                        EvoHaptics.tap()
                                        Task { await model.retryRestore() }
                                    } label: {
                                        EvoSymbolLabel("Előzmények újrapróbálása", systemImage: "arrow.clockwise")
                                            .frame(minHeight: 44)
                                    }
                                    .buttonStyle(.bordered)
                                }
                                Color.clear
                                    .frame(height: bottomSpacerHeight(viewportHeight: viewport.size.height))
                                    .background {
                                        GeometryReader { bottom in
                                            Color.clear.preference(
                                                key: ChatBottomYPreferenceKey.self,
                                                value: bottom.frame(in: .named("evolingoChatScroll")).maxY
                                            )
                                        }
                                    }
                                    .id("chat-bottom")
                            }
                            .padding(.horizontal, 22)
                            .padding(.top, 118)
                            .frame(maxWidth: 720)
                            .frame(maxWidth: .infinity)
                        }
                        .ignoresSafeArea(.container, edges: .top)
                        .coordinateSpace(name: "evolingoChatScroll")
                        .scrollDismissesKeyboard(.interactively)
                        .onTapGesture {
                            focused = false
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        }
                        .modifier(ChatScrollEdge())
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 6)
                                .onChanged { _ in
                                    isUserScrolling = true
                                }
                                .onEnded { _ in
                                    Task { @MainActor in
                                        try? await Task.sleep(nanoseconds: 900_000_000)
                                        isUserScrolling = false
                                    }
                                }
                        )
                        .onPreferenceChange(ChatBottomYPreferenceKey.self) { contentBottom in
                            isNearChatBottom = contentBottom - viewport.size.height <= 140
                        }
                        .overlay(alignment: .bottomTrailing) {
                            if !isNearChatBottom && !model.messages.isEmpty {
                                Button {
                                    EvoHaptics.tap()
                                    isNearChatBottom = true
                                    scrollToLatest(using: scroll, animated: true)
                                } label: {
                                    EvoIcon(systemName: "arrow.down").evoSymbol(.toolbar, weight: .medium).evoIconTarget()
                                        .frame(width: 44, height: 44)
                                        .background(.regularMaterial, in: Circle())
                                        .overlay(Circle().strokeBorder(Color.white.opacity(0.75), lineWidth: 1))
                                        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 3)
                                }
                                .buttonStyle(EvoScalePressButtonStyle())
                                .padding(.trailing, 24)
                                .padding(.bottom, 24)
                                .transition(.scale(scale: 0.85).combined(with: .opacity))
                                .accessibilityLabel("Ugrás a legújabb üzenethez")
                            }
                        }
                        .onChange(of: model.messages.map(\.id)) { oldIDs, newIDs in
                            guard oldIDs != newIDs else { return }
                            guard !newIDs.isEmpty else { isNearChatBottom = true; return }
                            if !oldIDs.isEmpty, newIDs.count > oldIDs.count,
                               Array(newIDs.suffix(oldIDs.count)) == oldIDs {
                                return
                            }
                            isNearChatBottom = true
                            if model.messages.last?.role == "user", let userID = model.messages.last?.id {
                                scrollToMessageTop(userID, using: scroll, animated: true)
                            } else {
                                scrollToLatest(using: scroll, animated: true)
                            }
                        }
                        .onChange(of: model.messages.last?.content) { _, _ in
                            if !isUserScrolling {
                                followStream(using: scroll)
                            }
                        }
                        .onChange(of: keyboardObserver.keyboardHeight) { oldHeight, newHeight in
                            guard newHeight > 0, isNearChatBottom, !isUserScrolling else { return }
                            let duration = max(0.15, keyboardObserver.animationDuration)
                            withAnimation(.easeOut(duration: duration)) {
                                scrollToLatest(using: scroll, animated: false)
                            }
                        }
                        .onChange(of: focused) { _, isFocused in
                            guard isFocused, isNearChatBottom else { return }
                            Task { @MainActor in
                                try? await Task.sleep(nanoseconds: 220_000_000)
                                if isNearChatBottom && !isUserScrolling {
                                    scrollToLatest(using: scroll, animated: true)
                                }
                            }
                        }
                    }
                }

            ChatTopProgressiveBlurOverlay(height: 136)

            chatHeader
                .padding(.top, 60)
        }
            .ignoresSafeArea(.container, edges: .top)
            .background(Color.white.ignoresSafeArea())
            .safeAreaInset(edge: .bottom, spacing: 0) {
                VStack(spacing: 12) {
                    if cowork && model.messages.isEmpty && !model.loading {
                    ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        if cowork {
                            Menu {
                                Button { EvoHaptics.tap(); model.agentMode = "auto" } label: { EvoSymbolLabel("Auto", systemImage: model.agentMode == "auto" ? "checkmark" : "sparkles") }
                                Button { EvoHaptics.tap(); model.agentMode = "plan" } label: { EvoSymbolLabel("Plan", systemImage: model.agentMode == "plan" ? "checkmark" : "list.bullet.rectangle") }
                                Button { EvoHaptics.tap(); model.agentMode = "fast" } label: { EvoSymbolLabel("Fast", systemImage: model.agentMode == "fast" ? "checkmark" : "bolt") }
                            } label: {
                                EvoSymbolLabel(modeTitle, systemImage: "slider.horizontal.3").font(EvoFont.text(.subheadline, weight: .medium))
                                    .padding(.horizontal, 14).frame(height: 44).background(Color(uiColor: .systemBackground).opacity(0.9), in: Capsule())
                            }.accessibilityLabel("Cowork AI Mode")
                        }
                        Menu {
                            Button { EvoHaptics.tap(); showServerInfo = true } label: {
                                EvoSymbolLabel("Main Server · Active", systemImage: "checkmark")
                            }
                        } label: {
                            HStack(spacing: 8) {
                                EvoSymbolLabel("Main Server", systemImage: "server.rack")
                                EvoIcon(systemName: "chevron.down").evoSymbol(.toolbar, weight: .medium)
                                    .foregroundStyle(EvoTheme.Symbol.secondary)
                            }
                            .font(EvoFont.text(.subheadline, weight: .medium))
                            .padding(.horizontal, 15).frame(minHeight: 44)
                            .background(Color(uiColor: .systemBackground).opacity(0.9), in: Capsule())
                        }
                        .accessibilityLabel("Active Server: Main Server")
                        Button { EvoHaptics.tap(); model.newConversation(); focused = false } label: {
                            EvoSymbolLabel("New", systemImage: "plus").font(EvoFont.text(.subheadline, weight: .medium))
                                .padding(.horizontal, 16).frame(height: 44)
                                .background(Color(uiColor: .systemBackground).opacity(0.9), in: Capsule())
                        }.buttonStyle(.plain).disabled(model.loading).accessibilityLabel("New conversation")
                    }
                    }
                    }
                    if processingPhoto {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Fénykép feldolgozása…").font(EvoFont.text(.subheadline)).foregroundStyle(EvoTheme.Symbol.secondary)
                            Spacer()
                        }
                        .frame(minHeight: 44)
                        .accessibilityElement(children: .combine)
                    }
                    if let attachment = model.attachment {
                        HStack(spacing: 10) {
                            EvoIcon(systemName: attachment.kind == "image" ? "photo" : "doc.text").evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.secondary)
                            Text(attachment.name).font(EvoFont.text(.subheadline)).lineLimit(1)
                            Spacer(minLength: 4)
                            Button { model.removeAttachment() } label: {
                                EvoIcon(systemName: "xmark.circle.fill").evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.secondary).frame(width: 44, height: 44)
                            }.accessibilityLabel("Remove attachment")
                        }
                        .padding(.leading, 14).padding(.trailing, 4)
                        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                    }
                    let composerExpanded = !model.draft.isEmpty || model.attachment != nil
                    let composerShape = RoundedRectangle(cornerRadius: composerExpanded ? 24 : 28, style: .continuous)
                    HStack(alignment: .center, spacing: 6) {
                        Button {
                            EvoHaptics.tap()
                            focused = false
                            showPlusSheet = true
                        } label: {
                            EvoIcon(systemName: "plus")
                                .evoSymbol(.standard, weight: .medium)
                                .foregroundStyle(EvoTheme.Symbol.primary)
                                .frame(width: 44, height: 44)
                                .contentShape(Circle())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                        .disabled(processingPhoto)
                        .accessibilityLabel("Attach & create")

                        TextField("Írj egy üzenetet…", text: $model.draft, axis: .vertical)
                            .textFieldStyle(.plain)
                            .font(EvoFont.text(.body))
                            .lineLimit(1...5)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .focused($focused)
                            .submitLabel(.send)
                            .onSubmit { send() }
                            .onChange(of: model.draft) { oldVal, newVal in
                                if newVal.hasSuffix("\n"), newVal.count == oldVal.count + 1 {
                                    let trimmed = String(newVal.dropLast()).trimmingCharacters(in: .whitespacesAndNewlines)
                                    if !trimmed.isEmpty {
                                        model.draft = String(newVal.dropLast())
                                        send()
                                    }
                                }
                            }
                            .textInputAutocapitalization(.sentences)
                            .accessibilityLabel("Ask anything")
                        if cowork {
                        Menu {
                            Button { EvoHaptics.tap(); model.agentMode = "auto" } label: { EvoSymbolLabel("Auto", systemImage: model.agentMode == "auto" ? "checkmark" : "sparkles") }
                            Button { EvoHaptics.tap(); model.agentMode = "plan" } label: { EvoSymbolLabel("Plan", systemImage: model.agentMode == "plan" ? "checkmark" : "list.bullet.rectangle") }
                            Button { EvoHaptics.tap(); model.agentMode = "fast" } label: { EvoSymbolLabel("Fast", systemImage: model.agentMode == "fast" ? "checkmark" : "bolt") }
                        } label: {
                            HStack(spacing: 4) {
                                Text(modeTitle)
                                    .font(EvoFont.sized(14.5, weight: .medium, relativeTo: .subheadline))
                                    .foregroundStyle(EvoTheme.Palette.ink)
                                EvoIcon(systemName: "chevron.down")
                                    .evoSymbol(.toolbar, weight: .medium)
                                    .scaleEffect(0.7)
                                    .foregroundStyle(EvoTheme.Palette.ink)
                            }
                            .padding(.horizontal, 8)
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                        .accessibilityLabel("Agent mode: \(modeTitle)")
                        }
                        Button {
                            if model.loading {
                                EvoHaptics.tap()
                                sendTask?.cancel()
                                sendTask = nil
                                model.cancelActiveSend()
                            } else if canSend {
                                send()
                            }
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(canSend || model.loading ? EvoTheme.Palette.action : EvoTheme.Palette.action.opacity(0.35))
                                    .opacity(canSend || model.loading ? 1.0 : 0.35)
                                    .frame(width: 36, height: 36)
                                EvoIcon(systemName: model.loading ? "stop.fill" : "arrow.up")
                                    .evoSymbol(.toolbar, weight: .semibold)
                                    .scaleEffect(model.loading ? 0.82 : 0.95)
                                    .foregroundStyle(Color.white.opacity(canSend || model.loading ? 1.0 : 0.6))
                            }
                            .frame(width: 44, height: 44)
                            .contentShape(Circle())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                        .disabled(!canSend && !model.loading || processingPhoto)
                        .accessibilityLabel(model.loading ? "Stop response" : "Send message")
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(minHeight: 56)
                    .modifier(EvoInputSurface(shape: composerShape))
                    .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 3)
                    .animation((systemReduceMotion || reduceMotion) ? nil : .spring(response: 0.32, dampingFraction: 0.82), value: composerExpanded)
                }
                .padding(.horizontal, 20)
                .padding(.top, 6)
                .padding(.bottom, 10)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .background(
                    VStack(spacing: 0) {
                        LinearGradient(
                            colors: [Color.white.opacity(0.0), Color.white],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 18)
                        Color.white
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    .frame(maxWidth: .infinity)
                    .background(Color.white)
                    .ignoresSafeArea(edges: .bottom)
                )
                .zIndex(10)
            }
            .sheet(isPresented: $showPlusSheet) {
                ArlenPlusAttachmentSheet(
                    onPickPhotos: {
                        showPlusSheet = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                            showingPhotos = true
                        }
                    },
                    onOpenCamera: {
                        showPlusSheet = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                                showingCamera = true
                            } else {
                                showingPhotos = true
                            }
                        }
                    },
                    onImportFile: {
                        showPlusSheet = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                            importingText = true
                        }
                    },
                    onCreateFile: {
                        showPlusSheet = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22) {
                            showCreateFileSheet = true
                        }
                    }
                )
                .presentationDetents([.height(390), .large])
                .presentationCornerRadius(34)
                .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $showCreateFileSheet) {
                ArlenCreateFileSheet { fileName, fileContents in
                    showCreateFileSheet = false
                    model.importTextFile(name: fileName, contents: fileContents)
                }
                .presentationDetents([.medium, .large])
                .presentationCornerRadius(28)
                .presentationDragIndicator(.visible)
            }
            .fullScreenCover(isPresented: $showingCamera) {
                ArlenCameraPickerView { imageData in
                    showingCamera = false
                    if let imageData {
                        Task {
                            processingPhoto = true
                            defer { processingPhoto = false }
                            await model.importImage(imageData)
                        }
                    }
                }
                .ignoresSafeArea()
            }
            .sheet(isPresented: $showHistory) {
                NavigationStack {
                    List {
                        if model.sessions.allSatisfy({ $0.messages.isEmpty }) {
                            EvoUnavailableView("No History", systemImage: "clock", description: Text("Your new conversations will appear here."))
                        }
                        ForEach(model.sessions.filter { !$0.messages.isEmpty }) { session in
                            Button {
                                EvoHaptics.tap(); model.select(session); showHistory = false
                            } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(session.title).foregroundStyle(EvoTheme.Symbol.primary).lineLimit(2)
                                    Text(session.updatedAt.formatted(date: .abbreviated, time: .shortened)).font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                                }.padding(.vertical, 4)
                            }.buttonStyle(.plain)
                                .swipeActions {
                                    Button(role: .destructive) { EvoHaptics.success(); model.delete(session) } label: { EvoSymbolLabel("Delete", systemImage: "trash") }
                                }
                        }
                    }
                    .navigationTitle("History")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Done") { showHistory = false } } }
                }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
            }
            .alert("Main Server", isPresented: $showServerInfo) {
                Button("OK", role: .cancel) { }
            } message: { Text("AI responses are generated securely via HTTPS through the Arlen server API. Provider credentials are never stored on your iPhone.") }
            .fileImporter(isPresented: $importingText, allowedContentTypes: textFileTypes, allowsMultipleSelection: false) { result in
                importTextFile(result)
            }
            .photosPicker(isPresented: $showingPhotos, selection: $selectedPhoto, matching: .images)
            .onChange(of: selectedPhoto) { _, item in
                guard let item else { return }
                Task {
                    processingPhoto = true
                    defer {
                        processingPhoto = false
                        selectedPhoto = nil
                    }
                    do {
                        guard let data = try await item.loadTransferable(type: Data.self) else {
                            model.error = "A fotót nem sikerült beolvasni."
                            EvoHaptics.failure()
                            return
                        }
                        await model.importImage(data)
                    } catch {
                        model.error = "A fotó kiválasztása nem sikerült."
                        EvoHaptics.failure()
                    }
                }
            }
            .task {
                NativeStreamTransport.prewarm()
                await model.restoreFromDisk()
                if cowork { await model.restoreCowork() }
                guard AppFocusCoordinator.shared.claimColdLaunchFocus() else { return }
                await Task.yield()
                guard !Task.isCancelled else { return }
                focused = true
            }
            .onDisappear { speech.stop() }
            .onReceive(NotificationCenter.default.publisher(for: .evolingoNativeDataImported)) { _ in
                Task { await model.reloadFromDisk() }
            }
            .environment(\.openURL, OpenURLAction { url in
                guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased(),
                      url.user == nil, url.password == nil,
                      host != "localhost", !host.hasSuffix(".local"), !host.hasSuffix(".internal"),
                      !host.contains(":"),
                      !isIPv4Literal(host) else { return .discarded }
                return .systemAction
            })
            .preferredColorScheme(.light)
        }

    private func bottomSpacerHeight(viewportHeight: CGFloat) -> CGFloat {
        let inputBarHeight: CGFloat = 72
        let bottomPadding: CGFloat = 10
        let keyboardOffset = keyboardObserver.keyboardHeight
        let base = inputBarHeight + (model.messages.isEmpty ? 16 : 24) + bottomPadding
        return base + (keyboardOffset > 0 ? 12 : 0)
    }

    private func dynamicBottomSpacerHeight(viewportHeight: CGFloat) -> CGFloat {
        bottomSpacerHeight(viewportHeight: viewportHeight)
    }

    private func scrollToMessageTop(_ id: UUID, using proxy: ScrollViewProxy, animated: Bool) {
        lastFollowScrollAt = Date()
        guard animated, !systemReduceMotion, !reduceMotion else {
            proxy.scrollTo(id, anchor: .top)
            return
        }
        withAnimation(.spring(response: 0.38, dampingFraction: 0.80, blendDuration: 0.12)) {
            proxy.scrollTo(id, anchor: .top)
        }
    }

    private func scrollToLatest(using proxy: ScrollViewProxy, animated: Bool) {
        lastFollowScrollAt = Date()
        guard animated, !systemReduceMotion, !reduceMotion else {
            proxy.scrollTo("chat-bottom", anchor: .bottom)
            return
        }
        withAnimation(.spring(response: 0.36, dampingFraction: 0.82, blendDuration: 0.10)) {
            proxy.scrollTo("chat-bottom", anchor: .bottom)
        }
    }

    private func followStream(using proxy: ScrollViewProxy) {
        guard isNearChatBottom, !isUserScrolling else { return }
        let now = Date()
        guard now.timeIntervalSince(lastFollowScrollAt) >= 0.16 else { return }
        lastFollowScrollAt = now
        guard !systemReduceMotion, !reduceMotion else {
            proxy.scrollTo("chat-bottom", anchor: .bottom)
            return
        }
        withAnimation(.easeOut(duration: 0.14)) {
            proxy.scrollTo("chat-bottom", anchor: .bottom)
        }
    }

    private var chatHeaderControls: some View {
        HStack(spacing: 16) {
            Button {
                EvoHaptics.tap()
                focused = false
                onOpenSidebar()
            } label: {
                EvoIcon(systemName: "square.grid.2x2")
                    .evoSymbol(.navigation, weight: .medium)
                    .evoIconTarget()
                    .frame(width: 44, height: 44)
                    .modifier(EvoNavigationGlass(shape: Circle()))
                    .overlay(Circle().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
            }
            .accessibilityLabel("Sidebar and conversations")
            Spacer(minLength: 0)
            HStack(spacing: 0) {
                Menu {
                    Button { EvoHaptics.tap(); model.newConversation() } label: {
                        EvoSymbolLabel("New Conversation", systemImage: "square.and.pencil")
                    }.disabled(model.loading)
                    Button { EvoHaptics.tap(); showHistory = true } label: {
                        EvoSymbolLabel("History", systemImage: "clock.arrow.circlepath")
                    }
                    Divider()
                    Button { navigate(cowork ? .chat : .cowork) } label: {
                        EvoSymbolLabel(cowork ? "Chat" : "Cowork", systemImage: cowork ? "bubble.left.and.bubble.right" : "cup.and.saucer.fill")
                    }
                    Button { navigate(.schedule) } label: { EvoSymbolLabel("Schedule", systemImage: "calendar") }
                    Button { navigate(.library) } label: { EvoSymbolLabel("Library", systemImage: "folder") }
                } label: {
                    EvoIcon(systemName: "ellipsis").evoSymbol(.navigation, weight: .medium).evoIconTarget()
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("More options")
                Button {
                    EvoHaptics.tap()
                    focused = false
                    onOpenProfile()
                } label: {
                    NativeAvatarView(model: .shared, size: 30)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Profile: \(displayName)")
            }
            .padding(.horizontal, 3)
            .frame(height: 44)
            .modifier(EvoNavigationGlass(shape: Capsule()))
            .overlay(Capsule().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .foregroundStyle(EvoTheme.Palette.ink)
    }

    private var chatHeader: some View {
        chatHeaderControls
            .padding(.horizontal, 20)
            .frame(maxWidth: 720)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
    }

    private var canSend: Bool {
        !model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.attachment != nil
    }
    private var textFileTypes: [UTType] {
        [.plainText, .commaSeparatedText, .json,
         UTType(filenameExtension: "md") ?? .plainText,
         UTType(filenameExtension: "tsv") ?? .plainText]
    }
    private func send() {
        guard canSend, !processingPhoto else { return }
        if model.loading && !cowork {
            sendTask?.cancel()
            sendTask = nil
            model.cancelActiveSend()
        }
        EvoHaptics.send()
        focused = false
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        sendTask = Task {
            await model.send()
            sendTask = nil
        }
    }
    private func importTextFile(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            do {
                let contents = try String(contentsOf: url, encoding: .utf8)
                model.importTextFile(name: url.lastPathComponent, contents: contents)
            } catch {
                model.error = "The file could not be read as UTF-8 text."
                EvoHaptics.failure()
            }
        case .failure:
            model.error = "File selection was cancelled or failed."
            EvoHaptics.failure()
        }
    }
    private var modeTitle: String {
        switch model.agentMode {
        case "plan": "Plan"
        case "fast": "Fast"
        default: "Tutor"
        }
    }
    private func isIPv4Literal(_ host: String) -> Bool {
        let parts = host.split(separator: ".")
        return parts.count == 4 && parts.allSatisfy { part in
            guard let value = Int(part) else { return false }
            return (0...255).contains(value)
        }
    }
}

// MARK: - Search Activity UI (Image 1) & Plus Attachment Interface (Image 2)

private struct NativeSearchSpinnerView: View {
    let size: CGFloat
    @State private var spinning = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(red: 0.85, green: 0.85, blue: 0.88), lineWidth: 1.5)
            Circle()
                .trim(from: 0.08, to: 0.76)
                .stroke(
                    Color(red: 0.52, green: 0.52, blue: 0.56),
                    style: StrokeStyle(lineWidth: 1.5, lineCap: .round)
                )
                .rotationEffect(.degrees(spinning ? 360 : 0))
        }
        .frame(width: size, height: size)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 0.9).repeatForever(autoreverses: false)) {
                spinning = true
            }
        }
    }
}

private struct NativeSourceFaviconView: View {
    let domain: String
    let faviconUrl: String?
    var size: CGFloat = 16
    var isCircular: Bool = false

    private var resolvedURL: URL? {
        if let raw = faviconUrl, !raw.isEmpty, let parsed = URL(string: raw) {
            return parsed
        }
        let encoded = domain.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? domain
        return URL(string: "https://www.google.com/s2/favicons?domain=\(encoded)&sz=64")
    }

    private var initialLetter: String {
        let trimmed = domain.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "W" : String(trimmed.prefix(1)).uppercased()
    }

    var body: some View {
        Group {
            if let url = resolvedURL {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFill()
                    default:
                        fallbackBadge
                    }
                }
            } else {
                fallbackBadge
            }
        }
        .frame(width: size, height: size)
        .background(Color.white)
        .clipShape(isCircular ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: 4.5, style: .continuous)))
        .overlay {
            if isCircular {
                Circle().stroke(Color.black.opacity(0.08), lineWidth: 0.75)
            } else {
                RoundedRectangle(cornerRadius: 4.5, style: .continuous).stroke(Color.black.opacity(0.08), lineWidth: 0.75)
            }
        }
    }

    private var fallbackBadge: some View {
        ZStack {
            Color(red: 0.93, green: 0.94, blue: 0.96)
            Text(initialLetter)
                .font(.system(size: max(8, size * 0.54), weight: .bold))
                .foregroundStyle(Color(red: 0.35, green: 0.37, blue: 0.42))
        }
    }
}

private struct NativeSearchBadgeIcon: View {
    let sources: [NativeWebSearchSource]
    var size: CGFloat = 18

    private var uniqueSources: [NativeWebSearchSource] {
        var seen = Set<String>()
        var picked: [NativeWebSearchSource] = []
        for source in sources {
            let key = source.domain.lowercased()
            if seen.insert(key).inserted {
                picked.append(source)
                if picked.count == 3 { break }
            }
        }
        return picked
    }

    var body: some View {
        if uniqueSources.isEmpty {
            ZStack {
                Circle()
                    .fill(Color(red: 0.94, green: 0.95, blue: 0.97))
                    .frame(width: size, height: size)
                EvoIcon(systemName: "globe")
                    .evoSymbol(.toolbar, weight: .medium)
                    .scaleEffect(0.72)
                    .foregroundStyle(Color(red: 0.28, green: 0.30, blue: 0.35))
            }
        } else {
            HStack(spacing: -5) {
                ForEach(uniqueSources) { source in
                    NativeSourceFaviconView(
                        domain: source.domain,
                        faviconUrl: source.faviconUrl,
                        size: size,
                        isCircular: true
                    )
                    .overlay(Circle().stroke(Color.white, lineWidth: 1.5))
                }
            }
        }
    }
}

struct NativeWebSearchActivityView: View {
    let activity: NativeWebSearchActivity
    let onRetry: (() -> Void)?
    @State private var isExpanded = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            if activity.isOngoing {
                // Active Search Activity
                HStack(spacing: 8) {
                    NativeSearchBadgeIcon(sources: activity.sources, size: 17)
                    Text(activity.title.isEmpty ? "Searching the web" : activity.title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color(red: 0.07, green: 0.07, blue: 0.09))
                    NativeSearchSpinnerView(size: 13)
                    Spacer(minLength: 0)
                }
                .frame(minHeight: 24)

                VStack(alignment: .leading, spacing: 5) {
                    ForEach(activity.queries, id: \.self) { query in
                        HStack(spacing: 8) {
                            EvoIcon(systemName: "magnifyingglass")
                                .evoSymbol(.toolbar)
                                .scaleEffect(0.74)
                                .foregroundStyle(Color(red: 0.55, green: 0.55, blue: 0.58))
                                .frame(width: 14, alignment: .center)
                            Text(query)
                                .font(.system(size: 13.5, weight: .regular))
                                .foregroundStyle(Color(red: 0.42, green: 0.42, blue: 0.45))
                                .lineLimit(1)
                        }
                        .frame(minHeight: 23)
                    }

                    if let step = activity.activeStepLabel, !step.isEmpty {
                        HStack(spacing: 8) {
                            NativeSearchSpinnerView(size: 12.5)
                                .frame(width: 14, alignment: .center)
                            Text(step)
                                .font(.system(size: 13.5, weight: .regular))
                                .foregroundStyle(Color(red: 0.42, green: 0.42, blue: 0.45))
                                .lineLimit(1)
                        }
                        .frame(minHeight: 23)
                    }
                }
                .padding(.leading, 26)
            } else if activity.status == "failed" {
                HStack(spacing: 8) {
                    EvoIcon(systemName: "exclamationmark.circle")
                        .evoSymbol(.toolbar, weight: .medium)
                        .scaleEffect(0.88)
                        .foregroundStyle(Color.red)
                    Text(activity.errorMessage ?? "Web search failed")
                        .font(.system(size: 13.5, weight: .regular))
                        .foregroundStyle(Color(red: 0.42, green: 0.42, blue: 0.45))
                        .lineLimit(2)
                    Spacer(minLength: 4)
                    if let onRetry {
                        Button {
                            EvoHaptics.tap()
                            onRetry()
                        } label: {
                            Text("Retry")
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(Color(red: 0.08, green: 0.08, blue: 0.10))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .frame(minHeight: 44)
                                .background(Color(red: 0.94, green: 0.94, blue: 0.96), in: Capsule())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                    }
                }
                .frame(minHeight: 44)
            } else if activity.status == "cancelled" {
                HStack(spacing: 8) {
                    NativeSearchBadgeIcon(sources: activity.sources, size: 17)
                        .opacity(0.6)
                    Text("Web search cancelled")
                        .font(.system(size: 13.5, weight: .regular))
                        .foregroundStyle(Color(red: 0.55, green: 0.55, blue: 0.58))
                }
                .frame(minHeight: 24)
            } else if false {
                // Hidden: do not show sources after answer is generating
                Button {
                    EvoHaptics.tap()
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        NativeSearchBadgeIcon(sources: activity.sources, size: 17)
                        Text(activity.summary ?? "Searched the web · \(activity.sources.count) \(activity.sources.count == 1 ? "source" : "sources")")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color(red: 0.42, green: 0.42, blue: 0.45))
                        EvoIcon(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.68)
                            .foregroundStyle(Color(red: 0.60, green: 0.60, blue: 0.64))
                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(activity.summary ?? "Searched the web")

                if isExpanded {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(activity.queries, id: \.self) { query in
                            HStack(spacing: 8) {
                                EvoIcon(systemName: "magnifyingglass")
                                    .evoSymbol(.toolbar)
                                    .scaleEffect(0.72)
                                    .foregroundStyle(Color(red: 0.55, green: 0.55, blue: 0.58))
                                    .frame(width: 14)
                                Text(query)
                                    .font(.system(size: 13, weight: .regular))
                                    .foregroundStyle(Color(red: 0.42, green: 0.42, blue: 0.45))
                            }
                        }

                        if !activity.sources.isEmpty {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(activity.sources) { source in
                                    Button {
                                        EvoHaptics.tap()
                                        if let url = URL(string: source.url) {
                                            openURL(url)
                                        }
                                    } label: {
                                        VStack(alignment: .leading, spacing: 3) {
                                            HStack(spacing: 6) {
                                                NativeSourceFaviconView(
                                                    domain: source.domain,
                                                    faviconUrl: source.faviconUrl,
                                                    size: 16
                                                )
                                                Text(source.domain)
                                                    .font(.system(size: 12, weight: .medium))
                                                    .foregroundStyle(Color(red: 0.45, green: 0.45, blue: 0.48))
                                                if let pub = source.publishedAt, !pub.isEmpty {
                                                    Text("· \(pub)")
                                                        .font(.system(size: 11.5, weight: .regular))
                                                        .foregroundStyle(Color(red: 0.58, green: 0.58, blue: 0.62))
                                                }
                                                Spacer(minLength: 0)
                                                EvoIcon(systemName: "arrow.up.right.square")
                                                    .evoSymbol(.toolbar, weight: .medium)
                                                    .scaleEffect(0.72)
                                                    .foregroundStyle(Color(red: 0.58, green: 0.58, blue: 0.62))
                                            }
                                            Text(source.title)
                                                .font(.system(size: 13.5, weight: .semibold))
                                                .foregroundStyle(Color(red: 0.08, green: 0.08, blue: 0.10))
                                                .lineLimit(1)
                                            Text(source.snippet)
                                                .font(.system(size: 12.5, weight: .regular))
                                                .foregroundStyle(Color(red: 0.43, green: 0.43, blue: 0.46))
                                                .lineLimit(2)
                                                .multilineTextAlignment(.leading)
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 9)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(
                                            Color(red: 0.965, green: 0.965, blue: 0.975),
                                            in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        )
                                    }
                                    .buttonStyle(EvoScalePressButtonStyle())
                                }
                            }
                            .padding(.top, 2)
                        }
                    }
                    .padding(.leading, 24)
                    .transition(.opacity)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

struct ArlenPlusAttachmentSheet: View {
    let onPickPhotos: () -> Void
    let onOpenCamera: () -> Void
    let onImportFile: () -> Void
    let onCreateFile: () -> Void

    var body: some View {
        ZStack {
            Color(red: 248.0 / 255, green: 248.0 / 255, blue: 250.0 / 255)
                .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 26) {
                    // Top Horizontally Scrollable Quick-Access Cards
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            quickShortcutCard(
                                icon: "camera",
                                title: "Camera",
                                subtitle: "Take a photo",
                                action: onOpenCamera
                            )

                            quickShortcutCard(
                                icon: "photo",
                                title: "Photos",
                                subtitle: "Choose images",
                                action: onPickPhotos
                            )

                            quickShortcutCard(
                                icon: "folder",
                                title: "Files",
                                subtitle: "Attach documents",
                                action: onImportFile
                            )
                        }
                        .padding(.horizontal, 20)
                    }

                    // Main Action List
                    VStack(alignment: .leading, spacing: 22) {
                        plusMenuRow(
                            icon: "camera",
                            title: "Camera",
                            subtitle: "Capture photo",
                            action: onOpenCamera
                        )

                        plusMenuRow(
                            icon: "photo",
                            title: "Photos",
                            subtitle: "Photo library",
                            action: onPickPhotos
                        )

                        plusMenuRow(
                            icon: "paperclip",
                            title: "Files",
                            subtitle: "Documents and archives",
                            action: onImportFile
                        )

                        plusMenuRow(
                            icon: "doc.badge.plus",
                            title: "Create file",
                            subtitle: "PDF, Word, Excel",
                            action: onCreateFile
                        )
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                }
                .padding(.top, 24)
            }
        }
    }

    @ViewBuilder
    private func quickShortcutCard(
        icon: String,
        title: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            EvoHaptics.tap()
            action()
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                EvoIcon(systemName: icon)
                    .evoSymbol(.toolbar, weight: .regular)
                    .foregroundStyle(Color(red: 0.08, green: 0.08, blue: 0.10))

                Spacer(minLength: 12)

                Text(title)
                    .font(.system(size: 14.5, weight: .semibold))
                    .foregroundStyle(Color(red: 0.08, green: 0.08, blue: 0.10))
                    .lineLimit(1)

                Text(subtitle)
                    .font(.system(size: 12.5, weight: .regular))
                    .foregroundStyle(Color(red: 0.50, green: 0.50, blue: 0.53))
                    .lineLimit(1)
                    .padding(.top, 2)
            }
            .padding(14)
            .frame(width: 136, height: 92, alignment: .leading)
            .background(
                Color(red: 239.0 / 255, green: 239.0 / 255, blue: 242.0 / 255),
                in: RoundedRectangle(cornerRadius: 18, style: .continuous)
            )
        }
        .buttonStyle(EvoScalePressButtonStyle())
    }

    @ViewBuilder
    private func plusMenuRow(
        icon: String,
        title: String,
        subtitle: String,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            EvoHaptics.tap()
            action()
        } label: {
            HStack(spacing: 16) {
                EvoIcon(systemName: icon)
                    .evoSymbol(.standard, weight: .regular)
                    .foregroundStyle(Color(red: 0.08, green: 0.08, blue: 0.10))
                    .frame(width: 28, height: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16.5, weight: .medium))
                        .foregroundStyle(Color(red: 0.07, green: 0.07, blue: 0.09))
                    Text(subtitle)
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Color(red: 0.48, green: 0.48, blue: 0.51))
                }

                Spacer(minLength: 8)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(EvoScalePressButtonStyle())
    }
}

struct ArlenCreateFileSheet: View {
    let onCreated: (String, String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var fileTitle = "Project_Report"
    @State private var fileFormat = "csv"
    @State private var fileBody = "Metric,Q1,Q2,Q3\nRevenue,12400,15800,19200\nGrowth,12%,18%,24%"

    var body: some View {
        NavigationStack {
            Form {
                Section("Document Format") {
                    Picker("Format", selection: $fileFormat) {
                        Text("Excel / CSV (.csv)").tag("csv")
                        Text("Document (.md)").tag("md")
                        Text("Plain Text (.txt)").tag("txt")
                        Text("JSON Data (.json)").tag("json")
                    }
                    .pickerStyle(.segmented)
                }

                Section("File Name") {
                    TextField("File name", text: $fileTitle)
                        .textInputAutocapitalization(.words)
                }

                Section("Contents") {
                    TextEditor(text: $fileBody)
                        .font(.system(size: 13.5, design: .monospaced))
                        .frame(minHeight: 130)
                }

                Section {
                    Button {
                        EvoHaptics.tap()
                        let cleanTitle = fileTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                        let baseName = cleanTitle.isEmpty ? "Document" : cleanTitle
                        let fullName = "\(baseName).\(fileFormat)"
                        ArlenArtifactManager.exportAndShare(
                            item: ArlenVisualFileItem(
                                name: fullName,
                                subtitle: "Created in Arlen",
                                kind: fileFormat,
                                url: nil,
                                content: fileBody
                            )
                        )
                    } label: {
                        Label("Export / Share File", systemImage: "square.and.arrow.up")
                    }

                    Button {
                        EvoHaptics.send()
                        let cleanTitle = fileTitle.trimmingCharacters(in: .whitespacesAndNewlines)
                        let baseName = cleanTitle.isEmpty ? "Document" : cleanTitle
                        onCreated("\(baseName).\(fileFormat)", fileBody)
                    } label: {
                        Label("Attach to Conversation", systemImage: "paperclip")
                            .fontWeight(.semibold)
                    }
                }
            }
            .navigationTitle("Create File")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

struct ArlenCameraPickerView: UIViewControllerRepresentable {
    let onPicked: (Data?) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onPicked: onPicked)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let onPicked: (Data?) -> Void
        init(onPicked: @escaping (Data?) -> Void) {
            self.onPicked = onPicked
        }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            let img = (info[.editedImage] as? UIImage) ?? (info[.originalImage] as? UIImage)
            onPicked(img?.jpegData(compressionQuality: 0.88))
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onPicked(nil)
        }
    }
}

struct IdeasView: View {
    @StateObject private var model = IdeasModel()
    @State private var composing = false
    var body: some View {
        NavigationStack {
            List {
                if let error = model.error { Text(error).foregroundStyle(.red) }
                if model.tasks.isEmpty && !model.loading { EvoUnavailableView("Még nincs ötlet", systemImage: "lightbulb", description: Text("Hozz létre egy feladatot az ötletbörzében." )).listRowSeparator(.hidden) }
                ForEach(model.tasks) { task in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack { Text(task.icon); Text(task.name).font(EvoFont.text(.headline)); Spacer(); EvoIcon(systemName: task.approved ? "checkmark.circle.fill" : "circle").evoSymbol(.standard).foregroundStyle(task.approved ? Color.green : EvoTheme.Symbol.secondary) }
                        Text(task.description).font(EvoFont.text(.subheadline)).foregroundStyle(EvoTheme.Symbol.secondary)
                        Button(task.approved ? "Jóváhagyás visszavonása" : "Jóváhagyás") { EvoHaptics.tap(); Task { await model.setApproved(task, !task.approved) } }.font(EvoFont.text(.subheadline))
                    }.padding(.vertical, 6)
                }
            }
            .overlay { if model.loading && model.tasks.isEmpty { ProgressView() } }
            .navigationTitle("Ötletbörze")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button { EvoHaptics.tap(); Task { await model.load() } } label: { EvoIcon(systemName: "arrow.clockwise").evoSymbol(.navigation).evoIconTarget().frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("Frissítés") }
                ToolbarItem(placement: .topBarTrailing) { Button { EvoHaptics.tap(); composing = true } label: { EvoIcon(systemName: "plus").evoSymbol(.navigation).evoIconTarget().frame(minWidth: 44, minHeight: 44) }.accessibilityLabel("Új ötlet") }
            }
            .task { await model.load() }
            .sheet(isPresented: $composing) {
                NavigationStack {
                    Form {
                        TextField("Feladat neve", text: $model.name).textInputAutocapitalization(.sentences)
                        TextField("Leírás", text: $model.description, axis: .vertical).lineLimit(3...6)
                        Button("Létrehozás") { EvoHaptics.send(); Task { await model.create(); if model.error == nil { composing = false } } }.disabled(model.name.trimmingCharacters(in: .whitespaces).isEmpty || model.description.trimmingCharacters(in: .whitespaces).isEmpty)
                        if let error = model.error { Text(error).foregroundStyle(.red) }
                    }
                    .navigationTitle("Új ötlet")
                    .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Mégse") { EvoHaptics.tap(); composing = false } } }
                }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
            }
        }
    }
}

enum NativeTab: Hashable {
    case chat, cowork, schedule, library, plugins, profile
}

struct NativeRootView: View {
    @AppStorage("native.evolingo.appearance") private var appearance = "system"
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var chatModel = ChatModel(namespace: "chat")
    @StateObject private var coworkModel = ChatModel(namespace: "cowork")
    @State private var selectedTab: NativeTab = .chat
    @State private var showSidebar = false
    @State private var sidebarDragOffset: CGFloat = 0
    @State private var isHorizontalDragLatched: Bool? = nil

    var body: some View {
        GeometryReader { geometry in
            let sidebarWidth = min(340, geometry.size.width * 0.78)
            let currentOffset = (showSidebar ? sidebarWidth : 0) + sidebarDragOffset
            let progress = max(0, min(1, currentOffset / sidebarWidth))
            let screenShape = RoundedCornerShape(radius: progress * 32, corners: [.topLeft, .bottomLeft])

            ZStack(alignment: .leading) {
                ChatLayerSidebarView(
                    model: chatModel,
                    cowork: false,
                    activeTab: selectedTab,
                    navigate: { tab in
                        selectedTab = tab
                        closeSidebar()
                    },
                    onClose: {
                        closeSidebar()
                    }
                )
                .frame(width: sidebarWidth, height: geometry.size.height)
                .offset(x: (progress - 1) * 28)
                .allowsHitTesting(showSidebar)
                .accessibilityHidden(!showSidebar)
                .accessibilityAction(.escape, closeSidebar)

                activeScreenView
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .allowsHitTesting(!showSidebar)
                    .accessibilityHidden(showSidebar)
                    .overlay {
                        if showSidebar {
                            Color.clear
                                .contentShape(Rectangle())
                                .onTapGesture(perform: closeSidebar)
                                .accessibilityHidden(true)
                        }
                    }
                    .clipShape(screenShape)
                    .overlay {
                        screenShape.stroke(EvoTheme.Palette.line.opacity(progress), lineWidth: 1)
                            .allowsHitTesting(false)
                    }
                    .shadow(color: .black.opacity(Double(progress) * 0.14), radius: 16, x: -5)
                    .offset(x: currentOffset)
            }
            .background(Color.white.ignoresSafeArea())
            .simultaneousGesture(
                DragGesture(minimumDistance: 8)
                    .onChanged { gesture in
                        if isHorizontalDragLatched == nil {
                            if abs(gesture.translation.width) > 3 || abs(gesture.translation.height) > 3 {
                                isHorizontalDragLatched = abs(gesture.translation.width) > abs(gesture.translation.height) * 1.1
                            }
                        }
                        guard isHorizontalDragLatched == true else { return }

                        if !showSidebar {
                            if gesture.startLocation.x < 54 && gesture.translation.width > 0 {
                                sidebarDragOffset = min(sidebarWidth, max(0, gesture.translation.width))
                            }
                        } else if gesture.translation.width < 0 {
                            sidebarDragOffset = max(-sidebarWidth, gesture.translation.width)
                        }
                    }
                    .onEnded { gesture in
                        defer { isHorizontalDragLatched = nil }
                        guard showSidebar || sidebarDragOffset != 0 else { return }
                        let velocity = gesture.predictedEndTranslation.width - gesture.translation.width
                        let rawVelocity = gesture.predictedEndTranslation.width
                        let translation = gesture.translation.width

                        let shouldOpen: Bool
                        if showSidebar {
                            // Closing gesture: swiping left
                            shouldOpen = !(velocity < -100 || rawVelocity < -80 || translation < -sidebarWidth * 0.3)
                        } else {
                            // Opening gesture: swiping right
                            shouldOpen = (velocity > 100 || rawVelocity > 80 || translation > sidebarWidth * 0.3)
                        }
                        withAnimation(.spring(response: 0.26, dampingFraction: 0.88)) {
                            showSidebar = shouldOpen
                            sidebarDragOffset = 0
                        }
                    }
            )
        }
        .ignoresSafeArea(.container, edges: selectedTab == .cowork ? [.top] : [.top])
        .onChange(of: selectedTab) { _, _ in EvoHaptics.selection() }
        .task { EvoHaptics.prepare() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { EvoHaptics.prepare() }
        }
        .font(EvoFont.text(.body))
        .symbolRenderingMode(.monochrome)
        .foregroundStyle(EvoTheme.Symbol.primary)
        .tint(EvoTheme.Symbol.primary)
        .preferredColorScheme(appearance == "light" ? .light : appearance == "dark" ? .dark : nil)
        .transaction { transaction in
            if reduceMotion || systemReduceMotion { transaction.animation = nil }
        }
    }

    private func closeSidebar() {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
            showSidebar = false
            sidebarDragOffset = 0
        }
    }

    @ViewBuilder
    private var activeScreenView: some View {
        switch selectedTab {
        case .chat:
            ChatView(
                cowork: false,
                navigate: { selectedTab = $0 },
                onOpenSidebar: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showSidebar.toggle()
                    }
                },
                onOpenProfile: { selectedTab = .profile },
                model: chatModel
            )
        case .cowork:
            CoworkProjectManagerView(
                navigate: { selectedTab = $0 },
                onOpenSidebar: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showSidebar.toggle()
                    }
                },
                onOpenProfile: { selectedTab = .profile },
                model: coworkModel
            )
        case .schedule:
            ModernScheduleView(
                onOpenSidebar: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showSidebar.toggle()
                    }
                },
                onOpenProfile: { selectedTab = .profile }
            )
        case .library:
            ModernLibraryView(
                onOpenSidebar: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showSidebar.toggle()
                    }
                },
                onOpenProfile: { selectedTab = .profile }
            )
        case .plugins:
            ModernPluginsView(
                onOpenSidebar: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showSidebar.toggle()
                    }
                },
                onOpenProfile: { selectedTab = .profile }
            )
        case .profile:
            ProfileView(
                onBack: { selectedTab = .chat }
            )
        }
    }
}
