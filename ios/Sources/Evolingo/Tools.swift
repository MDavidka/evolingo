import SwiftUI

enum NativeHTTPSAddress {
    static func validatedURL(_ value: String) -> URL? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count <= 2_048,
              let components = URLComponents(string: trimmed),
              components.scheme?.lowercased() == "https",
              let host = components.host, !host.isEmpty,
              components.user == nil, components.password == nil,
              components.port.map({ (1...65_535).contains($0) }) ?? true,
              let url = components.url else { return nil }
        return url
    }
}

private struct NativeIntegration: Identifiable {
    let id: String
    let name: String
    let subtitle: String
    let detail: String
    let symbol: String
}

struct NativeMachine: Codable, Identifiable, Sendable {
    var id: String
    var name: String
    var url: String
}

actor NativeMachineStore {
    static let shared = NativeMachineStore()
    private let legacyKey = "native.evolingo.machines.v1"

    func load() throws -> [NativeMachine] {
        let url = try fileURL()
        if FileManager.default.fileExists(atPath: url.path) {
            return Self.validated(try JSONDecoder().decode([NativeMachine].self, from: Data(contentsOf: url, options: .mappedIfSafe)))
        }
        guard let data = UserDefaults.standard.data(forKey: legacyKey),
              let legacy = try? JSONDecoder().decode([NativeMachine].self, from: data) else { return [] }
        let clean = Self.validated(legacy)
        try write(clean, to: url)
        UserDefaults.standard.removeObject(forKey: legacyKey)
        return clean
    }

    func save(_ machines: [NativeMachine]) throws {
        try write(Self.validated(machines), to: fileURL())
        UserDefaults.standard.removeObject(forKey: legacyKey)
    }

    func merge(_ incoming: [NativeMachine]) throws -> Int {
        var machines = try load()
        var urls = Set(machines.compactMap { NativeHTTPSAddress.validatedURL($0.url)?.absoluteString })
        let countBefore = machines.count
        for machine in Self.validated(incoming) where urls.insert(machine.url).inserted {
            machines.append(machine)
        }
        try save(machines)
        return machines.count - countBefore
    }

    private static func validated(_ machines: [NativeMachine]) -> [NativeMachine] {
        var seen = Set<String>()
        return machines.filter { machine in
            guard !machine.id.isEmpty, machine.name.count <= 80,
                  !machine.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let url = NativeHTTPSAddress.validatedURL(machine.url) else { return false }
            return seen.insert(url.absoluteString).inserted
        }
    }

    private func write(_ machines: [NativeMachine], to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(machines).write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    private func fileURL() throws -> URL {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
        return root.appendingPathComponent("Evolingo", isDirectory: true).appendingPathComponent("machines.json")
    }
}

@MainActor private final class ToolsModel: ObservableObject {
    @Published private(set) var interests: Set<String> = []
    @Published private(set) var machines: [NativeMachine] = []
    @Published var error: String?
    @Published private(set) var isRestoring = true
    private let interestsKey = "native.evolingo.integration-interest.v1"

    func reloadFromDisk(force: Bool = false) async {
        guard isRestoring || force else { return }
        interests = Set(UserDefaults.standard.stringArray(forKey: interestsKey) ?? [])
        do {
            machines = try await NativeMachineStore.shared.load()
            error = nil
        } catch {
            self.error = "A mentett géphivatkozásokat nem sikerült beolvasni. Próbáld újra."
            EvoHaptics.failure()
        }
        isRestoring = false
    }

    func recordInterest(_ id: String) {
        interests.insert(id)
        UserDefaults.standard.set(Array(interests), forKey: interestsKey)
        EvoHaptics.success()
    }

    func addMachine(name: String, address: String) async -> Bool {
        guard !isRestoring else { return false }
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty, cleanName.count <= 80,
              let url = NativeHTTPSAddress.validatedURL(address) else {
            error = "Adj meg nevet és érvényes HTTPS-címet."
            EvoHaptics.failure()
            return false
        }
        guard !machines.contains(where: { $0.url == url.absoluteString }) else {
            error = "Ez a HTTPS-hivatkozás már szerepel a mentett gépek között."
            EvoHaptics.failure()
            return false
        }
        let machine = NativeMachine(id: UUID().uuidString, name: cleanName, url: url.absoluteString)
        machines.append(machine)
        guard await persistMachines() else {
            machines.removeAll { $0.id == machine.id }
            return false
        }
        error = nil
        EvoHaptics.success()
        return true
    }

    func deleteMachine(_ machine: NativeMachine) async {
        let previous = machines
        machines.removeAll { $0.id == machine.id }
        guard await persistMachines() else { machines = previous; return }
        EvoHaptics.success()
    }

    private func persistMachines() async -> Bool {
        do {
            try await NativeMachineStore.shared.save(machines)
            return true
        } catch {
            self.error = "A géphivatkozásokat nem sikerült biztonságosan elmenteni."
            EvoHaptics.failure()
            return false
        }
    }
}

struct ToolsView: View {
    @StateObject private var model = ToolsModel()
    @Environment(\.openURL) private var openURL
    @State private var query = ""
    @State private var selected: NativeIntegration?
    @State private var addingMachine = false
    @State private var name = ""
    @State private var address = ""
    @State private var deleteTarget: NativeMachine?

    private let integrations: [NativeIntegration] = [
        .init(id: "gmail", name: "Gmail", subtitle: "E-mailek és üzenetek", detail: "E-mailek és mellékletek felhasználása a tanuláshoz.", symbol: "envelope"),
        .init(id: "google-drive", name: "Google Drive", subtitle: "Fájlok és dokumentumok", detail: "Dokumentumok és tananyagok kiválasztása a Google Drive-ból.", symbol: "externaldrive"),
        .init(id: "google-calendar", name: "Google Naptár", subtitle: "Naptár és események", detail: "Tanulási események és határidők áttekintése.", symbol: "calendar"),
        .init(id: "github", name: "GitHub", subtitle: "Projektek és adattárak", detail: "Projektek, kódtárak és dokumentációk elérése.", symbol: "chevron.left.forwardslash.chevron.right"),
        .init(id: "notion", name: "Notion", subtitle: "Jegyzetek és tudásbázisok", detail: "Jegyzetek és tanulási anyagok elérése.", symbol: "doc.text"),
        .init(id: "slack", name: "Slack", subtitle: "Csapatok és beszélgetések", detail: "Tanuláshoz kapcsolódó csatornák és üzenetek elérése.", symbol: "bubble.left.and.bubble.right"),
    ]

    private var matchingIntegrations: [NativeIntegration] {
        query.isEmpty ? integrations : integrations.filter { ($0.name + " " + $0.subtitle).localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        LibraryView()
                    } label: {
                        Label {
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Saját fájlok")
                                Text("Helyi iPhone-tárhely").font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                            }
                        } icon: { EvoIcon(systemName: "folder").evoSymbol(.standard) }
                    }

                    Button { EvoHaptics.tap(); addingMachine = true } label: {
                        EvoSymbolLabel("Külső gép hozzáadása", systemImage: "server.rack")
                    }.disabled(model.isRestoring)
                } header: { Text("Tárhely és gépek") } footer: {
                    Text("A külső gépek csak HTTPS-hivatkozásként tárolódnak; az Evölingo nem ellenőrzi vagy vezérli őket.")
                }

                if !model.machines.isEmpty {
                    Section("Mentett hivatkozások") {
                        ForEach(model.machines) { machine in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(machine.name)
                                    Text("Külső webes vezérlőpult · állapot nincs ellenőrizve").font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                                }
                                Spacer()
                                Button { EvoHaptics.tap(); if let url = NativeHTTPSAddress.validatedURL(machine.url) { openURL(url) } } label: {
                                    EvoIcon(systemName: "arrow.up.right.square").evoSymbol(.standard).frame(width: 44, height: 44)
                                }.accessibilityLabel("\(machine.name) megnyitása")
                            }
                            .swipeActions {
                                Button(role: .destructive) { deleteTarget = machine } label: { EvoSymbolLabel("Törlés", systemImage: "trash") }
                            }
                        }
                    }
                }

                Section {
                    ForEach(matchingIntegrations) { integration in
                        Button { EvoHaptics.tap(); selected = integration } label: {
                            HStack(spacing: 13) {
                                EvoIcon(systemName: integration.symbol).evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.primary)
                                    .frame(width: 40, height: 40).background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 11))
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(integration.name).foregroundStyle(EvoTheme.Symbol.primary)
                                    Text(integration.subtitle).font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                                }
                                Spacer()
                                if model.interests.contains(integration.id) {
                                    EvoIcon(systemName: "checkmark.circle.fill").evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.secondary)
                                } else { EvoIcon(systemName: "chevron.right").evoSymbol(.toolbar, weight: .medium).foregroundStyle(EvoTheme.Symbol.secondary) }
                            }.padding(.vertical, 3).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                    }
                    if matchingIntegrations.isEmpty {
                        EvoUnavailableView.search(text: query).listRowSeparator(.hidden)
                    }
                } header: { Text("Integrációk") } footer: {
                    Text("Ezek a kapcsolatok még nem csatlakoztathatók. Az érdeklődés jelölése csak ezen az iPhone-on mentődik.")
                }

                if let error = model.error {
                    Section { EvoSymbolLabel(error, systemImage: "exclamationmark.triangle").foregroundStyle(.red).font(EvoFont.text(.footnote)) }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Eszközök")
            .searchable(text: $query, prompt: "Eszközök keresése")
            .sheet(item: $selected) { integration in
                NavigationStack {
                    VStack(alignment: .leading, spacing: 16) {
                        EvoIcon(systemName: integration.symbol).evoSymbol(.standard).frame(width: 64, height: 64)
                            .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
                        Text(integration.detail).font(EvoFont.text(.body))
                        EvoSymbolLabel("Nincs csatlakoztatva", systemImage: "minus.circle").foregroundStyle(EvoTheme.Symbol.secondary)
                        Text("A kapcsolati és jogosultságkezelés még nincs beépítve.").font(EvoFont.text(.footnote)).foregroundStyle(EvoTheme.Symbol.secondary)
                        Spacer(minLength: 0)
                        Button {
                            model.recordInterest(integration.id)
                            selected = nil
                        } label: {
                            Text(model.interests.contains(integration.id) ? "Érdeklődés mentve" : "Érdekel")
                                .frame(maxWidth: .infinity).frame(height: 50)
                        }.buttonStyle(.borderedProminent).disabled(model.interests.contains(integration.id))
                    }
                    .padding(24)
                    .navigationTitle(integration.name)
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Kész") { selected = nil } } }
                }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $addingMachine) {
                NavigationStack {
                    Form {
                        TextField("Gép neve", text: $name).textInputAutocapitalization(.words)
                        TextField("HTTPS-cím", text: $address).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Section { Text("A cím csak könyvjelző. Hozzáadása nem hoz létre hálózati kapcsolatot.").font(EvoFont.text(.footnote)).foregroundStyle(EvoTheme.Symbol.secondary) }
                    }
                    .navigationTitle("Külső gép")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) { Button("Mégse") { addingMachine = false } }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Mentés") {
                                Task {
                                    if await model.addMachine(name: name, address: address) {
                                        addingMachine = false; name = ""; address = ""
                                    }
                                }
                            }.disabled(model.isRestoring)
                        }
                    }
                }.presentationDetents([.medium])
            }
            .confirmationDialog("Hivatkozás törlése?", isPresented: Binding(get: { deleteTarget != nil }, set: { if !$0 { deleteTarget = nil } }), titleVisibility: .visible) {
                Button("Törlés", role: .destructive) { if let machine = deleteTarget { Task { await model.deleteMachine(machine) } }; deleteTarget = nil }
                Button("Mégse", role: .cancel) { deleteTarget = nil }
            } message: { Text(deleteTarget?.name ?? "") }
            .task { await model.reloadFromDisk() }
            .onReceive(NotificationCenter.default.publisher(for: .evolingoNativeDataImported)) { _ in
                Task { await model.reloadFromDisk(force: true) }
            }
        }
    }
}

// MARK: - Modern Plugins Tab (Featured Collections, Popular Plugins & Bottom Search Shelf)


enum ArlenPluginStatus: String, Codable, Sendable {
    case available = "available"
    case setupRequired = "setup_required"
    case comingSoon = "coming_soon"
    case unsupported = "unsupported"

    var badgeTitle: String {
        switch self {
        case .available: return "Available"
        case .setupRequired: return "Setup Required"
        case .comingSoon: return "Coming Soon"
        case .unsupported: return "Unsupported"
        }
    }
}

enum ArlenPluginIconKind: String, Codable, CaseIterable, Sendable {
    case gmail
    case googleDrive
    case health
    case remoteDesktop
    case github
    case vercel
    case supabase
    case linear
    case custom
    case outlook
    case slack
    case teams
    case discord
    case telegram
    case zoom
    case twilio
    case intercom
    case zendesk
    case googleCalendar
    case googleDocs
    case googleSheets
    case googleSlides
    case notion
    case todoist
    case trello
    case asana
    case clickup
    case airtable
    case coda
    case gitlab
    case bitbucket
    case jira
    case netlify
    case cloudflare
    case firebase
    case sentry
    case posthog
    case database
    case cloud
    case docker
    case kubernetes
    case terminal
    case figma
    case design
    case miro
    case framer
    case webflow
    case youtube
    case spotify
    case stripe
    case shopify
    case commerce
    case hubspot
    case salesforce
    case pipedrive
    case mailchimp
    case analytics
    case dropbox
    case onedrive
    case box
    case zapier
    case make
    case n8n
    case calendly
}

