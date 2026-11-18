import SwiftUI

/// Unified top navigation bar reused across Screen A, Screen B, Screen C, and Screen D.
/// Provides a circular 44x44pt grid navigation button on the left and a capsule container
/// with horizontal ellipsis menu and circular user avatar on the right.
struct EvoSharedTopBar<MenuContent: View>: View {
    let onOpenSidebar: () -> Void
    let onOpenProfile: () -> Void
    let leadingSymbol: String
    let leadingLabel: String
    @ViewBuilder var menuContent: () -> MenuContent

    init(
        onOpenSidebar: @escaping () -> Void,
        onOpenProfile: @escaping () -> Void,
        leadingSymbol: String = "square.grid.2x2",
        leadingLabel: String = "Sidebar navigation",
        @ViewBuilder menuContent: @escaping () -> MenuContent
    ) {
        self.onOpenSidebar = onOpenSidebar
        self.onOpenProfile = onOpenProfile
        self.leadingSymbol = leadingSymbol
        self.leadingLabel = leadingLabel
        self.menuContent = menuContent
    }

    var body: some View {
        HStack(spacing: 16) {
            // Left: Circular bordered button containing 2x2 grid icon (44x44 touch frame)
            Button {
                EvoHaptics.tap()
                onOpenSidebar()
            } label: {
                EvoIcon(systemName: leadingSymbol)
                    .evoSymbol(.navigation, weight: .medium)
                    .evoIconTarget()
                    .frame(width: 44, height: 44)
                    .modifier(EvoNavigationGlass(shape: Circle()))
                    .overlay(Circle().stroke(Color(red: 230.0 / 255, green: 230.0 / 255, blue: 236.0 / 255), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(leadingLabel)

            Spacer(minLength: 0)

            // Right: Pill-shaped bordered container with ellipsis menu and avatar
            HStack(spacing: 0) {
                Menu {
                    menuContent()
                } label: {
                    EvoIcon(systemName: "ellipsis")
                        .evoSymbol(.navigation, weight: .medium)
                        .evoIconTarget()
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Options")

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
        .foregroundStyle(EvoTheme.Palette.ink)
        .padding(.horizontal, 20)
        .padding(.top, 60)
        .padding(.bottom, 12)
        .background(Color.white.ignoresSafeArea(edges: .top))
    }
}

extension EvoSharedTopBar where MenuContent == EmptyView {
    init(onOpenSidebar: @escaping () -> Void, onOpenProfile: @escaping () -> Void) {
        self.init(onOpenSidebar: onOpenSidebar, onOpenProfile: onOpenProfile) {
            EmptyView()
        }
    }
}
