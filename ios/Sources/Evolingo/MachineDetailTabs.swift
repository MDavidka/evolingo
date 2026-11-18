import SwiftUI

/// React Native style top tab bar and swipeable pager with Tabler artwork.
struct MachineDetailTabs: View {
    let service: NativeMachineService
    @Environment(\.dismiss) private var dismiss
    @State private var selection: MachineManagementView.MachineDestination

    init(service: NativeMachineService, initialTab: MachineManagementView.MachineDestination) {
        self.service = service
        _selection = State(initialValue: initialTab)
    }

    var body: some View {
        VStack(spacing: 0) {
            // React Native Header
            reactNativeHeader

            // React Native Horizontal Tab Bar (Replaces iOS bottom UITabBar)
            reactNativeTabBar
                .padding(.vertical, 8)
                .background(Color(uiColor: .systemBackground))

            Divider()
                .opacity(0.35)

            // Horizontal Swipeable Pager (React Native style gesture navigation)
            TabView(selection: $selection) {
                ForEach(MachineManagementView.MachineDestination.allCases) { tab in
                    destination(tab)
                        .tag(tab)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea(edges: .bottom)
        }
        .background(Color(uiColor: .systemBackground).ignoresSafeArea())
        .onChange(of: selection) { _, _ in
            EvoHaptics.selection()
        }
        .accessibilityIdentifier("machine.reactNativeTabs")
    }

    // Top Header with Close and Refresh buttons
    private var reactNativeHeader: some View {
        HStack(spacing: 12) {
            Button {
                EvoHaptics.tap()
                dismiss()
            } label: {
                HStack(spacing: 5) {
                    EvoIcon(systemName: "chevron.left")
                        .font(EvoFont.sized(15, weight: .semibold))
                    Text("Machine")
                        .font(EvoFont.sized(15, weight: .medium))
                }
                .foregroundStyle(EvoTheme.Symbol.primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(uiColor: .secondarySystemBackground))
                .clipShape(Capsule())
            }
            .buttonStyle(.plain)

            Spacer()

            VStack(spacing: 1) {
                Text(selection.title)
                    .font(EvoFont.sized(16, weight: .semibold))
                    .foregroundStyle(EvoTheme.Symbol.primary)

                HStack(spacing: 4) {
                    Circle()
                        .fill(service.isConnected ? Color.green : Color.secondary)
                        .frame(width: 6, height: 6)
                    Text("Ubuntu VPS")
                        .font(EvoFont.sized(11.5, weight: .regular))
                        .foregroundStyle(EvoTheme.Symbol.secondary)
                }
            }

            Spacer()

            Button {
                EvoHaptics.tap()
                Task { await service.fetchMetrics() }
            } label: {
                EvoIcon(systemName: "arrow.clockwise")
                    .font(EvoFont.sized(15, weight: .medium))
                    .foregroundStyle(EvoTheme.Symbol.primary)
                    .frame(width: 32, height: 32)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Refresh")
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 6)
    }

    // React Native Style Horizontal Scrolling Tab Bar with Tabler Icons
    private var reactNativeTabBar: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(MachineManagementView.MachineDestination.allCases) { tab in
                        let isSelected = (selection == tab)
                        Button {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                selection = tab
                            }
                        } label: {
                            HStack(spacing: 6) {
                                EvoIcon(systemName: tab.icon)
                                    .font(EvoFont.sized(14, weight: isSelected ? .semibold : .regular))

                                Text(tab.title)
                                    .font(EvoFont.sized(13.5, weight: isSelected ? .semibold : .medium))
                            }
                            .padding(.horizontal, 13)
                            .padding(.vertical, 7)
                            .background(
                                isSelected ? EvoTheme.Symbol.primary : Color(uiColor: .secondarySystemBackground)
                            )
                            .foregroundStyle(
                                isSelected ? Color(uiColor: .systemBackground) : EvoTheme.Symbol.secondary
                            )
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(isSelected ? Color.clear : Color(uiColor: .separator).opacity(0.4), lineWidth: 0.5)
                            )
                        }
                        .buttonStyle(.plain)
                        .id(tab)
                    }
                }
                .padding(.horizontal, 16)
            }
            .onChange(of: selection) { _, newTab in
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    proxy.scrollTo(newTab, anchor: .center)
                }
            }
        }
    }

    @ViewBuilder
    private func destination(_ tab: MachineManagementView.MachineDestination) -> some View {
        switch tab {
        case .overview: MachineOverviewScreen(service: service)
        case .terminal: MachineTerminalScreen(service: service)
        case .workspaces: MachineWorkspacesScreen(service: service)
        case .storage: MachineStorageScreen(service: service)
        case .network: MachineNetworkScreen(service: service)
        case .environments: MachineEnvironmentsScreen(service: service)
        }
    }
}

struct AddVMSheet: View {
    let onSave: (NativeMachine) async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var address = ""
    @State private var error: String?
    @State private var isSaving = false
    @FocusState private var focusedField: Field?

    private enum Field: Hashable { case name, address }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Machine name").font(EvoFont.text(.subheadline, weight: .medium))
                        TextField("Development VM", text: $name)
                            .focused($focusedField, equals: .name)
                            .textInputAutocapitalization(.words)
                            .submitLabel(.next)
                            .onSubmit { focusedField = .address }
                            .frame(minHeight: 44)
                            .accessibilityLabel("Machine name")
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("HTTPS dashboard or IP").font(EvoFont.text(.subheadline, weight: .medium))
                        TextField("https://vm.example.com", text: $address)
                            .focused($focusedField, equals: .address)
                            .keyboardType(.URL)
                            .textContentType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .submitLabel(.done)
                            .onSubmit { Task { await save() } }
                            .frame(minHeight: 44)
                            .accessibilityLabel("HTTPS dashboard address")
                    }
                } footer: {
                    Text("Add a new VM to Machine. The VM is saved on this iPhone and accessible by swiping left on the Machine tab.")
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(EvoFont.text(.subheadline))
                            .accessibilityIdentifier("machine.addVMError")
                    }
                }
            }
            .disabled(isSaving)
            .font(EvoFont.text(.body))
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Add VM")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.disabled(isSaving)
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    Task { await save() }
                } label: {
                    HStack(spacing: 8) {
                        if isSaving { ProgressView().tint(.white) }
                        Text(isSaving ? "Saving…" : "Add VM")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(EvoButtonStyle())
                .disabled(isSaving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || address.isEmpty)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(.bar)
                .accessibilityIdentifier("machine.saveVM")
            }
        }
        .tint(EvoTheme.Symbol.primary)
        .interactiveDismissDisabled(isSaving)
    }

    @MainActor
    private func save() async {
        guard !isSaving else { return }
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty, cleanName.count <= 80 else {
            error = "Use a machine name between 1 and 80 characters."
            focusedField = .name
            return
        }
        guard let url = NativeHTTPSAddress.validatedURL(address) else {
            error = "Enter an HTTPS dashboard address or valid URL."
            focusedField = .address
            return
        }
        isSaving = true
        defer { isSaving = false }
        let machine = NativeMachine(id: UUID().uuidString, name: cleanName, url: url.absoluteString)
        do {
            let added = try await NativeMachineStore.shared.merge([machine])
            guard added == 1 else {
                error = "This machine is already saved. Swipe through your machines to view it."
                return
            }
            await onSave(machine)
            EvoHaptics.success()
            dismiss()
        } catch {
            self.error = "Couldn’t save the VM. Try again."
            EvoHaptics.failure()
        }
    }
}
