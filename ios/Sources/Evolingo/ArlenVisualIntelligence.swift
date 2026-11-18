import SwiftUI
import Charts
import MapKit
import UIKit

// MARK: - Arlen Visual Intelligence Engine (Native iOS — REF-01..04 + Full Registry)

struct ArlenVisualPoint: Decodable, Identifiable, Equatable {
    var id: String { "\(x)-\(series ?? "default")-\(y)" }
    let x: String
    let y: Double
    let y2: Double?
    let size: Double?
    let series: String?
    let open: Double?
    let high: Double?
    let low: Double?
    let close: Double?
}

struct ArlenVisualMapPin: Decodable, Identifiable, Equatable {
    var id: String { "\(title)-\(lat)-\(lng)" }
    let title: String
    let subtitle: String?
    let lat: Double
    let lng: Double

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

struct ArlenVisualRouteCoord: Decodable, Equatable {
    let lat: Double
    let lng: Double
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

struct ArlenVisualDiagramNode: Decodable, Identifiable, Equatable {
    let id: String
    let label: String
    let subtitle: String?
    let icon: String?
    let group: String?
}

struct ArlenVisualDiagramEdge: Decodable, Equatable {
    let from: String
    let to: String
    let label: String?
}

struct ArlenVisualIconItem: Decodable, Identifiable, Equatable {
    var id: String { "\(name)-\(label)" }
    let name: String
    let label: String
    let subtitle: String?
    let badge: String?
    let status: String?
}

struct ArlenVisualFileItem: Decodable, Identifiable, Equatable {
    var id: String { name }
    let name: String
    let subtitle: String?
    let kind: String?
    let url: String?
    let content: String?
}

struct ArlenVisualTimelineStep: Decodable, Identifiable, Equatable {
    var id: String { "\(number ?? 0)-\(title)" }
    let number: Int?
    let title: String
    let subtitle: String?
    let status: String?
}

struct ArlenVisualImageItem: Decodable, Identifiable, Equatable {
    var id: String { url }
    let url: String
    let title: String?
    let subtitle: String?
}

struct ArlenVisualDataPayload: Decodable, Equatable {
    let points: [ArlenVisualPoint]?
    let pins: [ArlenVisualMapPin]?
    let route: [ArlenVisualRouteCoord]?
    let nodes: [ArlenVisualDiagramNode]?
    let edges: [ArlenVisualDiagramEdge]?
    let items: [ArlenVisualIconItem]?
    let files: [ArlenVisualFileItem]?
    let steps: [ArlenVisualTimelineStep]?
    let images: [ArlenVisualImageItem]?
    let segments: [Double]?
    let value: Double?
    let textValue: String?
    let label: String?
    let buttonTitle: String?
    let previousValue: Double?
    let min: Double?
    let max: Double?
    let target: Double?
    let unit: String?
    let fromUnit: String?
    let toUnit: String?
    let category: String?
    let headers: [String]?
    let rows: [[String]]?
    let matrix: [[Double]]?
    let xLabels: [String]?
    let yLabels: [String]?

