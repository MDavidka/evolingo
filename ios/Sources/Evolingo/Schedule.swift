import SwiftUI
import UserNotifications

enum TaskState: String, Codable, CaseIterable, Identifiable, Sendable {
    case active, paused, completed
    var id: String { rawValue }
    var title: String {
        switch self {
        case .active: "Aktív"
        case .paused: "Szüneteltetve"
        case .completed: "Befejezett"
        }
    }
}

enum TaskKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case reminder, long
    var id: String { rawValue }
    var title: String { self == .reminder ? "Emlékeztető" : "Hosszú feladat" }
}

enum TaskRepeat: String, Codable, CaseIterable, Identifiable, Sendable {
    case once, daily, weekly
    var id: String { rawValue }
    var title: String {
        switch self {
        case .once: "Egyszer"
        case .daily: "Naponta"
        case .weekly: "Hetente"
        }
    }
}

struct NativeTask: Codable, Identifiable, Sendable {
    var id: UUID
    var title: String
    var note: String
    var kind: TaskKind
    var repeatRule: TaskRepeat
    var state: TaskState
    var step: Int
    var totalSteps: Int
    var dueAt: Date?
    var createdAt: Date
}

actor NativeScheduleStore {
    static let shared = NativeScheduleStore()
    private let defaultsKey = "native.evolingo.schedule.v1"

    func load() throws -> [NativeTask]? {
        let url = try stateURL()
        if FileManager.default.fileExists(atPath: url.path) {
            return try JSONDecoder().decode([NativeTask].self, from: Data(contentsOf: url, options: .mappedIfSafe))
        }
        guard let legacyData = UserDefaults.standard.data(forKey: defaultsKey),
              let legacyTasks = try? JSONDecoder().decode([NativeTask].self, from: legacyData) else { return nil }
        try write(legacyTasks, to: url)
        UserDefaults.standard.removeObject(forKey: defaultsKey)
        return legacyTasks
    }

    func save(_ tasks: [NativeTask]) throws {
        try write(tasks, to: stateURL())
        UserDefaults.standard.removeObject(forKey: defaultsKey)
    }

    private func write(_ tasks: [NativeTask], to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(tasks)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    private func stateURL() throws -> URL {
        let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                               appropriateFor: nil, create: true)
        return root.appendingPathComponent("Evolingo", isDirectory: true)
            .appendingPathComponent("schedule.json", isDirectory: false)
    }
}

@MainActor final class ScheduleModel: ObservableObject {
    @Published private(set) var tasks: [NativeTask] = []
    @Published var notice: String?
    @Published private(set) var isRestoring = true
    @Published private(set) var storageUnavailable = false
    private let notifications = UNUserNotificationCenter.current()

    func reloadFromDisk(force: Bool = false) async {
        guard isRestoring || force else { return }
        do {
            if let decoded = try await NativeScheduleStore.shared.load() {
                tasks = decoded.sorted { $0.createdAt > $1.createdAt }
            }
            storageUnavailable = false
        } catch {
            storageUnavailable = true
            notice = "A helyi feladatokat nem sikerült beolvasni."
            EvoHaptics.failure()
        }
        isRestoring = false
    }

    @discardableResult private func persist() async -> Bool {
        guard !storageUnavailable else { return false }
        do {
            try await NativeScheduleStore.shared.save(tasks)
            return true
        } catch {
            notice = "A feladatokat nem sikerült elmenteni."
            EvoHaptics.failure()
            return false
        }
    }

    func create(title: String, note: String, kind: TaskKind, repeatRule: TaskRepeat,
                dueAt: Date, totalSteps: Int) async -> Bool {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty, !isRestoring, !storageUnavailable else { return false }
        let task = NativeTask(id: UUID(), title: cleanTitle, note: note.trimmingCharacters(in: .whitespacesAndNewlines),
                              kind: kind, repeatRule: kind == .long ? .once : repeatRule, state: .active,
                              step: 0, totalSteps: kind == .long ? min(20, max(2, totalSteps)) : 1,
                              dueAt: kind == .reminder ? dueAt : nil, createdAt: .now)
        tasks.insert(task, at: 0)
        guard await persist() else {
            tasks.removeAll { $0.id == task.id }
            return false
        }
        notice = nil

        guard task.kind == .reminder, let date = task.dueAt else {
            EvoHaptics.success()
            return true
        }
        guard task.repeatRule != .once || date > .now else {
            notice = "Feladat elmentve. Az időpont már elmúlt, ezért értesítést nem lehet beállítani."
            EvoHaptics.warning()
            return true
        }
        do {
            let permitted = try await notifications.requestAuthorization(options: [.alert, .sound])
            guard permitted else {
                notice = "Feladat elmentve. Az értesítésekhez adj engedélyt az iPhone Beállításokban."
                EvoHaptics.warning()
                return true
            }
            try await scheduleNotification(for: task, at: date)
            notice = "Emlékeztető elmentve ezen az iPhone-on."
            EvoHaptics.success()
            return true
        } catch {
            notice = "A feladat elmentve, de az értesítést nem sikerült beállítani."
            EvoHaptics.warning()
            return true
        }
    }

