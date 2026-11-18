import SwiftUI
import UIKit

struct ChatLayerSidebarView: View {
    @ObservedObject var model: ChatModel
    let cowork: Bool
    var activeTab: NativeTab = .chat
    let navigate: (NativeTab) -> Void
    let onClose: () -> Void

    @AppStorage("native.arlen.pinned.chats") private var pinnedChatIDsJSON = "[]"
    @State private var searchOpen = false
    @State private var searchText = ""
    @FocusState private var searchFocused: Bool
    @AppStorage("native.evolingo.profile.name") private var displayName = "Arlen vendég"

    private var pinnedChatIDs: [String] {
        guard let data = pinnedChatIDsJSON.data(using: .utf8),
              let ids = try? JSONDecoder().decode([String].self, from: data) else { return [] }
        return ids
    }

    private func toggleChatPin(_ id: String) {
        var ids = pinnedChatIDs
        if let idx = ids.firstIndex(of: id) {
            ids.remove(at: idx)
        } else {
            ids.append(id)
        }
        if let data = try? JSONEncoder().encode(ids), let json = String(data: data, encoding: .utf8) {
            pinnedChatIDsJSON = json
        }
    }

    private var pinnedSessions: [ChatSession] {
        let ids = Set(pinnedChatIDs)
        return filteredSessions.filter { ids.contains($0.id.uuidString) }
    }

    private var recentSessions: [ChatSession] {
        let ids = Set(pinnedChatIDs)
        return filteredSessions.filter { !ids.contains($0.id.uuidString) }
    }

    private var filteredSessions: [ChatSession] {
        let base = model.sessions.filter { !$0.messages.isEmpty }
        if searchText.trimmingCharacters(in: .whitespaces).isEmpty {
            return base
        }
        return base.filter {
            $0.title.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top Header: Arlen Title + 44pt Search Circle Button
            HStack {
                Text("Arlen")
                    .font(EvoFont.text(.title2, weight: .bold))
                    .foregroundStyle(EvoTheme.Palette.ink)
                Spacer()
                Button {
                    EvoHaptics.tap()
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.85)) {
                        searchOpen.toggle()
                        if !searchOpen { searchText = "" }
                    }
                } label: {
                    EvoIcon(systemName: searchOpen ? "xmark" : "magnifyingglass")
                        .evoSymbol(.navigation, weight: .medium)
                        .foregroundStyle(EvoTheme.Palette.ink)
                        .frame(width: 44, height: 44)
                        .background(Color.white, in: Circle())
                        .overlay(Circle().stroke(EvoTheme.Palette.line, lineWidth: 1))
                        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 1)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Beszélgetések keresése")
            }
            .padding(.horizontal, 20)
            .padding(.top, 60)
            .padding(.bottom, 12)

            if searchOpen {
                EvoSearchField(prompt: "Search conversations…", text: $searchText, focus: $searchFocused)
                .padding(.horizontal, 18)
                .padding(.bottom, 12)
            }

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    // Primary Navigation Rows
                    VStack(spacing: 2) {
                        sidebarNavRow(title: "Chat", symbol: "bubble.left.and.bubble.right", tab: .chat)
                        sidebarNavRow(title: "Cowork", symbol: "macwindow.on.rectangle", tab: .cowork)
                        sidebarNavRow(title: "Schedule", symbol: "calendar", tab: .schedule)
                        sidebarNavRow(title: "Library", symbol: "folder", tab: .library)
                        sidebarNavRow(title: "Plugins", symbol: "puzzle", tab: .plugins)
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 18)

                    // Pinned Section (only shown when user has pinned conversations)
                    if !pinnedSessions.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Pinned")
                                .font(EvoFont.text(.footnote, weight: .semibold))
                                .foregroundStyle(EvoTheme.Palette.ink)
                                .padding(.horizontal, 22)

