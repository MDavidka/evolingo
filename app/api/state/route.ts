import { createHash, randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const COOKIE = "evolingo_session"
const COOKIE_AGE = 60 * 60 * 24 * 365

const guestAdjectives = ["Vidám", "Bátor", "Kíváncsi", "Csendes", "Ügyes", "Fürge", "Derűs", "Bölcs", "Kitartó", "Kreatív", "Barátságos", "Gyors"]
const guestAnimals = ["Róka", "Vidra", "Bagoly", "Mókus", "Panda", "Farkas", "Süni", "Delfin", "Nyuszi", "Koala", "Tigris", "Hód", "Macska", "Sas", "Medve"]

function makeGuestName(sessionId: string) {
  let hash = 2166136261
  for (const char of sessionId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  const seed = hash >>> 0
  const adjective = guestAdjectives[seed % guestAdjectives.length]
  const animal = guestAnimals[(seed >>> 8) % guestAnimals.length]
  const suffix = 1000 + ((seed >>> 16) % 9000)
  return adjective + " " + animal + " " + suffix
}
function publicSessionKey(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 24)
}
type UserDocument = {
  _id: string
  [key: string]: unknown
}

const allowed = new Set([
  "userName", "avatar", "notifications", "compactMode", "theme", "avatarImage", "bannerImage",
  "createdAt", "updatedAt", "clientUpdatedAt",
])
function safeState(doc: Record<string, unknown>) {
  const state: Record<string, unknown> = {}
  for (const key of allowed) if (key in doc) state[key] = doc[key]
  return state
}

async function getSessionId() {
  const jar = await cookies()
  let id = jar.get(COOKIE)?.value
  let created = false
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    id = randomUUID()
    created = true
  }
  return { id, created }
}
function sessionCookie(response: NextResponse, id: string, created: boolean) {
  if (created) response.cookies.set(COOKIE, id, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: COOKIE_AGE,
  })
  return response
}

export async function GET() {
  try {
    const { id, created } = await getSessionId()
    const db = await getDatabase()
    const users = db.collection<UserDocument>("users")
    await users.updateOne({ _id: id }, { $setOnInsert: {
      userName: makeGuestName(id), avatar: "fox", notifications: false, compactMode: false, theme: "mist",
      clientUpdatedAt: 0, createdAt: new Date(),
    }, $set: { lastSeenAt: new Date(), isGuest: true } }, { upsert: true })
    // Older sessions used placeholders. Keep every pre-existing document field untouched.
    await users.updateOne({
      _id: id,
      $or: [{ userName: "MDavid" }, { userName: "" }, { userName: { $exists: false } }],
    }, { $set: { userName: makeGuestName(id), isGuest: true, updatedAt: new Date() } })
    const doc = await users.findOne({ _id: id })
    return sessionCookie(NextResponse.json({ state: safeState((doc || {}) as Record<string, unknown>), sessionKey: publicSessionKey(id) }), id, created)
  } catch (error) {
    console.error("GET /api/state failed", error)
    return NextResponse.json({ error: "Az adatok most nem érhetők el. Ellenőrizd a MongoDB kapcsolatot." }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, created } = await getSessionId()
    const body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Érvénytelen adatok." }, { status: 400 })
    }
    const update: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (!allowed.has(key) || key === "createdAt" || key === "updatedAt") continue
      if (key === "userName" && (typeof value !== "string" || value.trim().length < 1 || value.length > 32)) continue
      if (key === "avatar" && (typeof value !== "string" || !["fox","book","star","spark"].includes(value))) continue
      if (["notifications","compactMode"].includes(key) && typeof value !== "boolean") continue
      if (key === "theme" && !["mist","sage"].includes(String(value))) continue
      if (key === "clientUpdatedAt" && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) continue
      if (["avatarImage","bannerImage"].includes(key) && (typeof value !== "string" || value.length > 5_000_000 || (value !== "" && !value.startsWith("data:image/")))) continue
      update[key] = value
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nincs menthető adat." }, { status: 400 })
    // The anonymous browser session itself is the guest profile. If the first GET
    // failed, let a retry create the MongoDB document from the locally preserved state.
    if (update.userName === "MDavid") update.userName = makeGuestName(id)
    update.isGuest = true
    update.isSynced = true
    update.updatedAt = new Date()
    const db = await getDatabase()
    const users = db.collection<UserDocument>("users")
    const requestedVersion = typeof update.clientUpdatedAt === "number" ? update.clientUpdatedAt : null
    if (requestedVersion !== null) {
      const existing = await users.findOne({ _id: id }, { projection: { clientUpdatedAt: 1, userName: 1 } })
      const savedVersion = typeof existing?.clientUpdatedAt === "number" ? existing.clientUpdatedAt : 0
      if (savedVersion > requestedVersion) {
        const response = NextResponse.json({ ok: true, ignored: true, sessionKey: publicSessionKey(id), userName: existing?.userName, clientUpdatedAt: savedVersion })
        return sessionCookie(response, id, created)
      }
    }
    const defaults: Record<string, unknown> = {
      userName: makeGuestName(id), avatar: "fox", notifications: false,
      compactMode: false, theme: "mist", clientUpdatedAt: 0,
    }
    // MongoDB rejects updating the same field with both $set and $setOnInsert.
    for (const key of Object.keys(update)) delete defaults[key]
    await users.updateOne(
      { _id: id },
      { $set: update, $setOnInsert: { createdAt: new Date(), ...defaults } },
      { upsert: true },
    )
    const response = NextResponse.json({
      ok: true,
      sessionKey: publicSessionKey(id),
      userName: update.userName,
      ...(requestedVersion !== null ? { clientUpdatedAt: requestedVersion } : {}),
    })
    return sessionCookie(response, id, created)
  } catch (error) {
    console.error("PATCH /api/state failed", error)
    return NextResponse.json({ error: "A mentés sikertelen. Ellenőrizd a MongoDB kapcsolatot." }, { status: 503 })
  }
}