struct ArlenPluginItem: Identifiable, Codable, Equatable, Sendable {
    let id: String
    var name: String
    var subtitle: String
    var description: String
    var category: String
    var status: ArlenPluginStatus
    var authType: String
    var capabilities: [String]
    var scopes: [String]
    var modes: [String]
    var iconKind: ArlenPluginIconKind
    var endpointURL: String?
}

struct ArlenPluginCollection: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let caption: String
    let badges: [ArlenPluginIconKind]
    let pluginIDs: [String]
}

enum ArlenPluginFilter: String, CaseIterable, Identifiable {
    case popular = "Popular"
    case all = "All"
    case connected = "Connected"
    case communication = "Communication"
    case productivity = "Productivity"
    case development = "Development"
    case databases = "Cloud & Data"
    case design = "Design"
    case business = "Business"
    case storage = "Storage & Automation"

    var id: String { rawValue }
}

@MainActor
private final class PluginsStore: ObservableObject {
    @Published private(set) var connectedIDs: Set<String> = []
    @Published private(set) var customPlugins: [ArlenPluginItem] = []

    private let connectedKey = "native.arlen.plugins.connected.v2"
    private let customKey = "native.arlen.plugins.custom.v1"

    let catalog: [ArlenPluginItem] = [
        ArlenPluginItem(
            id: "gmail",
            name: "Gmail",
            subtitle: "Read and manage Gmail",
            description: "Search threads, summarize unread emails, and draft context-aware replies directly from Arlen.",
            category: "communication",
            status: .available,
            authType: "oauth2",
            capabilities: ["Search email threads", "Summarize unread messages", "Draft contextual replies", "Send with confirmation"],
            scopes: ["https://www.googleapis.com/auth/gmail.modify"],
            modes: ["chat", "cowork"],
            iconKind: .gmail,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "microsoft-outlook",
            name: "Microsoft Outlook",
            subtitle: "Search mail, calendar and inbox",
            description: "Search email, read messages, and manage calendar events with authorized Microsoft Graph scopes.",
            category: "communication",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Search inbox & folders", "Read message details", "Sync calendar appointments"],
            scopes: ["Mail.ReadWrite", "Calendars.ReadWrite"],
            modes: ["chat", "cowork"],
            iconKind: .outlook,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "slack",
            name: "Slack",
            subtitle: "Channels, direct messages and search",
            description: "Search workspaces, summarize active channels, and send authorized status updates or responses.",
            category: "communication",
            status: .available,
            authType: "oauth2",
            capabilities: ["Search public channels", "Summarize conversation history", "Draft channel messages"],
            scopes: ["channels:read", "chat:write", "search:read"],
            modes: ["chat", "cowork"],
            iconKind: .slack,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "microsoft-teams",
            name: "Microsoft Teams",
            subtitle: "Team chats and meetings",
            description: "Access meeting transcripts, team channels, and collaboration spaces where organization policies permit.",
            category: "communication",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Read team channel posts", "Inspect meeting transcripts", "Post team updates"],
            scopes: ["ChannelMessage.Read.All", "OnlineMeetings.Read"],
            modes: ["chat", "cowork"],
            iconKind: .teams,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "discord",
            name: "Discord",
            subtitle: "Bot-managed channels and servers",
            description: "Query bot-authorized guild channels, post automated notifications, and inspect community threads.",
            category: "communication",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query bot-authorized channels", "Post automated notifications", "Inspect guild threads"],
            scopes: ["bot", "messages.read"],
            modes: ["chat", "cowork"],
            iconKind: .discord,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "telegram",
            name: "Telegram",
            subtitle: "Bot messaging and notifications",
            description: "Send broadcast notifications and execute conversational bot tasks without user-account exposure.",
            category: "communication",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Send bot notifications", "Poll bot message updates", "Execute inline commands"],
            scopes: ["bot_token"],
            modes: ["chat", "cowork"],
            iconKind: .telegram,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "zoom",
            name: "Zoom",
            subtitle: "Meetings, recordings and transcripts",
            description: "Inspect scheduled meetings, generate smart summaries from past recordings, and share highlights.",
            category: "communication",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["List scheduled meetings", "Download cloud transcripts", "Generate meeting action items"],
            scopes: ["meeting:read", "recording:read"],
            modes: ["chat", "cowork"],
            iconKind: .zoom,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "twilio",
            name: "Twilio",
            subtitle: "SMS, voice and communications API",
            description: "Trigger verified SMS alerts, phone verification workflows, and manage communications.",
            category: "communication",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Send SMS notifications", "Query message delivery logs", "Lookup phone numbers"],
            scopes: ["AccountSid", "AuthToken"],
            modes: ["cowork"],
            iconKind: .twilio,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "intercom",
            name: "Intercom",
            subtitle: "Customer support and conversations",
            description: "Lookup user support histories, triage active inbound conversations, and draft operator responses.",
            category: "communication",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Search user tickets", "Summarize open conversations", "Draft operator replies"],
            scopes: ["conversations.read", "conversations.write"],
            modes: ["chat", "cowork"],
            iconKind: .intercom,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "zendesk",
            name: "Zendesk",
            subtitle: "Tickets and customer service",
            description: "Search helpdesk tickets, summarize complex customer cases, and draft structured resolution notes.",
            category: "communication",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Search support tickets", "Inspect customer history", "Draft internal resolution notes"],
            scopes: ["read", "write"],
            modes: ["chat", "cowork"],
            iconKind: .zendesk,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-calendar",
            name: "Google Calendar",
            subtitle: "Schedules, events and availability",
            description: "Check calendar availability, schedule meetings, and set up contextual agenda reminders.",
            category: "productivity",
            status: .available,
            authType: "oauth2",
            capabilities: ["Check calendar availability", "Schedule events with confirmation", "Summarize daily agenda"],
            scopes: ["https://www.googleapis.com/auth/calendar.events"],
            modes: ["chat", "cowork"],
            iconKind: .googleCalendar,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-drive",
            name: "Google Drive",
            subtitle: "Drive, Docs, Sheets or Slides",
            description: "Browse documents, analyze spreadsheets, and reference presentations from your Google Drive.",
            category: "productivity",
            status: .available,
            authType: "oauth2",
            capabilities: ["Search authorized files", "Read document content", "Inspect presentation slides", "Analyze spreadsheets"],
            scopes: ["https://www.googleapis.com/auth/drive.readonly"],
            modes: ["chat", "cowork"],
            iconKind: .googleDrive,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-docs",
            name: "Google Docs",
            subtitle: "Create and edit shared documents",
            description: "Read shared documents, draft outlines, and insert revisions with granular permission checks.",
            category: "productivity",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Read document text", "Draft new document", "Insert suggested edits"],
            scopes: ["https://www.googleapis.com/auth/documents"],
            modes: ["chat", "cowork"],
            iconKind: .googleDocs,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-sheets",
            name: "Google Sheets",
            subtitle: "Spreadsheets and tabular data",
            description: "Query rows, update calculated tables, and generate conversational charts from sheets.",
            category: "productivity",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query spreadsheet rows", "Append data rows", "Calculate column formulas"],
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            modes: ["chat", "cowork"],
            iconKind: .googleSheets,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-slides",
            name: "Google Slides",
            subtitle: "Presentations and deck outlines",
            description: "Inspect presentation slide contents, summarize slide decks, and generate presentation scripts.",
            category: "productivity",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Inspect slide outlines", "Extract text content", "Generate speaker notes"],
            scopes: ["https://www.googleapis.com/auth/presentations.readonly"],
            modes: ["chat", "cowork"],
            iconKind: .googleSlides,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "notion",
            name: "Notion",
            subtitle: "Notes, docs and team databases",
            description: "Search workspace pages, read structured databases, and append notes to your team knowledge base.",
            category: "productivity",
            status: .available,
            authType: "oauth2",
            capabilities: ["Search workspace pages", "Read database records", "Append notes to pages"],
            scopes: ["read_content", "update_content"],
            modes: ["chat", "cowork"],
            iconKind: .notion,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "todoist",
            name: "Todoist",
            subtitle: "Task lists and daily reminders",
            description: "Organize daily tasks, schedule reminders, and prioritize project backlogs conversationally.",
            category: "productivity",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["List due tasks", "Create task items", "Mark tasks completed"],
            scopes: ["data:read_write"],
            modes: ["chat", "cowork"],
            iconKind: .todoist,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "trello",
            name: "Trello",
            subtitle: "Boards, lists and workflow cards",
            description: "Move cards across kanban boards, attach research notes, and keep project checklists updated.",
            category: "productivity",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Browse board lists", "Create and move cards", "Update checklist items"],
            scopes: ["read", "write"],
            modes: ["chat", "cowork"],
            iconKind: .trello,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "asana",
            name: "Asana",
            subtitle: "Project tracking and team workflows",
            description: "Track milestones, manage assignee workloads, and inspect sprint tasks across projects.",
            category: "productivity",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Inspect project tasks", "Update task assignees", "Track project milestones"],
            scopes: ["default"],
            modes: ["chat", "cowork"],
            iconKind: .asana,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "clickup",
            name: "ClickUp",
            subtitle: "All-in-one tasks, docs and goals",
            description: "Synchronize tasks, documents, and sprint statuses from your connected ClickUp workspace.",
            category: "productivity",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["List team spaces", "Query task statuses", "Create sprint tasks"],
            scopes: ["pk_token"],
            modes: ["chat", "cowork"],
            iconKind: .clickup,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "airtable",
            name: "Airtable",
            subtitle: "Relational databases and grids",
            description: "Perform structured queries across Airtable bases, link records, and summarize view schemas.",
            category: "productivity",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Query base records", "Filter views", "Insert and update rows"],
            scopes: ["data.records:read", "data.records:write"],
            modes: ["chat", "cowork"],
            iconKind: .airtable,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "coda",
            name: "Coda",
            subtitle: "Interactive docs and tables",
            description: "Read interactive docs, execute table automation formulas, and pull structured project contexts.",
            category: "productivity",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Read doc formulas", "Query table rows", "Append doc sections"],
            scopes: ["docs:read"],
            modes: ["chat", "cowork"],
            iconKind: .coda,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "github",
            name: "GitHub",
            subtitle: "Repositories, pull requests and issues",
            description: "Review diffs, search repositories, triage issues, and inspect CI workflows.",
            category: "development",
            status: .available,
            authType: "oauth2",
            capabilities: ["Search repository code", "Inspect pull request diffs", "Triage issues", "Check GitHub Actions CI"],
            scopes: ["repo", "read:user"],
            modes: ["chat", "cowork"],
            iconKind: .github,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "gitlab",
            name: "GitLab",
            subtitle: "DevOps lifecycle, CI/CD pipelines",
            description: "Monitor merge requests, check pipeline statuses, and query issue trackers on GitLab.",
            category: "development",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Monitor merge requests", "Check CI pipeline status", "Search project commits"],
            scopes: ["read_api", "read_repository"],
            modes: ["chat", "cowork"],
            iconKind: .gitlab,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "bitbucket",
            name: "Bitbucket",
            subtitle: "Git repositories and pipelines",
            description: "Browse source branches, inspect pull request reviews, and track Atlassian repo status.",
            category: "development",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Browse repository branches", "Inspect pull requests", "View pipeline builds"],
            scopes: ["repository:read", "pullrequest:read"],
            modes: ["chat", "cowork"],
            iconKind: .bitbucket,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "linear",
            name: "Linear",
            subtitle: "Issue tracking and product cycles",
            description: "Create issues, update sprint states, and summarize cycle progress in conversation.",
            category: "development",
            status: .available,
            authType: "oauth2",
            capabilities: ["Create tracked issues", "Update cycle states", "Summarize sprint velocity"],
            scopes: ["read", "write", "issues:create"],
            modes: ["chat", "cowork"],
            iconKind: .linear,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "jira",
            name: "Jira",
            subtitle: "Software sprints, epics and tickets",
            description: "Inspect backlog tickets, transition issue workflows, and track team agile velocity.",
            category: "development",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Inspect sprint backlogs", "Transition ticket states", "Search JQL filters"],
            scopes: ["read:jira-work", "write:jira-work"],
            modes: ["chat", "cowork"],
            iconKind: .jira,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "vercel",
            name: "Vercel",
            subtitle: "Deployments, previews and logs",
            description: "Check production build status, preview URLs, and runtime environment diagnostics.",
            category: "development",
            status: .available,
            authType: "api_key",
            capabilities: ["Inspect production deployments", "Check preview build URLs", "Stream runtime build logs"],
            scopes: ["deployments:read", "projects:read"],
            modes: ["chat", "cowork"],
            iconKind: .vercel,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "netlify",
            name: "Netlify",
            subtitle: "Web hosting and serverless functions",
            description: "Inspect branch deploy previews, DNS records, and edge handler build logs.",
            category: "development",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Inspect deploy previews", "Review site build logs", "Check edge functions"],
            scopes: ["sites:read"],
            modes: ["chat", "cowork"],
            iconKind: .netlify,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "cloudflare",
            name: "Cloudflare",
            subtitle: "DNS, Workers, and edge network",
            description: "Review DNS zones, monitor edge worker latency, and inspect security telemetry.",
            category: "development",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Review DNS records", "Inspect Workers telemetry", "Check cache purge status"],
            scopes: ["dns:read", "workers:read"],
            modes: ["chat", "cowork"],
            iconKind: .cloudflare,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "supabase",
            name: "Supabase",
            subtitle: "Postgres database, auth and storage",
            description: "Inspect database schemas, run safe read queries, and monitor edge functions.",
            category: "development",
            status: .available,
            authType: "api_key",
            capabilities: ["Inspect schema tables", "Run safe read queries", "Monitor edge function logs"],
            scopes: ["database:read", "functions:read"],
            modes: ["chat", "cowork"],
            iconKind: .supabase,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "firebase",
            name: "Firebase",
            subtitle: "Firestore, auth and cloud storage",
            description: "Inspect Firestore collections, query authorized cloud data, and monitor authentication.",
            category: "development",
            status: .setupRequired,
            authType: "service_account",
            capabilities: ["Query Firestore collections", "Check authentication users", "Inspect cloud functions"],
            scopes: ["cloud-platform.read-only"],
            modes: ["chat", "cowork"],
            iconKind: .firebase,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "sentry",
            name: "Sentry",
            subtitle: "Error monitoring and stack traces",
            description: "Analyze uncaught production exceptions, inspect stack traces, and correlate regressions.",
            category: "development",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Query unhandled errors", "Analyze stack traces", "Correlate release regressions"],
            scopes: ["event:read", "project:read"],
            modes: ["chat", "cowork"],
            iconKind: .sentry,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "posthog",
            name: "PostHog",
            subtitle: "Product analytics and feature flags",
            description: "Query funnel conversions, inspect active feature flags, and observe user retention.",
            category: "development",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Inspect feature flags", "Query retention funnels", "Check user session events"],
            scopes: ["project:read"],
            modes: ["chat", "cowork"],
            iconKind: .posthog,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "mongodb-atlas",
            name: "MongoDB Atlas",
            subtitle: "Document databases and collections",
            description: "Query collection schemas, inspect document counts, and monitor cluster performance.",
            category: "databases",
            status: .available,
            authType: "api_key",
            capabilities: ["Query collection schemas", "Inspect document counts", "Monitor cluster metrics"],
            scopes: ["cluster:read"],
            modes: ["chat", "cowork"],
            iconKind: .database,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "postgresql",
            name: "PostgreSQL",
            subtitle: "Direct SQL query engine",
            description: "Execute safe read-only SQL queries and explain query execution plans on Postgres.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Execute read-only SQL", "Explain query plans", "Inspect table constraints"],
            scopes: ["pg_read_all_data"],
            modes: ["chat", "cowork"],
            iconKind: .database,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "mysql",
            name: "MySQL",
            subtitle: "Relational database connector",
            description: "Connect to MySQL instances to inspect table schemas and generate performance metrics.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Query relational tables", "Inspect column types", "Check index optimization"],
            scopes: ["select_only"],
            modes: ["chat", "cowork"],
            iconKind: .database,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "redis",
            name: "Redis",
            subtitle: "In-memory cache and key-value store",
            description: "Inspect cache keys, examine memory usage, and execute allowlisted monitoring commands.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Inspect cache key patterns", "Check memory statistics", "Query TTL expiration"],
            scopes: ["read_only"],
            modes: ["chat", "cowork"],
            iconKind: .database,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "neon",
            name: "Neon",
            subtitle: "Serverless Postgres with branching",
            description: "Create isolated development branches, query database endpoints, and monitor compute.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Inspect database branches", "Create dev branch", "Monitor compute consumption"],
            scopes: ["projects:read", "branches:create"],
            modes: ["chat", "cowork"],
            iconKind: .database,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "planetscale",
            name: "PlanetScale",
            subtitle: "Serverless MySQL platform",
            description: "Review schema branches, check deployment states, and monitor database traffic.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Inspect schema branches", "Check deploy requests", "Review query latencies"],
            scopes: ["databases:read"],
            modes: ["chat", "cowork"],
            iconKind: .database,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "aws",
            name: "Amazon Web Services (AWS)",
            subtitle: "Cloud infrastructure and IAM",
            description: "Query CloudWatch metrics, inspect S3 buckets, and view Lambda execution health.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Query CloudWatch alarms", "Inspect S3 bucket objects", "Monitor Lambda health"],
            scopes: ["cloudwatch:GetMetricData", "s3:ListBucket"],
            modes: ["cowork"],
            iconKind: .cloud,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-cloud",
            name: "Google Cloud",
            subtitle: "GCP resources and cloud run",
            description: "Inspect Cloud Run services, monitor BigQuery jobs, and audit project metrics.",
            category: "databases",
            status: .setupRequired,
            authType: "service_account",
            capabilities: ["Inspect Cloud Run status", "Monitor BigQuery jobs", "Audit project error logs"],
            scopes: ["cloud-platform.read-only"],
            modes: ["cowork"],
            iconKind: .cloud,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "microsoft-azure",
            name: "Microsoft Azure",
            subtitle: "Cloud services and VMs",
            description: "Review resource groups, monitor Azure app services, and inspect event health.",
            category: "databases",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Inspect resource groups", "Monitor App Service health", "Query Azure Monitor metrics"],
            scopes: ["https://management.azure.com/user_impersonation"],
            modes: ["cowork"],
            iconKind: .cloud,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "digitalocean",
            name: "DigitalOcean",
            subtitle: "Droplets, Kubernetes and apps",
            description: "Monitor Droplet resource consumption, manage snapshots, and inspect app platforms.",
            category: "databases",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Monitor Droplet load", "Query App Platform status", "Inspect snapshot backups"],
            scopes: ["read"],
            modes: ["cowork"],
            iconKind: .cloud,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "docker",
            name: "Docker",
            subtitle: "Container management and images",
            description: "List running containers, inspect image tags, and diagnose container log streams.",
            category: "databases",
            status: .setupRequired,
            authType: "mcp",
            capabilities: ["List running containers", "Inspect container logs", "Audit image vulnerability tags"],
            scopes: ["docker.sock:read"],
            modes: ["chat", "cowork"],
            iconKind: .docker,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "kubernetes",
            name: "Kubernetes",
            subtitle: "Cluster pods and workloads",
            description: "Check namespace deployment health, inspect pod restart counts, and view event logs.",
            category: "databases",
            status: .setupRequired,
            authType: "mcp",
            capabilities: ["Inspect pod restart counts", "Query namespace events", "Check deployment status"],
            scopes: ["get:pods", "get:deployments"],
            modes: ["chat", "cowork"],
            iconKind: .kubernetes,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "ssh",
            name: "SSH / Remote Terminal",
            subtitle: "Secure jump host commands",
            description: "Run allowlisted diagnostic commands on remote servers through verified SSH tunnels.",
            category: "databases",
            status: .setupRequired,
            authType: "mcp",
            capabilities: ["Execute allowlisted status scripts", "Inspect system uptime", "Audit disk space"],
            scopes: ["ssh_key_scoped"],
            modes: ["chat", "cowork"],
            iconKind: .terminal,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "figma",
            name: "Figma",
            subtitle: "Design files, components and tokens",
            description: "Inspect design component properties, pull token values, and summarize design comments.",
            category: "design",
            status: .available,
            authType: "oauth2",
            capabilities: ["Inspect design components", "Extract token color palettes", "Summarize canvas comments"],
            scopes: ["files:read"],
            modes: ["chat", "cowork"],
            iconKind: .figma,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "canva",
            name: "Canva",
            subtitle: "Templates, graphics and brand kits",
            description: "Generate brand graphics, inspect layout templates, and export approved media assets.",
            category: "design",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Browse brand templates", "Export preview assets", "Create layout draft"],
            scopes: ["design:content:read", "design:meta:read"],
            modes: ["chat", "cowork"],
            iconKind: .design,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "adobe-creative-cloud",
            name: "Adobe Creative Cloud",
            subtitle: "Cloud libraries and assets",
            description: "Browse assets in Adobe Cloud, inspect color themes, and reference vector libraries.",
            category: "design",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Search cloud libraries", "Inspect asset versions", "Download reference vectors"],
            scopes: ["cc_libraries_read"],
            modes: ["chat", "cowork"],
            iconKind: .design,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "miro",
            name: "Miro",
            subtitle: "Visual whiteboards and diagrams",
            description: "Read diagram boards, summarize sticky note brainstorms, and export visual mindmaps.",
            category: "design",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Read whiteboard sticky notes", "Summarize diagram sessions", "Create conceptual card"],
            scopes: ["boards:read", "boards:write"],
            modes: ["chat", "cowork"],
            iconKind: .miro,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "framer",
            name: "Framer",
            subtitle: "Interactive web layouts and CMS",
            description: "Publish site updates, sync CMS collections, and review design staging previews.",
            category: "design",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Review staging previews", "Sync CMS items", "Audit layout breakpoints"],
            scopes: ["sites:read", "cms:write"],
            modes: ["chat", "cowork"],
            iconKind: .framer,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "webflow",
            name: "Webflow",
            subtitle: "Visual website development and CMS",
            description: "Manage CMS collections, update live content items, and trigger publish workflows.",
            category: "design",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Update CMS collection items", "Trigger publish to staging", "Inspect site forms"],
            scopes: ["cms:read", "cms:write"],
            modes: ["chat", "cowork"],
            iconKind: .webflow,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "youtube",
            name: "YouTube",
            subtitle: "Channel metrics and video metadata",
            description: "Inspect channel analytics, search video captions, and schedule community updates.",
            category: "design",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Inspect video metrics", "Search captions and transcripts", "Draft video descriptions"],
            scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
            modes: ["chat", "cowork"],
            iconKind: .youtube,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "spotify",
            name: "Spotify",
            subtitle: "Music library and playlist control",
            description: "Search music catalogs, inspect current playback, and curate collaborative playlists.",
            category: "design",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Search audio catalogs", "Inspect active playback", "Add track to study playlist"],
            scopes: ["user-read-playback-state", "playlist-modify-public"],
            modes: ["chat"],
            iconKind: .spotify,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "stripe",
            name: "Stripe",
            subtitle: "Payments, invoices and subscriptions",
            description: "Inspect MRR trends, lookup customer payment statuses, and review invoice details.",
            category: "business",
            status: .available,
            authType: "api_key",
            capabilities: ["Inspect revenue analytics", "Lookup invoice payment status", "Verify customer subscriptions"],
            scopes: ["rak_read_only"],
            modes: ["chat", "cowork"],
            iconKind: .stripe,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "shopify",
            name: "Shopify",
            subtitle: "E-commerce store and catalog",
            description: "Check real-time order volume, search customer orders, and manage inventory levels.",
            category: "business",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query order fulfillment", "Inspect inventory levels", "Search store catalog"],
            scopes: ["read_orders", "read_products"],
            modes: ["chat", "cowork"],
            iconKind: .shopify,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "woocommerce",
            name: "WooCommerce",
            subtitle: "WordPress store management",
            description: "Monitor daily shop sales, query customer orders, and update product inventories.",
            category: "business",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Monitor daily sales totals", "Query pending orders", "Update stock status"],
            scopes: ["read_write"],
            modes: ["chat", "cowork"],
            iconKind: .commerce,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "hubspot",
            name: "HubSpot",
            subtitle: "Inbound CRM and marketing hub",
            description: "Look up contact lifecycles, inspect sales deals, and synchronize lead activities.",
            category: "business",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query contact timelines", "Inspect deal pipeline stages", "Create contact notes"],
            scopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
            modes: ["chat", "cowork"],
            iconKind: .hubspot,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "salesforce",
            name: "Salesforce",
            subtitle: "Enterprise CRM and opportunities",
            description: "Query customer accounts, update deal stages, and run pipeline velocity reports.",
            category: "business",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query customer accounts", "Update opportunity stages", "Generate pipeline summary"],
            scopes: ["api", "refresh_token"],
            modes: ["chat", "cowork"],
            iconKind: .salesforce,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "pipedrive",
            name: "Pipedrive",
            subtitle: "Sales pipeline and deal tracking",
            description: "Track deal stages across pipelines, add meeting notes, and schedule sales follow-ups.",
            category: "business",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Track pipeline stages", "Schedule activity follow-ups", "Add deal notes"],
            scopes: ["deals:read", "activities:write"],
            modes: ["chat", "cowork"],
            iconKind: .pipedrive,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "mailchimp",
            name: "Mailchimp",
            subtitle: "Email campaigns and audience lists",
            description: "Review campaign open rates, manage audience segments, and monitor newsletter growth.",
            category: "business",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Review campaign open rates", "Inspect audience growth", "Query unsubscribe rates"],
            scopes: ["reports:read", "lists:read"],
            modes: ["chat", "cowork"],
            iconKind: .mailchimp,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "google-analytics",
            name: "Google Analytics",
            subtitle: "GA4 web traffic and conversions",
            description: "Query real-time visitor counts, traffic channels, and top conversion events.",
            category: "business",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query real-time visitor counts", "Analyze traffic channels", "Review conversion funnels"],
            scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
            modes: ["chat", "cowork"],
            iconKind: .analytics,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "plausible",
            name: "Plausible",
            subtitle: "Privacy-first web analytics",
            description: "Check visitor counts, top referrers, and page views without privacy invasive tracking.",
            category: "business",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Check 30-day visitor trends", "List top referrers", "Inspect popular pages"],
            scopes: ["stats:read"],
            modes: ["chat", "cowork"],
            iconKind: .analytics,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "dropbox",
            name: "Dropbox",
            subtitle: "Cloud file storage and sharing",
            description: "Search files, generate shared links, and retrieve document contents securely.",
            category: "storage",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Search personal files", "Generate sharing links", "Retrieve text contents"],
            scopes: ["files.metadata.read", "files.content.read"],
            modes: ["chat", "cowork"],
            iconKind: .dropbox,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "onedrive",
            name: "OneDrive",
            subtitle: "Microsoft personal and work files",
            description: "Access Microsoft 365 cloud files, sync attachments, and preview shared folders.",
            category: "storage",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Search cloud files", "Download document previews", "Inspect shared folders"],
            scopes: ["Files.Read.All"],
            modes: ["chat", "cowork"],
            iconKind: .onedrive,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "box",
            name: "Box",
            subtitle: "Enterprise content and governance",
            description: "Search enterprise file vaults, inspect version history, and manage secure collaborations.",
            category: "storage",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Search enterprise content", "Inspect file versions", "Check collaboration access"],
            scopes: ["root_readonly"],
            modes: ["chat", "cowork"],
            iconKind: .box,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "zapier",
            name: "Zapier",
            subtitle: "No-code automation workflows",
            description: "Trigger multi-app Zaps, send webhook payloads, and check recent Zap run executions.",
            category: "storage",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Trigger active Zaps", "Inspect execution logs", "Send webhook actions"],
            scopes: ["zaps:write", "history:read"],
            modes: ["chat", "cowork"],
            iconKind: .zapier,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "make",
            name: "Make",
            subtitle: "Complex visual workflow scenarios",
            description: "Trigger active scenarios, inspect execution histories, and sync cross-tool states.",
            category: "storage",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Trigger active scenarios", "Inspect scenario logs", "Sync tool states"],
            scopes: ["scenarios:run", "scenarios:read"],
            modes: ["chat", "cowork"],
            iconKind: .make,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "n8n",
            name: "n8n",
            subtitle: "Self-hosted workflow automation",
            description: "Trigger webhook executions, inspect node error logs, and orchestrate custom services.",
            category: "storage",
            status: .setupRequired,
            authType: "api_key",
            capabilities: ["Trigger webhook executions", "Inspect error logs", "Check workflow activations"],
            scopes: ["workflows:read", "workflows:execute"],
            modes: ["chat", "cowork"],
            iconKind: .n8n,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "calendly",
            name: "Calendly",
            subtitle: "Automated meeting scheduling",
            description: "Share scheduling booking links, query upcoming slots, and manage invitee bookings.",
            category: "storage",
            status: .setupRequired,
            authType: "oauth2",
            capabilities: ["Query upcoming booked events", "Retrieve user scheduling links", "Inspect available slots"],
            scopes: ["default"],
            modes: ["chat", "cowork"],
            iconKind: .calendly,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "health",
            name: "Health",
            subtitle: "Explore your health data in ChatGPT",
            description: "Inspect sleep trends, workouts, and wellness metrics privately with structured health charts.",
            category: "popular",
            status: .available,
            authType: "none",
            capabilities: ["Inspect step and activity trends", "Review resting heart rate", "Analyze sleep cycles", "Privacy-first local processing"],
            scopes: ["Apple HealthKit read"],
            modes: ["chat"],
            iconKind: .health,
            endpointURL: nil
        ),
        ArlenPluginItem(
            id: "remote-desktop",
            name: "Remote Desktop Commander",
            subtitle: "Use your computer from chat",
            description: "Execute workspace workflows, inspect files, and manage terminal sessions over encrypted bridge links.",
            category: "popular",
            status: .available,
            authType: "mcp",
            capabilities: ["Execute local shell scripts", "Inspect workspace directory files", "Monitor terminal output stream", "Encrypted peer-to-peer bridge"],
            scopes: ["Arlen MCP Bridge (Local)"],
            modes: ["chat", "cowork"],
            iconKind: .remoteDesktop,
            endpointURL: nil
        )
    ]

    let collections: [ArlenPluginCollection] = [
        ArlenPluginCollection(
            id: "build-deploy",
            title: "Build & Deploy",
            subtitle: "Tools for your next project",
            caption: "GitHub · Vercel · Supabase · Linear",
            badges: [.github, .vercel, .supabase, .linear],
            pluginIDs: ["github", "vercel", "supabase", "linear"]
        ),
        ArlenPluginCollection(
            id: "work-smarter",
            title: "Work Smarter",
            subtitle: "Daily email, calendar & notes",
            caption: "Gmail · Google Calendar · Notion · Todoist",
            badges: [.gmail, .googleCalendar, .notion, .todoist],
            pluginIDs: ["gmail", "google-calendar", "notion", "todoist"]
        ),
        ArlenPluginCollection(
            id: "cloud-data",
            title: "Cloud & Data",
            subtitle: "Databases, cache & edge networks",
            caption: "MongoDB Atlas · Neon · Redis · Cloudflare",
            badges: [.database, .database, .database, .cloudflare],
            pluginIDs: ["mongodb-atlas", "neon", "redis", "cloudflare"]
        ),
        ArlenPluginCollection(
            id: "design-together",
            title: "Design Together",
            subtitle: "Visual boards & prototype handoff",
            caption: "Figma · Canva · Miro · Framer",
            badges: [.figma, .design, .miro, .framer],
            pluginIDs: ["figma", "canva", "miro", "framer"]
        ),
        ArlenPluginCollection(
            id: "automate-work",
            title: "Automate Work",
            subtitle: "Workflow triggers & sync",
            caption: "n8n · Zapier · Make · Airtable",
            badges: [.n8n, .zapier, .make, .airtable],
            pluginIDs: ["n8n", "zapier", "make", "airtable"]
        ),
        ArlenPluginCollection(
            id: "your-workspace",
            title: "Your Workspace",
            subtitle: "Cloud drive & file content",
            caption: "Google Drive · Dropbox · OneDrive · Box",
            badges: [.googleDrive, .dropbox, .onedrive, .box],
            pluginIDs: ["google-drive", "dropbox", "onedrive", "box"]
        ),
        ArlenPluginCollection(
            id: "team-communication",
            title: "Team Communication",
            subtitle: "Workspaces, meetings & channels",
            caption: "Slack · Microsoft Teams · Discord · Zoom",
            badges: [.slack, .teams, .discord, .zoom],
            pluginIDs: ["slack", "microsoft-teams", "discord", "zoom"]
        )
    ]

    init() {
        load()
    }

    var allPlugins: [ArlenPluginItem] {
        catalog + customPlugins
    }

    func load() {
        if let saved = UserDefaults.standard.stringArray(forKey: connectedKey) {
            connectedIDs = Set(saved)
        } else {
            connectedIDs = []
            UserDefaults.standard.set([], forKey: connectedKey)
        }

        if let data = UserDefaults.standard.data(forKey: customKey),
           let decoded = try? JSONDecoder().decode([ArlenPluginItem].self, from: data) {
            customPlugins = decoded
        }
    }

    func isConnected(_ id: String) -> Bool {
        connectedIDs.contains(id)
    }

    func toggleConnection(_ id: String) {
        if connectedIDs.contains(id) {
            connectedIDs.remove(id)
            EvoHaptics.tap()
        } else {
            connectedIDs.insert(id)
            EvoHaptics.success()
        }
        UserDefaults.standard.set(Array(connectedIDs), forKey: connectedKey)
    }

    func addCustomPlugin(name: String, subtitle: String, endpoint: String) -> Bool {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty else {
            EvoHaptics.failure()
            return false
        }
        let cleanSubtitle = subtitle.trimmingCharacters(in: .whitespacesAndNewlines)
        let validated = NativeHTTPSAddress.validatedURL(endpoint)?.absoluteString
        let item = ArlenPluginItem(
            id: "custom-\(UUID().uuidString.prefix(8).lowercased())",
            name: cleanName,
            subtitle: cleanSubtitle.isEmpty ? "Custom MCP / HTTPS plugin" : cleanSubtitle,
            description: validated != nil
                ? "Connected custom HTTPS plugin endpoint (\(validated!))."
                : "Custom plugin configured locally for Arlen workflows.",
            category: "popular",
            status: .available,
            authType: "mcp",
            capabilities: ["Custom tool calls", "Workspace context integration"],
            scopes: ["custom_scope"],
            modes: ["chat", "cowork"],
            iconKind: .custom,
            endpointURL: validated
        )
        customPlugins.insert(item, at: 0)
        connectedIDs.insert(item.id)
        persistCustom()
        UserDefaults.standard.set(Array(connectedIDs), forKey: connectedKey)
        EvoHaptics.success()
        return true
    }

    func removeCustomPlugin(_ id: String) {
        customPlugins.removeAll { $0.id == id }
        connectedIDs.remove(id)
        persistCustom()
        UserDefaults.standard.set(Array(connectedIDs), forKey: connectedKey)
        EvoHaptics.tap()
    }

    func resetDefaults() {
        connectedIDs = []
        customPlugins = []
        UserDefaults.standard.set([], forKey: connectedKey)
        UserDefaults.standard.removeObject(forKey: customKey)
        EvoHaptics.selection()
    }

    private func persistCustom() {
        if let data = try? JSONEncoder().encode(customPlugins) {
            UserDefaults.standard.set(data, forKey: customKey)
        }
    }
}

