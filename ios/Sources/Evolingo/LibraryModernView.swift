import SwiftUI
import QuickLook
import UniformTypeIdentifiers

private enum LibraryLocationTarget: Equatable {
    case home
    case downloads
    case files
    case folder(URL, String)
    case trash
}

private enum LibrarySortOption: String, CaseIterable, Identifiable {
    case recent = "Recent"
    case name = "Name"
    case size = "Size"

    var id: String { rawValue }
}

struct ModernLibraryView: View {
    @StateObject private var model = LocalLibraryModel()
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void

    @State private var search = ""
    @State private var location: LibraryLocationTarget = .home
    @State private var locationsExpanded = true
    @State private var sortOption: LibrarySortOption = .recent

    @State private var importing = false
    @State private var creatingFolder = false
    @State private var folderName = ""

    @State private var showNewFileSheet = false
    @State private var noteTitle = ""
    @State private var noteText = ""
    @State private var savingNote = false

    @State private var showArlenSendSheet = false
    @State private var selectedSendFile: URL?
    @State private var showShareSheet = false

    @State private var showConnectSheet = false
    @State private var machines: [NativeMachine] = []
    @State private var machineName = ""
    @State private var machineURL = ""
    @State private var machineError: String?

    @State private var previewURL: URL?
    @FocusState private var searchFocused: Bool
    @FocusState private var noteField: NoteField?

    private enum NoteField { case title, body }
    @State private var emptyStateMode = false
    @State private var isGridView = false

