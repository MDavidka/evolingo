export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_TEXT_BYTES = 96 * 1024
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".tsv"] as const

export type ChatAttachment = {
  name: string
  kind: "image" | "text"
  mime: string
  data: string
}

export function validateAttachment(input: unknown): ChatAttachment | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const a = input as Record<string, unknown>
  if (Object.keys(a).some(key => !["name", "kind", "mime", "data"].includes(key))) return null
  if (typeof a.name !== "string" || !a.name || a.name.length > 100 ||
      /[\\/\u0000-\u001f]/.test(a.name) || typeof a.mime !== "string" ||
      typeof a.data !== "string") return null
  if (a.kind === "image" && IMAGE_TYPES.includes(a.mime as typeof IMAGE_TYPES[number])) {
    const prefix = "data:" + a.mime + ";base64,"
    if (!a.data.startsWith(prefix)) return null
    const b64 = a.data.slice(prefix.length)
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4) return null
    const bytes = Buffer.from(b64, "base64")
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null
    const magic = a.mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
      a.mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
      bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
    return magic ? a as ChatAttachment : null
  }
  if (a.kind === "text" && a.mime === "text/plain" &&
      TEXT_EXTENSIONS.some(ext => a.name.toLowerCase().endsWith(ext)) &&
      a.data.length > 0 && a.data.length <= 12000 && !/[\u0000-\u0008]/.test(a.data)) return a as ChatAttachment
  return null
}