    private func scheduleNotification(for task: NativeTask, at date: Date) async throws {
        var components: DateComponents
        var repeats = false
        switch task.repeatRule {
        case .once:
            guard date > .now else { throw NotificationScheduleError.datePassed }
            components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        case .daily:
            components = Calendar.current.dateComponents([.hour, .minute], from: date)
            repeats = true
        case .weekly:
            components = Calendar.current.dateComponents([.weekday, .hour, .minute], from: date)
            repeats = true
        }
        let content = UNMutableNotificationContent()
        content.title = task.title
        content.body = task.note.isEmpty ? "Emlékeztető az Evölingótól." : task.note
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: repeats)
        try await notifications.add(UNNotificationRequest(identifier: "evolingo.task.\(task.id.uuidString)", content: content, trigger: trigger))
    }

    func complete(_ task: NativeTask) async {
        guard !isRestoring, !storageUnavailable else { return }
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        var updated = task
        if task.kind == .long {
            updated.step = min(task.totalSteps, task.step + 1)
            if updated.step == task.totalSteps { updated.state = .completed }
        } else if task.repeatRule == .once {
            updated.state = .completed
        } else if let date = task.dueAt {
            let component: Calendar.Component = task.repeatRule == .daily ? .day : .weekOfYear
            updated.dueAt = Calendar.current.date(byAdding: component, value: 1, to: date)
        }
        tasks[index] = updated
        guard await persist() else {
            tasks[index] = task
            return
        }
        EvoHaptics.success()
    }

    func setState(_ task: NativeTask, _ state: TaskState) async {
        guard !isRestoring, !storageUnavailable else { return }
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let previous = tasks[index]
        var updated = previous
        updated.state = state
        if state == .completed { updated.step = updated.totalSteps }
        if state == .active && updated.step >= updated.totalSteps { updated.step = 0 }
        tasks[index] = updated
        guard await persist() else {
            tasks[index] = previous
            return
        }
        var reminderConfigured = false
        var reminderConfigurationFailed = false
        if state != .active {
            notifications.removePendingNotificationRequests(withIdentifiers: ["evolingo.task.\(task.id.uuidString)"])
        } else if let dueAt = updated.dueAt {
            let settings = await notifications.notificationSettings()
            if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional || settings.authorizationStatus == .ephemeral {
                do {
                    try await scheduleNotification(for: updated, at: dueAt)
                    reminderConfigured = true
                    notice = nil
                } catch {
                    notice = "A feladat folytatódik, de az emlékeztetőt nem sikerült újra beállítani."
                    reminderConfigurationFailed = true
                }
            } else {
                notice = "A feladat folytatódik. Az emlékeztető engedélyét az iPhone Beállításaiban kapcsold be."
                reminderConfigurationFailed = true
            }
        }
        if state == .completed { EvoHaptics.success() }
        else if reminderConfigurationFailed { EvoHaptics.warning() }
        else if reminderConfigured { EvoHaptics.success() }
        else { EvoHaptics.tap() }
    }

    func delete(_ task: NativeTask) async {
        guard !isRestoring, !storageUnavailable else { return }
        let previous = tasks
        tasks.removeAll { $0.id == task.id }
        guard await persist() else {
            tasks = previous
            return
        }
        notifications.removePendingNotificationRequests(withIdentifiers: ["evolingo.task.\(task.id.uuidString)"])
        EvoHaptics.success()
    }

    func importTasks(_ imported: [NativeTask]) async -> Int {
        if isRestoring { await reloadFromDisk() }
        guard !storageUnavailable else { return 0 }
        let currentIDs = Set(tasks.map(\.id))
        let additions = imported.filter { !currentIDs.contains($0.id) }
        guard !additions.isEmpty else { return 0 }
        let previous = tasks
        tasks = (additions + tasks).sorted { $0.createdAt > $1.createdAt }
        guard await persist() else {
            tasks = previous
            return 0
        }
        notice = nil
        let reminders = additions.filter { $0.kind == .reminder && $0.state == .active && $0.dueAt != nil }
        let expiredReminders = reminders.filter { $0.repeatRule == .once && ($0.dueAt ?? .distantPast) <= .now }
        let schedulableReminders = reminders.filter { !($0.repeatRule == .once && ($0.dueAt ?? .distantPast) <= .now) }
        if !expiredReminders.isEmpty {
            notice = "A feladatok importálva. Néhány egyszeri emlékeztető időpontja már elmúlt."
            EvoHaptics.warning()
        }
        if !schedulableReminders.isEmpty {
            do {
                let permitted = try await notifications.requestAuthorization(options: [.alert, .sound])
                if permitted {
                    for reminder in schedulableReminders {
                        if let dueAt = reminder.dueAt { try await scheduleNotification(for: reminder, at: dueAt) }
                    }
                } else {
                    notice = "A feladatok importálva. Az emlékeztetők nem kaptak értesítési engedélyt."
                    EvoHaptics.warning()
                }
            } catch {
                notice = "A feladatok importálva, de néhány emlékeztetőt nem sikerült beállítani."
                EvoHaptics.warning()
            }
        }
        if notice == nil { EvoHaptics.success() }
        return additions.count
    }
}