    enum CodingKeys: String, CodingKey {
        case points, pins, route, nodes, edges, items, files, steps, images, segments
        case value, label, buttonTitle, previousValue, min, max, target, unit, fromUnit, toUnit, category
        case headers, rows, matrix, xLabels, yLabels
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        points = try? c.decode([ArlenVisualPoint].self, forKey: .points)
        pins = try? c.decode([ArlenVisualMapPin].self, forKey: .pins)
        route = try? c.decode([ArlenVisualRouteCoord].self, forKey: .route)
        nodes = try? c.decode([ArlenVisualDiagramNode].self, forKey: .nodes)
        edges = try? c.decode([ArlenVisualDiagramEdge].self, forKey: .edges)
        items = try? c.decode([ArlenVisualIconItem].self, forKey: .items)
        files = try? c.decode([ArlenVisualFileItem].self, forKey: .files)
        steps = try? c.decode([ArlenVisualTimelineStep].self, forKey: .steps)
        images = try? c.decode([ArlenVisualImageItem].self, forKey: .images)
        segments = try? c.decode([Double].self, forKey: .segments)
        if let v = try? c.decode(Double.self, forKey: .value) {
            value = v
            textValue = nil
        } else if let s = try? c.decode(String.self, forKey: .value) {
            value = Double(s.replacingOccurrences(of: ",", with: "."))
            textValue = s
        } else {
            value = nil
            textValue = nil
        }
        label = try? c.decode(String.self, forKey: .label)
        buttonTitle = try? c.decode(String.self, forKey: .buttonTitle)
        previousValue = try? c.decode(Double.self, forKey: .previousValue)
        min = try? c.decode(Double.self, forKey: .min)
        max = try? c.decode(Double.self, forKey: .max)
        target = try? c.decode(Double.self, forKey: .target)
        unit = try? c.decode(String.self, forKey: .unit)
        fromUnit = try? c.decode(String.self, forKey: .fromUnit)
        toUnit = try? c.decode(String.self, forKey: .toUnit)
        category = try? c.decode(String.self, forKey: .category)
        headers = try? c.decode([String].self, forKey: .headers)
        rows = try? c.decode([[String]].self, forKey: .rows)
        matrix = try? c.decode([[Double]].self, forKey: .matrix)
        xLabels = try? c.decode([String].self, forKey: .xLabels)
        yLabels = try? c.decode([String].self, forKey: .yLabels)
    }
}

struct ArlenVisualOptions: Decodable, Equatable {
    let showGrid: Bool?
    let showTooltip: Bool?
    let showLegend: Bool?
    let animated: Bool?
    let fullscreen: Bool?
    let highlightedSeries: String?
    let mapStyle: String?
    let radiusMeters: Double?
    let icon: String?
}

struct ArlenVisualSpec: Decodable, Identifiable, Equatable {
    let version: String
    let type: String
    let id: String
    let component: String
    let title: String?
    let subtitle: String?
    let unit: String?
    let data: ArlenVisualDataPayload?
    let options: ArlenVisualOptions?
    let children: [ArlenVisualSpec]?

    enum CodingKeys: String, CodingKey {
        case version, type, id, component, title, subtitle, unit, data, options, children
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        version = (try? c.decode(String.self, forKey: .version)) ?? "1.0"
        type = (try? c.decode(String.self, forKey: .type)) ?? "visual"
        id = (try? c.decode(String.self, forKey: .id)) ?? "vis_\(UUID().uuidString.prefix(8))"
        component = try c.decode(String.self, forKey: .component)
        title = try? c.decode(String.self, forKey: .title)
        subtitle = try? c.decode(String.self, forKey: .subtitle)
        unit = try? c.decode(String.self, forKey: .unit)
        if let nested = try? c.decode(ArlenVisualDataPayload.self, forKey: .data) {
            data = nested
        } else {
            data = try? ArlenVisualDataPayload(from: decoder)
        }
        options = try? c.decode(ArlenVisualOptions.self, forKey: .options)
        children = try? c.decode([ArlenVisualSpec].self, forKey: .children)
    }
}

// MARK: - Component Registry Validation & Artifact Manager

enum ArlenVisualRegistry {
    static let allowedNamespaces: Set<String> = [
        "icon", "chart", "map", "diagram", "metric", "data", "layout",
        "text", "file", "progress", "image", "media", "timeline",
        "steps", "process", "result", "table", "utility", "visual"
    ]

    static func decodeAndValidate(_ json: String) -> ArlenVisualSpec? {
        guard let data = json.data(using: .utf8),
              let spec = try? JSONDecoder().decode(ArlenVisualSpec.self, from: data),
              spec.version == "1.0",
              spec.type == "visual",
              !spec.id.isEmpty else {
            return nil
        }
        let parts = spec.component.split(separator: ".")
        guard parts.count == 2, allowedNamespaces.contains(String(parts[0])) else { return nil }
        if let pins = spec.data?.pins {
            for p in pins where p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180 {
                return nil
            }
        }
        return spec
    }

