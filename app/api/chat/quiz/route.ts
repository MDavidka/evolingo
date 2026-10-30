import { NextRequest, NextResponse } from "next/server"
import { gradeQuizTicket } from "../../../intelligent-ui/quiz-security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const windowMs = 10 * 60 * 1000
const limits = new Map<string, { count: number; expires: number }>()
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }

/**
 * This endpoint grades ephemeral, encrypted self-practice questions.
 * It has no route to the lesson reward or student profile database.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "cross-site" ||
      (origin && origin !== request.nextUrl.origin)) {
    return NextResponse.json({ error: "Nem engedélyezett kérés." }, { status: 403, headers })
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const now = Date.now()
  if (limits.size > 1500) for (const [key, value] of limits) {
    if (value.expires < now) limits.delete(key)
  }
  const previous = limits.get(ip)
  const current = previous && previous.expires > now
    ? previous : { count: 0, expires: now + windowMs }
  current.count++
  limits.set(ip, current)
  if (current.count > 90) {
    return NextResponse.json({ error: "Túl sok kérés. Próbáld újra később." }, { status: 429, headers })
  }
  try {
    const raw = await request.text()
    if (raw.length > 4800) {
      return NextResponse.json({ error: "Túl hosszú kérés." }, { status: 413, headers })
    }
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid input")
    const item = body as { ticket?: unknown; selectedIndex?: unknown }
    const grade = gradeQuizTicket(item.ticket, item.selectedIndex, now)
    return NextResponse.json(grade, { headers })
  } catch {
    return NextResponse.json({
      error: "A kvíz ellenőrzése nem sikerült. Kérj új gyakorlókérdést.",
    }, { status: 400, headers })
  }
}
