"use client"

/** Shares one brief, in-flight /api/space request across Library and Tools.
 * A negative (unconfigured) result is reused longer; active storage stays fresh.
 * It is a per-browser optimization, never a shared server/user cache.
 */
export type SpaceStatus = {
  available?: boolean
  entries?: { id?: string; kind?: string; name?: string; [key: string]: unknown }[]
  storageUsed?: number
  storageTotal?: number
}
let cached: SpaceStatus | null = null
let validUntil = 0
let pending: Promise<SpaceStatus | null> | null = null

export function readSpaceStatus(): Promise<SpaceStatus | null> {
  if (Date.now() < validUntil) return Promise.resolve(cached)
  if (pending) return pending
  pending = fetch("/api/space", { cache: "no-store" })
    .then(async response => {
      if (!response.ok) return null
      const value: unknown = await response.json()
      if (!value || typeof value !== "object" || Array.isArray(value)) return null
      const data = value as SpaceStatus
      cached = data
      validUntil = Date.now() + (data.available === true ? 4_000 : 30_000)
      return data
    })
    .catch(() => null)
    .finally(() => { pending = null })
  return pending
}

export function invalidateSpaceStatus() {
  cached = null
  validUntil = 0
}