    static func safeSymbolName(_ raw: String?) -> String {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
            return "evo.builder.orb"
        }
        if raw.hasPrefix("evo.") { return raw }
        let aliases: [String: String] = [
            "orb": "evo.builder.orb",
            "cloud": "cloud",
            "security": "lock.shield",
            "shield": "lock.shield",
            "networking": "network",
            "network": "network",
            "storage": "externaldrive",
            "database": "cylinder.split.1x2",
            "server": "server.rack",
            "cpu": "cpu",
            "code": "chevron.left.forwardslash.chevron.right",
            "chart": "chart.bar",
            "map": "map",
            "user": "person.circle",
            "check": "checkmark.circle.fill",
            "warning": "exclamationmark.triangle"
        ]
        if let mapped = aliases[raw.lowercased()] { return mapped }
        if UIImage(systemName: raw) != nil { return raw }
        return "evo.builder.orb"
    }
}

@MainActor
enum ArlenArtifactManager {
    static func exportAndShare(item: ArlenVisualFileItem) {
        EvoHaptics.tap()
        if let rawURL = item.url, let url = URL(string: rawURL), let scheme = url.scheme?.lowercased(), (scheme == "https" || scheme == "http") {
            UIApplication.shared.open(url)
            return
        }
        let safeName = item.name.replacingOccurrences(of: "/", with: "_")
        let dest = FileManager.default.temporaryDirectory.appendingPathComponent(safeName)
        let body = item.content ?? "\(item.name)\n\(item.subtitle ?? "Exported from Arlen")\n"
        try? body.data(using: .utf8)?.write(to: dest, options: .atomic)
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first?.rootViewController else { return }
        let activity = UIActivityViewController(activityItems: [dest], applicationActivities: nil)
        root.present(activity, animated: true)
    }
}

// MARK: - Root Visual Block View (Backgroundless Conversation Layout)

struct ArlenVisualBlockView: View {
    let spec: ArlenVisualSpec
    @State private var showFullscreen = false

    private static let ink = Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255)
    private static let secondary = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255)

    var body: some View {
        let ns = spec.component.split(separator: ".").first.map(String.init) ?? ""
        VStack(alignment: .leading, spacing: 10) {
            if shouldShowStandardHeader(ns: ns), let title = spec.title, !title.isEmpty {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Self.ink)
                        if let subtitle = spec.subtitle, !subtitle.isEmpty {
                            Text(subtitle)
                                .font(.system(size: 13, weight: .regular))
                                .foregroundStyle(Self.secondary)
                        }
                    }
                    Spacer()
                    Button {
                        EvoHaptics.tap()
                        showFullscreen = true
                    } label: {
                        EvoIcon(systemName: "arrow.up.left.and.arrow.down.right")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.8)
                            .foregroundStyle(Self.secondary)
                            .frame(width: 28, height: 28)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Expand visualization")
                }
            }
            contentBody(ns: ns)
        }
        .padding(.vertical, 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .sheet(isPresented: $showFullscreen) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        contentBody(ns: ns)
                            .frame(minHeight: 340)
                    }
                    .padding(20)
                }
                .navigationTitle(spec.title ?? "Visualization")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") { showFullscreen = false }
                    }
                }
            }
        }
    }

    private func shouldShowStandardHeader(ns: String) -> Bool {
        switch ns {
        case "chart", "diagram", "data", "table": return true
        default: return false
        }
    }

    @ViewBuilder
    private func contentBody(ns: String) -> some View {
        switch ns {
        case "progress":
            ArlenVisualProgressRenderer(spec: spec)
        case "file":
            ArlenVisualFileListRenderer(spec: spec)
        case "image", "media":
            ArlenVisualCarouselRenderer(spec: spec)
        case "timeline", "steps", "process":
            ArlenVisualTimelineRenderer(spec: spec)
        case "result", "text":
            ArlenVisualResultTextRenderer(spec: spec)
        case "utility":
            ArlenVisualUtilityRenderer(spec: spec)
        case "chart":
            ArlenVisualChartRenderer(spec: spec)
        case "map":
            ArlenVisualMapRenderer(spec: spec)
        case "diagram", "visual":
            ArlenVisualDiagramRenderer(spec: spec)
        case "metric":
            ArlenVisualMetricRenderer(spec: spec)
        case "icon":
            ArlenVisualIconRenderer(spec: spec)
        case "data", "table":
            ArlenVisualDataRenderer(spec: spec)
        case "layout":
            ArlenVisualLayoutRenderer(spec: spec)
        default:
            Text(spec.title ?? spec.component)
                .font(.system(size: 14))
                .foregroundStyle(Self.secondary)
        }
    }
}

