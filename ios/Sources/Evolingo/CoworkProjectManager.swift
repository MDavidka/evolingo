import SwiftUI
import Combine

// MARK: - Cowork Models

enum CoworkTimeSection: String, Codable, CaseIterable, Identifiable {
    case today = "Today"
    case yesterday = "Yesterday"
    case previous7Days = "Previous 7 days"
    case older = "Older"

    var id: String { rawValue }
}

struct CoworkProject: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var machineId: String
    var machineName: String
    var branch: String
    var folderName: String
    var folderPath: String
    var section: CoworkTimeSection
    var statusText: String
    var isConnected: Bool
    var lastActiveText: String
    var createdAt: Date
    var updatedAt: Date
    var conversationID: String?
    var isArchived: Bool?

    static let defaultProjects: [CoworkProject] = [
        CoworkProject(
            id: "task-arlen",
            name: "Arlen",
            machineId: "ubuntu-vps",
            machineName: "Ubuntu VPS",
            branch: "main",
            folderName: "arlen",
            folderPath: "/root/evolingo",
            section: .today,
            statusText: "Ubuntu VPS · main",
            isConnected: true,
            lastActiveText: "Today",
            createdAt: Date(),
            updatedAt: Date()
        ),
        CoworkProject(
            id: "task-evolingo",
            name: "Evolingo",
            machineId: "ubuntu-vps",
            machineName: "Ubuntu VPS",
            branch: "main",
            folderName: "root",
            folderPath: "/root/evolingo",
            section: .today,
            statusText: "Ubuntu VPS · main",
            isConnected: true,
            lastActiveText: "Today",
            createdAt: Date().addingTimeInterval(-3600),
            updatedAt: Date().addingTimeInterval(-3600)
        ),
        CoworkProject(
            id: "task-sycord",
            name: "Sycord Cloud",
            machineId: "ubuntu-vps",
            machineName: "Ubuntu VPS",
            branch: "main",
            folderName: "cloud",
            folderPath: "/root/evolingo",
            section: .previous7Days,
            statusText: "Ubuntu VPS · main",
            isConnected: true,
            lastActiveText: "Previous 7 days",
            createdAt: Date().addingTimeInterval(-86400 * 2),
            updatedAt: Date().addingTimeInterval(-86400 * 2)
        )
    ]
}

// MARK: - Machine Models

struct MachineMetricsData: Codable {
    var cpuPercent: Int
    var cpuPercentText: String
    var memoryUsedGB: String
    var memoryTotalGB: String
    var memoryPercent: Int
    var storageUsedGB: String
    var storageTotalGB: String
    var storagePercent: Int
    var status: String
    var timestamp: Double

    static let fallback = MachineMetricsData(
        cpuPercent: 0,
        cpuPercentText: "—",
        memoryUsedGB: "—",
        memoryTotalGB: "—",
        memoryPercent: 0,
        storageUsedGB: "—",
        storageTotalGB: "—",
        storagePercent: 0,
        status: "unknown",
        timestamp: 0
    )
}

struct MachineOverviewData: Codable {
    var id: String
    var name: String
    var status: String
    var statusText: String
    var ip: String
    var hostname: String
    var uptimeFormatted: String
    var kernel: String
    var arch: String
    var osName: String
    var cpuModel: String
    var cpuCores: Int
    var services: [MachineServiceItem]
}

struct MachineServiceItem: Codable, Identifiable {
    var id: String { name }
    var name: String
    var description: String
    var status: String
}

struct MachineStorageVolume: Codable, Identifiable {
    var id: String { mountPoint }
    var filesystem: String
    var size: String
    var used: String
    var available: String
    var percent: String
    var mountPoint: String
}

struct MachineNetworkInfo: Codable {
    var publicIp: String
    var sshPort: Int
    var sshUser: String
    var interfaces: [MachineNetworkInterface]
    var ports: [MachineListeningPort]
}

struct MachineNetworkInterface: Codable, Identifiable {
    var id: String { "\(name)-\(ip)" }
    var name: String
    var ip: String
    var netmask: String
    var family: String
}

struct MachineListeningPort: Codable, Identifiable {
    var id: String { "\(protocolName)-\(port)" }
    var port: Int
    var protocolName: String
    var service: String
    var state: String

    enum CodingKeys: String, CodingKey {
        case port, service, state
        case protocolName = "protocol"
    }
}

struct MachineContainerItem: Codable, Identifiable {
    var id: String
    var name: String
    var runtime: String
    var status: String
}

struct WorkspaceItem: Codable, Identifiable {
    var id: String { path }
    var name: String
    var path: String
    var isDirectory: Bool
    var size: Int
    var modifiedAt: String
}

// MARK: - Machine API Service

@MainActor
final class NativeMachineService: ObservableObject {
    static let shared = NativeMachineService()
    private let baseURL = URL(string: "https://api.sycord.site")!
    private let session = URLSession.shared

    @Published var metrics: MachineMetricsData = .fallback
    @Published private(set) var isConnected = false
    @Published private(set) var isRefreshing = false
    @Published private(set) var lastRefreshAt: Date?
    @Published private(set) var refreshError: String?

    private init() {}