struct ModernPluginsView: View {
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void

    @StateObject private var store = PluginsStore()
    @State private var searchText = ""
    @State private var selectedFilter: ArlenPluginFilter = .popular
    @State private var selectedPlugin: ArlenPluginItem?
    @State private var popupDragOffset: CGFloat = 0
    @State private var selectedCollection: ArlenPluginCollection?
    @State private var showAddPluginSheet = false
    @State private var showGoogleSetupAlert = false
    @State private var showPluginSettings = false
    @State private var customName = ""
    @State private var customSubtitle = ""
    @State private var customEndpoint = ""
    @FocusState private var searchFocused: Bool

    private static let primaryInk = Color(red: 20.0 / 255, green: 20.0 / 255, blue: 24.0 / 255)
    private static let secondaryInk = Color(red: 138.0 / 255, green: 138.0 / 255, blue: 146.0 / 255)
    private static let subtleBorder = Color(red: 232.0 / 255, green: 232.0 / 255, blue: 238.0 / 255)

    private var visiblePlugins: [ArlenPluginItem] {
        let base: [ArlenPluginItem] = {
            switch selectedFilter {
            case .popular:
                // Primary 4 screenshot items + custom + select popular items
                let pinnedIDs = ["gmail", "google-drive", "health", "remote-desktop", "github", "notion", "google-calendar", "vercel"]
                let pinned = store.catalog.filter { pinnedIDs.contains($0.id) }
                return store.customPlugins + pinned
            case .all:
                return store.allPlugins
            case .connected:
                return store.allPlugins.filter { store.isConnected($0.id) }
            case .communication:
                return store.catalog.filter { $0.category == "communication" }
            case .productivity:
                return store.catalog.filter { $0.category == "productivity" }
            case .development:
                return store.catalog.filter { $0.category == "development" }
            case .databases:
                return store.catalog.filter { $0.category == "databases" }
            case .design:
                return store.catalog.filter { $0.category == "design" }
            case .business:
                return store.catalog.filter { $0.category == "business" }
            case .storage:
                return store.catalog.filter { $0.category == "storage" }
            }
        }()

        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return base }
        return store.allPlugins.filter {
            $0.name.localizedCaseInsensitiveContains(q) ||
            $0.subtitle.localizedCaseInsensitiveContains(q) ||
            $0.description.localizedCaseInsensitiveContains(q) ||
            $0.capabilities.contains(where: { $0.localizedCaseInsensitiveContains(q) })
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
            // Unified Top Navigation Bar (44pt Sidebar Opener + Ellipsis/Avatar Capsule)
            HStack(spacing: 16) {
                Button {
                    EvoHaptics.tap()
                    searchFocused = false
                    onOpenSidebar()
                } label: {
                    EvoIcon(systemName: "square.grid.2x2")
                        .evoSymbol(.navigation, weight: .medium)
                        .evoIconTarget()
                        .frame(width: 44, height: 44)
                        .modifier(EvoNavigationGlass(shape: Circle()))
                        .overlay(Circle().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Oldalsáv és menü")

                Spacer(minLength: 0)

                HStack(spacing: 0) {
                    Menu {
                        filterMenuButtons
                        Divider()
                        Button {
                            EvoHaptics.tap()
                            showAddPluginSheet = true
                        } label: {
                            EvoSymbolLabel("Add Custom Plugin", systemImage: "plus")
                        }
                        Button {
                            store.resetDefaults()
                            selectedFilter = .popular
                            searchText = ""
                        } label: {
                            EvoSymbolLabel("Reset Defaults", systemImage: "arrow.clockwise")
                        }
                    } label: {
                        EvoIcon(systemName: "ellipsis")
                            .evoSymbol(.navigation, weight: .medium)
                            .evoIconTarget()
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Plugin options")

                    Button {
                        EvoHaptics.tap()
                        searchFocused = false
                        onOpenProfile()
                    } label: {
                        NativeAvatarView(model: .shared, size: 30)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Open profile")
                }
                .padding(.horizontal, 3)
                .frame(height: 44)
                .modifier(EvoNavigationGlass(shape: Capsule()))
                .overlay(Capsule().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
            }
            .foregroundStyle(EvoTheme.Palette.ink)
            .padding(.horizontal, 20)
            .padding(.top, 60)
            .padding(.bottom, 12)
            .background(Color.white.ignoresSafeArea(edges: .top))

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Featured Horizontal Collection Cards
                    if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(store.collections) { collection in
                                    Button {
                                        EvoHaptics.tap()
                                        selectedCollection = collection
                                    } label: {
                                        featuredCollectionCard(collection)
                                    }
                                    .buttonStyle(EvoScalePressButtonStyle())
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 4)
                        }
                        .padding(.top, 6)
                        .padding(.bottom, 26)
                    }

                    // Section Header ("Popular >")
                    Menu {
                        filterMenuButtons
                    } label: {
                        HStack(spacing: 5) {
                            Text(selectedFilter.rawValue)
                                .font(.system(size: 16.5, weight: .semibold))
                                .foregroundStyle(Color(red: 120.0 / 255, green: 120.0 / 255, blue: 128.0 / 255))
                            EvoIcon(systemName: "chevron.right")
                                .evoSymbol(.toolbar, weight: .semibold)
                                .scaleEffect(0.65)
                                .foregroundStyle(Color(red: 120.0 / 255, green: 120.0 / 255, blue: 128.0 / 255))
                        }
                        .padding(.horizontal, 22)
                        .padding(.bottom, 18)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    // Plugins Vertical List
                    if visiblePlugins.isEmpty {
                        VStack(spacing: 10) {
                            EvoIcon(systemName: "puzzle")
                                .evoSymbol(.standard, weight: .regular)
                                .foregroundStyle(Self.secondaryInk)
                            Text("No plugins match your search.")
                                .font(.system(size: 14.5, weight: .regular))
                                .foregroundStyle(Self.secondaryInk)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 44)
                    } else {
                        VStack(alignment: .leading, spacing: 20) {
                            ForEach(visiblePlugins) { plugin in
                                pluginRow(plugin)
                            }
                        }
                        .padding(.horizontal, 22)
                    }
                }
                .padding(.bottom, 20)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Color.white.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if selectedPlugin == nil {
                bottomSearchShelf
            }
        }
        if let plugin = selectedPlugin {
            Color.black.opacity(0.18)
                .ignoresSafeArea()
                .onTapGesture {
                    dismissPluginPopup()
                }
                .transition(.opacity)
                .zIndex(10)

            pluginPopupCard(plugin)
                .offset(y: max(0, popupDragOffset))
                .gesture(
                    DragGesture(minimumDistance: 8)
                        .onChanged { value in
                            if value.translation.height > 0 {
                                popupDragOffset = value.translation.height
                            }
                        }
                        .onEnded { value in
                            if value.translation.height > 90 || value.predictedEndTranslation.height > 180 {
                                dismissPluginPopup()
                            } else {
                                withAnimation(.spring(response: 0.28, dampingFraction: 0.85)) {
                                    popupDragOffset = 0
                                }
                            }
                        }
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .zIndex(11)
        }
        }
        .ignoresSafeArea(.container, edges: .bottom)
        .alert("Google connection unavailable", isPresented: $showGoogleSetupAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Google sign-in needs an iOS OAuth client and a configured redirect before this plugin can connect.")
        }
        .sheet(item: $selectedCollection) { collection in
            collectionDetailSheet(collection)
        }
        .sheet(isPresented: $showAddPluginSheet) {
            addCustomPluginSheet
        }
        .sheet(isPresented: $showPluginSettings) {
            if let plugin = selectedPlugin {
                pluginSettingsSheet(plugin)
            }
        }
    }

    private func openPluginPopup(_ plugin: ArlenPluginItem) {
        EvoHaptics.tap()
        searchFocused = false
        popupDragOffset = 0
        withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
            selectedCollection = nil
            selectedPlugin = plugin
        }
    }

    private func dismissPluginPopup() {
        EvoHaptics.tap()
        withAnimation(.spring(response: 0.28, dampingFraction: 0.9)) {
            popupDragOffset = 0
            selectedPlugin = nil
        }
    }

    // MARK: - Featured Collection Card

    private func featuredCollectionCard(_ collection: ArlenPluginCollection) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(collection.title)
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(Self.primaryInk)
                    Text(collection.subtitle)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(Self.secondaryInk)
                }
                Spacer(minLength: 4)
                EvoIcon(systemName: "chevron.right")
                    .evoSymbol(.toolbar, weight: .semibold)
                    .scaleEffect(0.62)
                    .foregroundStyle(Color(red: 112.0 / 255, green: 112.0 / 255, blue: 120.0 / 255))
                    .padding(.top, 2)
            }

            HStack(spacing: 10) {
                ForEach(Array(collection.badges.enumerated()), id: \.offset) { idx, kind in
                    let pid = collection.pluginIDs.indices.contains(idx) ? collection.pluginIDs[idx] : nil
                    PluginMiniBrandBadge(kind: kind, pluginID: pid, size: 35)
                }
            }

            Text(collection.caption)
                .font(.system(size: 11.5, weight: .regular))
                .foregroundStyle(Self.secondaryInk)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(width: 264, alignment: .leading)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Self.subtleBorder, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.025), radius: 6, x: 0, y: 2)
    }

    // MARK: - Plugin Row

    private func pluginRow(_ plugin: ArlenPluginItem) -> some View {
        let connected = store.isConnected(plugin.id)
        return HStack(alignment: .center, spacing: 14) {
            Button {
                openPluginPopup(plugin)
            } label: {
                HStack(alignment: .center, spacing: 14) {
                    PluginBrandTileView(kind: plugin.iconKind, pluginID: plugin.id, size: 46)

                    VStack(alignment: .leading, spacing: 2.5) {
                        Text(plugin.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Self.primaryInk)
                            .lineLimit(1)
                        Text(plugin.subtitle)
                            .font(.system(size: 13.5, weight: .regular))
                            .foregroundStyle(Self.secondaryInk)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 4)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Button {
                openPluginPopup(plugin)
            } label: {
                EvoIcon(systemName: connected ? "ellipsis" : "plus")
                    .evoSymbol(.toolbar, weight: connected ? .semibold : .regular)
                    .scaleEffect(connected ? 0.92 : 1.0)
                    .foregroundStyle(Color(red: 120.0 / 255, green: 120.0 / 255, blue: 126.0 / 255))
                    .frame(width: 40, height: 40)
                    .contentShape(Circle())
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel(connected ? "\(plugin.name) options" : "Add \(plugin.name)")
        }
    }

    // MARK: - Bottom Floating Filter / Search / Add Shelf

    @ViewBuilder
    private var filterMenuButtons: some View {
        ForEach(ArlenPluginFilter.allCases) { option in
            Button {
                EvoHaptics.selection()
                withAnimation(.easeInOut(duration: 0.18)) {
                    selectedFilter = option
                }
            } label: {
                EvoSymbolLabel(
                    option.rawValue,
                    systemImage: selectedFilter == option ? "checkmark" : "line.3.horizontal.decrease"
                )
            }
        }
    }

    private var bottomSearchShelf: some View {
        HStack(spacing: 12) {
            Menu {
                filterMenuButtons
            } label: {
                EvoIcon(systemName: "line.3.horizontal.decrease")
                    .evoSymbol(.toolbar, weight: .medium)
                    .scaleEffect(0.9)
                    .foregroundStyle(selectedFilter == .popular ? Self.primaryInk : Color(red: 50.0 / 255, green: 101.0 / 255, blue: 235.0 / 255))
                    .frame(width: 52, height: 52)
                    .modifier(EvoNavigationGlass(shape: Circle()))
                    .overlay(Circle().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Filter plugins")

            EvoSearchField(text: $searchText, focus: $searchFocused)

            Button {
                EvoHaptics.tap()
                searchFocused = false
                showAddPluginSheet = true
            } label: {
                EvoIcon(systemName: "plus")
                    .evoSymbol(.toolbar, weight: .medium)
                    .foregroundStyle(Self.primaryInk)
                    .frame(width: 52, height: 52)
                    .modifier(EvoNavigationGlass(shape: Circle()))
                    .overlay(Circle().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Add custom plugin")
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 10)
    }

    // MARK: - Floating Plugin Popup Card (Matches Reference)

    private enum PluginActionIconKind {
        case search
        case funnel
        case message
        case check
        case bolt
        case doc
        case code
        case calendar
        case sparkles
    }

    private struct PluginPopupActionCard: Identifiable {
        let id: Int
        let icon: PluginActionIconKind
        let title: String
        let subtitle: String
    }

    private func popupActionCards(for plugin: ArlenPluginItem) -> [PluginPopupActionCard] {
        switch plugin.id {
        case "gmail":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Search emails", subtitle: "Find messages instantly"),
                PluginPopupActionCard(id: 1, icon: .funnel, title: "Summarize", subtitle: "Catch up on unread mail"),
                PluginPopupActionCard(id: 2, icon: .message, title: "Smart replies", subtitle: "Fast context-aware drafts"),
                PluginPopupActionCard(id: 3, icon: .check, title: "Send emails", subtitle: "With your confirmation")
            ]
        case "google-drive":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Search files", subtitle: "Find Docs, Sheets & PDFs"),
                PluginPopupActionCard(id: 1, icon: .funnel, title: "Summarize", subtitle: "Digest long documents"),
                PluginPopupActionCard(id: 2, icon: .doc, title: "Inspect data", subtitle: "Pull tables from Sheets"),
                PluginPopupActionCard(id: 3, icon: .sparkles, title: "Reference slides", subtitle: "Quote deck insights")
            ]
        case "health":
            return [
                PluginPopupActionCard(id: 0, icon: .funnel, title: "Sleep trends", subtitle: "Analyze nightly rest"),
                PluginPopupActionCard(id: 1, icon: .bolt, title: "Workouts", subtitle: "Track training progress"),
                PluginPopupActionCard(id: 2, icon: .sparkles, title: "Wellness insights", subtitle: "Private on-device charts")
            ]
        case "remote-desktop":
            return [
                PluginPopupActionCard(id: 0, icon: .code, title: "Run commands", subtitle: "Execute shell tasks safely"),
                PluginPopupActionCard(id: 1, icon: .search, title: "Browse files", subtitle: "Inspect workspace folders"),
                PluginPopupActionCard(id: 2, icon: .bolt, title: "Live sessions", subtitle: "Stream terminal output")
            ]
        case "github":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Search code", subtitle: "Find symbols & files"),
                PluginPopupActionCard(id: 1, icon: .code, title: "Review diffs", subtitle: "Inspect pull requests"),
                PluginPopupActionCard(id: 2, icon: .funnel, title: "Triage issues", subtitle: "Filter & organize tickets"),
                PluginPopupActionCard(id: 3, icon: .bolt, title: "Check CI", subtitle: "Monitor build workflows")
            ]
        case "vercel":
            return [
                PluginPopupActionCard(id: 0, icon: .bolt, title: "Deployments", subtitle: "Check live build status"),
                PluginPopupActionCard(id: 1, icon: .search, title: "Preview URLs", subtitle: "Open branch previews"),
                PluginPopupActionCard(id: 2, icon: .doc, title: "Runtime logs", subtitle: "Inspect edge diagnostics")
            ]
        case "supabase":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Query tables", subtitle: "Run safe read queries"),
                PluginPopupActionCard(id: 1, icon: .doc, title: "Inspect schema", subtitle: "Browse Postgres models"),
                PluginPopupActionCard(id: 2, icon: .bolt, title: "Edge functions", subtitle: "Monitor function logs")
            ]
        case "linear":
            return [
                PluginPopupActionCard(id: 0, icon: .check, title: "Create issues", subtitle: "Capture tasks in chat"),
                PluginPopupActionCard(id: 1, icon: .funnel, title: "Cycle updates", subtitle: "Summarize sprint status"),
                PluginPopupActionCard(id: 2, icon: .bolt, title: "Triage queue", subtitle: "Filter team priorities")
            ]
        case "google-calendar":
            return [
                PluginPopupActionCard(id: 0, icon: .calendar, title: "Daily agenda", subtitle: "See upcoming events"),
                PluginPopupActionCard(id: 1, icon: .search, title: "Find free slots", subtitle: "Check availability fast"),
                PluginPopupActionCard(id: 2, icon: .check, title: "Schedule meetings", subtitle: "Confirm before booking")
            ]
        case "notion":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Search pages", subtitle: "Find workspace notes"),
                PluginPopupActionCard(id: 1, icon: .funnel, title: "Query databases", subtitle: "Filter team records"),
                PluginPopupActionCard(id: 2, icon: .doc, title: "Append notes", subtitle: "Save summaries to docs")
            ]
        case "slack":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Search channels", subtitle: "Find messages fast"),
                PluginPopupActionCard(id: 1, icon: .funnel, title: "Catch up", subtitle: "Summarize active threads"),
                PluginPopupActionCard(id: 2, icon: .message, title: "Post updates", subtitle: "Draft with approval")
            ]
        case "figma":
            return [
                PluginPopupActionCard(id: 0, icon: .search, title: "Design files", subtitle: "Inspect components"),
                PluginPopupActionCard(id: 1, icon: .sparkles, title: "Color tokens", subtitle: "Extract style values"),
                PluginPopupActionCard(id: 2, icon: .message, title: "Comments", subtitle: "Summarize feedback")
            ]
        case "stripe":
            return [
                PluginPopupActionCard(id: 0, icon: .funnel, title: "Revenue metrics", subtitle: "Inspect MRR trends"),
                PluginPopupActionCard(id: 1, icon: .search, title: "Lookup invoices", subtitle: "Verify payment status"),
                PluginPopupActionCard(id: 2, icon: .check, title: "Subscriptions", subtitle: "Check customer plans")
            ]
        default:
            let caps = plugin.capabilities.isEmpty
                ? ["Search \(plugin.name)", "Summarize context", "Run workflow actions"]
                : plugin.capabilities
            let icons: [PluginActionIconKind] = [.search, .funnel, .bolt, .check]
            return caps.prefix(4).enumerated().map { idx, cap in
                PluginPopupActionCard(
                    id: idx,
                    icon: icons[idx % icons.count],
                    title: cap,
                    subtitle: idx == 0 ? plugin.subtitle : "Use \(plugin.name) in Arlen"
                )
            }
        }
    }

    @ViewBuilder
    private func pluginActionIconView(_ kind: PluginActionIconKind) -> some View {
        switch kind {
        case .search:
            EvoIcon(systemName: "magnifyingglass")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        case .funnel:
            PluginFunnelIconShape()
                .stroke(Self.primaryInk, style: StrokeStyle(lineWidth: 1.45, lineCap: .round, lineJoin: .round))
                .frame(width: 14, height: 14)
        case .message:
            EvoIcon(systemName: "bubble.left")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        case .check:
            EvoIcon(systemName: "checkmark")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        case .bolt:
            EvoIcon(systemName: "bolt")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        case .doc:
            EvoIcon(systemName: "doc.text")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        case .code:
            EvoIcon(systemName: "chevron.left.forwardslash.chevron.right")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.74)
        case .calendar:
            EvoIcon(systemName: "calendar")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        case .sparkles:
            EvoIcon(systemName: "sparkles")
                .evoSymbol(.toolbar, weight: .regular)
                .scaleEffect(0.76)
        }
    }

    private func pluginPopupCard(_ plugin: ArlenPluginItem) -> some View {
        let isConnected = store.isConnected(plugin.id)
        let cards = popupActionCards(for: plugin)

        return VStack(spacing: 0) {
            ZStack(alignment: .top) {
                HStack {
                    Spacer()
                    PluginBrandTileView(kind: plugin.iconKind, pluginID: plugin.id, size: 68)
                        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 3)
                    Spacer()
                }
                .padding(.top, 28)

                HStack {
                    Spacer()
                    Button {
                        dismissPluginPopup()
                    } label: {
                        EvoIcon(systemName: "xmark")
                            .evoSymbol(.toolbar, weight: .semibold)
                            .scaleEffect(0.76)
                            .foregroundStyle(Color(red: 28.0 / 255, green: 28.0 / 255, blue: 32.0 / 255))
                            .frame(width: 44, height: 44)
                            .background(Color(red: 246.0 / 255, green: 246.0 / 255, blue: 249.0 / 255), in: Circle())
                            .overlay(
                                Circle()
                                    .stroke(Color(red: 235.0 / 255, green: 235.0 / 255, blue: 240.0 / 255), lineWidth: 1)
                            )
                    }
                    .buttonStyle(EvoScalePressButtonStyle())
                    .accessibilityLabel("Close \(plugin.name)")
                    .padding(.top, 20)
                    .padding(.trailing, 20)
                }
            }

            HStack(spacing: 6) {
                Text(plugin.name)
                    .font(.system(size: 25, weight: .bold))
                    .foregroundStyle(Self.primaryInk)
                
                PluginVerifiedBadgeView()
                    .frame(width: 18, height: 18)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)

            Text(plugin.id == "gmail" || plugin.id.hasPrefix("google-") ? "@Google INC" : (plugin.subtitle.hasPrefix("@") ? plugin.subtitle : "@" + plugin.name.replacingOccurrences(of: " ", with: "") + " INC"))
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(Self.primaryInk.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.top, 4)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(cards) { card in
                        VStack(alignment: .leading, spacing: 0) {
                                HStack(alignment: .center) {
                                    pluginActionIconView(card.icon)
                                        .foregroundStyle(Self.primaryInk)
                                        .frame(width: 18, height: 18, alignment: .leading)

                                    Spacer(minLength: 0)

                                    PluginDiagonalArrowShape()
                                        .stroke(Self.secondaryInk, style: StrokeStyle(lineWidth: 1.35, lineCap: .round, lineJoin: .round))
                                        .frame(width: 9, height: 9)
                                }

                                Spacer(minLength: 8)

                                Text(card.title)
                                    .font(.system(size: 14.5, weight: .semibold))
                                    .foregroundStyle(Self.primaryInk)
                                    .lineLimit(1)

                                Text(card.subtitle)
                                    .font(.system(size: 12, weight: .regular))
                                    .foregroundStyle(Self.secondaryInk)
                                    .lineLimit(1)
                                    .padding(.top, 3)
                            }
                            .padding(14)
                            .frame(width: 154, height: 104, alignment: .leading)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(Self.subtleBorder, lineWidth: 1)
                            )
                            .shadow(color: Color.black.opacity(0.025), radius: 5, x: 0, y: 2)
                    }
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 2)
            }
            .padding(.top, 24)

            if plugin.iconKind == .custom {
                Button(role: .destructive) {
                    store.removeCustomPlugin(plugin.id)
                    dismissPluginPopup()
                } label: {
                    Text("Remove Custom Plugin")
                        .font(.system(size: 13.5, weight: .medium))
                }
                .padding(.top, 12)
            }

            HStack(spacing: 12) {
                Button {
                    EvoHaptics.tap()
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.85)) {
                        store.toggleConnection(plugin.id)
                    }
                    dismissPluginPopup()
                } label: {
                    Text(isConnected ? "Remove \(plugin.name)" : "Add \(plugin.name)")
                        .font(.system(size: 16.5, weight: .semibold))
                        .foregroundStyle(isConnected ? Self.primaryInk : Color.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(
                            isConnected ? Color(red: 242.0 / 255, green: 242.0 / 255, blue: 246.0 / 255) : Color(red: 12.0 / 255, green: 12.0 / 255, blue: 14.0 / 255),
                            in: Capsule(style: .continuous)
                        )
                }
                .buttonStyle(EvoScalePressButtonStyle())

                Button {
                    EvoHaptics.tap()
                    showPluginSettings = true
                } label: {
                    ZStack {
                        Circle()
                            .fill(Color(red: 246.0 / 255, green: 246.0 / 255, blue: 249.0 / 255))
                            .frame(width: 54, height: 54)
                            .overlay(
                                Circle()
                                    .stroke(Color(red: 235.0 / 255, green: 235.0 / 255, blue: 240.0 / 255), lineWidth: 1)
                            )
                        EvoIcon(systemName: "gear")
                            .evoSymbol(.toolbar, weight: .regular)
                            .scaleEffect(0.92)
                            .foregroundStyle(Self.primaryInk)
                    }
                }
                .buttonStyle(EvoScalePressButtonStyle())
                .accessibilityLabel("\(plugin.name) Settings")
            }
            .padding(.horizontal, 22)
            .padding(.top, 24)
            .padding(.bottom, 16)
        }
        .frame(maxWidth: .infinity)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Color.clear.frame(height: 10)
        }
        .background(
            Color.white
                .clipShape(RoundedCornerShape(radius: 38, corners: [.topLeft, .topRight]))
                .shadow(color: Color.black.opacity(0.10), radius: 24, x: 0, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private func collectionDetailSheet(_ collection: ArlenPluginCollection) -> some View {
        let items = store.allPlugins.filter { collection.pluginIDs.contains($0.id) }
        return NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(collection.subtitle)
                        .font(.system(size: 15, weight: .regular))
                        .foregroundStyle(Self.secondaryInk)

                    ForEach(items) { item in
                        pluginRow(item)
                    }
                }
                .padding(22)
            }
            .navigationTitle(collection.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { selectedCollection = nil }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationCornerRadius(28)
        .presentationDragIndicator(.visible)
    }


    private func pluginSettingsSheet(_ plugin: ArlenPluginItem) -> some View {
        NavigationStack {
            Form {
                Section("Provider Credentials") {
                    if plugin.id == "gmail" || plugin.id.hasPrefix("google-") {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Google Client ID")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Self.secondaryInk)
                            Text("673403509107-knjjge23ouvla0h7vd9nsp5kp4stu6lf.apps.googleusercontent.com")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(Self.primaryInk)
                        }
                        .padding(.vertical, 4)
                        
                        VStack(alignment: .leading, spacing: 6) {
                            Text("OAuth Status")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Self.secondaryInk)
                            HStack {
                                Circle().fill(Color.green).frame(width: 8, height: 8)
                                Text("Ready / Configured")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Color.green)
                            }
                        }
                        .padding(.vertical, 4)
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Plugin ID")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Self.secondaryInk)
                            Text(plugin.id)
                                .font(.system(size: 13, design: .monospaced))
                                .foregroundStyle(Self.primaryInk)
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                Section("Permissions & Scopes") {
                    ForEach(plugin.scopes, id: \.self) { scope in
                        Text(scope)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(Self.secondaryInk)
                    }
                }
                
                Section("Arlen Integration") {
                    Toggle("Enable Tool Calling", isOn: .constant(true))
                    Toggle("Context Sharing", isOn: .constant(true))
                }
            }
            .navigationTitle("\(plugin.name) Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        showPluginSettings = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationCornerRadius(28)
        .presentationDragIndicator(.visible)
    }

    private var addCustomPluginSheet: some View {
        NavigationStack {
            Form {
                Section("Plugin Details") {
                    TextField("Name (e.g. Notion, Figma)", text: $customName)
                        .textInputAutocapitalization(.words)
                    TextField("Subtitle (e.g. Docs & Workspace)", text: $customSubtitle)
                }
                Section("Endpoint (Optional)") {
                    TextField("https://example.com/mcp", text: $customEndpoint)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
            }
            .navigationTitle("Add Plugin")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showAddPluginSheet = false
                        customName = ""
                        customSubtitle = ""
                        customEndpoint = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        if store.addCustomPlugin(name: customName, subtitle: customSubtitle, endpoint: customEndpoint) {
                            showAddPluginSheet = false
                            customName = ""
                            customSubtitle = ""
                            customEndpoint = ""
                        }
                    }
                    .disabled(customName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
        .presentationCornerRadius(28)
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Authentic Native Brand Artwork for Plugin Cards & Rows

final class ArlenPluginIconLoader: @unchecked Sendable {
    static let shared = ArlenPluginIconLoader()
    private let memCache = NSCache<NSString, UIImage>()
    private let lock = NSLock()

    static func image(for pluginID: String) -> UIImage? {
        shared.image(for: pluginID)
    }

    func image(for pluginID: String) -> UIImage? {
        lock.lock()
        if let cached = memCache.object(forKey: pluginID as NSString) {
            lock.unlock()
            return cached
        }
        lock.unlock()

        // Direct flattened SwiftPM bundle lookup first, then subdirectory fallback
        let url = Bundle.module.url(forResource: pluginID, withExtension: "png")
            ?? Bundle.module.url(forResource: pluginID, withExtension: "png", subdirectory: "PluginIcons")
        guard let url, let data = try? Data(contentsOf: url), let img = UIImage(data: data) else {
            return nil
        }

        lock.lock()
        memCache.setObject(img, forKey: pluginID as NSString)
        lock.unlock()
        return img
    }

    func loadImage(for pluginID: String) async -> UIImage? {
        if let cached = image(for: pluginID) { return cached }
        return await Task.detached(priority: .userInitiated) { [self] in
            return self.image(for: pluginID)
        }.value
    }

    func prewarmIcons(pluginIDs: [String]) {
        Task.detached(priority: .background) { [self] in
            for pid in pluginIDs {
                _ = self.image(for: pid)
            }
        }
    }
}

private struct PluginMiniBrandBadge: View {
    let kind: ArlenPluginIconKind
    var pluginID: String? = nil
    var size: CGFloat = 35

    var body: some View {
        if let pid = pluginID, let uiImage = ArlenPluginIconLoader.shared.image(for: pid) {
            Image(uiImage: uiImage)
                .resizable()
                .interpolation(.high)
                .aspectRatio(contentMode: .fit)
                .frame(width: size * 0.78, height: size * 0.78)
                .frame(width: size, height: size)
        } else {
            switch kind {
        case .github:
            ZStack {
                Circle().fill(Color.black)
                PluginOctocatShape().fill(Color.white).padding(size * 0.14)
            }
            .frame(width: size, height: size)

        case .vercel:
            ZStack {
                RoundedRectangle(cornerRadius: size * 0.24, style: .continuous).fill(Color.black)
                Circle().fill(Color.white).padding(size * 0.16)
                PluginTriangleShape().fill(Color.black).padding(size * 0.34)
            }
            .frame(width: size, height: size)

        case .supabase:
            ZStack {
                PluginBoltShape()
                    .fill(Color(red: 62.0 / 255, green: 207.0 / 255, blue: 142.0 / 255))
                    .padding(size * 0.08)
            }
            .frame(width: size, height: size)

        case .linear:
            ZStack {
                Circle().fill(Color(red: 24.0 / 255, green: 25.0 / 255, blue: 30.0 / 255))
                LinearBadgeCutoutShape().fill(Color.white).padding(size * 0.14)
            }
            .frame(width: size, height: size)
            .clipShape(Circle())

        default:
            PluginBrandTileView(kind: kind, pluginID: pluginID, size: size)
        }
        }
    }
}

private struct PluginBrandTileView: View {
    let kind: ArlenPluginIconKind
    var pluginID: String? = nil
    var size: CGFloat = 46

    var body: some View {
        if let pid = pluginID, let uiImage = ArlenPluginIconLoader.shared.image(for: pid) {
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                Image(uiImage: uiImage)
                    .resizable()
                    .interpolation(.high)
                    .aspectRatio(contentMode: .fit)
                    .frame(width: size * 0.62, height: size * 0.62)
            }
        } else {
        switch kind {
        case .zendesk:
            framedTile(fill: Color(red: 3.0 / 255, green: 54.0 / 255, blue: 61.0 / 255), border: .clear) {
                Text("Z")
                    .font(.system(size: size * 0.52, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }
        case .hubspot:
            framedTile(fill: Color(red: 255.0 / 255, green: 122.0 / 255, blue: 89.0 / 255), border: .clear) {
                EvoIcon(systemName: "circle.hexagonpath.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(.white)
                    .scaleEffect(0.85)
            }
        case .remoteDesktop:
            RemoteDesktopChipGlyphView(size: size)
        case .gmail:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                GmailGlyphView().frame(width: size * 0.58, height: size * 0.46)
            }
        case .googleDrive:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                GoogleDriveGlyphView().frame(width: size * 0.56, height: size * 0.52)
            }
        case .health:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                AppleHealthFlowerGlyphView().frame(width: size * 0.62, height: size * 0.62)
            }
        case .github, .vercel, .supabase, .linear:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                PluginMiniBrandBadge(kind: kind, pluginID: pluginID, size: size * 0.64)
            }
        case .slack:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                SlackBrandGlyphView().frame(width: size * 0.58, height: size * 0.58)
            }
        case .notion:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                NotionBrandGlyphView().frame(width: size * 0.56, height: size * 0.56)
            }
        case .googleCalendar:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                GoogleCalendarGlyphView().frame(width: size * 0.58, height: size * 0.58)
            }
        case .figma:
            framedTile(fill: Color.white, border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                FigmaBrandGlyphView().frame(width: size * 0.44, height: size * 0.62)
            }
        case .stripe:
            framedTile(fill: Color(red: 99.0 / 255, green: 91.0 / 255, blue: 255.0 / 255), border: .clear) {
                Text("S")
                    .font(.system(size: size * 0.52, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color.white)
            }
        case .discord:
            framedTile(fill: Color(red: 88.0 / 255, green: 101.0 / 255, blue: 242.0 / 255), border: .clear) {
                EvoIcon(systemName: "bubble.left.and.bubble.right.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .telegram:
            framedTile(fill: Color(red: 42.0 / 255, green: 171.0 / 255, blue: 238.0 / 255), border: .clear) {
                EvoIcon(systemName: "paperplane.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .docker:
            framedTile(fill: Color(red: 19.0 / 255, green: 147.0 / 255, blue: 230.0 / 255), border: .clear) {
                EvoIcon(systemName: "shippingbox.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .kubernetes:
            framedTile(fill: Color(red: 50.0 / 255, green: 108.0 / 255, blue: 229.0 / 255), border: .clear) {
                EvoIcon(systemName: "helm")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .cloud, .cloudflare:
            framedTile(fill: Color(red: 246.0 / 255, green: 130.0 / 255, blue: 31.0 / 255).opacity(0.12), border: Color(red: 246.0 / 255, green: 130.0 / 255, blue: 31.0 / 255).opacity(0.3)) {
                EvoIcon(systemName: "cloud.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color(red: 246.0 / 255, green: 130.0 / 255, blue: 31.0 / 255))
                    .scaleEffect(0.85)
            }
        case .database:
            framedTile(fill: Color(red: 0.0 / 255, green: 104.0 / 255, blue: 74.0 / 255).opacity(0.1), border: Color(red: 0.0 / 255, green: 104.0 / 255, blue: 74.0 / 255).opacity(0.25)) {
                EvoIcon(systemName: "cylinder.split.1x2.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color(red: 0.0 / 255, green: 104.0 / 255, blue: 74.0 / 255))
                    .scaleEffect(0.85)
            }
        case .terminal:
            framedTile(fill: Color(red: 24.0 / 255, green: 24.0 / 255, blue: 27.0 / 255), border: .clear) {
                EvoIcon(systemName: "terminal.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color(red: 130.0 / 255, green: 220.0 / 255, blue: 130.0 / 255))
                    .scaleEffect(0.8)
            }
        case .dropbox:
            framedTile(fill: Color(red: 0.0 / 255, green: 97.0 / 255, blue: 254.0 / 255), border: .clear) {
                EvoIcon(systemName: "cube.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .onedrive:
            framedTile(fill: Color(red: 0.0 / 255, green: 120.0 / 255, blue: 212.0 / 255), border: .clear) {
                EvoIcon(systemName: "cloud.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .box:
            framedTile(fill: Color(red: 0.0 / 255, green: 97.0 / 255, blue: 216.0 / 255), border: .clear) {
                EvoIcon(systemName: "shippingbox.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .zapier:
            framedTile(fill: Color(red: 255.0 / 255, green: 74.0 / 255, blue: 0.0 / 255), border: .clear) {
                EvoIcon(systemName: "bolt.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .n8n, .make:
            framedTile(fill: Color(red: 234.0 / 255, green: 40.0 / 255, blue: 90.0 / 255), border: .clear) {
                EvoIcon(systemName: "point.3.connected.trianglepath.dotted")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .spotify:
            framedTile(fill: Color(red: 30.0 / 255, green: 215.0 / 255, blue: 96.0 / 255), border: .clear) {
                EvoIcon(systemName: "wave.3.forward")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.black)
                    .scaleEffect(0.85)
            }
        case .youtube:
            framedTile(fill: Color(red: 255.0 / 255, green: 0.0 / 255, blue: 0.0 / 255), border: .clear) {
                EvoIcon(systemName: "play.rectangle.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .googleDocs:
            framedTile(fill: Color(red: 66.0 / 255, green: 133.0 / 255, blue: 244.0 / 255), border: .clear) {
                EvoIcon(systemName: "doc.text.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .googleSheets:
            framedTile(fill: Color(red: 15.0 / 255, green: 157.0 / 255, blue: 88.0 / 255), border: .clear) {
                EvoIcon(systemName: "tablecells.fill")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .googleSlides:
            framedTile(fill: Color(red: 244.0 / 255, green: 180.0 / 255, blue: 0.0 / 255), border: .clear) {
                EvoIcon(systemName: "rectangle.inset.filled.and.person.filled")
                    .evoSymbol(.standard)
                    .foregroundStyle(Color.white)
                    .scaleEffect(0.85)
            }
        case .custom:
            framedTile(fill: Color(red: 244.0 / 255, green: 244.0 / 255, blue: 248.0 / 255), border: Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255)) {
                EvoIcon(systemName: "puzzle")
                    .evoSymbol(.standard, weight: .medium)
                    .foregroundStyle(Color(red: 28.0 / 255, green: 28.0 / 255, blue: 32.0 / 255))
            }
        default:
            framedTile(fill: Color(red: 246.0 / 255, green: 246.0 / 255, blue: 250.0 / 255), border: Color(red: 234.0 / 255, green: 234.0 / 255, blue: 240.0 / 255)) {
                EvoIcon(systemName: "puzzle")
                    .evoSymbol(.standard, weight: .medium)
                    .foregroundStyle(Color(red: 80.0 / 255, green: 80.0 / 255, blue: 90.0 / 255))
                    .scaleEffect(0.85)
            }
        }
        }
    }

    private func framedTile<Content: View>(fill: Color, border: Color, @ViewBuilder content: () -> Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.26, style: .continuous)
        return ZStack {
            shape
                .fill(fill)
                .overlay(shape.stroke(border, lineWidth: 1))
            content()
        }
        .frame(width: size, height: size)
    }
}

private struct SlackBrandGlyphView: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            // 4 official Slack color dots
            let colors: [Color] = [
                Color(red: 224.0 / 255, green: 30.0 / 255, blue: 90.0 / 255),  // red
                Color(red: 54.0 / 255, green: 197.0 / 255, blue: 240.0 / 255), // blue
                Color(red: 46.0 / 255, green: 182.0 / 255, blue: 125.0 / 255), // green
                Color(red: 236.0 / 255, green: 178.0 / 255, blue: 46.0 / 255)  // yellow
            ]
            let r = w * 0.18
            ctx.fill(Path(ellipseIn: CGRect(x: w * 0.15, y: h * 0.15, width: r, height: r)), with: .color(colors[0]))
            ctx.fill(Path(ellipseIn: CGRect(x: w * 0.65, y: h * 0.15, width: r, height: r)), with: .color(colors[1]))
            ctx.fill(Path(ellipseIn: CGRect(x: w * 0.65, y: h * 0.65, width: r, height: r)), with: .color(colors[2]))
            ctx.fill(Path(ellipseIn: CGRect(x: w * 0.15, y: h * 0.65, width: r, height: r)), with: .color(colors[3]))
        }
    }
}

private struct NotionBrandGlyphView: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .stroke(Color.black, lineWidth: 2.2)
                .padding(2)
            Text("N")
                .font(.system(size: 20, weight: .black, design: .serif))
                .foregroundStyle(Color.black)
        }
    }
}

private struct FigmaBrandGlyphView: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let r = w * 0.5
            // 5 signature figma rounded regions
            ctx.fill(Path(ellipseIn: CGRect(x: 0, y: 0, width: r, height: r)), with: .color(Color(red: 242.0 / 255, green: 78.0 / 255, blue: 30.0 / 255)))
            ctx.fill(Path(ellipseIn: CGRect(x: r, y: 0, width: r, height: r)), with: .color(Color(red: 255.0 / 255, green: 114.0 / 255, blue: 98.0 / 255)))
            ctx.fill(Path(ellipseIn: CGRect(x: 0, y: r, width: r, height: r)), with: .color(Color(red: 162.0 / 255, green: 89.0 / 255, blue: 255.0 / 255)))
            ctx.fill(Path(ellipseIn: CGRect(x: r, y: r, width: r, height: r)), with: .color(Color(red: 10.0 / 255, green: 207.0 / 255, blue: 131.0 / 255)))
            ctx.fill(Path(ellipseIn: CGRect(x: 0, y: r * 2, width: r, height: r)), with: .color(Color(red: 26.0 / 255, green: 188.0 / 255, blue: 254.0 / 255)))
        }
    }
}

private struct GoogleCalendarGlyphView: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(Color(red: 66.0 / 255, green: 133.0 / 255, blue: 244.0 / 255), lineWidth: 2)
            VStack(spacing: 0) {
                Rectangle()
                    .fill(Color(red: 66.0 / 255, green: 133.0 / 255, blue: 244.0 / 255))
                    .frame(height: 7)
                Spacer()
                Text("31")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 66.0 / 255, green: 133.0 / 255, blue: 244.0 / 255))
                Spacer()
            }
        }
    }
}

private struct GmailGlyphView: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            let strokeW = w * 0.21

            // Blue left stem
            var bluePath = Path()
            bluePath.move(to: CGPoint(x: strokeW * 0.5, y: h))
            bluePath.addLine(to: CGPoint(x: strokeW * 0.5, y: h * 0.28))
            bluePath.addLine(to: CGPoint(x: strokeW * 0.95, y: h * 0.48))
            bluePath.addLine(to: CGPoint(x: strokeW * 0.95, y: h))
            bluePath.closeSubpath()
            ctx.fill(bluePath, with: .color(Color(red: 66.0 / 255, green: 133.0 / 255, blue: 244.0 / 255)))

            // Red right stem & right roof
            var redPath = Path()
            redPath.move(to: CGPoint(x: w - strokeW * 0.5, y: h))
            redPath.addLine(to: CGPoint(x: w - strokeW * 0.5, y: h * 0.28))
            redPath.addLine(to: CGPoint(x: w - strokeW * 0.95, y: h * 0.48))
            redPath.addLine(to: CGPoint(x: w - strokeW * 0.95, y: h))
            redPath.closeSubpath()
            ctx.fill(redPath, with: .color(Color(red: 234.0 / 255, green: 67.0 / 255, blue: 53.0 / 255)))

            // Red top chevron fold
            var redRoof = Path()
            redRoof.move(to: CGPoint(x: w * 0.12, y: h * 0.28))
            redRoof.addLine(to: CGPoint(x: w * 0.5, y: h * 0.62))
            redRoof.addLine(to: CGPoint(x: w * 0.88, y: h * 0.28))
            redRoof.addLine(to: CGPoint(x: w * 0.5, y: 0))
            redRoof.closeSubpath()
            ctx.fill(redRoof, with: .color(Color(red: 234.0 / 255, green: 67.0 / 255, blue: 53.0 / 255)))

            // Yellow right accent
            var yellow = Path()
            yellow.move(to: CGPoint(x: w * 0.5, y: h * 0.62))
            yellow.addLine(to: CGPoint(x: w * 0.88, y: h * 0.28))
            yellow.addLine(to: CGPoint(x: w * 0.78, y: h * 0.2))
            yellow.addLine(to: CGPoint(x: w * 0.5, y: h * 0.46))
            yellow.closeSubpath()
            ctx.fill(yellow, with: .color(Color(red: 251.0 / 255, green: 188.0 / 255, blue: 5.0 / 255)))

            // Green left accent
            var green = Path()
            green.move(to: CGPoint(x: strokeW * 0.5, y: h * 0.28))
            green.addLine(to: CGPoint(x: w * 0.5, y: 0))
            green.addLine(to: CGPoint(x: strokeW * 0.5, y: h * 0.45))
            green.closeSubpath()
            ctx.fill(green, with: .color(Color(red: 52.0 / 255, green: 168.0 / 255, blue: 83.0 / 255)))
        }
    }
}

private struct GoogleDriveGlyphView: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height

            // Yellow top-right bar
            var yellow = Path()
            yellow.move(to: CGPoint(x: w * 0.34, y: 0))
            yellow.addLine(to: CGPoint(x: w * 0.66, y: 0))
            yellow.addLine(to: CGPoint(x: w, y: h * 0.58))
            yellow.addLine(to: CGPoint(x: w * 0.68, y: h * 0.58))
            yellow.closeSubpath()
            ctx.fill(yellow, with: .color(Color(red: 255.0 / 255, green: 186.0 / 255, blue: 0.0 / 255)))

            // Blue left diagonal bar
            var blue = Path()
            blue.move(to: CGPoint(x: w * 0.34, y: 0))
            blue.addLine(to: CGPoint(x: 0, y: h * 0.58))
            blue.addLine(to: CGPoint(x: w * 0.16, y: h * 0.86))
            blue.addLine(to: CGPoint(x: w * 0.50, y: h * 0.28))
            blue.closeSubpath()
            ctx.fill(blue, with: .color(Color(red: 0.0 / 255, green: 102.0 / 255, blue: 245.0 / 255)))

            // Green bottom horizontal bar
            var green = Path()
            green.move(to: CGPoint(x: w * 0.16, y: h * 0.86))
            green.addLine(to: CGPoint(x: w * 0.84, y: h * 0.86))
            green.addLine(to: CGPoint(x: w, y: h * 0.58))
            green.addLine(to: CGPoint(x: w * 0.32, y: h * 0.58))
            green.closeSubpath()
            ctx.fill(green, with: .color(Color(red: 0.0 / 255, green: 172.0 / 255, blue: 71.0 / 255)))
        }
    }
}

private struct AppleHealthFlowerGlyphView: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            let center = CGPoint(x: w * 0.5, y: h * 0.5)
            let petalRadius = min(w, h) * 0.24

            let colors: [Color] = [
                Color(red: 255.0 / 255, green: 45.0 / 255, blue: 85.0 / 255),
                Color(red: 255.0 / 255, green: 59.0 / 255, blue: 48.0 / 255),
                Color(red: 255.0 / 255, green: 149.0 / 255, blue: 0.0 / 255),
                Color(red: 255.0 / 255, green: 45.0 / 255, blue: 85.0 / 255),
                Color(red: 255.0 / 255, green: 90.0 / 255, blue: 95.0 / 255),
                Color(red: 255.0 / 255, green: 45.0 / 255, blue: 85.0 / 255)
            ]

            for i in 0..<6 {
                let angle = Double(i) * Double.pi / 3.0
                let offset = min(w, h) * 0.22
                let cx = center.x + CGFloat(cos(angle)) * offset
                let cy = center.y + CGFloat(sin(angle)) * offset

                let circleRect = CGRect(x: cx - petalRadius, y: cy - petalRadius, width: petalRadius * 2, height: petalRadius * 2)
                ctx.fill(Path(ellipseIn: circleRect), with: .color(colors[i % colors.count].opacity(0.85)))
            }

            // White central heart cutout
            let innerHeart = Path { p in
                let hw = w * 0.28
                let hh = h * 0.28
                let hx = center.x - hw * 0.5
                let hy = center.y - hh * 0.5
                p.move(to: CGPoint(x: center.x, y: hy + hh * 0.8))
                p.addCurve(
                    to: CGPoint(x: hx, y: hy + hh * 0.35),
                    control1: CGPoint(x: hx + hw * 0.15, y: hy + hh * 0.6),
                    control2: CGPoint(x: hx, y: hy + hh * 0.45)
                )
                p.addArc(
                    center: CGPoint(x: hx + hw * 0.25, y: hy + hh * 0.25),
                    radius: hw * 0.25,
                    startAngle: .radians(.pi),
                    endAngle: .radians(0),
                    clockwise: false
                )
                p.addArc(
                    center: CGPoint(x: hx + hw * 0.75, y: hy + hh * 0.25),
                    radius: hw * 0.25,
                    startAngle: .radians(.pi),
                    endAngle: .radians(0),
                    clockwise: false
                )
                p.addCurve(
                    to: CGPoint(x: center.x, y: hy + hh * 0.8),
                    control1: CGPoint(x: hx + hw, y: hy + hh * 0.45),
                    control2: CGPoint(x: hx + hw * 0.85, y: hy + hh * 0.6)
                )
                p.closeSubpath()
            }
            ctx.fill(innerHeart, with: .color(.white))
        }
    }
}

