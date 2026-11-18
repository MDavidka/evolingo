import SwiftUI
import Combine

// MARK: - Arlen Native iOS Component Library (60+ Topics & Variants)

struct ArlenUIAction: Decodable {
    let type: String
    let key: String?
    let listKey: String?
    let fromKey: String?
    let value: ArlenAnyCodable?
    let by: Double?
    let min: Double?
    let max: Double?
    let index: Int?
    let id: String?
    let field: String?
}

struct ArlenUIListItemSpec: Decodable {
    let id: String?
    let title: String
    let subtitle: String?
    let value: String?
    let done: Bool?
    let badge: String?
}

struct ArlenUINode: Decodable, Identifiable {
    var id: String { nodeId ?? "\(type)-\(title ?? label ?? text ?? UUID().uuidString)" }
    let nodeId: String?
    let type: String
    let variant: String?
    let label: String?
    let title: String?
    let subtitle: String?
    let text: String?
    let placeholder: String?
    let value: ArlenAnyCodable?
    let stateKey: String?
    let listKey: String?
    let options: [String]?
    let min: Double?
    let max: Double?
    let step: Double?
    let icon: String?
    let badge: String?
    let progress: Double?
    let data: [Double]?
    let items: [ArlenUIListItemSpec]?
    let action: ArlenUIAction?
    let children: [ArlenUINode]?

    enum CodingKeys: String, CodingKey {
        case nodeId = "id"
        case type, variant, label, title, subtitle, text, placeholder, value
        case stateKey, listKey, options, min, max, step, icon, badge, progress, data, items, action, children
    }
}

struct ArlenAppManifest: Decodable {
    let schema: String?
    let title: String
    let subtitle: String?
    let initialState: [String: ArlenAnyCodable]?
    let nodes: [ArlenUINode]
}

enum ArlenAnyCodable: Decodable, Equatable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case list([ArlenRuntimeListItem])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let b = try? container.decode(Bool.self) {
            self = .bool(b)
        } else if let n = try? container.decode(Double.self) {
            self = .number(n)
        } else if let s = try? container.decode(String.self) {
            self = .string(s)
        } else if let arr = try? container.decode([ArlenRuntimeListItem].self) {
            self = .list(arr)
        } else if let strArr = try? container.decode([String].self) {
            self = .list(strArr.enumerated().map { ArlenRuntimeListItem(id: "\($0.offset)", title: $0.element, done: false) })
        } else {
            self = .null
        }
    }

    var stringValue: String {
        switch self {
        case .string(let s): return s
        case .number(let n): return n.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(n)) : String(format: "%.1f", n)
        case .bool(let b): return b ? "true" : "false"
        case .list(let arr): return String(arr.count)
        case .null: return ""
        }
    }

    var doubleValue: Double {
        switch self {
        case .number(let n): return n
        case .string(let s): return Double(s) ?? 0
        case .bool(let b): return b ? 1 : 0
        default: return 0
        }
    }

    var boolValue: Bool {
        switch self {
        case .bool(let b): return b
        case .number(let n): return n != 0
        case .string(let s): return !s.isEmpty && s != "false" && s != "0"
        case .list(let l): return !l.isEmpty
        case .null: return false
        }
    }
}

struct ArlenRuntimeListItem: Decodable, Identifiable, Equatable {
    let id: String
    var title: String
    var done: Bool
}

// MARK: - Native In-App Mini-App Renderer

struct ArlenMiniAppView: View {
    let files: [String: String]
    let projectName: String
    let description: String

    @State private var state: [String: ArlenAnyCodable] = [:]
    @State private var loadedKey = ""

    private var manifest: ArlenAppManifest {
        if let json = files["src/app.ui.json"],
           let data = json.data(using: .utf8),
           let decoded = try? JSONDecoder().decode(ArlenAppManifest.self, from: data),
           !decoded.nodes.isEmpty {
            return decoded
        }
        return Self.parseTsxFallback(source: files["src/App.tsx"] ?? "", title: projectName, description: description)
    }