// MARK: - REF-01: Minimal Circular Progress Ring & Segmented Bar

private struct ArlenVisualProgressRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        if spec.component == "progress.segmented" {
            let segs = spec.data?.segments ?? [42, 26, 32]
            let total = max(1, segs.reduce(0, +))
            let shades: [Color] = [
                Color(red: 74.0 / 255, green: 74.0 / 255, blue: 77.0 / 255),
                Color(red: 112.0 / 255, green: 112.0 / 255, blue: 115.0 / 255),
                Color(red: 214.0 / 255, green: 214.0 / 255, blue: 218.0 / 255)
            ]
            GeometryReader { geo in
                HStack(spacing: 5) {
                    ForEach(Array(segs.enumerated()), id: \.offset) { idx, val in
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .fill(shades[idx % shades.count])
                            .frame(width: max(24, (geo.size.width - CGFloat(segs.count - 1) * 5) * CGFloat(val / total)), height: 28)
                    }
                }
            }
            .frame(height: 28)
            .padding(.vertical, 6)
        } else {
            let val = spec.data?.value ?? 75
            let maxVal = max(1, spec.data?.max ?? 100)
            let ratio = max(0, min(1, val / maxVal))
            let pctText = "\(Int(round(ratio * 100)))%"
            let caption = spec.subtitle ?? spec.data?.label ?? "Complete"

            ZStack {
                Circle()
                    .stroke(Color(red: 229.0 / 255, green: 229.0 / 255, blue: 234.0 / 255), lineWidth: 7.5)
                Circle()
                    .trim(from: 0, to: ratio)
                    .stroke(
                        Color(red: 66.0 / 255, green: 69.0 / 255, blue: 82.0 / 255),
                        style: StrokeStyle(lineWidth: 7.5, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 1) {
                    Text(pctText)
                        .font(.system(size: 19, weight: .bold))
                        .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                    Text(caption)
                        .font(.system(size: 9.5, weight: .regular))
                        .foregroundStyle(Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255))
                }
            }
            .frame(width: 86, height: 86)
            .padding(.vertical, 4)
        }
    }
}

// MARK: - REF-01: Backgroundless File Download Rows

private struct ArlenVisualFileListRenderer: View {
    let spec: ArlenVisualSpec

    private var fileItems: [ArlenVisualFileItem] {
        if let files = spec.data?.files, !files.isEmpty { return files }
        if let title = spec.title {
            return [ArlenVisualFileItem(name: title, subtitle: spec.subtitle, kind: spec.component, url: nil, content: nil)]
        }
        return []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(fileItems.enumerated()), id: \.element.id) { idx, file in
                Button {
                    ArlenArtifactManager.exportAndShare(item: file)
                } label: {
                    HStack(spacing: 16) {
                        fileIconView(for: file.name)
                            .frame(width: 28, height: 28)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(file.name)
                                .font(.system(size: 16.5, weight: .semibold))
                                .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                            if let sub = file.subtitle, !sub.isEmpty {
                                Text(sub)
                                    .font(.system(size: 13.5, weight: .regular))
                                    .foregroundStyle(Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255))
                            }
                        }
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if idx < fileItems.count - 1 {
                    Rectangle()
                        .fill(Color(red: 242.0 / 255, green: 242.0 / 255, blue: 246.0 / 255))
                        .frame(height: 1)
                }
            }
        }
    }

    @ViewBuilder
    private func fileIconView(for filename: String) -> some View {
        let lower = filename.lowercased()
        if lower.hasSuffix(".xlsx") || lower.hasSuffix(".csv") {
            EvoIcon(systemName: "tablecells")
                .evoSymbol(.toolbar, weight: .medium)
                .foregroundStyle(Color(red: 46.0 / 255, green: 111.0 / 255, blue: 68.0 / 255))
        } else if lower.hasSuffix(".zip") || lower.hasSuffix(".tar") {
            EvoIcon(systemName: "doc.zipper")
                .evoSymbol(.toolbar, weight: .medium)
                .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
        } else {
            EvoIcon(systemName: "doc.text")
                .evoSymbol(.toolbar, weight: .medium)
                .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
        }
    }
}