private struct RemoteDesktopChipGlyphView: View {
    var size: CGFloat = 46

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
        ZStack {
            shape
                .fill(Color(red: 22.0 / 255, green: 22.0 / 255, blue: 26.0 / 255))
                .overlay(shape.stroke(Color(red: 45.0 / 255, green: 45.0 / 255, blue: 50.0 / 255), lineWidth: 1))

            // Exterior connector pins (top and bottom)
            VStack(spacing: size * 0.78) {
                pinRow(count: 6, width: size * 0.76)
                pinRow(count: 6, width: size * 0.76)
            }

            // DC typography emblem
            HStack(spacing: -1) {
                Text("D")
                    .font(.system(size: size * 0.40, weight: .black, design: .monospaced))
                    .foregroundStyle(Color.white)
                Text("C")
                    .font(.system(size: size * 0.38, weight: .black, design: .monospaced))
                    .foregroundStyle(Color.white.opacity(0.85))
            }
        }
        .frame(width: size, height: size)
    }

    private func pinRow(count: Int, width: CGFloat) -> some View {
        HStack(spacing: 3) {
            ForEach(0..<count, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 0.6)
                    .fill(Color(red: 170.0 / 255, green: 170.0 / 255, blue: 180.0 / 255))
                    .frame(width: 2.2, height: 3.2)
            }
        }
        .frame(width: width)
    }
}

