/**
 * Render AI answers as readable, non-interactive prose.
 * This is deliberately a text transformer, not an HTML/Markdown renderer:
 * React still escapes the returned string.
 */
export function plainChatText(input: string): string {
  if (!input) return ""

  const normalized = input
    .replace(/\r\n?/g, "\n")
    // Discard embedded media directives rather than displaying or fetching them.
    .replace(/!\[[^\]\n]*\]\((?:[^)(]|\([^)(]*\))*\)/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    // Keep a human-readable label instead of a clickable Markdown link.
    .replace(/\[([^\]\n]+)\]\((?:[^)(]|\([^)(]*\))*\)/g, "$1")
    .replace(/<\/?a(?:\s[^>]*)?>/gi, "")
    // Plain-chat responses should not advertise or render external links.
    .replace(/https?:\/\/[^\s<>)\]]+/gi, "")

  const lines: string[] = []
  let inFence = false
  for (let line of normalized.split("\n")) {
    if (/^\s*\x60{3,}/.test(line) || /^\s*~{3,}/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      // Preserve code/examples only as ordinary text. Never execute or format them.
      lines.push(line)
      continue
    }
    if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) {
      lines.push("")
      continue
    }
    // Convert old Markdown tables to plain lines instead of a visual table.
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim())
      if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) continue
      line = cells.join(" — ")
    }
    line = line
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/^\s{0,3}>\s?/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^(\s*\d+)\.\s+/, "$1. ")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/__([^_\n]+)__/g, "$1")
      .replace(/~~([^~\n]+)~~/g, "$1")
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1$2")
      .replace(/\x60([^\x60\n]+)\x60/g, "$1")
    lines.push(line)
  }

  return lines.join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
