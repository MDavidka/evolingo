import QuickLook
import SwiftUI
import UniformTypeIdentifiers

struct LocalLibraryFile: Identifiable, Sendable {
    let url: URL
    let modifiedAt: Date
    let size: Int64
    let isDirectory: Bool
    var id: String { url.path }
    var name: String { url.lastPathComponent }
}

struct LocalTrashItem: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let originalRelativePath: String
    let trashedAt: Date
    let isDirectory: Bool
    let size: Int64
}

struct NativeWebLibraryEntry: Sendable {
    let id: String
    let name: String
    let kind: String
    let parent: String?
    let data: Data?
}

private enum NativeLibraryReadError: Error, Sendable {
    case unavailable
}

@MainActor final class LocalLibraryModel: ObservableObject {
    @Published private(set) var files: [LocalLibraryFile] = []
    @Published private(set) var trashItems: [LocalTrashItem] = []
    @Published private(set) var currentDirectory: URL
    @Published var error: String?
    @Published private(set) var trashOperationInProgress = false
    private let manager = FileManager.default
    private let rootDirectory: URL
    private var trashDirectory: URL { rootDirectory.appendingPathComponent(".Trash", isDirectory: true) }
    private var reloadGeneration = 0
    var isAtRoot: Bool { currentDirectory.standardizedFileURL == rootDirectory.standardizedFileURL }

    init() {
        rootDirectory = manager.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Evolingo Library", isDirectory: true)
        currentDirectory = rootDirectory
        reload()
    }

