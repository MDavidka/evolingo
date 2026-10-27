import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COOKIE = "evolingo_session"

type UserRecord = {
  _id: string
  userName?: unknown
  avatar?: unknown
  avatarImage?: unknown
  stars?: unknown
  xp?: unknown
}

export async function GET() {
  try {
    const jar = await cookies()
    const sessionId = jar.get(COOKIE)?.value || ""
    const db = await getDatabase()
    const users = await db.collection<UserRecord>("users")
      .find({ userName: { $type: "string", $ne: "" } })
      .project({ userName: 1, avatar: 1, avatarImage: 1, stars: 1, xp: 1 })
      .toArray()

    const entries = users
      .filter(user => typeof user.userName === "string" && user.userName.trim().length > 0)
      .map(user => ({
        id: String(user._id),
        name: (user.userName as string).trim(),
        avatar: typeof user.avatar === "string" ? user.avatar : "fox",
        avatarImage: typeof user.avatarImage === "string" && user.avatarImage.startsWith("data:image/") ? user.avatarImage : "",
        stars: typeof user.stars === "number" && Number.isFinite(user.stars) ? Math.max(0, Math.floor(user.stars)) : 0,
        xp: typeof user.xp === "number" && Number.isFinite(user.xp) ? Math.max(0, Math.floor(user.xp)) : 0,
      }))
      .sort((left, right) => right.stars - left.stars || right.xp - left.xp || left.name.localeCompare(right.name, "hu"))
      .map((entry, index) => ({
        id: entry.id,
        rank: index + 1,
        name: entry.name,
        avatar: entry.avatar,
        avatarImage: entry.avatarImage,
        stars: entry.stars,
        isCurrent: entry.id === sessionId,
      }))

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("GET /api/leaderboard failed", error)
    return NextResponse.json({ entries: [] }, { status: 503 })
  }
}