private enum NotificationScheduleError: Error {
    case datePassed
}

struct ScheduleView: View {
    @StateObject private var model = ScheduleModel()
    @State private var filter: TaskState = .active
    @State private var selectedDay = Calendar.current.startOfDay(for: .now)
    @State private var search = ""
    @State private var creating = false
    @State private var deleting: NativeTask?

    private var visibleTasks: [NativeTask] {
        model.tasks.filter { $0.state == filter &&
            (search.isEmpty || ($0.title + " " + $0.note).localizedCaseInsensitiveContains(search))
        }
    }

    private var weekDates: [Date] {
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: selectedDay)
        let weekday = calendar.component(.weekday, from: day)
        let mondayOffset = (weekday + 5) % 7
        guard let monday = calendar.date(byAdding: .day, value: -mondayOffset, to: day) else { return [day] }
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: monday) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ScrollView(.horizontal) {
                        HStack(spacing: 8) {
                            ForEach(weekDates, id: \.self) { date in
                                let isSelected = Calendar.current.isDate(date, inSameDayAs: selectedDay)
                                let isPast = date < Calendar.current.startOfDay(for: .now)
                                Button {
                                    selectedDay = date
                                    EvoHaptics.selection()
                                } label: {
                                    VStack(spacing: 4) {
                                        Text(date.formatted(.dateTime.weekday(.abbreviated)))
                                            .font(EvoFont.text(.caption, weight: .medium))
                                        Text(date.formatted(.dateTime.day()))
                                            .font(EvoFont.text(.body, weight: .semibold))
                                    }
                                    .frame(minWidth: 48, minHeight: 56)
                                    .foregroundStyle(isSelected ? Color(uiColor: .systemBackground) : Color.primary)
                                    .background(isSelected ? Color.primary : Color(uiColor: .secondarySystemBackground), in: Capsule())
                                    .contentShape(Capsule())
                                }
                                .buttonStyle(.plain)
                                .disabled(isPast)
                                .opacity(isPast && !isSelected ? 0.45 : 1)
                                .accessibilityLabel(date.formatted(date: .complete, time: .omitted))
                                .accessibilityAddTraits(isSelected ? .isSelected : [])
                            }
                        }
                        .padding(.vertical, 3)
                    }
                    .scrollIndicators(.hidden)
                    .listRowInsets(EdgeInsets(top: 5, leading: 0, bottom: 5, trailing: 0))
                } header: { Text("Új feladat napja") }

                Section {
                    Picker("Feladat állapota", selection: $filter) {
                        ForEach(TaskState.allCases) { state in Text(state.title).tag(state) }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: filter) { _, _ in EvoHaptics.selection() }
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                }

                if let notice = model.notice {
                    Section { EvoSymbolLabel(notice, systemImage: "info.circle").font(EvoFont.text(.footnote)).foregroundStyle(EvoTheme.Symbol.secondary) }
                }

                if model.isRestoring {
                    ProgressView("Feladatok betöltése…")
                        .frame(maxWidth: .infinity, minHeight: 120)
                        .listRowSeparator(.hidden)
                } else if model.storageUnavailable {
                    EvoUnavailableView("A feladatok nem érhetők el", systemImage: "externaldrive.badge.exclamationmark",
                                           description: Text("A helyi adatfájl megmaradt. Próbáld újra betölteni.")).listRowSeparator(.hidden)
                } else if visibleTasks.isEmpty {
                    EvoUnavailableView(search.isEmpty ? emptyTitle : "Nincs találat",
                                           systemImage: "calendar",
                                           description: Text(search.isEmpty ? "A saját feladataid ezen az iPhone-on jelennek meg." : "Próbálj másik keresést."))
                        .listRowSeparator(.hidden)
                } else {
                    Section(filter.title) {
                        ForEach(visibleTasks) { task in taskRow(task) }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Ütemezés")
            .searchable(text: $search, prompt: "Feladatok keresése")
            .task { await model.reloadFromDisk() }
            .onReceive(NotificationCenter.default.publisher(for: .evolingoNativeDataImported)) { _ in
                Task { await model.reloadFromDisk(force: true) }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { EvoHaptics.tap(); creating = true } label: { EvoIcon(systemName: "plus").evoSymbol(.navigation).evoIconTarget() }
                        .frame(minWidth: 44, minHeight: 44).accessibilityLabel("Új feladat")
                        .disabled(model.isRestoring || model.storageUnavailable)
                }
            }
            .overlay(alignment: .top) {
                if model.storageUnavailable {
                    Button {
                        EvoHaptics.tap()
                        Task { await model.reloadFromDisk(force: true) }
                    } label: {
                        EvoSymbolLabel("Helyi feladatok újratöltése", systemImage: "arrow.clockwise")
                            .frame(minHeight: 44).padding(.horizontal, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .padding(.top, 8)
                }
            }
            .sheet(isPresented: $creating) {
                CreateTaskView(initialDate: selectedDay) { title, note, kind, repeatRule, dueAt, total in
                    await model.create(title: title, note: note, kind: kind, repeatRule: repeatRule, dueAt: dueAt, totalSteps: total)
                }
            }
            .confirmationDialog("Feladat törlése?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }), titleVisibility: .visible) {
                Button("Törlés", role: .destructive) {
                    if let task = deleting { Task { await model.delete(task) } }
                    deleting = nil
                }
                Button("Mégse", role: .cancel) { deleting = nil }
            } message: {
                Text(deleting?.title ?? "A feladat végleg törlődik.")
            }
        }
    }

    private var emptyTitle: String {
        switch filter {
        case .active: "Nincs aktív feladat"
        case .paused: "Nincs szüneteltetett feladat"
        case .completed: "Még nincs befejezett feladat"
        }
    }

    @ViewBuilder private func taskRow(_ task: NativeTask) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top, spacing: 12) {
                EvoIcon(systemName: task.kind == .long ? "list.number" : "calendar.badge.clock").evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.secondary).frame(width: 28)
                VStack(alignment: .leading, spacing: 4) {
                    Text(task.title).font(EvoFont.text(.headline))
                    Text(task.kind == .long ? "Hosszú feladat" : task.repeatRule.title)
                        .font(EvoFont.text(.subheadline)).foregroundStyle(EvoTheme.Symbol.secondary)
                }
                Spacer()
                Menu {
                    if task.state == .active {
                        Button { Task { await model.setState(task, .paused) } } label: { EvoSymbolLabel("Szüneteltetés", systemImage: "pause.circle") }
                    } else if task.state == .paused {
                        Button { Task { await model.setState(task, .active) } } label: { EvoSymbolLabel("Újraindítás", systemImage: "play.circle") }
                    }
                    if task.state != .completed {
                        Button { Task { await model.setState(task, .completed) } } label: { EvoSymbolLabel("Befejezés", systemImage: "checkmark.circle") }
                    }
                    Button(role: .destructive) { deleting = task } label: { EvoSymbolLabel("Törlés", systemImage: "trash") }
                } label: {
                    EvoIcon(systemName: "ellipsis").evoSymbol(.toolbar).frame(width: 44, height: 44).contentShape(Rectangle())
                }.accessibilityLabel("\(task.title) műveletei")
            }
            if !task.note.isEmpty { Text(task.note).font(EvoFont.text(.subheadline)).foregroundStyle(EvoTheme.Symbol.secondary) }
            if task.kind == .long {
                ProgressView(value: Double(task.step), total: Double(task.totalSteps))
                Text("\(task.step) / \(task.totalSteps) lépés").font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
            }
            if let dueAt = task.dueAt {
                EvoSymbolLabel(dueAt.formatted(date: .abbreviated, time: .shortened), systemImage: "clock")
                    .font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
            }
            if task.state == .active {
                Button {
                    Task { await model.complete(task) }
                } label: {
                    EvoSymbolLabel(task.kind == .long ? "Következő lépés kész" : task.repeatRule == .once ? "Késznek jelölés" : "Alkalom kész", systemImage: "checkmark")
                        .font(EvoFont.text(.subheadline, weight: .medium))
                }
                .buttonStyle(.bordered)
                .tint(.primary)
                .frame(minHeight: 44)
            }
        }
        .padding(.vertical, 5)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { deleting = task } label: { EvoSymbolLabel("Törlés", systemImage: "trash") }
            if task.state == .active {
                Button { Task { await model.setState(task, .paused) } } label: { EvoSymbolLabel("Szünet", systemImage: "pause") }.tint(.orange)
            }
        }
    }
}

