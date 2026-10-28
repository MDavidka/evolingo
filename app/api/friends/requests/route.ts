import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getDatabase } from "../../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const COOKIE = "evolingo_session"
type RequestDoc = { from: string; to: string; status: "pending" | "accepted" | "declined"; createdAt: Date; updatedAt: Date }
const err = (message: string, status: number) => NextResponse.json({ error: message }, { status })
async function session() {
  const id = (await cookies()).get(COOKIE)?.value
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null
}
export async function GET() {
  try {
    const id = await session()
    if (!id) return err("Jelentkezz be újra.", 401)
    const db = await getDatabase()
    const requests = db.collection<RequestDoc>("friend_request_events")
    const [incoming, outgoing, accepted] = await Promise.all([
      requests.find({ to: id, status: "pending" }).sort({ createdAt: -1 }).limit(100).toArray(),
      requests.find({ from: id, status: "pending" }).limit(100).toArray(),
      requests.find({ status: "accepted", $or: [{ from: id }, { to: id }] }).limit(200).toArray(),
    ])
    return NextResponse.json({
      incoming: incoming.map(x => x.from),
      outgoing: outgoing.map(x => x.to),
      friends: accepted.map(x => x.from === id ? x.to : x.from),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) { console.error("GET friend requests", e); return err("A barátkérések nem érhetők el.", 503) }
}
export async function POST(request: NextRequest) {
  try {
    const id = await session()
    if (!id) return err("Jelentkezz be újra.", 401)
    const body = await request.json().catch(() => ({}))
    const target = typeof body.target === "string" ? body.target : ""
    const action = body.action
    if (!/^[0-9a-f-]{36}$/i.test(target) || target === id) return err("Érvénytelen felhasználó.", 400)
    if (!["send", "accept", "decline"].includes(action)) return err("Érvénytelen művelet.", 400)
    const db = await getDatabase()
    const users = db.collection("users")
    if (!await users.findOne({ _id: target }, { projection: { _id: 1 } })) return err("A felhasználó nem található.", 404)
    const requests = db.collection<RequestDoc>("friend_request_events")
    if (action === "send") {
      const existing = await requests.findOne({ $or: [{ from: id, to: target }, { from: target, to: id }] })
      if (existing?.status === "accepted") return err("Már barátok vagytok.", 409)
      if (existing?.status === "pending") return err("Már van függőben lévő kérés.", 409)
      await requests.updateOne({ from: id, to: target }, { $set: { status: "pending", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true })
      return NextResponse.json({ ok: true })
    }
    const result = await requests.updateOne(
      { from: target, to: id, status: "pending" },
      { $set: { status: action === "accept" ? "accepted" : "declined", updatedAt: new Date() } }
    )
    if (!result.modifiedCount) return err("Ez a kérés már nem aktív.", 409)
    return NextResponse.json({ ok: true })
  } catch (e) { console.error("POST friend requests", e); return err("A művelet nem sikerült.", 503) }
}
