import SwiftUI
import UIKit

// MARK: - Arlen Native Markdown AST & Cache

enum ArlenMarkdownBlockKind: Equatable, Sendable {
    case paragraph(String)
    case heading(level: Int, text: String)
    case codeBlock(language: String?, code: String, isClosed: Bool)
    case blockquote([ArlenMarkdownBlock])
    case list(ordered: Bool, startIndex: Int, items: [ArlenListItem])
    case table(headers: [String], alignments: [ArlenTableAlignment], rows: [[String]])
    case mathBlock(String)
    case thematicBreak
}

struct ArlenListItem: Equatable, Sendable {
    let text: String
    let isTask: Bool
    let isChecked: Bool
    let indent: Int
    let children: [ArlenMarkdownBlock]
}

enum ArlenTableAlignment: Equatable, Sendable {
    case left, center, right
}

struct ArlenMarkdownBlock: Identifiable, Equatable, Sendable {
    let id: String
    let kind: ArlenMarkdownBlockKind
}

private final class ArlenCachedMarkdown: NSObject, @unchecked Sendable {
    let blocks: [ArlenMarkdownBlock]
    init(blocks: [ArlenMarkdownBlock]) {
        self.blocks = blocks
    }
}

actor ArlenMarkdownCacheActor {
    static let shared = ArlenMarkdownCacheActor()
    private var cache: [String: [ArlenMarkdownBlock]] = [:]
    private var keys: [String] = []
    private let maxEntries = 256

    func getBlocks(for key: String) -> [ArlenMarkdownBlock]? {
        cache[key]
    }

    func setBlocks(_ blocks: [ArlenMarkdownBlock], for key: String) {
        if cache[key] == nil {
            keys.append(key)
            if keys.count > maxEntries {
                let oldest = keys.removeFirst()
                cache.removeValue(forKey: oldest)
            }
        }
        cache[key] = blocks
    }
}

@MainActor
enum ArlenMarkdownParser {
    private static let cache: NSCache<NSString, ArlenCachedMarkdown> = {
        let c = NSCache<NSString, ArlenCachedMarkdown>()
        c.countLimit = 256
        return c
    }()

    nonisolated static func computeHash(_ input: String) -> String {
        var hasher = Hasher()
        hasher.combine(input)
        let hash = UInt64(bitPattern: Int64(hasher.finalize()))
        return String(format: "%016llx", hash)
    }

    static func lookupCache(key: String, isStreaming: Bool = false) -> [ArlenMarkdownBlock]? {
        let cacheKey = (isStreaming ? "s_\(key)" : key) as NSString
        return cache.object(forKey: cacheKey)?.blocks
    }

    static func parse(_ input: String, isStreaming: Bool = false) -> [ArlenMarkdownBlock] {
        let normalized = input.replacingOccurrences(of: "\r\n", with: "\n")
        let contentHash = computeHash(normalized)
        let cacheKey = (isStreaming ? "s_\(contentHash)" : contentHash) as NSString
        if let hit = cache.object(forKey: cacheKey) {
            return hit.blocks
        }
        let blocks = parseBlocks(normalized.components(separatedBy: "\n"), contentHash: contentHash, isStreaming: isStreaming)
        cache.setObject(ArlenCachedMarkdown(blocks: blocks), forKey: cacheKey)
        return blocks
    }

    nonisolated static func parseDetached(_ input: String, isStreaming: Bool = false) -> [ArlenMarkdownBlock] {
        let normalized = input.replacingOccurrences(of: "\r\n", with: "\n")
        let contentHash = computeHash(normalized)
        return parseBlocks(normalized.components(separatedBy: "\n"), contentHash: contentHash, isStreaming: isStreaming)
    }

