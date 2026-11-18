import SwiftUI
import Foundation

// MARK: - API Models & Store for My Space

struct MyspaceCatalogApp: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var name: String
    var description: String
    var version: String
    var permissions: [String]
}

struct MyspaceInstallation: Identifiable, Codable, Equatable, Sendable {
    var id: String { appId }
    var appId: String
    var version: String
    var artifactIntegrity: String?
    var latestArtifactIntegrity: String?
    var artifactUpdateAvailable: Bool?
    var pinned: Bool
    var storageGranted: Bool?
    var networkGranted: Bool?
    var name: String?
    var icon: String?
    var lastOpenedAt: String?
    var data: String
    var createdAt: String
    var updatedAt: String?
}

struct MyspaceBuilderReadiness: Codable, Equatable, Sendable {
    var available: Bool
    var mode: String?
    var reason: String
    var missing: [String]?
}

struct MyspaceOverviewResponse: Codable, Sendable {
    var onboarded: Bool?
    var catalog: [MyspaceCatalogApp]
    var networkDomains: [String]?
    var installations: [MyspaceInstallation]
    var builder: MyspaceBuilderReadiness
}

struct MyspaceShareGrant: Codable, Equatable, Hashable, Sendable {
    var granteeOwner: String
    var role: String
}

struct MyspaceProjectRecord: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var name: String
    var description: String
    var icon: String?
    var revision: String
    var draftVersion: String
    var workingVersion: String?
    var sdkVersion: String?
    var status: String?
    var accessRole: String? // "owner" | "editor" | "viewer"
    var ownership: String? // "created" | "shared"
    var pinned: Bool?
    var sharedWith: [MyspaceShareGrant]?
    var createdAt: String?
    var updatedAt: String
    var lastOpenedAt: String?
}

struct MyspaceProjectsListResponse: Codable, Sendable {
    var projects: [MyspaceProjectRecord]
    var nextCursor: Int?
    var total: Int?
    var shareCode: String?
}

struct MyspaceVersionRecord: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var revision: String
    var summary: String
    var createdAt: String
    var status: String
    var testStatus: String
}

struct MyspaceVersionWithFiles: Codable, Equatable, Sendable {
    var id: String
    var revision: String
    var summary: String
    var createdAt: String
    var status: String
    var testStatus: String
    var files: [String: String]
}

struct MyspaceExecutionStep: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var title: String
    var status: String
    var detail: String
}

struct MyspaceExecutionRecord: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var prompt: String
    var status: String
    var steps: [MyspaceExecutionStep]?
    var verdict: String
    var durationSeconds: Int?
    var createdAt: String
}

struct MyspaceProjectDetailResponse: Codable, Sendable {
    var project: MyspaceProjectRecord
    var history: [MyspaceVersionRecord]
    var current: MyspaceVersionWithFiles
    var executions: [MyspaceExecutionRecord]?
}

enum MyspaceRowEntry: Identifiable, Equatable {
    case project(MyspaceProjectRecord)
    case installation(MyspaceInstallation)

    var id: String {
        switch self {
        case .project(let p): return "proj:\(p.id)"
        case .installation(let a): return "app:\(a.appId)"
        }
    }

    var title: String {
        switch self {
        case .project(let p): return p.name
        case .installation(let a): return a.name ?? a.appId.capitalized
        }
    }

    var updatedAtISO: String {
        switch self {
        case .project(let p): return p.updatedAt
        case .installation(let a): return a.updatedAt ?? a.lastOpenedAt ?? a.createdAt
        }
    }

    var symbolName: String {
        switch self {
        case .project(let p):
            return Self.symbol(for: p.icon ?? "books")
        case .installation(let a):
            return Self.symbol(for: a.icon ?? a.appId)
        }
    }

    static func symbol(for icon: String) -> String {
        switch icon {
        case "books", "api-inspector": return "books.vertical"
        case "sliders": return "slider.horizontal.2"
        case "checklist", "focus-board": return "list.bullet.rectangle"
        case "terminal": return "terminal"
        case "code": return "chevron.left.forwardslash.chevron.right"
        case "chart": return "chart.bar"
        default: return "doc.text"
        }
    }
}

enum MyspaceViewState: Equatable {
    case initialLoading
    case loaded
    case empty
    case searching
    case noResults
    case error(String)
}

@MainActor
final class MyspaceStore: ObservableObject {
    @Published var overview: MyspaceOverviewResponse?
    @Published var projects: [MyspaceProjectRecord] = []
    @Published var nextCursor: Int? = nil
    @Published var shareCode: String = ""
    @Published var selectedFilter: String = "all" // "all" | "created" | "shared"
    @Published var searchText: String = ""
    @Published var viewState: MyspaceViewState = .initialLoading
    @Published var actionError: String? = nil
    @Published var isMutating: Bool = false

    // Workspace state
    @Published var activeDetail: MyspaceProjectDetailResponse? = nil
    @Published var isLoadingDetail: Bool = false
    @Published var isAiWorking: Bool = false
    @Published var latestExecution: MyspaceExecutionRecord? = nil

    private var searchTask: Task<Void, Never>? = nil
    private let baseURL = URL(string: "https://api.sycord.site")!

    var guestToken: String {
        let key = "native.evolingo.myspace.guest_token"
        if let existing = UserDefaults.standard.string(forKey: key),
           existing.count == 64,
           existing.allSatisfy({ $0.isHexDigit }) {
            return existing
        }
        var bytes = [UInt8](repeating: 0, count: 32)
        for i in 0..<32 { bytes[i] = UInt8.random(in: 0...255) }
        let hex = bytes.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(hex, forKey: key)
        return hex
    }

    private func authorizedRequest(path: String, method: String = "GET", body: [String: Any]? = nil) throws -> URLRequest {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.timeoutInterval = 22
        req.setValue(guestToken, forHTTPHeaderField: "X-Myspace-Guest")
        req.setValue("https://api.sycord.site", forHTTPHeaderField: "Origin")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        return req
    }

    func loadInitial() async {
        if overview == nil && projects.isEmpty {
            viewState = .initialLoading
        }
        await refreshAll()
    }

    func refreshAll() async {
        do {
            actionError = nil
            let ovReq = try authorizedRequest(path: "/api/myspace")
            let (ovData, ovResp) = try await URLSession.shared.data(for: ovReq)
            guard let httpOv = ovResp as? HTTPURLResponse, (200..<300).contains(httpOv.statusCode) else {
                let errMsg = Self.extractError(from: ovData) ?? "Unable to connect to My Space."
                viewState = .error(errMsg)
                return
            }
            let decodedOv = try JSONDecoder().decode(MyspaceOverviewResponse.self, from: ovData)
            self.overview = decodedOv

            try await fetchProjects(resetCursor: true)
            syncSidebarPins()
        } catch is CancellationError {
            return
        } catch {
            viewState = .error("Could not load My Space. Check your connection and retry.")
        }
    }

