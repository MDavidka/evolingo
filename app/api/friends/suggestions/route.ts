import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "../../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const COOKIE = "evolingo_session"

const generatedAdjectives = ["Vidám", "Bátor", "Kíváncsi", "Csendes", "Ügyes", "Fürge", "Derűs", "Bölcs", "Kitartó", "Kreatív", "Barátságos", "Gyors"]
const generatedAnimals = ["Róka", "Vidra", "Bagoly", "Mókus", "Panda", "Farkas", "Süni", "Delfin", "Nyuszi", "Koala", "Tigris", "Hód", "Macska", "Sas", "Medve"]

function isGeneratedGuestName(value: string) {
  const parts = value.trim().split(/\\s+/)
  return parts.length === 3 && generatedAdjectives.includes(parts[0]) && generatedAnimals.includes(parts[1]) && /^\\d{4}$/.test(parts[2])
}

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
    const users = await db.collection<{ _id: string; userName?: unknown; avatar?: unknown; avatarImage?: unknown; xp?: unknown; streak?: unknown; dailyStreak?: unknown; lastSeenAt?: unknown; completedLessons?: unknown; isGuest?: unknown; isSynced?: unknown }>("users")
      .find({ _id: { $ne: sessionId }, userName: { $type: "string", $ne: "" }, isSynced: true })
      .project({ userName: 1, avatar: 1, avatarImage: 1, xp: 1, streak: 1, dailyStreak: 1, lastSeenAt: 1, completedLessons: 1, isGuest: 1 })
      .sort({ lastSeenAt: -1 })
      .toArray()
    const profiles = users
      .filter(user => typeof user.userName === "string" && Boolean(user.userName.trim()) && !isGeneratedGuestName(user.userName))
      .map(user => {
      const name = user.userName.trim()
      const lastSeen = user.lastSeenAt instanceof Date ? user.lastSeenAt.getTime() : 0
      const rawStreak = typeof user.dailyStreak === "number" ? user.dailyStreak : user.streak
      const streak = typeof rawStreak === "number" && Number.isFinite(rawStreak) ? Math.max(0, Math.floor(rawStreak)) : 0
      const animal = name.split(/\s+/)[1] || ""
      const animalAvatar: Record<string, string> = {
        Róka: "🦊", Vidra: "🦦", Bagoly: "🦉", Mókus: "🐿️", Panda: "🐼",
        Farkas: "🐺", Süni: "🦔", Delfin: "🐬", Nyuszi: "🐰", Koala: "🐨",
        Tigris: "🐯", Hód: "🦫", Macska: "🐱", Sas: "🦅", Medve: "🐻",
      }
      return {
        id: String(user._id),
        name,
        handle: "@" + name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24).toLowerCase(),
        evoTag: makeTag(name),
        avatar: animalAvatar[animal] || name.split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase(),
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