private struct PluginTriangleShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

private struct PluginBoltShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var p = Path()
        p.move(to: CGPoint(x: w * 0.56, y: h * 0.04))
        p.addLine(to: CGPoint(x: w * 0.12, y: h * 0.56))
        p.addLine(to: CGPoint(x: w * 0.48, y: h * 0.56))
        p.addLine(to: CGPoint(x: w * 0.42, y: h * 0.96))
        p.addLine(to: CGPoint(x: w * 0.88, y: h * 0.44))
        p.addLine(to: CGPoint(x: w * 0.52, y: h * 0.44))
        p.closeSubpath()
        return p
    }
}

private struct PluginOctocatShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var p = Path()
        p.move(to: CGPoint(x: w * 0.34, y: h * 0.92))
        p.addLine(to: CGPoint(x: w * 0.34, y: h * 0.72))
        p.addCurve(
            to: CGPoint(x: w * 0.14, y: h * 0.48),
            control1: CGPoint(x: w * 0.18, y: h * 0.70),
            control2: CGPoint(x: w * 0.14, y: h * 0.58)
        )
        p.addLine(to: CGPoint(x: w * 0.18, y: h * 0.18))
        p.addLine(to: CGPoint(x: w * 0.36, y: h * 0.28))
        p.addQuadCurve(to: CGPoint(x: w * 0.64, y: h * 0.28), control: CGPoint(x: w * 0.50, y: h * 0.24))
        p.addLine(to: CGPoint(x: w * 0.82, y: h * 0.18))
        p.addLine(to: CGPoint(x: w * 0.86, y: h * 0.48))
        p.addCurve(
            to: CGPoint(x: w * 0.66, y: h * 0.72),
            control1: CGPoint(x: w * 0.86, y: h * 0.58),
            control2: CGPoint(x: w * 0.82, y: h * 0.70)
        )
        p.addLine(to: CGPoint(x: w * 0.66, y: h * 0.92))
        p.closeSubpath()
        return p
    }
}

