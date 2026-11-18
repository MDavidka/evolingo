import SwiftUI
import WebKit

struct ReactProfile: UIViewRepresentable {
    let state: [String: Any]
    let action: (String, String?) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(action: action) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "profile")
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.state = state
        if let url = Bundle.module.url(forResource: "Profile", withExtension: "html") {
            view.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        context.coordinator.webView = view
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {
        context.coordinator.action = action
        context.coordinator.state = state
        context.coordinator.send()
    }
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "profile")
        view.navigationDelegate = nil
    }
    @MainActor final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        var action: (String, String?) -> Void
        var state: [String: Any] = [:]
        weak var webView: WKWebView?
        var ready = false
        var lastJSON = ""
        init(action: @escaping (String, String?) -> Void) { self.action = action }
        func send() {
            guard ready, let data = try? JSONSerialization.data(withJSONObject: state),
                  let json = String(data: data, encoding: .utf8), json != lastJSON else { return }
            lastJSON = json
            webView?.evaluateJavaScript("window.receiveProfile(\(json))", completionHandler: nil)
        }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any], let name = body["action"] as? String else { return }
            if name == "ready" { ready = true; send() } else { action(name, body["value"] as? String) }
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            navigationAction.request.url?.isFileURL == true ? .allow : .cancel
        }
    }
}