    func reload() {
        reloadGeneration += 1
        let generation = reloadGeneration
        let directory = currentDirectory
        Task {
            let result = await Task.detached(priority: .utility) { () -> Result<[LocalLibraryFile], NativeLibraryReadError> in
                do {
                    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                    let urls = try FileManager.default.contentsOfDirectory(
                        at: directory,
                        includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey, .isDirectoryKey],
                        options: [.skipsHiddenFiles]
                    )
                    let files = urls.compactMap { url -> LocalLibraryFile? in
                        guard let values = try? url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey, .isDirectoryKey]) else { return nil }
                        return LocalLibraryFile(url: url, modifiedAt: values.contentModificationDate ?? .distantPast,
                                                size: Int64(values.fileSize ?? 0), isDirectory: values.isDirectory == true)
                    }.sorted { left, right in
                        if left.isDirectory != right.isDirectory { return left.isDirectory }
                        return left.name.localizedStandardCompare(right.name) == .orderedAscending
                    }
                    return .success(files)
                } catch {
                    return .failure(.unavailable)
                }
            }.value
            guard generation == reloadGeneration,
                  directory.standardizedFileURL == currentDirectory.standardizedFileURL else { return }
            switch result {
            case .success(let files):
                self.files = files
                error = nil
                await reloadTrash()
            case .failure:
                error = "A helyi fájltárat nem sikerült megnyitni."
            }
        }
    }

    func openFolder(_ file: LocalLibraryFile) {
        guard file.isDirectory, isInsideLibrary(file.url) else { return }
        currentDirectory = file.url
        reload()
        EvoHaptics.tap()
    }

    func goToParent() {
        guard currentDirectory.standardizedFileURL != rootDirectory.standardizedFileURL else { return }
        let parent = currentDirectory.deletingLastPathComponent().standardizedFileURL
        guard isInsideLibrary(parent) else { currentDirectory = rootDirectory; reload(); return }
        currentDirectory = parent
        reload()
        EvoHaptics.tap()
    }

    func createFolder(name: String) {
        let cleanName = safeName(name)
        guard !cleanName.isEmpty else { error = "Adj meg mappanevet."; EvoHaptics.failure(); return }
        do {
            try manager.createDirectory(at: uniqueURL(for: cleanName, in: currentDirectory), withIntermediateDirectories: false)
            reload()
            EvoHaptics.success()
        } catch {
            self.error = "A mappát nem sikerült létrehozni."
            EvoHaptics.failure()
        }
    }

    func importFiles(_ urls: [URL]) async {
        guard !urls.isEmpty else { return }
        let targetDirectory = currentDirectory
        var imported = 0
        var failures: [String] = []
        for source in urls {
            let accessed = source.startAccessingSecurityScopedResource()
            defer { if accessed { source.stopAccessingSecurityScopedResource() } }
            let destination = uniqueURL(for: safeName(source.lastPathComponent), in: targetDirectory)
            let copied = await Task.detached(priority: .userInitiated) {
                do {
                    try FileManager.default.copyItem(at: source, to: destination)
                    return true
                } catch { return false }
            }.value
            if copied { imported += 1 }
            else { failures.append(source.lastPathComponent) }
        }
        reload()
        if failures.isEmpty {
            error = nil
            if imported > 0 { EvoHaptics.success() }
        } else {
            let visibleNames = failures.prefix(3).joined(separator: ", ")
            let remaining = failures.count - min(failures.count, 3)
            error = "Nem sikerült importálni: \(visibleNames)\(remaining > 0 ? " és még \(remaining) fájl" : ""). Sikeresen másolva: \(imported)."
            EvoHaptics.failure()
        }
    }

    func saveNote(name: String, text: String) async -> Bool {
        let cleanedTitle = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanedTitle.isEmpty else { return false }
        let fileName = cleanedTitle.lowercased().hasSuffix(".txt") ? cleanedTitle : cleanedTitle + ".txt"
        do {
            _ = try await NativeLibraryFileSystem.shared.saveNote(name: safeName(fileName), text: text, directory: currentDirectory)
            reload()
            error = nil
            EvoHaptics.success()
            return true
        } catch {
            self.error = "A jegyzetet nem sikerült elmenteni."
            EvoHaptics.failure()
            return false
        }
    }

    func importDataFile(name: String, data: Data) -> Bool {
        let cleaned = safeName(name)
        guard !cleaned.isEmpty, !data.isEmpty else { return false }
        do {
            let existing = rootDirectory.appendingPathComponent(cleaned)
            if manager.fileExists(atPath: existing.path), (try? Data(contentsOf: existing)) == data { return false }
            try data.write(to: uniqueURL(for: cleaned, in: rootDirectory), options: .atomic)
            reload()
            return true
        } catch {
            self.error = "Nem sikerült importálni: \(cleaned)"
            return false
        }
    }

    func importWebEntries(_ entries: [NativeWebLibraryEntry]) async -> (files: Int, folders: Int) {
        guard entries.count <= 5_000 else {
            error = "Az export túl sok könyvtárelemet tartalmaz. Legfeljebb 5 000 elem importálható egyszerre."
            return (0, 0)
        }
        let result: NativeLibraryImportResult
        do {
            result = try await NativeLibraryImporter.shared.importEntries(entries, rootDirectory: rootDirectory)
        } catch {
            self.error = "A webes fájlokat nem sikerült a helyi könyvtárba másolni."
            EvoHaptics.failure()
            return (0, 0)
        }
        currentDirectory = rootDirectory
        reload()
        if result.failureCount > 0 {
            self.error = "Néhány webes elem importálása nem sikerült (\(result.failureCount)). Az import többi része megmaradt."
            EvoHaptics.failure()
        } else {
            self.error = nil
            if result.files + result.folders > 0 { EvoHaptics.success() }
        }
        return (result.files, result.folders)
    }

    func delete(_ file: LocalLibraryFile) async {
        await moveToTrash(file)
    }

    @discardableResult func moveToTrash(_ file: LocalLibraryFile, haptic: Bool = true) async -> Bool {
        guard !trashOperationInProgress else { return false }
        trashOperationInProgress = true
        defer { trashOperationInProgress = false }
        guard isInsideLibrary(file.url) else {
            error = "A fájl a könyvtáron kívül található."
            if haptic { EvoHaptics.failure() }
            return false
        }
        guard file.url.standardizedFileURL != rootDirectory.standardizedFileURL,
              !file.url.standardizedFileURL.path.hasPrefix(trashDirectory.standardizedFileURL.path + "/") else { return false }
        do {
            try manager.createDirectory(at: trashDirectory, withIntermediateDirectories: true)
            let id = UUID().uuidString
            let relative = String(file.url.standardizedFileURL.path.dropFirst(rootDirectory.standardizedFileURL.path.count + 1))
            let trashedURL = trashDirectory.appendingPathComponent(id, isDirectory: file.isDirectory)
            try manager.moveItem(at: file.url, to: trashedURL)
            let record = LocalTrashItem(id: id, name: file.name, originalRelativePath: relative,
                                        trashedAt: .now, isDirectory: file.isDirectory, size: file.size)
            let updatedTrash = [record] + trashItems
            guard await persistTrash(updatedTrash) else {
                do { try manager.moveItem(at: trashedURL, to: file.url) }
                catch {
                    trashItems = updatedTrash
                    _ = await persistTrash(updatedTrash)
                    self.error = "A fájl áthelyeződött, de nem sikerült rögzíteni vagy visszaállítani a kuka metaadatait."
                }
                if haptic { EvoHaptics.failure() }
                return false
            }
            trashItems = updatedTrash
            reload()
            if haptic { EvoHaptics.success() }
            return true
        } catch {
            self.error = "A fájlt nem sikerült a Nemrég töröltek közé helyezni."
            if haptic { EvoHaptics.failure() }
            return false
        }
    }

    func restoreFromTrash(_ item: LocalTrashItem) async {
        guard !trashOperationInProgress else { return }
        trashOperationInProgress = true
        defer { trashOperationInProgress = false }
        guard !item.originalRelativePath.hasPrefix("/"),
              !item.originalRelativePath.split(separator: "/").contains("..") else {
            error = "A fájl eredeti helye nem érvényes."
            return
        }
        let source = trashDirectory.appendingPathComponent(item.id)
        guard manager.fileExists(atPath: source.path) else {
            if !(await removeTrashRecord(item)) {
                error = "A hiányzó kukaelem rekordját nem sikerült eltávolítani."
                await reloadTrash()
                EvoHaptics.failure()
            }
            return
        }
        let original = rootDirectory.appendingPathComponent(item.originalRelativePath).standardizedFileURL
        let originalParent = original.deletingLastPathComponent()
        let destinationDirectory = manager.fileExists(atPath: originalParent.path) ? originalParent : rootDirectory
        do {
            let destination = uniqueURL(for: item.name, in: destinationDirectory)
            try manager.moveItem(at: source, to: destination)
            guard await removeTrashRecord(item) else {
                do { try manager.moveItem(at: destination, to: source) }
                catch {
                    await reloadTrash()
                    self.error = "A fájl visszakerült, de a kuka metaadatait nem sikerült frissíteni."
                }
                EvoHaptics.failure()
                return
            }
            reload()
            EvoHaptics.success()
        } catch {
            self.error = "A fájlt nem sikerült visszaállítani."
            EvoHaptics.failure()
        }
    }

    func permanentlyDelete(_ item: LocalTrashItem) async {
        guard !trashOperationInProgress else { return }
        trashOperationInProgress = true
        defer { trashOperationInProgress = false }
        let url = trashDirectory.appendingPathComponent(item.id)
        let result = await NativeLibraryFileSystem.shared.permanentlyDelete([(item.id, url)])
        guard result.deleted.contains(item.id) else {
            error = "A fájlt nem sikerült véglegesen törölni."
            EvoHaptics.failure()
            return
        }
        guard await removeTrashRecord(item) else {
            error = "A fájl törlődött, de a kuka metaadatait nem sikerült frissíteni."
            await reloadTrash()
            EvoHaptics.failure()
            return
        }
        await reloadTrash()
        EvoHaptics.success()
    }

    func emptyTrash() async {
        guard !trashOperationInProgress else { return }
        trashOperationInProgress = true
        defer { trashOperationInProgress = false }
        let targets = trashItems.map { (id: $0.id, url: trashDirectory.appendingPathComponent($0.id)) }
        let result = await NativeLibraryFileSystem.shared.permanentlyDelete(targets)
        let remaining = trashItems.filter { !result.deleted.contains($0.id) }
        guard await persistTrash(remaining) else {
            error = "A kuka fájljai törlődtek, de az állapotukat nem sikerült frissíteni."
            await reloadTrash()
            EvoHaptics.failure()
            return
        }
        trashItems = remaining
        if result.failures > 0 {
            self.error = "A Nemrég töröltek tartalmát nem sikerült teljesen eltávolítani."
            await reloadTrash()
            EvoHaptics.failure()
        } else {
            await reloadTrash()
            EvoHaptics.success()
        }
    }

    private func reloadTrash() async {
        do {
            trashItems = try await NativeTrashStore.shared.load(trashDirectory: trashDirectory)
        } catch {
            self.error = "A kuka adatait nem sikerült betölteni."
        }
    }

    @discardableResult private func persistTrash(_ items: [LocalTrashItem]) async -> Bool {
        do {
            try await NativeTrashStore.shared.save(items)
            return true
        } catch {
            self.error = "A kuka állapotát nem sikerült elmenteni."
            return false
        }
    }

    @discardableResult private func removeTrashRecord(_ item: LocalTrashItem) async -> Bool {
        let updatedTrash = trashItems.filter { $0.id != item.id }
        guard await persistTrash(updatedTrash) else { return false }
        trashItems = updatedTrash
        return true
    }

    private func uniqueURL(for name: String, in directory: URL) -> URL {
        let initial = directory.appendingPathComponent(name)
        guard manager.fileExists(atPath: initial.path) else { return initial }
        let base = initial.deletingPathExtension().lastPathComponent
        let ext = initial.pathExtension
        var suffix = 2
        while true {
            let candidate = directory.appendingPathComponent("\(base) (\(suffix))\(ext.isEmpty ? "" : ".\(ext)")")
            if !manager.fileExists(atPath: candidate.path) { return candidate }
            suffix += 1
        }
    }

    private func isInsideLibrary(_ url: URL) -> Bool {
        let root = rootDirectory.standardizedFileURL.path + "/"
        let candidate = url.standardizedFileURL.path
        return candidate == rootDirectory.standardizedFileURL.path || candidate.hasPrefix(root)
    }

    private func safeName(_ value: String) -> String {
        let cleaned = String(value.unicodeScalars.filter {
            !CharacterSet.controlCharacters.contains($0) && $0 != "/" && $0 != "\\" && $0 != ":"
        }.prefix(160)).trimmingCharacters(in: .whitespacesAndNewlines)
        guard cleaned != ".", cleaned != "..", cleaned.caseInsensitiveCompare(".Trash") != .orderedSame else { return "" }
        return cleaned
    }
}

