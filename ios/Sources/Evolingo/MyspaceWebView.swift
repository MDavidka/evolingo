import SwiftUI
import WebKit
struct NativeMyspacePin: Codable, Identifiable { var id: String; var name: String; var icon: String? = nil
    var symbol: String {
        switch icon {
        case "books": return "books.vertical"
        case "sliders": return "slider.horizontal.2"
        case "checklist", "focus-board": return "list.bullet.rectangle"
        case "terminal": return "terminal"
        case "code", "api-inspector": return "chevron.left.forwardslash.chevron.right"
        case "chart": return "chart.bar"
        default: return "doc.text"
        }
    }
}
struct MyspaceWebView: UIViewRepresentable {
    let launchID: String
    @Binding var loading: Bool
    @Binding var error: String?
    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(context.coordinator, name: "myspacePins")
        let script = """
        document.documentElement.dataset.nativeMyspace='true';
        const css=document.createElement('style');css.textContent='.evo-sidebar-host{display:none!important}.myspace-page{padding-top:0!important}';document.documentElement.appendChild(css);
        let refreshing=false;
        async function publishPins(){if(refreshing)return;refreshing=true;try{const r=await fetch('/api/myspace',{cache:'no-store'});if(!r.ok)return;const d=await r.json();window.webkit.messageHandlers.myspacePins.postMessage(d.installations.filter(x=>x.pinned).map(x=>({id:x.appId,name:x.name||x.appId,icon:x.icon||x.appId})));}catch{}finally{refreshing=false}}
        addEventListener('myspace:changed',publishPins);addEventListener('DOMContentLoaded',publishPins);
        """
        config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = true
        web.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.load(web, id: launchID)
        return web
    }
    func updateUIView(_ view: WKWebView, context: Context) {
        context.coordinator.parent = self
        if context.coordinator.launchID != launchID { context.coordinator.load(view, id: launchID) }
    }
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "myspacePins")
        view.navigationDelegate = nil; view.stopLoading()
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: MyspaceWebView
        var launchID = ""
        init(parent: MyspaceWebView) { self.parent = parent }
        func load(_ web: WKWebView, id: String) {
            launchID = id
            let suffix: String
            if ["notes", "focus-board", "api-inspector"].contains(id) {
                suffix = "?app=\(id)"
            } else if !id.isEmpty {
                suffix = "?project=\(id)"
            } else {
                suffix = ""
            }
            if let url = URL(string: "https://api.sycord.site/myspace" + suffix) { web.load(URLRequest(url: url)) }
        }
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { parent.loading = true; parent.error = nil }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { parent.loading = false }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { parent.loading = false; parent.error = "Myspace could not connect. Check your connection and retry." }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { parent.loading = false; parent.error = "Myspace could not finish loading." }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { parent.loading = false; parent.error = "Myspace stopped. Reload to continue." }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = action.request.url else { return .cancel }
            if action.targetFrame?.isMainFrame == false { return url.scheme == "about" ? .allow : .cancel }
            return url.scheme == "https" && url.host == "api.sycord.site" && url.path == "/myspace" ? .allow : .cancel
        }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == "api.sycord.site", message.frameInfo.securityOrigin.protocol == "https", let items = message.body as? [[String: String]], items.count <= 50 else { return }
            let pins = items.compactMap { item -> NativeMyspacePin? in
                guard let id = item["id"], ["notes", "focus-board", "api-inspector"].contains(id), let name = item["name"], !name.isEmpty, name.count <= 48 else { return nil }
                return NativeMyspacePin(id: id, name: name, icon: item["icon"])
            }
            if let data = try? JSONEncoder().encode(pins), let json = String(data: data, encoding: .utf8) { UserDefaults.standard.set(json, forKey: "native.evolingo.myspace.pins") }
        }
    }
}
