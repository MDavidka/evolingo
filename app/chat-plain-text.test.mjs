import test from "node:test"
import assert from "node:assert/strict"
import { plainChatText } from "./chat-plain-text.ts"

test("cleans the raw Markdown visible in previous iPhone replies", () => {
  const raw = [
    "### 1. példa – Életélmény",
    "",
    "> **I have visited Rome twice.**",
    "> *Kétszer jártam Rómában.*",
    "",
    "---",
    "",
    "2. **A múltban kezdődött helyzet, ami még tart** (since, for).",
  ].join("\n")
  const text = plainChatText(raw)
  assert.match(text, /^1\. példa – Életélmény/)
  assert.match(text, /I have visited Rome twice\./)
  assert.match(text, /Kétszer jártam Rómában\./)
  assert.match(text, /2\. A múltban kezdődött helyzet/)
  assert.doesNotMatch(text, /\*\*|^###|^>|^---/m)
})

test("does not display pictures or external links from old responses", () => {
  const text = plainChatText("Kép: ![rajz](https://example.org/image.png)\n[Forrás](https://example.org)\nhttps://example.org/raw")
  assert.equal(text, "Kép:\nForrás")
})

test("converts old Markdown table rows to ordinary lines", () => {
  const text = plainChatText("| Idő | Használat |\n| --- | --- |\n| Present Perfect | Tapasztalat |")
  assert.equal(text, "Idő — Használat\nPresent Perfect — Tapasztalat")
})

test("keeps normal Hungarian paragraphs, numbering and examples readable", () => {
  const raw = "Első bekezdés.\n\nMásodik bekezdés.\n1. Példa\n2. Magyarázat."
  assert.equal(plainChatText(raw), raw)
})

test("removes code fences and formatting without evaluating content", () => {
  const text = plainChatText("Példa:\n" + "\x60\x60\x60json\n" + '{"ok":true}' + "\n\x60\x60\x60")
  assert.equal(text, 'Példa:\n{"ok":true}')
})
