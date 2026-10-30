import assert from "node:assert/strict"
import test from "node:test"
import { validateAttachment } from "./chat-attachments.ts"

test("accepts valid small PNG upload", () => {
  const data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"
  assert.ok(validateAttachment({ kind: "image", name: "picture.png", mime: "image/png", data }))
})

test("rejects unsupported and invalid image uploads", () => {
  assert.equal(validateAttachment({ kind: "image", name: "fake.png", mime: "image/png", data: "data:image/png;base64,SGVsbG8=" }), null)
  assert.equal(validateAttachment({ kind: "image", name: "unsafe.svg", mime: "image/svg+xml", data: "<svg/>" }), null)
})

test("accepts text files but rejects executable attachments", () => {
  assert.ok(validateAttachment({ kind: "text", name: "notes.md", mime: "text/plain", data: "My notes" }))
  assert.equal(validateAttachment({ kind: "text", name: "script.js", mime: "text/plain", data: "alert(1)" }), null)
})