struct LibraryView: View {
    @StateObject private var model = LocalLibraryModel()
    @State private var importing = false
    @State private var copyingFiles = false
    @State private var writingNote = false
    @State private var savingNote = false
    @State private var creatingFolder = false
    @State private var noteTitle = ""
    @State private var noteText = ""
    @State private var folderName = ""
    @State private var search = ""
    @State private var previewURL: URL?
    @State private var selectedIDs: Set<String> = []
    @State private var selectionMode = false
    @State private var showingTrash = false
    @AppStorage("native.evolingo.library.sort") private var sortOrder = "recent"

    private var visibleFiles: [LocalLibraryFile] {
        let filtered = search.isEmpty ? model.files : model.files.filter { $0.name.localizedCaseInsensitiveContains(search) }
        return filtered.sorted { left, right in
            if left.isDirectory != right.isDirectory { return left.isDirectory }
            switch sortOrder {
            case "name": return left.name.localizedStandardCompare(right.name) == .orderedAscending
            case "size": return left.size > right.size
            default: return left.modifiedAt > right.modifiedAt
            }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if copyingFiles {
                    Section {
                        HStack(spacing: 10) {
                            ProgressView()
                            Text("Fájlok másolása…").foregroundStyle(EvoTheme.Symbol.secondary)
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
                if let error = model.error {
                    Section { EvoSymbolLabel(error, systemImage: "exclamationmark.triangle").foregroundStyle(.red).font(EvoFont.text(.footnote)) }
                }
                if visibleFiles.isEmpty {
                    EvoUnavailableView(search.isEmpty ? "A könyvtár üres" : "Nincs találat",
                                           systemImage: "folder",
                                           description: Text(search.isEmpty ? "Importálj fájlokat az iPhone Fájlok alkalmazásából, vagy készíts jegyzetet." : "Próbálj másik keresést."))
                        .listRowSeparator(.hidden)
                } else {
                    Section("Ezen az iPhone-on") {
                        ForEach(visibleFiles) { file in
                            HStack(spacing: 12) {
                                if selectionMode {
                                    EvoIcon(systemName: selectedIDs.contains(file.id) ? "checkmark.circle.fill" : "circle").evoSymbol(.standard).foregroundStyle(selectedIDs.contains(file.id) ? EvoTheme.Symbol.primary : EvoTheme.Symbol.secondary)
                                        .frame(width: 30, height: 44)
                                        .accessibilityHidden(true)
                                } else {
                                    EvoIcon(systemName: file.isDirectory ? "folder.fill" : icon(for: file.url)).evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.secondary).frame(width: 30)
                                        .accessibilityHidden(true)
                                }
                                Button {
                                    if selectionMode { toggleSelection(file) }
                                    else if file.isDirectory { model.openFolder(file) }
                                    else { EvoHaptics.tap(); previewURL = file.url }
                                } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(file.name).font(EvoFont.text(.body)).foregroundStyle(EvoTheme.Symbol.primary).lineLimit(2)
                                        Text(file.isDirectory ? "Mappa · \(file.modifiedAt.formatted(date: .abbreviated, time: .shortened))" : "\(ByteCountFormatter.string(fromByteCount: file.size, countStyle: .file)) · \(file.modifiedAt.formatted(date: .abbreviated, time: .shortened))")
                                            .font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                                    }.frame(maxWidth: .infinity, alignment: .leading).contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityAddTraits(selectionMode && selectedIDs.contains(file.id) ? .isSelected : [])
                                if !selectionMode && !file.isDirectory {
                                    ShareLink(item: file.url) {
                                        EvoIcon(systemName: "square.and.arrow.up").evoSymbol(.standard).frame(width: 44, height: 44)
                                    }.accessibilityLabel("\(file.name) megosztása")
                                    .labelStyle(.iconOnly)
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button { Task { await model.moveToTrash(file) } } label: { EvoSymbolLabel("Nemrég töröltek", systemImage: "trash") }
                                    .tint(.orange).disabled(model.trashOperationInProgress)
                            }
                            .contextMenu {
                                if selectionMode {
                                    Button { toggleSelection(file) } label: { EvoSymbolLabel(selectedIDs.contains(file.id) ? "Kijelölés megszüntetése" : "Kijelölés", systemImage: selectedIDs.contains(file.id) ? "checkmark.circle" : "circle") }
                                } else if file.isDirectory {
                                    Button { model.openFolder(file) } label: { EvoSymbolLabel("Mappa megnyitása", systemImage: "folder") }
                                } else {
                                    Button { EvoHaptics.tap(); previewURL = file.url } label: { EvoSymbolLabel("Megnyitás", systemImage: "eye") }
                                    ShareLink(item: file.url) { EvoSymbolLabel("Megosztás", systemImage: "square.and.arrow.up") }
                                }
                                Button { Task { await model.moveToTrash(file) } } label: { EvoSymbolLabel("Nemrég töröltek", systemImage: "trash") }
                                    .disabled(model.trashOperationInProgress)
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle(model.isAtRoot ? "Könyvtár" : model.currentDirectory.lastPathComponent)
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $search, prompt: "Fájlok keresése ebben a mappában")
            .onChange(of: sortOrder) { _, _ in EvoHaptics.selection() }
            .toolbar {
                if selectionMode {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Mégse") { selectionMode = false; selectedIDs.removeAll(); EvoHaptics.tap() }
                    }
                } else if !model.isAtRoot {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { model.goToParent() } label: { EvoSymbolLabel("Vissza", systemImage: "chevron.left") }
                            .frame(minHeight: 44)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if selectionMode {
                            Button(role: .destructive) { Task { await moveSelectedToTrash() } } label: { EvoSymbolLabel("Kijelöltek törlése (\(selectedIDs.count))", systemImage: "trash") }
                                .disabled(selectedIDs.isEmpty || model.trashOperationInProgress)
                        } else {
                            Button { selectionMode = true; selectedIDs.removeAll(); EvoHaptics.tap() } label: { EvoSymbolLabel("Kijelölés", systemImage: "checkmark.circle") }
                                .disabled(model.files.isEmpty)
                            Button { EvoHaptics.tap(); importing = true } label: { EvoSymbolLabel("Fájl importálása", systemImage: "folder.badge.plus") }
                            Button { EvoHaptics.tap(); folderName = ""; creatingFolder = true } label: { EvoSymbolLabel("Új mappa", systemImage: "folder.badge.plus") }
                            Button { EvoHaptics.tap(); noteTitle = ""; noteText = ""; writingNote = true } label: { EvoSymbolLabel("Új jegyzet", systemImage: "square.and.pencil") }
                            Button { EvoHaptics.tap(); showingTrash = true } label: { EvoSymbolLabel("Nemrég töröltek (\(model.trashItems.count))", systemImage: "trash") }
                        }
                        Menu("Rendezés") {
                            Picker("Rendezés", selection: $sortOrder) {
                                Text("Legutóbbi").tag("recent")
                                Text("Név szerint").tag("name")
                                Text("Méret szerint").tag("size")
                            }
                        }
                    } label: { EvoIcon(systemName: selectionMode ? "trash" : "ellipsis").evoSymbol(.navigation).evoIconTarget() }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel(selectionMode ? "Kijelölt fájlok műveletei" : "További fájlműveletek")
                        .disabled(copyingFiles)
                }
            }
            .navigationDestination(isPresented: $showingTrash) {
                LibraryTrashView(model: model)
            }
            .safeAreaInset(edge: .bottom) {
                if selectionMode {
                    Button(role: .destructive) { Task { await moveSelectedToTrash() } } label: {
                        EvoSymbolLabel("Kijelöltek törlése (\(selectedIDs.count))", systemImage: "trash")
                            .font(EvoFont.text(.body, weight: .semibold)).frame(maxWidth: .infinity).frame(minHeight: 48)
                    }
                    .buttonStyle(.borderedProminent).tint(.orange).disabled(selectedIDs.isEmpty || model.trashOperationInProgress)
                    .padding(.horizontal, 16).padding(.vertical, 8).background(.bar)
                }
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.item, .folder], allowsMultipleSelection: true) { result in
                switch result {
                case .success(let urls):
                    guard !urls.isEmpty else { return }
                    copyingFiles = true
                    Task {
                        await model.importFiles(urls)
                        copyingFiles = false
                    }
                case .failure:
                    model.error = "A fájlimportálás megszakadt vagy nem sikerült."
                    EvoHaptics.failure()
                }
            }
            .sheet(isPresented: $writingNote) {
                NavigationStack {
                    Form {
                        Section("Jegyzet") {
                            TextField("Cím", text: $noteTitle)
                            TextEditor(text: $noteText).frame(minHeight: 180)
                                .accessibilityLabel("Jegyzet szövege")
                        }
                        Section {
                            EvoSymbolLabel("A jegyzet helyi .txt fájlként mentődik.", systemImage: "iphone")
                                .font(EvoFont.text(.footnote)).foregroundStyle(EvoTheme.Symbol.secondary)
                        }
                    }
                    .navigationTitle("Új jegyzet")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) { Button("Mégse") { writingNote = false } }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Mentés") {
                                savingNote = true
                                Task {
                                    let saved = await model.saveNote(name: noteTitle, text: noteText)
                                    savingNote = false
                                    if saved { writingNote = false }
                                }
                            }
                            .disabled(noteTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || savingNote)
                        }
                    }
                }.presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
            }
            .alert("Új mappa", isPresented: $creatingFolder) {
                TextField("Mappa neve", text: $folderName)
                Button("Létrehozás") { model.createFolder(name: folderName) }
                Button("Mégse", role: .cancel) { folderName = "" }
            } message: { Text("A mappa az alkalmazás helyi fájltárában jön létre.") }
            .quickLookPreview($previewURL)
            .onReceive(NotificationCenter.default.publisher(for: .evolingoNativeDataImported)) { _ in
                model.reload()
            }
        }
    }

    private func icon(for url: URL) -> String {
        switch UTType(filenameExtension: url.pathExtension)?.conforms(to: .pdf) {
        case true: "doc.richtext"
        case false: "doc"
        case nil: "doc"
        }
    }

    private func toggleSelection(_ file: LocalLibraryFile) {
        if selectedIDs.contains(file.id) { selectedIDs.remove(file.id) }
        else { selectedIDs.insert(file.id) }
        EvoHaptics.tap()
    }

    private func moveSelectedToTrash() async {
        let selected = visibleFiles.filter { selectedIDs.contains($0.id) }
        var moved = 0
        for file in selected {
            if await model.moveToTrash(file, haptic: false) { moved += 1 }
        }
        if moved == selected.count && moved > 0 { EvoHaptics.success() }
        else if !selected.isEmpty { EvoHaptics.failure() }
        selectedIDs.removeAll()
        selectionMode = false
    }
}

