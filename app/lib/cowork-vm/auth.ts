import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"
import { getDatabase } from "../../../lib/mongodb"

const SESSION_COOKIE = "evolingo_session"

/** Resolve the existing guest session from its HTTP-only cookie, never request JSON. */
export async function coworkOwnerFor(request: NextRequest): Promise<string | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null

  const db = await getDatabase()
  const user = await db.collection<{ _id: string }>("users").findOne(
    { _id: sessionId },
    { projection: { _id: 1 } },
  )
  if (!user) return null

  // Use a non-reversible owner key for Cowork records; the raw cookie stays server-side.
  return createHash("sha256").update(`cowork-owner:${sessionId}`).digest("hex")
}

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (!origin || !host) return false

  try {
    const parsed = new URL(origin)
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim()
    const expectedProtocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "")
    return parsed.host === host && parsed.protocol === `${expectedProtocol}:`
  } catch {
    return false
  }
}