    var body: some View {
        let currentManifest = manifest
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(currentManifest.nodes.enumerated()), id: \.offset) { _, node in
                    ArlenNodeRenderer(
                        node: node,
                        state: $state,
                        onAction: { action in
                            performAction(action, initial: currentManifest.initialState ?? [:])
                        }
                    )
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 36)
        }
        .background(Color.white)
        .onAppear {
            syncInitialState(currentManifest)
        }
        .onChange(of: files["src/app.ui.json"]) { _, _ in
            syncInitialState(manifest)
        }
    }

    private func syncInitialState(_ m: ArlenAppManifest) {
        let key = "\(m.title)|\(files["src/app.ui.json"]?.count ?? 0)|\(files["src/App.tsx"]?.count ?? 0)"
        guard key != loadedKey else { return }
        loadedKey = key
        state = m.initialState ?? [:]
    }

    private func performAction(_ action: ArlenUIAction?, initial: [String: ArlenAnyCodable]) {
        guard let action else { return }
        EvoHaptics.tap()
        switch action.type {
        case "set":
            if let k = action.key, let v = action.value {
                state[k] = v
            }
        case "toggle":
            if let k = action.key {
                let cur = state[k]?.boolValue ?? false
                state[k] = .bool(!cur)
            }
        case "increment":
            if let k = action.key {
                let cur = state[k]?.doubleValue ?? 0
                var next = cur + (action.by ?? 1)
                if let maxV = action.max { next = min(maxV, next) }
                state[k] = .number(next)
            }
        case "decrement":
            if let k = action.key {
                let cur = state[k]?.doubleValue ?? 0
                var next = cur - (action.by ?? 1)
                if let minV = action.min { next = max(minV, next) }
                state[k] = .number(next)
            }
        case "append":
            if let listKey = action.listKey {
                var current: [ArlenRuntimeListItem] = {
                    if case .list(let items) = state[listKey] { return items }
                    return []
                }()
                let text: String = {
                    if let fk = action.fromKey {
                        return state[fk]?.stringValue.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                    }
                    return action.value?.stringValue.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                }()
                guard !text.isEmpty else { return }
                current.insert(ArlenRuntimeListItem(id: UUID().uuidString, title: text, done: false), at: 0)
                state[listKey] = .list(current)
                if let fk = action.fromKey {
                    state[fk] = .string("")
                }
            }
        case "remove":
            if let listKey = action.listKey, case .list(var items) = state[listKey] {
                if let idx = action.index, items.indices.contains(idx) {
                    items.remove(at: idx)
                } else if let targetId = action.id {
                    items.removeAll { $0.id == targetId }
                }
                state[listKey] = .list(items)
            }
        case "toggleListItem":
            if let listKey = action.listKey, case .list(var items) = state[listKey] {
                if let idx = action.index, items.indices.contains(idx) {
                    items[idx].done.toggle()
                }
                state[listKey] = .list(items)
            }
        case "reset":
            state = initial
        default:
            break
        }
    }

    private static func parseTsxFallback(source: String, title: String, description: String) -> ArlenAppManifest {
        var nodes: [ArlenUINode] = []
        let headline: String = {
            if let range = source.range(of: "<h1>([^<{]+)</h1>", options: .regularExpression) {
                let inner = String(source[range])
                    .replacingOccurrences(of: "<h1>", with: "")
                    .replacingOccurrences(of: "</h1>", with: "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                if !inner.isEmpty { return inner }
            }
            return title.isEmpty ? "Here is an app" : title
        }()
        nodes.append(ArlenUINode(
            nodeId: "h1", type: "Heading", variant: "h1", label: nil, title: nil, subtitle: nil,
            text: headline, placeholder: nil, value: nil, stateKey: nil, listKey: nil, options: nil,
            min: nil, max: nil, step: nil, icon: nil, badge: nil, progress: nil, data: nil, items: nil,
            action: nil, children: nil
        ))
        if !description.isEmpty {
            nodes.append(ArlenUINode(
                nodeId: "desc", type: "Text", variant: "muted", label: nil, title: nil, subtitle: nil,
                text: description, placeholder: nil, value: nil, stateKey: nil, listKey: nil, options: nil,
                min: nil, max: nil, step: nil, icon: nil, badge: nil, progress: nil, data: nil, items: nil,
                action: nil, children: nil
            ))
        }
        return ArlenAppManifest(schema: "arlen-app/v1", title: title, subtitle: description, initialState: [:], nodes: nodes)
    }
}

// MARK: - Component Topic Renderer

