import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type BuilderTask = {
  id: string
  icon: string
  name: string
  description: string
  plan: string
  markdown: string
  approved: boolean
  createdAt: number
}

function validTask(value: unknown): value is BuilderTask {
  if (!value || typeof value !== "object") return false
  const task = value as Record<string, unknown>
  return typeof task.id === "string" && task.id.length <= 80 && typeof task.name === "string" && task.name.trim().length > 0 && task.name.length <= 80 &&
    typeof task.description === "string" && task.description.trim().length > 0 && task.description.length <= 500 &&
    typeof task.icon === "string" && task.icon.length <= 8 && typeof task.plan === "string" && task.plan.length <= 10000 &&
    typeof task.markdown === "string" && task.markdown.length <= 12000 && typeof task.approved === "boolean" && typeof task.createdAt === "number"
}

export async function GET() {
  try {
    const db = await getDatabase()
    const tasks = await db.collection<BuilderTask>("brainstorm_tasks").find({}).sort({ createdAt: -1 }).limit(200).toArray()
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("GET /api/brainstorm failed", error)
    return NextResponse.json({ error: "A közös feladatlista most nem érhető el." }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    if (!validTask(body)) return NextResponse.json({ error: "Érvénytelen feladat." }, { status: 400 })
    const db = await getDatabase()
    await db.collection<BuilderTask>("brainstorm_tasks").updateOne({ id: body.id }, { $setOnInsert: body }, { upsert: true })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/brainstorm failed", error)
    return NextResponse.json({ error: "A feladat mentése nem sikerült." }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).id !== "string" || typeof (body as Record<string, unknown>).approved !== "boolean") {
      return NextResponse.json({ error: "Érvénytelen módosítás." }, { status: 400 })
    }
    const { id, approved } = body as { id: string; approved: boolean }
    const db = await getDatabase()
    const result = await db.collection<BuilderTask>("brainstorm_tasks").updateOne({ id }, { $set: { approved } })
    return result.matchedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "A feladat nem található." }, { status: 404 })
  } catch (error) {
    console.error("PATCH /api/brainstorm failed", error)
    return NextResponse.json({ error: "A módosítás nem sikerült." }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")
    if (!id || id.length > 80) return NextResponse.json({ error: "Hiányzó feladatazonosító." }, { status: 400 })
    const completed = request.nextUrl.searchParams.get("completed") === "true"
    const db = await getDatabase()
    const result = await db.collection<BuilderTask>("brainstorm_tasks").deleteOne(completed ? { id, approved: true } : { id, approved: false })
    return result.deletedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: completed ? "A befejezett, jóváhagyott feladat nem található." : "A függő feladat nem található." }, { status: 404 })
  } catch (error) {
    console.error("DELETE /api/brainstorm failed", error)
    return NextResponse.json({ error: "A feladat eltávolítása nem sikerült." }, { status: 503 })
  }
}
