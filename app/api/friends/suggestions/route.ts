import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "../../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const COOKIE = "evolingo_session"

function makeTag(name: string) {
  const safe = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8).padEnd(4, "X")
  return "EVO-" + safe + "-0001"
}

export async function GET() {
  try {
    const jar = await cookies()
    const sessionId = jar.get(COOKIE)?.value
    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return NextResponse.json({ profiles: [] })
    }
    const db = await getDatabase()
    const users = await db.collection<{ _id: string; userName?: unknown; avatar?: unknown; avatarImage?: unknown; xp?: unknown; streak?: unknown; lastSeenAt?: unknown; completedLessons?: unknown }>("users")
      .find({ _id: { $ne: sessionId }, userName: { $type: "string", $ne: "" } })
      .project({ userName: 1, avatar: 1, avatarImage: 1, xp: 1, streak: 1, lastSeenAt: 1, completedLessons: 1 })
      .sort({ lastSeenAt: -1 })
      .limit(20)
      .toArray()
    const profiles = users.map(user => {
      const name = typeof user.userName === "string" && user.userName.trim() ? user.userName.trim() : "Tanuló"
      const lastSeen = user.lastSeenAt instanceof Date ? user.lastSeenAt.getTime() : 0
      const streak = typeof user.streak === "number" && Number.isFinite(user.streak) ? Math.max(0, Math.floor(user.streak)) : null
      return {
        id: String(user._id),
        name,
        handle: "@" + name.replace(/\s+/g, "").slice(0, 24),
        evoTag: makeTag(name),
        avatar: name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase(),
        avatarImage: typeof user.avatarImage === "string" && user.avatarImage.startsWith("data:image/") ? user.avatarImage : "",
        streak,
        xp: typeof user.xp === "number" && Number.isFinite(user.xp) ? Math.max(0, user.xp) : 0,
        status: lastSeen && Date.now() - lastSeen < 5 * 60 * 1000 ? "Most aktív" : "Tanuló",
        online: Boolean(lastSeen && Date.now() - lastSeen < 5 * 60 * 1000),
      }
    })
    return NextResponse.json({ profiles })
  } catch (error) {
    console.error("GET /api/friends/suggestions failed", error)
    return NextResponse.json({ profiles: [] }, { status: 200 })
  }
}