    func scheduleDebouncedSearch() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 240_000_000) // 240ms debounce
            guard !Task.isCancelled else { return }
            viewState = .searching
            do {
                try await fetchProjects(resetCursor: true)
            } catch is CancellationError {
                return
            } catch {
                viewState = .error("Search failed. Please retry.")
            }
        }
    }

    func fetchProjects(resetCursor: Bool) async throws {
        var comps = URLComponents(string: "https://api.sycord.site/api/myspace/projects")!
        let trimmedQuery = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        var items: [URLQueryItem] = [
            URLQueryItem(name: "filter", value: selectedFilter),
            URLQueryItem(name: "limit", value: "20")
        ]
        if !trimmedQuery.isEmpty {
            items.append(URLQueryItem(name: "q", value: trimmedQuery))
        }
        if !resetCursor, let cursor = nextCursor {
            items.append(URLQueryItem(name: "cursor", value: String(cursor)))
        }
        comps.queryItems = items

        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        req.timeoutInterval = 18
        req.setValue(guestToken, forHTTPHeaderField: "X-Myspace-Guest")

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw NSError(domain: "Myspace", code: 1, userInfo: [NSLocalizedDescriptionKey: Self.extractError(from: data) ?? "Failed to load projects"])
        }
        let decoded = try JSONDecoder().decode(MyspaceProjectsListResponse.self, from: data)
        if resetCursor {
            self.projects = decoded.projects
        } else {
            let existingIDs = Set(self.projects.map(\.id))
            let newOnes = decoded.projects.filter { !existingIDs.contains($0.id) }
            self.projects.append(contentsOf: newOnes)
        }
        self.nextCursor = decoded.nextCursor
        if let code = decoded.shareCode {
            self.shareCode = code
        }
        updateComputedViewState()
        syncSidebarPins()
    }

    var unifiedRows: [MyspaceRowEntry] {
        var result: [MyspaceRowEntry] = projects.map { .project($0) }
        if selectedFilter != "shared", let installs = overview?.installations {
            let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            for app in installs {
                let name = app.name ?? app.appId.capitalized
                if !q.isEmpty && !name.lowercased().contains(q) && !app.appId.lowercased().contains(q) {
                    continue
                }
                result.append(.installation(app))
            }
        }
        return result
    }

    func updateComputedViewState() {
        let rows = unifiedRows
        let hasQuery = !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        if rows.isEmpty {
            viewState = hasQuery ? .noResults : .empty
        } else {
            viewState = .loaded
        }
    }

    func syncSidebarPins() {
        var pins: [NativeMyspacePin] = []
        if let installs = overview?.installations {
            for app in installs where app.pinned {
                pins.append(NativeMyspacePin(id: app.appId, name: app.name ?? app.appId.capitalized, icon: app.icon ?? app.appId))
            }
        }
        for proj in projects where proj.pinned == true {
            pins.append(NativeMyspacePin(id: proj.id, name: proj.name, icon: proj.icon ?? "books"))
        }
        if let data = try? JSONEncoder().encode(pins),
           let json = String(data: data, encoding: .utf8) {
            UserDefaults.standard.set(json, forKey: "native.evolingo.myspace.pins")
        }
    }

    // MARK: - Mutations

    func createAppWithAI(name: String, idea: String, icon: String) async throws -> String {
        isAiWorking = true
        actionError = nil
        defer { isAiWorking = false }
        var payload: [String: Any] = [
            "idea": idea.trimmingCharacters(in: .whitespacesAndNewlines),
            "icon": icon
        ]
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanName.isEmpty {
            payload["name"] = cleanName
        }
        let req = try authorizedRequest(path: "/api/myspace/builder", method: "POST", body: payload)
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw NSError(domain: "Myspace", code: 2, userInfo: [NSLocalizedDescriptionKey: Self.extractError(from: data) ?? "AI Builder could not create the project."])
        }
        struct BuilderResponse: Codable {
            var project: MyspaceProjectRecord
            var current: MyspaceVersionWithFiles
            var history: [MyspaceVersionRecord]
            var execution: MyspaceExecutionRecord?
        }
        let decoded = try JSONDecoder().decode(BuilderResponse.self, from: data)
        self.latestExecution = decoded.execution
        self.activeDetail = MyspaceProjectDetailResponse(
            project: decoded.project,
            history: decoded.history,
            current: decoded.current,
            executions: decoded.execution.map { [$0] }
        )
        try? await fetchProjects(resetCursor: true)
        return decoded.project.id
    }

    func loadProjectDetail(id: String) async {
        isLoadingDetail = true
        actionError = nil
        defer { isLoadingDetail = false }
        do {
            let req = try authorizedRequest(path: "/api/myspace/projects/\(id)")
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                actionError = Self.extractError(from: data) ?? "Could not open project workspace."
                return
            }
            let detail = try JSONDecoder().decode(MyspaceProjectDetailResponse.self, from: data)
            self.activeDetail = detail
            self.latestExecution = detail.executions?.first
        } catch {
            actionError = "Could not load project details."
        }
    }

    func iterateProjectWithAI(projectId: String, projectName: String, prompt: String) async -> Bool {
        isAiWorking = true
        actionError = nil
        defer { isAiWorking = false }
        do {
            let req = try authorizedRequest(
                path: "/api/myspace/builder",
                method: "POST",
                body: [
                    "projectId": projectId,
                    "name": projectName,
                    "idea": prompt.trimmingCharacters(in: .whitespacesAndNewlines)
                ]
            )
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                actionError = Self.extractError(from: data) ?? "AI update failed."
                return false
            }
            await loadProjectDetail(id: projectId)
            try? await fetchProjects(resetCursor: true)
            return true
        } catch {
            actionError = "AI update failed."
            return false
        }
    }

    func saveProjectSource(projectId: String, revision: String, files: [String: String], summary: String) async -> Bool {
        isMutating = true
        actionError = nil
        defer { isMutating = false }
        do {
            let req = try authorizedRequest(
                path: "/api/myspace/projects/\(projectId)",
                method: "PATCH",
                body: [
                    "revision": revision,
                    "files": files,
                    "summary": summary.isEmpty ? "Source update" : summary
                ]
            )
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                actionError = Self.extractError(from: data) ?? "Failed to save project source."
                return false
            }
            await loadProjectDetail(id: projectId)
            try? await fetchProjects(resetCursor: true)
            return true
        } catch {
            actionError = "Could not save project source."
            return false
        }
    }

    func mutateProjectMeta(projectId: String, body: [String: Any]) async -> Bool {
        isMutating = true
        actionError = nil
        defer { isMutating = false }
        do {
            let req = try authorizedRequest(path: "/api/myspace/projects/\(projectId)", method: "PATCH", body: body)
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                actionError = Self.extractError(from: data) ?? "Operation failed."
                return false
            }
            try? await fetchProjects(resetCursor: true)
            if activeDetail?.project.id == projectId {
                await loadProjectDetail(id: projectId)
            }
            return true
        } catch {
            actionError = "Could not update project."
            return false
        }
    }

    func deleteProject(projectId: String) async -> Bool {
        isMutating = true
        actionError = nil
        defer { isMutating = false }
        do {
            let req = try authorizedRequest(path: "/api/myspace/projects/\(projectId)", method: "DELETE", body: ["confirm": true])
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                actionError = Self.extractError(from: data) ?? "Could not delete project."
                return false
            }
            if activeDetail?.project.id == projectId {
                activeDetail = nil
            }
            try? await fetchProjects(resetCursor: true)
            return true
        } catch {
            actionError = "Could not delete project."
            return false
        }
    }

    func mutateInstallation(appId: String, action: String, value: Any? = nil) async -> Bool {
        isMutating = true
        actionError = nil
        defer { isMutating = false }
        do {
            var payload: [String: Any] = ["action": action, "appId": appId]
            if action == "install" || action == "approve-update" {
                payload["consent"] = true
            } else if let value {
                payload["value"] = value
            }
            let req = try authorizedRequest(path: "/api/myspace", method: "POST", body: payload)
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                actionError = Self.extractError(from: data) ?? "Operation failed."
                return false
            }
            await refreshAll()
            return true
        } catch {
            actionError = "Operation failed."
            return false
        }
    }

    private static func extractError(from data: Data) -> String? {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let err = obj["error"] as? String, !err.isEmpty else { return nil }
        return err
    }

    static func relativeDateString(from iso: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = isoFormatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let date else { return "Recently" }
        let seconds = Date().timeIntervalSince(date)
        if abs(seconds) < 45 { return "Just now" }
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - ModernSpaceView (My Space Native iOS UI)

struct ModernSpaceView: View {
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void

    @StateObject private var store = MyspaceStore()
    @AppStorage("native.evolingo.myspace.launch") private var launchID = ""
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion

    @State private var activeRuntimeAppID: String? = nil
    @State private var activeProjectWorkspaceID: String? = nil
    @State private var workspaceChatMode = false
    @FocusState private var builderFocused: Bool
    @State private var webLoading = true
    @State private var webError: String?
    @State private var reloadID = UUID()

    // Bottom sheets
    @State private var showCreateSheet = false
    @State private var createName = ""
    @State private var createIdea = ""
    @State private var createIcon = "books"

    @State private var showDiscoverSheet = false
    @State private var discoverSearchText = ""
    @State private var pendingInstallApp: MyspaceCatalogApp? = nil

    @State private var selectedProjectForSheet: MyspaceProjectRecord? = nil
    @State private var selectedInstallForSheet: MyspaceInstallation? = nil
    @State private var renameDraft = ""
    @State private var shareRecipientDraft = ""
    @State private var shareRoleDraft = "viewer"
    @State private var confirmDeleteProject: MyspaceProjectRecord? = nil

    // Workspace editing state
    @State private var selectedFilePath = "src/App.tsx"
    @State private var editedCode = ""
    @State private var editSummary = "Updated source"
    @State private var aiIterationPrompt = ""
    @State private var verdictExpanded = false

    @FocusState private var searchFocused: Bool

    private static let primaryInk = Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255) // #202127
    private static let secondaryText = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255) // #8E8E93
    private static let tertiaryDots = Color(red: 196.0 / 255, green: 196.0 / 255, blue: 201.0 / 255) // #C4C4C9
    private static let cardSurface = Color(red: 249.0 / 255, green: 249.0 / 255, blue: 251.0 / 255) // #F9F9FB
    private static let activePillSurface = Color(red: 242.0 / 255, green: 242.0 / 255, blue: 245.0 / 255) // #F2F2F5
    private static let iconBoxSurface = Color(red: 250.0 / 255, green: 250.0 / 255, blue: 252.0 / 255) // #FAFAFC

    var body: some View {
        ZStack {
            if let runtimeID = activeRuntimeAppID {
                runtimeWorkspaceView(appID: runtimeID)
            } else if let projectID = activeProjectWorkspaceID {
                projectWorkspaceView(projectID: projectID)
            } else {
                myspaceHomeView
            }
        }
        .background(Color.white.ignoresSafeArea())
        .task {
            await store.loadInitial()
            handleIncomingLaunch(launchID)
        }
        .onChange(of: launchID) { _, newValue in
            handleIncomingLaunch(newValue)
        }
        .sheet(isPresented: $showCreateSheet) {
            createAppBottomSheet
        }
        .sheet(isPresented: $showDiscoverSheet) {
            discoverBottomSheet
        }
        .sheet(item: $pendingInstallApp) { app in
            installConsentSheet(for: app)
        }
        .sheet(item: $selectedProjectForSheet) { proj in
            projectOptionsBottomSheet(for: proj)
        }
        .sheet(item: $selectedInstallForSheet) { inst in
            installationOptionsBottomSheet(for: inst)
        }
        .confirmationDialog(
            "Delete Project?",
            isPresented: Binding(
                get: { confirmDeleteProject != nil },
                set: { if !$0 { confirmDeleteProject = nil } }
            ),
            titleVisibility: .visible
        ) {
            if let target = confirmDeleteProject {
                Button("Delete “\(target.name)”", role: .destructive) {
                    Task {
                        let ok = await store.deleteProject(projectId: target.id)
                        if ok {
                            EvoHaptics.success()
                            selectedProjectForSheet = nil
                            if activeProjectWorkspaceID == target.id {
                                activeProjectWorkspaceID = nil
                            }
                        } else {
                            EvoHaptics.failure()
                        }
                        confirmDeleteProject = nil
                    }
                }
            }
            Button("Cancel", role: .cancel) {
                confirmDeleteProject = nil
            }
        } message: {
            Text("This permanently deletes the project, its source revisions, and any sharing grants.")
        }
    }

    private func handleIncomingLaunch(_ id: String) {
        guard !id.isEmpty else { return }
        if ["notes", "focus-board", "api-inspector"].contains(id) {
            activeProjectWorkspaceID = nil
            activeRuntimeAppID = id
        } else {
            activeRuntimeAppID = nil
            activeProjectWorkspaceID = id
            Task { await store.loadProjectDetail(id: id) }
        }
    }

    // MARK: - Home Screen (Reference Layout + Liquid Glass Floating Controls)

    private var myspaceHomeView: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header: 44x44 pt circular Back button left; 44x44 pt circular + button right with Liquid Glass
            HStack {
                Button {
                    EvoHaptics.tap()
                    searchFocused = false
                    onOpenSidebar()
                } label: {
                    EvoIcon(systemName: "chevron.left")
                        .evoSymbol(.navigation, weight: .medium)
                        .evoIconTarget()
                        .foregroundStyle(Self.primaryInk)
                        .frame(width: 44, height: 44)
                        .modifier(EvoNavigationGlass(shape: Circle()))
                }
                .buttonStyle(EvoScalePressButtonStyle())
                .accessibilityLabel("Back and sidebar")

                Spacer(minLength: 0)

                Button {
                    EvoHaptics.tap()
                    searchFocused = false
                    store.actionError = nil
                    showCreateSheet = true
                } label: {
                    EvoIcon(systemName: "plus")
                        .evoSymbol(.navigation, weight: .medium)
                        .evoIconTarget()
                        .foregroundStyle(Self.primaryInk)
                        .frame(width: 44, height: 44)
                        .modifier(EvoNavigationGlass(shape: Circle()))
                }
                .buttonStyle(EvoScalePressButtonStyle())
                .accessibilityLabel("Create app")
            }
            .padding(.horizontal, 22)
            .padding(.top, 56)
            .padding(.bottom, 26)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Quick Actions: Create app & Discover (2 equal-width near-white tiles)
                    HStack(spacing: 12) {
                        Button {
                            EvoHaptics.tap()
                            searchFocused = false
                            store.actionError = nil
                            showCreateSheet = true
                        } label: {
                            VStack(alignment: .leading, spacing: 0) {
                                EvoIcon(systemName: "plus")
                                    .font(.system(size: 18, weight: .medium))
                                    .foregroundStyle(Self.primaryInk)
                                    .frame(width: 22, height: 22, alignment: .leading)
                                    .padding(.bottom, 14)

                                Text("Create app")
                                    .font(EvoFont.sized(17, weight: .semibold, relativeTo: .headline))
                                    .foregroundStyle(Self.primaryInk)
                                    .padding(.bottom, 4)

                                Text("Build with AI")
                                    .font(EvoFont.sized(13, weight: .regular, relativeTo: .footnote))
                                    .foregroundStyle(Self.secondaryText)
                            }
                            .padding(.horizontal, 18)
                            .padding(.vertical, 18)
                            .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
                            .background(Self.cardSurface, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                            .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                        .accessibilityLabel("Create app, Build with AI")

                        Button {
                            EvoHaptics.tap()
                            searchFocused = false
                            discoverSearchText = ""
                            showDiscoverSheet = true
                        } label: {
                            VStack(alignment: .leading, spacing: 0) {
                                EvoIcon(systemName: "compass")
                                    .font(.system(size: 19, weight: .medium))
                                    .foregroundStyle(Self.primaryInk)
                                    .frame(width: 22, height: 22, alignment: .leading)
                                    .padding(.bottom, 14)

                                Text("Discover")
                                    .font(EvoFont.sized(17, weight: .semibold, relativeTo: .headline))
                                    .foregroundStyle(Self.primaryInk)
                                    .padding(.bottom, 4)

                                Text("Explore tools")
                                    .font(EvoFont.sized(13, weight: .regular, relativeTo: .footnote))
                                    .foregroundStyle(Self.secondaryText)
                            }
                            .padding(.horizontal, 18)
                            .padding(.vertical, 18)
                            .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
                            .background(Self.cardSurface, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                            .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                        .accessibilityLabel("Discover, Explore tools")
                    }
                    .padding(.bottom, 34)

                    // Filter Control: All, Created by you, Shared with you
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            filterPill(id: "all", title: "All")
                            filterPill(id: "created", title: "Created by you")
                            filterPill(id: "shared", title: "Shared with you")
                        }
                    }
                    .padding(.bottom, 22)

                    if let actionError = store.actionError {
                        HStack(spacing: 10) {
                            Text(actionError)
                                .font(EvoFont.sized(13.5, weight: .regular, relativeTo: .footnote))
                                .foregroundStyle(EvoTheme.Palette.danger)
                            Spacer()
                            Button("Dismiss") { store.actionError = nil }
                                .font(EvoFont.sized(13, weight: .medium, relativeTo: .footnote))
                        }
                        .padding(12)
                        .background(Color.red.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .padding(.bottom, 14)
                    }

                    // Projects List Content State
                    projectListSection
                        .padding(.bottom, 20)
                }
                .padding(.horizontal, 22)
            }
            .refreshable {
                await store.refreshAll()
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            floatingSearchCapsule
        }
    }

    @ViewBuilder
    private var projectListSection: some View {
        switch store.viewState {
        case .initialLoading:
            HStack(spacing: 10) {
                ProgressView()
                Text("Loading projects…")
                    .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                    .foregroundStyle(Self.secondaryText)
            }
            .padding(.vertical, 28)

        case .error(let message):
            VStack(alignment: .leading, spacing: 12) {
                Text(message)
                    .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                    .foregroundStyle(Self.secondaryText)
                Button {
                    EvoHaptics.tap()
                    Task { await store.refreshAll() }
                } label: {
                    Text("Retry")
                        .font(EvoFont.sized(14.5, weight: .medium, relativeTo: .subheadline))
                        .foregroundStyle(Self.primaryInk)
                        .padding(.horizontal, 16)
                        .frame(height: 38)
                        .background(Self.activePillSurface, in: Capsule())
                }
                .buttonStyle(EvoScalePressButtonStyle())
            }
            .padding(.vertical, 20)

        case .noResults:
            VStack(alignment: .leading, spacing: 10) {
                Text("No projects match “\(store.searchText.trimmingCharacters(in: .whitespacesAndNewlines))”.")
                    .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                    .foregroundStyle(Self.secondaryText)
                Button {
                    EvoHaptics.tap()
                    store.searchText = ""
                    store.scheduleDebouncedSearch()
                } label: {
                    Text("Clear search")
                        .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                        .foregroundStyle(Self.primaryInk)
                        .padding(.horizontal, 14)
                        .frame(height: 36)
                        .background(Self.activePillSurface, in: Capsule())
                }
                .buttonStyle(EvoScalePressButtonStyle())
            }
            .padding(.vertical, 24)

        case .empty:
            VStack(alignment: .leading, spacing: 12) {
                if store.selectedFilter == "shared" {
                    Text("No projects have been shared with you yet.")
                        .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.secondaryText)
                    if !store.shareCode.isEmpty {
                        Text("Your share code: \(store.shareCode)")
                            .font(EvoFont.sized(13, weight: .medium, relativeTo: .caption))
                            .foregroundStyle(Self.primaryInk)
                    }
                } else {
                    Text("No projects in My Space yet.")
                        .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.secondaryText)
                    HStack(spacing: 10) {
                        Button {
                            EvoHaptics.tap()
                            showCreateSheet = true
                        } label: {
                            Text("Create app")
                                .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                                .foregroundStyle(Self.primaryInk)
                                .padding(.horizontal, 15)
                                .frame(height: 38)
                                .background(Self.activePillSurface, in: Capsule())
                        }
                        .buttonStyle(EvoScalePressButtonStyle())

                        Button {
                            EvoHaptics.tap()
                            showDiscoverSheet = true
                        } label: {
                            Text("Discover tools")
                                .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                                .foregroundStyle(Self.secondaryText)
                                .padding(.horizontal, 14)
                                .frame(height: 38)
                        }
                        .buttonStyle(EvoScalePressButtonStyle())
                    }
                }
            }
            .padding(.vertical, 24)

        case .loaded, .searching:
            VStack(alignment: .leading, spacing: 12) {
                ForEach(store.unifiedRows) { entry in
                    projectRowView(entry)
                        .transition(
                            (systemReduceMotion || reduceMotion)
                                ? .identity
                                : .opacity.combined(with: .offset(y: 4))
                        )
                }

                if store.nextCursor != nil {
                    Button {
                        EvoHaptics.tap()
                        Task { try? await store.fetchProjects(resetCursor: false) }
                    } label: {
                        Text("Load more")
                            .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                            .foregroundStyle(Self.primaryInk)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(Self.cardSurface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(EvoScalePressButtonStyle())
                    .padding(.top, 6)
                }
            }
            .animation((systemReduceMotion || reduceMotion) ? nil : .easeOut(duration: 0.19), value: store.unifiedRows.map(\.id))
        }
    }

    private func filterPill(id: String, title: String) -> some View {
        let isSelected = store.selectedFilter == id
        return Button {
            guard store.selectedFilter != id else { return }
            EvoHaptics.selection()
            if systemReduceMotion || reduceMotion {
                store.selectedFilter = id
            } else {
                withAnimation(.easeInOut(duration: 0.20)) {
                    store.selectedFilter = id
                }
            }
            Task { try? await store.fetchProjects(resetCursor: true) }
        } label: {
            Text(title)
                .font(EvoFont.sized(15, weight: isSelected ? .medium : .regular, relativeTo: .subheadline))
                .foregroundStyle(isSelected ? Self.primaryInk : Self.secondaryText)
                .padding(.horizontal, isSelected ? 15 : 10)
                .frame(minHeight: 36)
                .background(
                    isSelected ? Self.activePillSurface : Color.clear,
                    in: Capsule(style: .continuous)
                )
                .contentShape(Capsule())
        }
        .buttonStyle(EvoScalePressButtonStyle())
        .accessibilityLabel("\(title) filter")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func projectRowView(_ entry: MyspaceRowEntry) -> some View {
        HStack(alignment: .center, spacing: 16) {
            Button {
                EvoHaptics.tap()
                searchFocused = false
                switch entry {
                case .project(let proj):
                    Task { _ = await store.mutateProjectMeta(projectId: proj.id, body: ["action": "launch"]) }
                    activeProjectWorkspaceID = proj.id
                    Task { await store.loadProjectDetail(id: proj.id) }
                case .installation(let inst):
                    Task { _ = await store.mutateInstallation(appId: inst.appId, action: "launch") }
                    launchID = inst.appId
                    activeRuntimeAppID = inst.appId
                }
            } label: {
                HStack(alignment: .center, spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 15, style: .continuous)
                            .fill(Self.iconBoxSurface)
                            .frame(width: 52, height: 52)
                        EvoIcon(systemName: entry.symbolName)
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 24, height: 24)
                    }
                    .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.title)
                            .font(EvoFont.sized(17, weight: .regular, relativeTo: .body))
                            .foregroundStyle(Self.primaryInk)
                            .lineLimit(1)

                        Text(MyspaceStore.relativeDateString(from: entry.updatedAtISO))
                            .font(EvoFont.sized(12.5, weight: .regular, relativeTo: .caption))
                            .foregroundStyle(Self.secondaryText)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 8)
                }
                .frame(minHeight: 72)
                .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("\(entry.title), updated \(MyspaceStore.relativeDateString(from: entry.updatedAtISO))")

            Button {
                EvoHaptics.tap()
                searchFocused = false
                switch entry {
                case .project(let proj):
                    renameDraft = proj.name
                    selectedProjectForSheet = proj
                case .installation(let inst):
                    renameDraft = inst.name ?? inst.appId.capitalized
                    selectedInstallForSheet = inst
                }
            } label: {
                EvoIcon(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Self.tertiaryDots)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("\(entry.title) options")
        }
    }

    private var floatingSearchCapsule: some View {
        EvoSearchField(prompt: "Search projects", text: $store.searchText, focus: $searchFocused)
            .onChange(of: store.searchText) { _, _ in
                store.scheduleDebouncedSearch()
            }
            .padding(.horizontal, 20)
            .padding(.top, 6)
            .padding(.bottom, 10)
    }

    // MARK: - Bottom Sheets (Create App, Discover, Project Actions, Installation Actions)

    private var createAppBottomSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Describe your app idea. The AI Builder creates a persisted project using verified @myspace/ui components and opens its workspace.")
                        .font(EvoFont.sized(14.5, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.secondaryText)

                    if let err = store.actionError {
                        Text(err)
                            .font(EvoFont.sized(13.5, weight: .medium, relativeTo: .footnote))
                            .foregroundStyle(EvoTheme.Palette.danger)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Project name (optional)")
                            .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                            .foregroundStyle(Self.primaryInk)
                        TextField("e.g. Study Companion", text: $createName)
                            .textInputAutocapitalization(.words)
                            .disabled(store.isAiWorking)
                            .evoTextInput()
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("What should your app do?")
                            .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                            .foregroundStyle(Self.primaryInk)
                        TextField("Describe features, fields, or workflows…", text: $createIdea, axis: .vertical)
                            .lineLimit(3...6)
                            .disabled(store.isAiWorking)
                            .padding(14)
                            .background(EvoTheme.Palette.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(EvoTheme.Palette.line, lineWidth: 1))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Icon")
                            .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                            .foregroundStyle(Self.primaryInk)
                        Picker("Icon", selection: $createIcon) {
                            Text("Books").tag("books")
                            Text("Sliders").tag("sliders")
                            Text("Notes").tag("notes")
                            Text("Checklist").tag("checklist")
                            Text("Terminal").tag("terminal")
                            Text("Chart").tag("chart")
                            Text("Code").tag("code")
                        }
                        .pickerStyle(.segmented)
                        .disabled(store.isAiWorking)
                    }

                    if store.isAiWorking {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Working…")
                                .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                                .foregroundStyle(Self.secondaryText)
                            HStack(spacing: 8) {
                                ProgressView().controlSize(.small)
                                Text("Synthesizing src/App.tsx and validating schema…")
                                    .font(EvoFont.sized(13.5, weight: .regular, relativeTo: .footnote))
                                    .foregroundStyle(Self.secondaryText)
                            }
                        }
                        .padding(.vertical, 6)
                    }

                    Button {
                        let ideaText = createIdea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? createName.trimmingCharacters(in: .whitespacesAndNewlines)
                            : createIdea.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !ideaText.isEmpty else { return }
                        EvoHaptics.send()
                        Task {
                            do {
                                let newId = try await store.createAppWithAI(
                                    name: createName,
                                    idea: ideaText,
                                    icon: createIcon
                                )
                                EvoHaptics.success()
                                createName = ""
                                createIdea = ""
                                showCreateSheet = false
                                activeProjectWorkspaceID = newId
                            } catch {
                                store.actionError = error.localizedDescription
                                EvoHaptics.failure()
                            }
                        }
                    } label: {
                        Text(store.isAiWorking ? "Building project…" : "Create & open workspace")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .primary))
                    .disabled(
                        store.isAiWorking ||
                        (createIdea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
                         createName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    )

                    if let builder = store.overview?.builder, !builder.available {
                        Text(builder.reason)
                            .font(EvoFont.sized(12.5, weight: .regular, relativeTo: .caption))
                            .foregroundStyle(Self.secondaryText)
                    }
                }
                .padding(22)
            }
            .background(Color.white)
            .navigationTitle("Create app")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        if !store.isAiWorking { showCreateSheet = false }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }

    private var discoverBottomSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 10) {
                        EvoIcon(systemName: "magnifyingglass")
                            .foregroundStyle(Self.secondaryText)
                        TextField("Search catalog tools…", text: $discoverSearchText)
                            .textFieldStyle(.plain)
                    }
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(Self.cardSurface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                    let catalog = (store.overview?.catalog ?? []).filter { app in
                        let q = discoverSearchText.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !q.isEmpty else { return true }
                        return app.name.localizedCaseInsensitiveContains(q) ||
                               app.description.localizedCaseInsensitiveContains(q)
                    }

                    if catalog.isEmpty {
                        Text("No matching tools in catalog.")
                            .font(EvoFont.sized(15, weight: .regular, relativeTo: .subheadline))
                            .foregroundStyle(Self.secondaryText)
                            .padding(.vertical, 24)
                    } else {
                        ForEach(catalog) { app in
                            let isInstalled = store.overview?.installations.contains(where: { $0.appId == app.id }) == true
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(alignment: .top, spacing: 14) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                                            .fill(Color.white)
                                            .frame(width: 48, height: 48)
                                        EvoIcon(systemName: MyspaceRowEntry.symbol(for: app.id))
                                            .font(.system(size: 21, weight: .medium))
                                            .foregroundStyle(Self.primaryInk)
                                    }
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(app.name)
                                            .font(EvoFont.sized(16.5, weight: .semibold, relativeTo: .headline))
                                            .foregroundStyle(Self.primaryInk)
                                        Text(app.description)
                                            .font(EvoFont.sized(13.5, weight: .regular, relativeTo: .subheadline))
                                            .foregroundStyle(Self.secondaryText)
                                        Text("v\(app.version) · Permissions: \(app.permissions.joined(separator: ", "))")
                                            .font(EvoFont.sized(12, weight: .regular, relativeTo: .caption))
                                            .foregroundStyle(Self.secondaryText)
                                    }
                                    Spacer()
                                }

                                Button {
                                    EvoHaptics.tap()
                                    if isInstalled {
                                        showDiscoverSheet = false
                                        Task { _ = await store.mutateInstallation(appId: app.id, action: "launch") }
                                        launchID = app.id
                                        activeRuntimeAppID = app.id
                                    } else {
                                        showDiscoverSheet = false
                                        pendingInstallApp = app
                                    }
                                } label: {
                                    Text(isInstalled ? "Open \(app.name)" : "Add to My Space")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(EvoButtonStyle(kind: isInstalled ? .tertiary : .primary, compact: true))
                            }
                            .padding(18)
                            .background(Self.cardSurface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        }
                    }
                }
                .padding(22)
            }
            .background(Color.white)
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showDiscoverSheet = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }

    private func installConsentSheet(for app: MyspaceCatalogApp) -> some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Install \(app.name)")
                    .font(EvoFont.sized(20, weight: .semibold, relativeTo: .title3))
                    .foregroundStyle(Self.primaryInk)

                Text("This tool runs in an isolated sandbox and requests app-scoped storage (`storage:app`) for this device. It cannot access other projects.")
                    .font(EvoFont.sized(14.5, weight: .regular, relativeTo: .body))
                    .foregroundStyle(Self.secondaryText)

                if app.id == "api-inspector" {
                    Text("Network access (`network:approved`) is disabled by default and can be toggled in settings for approved HTTPS domains.")
                        .font(EvoFont.sized(13.5, weight: .regular, relativeTo: .footnote))
                        .foregroundStyle(Self.secondaryText)
                }

                Spacer()

                Button {
                    EvoHaptics.send()
                    Task {
                        let ok = await store.mutateInstallation(appId: app.id, action: "install")
                        if ok { EvoHaptics.success() }
                        pendingInstallApp = nil
                    }
                } label: {
                    Text(store.isMutating ? "Installing…" : "Allow storage & install")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(EvoButtonStyle(kind: .primary))
                .disabled(store.isMutating)

                Button {
                    pendingInstallApp = nil
                } label: {
                    Text("Cancel")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(EvoButtonStyle(kind: .tertiary))
            }
            .padding(24)
            .background(Color.white)
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }

    private func projectOptionsBottomSheet(for proj: MyspaceProjectRecord) -> some View {
        let canEdit = proj.accessRole != "viewer"
        let isOwner = proj.accessRole == "owner" || proj.accessRole == nil

        return NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Button {
                        EvoHaptics.tap()
                        selectedProjectForSheet = nil
                        activeProjectWorkspaceID = proj.id
                        Task { await store.loadProjectDetail(id: proj.id) }
                    } label: {
                        Text("Open workspace")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .primary, compact: true))

                    if canEdit {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Rename project")
                                .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                            HStack(spacing: 10) {
                                TextField("Project name", text: $renameDraft)
                                    .evoTextInput()
                                Button("Save") {
                                    let clean = renameDraft.trimmingCharacters(in: .whitespacesAndNewlines)
                                    guard !clean.isEmpty else { return }
                                    Task {
                                        let ok = await store.mutateProjectMeta(projectId: proj.id, body: ["action": "rename", "name": clean])
                                        if ok {
                                            EvoHaptics.success()
                                            selectedProjectForSheet = nil
                                        }
                                    }
                                }
                                .buttonStyle(EvoButtonStyle(kind: .tertiary, compact: true))
                                .disabled(renameDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            }
                        }
                    }

                    Button {
                        EvoHaptics.tap()
                        let nextPinned = !(proj.pinned ?? false)
                        Task {
                            _ = await store.mutateProjectMeta(projectId: proj.id, body: ["action": "pin", "pinned": nextPinned])
                            selectedProjectForSheet = nil
                        }
                    } label: {
                        Text((proj.pinned ?? false) ? "Remove from sidebar" : "Add to sidebar")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .tertiary, compact: true))

                    Button {
                        EvoHaptics.tap()
                        Task {
                            _ = await store.mutateProjectMeta(projectId: proj.id, body: ["action": "duplicate"])
                            selectedProjectForSheet = nil
                        }
                    } label: {
                        Text("Duplicate project")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .tertiary, compact: true))

                    if isOwner {
                        Divider()
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Share project")
                                .font(EvoFont.sized(15, weight: .semibold, relativeTo: .headline))
                            if !store.shareCode.isEmpty {
                                Text("Your share code: \(store.shareCode)")
                                    .font(EvoFont.sized(12.5, weight: .regular, relativeTo: .caption))
                                    .foregroundStyle(Self.secondaryText)
                            }
                            TextField("Recipient share code (hex)", text: $shareRecipientDraft)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .evoTextInput()
                            Picker("Role", selection: $shareRoleDraft) {
                                Text("Viewer").tag("viewer")
                                Text("Editor").tag("editor")
                            }
                            .pickerStyle(.segmented)

                            Button {
                                let target = shareRecipientDraft.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                                guard target.count >= 8 else { return }
                                Task {
                                    let ok = await store.mutateProjectMeta(
                                        projectId: proj.id,
                                        body: ["action": "share", "targetOwner": target, "role": shareRoleDraft]
                                    )
                                    if ok {
                                        EvoHaptics.success()
                                        shareRecipientDraft = ""
                                        selectedProjectForSheet = nil
                                    }
                                }
                            } label: {
                                Text("Grant access")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(EvoButtonStyle(kind: .tertiary, compact: true))
                            .disabled(shareRecipientDraft.trimmingCharacters(in: .whitespacesAndNewlines).count < 8)
                        }

                        Divider()
                        Button {
                            EvoHaptics.warning()
                            confirmDeleteProject = proj
                        } label: {
                            Text("Delete project")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(EvoButtonStyle(kind: .danger, compact: true))
                    }
                }
                .padding(22)
            }
            .background(Color.white)
            .navigationTitle(proj.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { selectedProjectForSheet = nil }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }

    private func installationOptionsBottomSheet(for inst: MyspaceInstallation) -> some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Button {
                        EvoHaptics.tap()
                        selectedInstallForSheet = nil
                        launchID = inst.appId
                        activeRuntimeAppID = inst.appId
                    } label: {
                        Text("Open \(inst.name ?? inst.appId.capitalized)")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .primary, compact: true))

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Rename")
                            .font(EvoFont.sized(14, weight: .medium, relativeTo: .subheadline))
                        HStack(spacing: 10) {
                            TextField("App name", text: $renameDraft)
                                .evoTextInput()
                            Button("Save") {
                                let clean = renameDraft.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !clean.isEmpty else { return }
                                Task {
                                    _ = await store.mutateInstallation(appId: inst.appId, action: "rename", value: clean)
                                    selectedInstallForSheet = nil
                                }
                            }
                            .buttonStyle(EvoButtonStyle(kind: .tertiary, compact: true))
                        }
                    }

                    Button {
                        EvoHaptics.tap()
                        Task {
                            _ = await store.mutateInstallation(appId: inst.appId, action: "pin", value: !inst.pinned)
                            selectedInstallForSheet = nil
                        }
                    } label: {
                        Text(inst.pinned ? "Remove from sidebar" : "Add to sidebar")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .tertiary, compact: true))

                    Button {
                        EvoHaptics.warning()
                        Task {
                            _ = await store.mutateInstallation(appId: inst.appId, action: "uninstall")
                            selectedInstallForSheet = nil
                        }
                    } label: {
                        Text("Uninstall and delete app data")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(EvoButtonStyle(kind: .danger, compact: true))
                }
                .padding(22)
            }
            .background(Color.white)
            .navigationTitle(inst.name ?? inst.appId.capitalized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { selectedInstallForSheet = nil }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }

    // MARK: - Project Workspace View (Exact 3-State In-App Flow)

    private func projectWorkspaceView(projectID: String) -> some View {
        let title = store.activeDetail?.project.name ?? "App"
        return VStack(alignment: .leading, spacing: 0) {
            // Top Bar: < left | Centered Title | Orb or ... right
            HStack {
                Button {
                    EvoHaptics.tap()
                    builderFocused = false
                    if workspaceChatMode && !store.isAiWorking {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            workspaceChatMode = false
                        }
                    } else {
                        launchID = ""
                        workspaceChatMode = false
                        activeProjectWorkspaceID = nil
                    }
                } label: {
                    EvoIcon(systemName: "chevron.left")
                        .evoSymbol(.navigation, weight: .medium)
                        .frame(width: 44, height: 44)
                        .modifier(EvoNavigationGlass(shape: Circle()))
                }
                .buttonStyle(EvoScalePressButtonStyle())
                .accessibilityLabel(workspaceChatMode ? "Back to app" : "Back to My Space")

                Spacer()

                Text(title)
                    .font(EvoFont.sized(17, weight: .semibold, relativeTo: .headline))
                    .foregroundStyle(Self.primaryInk)
                    .lineLimit(1)

                Spacer()

                if store.isAiWorking {
                    Button {
                        EvoHaptics.tap()
                        if let p = store.activeDetail?.project {
                            renameDraft = p.name
                            selectedProjectForSheet = p
                        }
                    } label: {
                        EvoIcon(systemName: "ellipsis")
                            .evoSymbol(.navigation, weight: .medium)
                            .frame(width: 44, height: 44)
                            .modifier(EvoNavigationGlass(shape: Circle()))
                    }
                    .buttonStyle(EvoScalePressButtonStyle())
                    .accessibilityLabel("Project options")
                } else {
                    Button {
                        EvoHaptics.tap()
                        builderFocused = false
                        withAnimation(.easeInOut(duration: 0.2)) {
                            workspaceChatMode.toggle()
                        }
                    } label: {
                        EvoIcon(systemName: "evo.builder.orb")
                            .evoSymbol(.navigation, weight: .medium)
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 44, height: 44)
                            .modifier(EvoNavigationGlass(shape: Circle()))
                    }
                    .buttonStyle(EvoScalePressButtonStyle())
                    .accessibilityLabel(workspaceChatMode ? "View app" : "Edit app with AI")
                }
            }
            .padding(.horizontal, 22)
            .padding(.top, 56)
            .padding(.bottom, 14)

            if store.isAiWorking {
                // State 3: Creating your app
                VStack(spacing: 12) {
                    Spacer()
                    EvoIcon(systemName: "evo.builder.orb")
                        .font(.system(size: 46, weight: .regular))
                        .foregroundStyle(Color(red: 161.0 / 255, green: 161.0 / 255, blue: 166.0 / 255))
                        .frame(width: 52, height: 52)
                    Text("Creating your app")
                        .font(EvoFont.sized(17, weight: .medium, relativeTo: .headline))
                        .foregroundStyle(Self.primaryInk)
                    Text("\(title)/src/App.tsx")
                        .font(EvoFont.sized(12.5, weight: .regular, relativeTo: .caption))
                        .foregroundStyle(Self.secondaryText)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.isLoadingDetail && store.activeDetail == nil {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let detail = store.activeDetail {
                if workspaceChatMode {
                    // State 2: AI Builder Chat View
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 16) {
                            if let exec = store.latestExecution {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Worked for \(exec.durationSeconds ?? 1)s")
                                        .font(EvoFont.sized(13.5, weight: .medium, relativeTo: .caption))
                                        .foregroundStyle(Self.secondaryText)
                                    Text(exec.verdict)
                                        .font(EvoFont.sized(16, weight: .regular, relativeTo: .body))
                                        .foregroundStyle(Self.primaryInk)
                                        .lineSpacing(4)
                                }
                                .padding(.top, 12)
                            }
                        }
                        .padding(.horizontal, 22)
                        .padding(.bottom, 100)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        let hasPrompt = !aiIterationPrompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        HStack(alignment: .center, spacing: 6) {
                            Button {
                                EvoHaptics.tap()
                                if let p = store.activeDetail?.project {
                                    renameDraft = p.name
                                    selectedProjectForSheet = p
                                }
                            } label: {
                                EvoIcon(systemName: "plus")
                                    .evoSymbol(.standard, weight: .medium)
                                    .foregroundStyle(Self.primaryInk)
                                    .frame(width: 44, height: 44)
                            }
                            .accessibilityLabel("Project actions")

                            TextField("Írj egy üzenetet…", text: $aiIterationPrompt, axis: .vertical)
                                .textFieldStyle(.plain)
                                .font(EvoFont.text(.body))
                                .lineLimit(1...4)
                                .focused($builderFocused)
                                .submitLabel(.send)
                                .onSubmit { submitBuilderPrompt(detail: detail) }

                            HStack(spacing: 4) {
                                Text("Tutor")
                                    .font(EvoFont.sized(14.5, weight: .medium, relativeTo: .subheadline))
                                    .foregroundStyle(Self.primaryInk)
                                EvoIcon(systemName: "chevron.down")
                                    .font(.system(size: 11.5, weight: .semibold))
                                    .foregroundStyle(Self.primaryInk)
                            }
                            .padding(.horizontal, 8)

                            Button {
                                if hasPrompt {
                                    submitBuilderPrompt(detail: detail)
                                } else {
                                    builderFocused = true
                                }
                            } label: {
                                EvoIcon(systemName: hasPrompt ? "arrow.up" : "waveform")
                                    .evoSymbol(.toolbar, weight: .medium)
                                    .foregroundStyle(hasPrompt ? Color.white : Self.primaryInk)
                                    .frame(width: 44, height: 44)
                                    .background(hasPrompt ? Self.primaryInk : Color.clear, in: Circle())
                            }
                            .buttonStyle(EvoScalePressButtonStyle())
                            .accessibilityLabel(hasPrompt ? "Send" : "Voice")
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .frame(minHeight: 58)
                        .modifier(EvoInputSurface(shape: RoundedRectangle(cornerRadius: 28, style: .continuous)))
                        .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 3)
                        .padding(.horizontal, 16)
                        .padding(.top, 4)
                        .padding(.bottom, builderFocused ? 8 : 12)
                    }
                } else {
                    // State 1: Fast Native In-App Renderer
                    inAppNativeRenderer(for: detail)
                }
            }
        }
    }

    private func submitBuilderPrompt(detail: MyspaceProjectDetailResponse) {
        let prompt = aiIterationPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty, !store.isAiWorking else { return }
        EvoHaptics.send()
        builderFocused = false
        Task {
            let ok = await store.iterateProjectWithAI(
                projectId: detail.project.id,
                projectName: detail.project.name,
                prompt: prompt
            )
            if ok {
                aiIterationPrompt = ""
                workspaceChatMode = false
                EvoHaptics.success()
            } else {
                EvoHaptics.failure()
            }
        }
    }

    @ViewBuilder
    private func inAppNativeRenderer(for detail: MyspaceProjectDetailResponse) -> some View {
        ArlenMiniAppView(
            files: detail.current.files,
            projectName: detail.project.name,
            description: detail.project.description
        )
    }

    private static func extractPrimaryHeadline(from source: String) -> String? {
        if let range = source.range(of: "<h1>([^<]+)</h1>", options: .regularExpression) {
            let match = String(source[range])
            let inner = match.replacingOccurrences(of: "<h1>", with: "").replacingOccurrences(of: "</h1>", with: "")
            let trimmed = inner.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty && !trimmed.contains("{") { return trimmed }
        }
        return nil
    }

    // MARK: - Isolated Runtime WebView for Installed Catalog Apps

    private func runtimeWorkspaceView(appID: String) -> some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    EvoHaptics.tap()
                    launchID = ""
                    activeRuntimeAppID = nil
                } label: {
                    EvoIcon(systemName: "chevron.left")
                        .evoSymbol(.navigation, weight: .medium)
                        .frame(width: 44, height: 44)
                        .modifier(EvoNavigationGlass(shape: Circle()))
                }
                .buttonStyle(EvoScalePressButtonStyle())
                .accessibilityLabel("Back to My Space")

                Spacer()

                Button {
                    EvoHaptics.tap()
                    reloadID = UUID()
                } label: {
                    EvoIcon(systemName: "arrow.clockwise")
                        .evoSymbol(.navigation, weight: .medium)
                        .frame(width: 44, height: 44)
                        .modifier(EvoNavigationGlass(shape: Circle()))
                }
                .buttonStyle(EvoScalePressButtonStyle())
                .accessibilityLabel("Reload app")
            }
            .padding(.horizontal, 22)
            .padding(.top, 56)
            .padding(.bottom, 8)

            ZStack {
                MyspaceWebView(launchID: appID, loading: $webLoading, error: $webError)
                    .id(reloadID)
                if webLoading {
                    ProgressView("Opening app…")
                        .padding(20)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
                }
                if let webError {
                    VStack(spacing: 16) {
                        Text(webError).multilineTextAlignment(.center)
                        Button("Retry") { reloadID = UUID() }.buttonStyle(.borderedProminent)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.white)
                }
            }
        }
    }
}