private struct ArlenNodeRenderer: View {
    let node: ArlenUINode
    @Binding var state: [String: ArlenAnyCodable]
    let onAction: (ArlenUIAction?) -> Void

    @State private var expanded = false

    private static let ink = Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255)
    private static let secondary = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255)
    private static let surface = Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255)
    private static let border = Color(red: 229.0 / 255, green: 229.0 / 255, blue: 234.0 / 255)
    private static let blue = Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255)

    private func resolve(_ raw: String?) -> String {
        guard let raw else { return "" }
        var output = raw
        let pattern = #"\{\{([a-zA-Z0-9_.-]+)\}\}"#
        if let regex = try? NSRegularExpression(pattern: pattern) {
            let matches = regex.matches(in: raw, range: NSRange(raw.startIndex..., in: raw))
            for m in matches.reversed() {
                if let full = Range(m.range(at: 0), in: raw),
                   let keyRange = Range(m.range(at: 1), in: raw) {
                    let key = String(raw[keyRange])
                    let val = state[key]?.stringValue ?? "0"
                    output.replaceSubrange(full, with: val)
                }
            }
        }
        return output
    }

    var body: some View {
        let v = node.variant ?? "default"
        let title = resolve(node.title)
        let label = resolve(node.label)
        let subtitle = resolve(node.subtitle)
        let text = resolve(node.text)

        switch node.type {
        case "AppShell", "Container", "ScrollArea", "Stack":
            VStack(alignment: .leading, spacing: v == "tight" ? 6 : (v == "relaxed" ? 18 : 12)) {
                childrenView
            }
        case "Row", "ActionGroup":
            HStack(spacing: 10) {
                childrenView
            }
        case "Grid", "SplitPanel":
            let cols = v == "3col" ? 3 : 2
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: cols), spacing: 10) {
                childrenView
            }
        case "Section":
            VStack(alignment: .leading, spacing: 10) {
                if !title.isEmpty {
                    Text(title)
                        .font(EvoFont.sized(13, weight: .semibold, relativeTo: .caption))
                        .foregroundStyle(Self.secondary)
                }
                childrenView
            }
            .padding(v == "grouped" ? 14 : 0)
            .background(v == "grouped" ? Self.surface : Color.clear, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        case "Divider":
            Rectangle().fill(Self.border).frame(height: 1)
        case "Spacer":
            Spacer().frame(height: v == "lg" ? 20 : (v == "sm" ? 6 : 12))

        case "Heading":
            Text(text.isEmpty ? title : text)
                .font(EvoFont.sized(v == "h3" ? 16 : (v == "h2" ? 19 : 24), weight: .bold, relativeTo: .title2))
                .foregroundStyle(Self.ink)
        case "Text", "MarkdownBlock":
            Text(text.isEmpty ? title : text)
                .font(EvoFont.sized(v == "caption" ? 12.5 : (v == "muted" ? 14 : 15), weight: .regular, relativeTo: .body))
                .foregroundStyle((v == "muted" || v == "caption") ? Self.secondary : Self.ink)

        case "Button", "FloatingActionButton":
            Button {
                onAction(node.action)
            } label: {
                Text(label.isEmpty ? (title.isEmpty ? "Continue" : title) : label)
                    .font(EvoFont.sized(15, weight: .semibold, relativeTo: .body))
                    .foregroundStyle((v == "secondary" || v == "outline" || v == "ghost" || v == "glass") ? Self.ink : (v == "destructive" ? Color.red : Color.white))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .padding(.horizontal, 16)
                    .background(
                        buttonBackground(v),
                        in: RoundedRectangle(cornerRadius: v == "pill" ? 999 : 14, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: v == "pill" ? 999 : 14, style: .continuous)
                            .stroke(v == "outline" ? Self.border : Color.clear, lineWidth: 1)
                    )
            }
            .buttonStyle(EvoScalePressButtonStyle())

        case "SegmentedControl", "TabBar":
            let opts = node.options ?? ["Overview", "Details"]
            let key = node.stateKey ?? "tab"
            let current = state[key]?.stringValue.isEmpty == false ? state[key]!.stringValue : (opts.first ?? "")
            HStack(spacing: 4) {
                ForEach(opts, id: \.self) { opt in
                    Button {
                        EvoHaptics.tap()
                        state[key] = .string(opt)
                    } label: {
                        Text(opt)
                            .font(EvoFont.sized(13.5, weight: .medium, relativeTo: .subheadline))
                            .foregroundStyle(current == opt ? Self.ink : Self.secondary)
                            .frame(maxWidth: .infinity, minHeight: 36)
                            .background(current == opt ? Color.white : Color.clear, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(3)
            .background(Self.surface, in: Capsule())

        case "ChipButton":
            let key = node.stateKey ?? "chip"
            let selected = state[key]?.boolValue ?? (v == "selected")
            Button {
                EvoHaptics.tap()
                state[key] = .bool(!selected)
                onAction(node.action)
            } label: {
                Text(label.isEmpty ? title : label)
                    .font(EvoFont.sized(13.5, weight: .medium, relativeTo: .subheadline))
                    .foregroundStyle(selected ? Color.white : Self.secondary)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 34)
                    .background(selected ? Self.ink : Color.white, in: Capsule())
                    .overlay(Capsule().stroke(selected ? Self.ink : Self.border, lineWidth: 1))
            }
            .buttonStyle(.plain)

        case "TextField", "PasswordField", "SearchField", "DatePicker", "TimePicker", "OTPInput", "TagInput":
            let key = node.stateKey ?? "input"
            let binding = Binding<String>(
                get: { state[key]?.stringValue ?? "" },
                set: { state[key] = .string($0) }
            )
            VStack(alignment: .leading, spacing: 6) {
                if !label.isEmpty {
                    Text(label)
                        .font(EvoFont.sized(13, weight: .medium, relativeTo: .caption))
                        .foregroundStyle(Self.secondary)
                }
                HStack(spacing: 8) {
                    if node.type == "SearchField" {
                        EvoIcon(systemName: "magnifyingglass")
                            .foregroundStyle(Self.secondary)
                    }
                    TextField(node.placeholder ?? "Type here…", text: binding)
                        .font(EvoFont.text(.body))
                        .textFieldStyle(.plain)
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 44)
                .background((v == "filled" || node.type == "SearchField") ? Self.surface : Color.white,
                            in: RoundedRectangle(cornerRadius: (v == "pill" || node.type == "SearchField") ? 999 : 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: (v == "pill" || node.type == "SearchField") ? 999 : 14, style: .continuous)
                        .stroke((v == "filled" || node.type == "SearchField") ? Color.clear : Self.border, lineWidth: 1)
                )
            }

        case "TextArea":
            let key = node.stateKey ?? "notes"
            let binding = Binding<String>(
                get: { state[key]?.stringValue ?? "" },
                set: { state[key] = .string($0) }
            )
            VStack(alignment: .leading, spacing: 6) {
                if !label.isEmpty {
                    Text(label).font(EvoFont.sized(13, weight: .medium, relativeTo: .caption)).foregroundStyle(Self.secondary)
                }
                TextField(node.placeholder ?? "Write details…", text: binding, axis: .vertical)
                    .lineLimit(3...6)
                    .font(EvoFont.text(.body))
                    .padding(12)
                    .background(v == "filled" ? Self.surface : Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Self.border, lineWidth: 1))
            }

        case "NumberStepper":
            let key = node.stateKey ?? "count"
            let val = Int(state[key]?.doubleValue ?? node.value?.doubleValue ?? 0)
            HStack {
                if !label.isEmpty {
                    Text(label).font(EvoFont.text(.body)).foregroundStyle(Self.ink)
                }
                Spacer()
                HStack(spacing: 12) {
                    Button {
                        EvoHaptics.tap()
                        state[key] = .number(Double(max(Int(node.min ?? 0), val - Int(node.step ?? 1))))
                    } label: {
                        Text("−").font(.headline).frame(width: 40, height: 40).background(Color.white, in: Circle())
                    }.buttonStyle(.plain)
                    Text("\(val)").font(EvoFont.sized(15, weight: .semibold, relativeTo: .body)).frame(minWidth: 28)
                    Button {
                        EvoHaptics.tap()
                        state[key] = .number(Double(min(Int(node.max ?? 999), val + Int(node.step ?? 1))))
                    } label: {
                        Text("+").font(.headline).frame(width: 40, height: 40).background(Color.white, in: Circle())
                    }.buttonStyle(.plain)
                }
                .padding(4)
                .background(Self.surface, in: Capsule())
            }

        case "Toggle", "Checkbox":
            let key = node.stateKey ?? "enabled"
            let isOn = Binding<Bool>(
                get: { state[key]?.boolValue ?? false },
                set: { state[key] = .bool($0) }
            )
            Toggle(label.isEmpty ? title : label, isOn: isOn)
                .tint(Self.ink)
                .padding(.vertical, 4)

        case "Slider":
            let key = node.stateKey ?? "slider"
            let val = Binding<Double>(
                get: { state[key]?.doubleValue ?? node.value?.doubleValue ?? 50 },
                set: { state[key] = .number($0) }
            )
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(label.isEmpty ? "Value" : label).font(EvoFont.sized(13, weight: .medium, relativeTo: .caption)).foregroundStyle(Self.secondary)
                    Spacer()
                    Text("\(Int(val.wrappedValue))").font(EvoFont.sized(12.5, weight: .medium, relativeTo: .caption)).foregroundStyle(Self.secondary)
                }
                Slider(value: val, in: (node.min ?? 0)...(node.max ?? 100), step: node.step ?? 1)
                    .tint(Self.ink)
            }

        case "Select", "RadioGroup":
            let key = node.stateKey ?? "select"
            let opts = node.options ?? ["Option A", "Option B"]
            let current = state[key]?.stringValue.isEmpty == false ? state[key]!.stringValue : (opts.first ?? "")
            VStack(alignment: .leading, spacing: 6) {
                if !label.isEmpty {
                    Text(label).font(EvoFont.sized(13, weight: .medium, relativeTo: .caption)).foregroundStyle(Self.secondary)
                }
                Menu {
                    ForEach(opts, id: \.self) { opt in
                        Button(opt) { state[key] = .string(opt) }
                    }
                } label: {
                    HStack {
                        Text(current).foregroundStyle(Self.ink)
                        Spacer()
                        EvoIcon(systemName: "chevron.down").foregroundStyle(Self.secondary)
                    }
                    .padding(.horizontal, 14)
                    .frame(minHeight: 44)
                    .background(Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Self.border, lineWidth: 1))
                }
            }

        case "Card", "InfoCard", "ActionCard", "MediaCard", "ModalSheet", "ConfirmDialog":
            VStack(alignment: .leading, spacing: 10) {
                if !title.isEmpty {
                    Text(title).font(EvoFont.sized(16, weight: .semibold, relativeTo: .headline)).foregroundStyle(Self.ink)
                }
                if !subtitle.isEmpty {
                    Text(subtitle).font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline)).foregroundStyle(Self.secondary)
                }
                childrenView
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(v == "outlined" || v == "elevated" ? Color.white : Self.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(v == "outlined" || v == "elevated" ? Self.border : Color.clear, lineWidth: 1))

        case "ExpandableCard", "Accordion":
            VStack(alignment: .leading, spacing: 8) {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
                } label: {
                    HStack {
                        Text(title.isEmpty ? label : title).font(EvoFont.sized(15.5, weight: .semibold, relativeTo: .headline)).foregroundStyle(Self.ink)
                        Spacer()
                        EvoIcon(systemName: expanded ? "chevron.down" : "chevron.right").foregroundStyle(Self.secondary)
                    }
                }.buttonStyle(.plain)
                if expanded {
                    if !text.isEmpty {
                        Text(text).font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline)).foregroundStyle(Self.secondary)
                    }
                    childrenView
                }
            }
            .padding(14)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Self.border, lineWidth: 1))

        case "MetricCard", "StatTile":
            VStack(alignment: .leading, spacing: 4) {
                Text(label.isEmpty ? title : label)
                    .font(EvoFont.sized(12.5, weight: .medium, relativeTo: .caption))
                    .foregroundStyle(Self.secondary)
                Text(text.isEmpty ? resolve(node.value?.stringValue ?? "0") : text)
                    .font(EvoFont.sized(24, weight: .bold, relativeTo: .title2))
                    .foregroundStyle(Self.ink)
                if !subtitle.isEmpty {
                    Text(subtitle).font(EvoFont.sized(12, weight: .regular, relativeTo: .caption)).foregroundStyle(Self.secondary)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Self.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

        case "ProfileHeader":
            let initials = String((title.isEmpty ? "A" : title).split(separator: " ").prefix(2).compactMap { $0.first }).uppercased()
            VStack(spacing: 8) {
                Text(initials)
                    .font(EvoFont.sized(22, weight: .bold, relativeTo: .title2))
                    .foregroundStyle(Self.ink)
                    .frame(width: 68, height: 68)
                    .background(Self.surface, in: Circle())
                    .overlay(Circle().stroke(Self.border, lineWidth: 1))
                Text(title.isEmpty ? "Arlen Member" : title)
                    .font(EvoFont.sized(19, weight: .semibold, relativeTo: .title3))
                    .foregroundStyle(Self.ink)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)

        case "ProfileStats":
            let stats = node.items ?? [
                ArlenUIListItemSpec(id: "1", title: "12", subtitle: "Apps", value: nil, done: nil, badge: nil),
                ArlenUIListItemSpec(id: "2", title: "48", subtitle: "Runs", value: nil, done: nil, badge: nil),
                ArlenUIListItemSpec(id: "3", title: "99%", subtitle: "Ready", value: nil, done: nil, badge: nil)
            ]
            HStack {
                ForEach(Array(stats.enumerated()), id: \.offset) { _, st in
                    VStack(spacing: 2) {
                        Text(resolve(st.title)).font(EvoFont.sized(17, weight: .bold, relativeTo: .headline)).foregroundStyle(Self.ink)
                        if let sub = st.subtitle {
                            Text(sub).font(EvoFont.sized(12, weight: .regular, relativeTo: .caption)).foregroundStyle(Self.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(12)
            .background(Self.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

        case "ListItem":
            if let lk = node.listKey {
                let items: [ArlenRuntimeListItem] = {
                    if case .list(let arr) = state[lk] { return arr }
                    return []
                }()
                if items.isEmpty {
                    Text("No items yet")
                        .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                        .foregroundStyle(Self.secondary)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Self.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                } else {
                    VStack(spacing: 8) {
                        ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                            HStack(spacing: 10) {
                                Button {
                                    onAction(ArlenUIAction(type: "toggleListItem", key: nil, listKey: lk, fromKey: nil, value: nil, by: nil, min: nil, max: nil, index: idx, id: item.id, field: nil))
                                } label: {
                                    HStack(spacing: 10) {
                                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                                            .fill(item.done ? Self.ink : Color.white)
                                            .frame(width: 24, height: 24)
                                            .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).stroke(Self.border, lineWidth: 1))
                                            .overlay {
                                                if item.done {
                                                    Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(.white)
                                                }
                                            }
                                        Text(item.title)
                                            .strikethrough(item.done)
                                            .foregroundStyle(item.done ? Self.secondary : Self.ink)
                                    }
                                }.buttonStyle(.plain)
                                Spacer()
                                Button {
                                    onAction(ArlenUIAction(type: "remove", key: nil, listKey: lk, fromKey: nil, value: nil, by: nil, min: nil, max: nil, index: idx, id: item.id, field: nil))
                                } label: {
                                    EvoIcon(systemName: "trash").foregroundStyle(Self.secondary)
                                }.buttonStyle(.plain)
                            }
                            .padding(.horizontal, 14)
                            .frame(minHeight: 48)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Self.border, lineWidth: 1))
                        }
                    }
                }
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title.isEmpty ? label : title).font(EvoFont.sized(15, weight: .medium, relativeTo: .body)).foregroundStyle(Self.ink)
                        if !subtitle.isEmpty {
                            Text(subtitle).font(EvoFont.sized(12.5, weight: .regular, relativeTo: .caption)).foregroundStyle(Self.secondary)
                        }
                    }
                    Spacer()
                    if let badge = node.badge {
                        Text(badge).font(EvoFont.sized(12, weight: .semibold, relativeTo: .caption)).padding(.horizontal, 10).padding(.vertical, 4).background(Self.surface, in: Capsule())
                    }
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 50)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Self.border, lineWidth: 1))
            }

        case "ProgressBar":
            let pct = state[node.stateKey ?? ""]?.doubleValue ?? node.progress ?? 60
            let clamped = max(0, min(100, pct))
            VStack(alignment: .leading, spacing: 6) {
                if !label.isEmpty {
                    HStack {
                        Text(label).font(EvoFont.sized(13, weight: .medium, relativeTo: .caption)).foregroundStyle(Self.secondary)
                        Spacer()
                        Text("\(Int(clamped))%").font(EvoFont.sized(12.5, weight: .medium, relativeTo: .caption)).foregroundStyle(Self.secondary)
                    }
                }
                ProgressView(value: clamped, total: 100)
                    .tint(Self.ink)
            }

        case "Badge", "Tag", "Pill", "AccountBadge":
            Text(text.isEmpty ? (label.isEmpty ? title : label) : text)
                .font(EvoFont.sized(12, weight: .semibold, relativeTo: .caption))
                .foregroundStyle(v == "accent" ? Self.blue : Self.ink)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(v == "accent" ? Self.blue.opacity(0.12) : Self.surface, in: Capsule())

        case "Alert", "Toast", "BannerCard":
            Text(text.isEmpty ? (title.isEmpty ? label : title) : text)
                .font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline))
                .foregroundStyle(v == "danger" ? Color.red : Self.ink)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Self.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

        case "SparklineBar":
            let nums = node.data ?? [35, 60, 45, 80, 65, 95, 70]
            let peak = max(1, nums.max() ?? 1)
            ArlenSparklineCard(title: title, nums: nums, peak: peak)

        case "CountdownTimer":
            ArlenCountdownWidget(initialSeconds: Int(node.value?.doubleValue ?? 300))

        default:
            VStack(alignment: .leading, spacing: 6) {
                if !title.isEmpty { Text(title).font(EvoFont.sized(15.5, weight: .semibold, relativeTo: .headline)).foregroundStyle(Self.ink) }
                if !text.isEmpty { Text(text).font(EvoFont.sized(14, weight: .regular, relativeTo: .subheadline)).foregroundStyle(Self.secondary) }
                childrenView
            }
        }
    }

    @ViewBuilder
    private var childrenView: some View {
        ForEach(Array((node.children ?? []).enumerated()), id: \.offset) { _, child in
            ArlenNodeRenderer(node: child, state: $state, onAction: onAction)
        }
    }

    private func buttonBackground(_ variant: String) -> Color {
        switch variant {
        case "secondary": return Self.surface
        case "outline", "ghost": return Color.clear
        case "destructive": return Color.red.opacity(0.1)
        default: return Self.ink
        }
    }
}

