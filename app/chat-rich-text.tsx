"use client"

import { useMemo, type ReactNode } from "react"

/**
 * Small, non-executable Markdown renderer for the Evölingo chat.
 * React escapes every text fragment; no arbitrary HTML or generated JSX runs.
 * Unlike the old string-only bubble, this renders model headings, examples,
 * tables, emphasis and verified HTTPS links/images as actual UI.
 */

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; values: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string }
  | { type: "rule" }

function safeUrl(source: string): string | null {
  const input = source.trim()
  if (input.startsWith("/") && !input.startsWith("//") && !input.includes("\\")) return input
  try {
    const url = new URL(input)
    if (url.protocol !== "https:" || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
        /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null
    return url.toString()
  } catch {
    return null
  }
}

function safeImage(source: string): string | null {
  const safe = safeUrl(source)
  if (!safe) return null
  if (safe.startsWith("/") && !safe.startsWith("//")) return safe
  try {
    const host = new URL(safe).hostname.toLowerCase()
    if (host === "images.unsplash.com" || host === "upload.wikimedia.org" ||
        host === "images.pexels.com" || host === "cdn.pixabay.com") return safe
  } catch {}
  return null
}

const inlinePattern = /(!\[[^\]\n]*\]\([^\n)]*\)|\[[^\]\n]+\]\([^\n)]*\)|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|\x60[^\x60\n]+\x60)/g

function inline(source: string, prefix: string, depth = 0): ReactNode[] {
  if (depth > 3) return [source]
  const nodes: ReactNode[] = []
  let cursor = 0
  let sequence = 0
  for (const match of source.matchAll(inlinePattern)) {
    const token = match[0]
    const index = match.index ?? 0
    if (index > cursor) nodes.push(source.slice(cursor, index))
    const key = prefix + "-" + (sequence++)
    if (token.startsWith("![")) {
      const parsed = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token)
      const src = parsed && safeImage(parsed[2])
      if (parsed && src) nodes.push(<img key={key} className="evo-rich-image" src={src} alt={parsed[1]} loading="lazy" referrerPolicy="no-referrer" />)
      else if (parsed?.[1]) nodes.push(<span key={key}>{parsed[1]}</span>)
    } else if (token.startsWith("[")) {
      const parsed = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      const href = parsed && safeUrl(parsed[2])
      if (parsed && href) nodes.push(<a key={key} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel={href.startsWith("/") ? undefined : "noopener noreferrer"}>{parsed[1]}</a>)
      else if (parsed) nodes.push(<span key={key}>{parsed[1]}</span>)
      else nodes.push(token)
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key}>{inline(token.slice(2, -2), key, depth + 1)}</strong>)
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key}>{inline(token.slice(2, -2), key, depth + 1)}</del>)
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(<em key={key}>{inline(token.slice(1, -1), key, depth + 1)}</em>)
    } else if (token.startsWith("\x60")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else {
      nodes.push(token)
    }
    cursor = index + token.length
  }
  if (cursor < source.length) nodes.push(source.slice(cursor))
  return nodes
}

const fence = /^\s{0,3}(?:\x60{3,}|~{3,})/
const heading = /^\s{0,3}(#{1,6})\s+(.+)$/
const rule = /^\s{0,3}(?:[-*_]\s*){3,}$/
const quote = /^\s{0,3}>\s?(.*)$/
const unordered = /^\s{0,3}[-*+]\s+(.+)$/
const ordered = /^\s{0,3}\d+[.)]\s+(.+)$/

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim())
}
function isTableSeparator(line: string) {
  const cells = tableCells(line)
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell))
}
function startsBlock(lines: string[], at: number) {
  const line = lines[at]
  return fence.test(line) || !!heading.exec(line) || rule.test(line) ||
    !!quote.exec(line) || !!unordered.exec(line) || !!ordered.exec(line) ||
    (line.includes("|") && at + 1 < lines.length && isTableSeparator(lines[at + 1]))
}

function parse(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const blocks: Block[] = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (fence.test(line)) {
      const contents: string[] = []
      i++
      while (i < lines.length && !fence.test(lines[i])) contents.push(lines[i++])
      if (i < lines.length) i++
      blocks.push({ type: "code", text: contents.join("\n") })
      continue
    }
    const h = heading.exec(line)
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2] })
      i++
      continue
    }
    if (rule.test(line)) { blocks.push({ type: "rule" }); i++; continue }
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = tableCells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(tableCells(lines[i]).slice(0, headers.length))
        i++
        if (rows.length >= 30) break
      }
      blocks.push({ type: "table", headers, rows })
      continue
    }
    if (quote.test(line)) {
      const contents: string[] = []
      while (i < lines.length) {
        const m = quote.exec(lines[i])
        if (!m) break
        contents.push(m[1])
        i++
      }
      blocks.push({ type: "quote", text: contents.join("\n") })
      continue
    }
    const listMatch = ordered.exec(line) || unordered.exec(line)
    if (listMatch) {
      const isOrdered = !!ordered.exec(line)
      const values: string[] = []
      while (i < lines.length) {
        const m = (isOrdered ? ordered : unordered).exec(lines[i])
        if (!m) break
        values.push(m[1])
        i++
        if (values.length >= 60) break
      }
      blocks.push({ type: "list", ordered: isOrdered, values })
      continue
    }
    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() && (paragraph.length === 0 || !startsBlock(lines, i))) {
      paragraph.push(lines[i++])
    }
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") })
    else i++
  }
  return blocks
}

export default function ChatRichText({ text }: { text: string }) {
  const blocks = useMemo(() => parse(text), [text])
  return <div className="evo-rich-text">
    {blocks.map((block, i) => {
      const key = "content-" + i
      switch (block.type) {
        case "heading": return block.level <= 2
          ? <h3 key={key}>{inline(block.text, key)}</h3>
          : <h4 key={key}>{inline(block.text, key)}</h4>
        case "paragraph": return <p key={key}>{inline(block.text, key)}</p>
        case "quote": return <blockquote key={key}>{block.text.split("\n").map((line, j) =>
          <p key={j}>{inline(line, key + j)}</p>
        )}</blockquote>
        case "code": return <pre key={key}><code>{block.text}</code></pre>
        case "rule": return <hr key={key} />
        case "list": return block.ordered
          ? <ol key={key}>{block.values.map((value, j) => <li key={j}>{inline(value, key + j)}</li>)}</ol>
          : <ul key={key}>{block.values.map((value, j) => <li key={j}>{inline(value, key + j)}</li>)}</ul>
        case "table": return <div key={key} className="evo-rich-table-wrap" role="region" aria-label="Összehasonlító táblázat" tabIndex={0}>
          <table><thead><tr>{block.headers.map((value, j) => <th key={j} scope="col">{inline(value, key + "h" + j)}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, ri) => <tr key={ri}>{block.headers.map((_, ci) =>
              <td key={ci}>{inline(row[ci] ?? "", key + "r" + ri + "c" + ci)}</td>
            )}</tr>)}</tbody></table>
        </div>
        default: return null
      }
    })}
  </div>
}