                            ForEach(pinnedSessions) { session in
                                Button {
                                    EvoHaptics.tap()
                                    model.select(session)
                                    navigate(.chat)
                                    onClose()
                                } label: {
                                    HStack(spacing: 12) {
                                        EvoIcon(systemName: "pin")
                                            .evoSymbol(.toolbar, weight: .medium)
                                            .foregroundStyle(EvoTheme.Palette.ink)
                                            .frame(width: 22)
                                        Text(session.title)
                                            .font(EvoFont.text(.body, weight: .regular))
                                            .foregroundStyle(EvoTheme.Palette.ink)
                                            .lineLimit(1)
                                        Spacer()
                                    }
                                    .padding(.horizontal, 14)
                                    .frame(minHeight: 44)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal, 14)
                                .contextMenu {
                                    Button("Unpin") { toggleChatPin(session.id.uuidString) }
                                }
                            }
                        }
                        .padding(.bottom, 14)
                    }

                    // Recents Section
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Recents")
                            .font(EvoFont.text(.footnote, weight: .semibold))
                            .foregroundStyle(EvoTheme.Palette.ink)
                            .padding(.horizontal, 22)

                        LazyVStack(spacing: 3) {
                            if recentSessions.isEmpty && pinnedSessions.isEmpty {
                                Text(searchText.trimmingCharacters(in: .whitespaces).isEmpty ? "No conversations yet." : "No matching conversations.")
                                    .font(EvoFont.text(.footnote))
                                    .foregroundStyle(EvoTheme.Palette.secondary)
                                    .padding(.horizontal, 22)
                                    .padding(.vertical, 8)
                            } else {
                                ForEach(recentSessions) { session in
                                    let isSelected = session.id == model.currentSessionID && activeTab == .chat
                                    Button {
                                        EvoHaptics.tap()
                                        model.select(session)
                                        navigate(.chat)
                                        onClose()
                                    } label: {
                                        HStack {
                                            Text(session.title)
                                                .font(EvoFont.text(.body, weight: isSelected ? .medium : .regular))
                                                .foregroundStyle(EvoTheme.Palette.ink)
                                                .lineLimit(1)
                                            Spacer()
                                        }
                                        .padding(.horizontal, 14)
                                        .frame(minHeight: 46)
                                        .background(
                                            isSelected ? Color(red: 0xF3 / 255.0, green: 0xF3 / 255.0, blue: 0xF5 / 255.0) : Color.clear,
                                            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .contextMenu {
                                        Button("Pin") { toggleChatPin(session.id.uuidString) }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 14)
                    }
                }
                .padding(.bottom, 100)
            }

            Spacer(minLength: 0)
        }
        .overlay(alignment: .bottom) {
            // Bottom Floating Controls (Left Blue "Chat" Pill + Right Avatar Circle)
            HStack(spacing: 12) {
                Button {
                    EvoHaptics.tap()
                    model.newConversation()
                    navigate(.chat)
                    onClose()
                } label: {
                    HStack(spacing: 8) {
                        EvoIcon(systemName: "square.and.pencil")
                            .evoSymbol(.toolbar, weight: .semibold)
                            .foregroundStyle(.white)
                        Text("Chat")
                            .font(EvoFont.text(.body, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 22)
                    .frame(height: 50)
                    .background(Color(red: 0x32 / 255.0, green: 0x65 / 255.0, blue: 0xEB / 255.0), in: Capsule())
                    .shadow(color: Color(red: 0x1E / 255.0, green: 0x43 / 255.0, blue: 0x9E / 255.0).opacity(0.26), radius: 12, x: 0, y: 6)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Start new chat")

                Spacer()

                Button {
                    EvoHaptics.tap()
                    navigate(.profile)
                    onClose()
                } label: {
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 48, height: 48)
                            .overlay(Circle().stroke(EvoTheme.Palette.line, lineWidth: 1))
                            .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 3)
                        NativeAvatarView(model: .shared, size: 34)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Profil: \(displayName)")
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 34)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func sidebarNavRow(title: String, symbol: String, tab: NativeTab) -> some View {
        let isSelected = activeTab == tab
        return Button {
            EvoHaptics.tap()
            navigate(tab)
        } label: {
            HStack(spacing: 14) {
                EvoIcon(systemName: symbol)
                    .evoSymbol(.standard, weight: .medium)
                    .foregroundStyle(EvoTheme.Palette.ink)
                    .frame(width: 26, height: 26)
                    .accessibilityHidden(true)
                Text(title)
                    .font(EvoFont.text(.body, weight: isSelected ? .semibold : .medium))
                    .foregroundStyle(EvoTheme.Palette.ink)
                Spacer()
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 48)
            .background(
                isSelected ? Color(red: 0xF3 / 255.0, green: 0xF3 / 255.0, blue: 0xF5 / 255.0) : Color.clear,
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
