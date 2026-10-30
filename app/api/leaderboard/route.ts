import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COOKIE = "evolingo_session"
const PAGE_SIZE = 50
const ACTIVE_GUEST_DAYS = 30

type UserRecord = {
  _id: string
  userName?: unknown
  avatar?: unknown
  stars?: unknown
  xp?: unknown
}

function toEntry(user: UserRecord, rank: number, sessionId: string) {
  return {
    id: String(user._id),
    rank,
    name: (user.userName as string).trim(),
    avatar: typeof user.avatar === "string" ? user.avatar : "fox",
    avatarImage: "",
    stars: typeof user.stars === "number" && Number.isFinite(user.stars) ? Math.max(0, Math.floor(user.stars)) : 0,
    isCurrent: String(user._id) === sessionId,
  }
}

export async function GET(request: NextRequest) {
  try {
    const jar = await cookies()
    const sessionId = jar.get(COOKIE)?.value || ""
    const requestedOffset = Number(request.nextUrl.searchParams.get("offset") || 0)
    const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? Math.min(requestedOffset, 10_000) : 0
    const db = await getDatabase()
    const users = db.collection<UserRecord>("users")
    const activeGuestSince = new Date(Date.now() - ACTIVE_GUEST_DAYS * 24 * 60 * 60 * 1000)
    const eligible = {
      userName: { $type: "string", $ne: "" }, stars: { $gt: 0 },
      showOnLeaderboard: { $ne: false }, role: { $ne: "admin" }, isAdmin: { $ne: true }, isTest: { $ne: true },
      $or: [{ isGuest: { $ne: true } }, { lastSeenAt: { $gte: activeGuestSince } }],
    }
    const total = await users.countDocuments(eligible)
    const page = await users.find(eligible)
      .project<UserRecord>({ userName: 1, avatar: 1, stars: 1, xp: 1 })
      .sort({ stars: -1, xp: -1, userName: 1, _id: 1 })
      .skip(offset)
      .limit(PAGE_SIZE)
      .toArray()

    let entries = page.map((user, index) => toEntry(user, offset + index + 1, sessionId))
    let currentEntry = entries.find(entry => entry.isCurrent) ?? null
    if (sessionId && !currentEntry) {
      const current = await users.findOne({ _id: sessionId, ...eligible }, { projection: { userName: 1, avatar: 1, stars: 1, xp: 1 } }) as UserRecord | null
      if (current && typeof current.userName === "string" && current.userName.trim()) {
        const currentStars = typeof current.stars === "number" ? current.stars : 0
        const currentXp = typeof current.xp === "number" ? current.xp : 0
        const ahead = await users.countDocuments({ $and: [eligible, {
          $or: [
            { stars: { $gt: currentStars } },
            { stars: currentStars, xp: { $gt: currentXp } },
            { stars: currentStars, xp: currentXp, userName: { $lt: current.userName } },
          ],
        }] })
        currentEntry = toEntry(current, ahead + 1, sessionId)
      }
    }
    // An identity is its unique users._id; never expose duplicate records for the same account.
    const seen = new Set<string>()
    entries = entries.filter(entry => {
      if (seen.has(entry.id)) return false
      seen.add(entry.id)
      return true
    })
    return NextResponse.json({ entries, currentEntry, total, offset, limit: PAGE_SIZE, hasMore: offset + page.length < total })
  } catch (error) {
    console.error("GET /api/leaderboard failed", error)
    return NextResponse.json({ entries: [], currentEntry: null, total: 0, offset: 0, limit: PAGE_SIZE, hasMore: false }, { status: 503 })
  }
}