// MARK: - REF-02: Horizontal Image Carousel with Next-Item Peek

private struct ArlenVisualCarouselRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        let images = spec.data?.images ?? []
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(images) { img in
                    AsyncImage(url: URL(string: img.url)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        default:
                            ZStack {
                                Color(red: 238.0 / 255, green: 240.0 / 255, blue: 244.0 / 255)
                                EvoIcon(systemName: "photo")
                                    .evoSymbol(.standard)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .frame(width: 168, height: 126)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }
        }
    }
}

// MARK: - REF-02: Numbered Process Timeline with Thin Connectors & Status Pills

private struct ArlenVisualTimelineRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        let steps = spec.data?.steps ?? []
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.element.id) { idx, step in
                HStack(alignment: .top, spacing: 14) {
                    VStack(spacing: 4) {
                        Text("\(step.number ?? (idx + 1))")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                            .frame(width: 18)
                        if idx < steps.count - 1 {
                            Rectangle()
                                .fill(Color(red: 209.0 / 255, green: 209.0 / 255, blue: 214.0 / 255))
                                .frame(width: 1)
                                .frame(maxHeight: .infinity)
                        }
                    }

                    VStack(alignment: .leading, spacing: 5) {
                        Text(step.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                        if let sub = step.subtitle, !sub.isEmpty {
                            Text(sub)
                                .font(.system(size: 13.5, weight: .regular))
                                .foregroundStyle(Color(red: 110.0 / 255, green: 110.0 / 255, blue: 115.0 / 255))
                        }
                        if let status = step.status, !status.isEmpty {
                            timelineStatusPill(status)
                                .padding(.top, 3)
                        }
                    }
                    .padding(.bottom, idx < steps.count - 1 ? 18 : 4)
                }
            }
        }
    }

    @ViewBuilder
    private func timelineStatusPill(_ status: String) -> some View {
        let isComplete = status.lowercased().contains("complete") || status.lowercased().contains("done")
        Text(status)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(isComplete ? Color(red: 36.0 / 255, green: 122.0 / 255, blue: 61.0 / 255) : Color(red: 58.0 / 255, green: 58.0 / 255, blue: 60.0 / 255))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                isComplete ? Color(red: 227.0 / 255, green: 245.0 / 255, blue: 232.0 / 255) : Color.white,
                in: Capsule()
            )
            .overlay(
                Capsule().stroke(isComplete ? Color.clear : Color(red: 229.0 / 255, green: 229.0 / 255, blue: 234.0 / 255), lineWidth: 1)
            )
    }
}

// MARK: - REF-02 & REF-03: Heading + Icon, Copyable Value + Black Pill, Standalone Large Number

private struct ArlenVisualResultTextRenderer: View {
    let spec: ArlenVisualSpec
    @State private var copied = false