    nonisolated private static func parseBlocks(_ lines: [String], contentHash: String, isStreaming: Bool) -> [ArlenMarkdownBlock] {
        var result: [ArlenMarkdownBlock] = []
        var i = 0
        var nextID = 0

        func emit(_ kind: ArlenMarkdownBlockKind) {
            let blockID = "\(contentHash)_\(nextID)"
            result.append(ArlenMarkdownBlock(id: blockID, kind: kind))
            nextID += 1
        }

        while i < lines.count {
            let line = lines[i]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if trimmed.isEmpty {
                i += 1
                continue
            }

            // 1. Fenced code block (``` or ~~~)
            if trimmed.hasPrefix("```") || trimmed.hasPrefix("~~~") {
                let fenceChar: Character = trimmed.hasPrefix("```") ? "`" : "~"
                let fenceCount = trimmed.prefix(while: { $0 == fenceChar }).count
                if fenceCount >= 3 {
                    let langRaw = String(trimmed.dropFirst(fenceCount)).trimmingCharacters(in: .whitespaces)
                    let lang = langRaw.isEmpty ? nil : langRaw
                    var codeLines: [String] = []
                    i += 1
                    var closed = false
                    while i < lines.count {
                        let curTrimmed = lines[i].trimmingCharacters(in: .whitespaces)
                        if curTrimmed.prefix(while: { $0 == fenceChar }).count >= fenceCount &&
                            curTrimmed.dropFirst(fenceCount).trimmingCharacters(in: .whitespaces).isEmpty {
                            closed = true
                            i += 1
                            break
                        }
                        codeLines.append(lines[i])
                        i += 1
                    }
                    emit(.codeBlock(language: lang, code: codeLines.joined(separator: "\n"), isClosed: closed || !isStreaming))
                    continue
                }
            }

            // 2. Block math ($$ ... $$)
            if trimmed.hasPrefix("$$") {
                if trimmed.count > 4 && trimmed.hasSuffix("$$") {
                    let inner = String(trimmed.dropFirst(2).dropLast(2)).trimmingCharacters(in: .whitespaces)
                    emit(.mathBlock(inner))
                    i += 1
                    continue
                }
                var mathLines: [String] = []
                let firstRest = String(trimmed.dropFirst(2)).trimmingCharacters(in: .whitespaces)
                if !firstRest.isEmpty { mathLines.append(firstRest) }
                i += 1
                while i < lines.count {
                    let curTrimmed = lines[i].trimmingCharacters(in: .whitespaces)
                    if curTrimmed.hasSuffix("$$") {
                        let before = String(curTrimmed.dropLast(2)).trimmingCharacters(in: .whitespaces)
                        if !before.isEmpty { mathLines.append(before) }
                        i += 1
                        break
                    }
                    mathLines.append(lines[i])
                    i += 1
                }
                emit(.mathBlock(mathLines.joined(separator: "\n")))
                continue
            }

            // 3. Thematic break (---, ***, ___)
            if isThematicBreak(trimmed) {
                emit(.thematicBreak)
                i += 1
                continue
            }

            // 4. ATX Heading (# .. ######)
            if let (level, text) = parseHeading(trimmed) {
                emit(.heading(level: level, text: text))
                i += 1
                continue
            }

            // 5. Blockquote (> ...)
            if trimmed.hasPrefix(">") {
                var quoteLines: [String] = []
                while i < lines.count {
                    let qt = lines[i].trimmingCharacters(in: .whitespaces)
                    if qt.hasPrefix(">") {
                        var stripped = String(qt.dropFirst())
                        if stripped.hasPrefix(" ") { stripped = String(stripped.dropFirst()) }
                        quoteLines.append(stripped)
                        i += 1
                    } else if qt.isEmpty {
                        break
                    } else {
                        break
                    }
                }
                let innerBlocks = parseBlocks(quoteLines, contentHash: "\(contentHash)_q\(nextID)", isStreaming: isStreaming)
                emit(.blockquote(innerBlocks))
                continue
            }

            // 6. GFM Table
            if i + 1 < lines.count && trimmed.contains("|") && isTableSeparator(lines[i + 1].trimmingCharacters(in: .whitespaces)) {
                let headers = splitTableRow(trimmed)
                let alignments = parseTableAlignments(lines[i + 1].trimmingCharacters(in: .whitespaces), count: headers.count)
                i += 2
                var rows: [[String]] = []
                while i < lines.count {
                    let rt = lines[i].trimmingCharacters(in: .whitespaces)
                    if rt.isEmpty || !rt.contains("|") { break }
                    var cells = splitTableRow(rt)
                    while cells.count < headers.count { cells.append("") }
                    if cells.count > headers.count { cells = Array(cells.prefix(headers.count)) }
                    rows.append(cells)
                    i += 1
                }
                emit(.table(headers: headers, alignments: alignments, rows: rows))
                continue
            }

            // 7. Ordered / Unordered / Task List
            if let firstList = parseListLine(line) {
                let ordered = firstList.ordered
                let startIndex = firstList.startIndex
                var items: [ArlenListItem] = []
                while i < lines.count {
                    let cur = lines[i]
                    let curTrimmed = cur.trimmingCharacters(in: .whitespaces)
                    if curTrimmed.isEmpty {
                        i += 1
                        break
                    }
                    if let parsed = parseListLine(cur) {
                        items.append(ArlenListItem(
                            text: parsed.text,
                            isTask: parsed.isTask,
                            isChecked: parsed.isChecked,
                            indent: parsed.indent,
                            children: []
                        ))
                        i += 1
                    } else if cur.hasPrefix("  ") || cur.hasPrefix("\t"), let last = items.popLast() {
                        items.append(ArlenListItem(
                            text: last.text + " " + curTrimmed,
                            isTask: last.isTask,
                            isChecked: last.isChecked,
                            indent: last.indent,
                            children: last.children
                        ))
                        i += 1
                    } else {
                        break
                    }
                }
                emit(.list(ordered: ordered, startIndex: startIndex, items: items))
                continue
            }

            // 8. Paragraph
            var paraLines: [String] = [line]
            i += 1
            while i < lines.count {
                let next = lines[i]
                let nt = next.trimmingCharacters(in: .whitespaces)
                if nt.isEmpty ||
                    nt.hasPrefix("```") ||
                    nt.hasPrefix("~~~") ||
                    nt.hasPrefix("$$") ||
                    nt.hasPrefix(">") ||
                    isThematicBreak(nt) ||
                    parseHeading(nt) != nil ||
                    parseListLine(next) != nil ||
                    (i + 1 < lines.count && nt.contains("|") && isTableSeparator(lines[i + 1].trimmingCharacters(in: .whitespaces))) {
                    break
                }
                paraLines.append(next)
                i += 1
            }
            emit(.paragraph(paraLines.joined(separator: "\n")))
        }

        return result
    }