private struct LinearBadgeCutoutShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var p = Path()
        p.move(to: CGPoint(x: w * 0.08, y: h * 0.48))
        p.addLine(to: CGPoint(x: w * 0.52, y: h * 0.92))
        p.addLine(to: CGPoint(x: w * 0.40, y: h * 0.96))
        p.addLine(to: CGPoint(x: w * 0.04, y: h * 0.60))
        p.closeSubpath()

        p.move(to: CGPoint(x: w * 0.14, y: h * 0.30))
        p.addLine(to: CGPoint(x: w * 0.70, y: h * 0.86))
        p.addLine(to: CGPoint(x: w * 0.60, y: h * 0.90))
        p.addLine(to: CGPoint(x: w * 0.10, y: h * 0.40))
        p.closeSubpath()

        p.move(to: CGPoint(x: w * 0.26, y: h * 0.16))
        p.addLine(to: CGPoint(x: w * 0.84, y: h * 0.74))
        p.addLine(to: CGPoint(x: w * 0.76, y: h * 0.80))
        p.addLine(to: CGPoint(x: w * 0.20, y: h * 0.24))
        p.closeSubpath()
        return p
    }
}

private struct PluginFunnelIconShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var p = Path()
        // Tabler filter/funnel outline scaled to rect
        p.move(to: CGPoint(x: w * 0.12, y: h * 0.16))
        p.addLine(to: CGPoint(x: w * 0.88, y: h * 0.16))
        p.addLine(to: CGPoint(x: w * 0.88, y: h * 0.24))
        p.addLine(to: CGPoint(x: w * 0.58, y: h * 0.54))
        p.addLine(to: CGPoint(x: w * 0.58, y: h * 0.84))
        p.addLine(to: CGPoint(x: w * 0.42, y: h * 0.92))
        p.addLine(to: CGPoint(x: w * 0.42, y: h * 0.54))
        p.addLine(to: CGPoint(x: w * 0.12, y: h * 0.24))
        p.closeSubpath()
        return p
    }
}