struct CreateTaskView: View {
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?
    @State private var title = ""
    @State private var note = ""
    @State private var kind: TaskKind = .reminder
    @State private var repeatRule: TaskRepeat = .once
    @State private var dueAt: Date
    @State private var totalSteps = 5
    @State private var saving = false
    let onCreate: (String, String, TaskKind, TaskRepeat, Date, Int) async -> Bool
    @State private var saveError: String?

    private enum Field { case title, note }

    init(initialDate: Date, onCreate: @escaping (String, String, TaskKind, TaskRepeat, Date, Int) async -> Bool) {
        let nineAM = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: initialDate) ?? initialDate
        _dueAt = State(initialValue: max(nineAM, .now))
        self.onCreate = onCreate
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Feladat") {
                    TextField("Név", text: $title)
                        .textInputAutocapitalization(.sentences)
                        .focused($focusedField, equals: .title)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .note }
                    TextField("Leírás (nem kötelező)", text: $note, axis: .vertical)
                        .focused($focusedField, equals: .note)
                        .lineLimit(2...5)
                    Picker("Típus", selection: $kind) {
                        ForEach(TaskKind.allCases) { kind in Text(kind.title).tag(kind) }
                    }
                }
                if kind == .reminder {
                    Section("Emlékeztető") {
                        DatePicker("Dátum és idő", selection: $dueAt, in: .now..., displayedComponents: [.date, .hourAndMinute])
                        Picker("Ismétlődés", selection: $repeatRule) {
                            ForEach(TaskRepeat.allCases) { rule in Text(rule.title).tag(rule) }
                        }
                    }
                    Section {
                        EvoSymbolLabel("A feladat és az emlékeztető ezen az iPhone-on mentődik.", systemImage: "iphone")
                            .font(EvoFont.text(.footnote)).foregroundStyle(EvoTheme.Symbol.secondary)
                    }
                } else {
                    Section("Haladás") {
                        Stepper("Lépések száma: \(totalSteps)", value: $totalSteps, in: 2...20)
                    }
                }
                if let saveError {
                    Section { EvoSymbolLabel(saveError, systemImage: "exclamationmark.triangle").foregroundStyle(.red) }
                }
            }
            .font(EvoFont.text(.body))
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Új feladat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Mégse") { EvoHaptics.tap(); dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Mentés") {
                        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                        saving = true
                        Task {
                            let created = await onCreate(title, note, kind, repeatRule, dueAt, totalSteps)
                            saving = false
                            if created { dismiss() }
                            else { saveError = "A feladat mentése nem sikerült. Próbáld újra." }
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                }
            }
            .interactiveDismissDisabled(saving)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}