    var body: some View {
        if spec.component == "text.heading" {
            HStack(spacing: 10) {
                EvoIcon(systemName: ArlenVisualRegistry.safeSymbolName(spec.options?.icon))
                    .evoSymbol(.navigation, weight: .regular)
                    .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                Text(spec.title ?? "")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundStyle(Color(red: 17.0 / 255, green: 17.0 / 255, blue: 17.0 / 255))
            }
            .padding(.vertical, 4)
        } else if spec.component == "text.largeNumber" || spec.component == "result.largeValue" {
            let valText = spec.data?.textValue ?? (spec.data?.value.map { String($0) } ?? spec.title ?? "")
            VStack(alignment: .leading, spacing: 4) {
                Text(valText)
                    .font(.system(size: 38, weight: .bold).monospacedDigit())
                    .foregroundStyle(Color(red: 17.0 / 255, green: 17.0 / 255, blue: 17.0 / 255))
                if let sub = spec.subtitle ?? spec.data?.label {
                    Text(sub)
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255))
                }
            }
            .padding(.vertical, 6)
        } else {
            // REF-03: Copyable Phone / Result with Black Pill Button
            let label = spec.subtitle ?? spec.title ?? spec.data?.label ?? ""
            let valText = spec.data?.textValue ?? (spec.data?.value.map { String(Int($0)) } ?? "")
            let btnTitle = spec.data?.buttonTitle ?? "Szám másolása"

            VStack(alignment: .leading, spacing: 8) {
                if !label.isEmpty {
                    Text(label)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color(red: 108.0 / 255, green: 108.0 / 255, blue: 112.0 / 255))
                }
                Text(valText)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(Color(red: 17.0 / 255, green: 17.0 / 255, blue: 17.0 / 255))
                    .textSelection(.enabled)

                Button {
                    UIPasteboard.general.string = valText
                    EvoHaptics.tap()
                    copied = true
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 1_400_000_000)
                        copied = false
                    }
                } label: {
                    HStack(spacing: 7) {
                        EvoIcon(systemName: copied ? "checkmark" : "doc.on.doc")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.85)
                        Text(copied ? "Másolva" : btnTitle)
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(Color.white)
                    .padding(.horizontal, 16)
                    .frame(height: 38)
                    .background(Color(red: 28.0 / 255, green: 28.0 / 255, blue: 30.0 / 255), in: Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Interactive Local Utility Engine (Unit Converter & Calculator)

private struct ArlenVisualUtilityRenderer: View {
    let spec: ArlenVisualSpec
    @State private var inputAmount: String = "5"
    @State private var swapped = false

    var body: some View {
        let fromU = swapped ? (spec.data?.toUnit ?? "mi") : (spec.data?.fromUnit ?? "km")
        let toU = swapped ? (spec.data?.fromUnit ?? "km") : (spec.data?.toUnit ?? "mi")
        let numeric = Double(inputAmount.replacingOccurrences(of: ",", with: ".")) ?? (spec.data?.value ?? 5)
        let converted = convert(value: numeric, from: fromU, to: toU)

        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                TextField("Value", text: $inputAmount)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 18, weight: .semibold).monospacedDigit())
                    .padding(.horizontal, 12)
                    .frame(height: 42)
                    .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                Text(fromU)
                    .font(.system(size: 15, weight: .semibold))
                Button {
                    EvoHaptics.tap()
                    swapped.toggle()
                } label: {
                    EvoIcon(systemName: "arrow.left.arrow.right")
                        .evoSymbol(.toolbar, weight: .medium)
                        .frame(width: 38, height: 38)
                        .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: Circle())
                }
                .buttonStyle(.plain)
                Text(String(format: "%.4g %@", converted, toU))
                    .font(.system(size: 18, weight: .bold).monospacedDigit())
            }
        }
        .onAppear {
            if let v = spec.data?.value {
                inputAmount = v.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(v)) : String(v)
            }
        }
    }

    private func convert(value: Double, from: String, to: String) -> Double {
        let pair = "\(from.lowercased())->\(to.lowercased())"
        switch pair {
        case "km->mi": return value * 0.621371
        case "mi->km": return value / 0.621371
        case "kg->lb": return value * 2.20462
        case "lb->kg": return value / 2.20462
        case "c->f": return (value * 9 / 5) + 32
        case "f->c": return (value - 32) * 5 / 9
        case "m->ft": return value * 3.28084
        case "ft->m": return value / 3.28084
        default: return value
        }
    }
}

// MARK: - Statistical Charts Renderer

private struct ArlenVisualChartRenderer: View {
    let spec: ArlenVisualSpec
    @State private var selectedPoint: ArlenVisualPoint?