    // The visible machine screen owns the polling task; requests never overlap.
    func fetchMetrics() async {
        guard !isRefreshing,
              let url = URL(string: "/api/machines/ubuntu-vps/metrics", relativeTo: baseURL) else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            var request = URLRequest(url: url)
            request.timeoutInterval = 6
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            let result = try JSONDecoder().decode([String: MachineMetricsData].self, from: data)
            guard let metrics = result["metrics"] else { throw URLError(.cannotParseResponse) }
            try Task.checkCancellation()
            self.metrics = metrics
            isConnected = metrics.status == "connected"
            lastRefreshAt = Date()
            refreshError = nil
        } catch {
            guard !Task.isCancelled else { return }
            isConnected = false
            refreshError = "Status unavailable. Pull down to retry."
        }
    }

    func fetchOverview() async throws -> MachineOverviewData {
        guard let url = URL(string: "/api/machines/ubuntu-vps/overview", relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        let data = try await readData(from: url)
        let res = try JSONDecoder().decode([String: MachineOverviewData].self, from: data)
        guard let overview = res["overview"] else { throw URLError(.cannotParseResponse) }
        return overview
    }

    func fetchStorage() async throws -> [MachineStorageVolume] {
        guard let url = URL(string: "/api/machines/ubuntu-vps/storage", relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        let data = try await readData(from: url)
        let res = try JSONDecoder().decode([String: [MachineStorageVolume]].self, from: data)
        return res["volumes"] ?? []
    }

    func fetchNetwork() async throws -> MachineNetworkInfo {
        guard let url = URL(string: "/api/machines/ubuntu-vps/network", relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        let data = try await readData(from: url)
        return try JSONDecoder().decode(MachineNetworkInfo.self, from: data)
    }

    func fetchEnvironments() async throws -> [MachineContainerItem] {
        guard let url = URL(string: "/api/machines/ubuntu-vps/environments", relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        let data = try await readData(from: url)
        let res = try JSONDecoder().decode([String: [MachineContainerItem]].self, from: data)
        return res["containers"] ?? []
    }

    func executeTerminal(command: String, cwd: String = "/root/evolingo") async throws -> (stdout: String, stderr: String, exitCode: Int) {
        guard let url = URL(string: "/api/machines/ubuntu-vps/terminal", relativeTo: baseURL) else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload = ["command": command, "cwd": cwd]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, _) = try await session.data(for: req)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        return (
            json["stdout"] as? String ?? "",
            json["stderr"] as? String ?? "",
            json["exitCode"] as? Int ?? 0
        )
    }

    func fetchWorkspaces(path: String = "/root/evolingo") async throws -> [WorkspaceItem] {
        var comp = URLComponents(url: URL(string: "/api/machines/ubuntu-vps/workspaces", relativeTo: baseURL)!, resolvingAgainstBaseURL: true)!
        comp.queryItems = [URLQueryItem(name: "path", value: path)]
        let data = try await readData(from: comp.url!)
        let result = try JSONDecoder().decode(WorkspaceResponseWrapper.self, from: data)
        return result.items
    }

    private func readData(from url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    private struct WorkspaceResponseWrapper: Codable {
        var items: [WorkspaceItem]
    }
}

// MARK: - Cowork Project Store

@MainActor
final class CoworkProjectStore: ObservableObject {
    static let shared = CoworkProjectStore()
    @Published var projects: [CoworkProject] = []

    private let storageKey = "arlen.cowork.projects.v5"
    private let baseURL = URL(string: "https://api.sycord.site")!
    private let session = URLSession.shared

    init() {
        loadLocal()
        syncWithBackend()
    }

    func loadLocal() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([CoworkProject].self, from: data) {
            projects = saved
        } else {
            projects = CoworkProject.defaultProjects
            saveLocal()
        }
    }

    func saveLocal() {
        if let data = try? JSONEncoder().encode(projects) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    func syncWithBackend() {
        guard let url = URL(string: "/api/cowork/projects", relativeTo: baseURL) else { return }
        Task {
            do {
                let (data, _) = try await session.data(from: url)
                let res = try JSONDecoder().decode([String: [BackendProjectDTO]].self, from: data)
                if let remote = res["projects"], !remote.isEmpty {
                    let mapped = remote.map { $0.toDomain() }
                    withAnimation {
                        self.projects = mapped
                        self.saveLocal()
                    }
                }
            } catch {}
        }
    }

    @discardableResult
    func addProject(
        name: String,
        machine: String = "Ubuntu VPS",
        branch: String = "main",
        folderName: String = "root",
        folderPath: String = "/root/evolingo"
    ) -> CoworkProject {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedName = trimmedName.isEmpty ? "New Project" : trimmedName
        let isConn = !machine.localizedCaseInsensitiveContains("offline") && !machine.localizedCaseInsensitiveContains("not connected")
        let status = "\(machine) · \(branch)"

        let newProject = CoworkProject(
            id: "proj-\(UUID().uuidString.prefix(8).lowercased())",
            name: resolvedName,
            machineId: "ubuntu-vps",
            machineName: machine,
            branch: branch.isEmpty ? "main" : branch,
            folderName: folderName.isEmpty ? "root" : folderName,
            folderPath: folderPath.isEmpty ? "/root/evolingo" : folderPath,
            section: .today,
            statusText: status,
            isConnected: isConn,
            lastActiveText: "Today",
            createdAt: Date(),
            updatedAt: Date()
        )
        projects.insert(newProject, at: 0)
        saveLocal()

        // Sync to backend asynchronously
        Task {
            guard let url = URL(string: "/api/cowork/projects", relativeTo: baseURL) else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let payload: [String: Any] = [
                "name": newProject.name,
                "machineName": newProject.machineName,
                "branch": newProject.branch,
                "folderName": newProject.folderName,
                "folderPath": newProject.folderPath
            ]
            req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
            _ = try? await session.data(for: req)
        }

        return newProject
    }

    func renameProject(id: String, newName: String) {
        guard let idx = projects.firstIndex(where: { $0.id == id }) else { return }
        projects[idx].name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        projects[idx].updatedAt = Date()
        saveLocal()

        Task {
            guard let url = URL(string: "/api/cowork/projects/\(id)", relativeTo: baseURL) else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "PATCH"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["name": newName])
            _ = try? await session.data(for: req)
        }
    }

    func removeProject(id: String) {
        projects.removeAll { $0.id == id }
        saveLocal()

        Task {
            guard let url = URL(string: "/api/cowork/projects/\(id)", relativeTo: baseURL) else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "DELETE"
            _ = try? await session.data(for: req)
        }
    }

    func projects(in section: CoworkTimeSection) -> [CoworkProject] {
        projects.filter { $0.section == section }
    }

    func resetToDefaults() {
        projects = CoworkProject.defaultProjects
        saveLocal()
    }

    func clearAll() {
        projects = []
        saveLocal()
    }

    private struct BackendProjectDTO: Codable {
        var id: String
        var name: String
        var machineId: String
        var machineName: String
        var branch: String
        var folderName: String
        var folderPath: String
        var section: String
        var statusText: String
        var isConnected: Bool
        var lastActiveText: String
        var createdAt: String
        var updatedAt: String
        var conversationId: String?
        var isArchived: Bool?

        func toDomain() -> CoworkProject {
            let s: CoworkTimeSection
            switch section {
            case "Yesterday": s = .yesterday
            case "Previous 7 days": s = .previous7Days
            case "Older": s = .older
            default: s = .today
            }
            return CoworkProject(
                id: id,
                name: name,
                machineId: machineId,
                machineName: machineName,
                branch: branch,
                folderName: folderName,
                folderPath: folderPath,
                section: s,
                statusText: statusText,
                isConnected: isConnected,
                lastActiveText: lastActiveText,
                createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date(),
                updatedAt: ISO8601DateFormatter().date(from: updatedAt) ?? Date(),
                conversationID: conversationId,
                isArchived: isArchived
            )
        }
    }
}

// MARK: - Cowork Root Coordinator View

struct CoworkProjectManagerView: View {
    let navigate: (NativeTab) -> Void
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void
    @ObservedObject var model: ChatModel

    @StateObject private var store = CoworkProjectStore.shared
    private let machineService = NativeMachineService.shared

    @State private var selectedProject: CoworkProject?
    @State private var showMachineManagement = false
    @State private var showNewProjectSheet = false
    @State private var showSettingsSheet = false
    @State private var codexDraft = ""
    @FocusState private var isCodexInputFocused: Bool
    @State private var showAllProjects = false

    // Active expanded sections: Today & Previous 7 days
    @State private var expandedSections: Set<CoworkTimeSection> = [.today, .previous7Days]

    // Rename state
    @State private var renamingProject: CoworkProject?
    @State private var renameText = ""
    @State private var showRenameAlert = false

    var body: some View {
        Group {
            if let project = selectedProject {
                projectWorkspaceView(project)
                    .ignoresSafeArea(.container, edges: [.top, .bottom])
            } else if showMachineManagement {
                ConnectServerView(
                    onOpenSidebar: onOpenSidebar,
                    onOpenProfile: onOpenProfile,
                    onBack: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                            showMachineManagement = false
                        }
                    }
                )
            } else {
                projectHomeView
            }
        }
        .sheet(isPresented: $showNewProjectSheet) {
            NewProjectSheet { name, machine, branch, folder in
                let project = store.addProject(name: name, machine: machine, branch: branch, folderName: folder)
                expandedSections.insert(.today)
                withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                    selectedProject = project
                }
            }
            .presentationDetents([.medium, .large])
            .presentationCornerRadius(32)
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSettingsSheet) {
            CoworkSettingsSheet(store: store, model: model)
                .presentationDetents([.medium, .large])
                .presentationCornerRadius(32)
                .presentationDragIndicator(.visible)
        }
        .alert("Rename Project", isPresented: $showRenameAlert) {
            TextField("Project Name", text: $renameText)
            Button("Cancel", role: .cancel) {}
            Button("Save") {
                if let proj = renamingProject {
                    store.renameProject(id: proj.id, newName: renameText)
                }
            }
        }
    }

    // MARK: - Screen D: Project Home View (Matches Reference Mockup D)

    private var projectHomeView: some View {
        VStack(spacing: 0) {
            headerToolbar(onOpenSidebar: onOpenSidebar, onOpenProfile: onOpenProfile)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    actionCardsSection
                        .padding(.top, 24)
                        .padding(.bottom, 36)

                    if store.projects.isEmpty {
                        emptyStateView
                            .frame(maxWidth: .infinity)
                            .padding(.top, 24)
                    } else {
                        latestProjectsSection
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Color.white.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            floatingComposerBar
        }
    }

    // MARK: - Reusable Shared Top Navigation Bar across all 4 screens

    private func headerToolbar(onOpenSidebar: @escaping () -> Void, onOpenProfile: @escaping () -> Void) -> some View {
        EvoSharedTopBar(
            onOpenSidebar: {
                isCodexInputFocused = false
                onOpenSidebar()
            },
            onOpenProfile: onOpenProfile
        ) {
            Button {
                EvoHaptics.tap()
                showNewProjectSheet = true
            } label: {
                EvoSymbolLabel("New Project", systemImage: "plus")
            }

            Button {
                EvoHaptics.tap()
                withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                    showMachineManagement = true
                }
            } label: {
                EvoSymbolLabel("Connect Server", systemImage: "server.rack")
            }

            Button {
                EvoHaptics.tap()
                showSettingsSheet = true
            } label: {
                EvoSymbolLabel("Cowork Settings", systemImage: "slider.horizontal.2")
            }

            Divider()

            Button {
                EvoHaptics.tap()
                store.resetToDefaults()
            } label: {
                EvoSymbolLabel("Restore Defaults", systemImage: "arrow.clockwise")
            }

            Button(role: .destructive) {
                EvoHaptics.tap()
                store.clearAll()
            } label: {
                EvoSymbolLabel("Clear All Projects", systemImage: "trash")
            }
        }
    }

    // MARK: - Top Action Bento Grid: Asymmetric 2-column layout matching Mockup D

    private var actionCardsSection: some View {
        HStack(spacing: 10) {
            Button {
                EvoHaptics.tap()
                showNewProjectSheet = true
            } label: {
                VStack(alignment: .leading, spacing: 12) {
                    EvoIcon(systemName: "plus").evoSymbol(.standard)
                    Spacer(minLength: 12)
                    Text("New Project")
                        .font(EvoFont.text(.body, weight: .semibold))
                }
                .padding(14)
                .frame(maxWidth: .infinity, minHeight: 110, maxHeight: .infinity, alignment: .leading)
                .background(.white, in: RoundedRectangle(cornerRadius: 20))
                .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(EvoTheme.Palette.line))
            }
            .buttonStyle(EvoScalePressButtonStyle())

            VStack(spacing: 8) {
                projectAction("Settings", symbol: "slider.horizontal.2") {
                    showSettingsSheet = true
                }
                projectAction("Machine", symbol: "server.rack") {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        showMachineManagement = true
                    }
                }
            }
            .fixedSize(horizontal: true, vertical: false)
        }
        .fixedSize(horizontal: false, vertical: true)
        .foregroundStyle(EvoTheme.Palette.ink)
    }

    private func projectAction(_ title: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button {
            EvoHaptics.tap()
            action()
        } label: {
            HStack(spacing: 8) {
                EvoIcon(systemName: symbol).evoSymbol(.standard)
                Text(title).font(EvoFont.text(.subheadline, weight: .medium))
            }
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 51, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(EvoTheme.Palette.line))
        }
        .buttonStyle(EvoScalePressButtonStyle())
    }

    // MARK: - Latest Projects Section matching Mockup D
    // Header row with bold "Latest Projects" on left and "See all >" on right;
    // list rows separated by subtle hairline dividers with archive/box icon, project titles, trailing chevrons (>)

    private var latestProjectsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header row
            HStack {
                Text("Latest Projects")
                    .font(EvoFont.sized(19, weight: .bold))
                    .foregroundStyle(Color(red: 22.0 / 255, green: 22.0 / 255, blue: 26.0 / 255))

                Spacer()

                Button {
                    EvoHaptics.tap()
                    showAllProjects.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Text("See all")
                            .font(EvoFont.sized(14, weight: .medium))
                        EvoIcon(systemName: "chevron.right")
                            .font(EvoFont.sized(11, weight: .semibold))
                    }
                    .foregroundStyle(Color(red: 138.0 / 255, green: 138.0 / 255, blue: 146.0 / 255))
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            // Project list card
            let projectsToShow = showAllProjects ? store.projects : Array(store.projects.prefix(5))
            VStack(spacing: 0) {
                ForEach(Array(projectsToShow.enumerated()), id: \.element.id) { index, project in
                    if index > 0 {
                        Rectangle()
                            .fill(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255))
                            .frame(height: 0.8)
                            .padding(.leading, 56)
                    }

                    Button {
                        EvoHaptics.tap()
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                            selectedProject = project
                        }
                    } label: {
                        HStack(spacing: 14) {
                            EvoIcon(systemName: "folder")
                                .evoSymbol(.standard)
                                .foregroundStyle(Color(red: 22.0 / 255, green: 22.0 / 255, blue: 26.0 / 255))
                                .frame(width: 24, alignment: .center)

                            Text(project.name)
                                .font(EvoFont.sized(16, weight: .regular))
                                .foregroundStyle(Color(red: 22.0 / 255, green: 22.0 / 255, blue: 26.0 / 255))
                                .lineLimit(1)

                            Spacer()

                            EvoIcon(systemName: "chevron.right")
                                .font(EvoFont.sized(12, weight: .semibold))
                                .scaleEffect(0.7)
                                .foregroundStyle(Color(red: 138.0 / 255, green: 138.0 / 255, blue: 146.0 / 255))
                        }
                        .padding(.horizontal, 18)
                        .frame(minHeight: 56)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(EvoScalePressButtonStyle())
                    .contextMenu {
                        Button {
                            selectedProject = project
                        } label: {
                            EvoSymbolLabel("Open Session", systemImage: "terminal")
                        }

                        Button {
                            renamingProject = project
                            renameText = project.name
                            showRenameAlert = true
                        } label: {
                            EvoSymbolLabel("Rename", systemImage: "pencil")
                        }

                        Button {
                            UIPasteboard.general.string = project.folderPath
                            EvoHaptics.tap()
                        } label: {
                            EvoSymbolLabel("Copy Path", systemImage: "doc.on.doc")
                        }

                        Divider()

                        Button(role: .destructive) {
                            store.removeProject(id: project.id)
                        } label: {
                            EvoSymbolLabel("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .background(Color.white, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1)
            )
        }
    }

    // MARK: - Project History Section (Collapsible Date Groups)

    private var projectHistorySection: some View {
        VStack(alignment: .leading, spacing: 22) {
            ForEach(CoworkTimeSection.allCases) { section in
                let items = store.projects(in: section)
                if !items.isEmpty || section == .yesterday {
                    let isExpanded = expandedSections.contains(section)

                    VStack(alignment: .leading, spacing: 18) {
                        Button {
                            EvoHaptics.selection()
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
                                if isExpanded {
                                    expandedSections.remove(section)
                                } else {
                                    expandedSections.insert(section)
                                }
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Text(section.rawValue)
                                    .font(EvoFont.sized(16.5, weight: .semibold))
                                    .foregroundStyle(EvoTheme.Symbol.primary)

                                EvoIcon(systemName: isExpanded ? "chevron.down" : "chevron.right")
                                    .font(EvoFont.sized(11, weight: .semibold))
                                    .scaleEffect(0.72)
                                    .foregroundStyle(Color(red: 155.0 / 255, green: 155.0 / 255, blue: 163.0 / 255))
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if isExpanded {
                            VStack(alignment: .leading, spacing: 20) {
                                ForEach(items) { project in
                                    projectRow(project)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Single Project Row (Matches Reference: Title + [>_] branch  [folder] directory)

    private func projectRow(_ project: CoworkProject) -> some View {
        Button {
            EvoHaptics.tap()
            withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                selectedProject = project
            }
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                Text(project.name)
                    .font(EvoFont.sized(16, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .lineLimit(1)

                HStack(spacing: 12) {
                    HStack(spacing: 5) {
                        EvoIcon(systemName: "terminal")
                            .font(EvoFont.sized(13, weight: .regular))
                            .foregroundStyle(EvoTheme.Symbol.secondary)
                            .frame(width: 15, height: 15)

                        Text(project.branch)
                            .font(EvoFont.sized(13, weight: .regular))
                            .foregroundStyle(EvoTheme.Symbol.secondary)
                    }

                    HStack(spacing: 5) {
                        EvoIcon(systemName: "folder")
                            .font(EvoFont.sized(13, weight: .regular))
                            .foregroundStyle(EvoTheme.Symbol.secondary)
                            .frame(width: 15, height: 15)

                        Text(project.folderName)
                            .font(EvoFont.sized(13, weight: .regular))
                            .foregroundStyle(EvoTheme.Symbol.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(EvoScalePressButtonStyle())
        .contextMenu {
            Button {
                selectedProject = project
            } label: {
                EvoSymbolLabel("Open Session", systemImage: "terminal")
            }

            Button {
                renamingProject = project
                renameText = project.name
                showRenameAlert = true
            } label: {
                EvoSymbolLabel("Rename", systemImage: "pencil")
            }

            Button {
                UIPasteboard.general.string = project.folderPath
                EvoHaptics.tap()
            } label: {
                EvoSymbolLabel("Copy Path", systemImage: "doc.on.doc")
            }

            Button {
                withAnimation {
                    showMachineManagement = true
                }
            } label: {
                EvoSymbolLabel("View Machine Status", systemImage: "server.rack")
            }

            Divider()

            Button(role: .destructive) {
                withAnimation {
                    store.removeProject(id: project.id)
                }
            } label: {
                EvoSymbolLabel("Delete Project", systemImage: "trash")
            }
        }
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 10) {
            EvoIcon(systemName: "folder.open")
                .evoSymbol(.navigation)
                .foregroundStyle(EvoTheme.Palette.secondary)
                .accessibilityHidden(true)
            Text("No projects yet")
                .font(EvoFont.text(.headline))
                .foregroundStyle(EvoTheme.Palette.ink)
        }
        .padding(.horizontal, 24)
    }

    // MARK: - Floating Bottom Prompt Bar ("Ask Codex" with '+' and mic)

    private var floatingComposerBar: some View {
        HStack(spacing: 6) {
            Button {
                EvoHaptics.tap()
                isCodexInputFocused = false
                showNewProjectSheet = true
            } label: {
                EvoIcon(systemName: "plus")
                    .font(EvoFont.sized(20, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("New project")

            TextField("Ask Codex", text: $codexDraft, axis: .vertical)
                .lineLimit(1...5)
                .padding(.vertical, 8)
                .font(EvoFont.text(.body))
                .textFieldStyle(.plain)
                .focused($isCodexInputFocused)
                .submitLabel(.send)
                .onSubmit {
                    submitCodexPrompt()
                }

            Button {
                EvoHaptics.tap()
                if codexDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    isCodexInputFocused = true
                } else {
                    submitCodexPrompt()
                }
            } label: {
                EvoIcon(systemName: codexDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "mic" : "arrow.up")
                    .font(EvoFont.sized(18, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(codexDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Open keyboard for dictation" : "Send message")
        }
        .padding(.horizontal, 6)
        .frame(minHeight: 56)
        .modifier(EvoInputSurface(shape: RoundedRectangle(cornerRadius: 28)))
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 10)
    }

    private func submitCodexPrompt() {
        let text = codexDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        codexDraft = ""
        isCodexInputFocused = false

        let target = store.addProject(name: text, machine: "Ubuntu VPS", branch: "main", folderName: "root")
        expandedSections.insert(.today)

        withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
            selectedProject = target
        }

        model.draft = text
        Task {
            await model.send()
        }
    }

    // MARK: - Project Workspace View (Embedded Chat/Cowork Session)

    private func projectWorkspaceView(_ project: CoworkProject) -> some View {
        ZStack(alignment: .top) {
            ChatView(
                cowork: true,
                navigate: navigate,
                onOpenSidebar: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        selectedProject = nil
                    }
                },
                onOpenProfile: onOpenProfile,
                model: model
            )

            // Overlaid Back Pill Bar
            HStack(spacing: 12) {
                Button {
                    EvoHaptics.tap()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.86)) {
                        selectedProject = nil
                    }
                } label: {
                    HStack(spacing: 6) {
                        EvoIcon(systemName: "chevron.left")
                            .evoSymbol(.navigation, weight: .semibold)
                            .scaleEffect(0.85)
                        Text("Projects")
                            .font(EvoFont.sized(15.5, weight: .medium))
                    }
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .modifier(EvoNavigationGlass(shape: Capsule()))
                }
                .buttonStyle(.plain)

                Spacer(minLength: 0)

                HStack(spacing: 6) {
                    Circle()
                        .fill(project.isConnected ? Color.green : Color.orange)
                        .frame(width: 7, height: 7)
                    Text(project.name)
                        .font(EvoFont.sized(14.5, weight: .semibold))
                        .foregroundStyle(EvoTheme.Symbol.primary)
                        .lineLimit(1)
                    Text("(\(project.branch))")
                        .font(EvoFont.sized(12.5, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.secondary)
                }
                .padding(.horizontal, 12)
                .frame(height: 38)
                .background(Color(uiColor: .secondarySystemBackground).opacity(0.88), in: Capsule())
                .overlay(Capsule().stroke(Color(red: 235.0 / 255, green: 235.0 / 255, blue: 240.0 / 255), lineWidth: 1))
            }
            .padding(.horizontal, 24)
            .padding(.top, 54)
        }
    }
}

// MARK: - Screen B: Machine Management View (Matches Reference Screenshot 1)

struct MachineManagementView: View {
    @ObservedObject var machineService: NativeMachineService
    let onBack: () -> Void
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void

    @State private var isCardExpanded = false
    @State private var activeDestination: MachineDestination?
    @State private var showAddVM = false
    @State private var savedMachines: [NativeMachine] = []
    @State private var selectedMachineID: String? = "ubuntu-vps"
    @State private var machineStorageError: String?
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL

    enum MachineDestination: String, Identifiable, CaseIterable {
        case overview
        case terminal
        case workspaces
        case storage
        case network
        case environments

        var id: String { rawValue }

        var title: String {
            switch self {
            case .overview: "Overview"
            case .terminal: "Terminal"
            case .workspaces: "Workspaces"
            case .storage: "Storage"
            case .network: "Network"
            case .environments: "Environments"
            }
        }

        var icon: String {
            switch self {
            case .overview: "display"
            case .terminal: "terminal"
            case .workspaces: "folder"
            case .storage: "externaldrive"
            case .network: "point.3.connected.trianglepath.dotted"
            case .environments: "shippingbox"
            }
        }
    }

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Header Toolbar (Identical controls to Project Home)
                    HStack(spacing: 16) {
                        Button {
                            EvoHaptics.tap()
                            onBack()
                        } label: {
                            HStack(spacing: 6) {
                                EvoIcon(systemName: "chevron.left")
                                    .font(EvoFont.sized(15, weight: .semibold))
                                    .scaleEffect(0.85)
                                EvoIcon(systemName: "square.grid.2x2")
                                    .font(EvoFont.sized(14, weight: .medium))
                            }
                            .frame(width: 52, height: 44)
                            .modifier(EvoNavigationGlass(shape: Capsule()))
                            .overlay(Capsule().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Back to projects")

                        Spacer(minLength: 0)

                        HStack(spacing: 0) {
                            Menu {
                                Button {
                                    Task { await machineService.fetchMetrics() }
                                } label: {
                                    EvoSymbolLabel("Refresh Status", systemImage: "arrow.clockwise")
                                }

                                Button {
                                    activeDestination = .terminal
                                } label: {
                                    EvoSymbolLabel("Open Ubuntu Terminal", systemImage: "terminal")
                                }

                                Button { showAddVM = true } label: {
                                    EvoSymbolLabel("Add VM", systemImage: "plus")
                                }
                            } label: {
                                EvoIcon(systemName: "ellipsis")
                                    .evoSymbol(.navigation, weight: .medium)
                                    .scaleEffect(0.92)
                                    .frame(width: 44, height: 44)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Machine actions")

                            Button {
                                EvoHaptics.tap()
                                onOpenProfile()
                            } label: {
                                NativeAvatarView(model: .shared, size: 30)
                                    .frame(width: 44, height: 44)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Profile")
                        }
                        .padding(.horizontal, 3)
                        .frame(height: 44)
                        .modifier(EvoNavigationGlass(shape: Capsule()))
                        .overlay(Capsule().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 60)
                    .padding(.bottom, 12)

                    machineCarousel
                        .padding(.bottom, 24)

                    if selectedMachineID == "ubuntu-vps", let error = machineService.refreshError {
                        Text(error)
                            .font(EvoFont.text(.footnote))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 24)
                            .padding(.bottom, 16)
                    }

                    if let error = machineStorageError {
                        Text(error)
                            .font(EvoFont.text(.footnote))
                            .foregroundStyle(.red)
                            .padding(.horizontal, 24)
                            .padding(.bottom, 16)
                    }

                    if selectedMachineID == "ubuntu-vps" {
                        machineNavigationList
                            .padding(.horizontal, 24)
                    }
                }
                .padding(.bottom, 48)
            }
            .refreshable { await machineService.fetchMetrics() }
        }
        .background(Color(uiColor: .systemBackground).ignoresSafeArea())
        .task { await loadSavedMachines() }
        .task(id: scenePhase) {
            guard scenePhase == .active else { return }
            while !Task.isCancelled {
                await machineService.fetchMetrics()
                do { try await Task.sleep(for: .seconds(8)) }
                catch { return }
            }
        }
        .sheet(item: $activeDestination) { dest in
            MachineDetailTabs(service: machineService, initialTab: dest)
            .presentationDetents([.large])
            .presentationCornerRadius(30)
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAddVM) {
            AddVMSheet { machine in
                await loadSavedMachines()
                selectedMachineID = machine.id
            }
            .presentationDetents([.medium, .large])
            .presentationCornerRadius(26)
            .presentationDragIndicator(.visible)
        }
    }

    private var machineCarousel: some View {
        VStack(spacing: 8) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 14) {
                        machineSummaryCard
                            .containerRelativeFrame(.horizontal)
                            .id("ubuntu-vps")

                        ForEach(savedMachines) { machine in
                            savedMachineCard(machine)
                                .containerRelativeFrame(.horizontal)
                                .id(machine.id)
                        }

                        addNewVMCard
                            .containerRelativeFrame(.horizontal)
                            .id("add-vm")
                    }
                    .scrollTargetLayout()
                }
                .contentMargins(.horizontal, 24, for: .scrollContent)
                .scrollTargetBehavior(.viewAligned)
                .scrollPosition(id: $selectedMachineID)
                .accessibilityIdentifier("machine.carousel")

                carouselDots(proxy: proxy)
            }
        }
    }

    private func carouselDots(proxy: ScrollViewProxy) -> some View {
        HStack(spacing: 6) {
            Button {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.82)) {
                    selectedMachineID = "ubuntu-vps"
                    proxy.scrollTo("ubuntu-vps", anchor: .center)
                }
            } label: {
                Circle()
                    .fill(selectedMachineID == "ubuntu-vps" ? EvoTheme.Symbol.primary : Color(uiColor: .systemGray4))
                    .frame(width: selectedMachineID == "ubuntu-vps" ? 8 : 6, height: selectedMachineID == "ubuntu-vps" ? 8 : 6)
            }
            .buttonStyle(.plain)

            ForEach(savedMachines) { machine in
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.82)) {
                        selectedMachineID = machine.id
                        proxy.scrollTo(machine.id, anchor: .center)
                    }
                } label: {
                    Circle()
                        .fill(selectedMachineID == machine.id ? EvoTheme.Symbol.primary : Color(uiColor: .systemGray4))
                        .frame(width: selectedMachineID == machine.id ? 8 : 6, height: selectedMachineID == machine.id ? 8 : 6)
                }
                .buttonStyle(.plain)
            }

            Button {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.82)) {
                    selectedMachineID = "add-vm"
                    proxy.scrollTo("add-vm", anchor: .center)
                }
            } label: {
                Circle()
                    .fill(selectedMachineID == "add-vm" ? EvoTheme.Symbol.primary : Color(uiColor: .systemGray4))
                    .frame(width: selectedMachineID == "add-vm" ? 8 : 6, height: selectedMachineID == "add-vm" ? 8 : 6)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 4)
    }

    private var addNewVMCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                ZStack {
                    Circle()
                        .fill(Color(uiColor: .secondarySystemBackground))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Circle().stroke(Color(uiColor: .separator).opacity(0.5), lineWidth: 1)
                        )

                    EvoIcon(systemName: "plus")
                        .font(EvoFont.sized(18, weight: .medium))
                        .foregroundStyle(EvoTheme.Symbol.primary)
                }

                Spacer()

                Text("New Instance")
                    .font(EvoFont.sized(12, weight: .medium))
                    .foregroundStyle(EvoTheme.Symbol.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(Capsule())
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Add New VM")
                    .font(EvoFont.sized(18, weight: .bold))
                    .foregroundStyle(EvoTheme.Symbol.primary)

                Text("Connect another virtual machine or cloud instance using its HTTPS dashboard or SSH.")
                    .font(EvoFont.sized(13, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.secondary)
                    .lineLimit(2)
            }

            Spacer(minLength: 8)

            HStack(spacing: 10) {
                Button {
                    EvoHaptics.tap()
                    showAddVM = true
                } label: {
                    HStack(spacing: 6) {
                        EvoIcon(systemName: "plus")
                            .font(EvoFont.sized(13, weight: .semibold))
                        Text("Add VM")
                            .font(EvoFont.sized(14, weight: .semibold))
                    }
                    .foregroundStyle(Color(uiColor: .systemBackground))
                    .frame(maxWidth: .infinity, minHeight: 40)
                    .background(EvoTheme.Symbol.primary)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                Button {
                    EvoHaptics.tap()
                    Task {
                        let demo = NativeMachine(id: UUID().uuidString, name: "Dev VM", url: "https://dev-vm.internal")
                        _ = try? await NativeMachineStore.shared.merge([demo])
                        await loadSavedMachines()
                        selectedMachineID = demo.id
                    }
                } label: {
                    Text("Quick Demo")
                        .font(EvoFont.sized(13, weight: .medium))
                        .foregroundStyle(EvoTheme.Symbol.secondary)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 40)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, minHeight: 200, alignment: .leading)
        .background(Color(uiColor: .systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color(uiColor: .separator).opacity(0.5), lineWidth: 1)
        )
    }

    private func savedMachineCard(_ machine: NativeMachine) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                EvoIcon(systemName: "server.rack")
                    .font(EvoFont.sized(22, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.primary)

                Spacer()

                Button {
                    EvoHaptics.tap()
                    Task {
                        var list = savedMachines
                        list.removeAll { $0.id == machine.id }
                        try? await NativeMachineStore.shared.save(list)
                        await loadSavedMachines()
                        selectedMachineID = "ubuntu-vps"
                    }
                } label: {
                    EvoIcon(systemName: "trash")
                        .font(EvoFont.sized(14, weight: .regular))
                        .foregroundStyle(Color.red.opacity(0.8))
                        .frame(width: 32, height: 32)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove VM")
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(machine.name)
                    .font(EvoFont.sized(18, weight: .bold))
                    .foregroundStyle(EvoTheme.Symbol.primary)

                Text(URL(string: machine.url)?.host ?? machine.url)
                    .font(EvoFont.sized(13, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            Button {
                EvoHaptics.tap()
                if let url = NativeHTTPSAddress.validatedURL(machine.url) { openURL(url) }
            } label: {
                HStack(spacing: 6) {
                    EvoIcon(systemName: "arrow.up.right.square")
                        .font(EvoFont.sized(14))
                    Text("Open Dashboard")
                        .font(EvoFont.sized(14, weight: .medium))
                }
                .foregroundStyle(EvoTheme.Symbol.primary)
                .frame(maxWidth: .infinity, minHeight: 40)
                .background(Color(uiColor: .secondarySystemBackground))
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(20)
        .frame(maxWidth: .infinity, minHeight: 200, alignment: .leading)
        .background(Color(uiColor: .systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color(uiColor: .separator).opacity(0.5), lineWidth: 1)
        )
    }

    private func loadSavedMachines() async {
        do {
            savedMachines = try await NativeMachineStore.shared.load()
            machineStorageError = nil
        } catch {
            machineStorageError = "Saved machines couldn’t be loaded. Reopen Machine to retry."
        }
    }

    // MARK: - Machine Summary Card (Server Icon, Ubuntu VPS, Connected, Metrics Columns)

    private var machineSummaryCard: some View {
        let metrics = machineService.metrics

        return VStack(alignment: .leading, spacing: 0) {
            // Top Row
            Button {
                withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
                    isCardExpanded.toggle()
                }
            } label: {
                HStack(alignment: .top, spacing: 14) {
                    // Server icon
                    EvoIcon(systemName: "server.rack")
                        .font(EvoFont.sized(22, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.primary)
                        .frame(width: 28, height: 28)
                        .padding(.top, 2)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Ubuntu VPS")
                            .font(EvoFont.sized(17, weight: .bold))
                            .foregroundStyle(EvoTheme.Symbol.primary)

                        HStack(spacing: 5) {
                            EvoIcon(systemName: machineService.isConnected ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                                .font(EvoFont.sized(12, weight: .semibold))
                                .foregroundStyle(machineService.isConnected ? Color.green : Color.secondary)

                            Text(machineService.isConnected ? "Connected" : (machineService.isRefreshing ? "Checking…" : "Unavailable"))
                                .font(EvoFont.sized(13.5, weight: .regular))
                                .foregroundStyle(EvoTheme.Symbol.secondary)
                        }
                    }

                    Spacer(minLength: 0)

                    HStack(spacing: 8) {
                        HStack(spacing: 3) {
                            Text("Swipe left")
                                .font(EvoFont.sized(11, weight: .medium))
                                .foregroundStyle(EvoTheme.Symbol.secondary)
                            EvoIcon(systemName: "chevron.right")
                                .font(EvoFont.sized(9, weight: .semibold))
                                .foregroundStyle(EvoTheme.Symbol.secondary)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Capsule())

                        EvoIcon(systemName: isCardExpanded ? "chevron.up" : "chevron.down")
                            .font(EvoFont.sized(12, weight: .semibold))
                            .scaleEffect(0.8)
                            .foregroundStyle(Color(red: 140.0 / 255, green: 140.0 / 255, blue: 145.0 / 255))
                    }
                    .padding(.top, 4)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Ubuntu VPS, \(machineService.isConnected ? "connected" : "status unavailable")")
            .accessibilityValue(isCardExpanded ? "Expanded" : "Collapsed")
            .accessibilityHint("Show status details and open the system overview")
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 18)

            // Divider
            Divider()
                .padding(.horizontal, 20)
                .opacity(0.8)

            // Statistics Row (CPU | Memory | Storage)
            HStack(spacing: 0) {
                // CPU Column
                VStack(alignment: .leading, spacing: 4) {
                    Text("CPU")
                        .font(EvoFont.sized(12.5, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.secondary)

                    Text(machineService.lastRefreshAt == nil ? "—" : "\(metrics.cpuPercent)%")
                        .font(EvoFont.sized(21, weight: .bold))
                        .foregroundStyle(EvoTheme.Symbol.primary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Memory Column
                VStack(alignment: .leading, spacing: 4) {
                    Text("Memory")
                        .font(EvoFont.sized(12.5, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.secondary)

                    Text(metrics.memoryUsedGB)
                        .font(EvoFont.sized(21, weight: .bold))
                        .foregroundStyle(EvoTheme.Symbol.primary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Storage Column
                VStack(alignment: .leading, spacing: 4) {
                    Text("Storage")
                        .font(EvoFont.sized(12.5, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.secondary)

                    Text(metrics.storageUsedGB)
                        .font(EvoFont.sized(21, weight: .bold))
                        .foregroundStyle(EvoTheme.Symbol.primary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 20)

            // Optional Expanded Details
            if isCardExpanded {
                VStack(alignment: .leading, spacing: 12) {
                    Divider()

                    if let refreshed = machineService.lastRefreshAt {
                        LabeledContent {
                            Text(refreshed, style: .relative)
                        } label: {
                            Text("Last updated")
                        }
                        .font(EvoFont.text(.caption))
                        .foregroundStyle(.secondary)
                    }

                    Button { activeDestination = .overview } label: {
                        EvoSymbolLabel("Open system overview", systemImage: "server.rack")
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }
        }
        .background(Color(uiColor: .systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color(uiColor: .separator).opacity(0.5), lineWidth: 1)
        )
    }

    // MARK: - Machine Navigation Rows (Overview, Terminal, Workspaces, Storage, Network, Environments)

    private var machineNavigationList: some View {
        VStack(spacing: 0) {
            navRow(
                icon: "display",
                title: "Overview",
                subtitle: "System information & resources",
                action: { activeDestination = .overview }
            )

            rowDivider

            navRow(
                icon: "terminal",
                title: "Terminal",
                subtitle: "Shell access & commands",
                action: { activeDestination = .terminal }
            )

            rowDivider

            navRow(
                icon: "folder",
                title: "Workspaces",
                subtitle: "Project directories & files",
                action: { activeDestination = .workspaces }
            )

            rowDivider

            navRow(
                icon: "externaldrive",
                title: "Storage",
                subtitle: "Disk usage & volumes",
                action: { activeDestination = .storage }
            )

            rowDivider

            navRow(
                icon: "point.3.connected.trianglepath.dotted",
                title: "Network",
                subtitle: "Ports, SSH & connections",
                action: { activeDestination = .network }
            )

            rowDivider

            navRow(
                icon: "shippingbox",
                title: "Environments",
                subtitle: "Containers & sandboxes",
                action: { activeDestination = .environments }
            )
        }
    }

    private func navRow(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: {
            EvoHaptics.tap()
            action()
        }) {
            HStack(spacing: 16) {
                EvoIcon(systemName: icon)
                    .font(EvoFont.sized(20, weight: .regular))
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .frame(width: 24, height: 24)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(EvoFont.sized(16.5, weight: .semibold))
                        .foregroundStyle(EvoTheme.Symbol.primary)

                    Text(subtitle)
                        .font(EvoFont.sized(13, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.secondary)
                }

                Spacer(minLength: 0)

                EvoIcon(systemName: "chevron.right")
                    .font(EvoFont.sized(12, weight: .semibold))
                    .scaleEffect(0.75)
                    .foregroundStyle(Color(red: 195.0 / 255, green: 195.0 / 255, blue: 200.0 / 255))
            }
            .padding(.vertical, 16)
            .contentShape(Rectangle())
        }
        .buttonStyle(EvoScalePressButtonStyle())
    }

    private var rowDivider: some View {
        Divider()
            .padding(.leading, 40)
            .opacity(0.65)
    }

}

// MARK: - Subscreen 1: Overview

struct MachineOverviewScreen: View {
    @ObservedObject var service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var overview: MachineOverviewData?
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        List {
            if isLoading {
                HStack(spacing: 12) {
                    ProgressView()
                    Text("Loading system overview…").foregroundStyle(.secondary)
                }
            }
            if let loadError {
                Section {
                    Text(loadError).foregroundStyle(.secondary)
                    Button("Retry") { Task { await loadOverview() } }
                }
            }
            Section("System Identity") {
                LabeledContent("Operating System", value: overview?.osName ?? "—")
                LabeledContent("Hostname", value: overview?.hostname ?? "—")
                LabeledContent("Public IP", value: overview?.ip ?? "—")
                LabeledContent("Architecture", value: overview?.arch ?? "—")
                LabeledContent("Kernel", value: overview?.kernel ?? "—")
                LabeledContent("Uptime", value: overview?.uptimeFormatted ?? "—")
            }

            Section("Hardware Resources") {
                LabeledContent("CPU Model", value: overview?.cpuModel ?? "—")
                LabeledContent("CPU Cores", value: overview.map { String($0.cpuCores) } ?? "—")
                LabeledContent("Total Memory", value: service.metrics.memoryTotalGB)
                LabeledContent("Primary Volume", value: "\(service.metrics.storageUsedGB) / \(service.metrics.storageTotalGB) Used")
            }

            Section("Running Services") {
                ForEach(overview?.services ?? []) { s in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s.name).font(EvoFont.sized(15, weight: .semibold))
                            Text(s.description).font(EvoFont.sized(12.5)).foregroundStyle(Color.secondary)
                        }
                        Spacer()
                        Text(s.status.capitalized)
                            .font(EvoFont.sized(12, weight: .medium))
                            .foregroundStyle(s.status == "running" ? Color.green : Color.secondary)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .navigationTitle("System Overview")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
        .task { await loadOverview() }
        .refreshable { await loadOverview() }
    }

    private func loadOverview() async {
        isLoading = true
        defer { isLoading = false }
        do {
            overview = try await service.fetchOverview()
            loadError = nil
        } catch {
            guard !Task.isCancelled else { return }
            loadError = "The system overview couldn’t be loaded. Try again."
        }
    }
}

// MARK: - Subscreen 2: Interactive Terminal

struct MachineTerminalScreen: View {
    @ObservedObject var service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var commandInput = ""
    @State private var terminalLogs: [TerminalLogEntry] = []
    @State private var isExecuting = false

    struct TerminalLogEntry: Identifiable {
        var id = UUID()
        var command: String
        var output: String
        var isSuccess: Bool
    }

    var body: some View {
        VStack(spacing: 0) {
            // Quick Action Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    quickChip("uptime")
                    quickChip("free -m")
                    quickChip("df -h /")
                    quickChip("git status")
                    quickChip("ps aux | grep next")
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .background(Color(uiColor: .secondarySystemBackground))

            // Terminal Output Console
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(terminalLogs) { entry in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 6) {
                                    Text("root@ubuntu-vps:~/evolingo#")
                                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                                        .foregroundStyle(Color.green)
                                    Text(entry.command)
                                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.white)
                                }

                                Text(entry.output)
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundStyle(entry.isSuccess ? Color(red: 220/255, green: 220/255, blue: 225/255) : Color.red.opacity(0.9))
                                    .textSelection(.enabled)
                            }
                        }
                        Color.clear.frame(height: 1).id("term-bottom")
                    }
                    .padding(16)
                }
                .background(Color(red: 18/255, green: 18/255, blue: 22/255))
                .onChange(of: terminalLogs.count) { _, _ in
                    proxy.scrollTo("term-bottom")
                }
            }

            // Command Input Bar
            HStack(spacing: 10) {
                Text(">_")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.secondary)

                TextField("Execute shell command…", text: $commandInput)
                    .font(.system(.body, design: .monospaced))
                    .textFieldStyle(.plain)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .frame(minHeight: 44)
                    .submitLabel(.go)
                    .onSubmit { runCommand() }

                if isExecuting {
                    ProgressView().scaleEffect(0.75)
                } else {
                    Button(action: runCommand) {
                        EvoIcon(systemName: "arrow.up")
                            .font(EvoFont.sized(26))
                            .foregroundStyle(commandInput.isEmpty ? Color.gray : EvoTheme.Symbol.primary)
                            .frame(width: 44, height: 44)
                    }
                    .disabled(commandInput.isEmpty || isExecuting)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(uiColor: .systemBackground))
        }
        .navigationTitle("Interactive Terminal")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    private func quickChip(_ cmd: String) -> some View {
        Button {
            commandInput = cmd
            runCommand()
        } label: {
            Text(cmd)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .padding(.horizontal, 10)
                .frame(minHeight: 44)
                .background(Color(uiColor: .secondarySystemBackground), in: Capsule())
                .overlay(Capsule().stroke(Color.gray.opacity(0.3), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func runCommand() {
        let cmd = commandInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cmd.isEmpty, !isExecuting else { return }
        commandInput = ""
        isExecuting = true

        Task {
            do {
                let res = try await service.executeTerminal(command: cmd)
                let output = res.stdout.isEmpty ? (res.stderr.isEmpty ? "(Command completed with exit code 0)" : res.stderr) : res.stdout
                terminalLogs.append(TerminalLogEntry(command: cmd, output: output.trimmingCharacters(in: .whitespacesAndNewlines), isSuccess: res.exitCode == 0))
            } catch {
                terminalLogs.append(TerminalLogEntry(command: cmd, output: error.localizedDescription, isSuccess: false))
            }
            isExecuting = false
        }
    }
}

// MARK: - Subscreen 3: Workspaces Directory Browser

struct MachineWorkspacesScreen: View {
    @ObservedObject var service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var currentPath = "/root/evolingo"
    @State private var items: [WorkspaceItem] = []
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var selectedFileContent: String?
    @State private var selectedFileName = ""

    var body: some View {
        List {
            if isLoading {
                ProgressView("Loading files…")
            }
            if let loadError {
                Text(loadError).foregroundStyle(.secondary)
                Button("Retry") { Task { await loadDirectory(currentPath) } }
            }
            Section("Current Directory: \(currentPath)") {
                if currentPath != "/root" && currentPath != "/" {
                    Button {
                        let parent = (currentPath as NSString).deletingLastPathComponent
                        currentPath = parent
                    } label: {
                        EvoSymbolLabel(".. (Parent Directory)", systemImage: "arrow.uturn.backward")
                    }
                }

                ForEach(items) { item in
                    if item.isDirectory {
                        Button {
                            currentPath = item.path
                        } label: {
                            HStack {
                                EvoIcon(systemName: "folder.fill").foregroundStyle(EvoTheme.Symbol.primary)
                                Text(item.name).font(EvoFont.sized(15, weight: .medium))
                                Spacer()
                                EvoIcon(systemName: "chevron.right").font(EvoFont.sized(12)).foregroundStyle(Color.secondary)
                            }
                        }
                    } else {
                        Button {
                            openFile(item)
                        } label: {
                            HStack {
                                EvoIcon(systemName: "doc.text").foregroundStyle(Color.secondary)
                                Text(item.name).font(EvoFont.sized(15))
                                Spacer()
                                Text(formatBytes(item.size)).font(EvoFont.sized(12)).foregroundStyle(Color.secondary)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Workspaces")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
        .task(id: currentPath) {
            await loadDirectory(currentPath)
        }
        .refreshable { await loadDirectory(currentPath) }
        .sheet(isPresented: Binding(get: { selectedFileContent != nil }, set: { if !$0 { selectedFileContent = nil } })) {
            NavigationStack {
                ScrollView {
                    Text(selectedFileContent ?? "")
                        .font(.system(size: 12, design: .monospaced))
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .navigationTitle(selectedFileName)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { selectedFileContent = nil }
                    }
                }
            }
        }
    }

    private func loadDirectory(_ path: String) async {
        isLoading = true
        items = []
        defer { if path == currentPath { isLoading = false } }
        do {
            let files = try await service.fetchWorkspaces(path: path)
            guard !Task.isCancelled, path == currentPath else { return }
            items = files
            loadError = nil
        } catch {
            guard !Task.isCancelled, path == currentPath else { return }
            loadError = "Files couldn’t be loaded. Try again."
        }
    }

    private func openFile(_ item: WorkspaceItem) {
        selectedFileName = item.name
        Task {
            guard let url = URL(string: "https://api.sycord.site/api/machines/ubuntu-vps/workspaces") else { return }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONSerialization.data(withJSONObject: ["action": "read_file", "path": item.path])
            if let (data, _) = try? await URLSession.shared.data(for: req),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let content = json["content"] as? String {
                selectedFileContent = content
            }
        }
    }

    private func formatBytes(_ bytes: Int) -> String {
        if bytes < 1024 { return "\(bytes) B" }
        if bytes < 1024 * 1024 { return "\(bytes / 1024) KB" }
        return String(format: "%.1f MB", Double(bytes) / (1024 * 1024))
    }
}

// MARK: - Subscreen 4: Storage

struct MachineStorageScreen: View {
    @ObservedObject var service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var volumes: [MachineStorageVolume] = []

    var body: some View {
        List {
            Section("Primary Storage") {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Root Disk (/)").font(EvoFont.sized(16, weight: .semibold))
                        Spacer()
                        Text("\(service.metrics.storageUsedGB) / \(service.metrics.storageTotalGB)").font(EvoFont.sized(14)).foregroundStyle(Color.secondary)
                    }
                    ProgressView(value: Double(service.metrics.storagePercent), total: 100)
                        .tint(service.metrics.storagePercent > 85 ? Color.red : Color.blue)
                    Text("\(100 - service.metrics.storagePercent)% Available").font(EvoFont.sized(12)).foregroundStyle(Color.secondary)
                }
                .padding(.vertical, 6)
            }

            Section("Mounted Filesystems") {
                ForEach(volumes) { v in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(v.mountPoint).font(EvoFont.sized(15, weight: .semibold))
                            Spacer()
                            Text(v.percent).font(EvoFont.sized(13, weight: .medium))
                        }
                        HStack {
                            Text(v.filesystem).font(EvoFont.sized(12.5)).foregroundStyle(Color.secondary)
                            Spacer()
                            Text("\(v.used) / \(v.size)").font(EvoFont.sized(12.5)).foregroundStyle(Color.secondary)
                        }
                    }
                    .padding(.vertical, 3)
                }
            }
        }
        .navigationTitle("Storage & Volumes")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
        .task {
            if let vols = try? await service.fetchStorage() {
                volumes = vols
            }
        }
    }
}

// MARK: - Subscreen 5: Network

struct MachineNetworkScreen: View {
    @ObservedObject var service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var networkInfo: MachineNetworkInfo?

    var body: some View {
        List {
            Section("Connection Endpoint") {
                LabeledContent("Public IPv4", value: networkInfo?.publicIp ?? "178.62.224.238")
                LabeledContent("SSH Port", value: "\(networkInfo?.sshPort ?? 22)")
                LabeledContent("SSH User", value: networkInfo?.sshUser ?? "root")
            }

            Section("Listening Service Ports") {
                ForEach(networkInfo?.ports ?? []) { p in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Port \(p.port) (\(p.protocolName))").font(EvoFont.sized(15, weight: .semibold))
                            Text(p.service).font(EvoFont.sized(12.5)).foregroundStyle(Color.secondary)
                        }
                        Spacer()
                        Text(p.state).font(EvoFont.sized(12, weight: .medium)).foregroundStyle(Color.green)
                    }
                }
            }

            Section("Network Interfaces") {
                ForEach(networkInfo?.interfaces ?? []) { iface in
                    HStack {
                        Text(iface.name).font(EvoFont.sized(14.5, weight: .medium))
                        Spacer()
                        Text(iface.ip).font(EvoFont.sized(13.5)).foregroundStyle(Color.secondary)
                    }
                }
            }
        }
        .navigationTitle("Network & Ports")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
        .task {
            if let net = try? await service.fetchNetwork() {
                networkInfo = net
            }
        }
    }
}

// MARK: - Subscreen 6: Environments

struct MachineEnvironmentsScreen: View {
    @ObservedObject var service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var containers: [MachineContainerItem] = []

    var body: some View {
        List {
            Section("Configured Runtime Environments") {
                ForEach(containers) { c in
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(c.name).font(EvoFont.sized(15, weight: .semibold))
                            Text(c.runtime).font(EvoFont.sized(12.5)).foregroundStyle(Color.secondary)
                        }
                        Spacer()
                        HStack(spacing: 4) {
                            Circle().fill(Color.green).frame(width: 7, height: 7)
                            Text(c.status).font(EvoFont.sized(12.5, weight: .medium)).foregroundStyle(Color.green)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Environments")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
        .task {
            if let items = try? await service.fetchEnvironments() {
                containers = items
            }
        }
    }
}

// MARK: - New Project Sheet

struct NewProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?
    @State private var projectName = ""

    private enum Field { case name, branch, directory }
    @State private var selectedMachine = "Ubuntu VPS"
    @State private var gitBranch = "main"
    @State private var folderName = "root"

    let onCreate: (String, String, String, String) -> Void

    let availableMachines = [
        "Ubuntu VPS",
        "Dev VM",
        "Sycord Cloud"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Project / Task Details") {
                    TextField("Task or Project Name", text: $projectName)
                        .focused($focusedField, equals: .name)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .branch }
                }

                Section("Workspace & Environment") {
                    Picker("Host Machine", selection: $selectedMachine) {
                        ForEach(availableMachines, id: \.self) { machine in
                            Text(machine).tag(machine)
                        }
                    }
                    .pickerStyle(.menu)

                    TextField("Git Branch", text: $gitBranch)
                        .focused($focusedField, equals: .branch)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .onSubmit { focusedField = .directory }

                    TextField("Root Directory", text: $folderName)
                        .focused($focusedField, equals: .directory)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.done)
                        .onSubmit { focusedField = nil }
                }
            }
            .font(EvoFont.text(.body))
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        EvoHaptics.tap()
                        let name = projectName.trimmingCharacters(in: .whitespacesAndNewlines)
                        onCreate(
                            name.isEmpty ? "New Project" : name,
                            selectedMachine,
                            gitBranch.isEmpty ? "main" : gitBranch,
                            folderName.isEmpty ? "root" : folderName
                        )
                        dismiss()
                    }
                    .font(EvoFont.sized(16, weight: .semibold))
                }
            }
        }
    }
}

// MARK: - Cowork Settings Sheet

struct CoworkSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var store: CoworkProjectStore
    @ObservedObject var model: ChatModel

    var body: some View {
        NavigationStack {
            List {
                Section("AI Execution Mode") {
                    Picker("Agent Mode", selection: $model.agentMode) {
                        Text("Auto (Autonomous)").tag("auto")
                        Text("Plan (Structured Steps)").tag("plan")
                        Text("Fast (Quick Replies)").tag("fast")
                    }
                    .pickerStyle(.menu)
                }

                Section("Project Storage") {
                    Button {
                        EvoHaptics.tap()
                        store.resetToDefaults()
                        dismiss()
                    } label: {
                        EvoSymbolLabel("Restore Defaults", systemImage: "arrow.clockwise")
                    }

                    Button(role: .destructive) {
                        EvoHaptics.tap()
                        store.clearAll()
                        dismiss()
                    } label: {
                        EvoSymbolLabel("Clear All Projects (Empty State)", systemImage: "trash")
                    }
                }
            }
            .navigationTitle("Cowork Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
