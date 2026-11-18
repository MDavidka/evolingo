import SwiftUI

/// One native glass surface per navigation group; no stacked material backgrounds.
struct EvoNavigationGlass<Surface: InsettableShape>: ViewModifier {
    let shape: Surface
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    @ViewBuilder
    func body(content: Content) -> some View {
        if reduceTransparency {
            content
                .background(EvoTheme.Palette.surface, in: shape)
                .overlay(shape.strokeBorder(EvoTheme.Palette.line, lineWidth: 0.7))
        } else if #available(iOS 26.0, *) {
            content.glassEffect(.regular.interactive(), in: shape)
        } else {
            content
                .background(.regularMaterial, in: shape)
                .overlay(shape.strokeBorder(EvoTheme.Palette.line.opacity(0.7), lineWidth: 0.7))
        }
    }
}

/// The floating field surface stays within the control, leaving the scroll content unshaded.
struct EvoInputSurface<Surface: InsettableShape>: ViewModifier {
    let shape: Surface

    func body(content: Content) -> some View {
        content
            .modifier(EvoNavigationGlass(shape: shape))
            .overlay {
                shape.strokeBorder(EvoTheme.Palette.line, lineWidth: 1)
                    .allowsHitTesting(false)
            }
    }
}

struct EvoSearchField: View {
    var prompt = "Search"
    @Binding var text: String
    let focus: FocusState<Bool>.Binding

    var body: some View {
        HStack(spacing: 8) {
            EvoIcon(systemName: "magnifyingglass")
                .evoSymbol(.toolbar)
                .foregroundStyle(EvoTheme.Symbol.secondary)
                .accessibilityHidden(true)

            TextField(prompt, text: $text)
                .textFieldStyle(.plain)
                .font(EvoFont.text(.body))
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused(focus)
                .submitLabel(.search)
                .onSubmit { focus.wrappedValue = false }
                .frame(minHeight: 44)
                .accessibilityLabel(prompt)

            if !text.isEmpty {
                Button {
                    EvoHaptics.tap()
                    text = ""
                } label: {
                    EvoIcon(systemName: "xmark.circle.fill")
                        .evoSymbol(.toolbar)
                        .foregroundStyle(EvoTheme.Symbol.secondary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.leading, 16)
        .padding(.trailing, 6)
        .frame(minHeight: 52)
        .modifier(EvoInputSurface(shape: Capsule()))
    }
}