    private var points: [ArlenVisualPoint] {
        spec.data?.points ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let sel = selectedPoint {
                HStack(spacing: 6) {
                    Text(sel.x).font(.system(size: 12.5, weight: .semibold))
                    Text(formatVal(sel.y)).font(.system(size: 12.5, weight: .regular)).foregroundStyle(.secondary)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: Capsule())
            }

            if spec.component == "chart.pie" || spec.component == "chart.donut" || spec.component == "chart.multiRingDonut" || spec.component == "chart.sunburst" {
                sectorChartView
            } else if spec.component == "chart.horizontalBar" || spec.component == "chart.funnel" || spec.component == "chart.bullet" {
                horizontalBarsView
            } else {
                cartesianChartView
            }
        }
    }

    private var sectorChartView: some View {
        let isDonut = spec.component != "chart.pie"
        return Chart(points) { pt in
            SectorMark(
                angle: .value("Value", max(0.01, pt.y)),
                innerRadius: .ratio(isDonut ? 0.56 : 0.0),
                angularInset: 1.5
            )
            .foregroundStyle(by: .value("Category", pt.x))
            .cornerRadius(4)
        }
        .frame(height: 200)
    }

    private var horizontalBarsView: some View {
        let peak = max(1, points.map(\.y).max() ?? 1)
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(points) { pt in
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(pt.x).font(.system(size: 12.5, weight: .medium))
                        Spacer()
                        Text(formatVal(pt.y)).font(.system(size: 12, weight: .regular)).foregroundStyle(.secondary)
                    }
                    GeometryReader { geo in
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .fill(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255))
                            .frame(width: max(6, geo.size.width * CGFloat(pt.y / peak)), height: 10)
                    }
                    .frame(height: 10)
                }
            }
        }
    }

    private var cartesianChartView: some View {
        let c = spec.component
        let highlighted = spec.options?.highlightedSeries?.lowercased()
        return Chart(points) { pt in
            let isDimmed: Bool = {
                guard let h = highlighted, let s = pt.series?.lowercased() else { return false }
                return s != h
            }()
            if c.contains("area") || c == "chart.streamgraph" {
                AreaMark(x: .value("X", pt.x), y: .value("Y", pt.y))
                    .foregroundStyle(Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255).opacity(isDimmed ? 0.08 : 0.22))
                LineMark(x: .value("X", pt.x), y: .value("Y", pt.y))
                    .foregroundStyle(Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255).opacity(isDimmed ? 0.35 : 1.0))
            } else if c.contains("line") || c == "chart.sparkline" || c == "chart.stepLine" {
                LineMark(x: .value("X", pt.x), y: .value("Y", pt.y))
                    .interpolationMethod(c == "chart.smoothLine" ? .catmullRom : (c == "chart.stepLine" ? .stepEnd : .linear))
                    .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255).opacity(isDimmed ? 0.3 : 1.0))
                PointMark(x: .value("X", pt.x), y: .value("Y", pt.y))
                    .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255).opacity(isDimmed ? 0.3 : 1.0))
            } else if c == "chart.scatter" || c == "chart.bubble" {
                PointMark(x: .value("X", pt.x), y: .value("Y", pt.y))
                    .symbolSize(CGFloat(max(40, min(220, (pt.size ?? 10) * 8))))
                    .foregroundStyle(Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255))
            } else {
                BarMark(x: .value("X", pt.x), y: .value("Y", pt.y))
                    .cornerRadius(5)
                    .foregroundStyle(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255).opacity(isDimmed ? 0.3 : 0.9))
            }
        }
        .frame(height: c == "chart.sparkline" ? 90 : 196)
    }

    private func formatVal(_ v: Double) -> String {
        let u = spec.unit ?? spec.data?.unit ?? ""
        let num = v.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(v)) : String(format: "%.1f", v)
        return u.isEmpty ? num : "\(num)\(u)"
    }
}

// MARK: - REF-04: Inline Rounded Geospatial & MapKit Preview

private struct ArlenVisualMapRenderer: View {
    let spec: ArlenVisualSpec

    private var pins: [ArlenVisualMapPin] {
        spec.data?.pins ?? []
    }

