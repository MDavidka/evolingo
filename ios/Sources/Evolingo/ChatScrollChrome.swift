import SwiftUI

/// Standard scroll clipping so text never bleeds into the top status bar / Dynamic Island.
struct ChatScrollEdge: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        content
    }
}

struct ChatTopBar<Header: View>: ViewModifier {
    let header: Header

    @ViewBuilder
    func body(content: Content) -> some View {
        VStack(spacing: 0) {
            header
                .background(Color(uiColor: .systemBackground).ignoresSafeArea(.container, edges: .top))
            content
        }
    }
}