    nonisolated private static func isThematicBreak(_ trimmed: String) -> Bool {
        let noSpaces = trimmed.replacingOccurrences(of: " ", with: "")
        guard noSpaces.count >= 3 else { return false }
        return noSpaces.allSatisfy { $0 == "-" } || noSpaces.allSatisfy { $0 == "*" } || noSpaces.allSatisfy { $0 == "_" }
    }

    nonisolated private static func parseHeading(_ trimmed: String) -> (Int, String)? {
        let hashes = trimmed.prefix(while: { $0 == "#" })
        let level = hashes.count
        guard level >= 1 && level <= 6 else { return nil }
        let rest = trimmed.dropFirst(level)
        guard rest.first == " " else { return nil }
        let text = String(rest.dropFirst()).trimmingCharacters(in: .whitespaces)
        return (level, text)
    }

    nonisolated private static func isTableSeparator(_ trimmed: String) -> Bool {
        guard trimmed.contains("-") && trimmed.contains("|") else { return false }
        let allowed = CharacterSet(charactersIn: "|-: ")
        return trimmed.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    nonisolated private static func splitTableRow(_ trimmed: String) -> [String] {
        var s = trimmed
        if s.hasPrefix("|") { s = String(s.dropFirst()) }
        if s.hasSuffix("|") { s = String(s.dropLast()) }
        return s.components(separatedBy: "|").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    nonisolated private static func parseTableAlignments(_ trimmed: String, count: Int) -> [ArlenTableAlignment] {
        let cols = splitTableRow(trimmed)
        return (0..<count).map { idx in
            guard idx < cols.count else { return .left }
            let c = cols[idx]
            if c.hasPrefix(":") && c.hasSuffix(":") { return .center }
            if c.hasSuffix(":") { return .right }
            return .left
        }
    }

    nonisolated private static func parseListLine(_ line: String) -> (ordered: Bool, startIndex: Int, indent: Int, text: String, isTask: Bool, isChecked: Bool)? {
        let leadingSpaces = line.prefix(while: { $0 == " " || $0 == "\t" }).count
        let indent = leadingSpaces / 2
        let trimmed = String(line.dropFirst(leadingSpaces))

        // Unordered: -, *, +
        if let first = trimmed.first, (first == "-" || first == "*" || first == "+"), trimmed.dropFirst().first == " " {
            let body = String(trimmed.dropFirst(2))
            if body.hasPrefix("[ ] ") {
                return (false, 1, indent, String(body.dropFirst(4)), true, false)
            } else if body.hasPrefix("[x] ") || body.hasPrefix("[X] ") {
                return (false, 1, indent, String(body.dropFirst(4)), true, true)
            }
            return (false, 1, indent, body, false, false)
        }

        // Ordered: 1. ...
        let digits = trimmed.prefix(while: { $0.isNumber })
        if !digits.isEmpty, let num = Int(digits) {
            let afterDigits = trimmed.dropFirst(digits.count)
            if (afterDigits.hasPrefix(". ") || afterDigits.hasPrefix(") ")) {
                let body = String(afterDigits.dropFirst(2))
                return (true, num, indent, body, false, false)
            }
        }
        return nil
    }
}

// MARK: - Inline Formatting & Link Safety

enum ArlenInlineFormatter {
    static let primaryInk = Color(red: 32.0 / 255, green: 33.0 / 255, blue: 39.0 / 255)
    static let secondaryInk = Color(red: 142.0 / 255, green: 142.0 / 255, blue: 147.0 / 255)
    static let linkBlue = Color(red: 57.0 / 255, green: 136.0 / 255, blue: 213.0 / 255)

    private static let allowedSchemes: Set<String> = ["https", "http", "mailto", "tel"]

    static func attributed(_ raw: String, fontSize: CGFloat, weight: Font.Weight = .regular, color: Color = primaryInk) -> AttributedString {
        // Transform inline file/artifact code spans like `cowork-audit.md` or `Arlen.ipa` into `</> filename.ext`
        let filePreprocessed = raw.replacingOccurrences(
            of: #"`([^`\n]+\.(?:ipa|md|swift|ts|tsx|js|mjs|py|sh|json|html|css|yml|yaml|txt|pdf|zip|sql|plist))`"#,
            with: "`</> $1`",
            options: .regularExpression
        )
        // Render inline math $...$ cleanly
        let mathPreprocessed = filePreprocessed.replacingOccurrences(
            of: #"(?<!\$)\$([^\$\n]+?)\$(?!\$)"#,
            with: "`$1`",
            options: .regularExpression
        )

        let options = AttributedString.MarkdownParsingOptions(
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
        guard var attr = try? AttributedString(markdown: mathPreprocessed, options: options) else {
            return AttributedString(raw)
        }

        for run in attr.runs {
            let range = run.range
            if let url = run.link {
                let scheme = url.scheme?.lowercased() ?? ""
                if !allowedSchemes.contains(scheme) {
                    attr[range].link = nil
                    attr[range].foregroundColor = color
                } else {
                    attr[range].foregroundColor = linkBlue
                    attr[range].underlineStyle = .single
                }
            } else if run.inlinePresentationIntent?.contains(.code) == true {
                let textSlice = String(attr[range].characters)
                if textSlice.hasPrefix("</> ") || textSlice.contains(".ipa") || textSlice.contains(".md") {
                    attr[range].foregroundColor = linkBlue
                    attr[range].font = .system(size: fontSize, weight: .medium)
                } else {
                    attr[range].foregroundColor = primaryInk
                    attr[range].font = .system(size: fontSize, weight: .medium, design: .monospaced)
                    attr[range].backgroundColor = Color(UIColor.secondarySystemFill)
                }
            } else if run.inlinePresentationIntent?.contains(.stronglyEmphasized) == true {
                attr[range].font = .system(size: fontSize, weight: .semibold)
                attr[range].foregroundColor = color
            } else if run.inlinePresentationIntent?.contains(.emphasized) == true {
                attr[range].font = .system(size: fontSize, weight: weight).italic()
                attr[range].foregroundColor = color
            } else if run.inlinePresentationIntent?.contains(.strikethrough) == true {
                attr[range].strikethroughStyle = .single
                attr[range].foregroundColor = secondaryInk
            }
        }
        return attr
    }
}

// MARK: - Syntax Highlighter

private enum ArlenSyntaxHighlighter {
    private static let keywords: Set<String> = [
        "func", "struct", "class", "enum", "protocol", "extension", "import", "let", "var",
        "if", "else", "guard", "switch", "case", "default", "for", "while", "return", "throw",
        "throws", "async", "await", "try", "catch", "private", "public", "internal", "static",
        "final", "override", "true", "false", "nil", "null", "undefined", "const", "function",
        "export", "from", "type", "interface", "def", "None", "True", "False", "SELECT", "FROM",
        "WHERE", "INSERT", "UPDATE", "DELETE"
    ]

    static func highlight(_ code: String) -> AttributedString {
        var result = AttributedString(code)
        result.font = .system(size: 13.5, weight: .regular, design: .monospaced)
        result.foregroundColor = ArlenInlineFormatter.primaryInk

        // Highlight strings
        applyRegex(#""[^"\n]*"|'[^'\n]*'"#, color: Color(red: 196.0 / 255, green: 26.0 / 255, blue: 22.0 / 255), in: code, onto: &result)
        // Highlight numbers
        applyRegex(#"\b\d+(?:\.\d+)?\b"#, color: Color(red: 28.0 / 255, green: 0.0 / 255, blue: 207.0 / 255), in: code, onto: &result)
        // Highlight keywords
        let kwPattern = "\\b(" + keywords.joined(separator: "|") + ")\\b"
        applyRegex(kwPattern, color: Color(red: 155.0 / 255, green: 35.0 / 255, blue: 147.0 / 255), in: code, onto: &result, bold: true)
        // Highlight line comments
        applyRegex(#"//[^\n]*|#[^\n]*"#, color: ArlenInlineFormatter.secondaryInk, in: code, onto: &result)

        return result
    }

    private static func applyRegex(_ pattern: String, color: Color, in source: String, onto attr: inout AttributedString, bold: Bool = false) {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return }
        let nsRange = NSRange(source.startIndex..., in: source)
        for match in regex.matches(in: source, range: nsRange) {
            guard let swiftRange = Range(match.range, in: source),
                  let lower = AttributedString.Index(swiftRange.lowerBound, within: attr),
                  let upper = AttributedString.Index(swiftRange.upperBound, within: attr) else { continue }
            attr[lower..<upper].foregroundColor = color
            if bold {
                attr[lower..<upper].font = .system(size: 13.5, weight: .semibold, design: .monospaced)
            }
        }
    }
}

// MARK: - SwiftUI Markdown Renderer

struct ArlenMarkdownRenderer: View {
    let value: String
    var isStreaming: Bool = false

    @ScaledMetric(relativeTo: .body) private var bodySize: CGFloat = 16.0
    @State private var blocks: [ArlenMarkdownBlock] = []

    var body: some View {
        let displayBlocks = blocks.isEmpty ? ArlenMarkdownParser.parse(value, isStreaming: isStreaming) : blocks
        VStack(alignment: .leading, spacing: 12) {
            ForEach(displayBlocks) { block in
                ArlenMarkdownBlockView(block: block, bodySize: bodySize)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .task(id: value) {
            let key = ArlenMarkdownParser.computeHash(value)
            if let hit = ArlenMarkdownParser.lookupCache(key: key, isStreaming: isStreaming) {
                if blocks != hit {
                    blocks = hit
                }
                return
            }
            if let hit = await ArlenMarkdownCacheActor.shared.getBlocks(for: key) {
                if blocks != hit {
                    blocks = hit
                }
                return
            }
            let parsed = await Task.detached(priority: .userInitiated) {
                ArlenMarkdownParser.parseDetached(value, isStreaming: isStreaming)
            }.value
            await ArlenMarkdownCacheActor.shared.setBlocks(parsed, for: key)
            if !Task.isCancelled {
                blocks = parsed
            }
        }
    }
}

private struct ArlenMarkdownBlockView: View {
    let block: ArlenMarkdownBlock
    let bodySize: CGFloat

    var body: some View {
        switch block.kind {
        case .paragraph(let text):
            Text(ArlenInlineFormatter.attributed(text, fontSize: bodySize))
                .font(.system(size: bodySize, weight: .regular))
                .foregroundStyle(ArlenInlineFormatter.primaryInk)
                .tint(ArlenInlineFormatter.linkBlue)
                .lineSpacing(7.0)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)

        case .heading(let level, let text):
            let spec = headingSpec(level)
            Text(ArlenInlineFormatter.attributed(text, fontSize: spec.size, weight: spec.weight))
                .font(.system(size: spec.size, weight: spec.weight))
                .foregroundStyle(ArlenInlineFormatter.primaryInk)
                .lineSpacing(spec.lineSpacing)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
                .padding(.top, level <= 2 ? 16 : 12)
                .padding(.bottom, level <= 2 ? 6 : 4)

        case .codeBlock(let language, let code, let isClosed):
            let langLower = language?.lowercased() ?? ""
            let isVisualTag = langLower == "arlen-visual" || langLower == "visual"
            let isImplicitVisualJSON = (langLower == "json" || langLower.isEmpty) && code.contains("\"component\"")
            if isVisualTag || isImplicitVisualJSON {
                if !isClosed {
                    Text("Preparing visualization…")
                        .font(.system(size: 13.5, weight: .medium))
                        .foregroundStyle(ArlenInlineFormatter.secondaryInk)
                        .padding(.vertical, 6)
                } else if let spec = ArlenVisualRegistry.decodeAndValidate(code) {
                    ArlenVisualBlockView(spec: spec)
                } else if isVisualTag {
                    Text("Visualization summary unavailable.")
                        .font(.system(size: 13.5, weight: .regular))
                        .foregroundStyle(ArlenInlineFormatter.secondaryInk)
                } else {
                    ArlenCodeBlockView(language: language, code: code)
                }
            } else {
                ArlenCodeBlockView(language: language, code: code)
            }

        case .blockquote(let inner):
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                    .fill(Color(UIColor.separator))
                    .frame(width: 3)
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(inner) { child in
                        ArlenMarkdownBlockView(block: child, bodySize: bodySize)
                    }
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(UIColor.secondarySystemBackground).opacity(0.6), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

        case .list(let ordered, let startIndex, let items):
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(items.enumerated()), id: \.offset) { idx, item in
                    HStack(alignment: .top, spacing: 10) {
                        if item.isTask {
                            Image(systemName: item.isChecked ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(item.isChecked ? ArlenInlineFormatter.primaryInk : ArlenInlineFormatter.secondaryInk)
                                .padding(.top, 3)
                        } else if ordered {
                            Text("\(startIndex + idx).")
                                .font(.system(size: bodySize, weight: .semibold))
                                .foregroundStyle(ArlenInlineFormatter.secondaryInk)
                                .frame(minWidth: 20, alignment: .leading)
                        } else {
                            Circle()
                                .fill(ArlenInlineFormatter.secondaryInk)
                                .frame(width: 6, height: 6)
                                .padding(.top, 8)
                                .frame(width: 14, alignment: .center)
                        }
                        Text(ArlenInlineFormatter.attributed(item.text, fontSize: bodySize))
                            .font(.system(size: bodySize, weight: .regular))
                            .foregroundStyle(ArlenInlineFormatter.primaryInk)
                            .tint(ArlenInlineFormatter.linkBlue)
                            .lineSpacing(7.0)
                            .fixedSize(horizontal: false, vertical: true)
                            .textSelection(.enabled)
                    }
                    .padding(.leading, CGFloat(item.indent) * 20)
                }
            }

        case .table(let headers, let alignments, let rows):
            ArlenTableView(headers: headers, alignments: alignments, rows: rows, bodySize: bodySize)

        case .mathBlock(let expr):
            ScrollView(.horizontal, showsIndicators: false) {
                Text(expr)
                    .font(.system(size: 14.5, weight: .medium, design: .monospaced))
                    .foregroundStyle(ArlenInlineFormatter.primaryInk)
                    .textSelection(.enabled)
                    .padding(12)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(EvoTheme.Palette.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))

        case .thematicBreak:
            Rectangle()
                .fill(Color(UIColor.separator).opacity(0.6))
                .frame(height: 1)
                .padding(.vertical, 6)
        }
    }

    private func headingSpec(_ level: Int) -> (size: CGFloat, weight: Font.Weight, lineSpacing: CGFloat) {
        let scale = bodySize / 16.0
        switch level {
        case 1: return (20 * scale, .bold, 4)
        case 2: return (18.5 * scale, .bold, 4)
        case 3: return (16.5 * scale, .semibold, 3.5)
        default: return (16 * scale, .semibold, 3.5)
        }
    }
}

private struct ArlenCodeBlockView: View {
    let language: String?
    let code: String
    @State private var copied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(language?.lowercased() ?? "code")
                    .font(.system(size: 12.5, weight: .medium, design: .monospaced))
                    .foregroundStyle(ArlenInlineFormatter.secondaryInk)
                Spacer()
                Button {
                    UIPasteboard.general.string = code
                    EvoHaptics.tap()
                    copied = true
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 1_400_000_000)
                        copied = false
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 12, weight: .medium))
                        Text(copied ? "Copied" : "Copy")
                            .font(.system(size: 12.5, weight: .medium))
                    }
                    .foregroundStyle(ArlenInlineFormatter.secondaryInk)
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 13)
            .padding(.top, 9)
            .padding(.bottom, 6)

            Divider().opacity(0.45)

            ScrollView(.horizontal, showsIndicators: false) {
                Text(ArlenSyntaxHighlighter.highlight(code))
                    .lineSpacing(4.5)
                    .textSelection(.enabled)
                    .padding(13)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EvoTheme.Palette.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct ArlenTableView: View {
    let headers: [String]
    let alignments: [ArlenTableAlignment]
    let rows: [[String]]
    let bodySize: CGFloat

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    ForEach(Array(headers.enumerated()), id: \.offset) { idx, header in
                        Text(ArlenInlineFormatter.attributed(header, fontSize: max(13, bodySize - 1.5), weight: .semibold))
                            .font(.system(size: max(13, bodySize - 1.5), weight: .semibold))
                            .foregroundStyle(ArlenInlineFormatter.primaryInk)
                            .frame(minWidth: 110, alignment: frameAlignment(idx))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                    }
                }
                .background(EvoTheme.Palette.surface)

                ForEach(Array(rows.enumerated()), id: \.offset) { rIdx, row in
                    Divider().opacity(0.5)
                    HStack(spacing: 0) {
                        ForEach(Array(row.enumerated()), id: \.offset) { cIdx, cell in
                            Text(ArlenInlineFormatter.attributed(cell, fontSize: max(13, bodySize - 1.5)))
                                .font(.system(size: max(13, bodySize - 1.5), weight: .regular))
                                .foregroundStyle(ArlenInlineFormatter.primaryInk)
                                .textSelection(.enabled)
                                .frame(minWidth: 110, alignment: frameAlignment(cIdx))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                        }
                    }
                }
            }
        }
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color(UIColor.separator).opacity(0.6), lineWidth: 1))
    }

    private func frameAlignment(_ idx: Int) -> Alignment {
        guard idx < alignments.count else { return .leading }
        switch alignments[idx] {
        case .left: return .leading
        case .center: return .center
        case .right: return .trailing
        }
    }
}