private struct ArlenSparklineCard: View {
    let title: String
    let nums: [Double]
    let peak: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !title.isEmpty {
                Text(title)
                    .font(EvoFont.sized(13, weight: .medium, relativeTo: .caption))
                    .foregroundStyle(Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255))
            }
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(Array(nums.enumerated()), id: \.offset) { _, n in
                    let barHeight: CGFloat = max(8, CGFloat(n / peak) * 48)
                    RoundedRectangle(cornerRadius: 5, style: .continuous)
                        .fill(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255).opacity(0.85))
                        .frame(height: barHeight)
                        .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 52, alignment: .bottom)
        }
        .padding(14)
        .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct ArlenCountdownWidget: View {
    let initialSeconds: Int
    @State private var remaining: Int
    @State private var running = false
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    init(initialSeconds: Int) {
        self.initialSeconds = initialSeconds
        _remaining = State(initialValue: initialSeconds)
    }

    var body: some View {
        let mins = String(format: "%02d", remaining / 60)
        let secs = String(format: "%02d", remaining % 60)
        HStack {
            EvoIcon(systemName: "clock")
            Text("\(mins):\(secs)")
                .font(.system(size: 22, weight: .bold).monospacedDigit())
            Spacer()
            Button {
                EvoHaptics.tap()
                running.toggle()
            } label: {
                EvoIcon(systemName: running ? "pause.fill" : "play.fill")
                    .frame(width: 40, height: 40)
                    .background(Color.white, in: Circle())
            }.buttonStyle(.plain)
            Button {
                EvoHaptics.tap()
                running = false
                remaining = initialSeconds
            } label: {
                EvoIcon(systemName: "arrow.counterclockwise")
                    .frame(width: 40, height: 40)
            }.buttonStyle(.plain)
        }
        .padding(14)
        .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .onReceive(timer) { _ in
            if running && remaining > 0 { remaining -= 1 }
        }
    }
}