    var body: some View {
        Map {
            ForEach(pins) { pin in
                Marker(pin.title, coordinate: pin.coordinate)
            }
            if let route = spec.data?.route, route.count >= 2 {
                MapPolyline(coordinates: route.map(\.coordinate))
                    .stroke(Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255), lineWidth: 3)
            }
            if let first = pins.first, let radius = spec.options?.radiusMeters, radius > 0 {
                MapCircle(center: first.coordinate, radius: radius)
                    .foregroundStyle(Color.blue.opacity(0.15))
            }
        }
        .mapStyle(resolvedMapStyle)
        .frame(height: 196)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var resolvedMapStyle: MapStyle {
        let s = spec.options?.mapStyle ?? spec.component
        if s.contains("satellite") || s == "map.preview" { return .hybrid }
        if s.contains("hybrid") { return .hybrid }
        return .standard
    }
}

// MARK: - Diagrams, Metrics, Icons, Data & Layout Renderers

private struct ArlenVisualDiagramRenderer: View {
    let spec: ArlenVisualSpec
    @State private var selectedNodeId: String?

    var body: some View {
        let nodes = spec.data?.nodes ?? []
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(Array(nodes.enumerated()), id: \.element.id) { idx, node in
                    let isSel = selectedNodeId == node.id
                    Button {
                        EvoHaptics.selection()
                        selectedNodeId = isSel ? nil : node.id
                    } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(node.label).font(.system(size: 13.5, weight: .semibold))
                            if let sub = node.subtitle {
                                Text(sub).font(.system(size: 11.5)).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(isSel ? Color.black : Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .foregroundStyle(isSel ? Color.white : Color.primary)
                    }
                    .buttonStyle(.plain)

                    if idx < nodes.count - 1 {
                        EvoIcon(systemName: "arrow.right")
                            .evoSymbol(.toolbar, weight: .medium)
                            .scaleEffect(0.78)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

private struct ArlenVisualMetricRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        if spec.component.contains("Ring") || spec.component.contains("Gauge") {
            ArlenVisualProgressRenderer(spec: spec)
        } else {
            ArlenVisualResultTextRenderer(spec: spec)
        }
    }
}

private struct ArlenVisualIconRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        let items = spec.data?.items ?? []
        let cols = [GridItem(.adaptive(minimum: 110), spacing: 10)]
        LazyVGrid(columns: cols, alignment: .leading, spacing: 10) {
            ForEach(items) { item in
                HStack(spacing: 10) {
                    EvoIcon(systemName: ArlenVisualRegistry.safeSymbolName(item.name))
                        .evoSymbol(.toolbar, weight: .medium)
                        .frame(width: 34, height: 34)
                        .background(Color(red: 245.0 / 255, green: 245.0 / 255, blue: 247.0 / 255), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.label).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                        if let sub = item.subtitle {
                            Text(sub).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
                        }
                    }
                }
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

private struct ArlenVisualDataRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        if let matrix = spec.data?.matrix, !matrix.isEmpty {
            let flatMax = max(1, matrix.flatMap { $0 }.max() ?? 1)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(matrix.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 4) {
                        ForEach(Array(row.enumerated()), id: \.offset) { _, val in
                            let intensity = max(0.12, min(1.0, val / flatMax))
                            RoundedRectangle(cornerRadius: 5, style: .continuous)
                                .fill(Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255).opacity(intensity))
                                .frame(height: 28)
                                .overlay {
                                    Text("\(Int(val))")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(intensity > 0.55 ? Color.white : Color.primary)
                                }
                        }
                    }
                }
            }
        } else if let pts = spec.data?.points, !pts.isEmpty {
            ArlenVisualChartRenderer(spec: spec)
        } else {
            Text("Structured data view")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
    }
}

private struct ArlenVisualLayoutRenderer: View {
    let spec: ArlenVisualSpec

    var body: some View {
        let children = spec.children ?? []
        VStack(alignment: .leading, spacing: 14) {
            ForEach(children) { child in
                ArlenVisualBlockView(spec: child)
            }
        }
    }
}