private struct LibraryTrashView: View {
    @ObservedObject var model: LocalLibraryModel
    @State private var confirmingEmpty = false
    @State private var permanentDeleteTarget: LocalTrashItem?

    var body: some View {
        List {
            if model.trashItems.isEmpty {
                EvoUnavailableView("Nincsenek törölt elemek", systemImage: "trash",
                                       description: Text("Az eltávolított fájlok itt jelennek meg, amíg végleg nem törlöd őket."))
                    .listRowSeparator(.hidden)
            } else {
                Section("Nemrég töröltek") {
                    ForEach(model.trashItems) { item in
                        HStack(spacing: 12) {
                            EvoIcon(systemName: item.isDirectory ? "folder" : "doc").evoSymbol(.standard).foregroundStyle(EvoTheme.Symbol.secondary).frame(width: 30)
                                .accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.name).lineLimit(2)
                                Text("Törölve: \(item.trashedAt.formatted(date: .abbreviated, time: .shortened))")
                                    .font(EvoFont.text(.caption)).foregroundStyle(EvoTheme.Symbol.secondary)
                            }
                            Spacer()
                            Button { Task { await model.restoreFromTrash(item) } } label: {
                                EvoIcon(systemName: "arrow.uturn.backward").evoSymbol(.standard).frame(width: 44, height: 44)
                            }.accessibilityLabel("\(item.name) visszaállítása").disabled(model.trashOperationInProgress)
                        }
                        .swipeActions(edge: .leading) {
                            Button { Task { await model.restoreFromTrash(item) } } label: { EvoSymbolLabel("Visszaállítás", systemImage: "arrow.uturn.backward") }
                                .tint(.green).disabled(model.trashOperationInProgress)
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) { permanentDeleteTarget = item } label: { EvoSymbolLabel("Végleges törlés", systemImage: "trash.slash") }
                        }
                    }
                }
            }
            if let error = model.error {
                Section { EvoSymbolLabel(error, systemImage: "exclamationmark.triangle").foregroundStyle(.red).font(EvoFont.text(.footnote)) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Nemrég töröltek")
        .toolbar {
            if !model.trashItems.isEmpty {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Kiürítés", role: .destructive) { confirmingEmpty = true }.disabled(model.trashOperationInProgress)
                }
            }
        }
        .confirmationDialog("Nemrég töröltek végleges kiürítése?", isPresented: $confirmingEmpty, titleVisibility: .visible) {
            Button("Végleges törlés", role: .destructive) { Task { await model.emptyTrash() } }.disabled(model.trashOperationInProgress)
            Button("Mégse", role: .cancel) { }
        } message: { Text("A fájlok és mappák többé nem állíthatók vissza.") }
        .confirmationDialog("Elem végleges törlése?", isPresented: Binding(get: { permanentDeleteTarget != nil }, set: { if !$0 { permanentDeleteTarget = nil } }), titleVisibility: .visible) {
            Button("Végleges törlés", role: .destructive) {
                if let item = permanentDeleteTarget { Task { await model.permanentlyDelete(item) } }
                permanentDeleteTarget = nil
            }.disabled(model.trashOperationInProgress)
            Button("Mégse", role: .cancel) { permanentDeleteTarget = nil }
        } message: { Text(permanentDeleteTarget?.name ?? "Ez a művelet nem vonható vissza.") }
    }
}