    private static let primaryInk = Color(red: 22.0 / 255, green: 22.0 / 255, blue: 26.0 / 255)
    private static let secondaryInk = Color(red: 138.0 / 255, green: 138.0 / 255, blue: 146.0 / 255)
    private static let subtleBorder = Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255)

    private var topLevelFolders: [LocalLibraryFile] {
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines)
        let folders = model.files.filter { $0.isDirectory }
        guard !q.isEmpty else { return folders }
        return folders.filter { $0.name.localizedCaseInsensitiveContains(q) }
    }

    private var visibleLocationFiles: [LocalLibraryFile] {
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = q.isEmpty ? model.files : model.files.filter { $0.name.localizedCaseInsensitiveContains(q) }
        return base.sorted { left, right in
            if left.isDirectory != right.isDirectory { return left.isDirectory }
            switch sortOption {
            case .name:
                return left.name.localizedStandardCompare(right.name) == .orderedAscending
            case .size:
                return left.size > right.size
            case .recent:
                return left.modifiedAt > right.modifiedAt
            }
        }
    }

    private var visibleTrashItems: [LocalTrashItem] {
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return model.trashItems }
        return model.trashItems.filter { $0.name.localizedCaseInsensitiveContains(q) }
    }

    private var locationTitle: String {
        switch location {
        case .home: return "Locations"
        case .downloads: return "Downloads"
        case .files: return "My Files"
        case .folder(_, let name): return name
        case .trash: return "Recently Deleted"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Reusable Top Navigation Bar across all 4 screens
            EvoSharedTopBar(
                onOpenSidebar: {
                    searchFocused = false
                    onOpenSidebar()
                },
                onOpenProfile: {
                    searchFocused = false
                    onOpenProfile()
                }
            ) {
                Button {
                    EvoHaptics.tap()
                    showNewFileSheet = true
                } label: {
                    EvoSymbolLabel("New File", systemImage: "doc.badge.plus")
                }
                Button {
                    EvoHaptics.tap()
                    creatingFolder = true
                } label: {
                    EvoSymbolLabel("New Folder", systemImage: "folder.badge.plus")
                }
                Button {
                    EvoHaptics.tap()
                    importing = true
                } label: {
                    EvoSymbolLabel("Import File", systemImage: "square.and.arrow.down")
                }
                Divider()
                Button {
                    EvoHaptics.tap()
                    emptyStateMode.toggle()
                } label: {
                    EvoSymbolLabel(emptyStateMode ? "Show Populated View" : "Show Empty State View", systemImage: "eye")
                }
            }

            if location == .home && search.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                homeView
            } else {
                drilldownView
            }
        }
        .background(Color.white.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) {
            bottomSearchShelf
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
            if case .success(let urls) = result, !urls.isEmpty {
                Task {
                    await model.importFiles(urls)
                }
            }
        }
        .alert("New Folder", isPresented: $creatingFolder) {
            TextField("Folder name", text: $folderName)
            Button("Cancel", role: .cancel) { folderName = "" }
            Button("Create") {
                model.createFolder(name: folderName)
                folderName = ""
            }
        }
        .sheet(isPresented: $showNewFileSheet) {
            newFileSheet
        }
        .sheet(isPresented: $showArlenSendSheet) {
            arlenSendSheet
        }
        .fullScreenCover(isPresented: $showConnectSheet) {
            ConnectServerView(
                onOpenSidebar: { showConnectSheet = false },
                onOpenProfile: { showConnectSheet = false },
                showsBackButton: true
            )
        }
        .sheet(isPresented: $showShareSheet) {
            if let fileURL = selectedSendFile {
                LibraryActivityShareView(activityItems: [fileURL])
            }
        }
        .quickLookPreview($previewURL)
        .task {
            if let loaded = try? await NativeMachineStore.shared.load() {
                machines = loaded
            }
        }
    }

    // MARK: - Home Screen Matching Reference (Screens A & B)

    private var homeView: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                // Quick Action Row (New File, Arlen Send, Connect) placed below header
                quickActionsBar
                    .padding(.top, 14)
                    .padding(.bottom, 22)

                if emptyStateMode || (model.files.isEmpty && model.trashItems.isEmpty) {
                    // Screen B: Centered Empty State View
                    emptyStateView
                        .containerRelativeFrame(.vertical, alignment: .center) { length, _ in
                            max(320, length - 220)
                        }
                } else {
                    // Screen A: Populated Files View
                    populatedFilesView
                }
            }
            .padding(.bottom, 20)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Screen B: Centered Empty State View
    // Vertically and horizontally centered folder outline icon, bold heading "No files yet",
    // secondary body text "Your files and folders will appear here.", bordered pill button "+ Create file"

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Spacer(minLength: 40)

            EvoIcon(systemName: "folder.open")
                .evoSymbol(.navigation)
                .scaleEffect(1.4)
                .frame(height: 36)
                .foregroundStyle(Self.secondaryInk)
                .padding(.bottom, 4)

            Text("No files yet")
                .font(.system(size: 21, weight: .bold))
                .foregroundStyle(Self.primaryInk)

            Text("Your files and folders will appear here.")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(Self.secondaryInk)
                .multilineTextAlignment(.center)

            Button {
                EvoHaptics.tap()
                showNewFileSheet = true
            } label: {
                HStack(spacing: 6) {
                    EvoIcon(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                    Text("Create file")
                        .font(.system(size: 14.5, weight: .semibold))
                }
                .foregroundStyle(Self.primaryInk)
                .padding(.horizontal, 22)
                .padding(.vertical, 10)
                .frame(minHeight: 44)
                .background(Color.white, in: Capsule())
                .overlay(
                    Capsule().stroke(Self.subtleBorder, lineWidth: 1)
                )
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .padding(.top, 6)

            Spacer(minLength: 80)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 28)
    }

    // MARK: - Screen A: Populated Files View
    // Section Header & Toolbar ("My Files", "4 items", 2x2 grid, sort arrows, ellipsis),
    // Breadcrumb Bar ("My Files > Documents"), and File List Card (3 rows with chevrons)

    private var populatedFilesView: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section Header & Toolbar
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("My Files")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(Self.primaryInk)
                    Text("4 items")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(Self.secondaryInk)
                }

                Spacer()

                HStack(spacing: 16) {
                    Button {
                        EvoHaptics.tap()
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isGridView.toggle()
                        }
                    } label: {
                        EvoIcon(systemName: isGridView ? "list.bullet" : "square.grid.2x2")
                            .evoSymbol(.toolbar, weight: .medium)
                            .font(.system(size: 17))
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Toggle grid view")

                    Menu {
                        ForEach(LibrarySortOption.allCases) { option in
                            Button {
                                EvoHaptics.selection()
                                sortOption = option
                            } label: {
                                EvoSymbolLabel(
                                    "Sort by \(option.rawValue)",
                                    systemImage: sortOption == option ? "checkmark" : "line.3.horizontal.decrease"
                                )
                            }
                        }
                    } label: {
                        EvoIcon(systemName: "arrow.up.arrow.down")
                            .evoSymbol(.toolbar, weight: .medium)
                            .font(.system(size: 17))
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Sort options")

                    Menu {
                        Button {
                            EvoHaptics.tap()
                            showNewFileSheet = true
                        } label: {
                            EvoSymbolLabel("New File", systemImage: "doc.badge.plus")
                        }
                        Button {
                            EvoHaptics.tap()
                            creatingFolder = true
                        } label: {
                            EvoSymbolLabel("New Folder", systemImage: "folder.badge.plus")
                        }
                        Button {
                            EvoHaptics.tap()
                            emptyStateMode.toggle()
                        } label: {
                            EvoSymbolLabel(emptyStateMode ? "Show Populated View" : "Show Empty State View", systemImage: "eye")
                        }
                    } label: {
                        EvoIcon(systemName: "ellipsis")
                            .evoSymbol(.toolbar, weight: .medium)
                            .font(.system(size: 17))
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("More options")
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 14)

            // Breadcrumb Bar: Archive drawer icon + "My Files > Documents"
            HStack(spacing: 8) {
                LibraryArchiveDrawerIconShape()
                    .stroke(Self.secondaryInk, style: StrokeStyle(lineWidth: 1.4, lineCap: .round, lineJoin: .round))
                    .frame(width: 17, height: 15)

                HStack(spacing: 4) {
                    Text("My Files >")
                        .font(.system(size: 14.5, weight: .regular))
                        .foregroundStyle(Self.secondaryInk)

                    Text("Documents")
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundStyle(Self.primaryInk)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 14)

            // File List Card: Single rounded bordered card with full-width hairline dividers
            VStack(spacing: 0) {
                // Row 1: My Files
                Button {
                    EvoHaptics.tap()
                    location = .files
                } label: {
                    HStack(spacing: 14) {
                        LibraryArchiveDrawerIconShape()
                            .stroke(Self.primaryInk, style: StrokeStyle(lineWidth: 1.55, lineCap: .round, lineJoin: .round))
                            .frame(width: 19, height: 17)
                            .frame(width: 22, alignment: .center)

                        Text("My Files")
                            .font(.system(size: 16, weight: .regular))
                            .foregroundStyle(Self.primaryInk)

                        Spacer()

                        EvoIcon(systemName: "chevron.right")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.62)
                            .foregroundStyle(Self.secondaryInk)
                    }
                    .padding(.horizontal, 18)
                    .frame(minHeight: 58)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                insetHairlineDivider

                // Row 2: Test / 1 elem
                Button {
                    EvoHaptics.tap()
                    if let testFolder = model.files.first(where: { $0.isDirectory && $0.name == "Test" }) {
                        model.openFolder(testFolder)
                        location = .folder(testFolder.url, testFolder.name)
                    } else if let firstFolder = model.files.first(where: { $0.isDirectory }) {
                        model.openFolder(firstFolder)
                        location = .folder(firstFolder.url, firstFolder.name)
                    }
                } label: {
                    HStack(spacing: 14) {
                        EvoIcon(systemName: "folder")
                            .evoSymbol(.toolbar, weight: .regular)
                            .scaleEffect(0.9)
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 22, alignment: .center)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Test")
                                .font(.system(size: 16, weight: .regular))
                                .foregroundStyle(Self.primaryInk)
                                .lineLimit(1)

                            Text("1 elem")
                                .font(.system(size: 12.5, weight: .regular))
                                .foregroundStyle(Self.secondaryInk)
                        }

                        Spacer()

                        EvoIcon(systemName: "chevron.right")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.62)
                            .foregroundStyle(Self.secondaryInk)
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 13)
                    .frame(minHeight: 62)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                insetHairlineDivider

                // Row 3: Recently Deleted
                Button {
                    EvoHaptics.tap()
                    location = .trash
                } label: {
                    HStack(spacing: 14) {
                        EvoIcon(systemName: "trash")
                            .evoSymbol(.toolbar, weight: .regular)
                            .scaleEffect(0.9)
                            .foregroundStyle(Self.primaryInk)
                            .frame(width: 22, alignment: .center)

                        Text("Recently Deleted")
                            .font(.system(size: 16, weight: .regular))
                            .foregroundStyle(Self.primaryInk)

                        Spacer()

                        EvoIcon(systemName: "chevron.right")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.62)
                            .foregroundStyle(Self.secondaryInk)
                    }
                    .padding(.horizontal, 18)
                    .frame(minHeight: 58)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .background(Color.white, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Self.subtleBorder, lineWidth: 1)
            )
            .padding(.horizontal, 20)
        }
    }

    private var insetHairlineDivider: some View {
        Rectangle()
            .fill(Self.subtleBorder)
            .frame(height: 0.8)
            .padding(.horizontal, 18)
    }

    // MARK: - Quick Action Row: Three equal-width rounded rectangular cards
    // ("New File", "Arlen Send", "Connect") arranged horizontally below header

    private var quickActionsBar: some View {
        HStack(spacing: 12) {
            Button {
                EvoHaptics.tap()
                showNewFileSheet = true
            } label: {
                VStack(spacing: 7) {
                    EvoIcon(systemName: "doc.badge.plus")
                        .evoSymbol(.standard)
                        .foregroundStyle(Self.primaryInk)
                    Text("New File")
                        .font(EvoFont.text(.footnote, weight: .medium))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Self.primaryInk)
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 64)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Self.subtleBorder, lineWidth: 1)
                )
            }
            .buttonStyle(EvoScalePressButtonStyle())

            Button {
                EvoHaptics.tap()
                showArlenSendSheet = true
            } label: {
                VStack(spacing: 7) {
                    EvoIcon(systemName: "paperplane")
                        .evoSymbol(.standard)
                        .foregroundStyle(Self.primaryInk)
                    Text("Arlen Send")
                        .font(EvoFont.text(.footnote, weight: .medium))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Self.primaryInk)
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 64)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Self.subtleBorder, lineWidth: 1)
                )
            }
            .buttonStyle(EvoScalePressButtonStyle())

            Button {
                EvoHaptics.tap()
                showConnectSheet = true
            } label: {
                VStack(spacing: 7) {
                    EvoIcon(systemName: "powerplug")
                        .evoSymbol(.standard)
                        .foregroundStyle(Self.primaryInk)
                    Text("Connect")
                        .font(EvoFont.text(.footnote, weight: .medium))
                        .foregroundStyle(Self.primaryInk)
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: 64)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Self.subtleBorder, lineWidth: 1)
                )
            }
            .buttonStyle(EvoScalePressButtonStyle())
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Bottom Search Bar
    // Floating pill-shaped search input paired with a circular bordered '+' button

    private var bottomSearchShelf: some View {
        HStack(spacing: 12) {
            EvoSearchField(text: $search, focus: $searchFocused)
                // Magnifying glass search input
                .overlay(alignment: .leading) {
                    if false {
                        Image(systemName: "magnifyingglass")
                        TextField("Search", text: $search)
                    }
                }

            Menu {
                Button {
                    EvoHaptics.tap()
                    showNewFileSheet = true
                } label: {
                    EvoSymbolLabel("New File", systemImage: "doc.badge.plus")
                }
                Button {
                    EvoHaptics.tap()
                    creatingFolder = true
                } label: {
                    EvoSymbolLabel("New Folder", systemImage: "folder.badge.plus")
                }
                Button {
                    EvoHaptics.tap()
                    importing = true
                } label: {
                    EvoSymbolLabel("Import File", systemImage: "square.and.arrow.down")
                }
            } label: {
                EvoIcon(systemName: "plus")
                    .evoSymbol(.toolbar, weight: .medium)
                    .foregroundStyle(Self.primaryInk)
                    .frame(width: 52, height: 52)
                    .modifier(EvoNavigationGlass(shape: Circle()))
                    .overlay(Circle().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
            }
            .buttonStyle(EvoScalePressButtonStyle())
            .accessibilityLabel("Add file or folder")
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 10)
    }

    // MARK: - Drill-Down Location & File Browser

    private var drilldownView: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    if location != .home {
                        Button {
                            EvoHaptics.tap()
                            if case .folder = location {
                                if !model.isAtRoot {
                                    model.goToParent()
                                }
                            }
                            location = .home
                        } label: {
                            HStack(spacing: 4) {
                                EvoIcon(systemName: "chevron.left")
                                    .evoSymbol(.toolbar, weight: .semibold)
                                    .scaleEffect(0.75)
                                Text("Locations")
                                    .font(.system(size: 15, weight: .medium))
                            }
                            .foregroundStyle(Self.secondaryInk)
                        }
                        .buttonStyle(.plain)
                    }

                    Spacer()

                    if location == .trash && !model.trashItems.isEmpty {
                        Button("Empty Trash", role: .destructive) {
                            Task { await model.emptyTrash() }
                        }
                        .font(.system(size: 14, weight: .medium))
                    }
                }
                .padding(.top, 6)

                Text(search.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? locationTitle : "Search Results")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Self.primaryInk)

                if location == .trash {
                    if visibleTrashItems.isEmpty {
                        emptyStateCard(icon: "trash", title: "Recently Deleted is empty", subtitle: "Removed files stay recoverable here.")
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(visibleTrashItems.enumerated()), id: \.element.id) { idx, item in
                                HStack(spacing: 14) {
                                    EvoIcon(systemName: item.isDirectory ? "folder" : "doc.text")
                                        .evoSymbol(.toolbar)
                                        .foregroundStyle(Self.secondaryInk)
                                        .frame(width: 24)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.name)
                                            .font(.system(size: 15.5, weight: .medium))
                                            .foregroundStyle(Self.primaryInk)
                                        Text("Deleted \(item.trashedAt.formatted(date: .abbreviated, time: .shortened))")
                                            .font(.system(size: 12.5))
                                            .foregroundStyle(Self.secondaryInk)
                                    }
                                    Spacer()
                                    Button {
                                        Task { await model.restoreFromTrash(item) }
                                    } label: {
                                        EvoIcon(systemName: "arrow.uturn.backward")
                                            .evoSymbol(.toolbar)
                                            .foregroundStyle(Self.primaryInk)
                                            .frame(width: 36, height: 36)
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                if idx < visibleTrashItems.count - 1 {
                                    insetHairlineDivider
                                }
                            }
                        }
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Self.subtleBorder, lineWidth: 1))
                    }
                } else {
                    let list = visibleLocationFiles
                    if list.isEmpty {
                        emptyStateCard(
                            icon: location == .downloads ? "square.and.arrow.down" : "folder",
                            title: location == .downloads ? "No downloads yet" : "Folder is empty",
                            subtitle: "Use New File or the + button below to add items."
                        )
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(list.enumerated()), id: \.element.id) { idx, file in
                                fileBrowserRow(file)
                                if idx < list.count - 1 {
                                    insetHairlineDivider
                                }
                            }
                        }
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Self.subtleBorder, lineWidth: 1))
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 20)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func fileBrowserRow(_ file: LocalLibraryFile) -> some View {
        HStack(spacing: 14) {
            Button {
                EvoHaptics.tap()
                if file.isDirectory {
                    model.openFolder(file)
                    location = .folder(file.url, file.name)
                } else {
                    previewURL = file.url
                }
            } label: {
                HStack(spacing: 14) {
                    EvoIcon(systemName: file.isDirectory ? "folder" : "doc.text")
                        .evoSymbol(.toolbar, weight: .regular)
                        .foregroundStyle(Self.primaryInk)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(file.name)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Self.primaryInk)
                            .lineLimit(1)
                        Text(
                            file.isDirectory
                                ? "\(countItems(in: file.url)) elem"
                                : ByteCountFormatter.string(fromByteCount: file.size, countStyle: .file)
                        )
                        .font(.system(size: 12.5))
                        .foregroundStyle(Self.secondaryInk)
                    }
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Menu {
                Button {
                    selectedSendFile = file.url
                    showShareSheet = true
                } label: {
                    EvoSymbolLabel("Arlen Send", systemImage: "square.and.arrow.up")
                }
                Button(role: .destructive) {
                    Task { await model.moveToTrash(file) }
                } label: {
                    EvoSymbolLabel("Delete", systemImage: "trash")
                }
            } label: {
                EvoIcon(systemName: "ellipsis")
                    .evoSymbol(.toolbar, weight: .medium)
                    .foregroundStyle(Self.secondaryInk)
                    .frame(width: 38, height: 38)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func emptyStateCard(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 10) {
            EvoIcon(systemName: icon)
                .evoSymbol(.standard, weight: .regular)
                .foregroundStyle(Self.secondaryInk)
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Self.primaryInk)
            Text(subtitle)
                .font(.system(size: 13.5))
                .foregroundStyle(Self.secondaryInk)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .padding(.horizontal, 20)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Self.subtleBorder, lineWidth: 1))
    }

    // MARK: - Action Sheets

    private var newFileSheet: some View {
        NavigationStack {
            Form {
                Section("Create Text Note") {
                    TextField("Title (e.g. Notes.txt)", text: $noteTitle)
                        .focused($noteField, equals: .title)
                        .submitLabel(.next)
                        .onSubmit { noteField = .body }
                    TextEditor(text: $noteText)
                        .focused($noteField, equals: .body)
                        .accessibilityLabel("Note text")
                        .frame(minHeight: 160)
                }
                Section {
                    Button {
                        showNewFileSheet = false
                        importing = true
                    } label: {
                        EvoSymbolLabel("Import from iPhone Files", systemImage: "square.and.arrow.down")
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .font(EvoFont.text(.body))
            .navigationTitle("New File")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showNewFileSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        savingNote = true
                        Task {
                            let ok = await model.saveNote(name: noteTitle, text: noteText)
                            savingNote = false
                            if ok {
                                noteTitle = ""
                                noteText = ""
                                showNewFileSheet = false
                            }
                        }
                    }
                    .disabled(noteTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || savingNote)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationCornerRadius(28)
        .presentationDragIndicator(.visible)
    }

    private var arlenSendSheet: some View {
        let sendable = model.files.filter { !$0.isDirectory }
        return NavigationStack {
            List {
                if sendable.isEmpty {
                    Section {
                        Text("Create or import a file first to send it with Arlen Send.")
                            .foregroundStyle(Self.secondaryInk)
                    }
                } else {
                    Section("Select File to Send") {
                        ForEach(sendable) { file in
                            Button {
                                selectedSendFile = file.url
                                showArlenSendSheet = false
                                showShareSheet = true
                            } label: {
                                HStack {
                                    EvoIcon(systemName: "doc.text")
                                        .evoSymbol(.toolbar)
                                        .foregroundStyle(Self.primaryInk)
                                    Text(file.name)
                                        .foregroundStyle(Self.primaryInk)
                                    Spacer()
                                    EvoIcon(systemName: "chevron.right")
                                        .evoSymbol(.toolbar)
                                        .scaleEffect(0.7)
                                        .foregroundStyle(Self.secondaryInk)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Arlen Send")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showArlenSendSheet = false }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationCornerRadius(28)
        .presentationDragIndicator(.visible)
    }

    private var connectServerSheet: some View {
        NavigationStack {
            Form {
                Section("Add Remote Machine") {
                    TextField("Server name", text: $machineName)
                        .textInputAutocapitalization(.words)
                    TextField("https://host.example.com", text: $machineURL)
                        .keyboardType(.URL)
                        .textContentType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if let err = machineError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    Button("Save Connection") {
                        let cleanName = machineName.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !cleanName.isEmpty, let validURL = NativeHTTPSAddress.validatedURL(machineURL) else {
                            machineError = "Enter a name and a valid HTTPS URL."
                            EvoHaptics.failure()
                            return
                        }
                        let newMachine = NativeMachine(id: UUID().uuidString, name: cleanName, url: validURL.absoluteString)
                        machines.append(newMachine)
                        Task {
                            try? await NativeMachineStore.shared.save(machines)
                        }
                        machineName = ""
                        machineURL = ""
                        machineError = nil
                        EvoHaptics.success()
                    }
                    .disabled(machineName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if !machines.isEmpty {
                    Section("Saved Connections") {
                        ForEach(machines) { machine in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(machine.name)
                                    .font(.system(size: 15, weight: .medium))
                                Text(machine.url)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Self.secondaryInk)
                            }
                        }
                        .onDelete { offsets in
                            machines.remove(atOffsets: offsets)
                            Task { try? await NativeMachineStore.shared.save(machines) }
                        }
                    }
                }
            }
            .navigationTitle("Connect")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showConnectSheet = false }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationCornerRadius(28)
        .presentationDragIndicator(.visible)
    }

    // MARK: - Helpers

    private func countItems(in directory: URL) -> Int {
        guard let urls = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return 0 }
        return urls.count
    }

}

private struct LibraryActivityShareView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Custom Crisp Outline Shapes Matching Reference Screenshot

private struct LibraryArchiveDrawerIconShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        var p = Path()
        // Trapezoid top lid
        p.move(to: CGPoint(x: w * 0.08, y: h * 0.44))
        p.addLine(to: CGPoint(x: w * 0.24, y: h * 0.14))
        p.addLine(to: CGPoint(x: w * 0.76, y: h * 0.14))
        p.addLine(to: CGPoint(x: w * 0.92, y: h * 0.44))
        // Front rounded drawer box
        p.addRoundedRect(
            in: CGRect(x: w * 0.08, y: h * 0.44, width: w * 0.84, height: h * 0.46),
            cornerSize: CGSize(width: w * 0.12, height: w * 0.12)
        )
        // Small center handle slot
        p.move(to: CGPoint(x: w * 0.39, y: h * 0.67))
        p.addLine(to: CGPoint(x: w * 0.61, y: h * 0.67))
        return p
    }
}