private struct PluginDiagonalArrowShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var p = Path()
        p.move(to: CGPoint(x: w * 0.16, y: h * 0.84))
        p.addLine(to: CGPoint(x: w * 0.84, y: h * 0.16))
        p.move(to: CGPoint(x: w * 0.34, y: h * 0.16))
        p.addLine(to: CGPoint(x: w * 0.84, y: h * 0.16))
        p.addLine(to: CGPoint(x: w * 0.84, y: h * 0.66))
        return p
    }
}

// MARK: - Verified Badge View (Apple-style Blue Starburst Badge with Checkmark)

private struct PluginVerifiedBadgeView: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width
            let h = size.height
            let cx = w * 0.5
            let cy = h * 0.5
            let rOuter = min(w, h) * 0.48
            let rInner = min(w, h) * 0.38
            let points = 8
            
            // 8-point smooth scalloped starburst
            var starPath = Path()
            for i in 0..<(points * 2) {
                let angle = (Double(i) * Double.pi / Double(points)) - (Double.pi * 0.5)
                let r = (i % 2 == 0) ? rOuter : rInner
                let x = cx + CGFloat(cos(angle)) * r
                let y = cy + CGFloat(sin(angle)) * r
                if i == 0 {
                    starPath.move(to: CGPoint(x: x, y: y))
                } else {
                    starPath.addLine(to: CGPoint(x: x, y: y))
                }
            }
            starPath.closeSubpath()
            
            // Twitter / iOS verified badge vibrant blue
            ctx.fill(starPath, with: .color(Color(red: 29.0 / 255, green: 155.0 / 255, blue: 240.0 / 255)))
            
            // White checkmark inside
            var checkPath = Path()
            checkPath.move(to: CGPoint(x: w * 0.30, y: h * 0.50))
            checkPath.addLine(to: CGPoint(x: w * 0.44, y: h * 0.65))
            checkPath.addLine(to: CGPoint(x: w * 0.72, y: h * 0.35))
            ctx.stroke(checkPath, with: .color(.white), style: StrokeStyle(lineWidth: w * 0.12, lineCap: .round, lineJoin: .round))
        }
    }
}
