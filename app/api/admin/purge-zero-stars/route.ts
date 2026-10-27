import { NextResponse } from "next/server"
import { getDatabase } from "../../../../lib/mongodb"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = await getDatabase()
    const users = db.collection("users")
    const count = await users.countDocuments({ stars: 0 })
    return NextResponse.json({ count })
  } catch (error) {
    console.error("GET /api/admin/purge-zero-stars failed", error)
    return NextResponse.json({ error: "A felhasználók nem érhetők el." }, { status: 503 })
  }
}

export async function DELETE() {
  try {
    const db = await getDatabase()
    const result = await db.collection("users").deleteMany({ stars: 0 })
    return NextResponse.json({ deletedCount: result.deletedCount })
  } catch (error) {
    console.error("DELETE /api/admin/purge-zero-stars failed", error)
    return NextResponse.json({ error: "A törlés nem sikerült." }, { status: 503 })
  }
}
