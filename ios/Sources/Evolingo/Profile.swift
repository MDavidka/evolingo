import SwiftUI
import UIKit
import UserNotifications
import UniformTypeIdentifiers
import PhotosUI

struct ProfileView: View {
    var onBack: (() -> Void)? = nil
    @AppStorage("native.evolingo.profile.name") private var displayName = "Arlen User"
    @ObservedObject private var avatarModel = NativeAvatarModel.shared
    @AppStorage("native.evolingo.appearance") private var appearance = "system"
    @AppStorage("native.evolingo.reduce-motion") private var reduceMotion = false
    @AppStorage("native.evolingo.haptics.enabled") private var hapticsEnabled = true
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var choosingAvatar = false
    @State private var editingName = false
    @State private var draftName = ""
    @State private var showingAbout = false
    @State private var notificationStatus = "Checking…"
    @State private var notificationRequesting = false
    @State private var importingTransfer = false
    @State private var transferAlert = false
    @State private var transferMessage = ""
    @State private var selectedAvatar: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 0) {
            ReactProfile(state: [
                "name": displayName, "appearance": appearance,
                "reduceMotion": reduceMotion, "haptics": hapticsEnabled,
                "notifications": notificationStatus, "version": appVersion,
                "avatar": avatarModel.image?.jpegData(compressionQuality: 0.7).map { "data:image/jpeg;base64," + $0.base64EncodedString() } ?? ""
            ]) { action, value in
                switch action {
                case "back": onBack?()
                case "name": draftName = displayName; editingName = true
                case "photo": choosingAvatar = true
                case "appearance": if let value, ["system", "light", "dark"].contains(value) { appearance = value; EvoHaptics.selection() }
                case "reduceMotion": reduceMotion = value == "true"
                case "haptics": hapticsEnabled = value == "true"; if hapticsEnabled { EvoHaptics.prepare(); EvoHaptics.tap() }
                case "notifications": Task { await requestNotificationPermission() }
                case "import": importingTransfer = true
                case "settings": if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                case "about": showingAbout = true
                default: break
                }
            }
            .padding(.top, 58)
            .photosPicker(isPresented: $choosingAvatar, selection: $selectedAvatar, matching: .images)
            .sheet(isPresented: $editingName) {
                NavigationStack {
                    Form {
                        Section("Display Name") {
                            TextField("Name", text: $draftName)
                                .textInputAutocapitalization(.words)
                                .autocorrectionDisabled(false)
                        }
                    }
                    .navigationTitle("Edit Profile")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { editingName = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Save") {
                                let value = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !value.isEmpty else { return }
                                displayName = String(value.prefix(32))
                                EvoHaptics.success()
                                editingName = false
                            }
                            .disabled(draftName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                    }
                }
                .presentationDetents([.medium])
            }
            .sheet(isPresented: $showingAbout) {
                NavigationStack {
                    List {
                        Section("Native Capabilities") {
                            EvoSymbolLabel("AI Chat with On-Device Storage", systemImage: "bubble.left.and.bubble.right")
                            EvoSymbolLabel("Cowork & Project Automation", systemImage: "cup.and.saucer.fill")
                            EvoSymbolLabel("Schedule & Background Tasks", systemImage: "calendar")
                            EvoSymbolLabel("Library Documents & Quick Look", systemImage: "folder")
                        }
                        Section("Privacy & Security") {
                            Text("All conversations, tasks, library documents, and preferences are stored locally on your device. Requests to the AI engine are transmitted securely over HTTPS.")
                                .font(EvoFont.text(.subheadline))
                                .foregroundStyle(EvoTheme.Symbol.secondary)
                        }
                        Section("Open Source Licenses") {
                            Link("Tabler Icons · MIT License", destination: URL(string: "https://github.com/tabler/tabler-icons")!)
                            Link("Inter Font · SIL Open Font License", destination: URL(string: "https://github.com/rsms/inter")!)
                        }
                    }
                    .navigationTitle("About Arlen")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Done") { showingAbout = false }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .task { await refreshNotificationStatus() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await refreshNotificationStatus() } }
            }
            .onChange(of: selectedAvatar) { _, item in
                guard let item else { return }
                Task {
                    do {
                        if let data = try await item.loadTransferable(type: Data.self) {
                            await setAvatar(data)
                        } else {
                            transferMessage = "Could not load selected photo."
                            transferAlert = true
                            EvoHaptics.failure()
                        }
                    } catch {
                        transferMessage = "Failed to select profile image."
                        transferAlert = true
                        EvoHaptics.failure()
                    }
                    selectedAvatar = nil
                }
            }
            .fileImporter(isPresented: $importingTransfer, allowedContentTypes: [.json], allowsMultipleSelection: false) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    Task {
                        do {
                            let summary = try await NativeDataTransfer.importPackage(from: url)
                            transferMessage = summary.message
                            EvoHaptics.success()
                        } catch {
                            transferMessage = error.localizedDescription
                            EvoHaptics.failure()
                        }
                        transferAlert = true
                    }
                case .failure:
                    transferMessage = "File selection was cancelled or failed."
                    transferAlert = true
                    EvoHaptics.failure()
                }
            }
            .alert("Data Transfer", isPresented: $transferAlert) {
                Button("OK", role: .cancel) { }
            } message: { Text(transferMessage) }
        }
    }

    private func setAvatar(_ data: Data) async {
        guard await avatarModel.setImage(from: data) else {
            transferMessage = "Profile picture could not be compressed under 512 KB."
            transferAlert = true
            EvoHaptics.failure()
            return
        }
        EvoHaptics.success()
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.1"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "75"
        return "\(version) (\(build))"
    }

    private func refreshNotificationStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral: notificationStatus = "Enabled"
        case .denied: notificationStatus = "Disabled"
        case .notDetermined: notificationStatus = "Not configured"
        @unknown default: notificationStatus = "Unknown"
        }
    }

    private func requestNotificationPermission() async {
        guard !notificationRequesting else { return }
        notificationRequesting = true
        defer { notificationRequesting = false }
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            await refreshNotificationStatus()
            if granted { EvoHaptics.success() } else { EvoHaptics.warning() }
        } catch {
            notificationStatus = "Failed"
            EvoHaptics.failure()
        }
    }
}
