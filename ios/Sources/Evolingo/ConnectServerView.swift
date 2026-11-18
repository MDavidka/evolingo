import SwiftUI

/// Screen C: Connect Server View
/// Features a unified EvoSharedTopBar, a top card selector area with a leading partial
/// card (chevron.down) and a primary "Add Server" card, a centered empty state with
/// server rack icon and copy, and a full-width black capsule "+ Add Server" button.
struct ConnectServerView: View {
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void
    var onBack: (() -> Void)? = nil
    var showsBackButton = false

    @ObservedObject private var machineService = NativeMachineService.shared
    @State private var savedMachines: [NativeMachine] = []
    @State private var showAddVM = false
    @State private var showMachineManagement = false

    private static let primaryInk = Color(red: 22.0 / 255, green: 22.0 / 255, blue: 26.0 / 255)
    private static let secondaryInk = Color(red: 138.0 / 255, green: 138.0 / 255, blue: 146.0 / 255)
    private static let subtleBorder = Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255)

    var body: some View {
        VStack(spacing: 0) {
            // Reusable Shared Top Navigation Bar across all 4 screens
            EvoSharedTopBar(
                onOpenSidebar: onOpenSidebar,
                onOpenProfile: onOpenProfile,
                leadingSymbol: showsBackButton ? "chevron.left" : "square.grid.2x2",
                leadingLabel: showsBackButton ? "Back to Library" : "Sidebar navigation"
            ) {
                if !showsBackButton, let onBack {
                    Button(action: onBack) {
                        EvoSymbolLabel("Back to Projects", systemImage: "chevron.left")
                    }
                }

                Button {
                    EvoHaptics.tap()
                    showAddVM = true
                } label: {
                    EvoSymbolLabel("Add Server", systemImage: "plus")
                }

                if !savedMachines.isEmpty {
                    Button {
                        EvoHaptics.tap()
                        showMachineManagement = true
                    } label: {
                        EvoSymbolLabel("Machine Overview", systemImage: "server.rack")
                    }
                }
            }

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    topCardSelectorArea
                        .padding(.top, 24)
                        .padding(.bottom, 32)

                    if savedMachines.isEmpty {
                        centeredServerEmptyState
                            .padding(.top, 56)
                            .padding(.bottom, 40)
                    } else {
                        savedMachinesSection
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .background(Color.white.ignoresSafeArea())
        .sheet(isPresented: $showAddVM) {
            AddVMSheet { machine in
                _ = try? await NativeMachineStore.shared.merge([machine])
                await loadSavedMachines()
            }
            .presentationDetents([.medium, .large])
            .presentationCornerRadius(30)
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showMachineManagement) {
            NavigationStack {
                MachineManagementView(
                    machineService: machineService,
                    onBack: { showMachineManagement = false },
                    onOpenSidebar: onOpenSidebar,
                    onOpenProfile: onOpenProfile
                )
            }
        }
        .task {
            await loadSavedMachines()
        }
    }

    private var topCardSelectorArea: some View {
        Button {
            EvoHaptics.tap()
            showAddVM = true
        } label: {
            VStack(spacing: 10) {
                EvoIcon(systemName: "plus").evoSymbol(.standard)
                Text("Add Server").font(EvoFont.text(.body, weight: .semibold))
            }
            .foregroundStyle(Self.primaryInk)
            .frame(maxWidth: .infinity, minHeight: 142)
            .background(.white, in: RoundedRectangle(cornerRadius: 22))
            .overlay {
                RoundedRectangle(cornerRadius: 22)
                    .strokeBorder(Self.subtleBorder, style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
            }
        }
        .buttonStyle(EvoScalePressButtonStyle())
        .padding(.horizontal, 20)
    }

    // MARK: - Centered Server Empty State
    // Server rack icon, bold heading "Connect a server", two-line description, and "+ Add Server" button

    private var centeredServerEmptyState: some View {
        VStack(spacing: 16) {
            EvoIcon(systemName: "server.rack")
                .evoSymbol(.navigation)
                .foregroundStyle(Self.primaryInk)
                .padding(.bottom, 4)

            Text("Connect a server")
                .font(EvoFont.text(.headline, weight: .bold))
                .foregroundStyle(Self.primaryInk)

            Text("Add a new server to manage your projects and run Cowork tasks remotely.")
                .font(EvoFont.text(.subheadline))
                .foregroundStyle(Self.secondaryInk)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.bottom, 8)

            Button {
                EvoHaptics.tap()
                showAddVM = true
            } label: {
                EvoSymbolLabel("Add Server", systemImage: "plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(EvoButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 28)
    }

    // MARK: - Saved Machines Section (If any configured)

    private var savedMachinesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Connected Machines")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Self.primaryInk)
                .padding(.horizontal, 20)

            VStack(spacing: 0) {
                ForEach(savedMachines) { machine in
                    HStack(spacing: 14) {
                        EvoIcon(systemName: "server.rack")
                            .font(.system(size: 16))
                            .foregroundStyle(Self.primaryInk)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(machine.name)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Self.primaryInk)
                            Text(machine.url)
                                .font(.system(size: 12))
                                .foregroundStyle(Self.secondaryInk)
                        }

                        Spacer()

                        EvoIcon(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Self.secondaryInk)
                    }
                    .padding(.horizontal, 18)
                    .frame(height: 56)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        showMachineManagement = true
                    }
                }
            }
            .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Self.subtleBorder, lineWidth: 1)
            )
            .padding(.horizontal, 20)
        }
    }

    private func loadSavedMachines() async {
        if let loaded = try? await NativeMachineStore.shared.load() {
            savedMachines = loaded
        }
    }
}
