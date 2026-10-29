import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type Role = "user" | "assistant"
type Message = { role: Role; content: string }

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = process.env.EVO_AI_MODEL?.trim() || "minimaxai/minimax-m3.1-flash"
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const now = Date.now()
  if (rateLimits.size > 2000) for (const [key, state] of rateLimits) if (state.resetAt <= now) rateLimits.delete(key)
  const previous = rateLimits.get(ip)
  const current = !previous || previous.resetAt <= now ? { count: 0, resetAt: now + 600_000 } : previous
  current.count++
  rateLimits.set(ip, current)
  if (current.count > 25) return fail("Túl sok kérés érkezett. Próbáld újra néhány perc múlva.", 429)

  const apiKey = process.env.EVO_AI?.trim() || process.env.EVO_Ai?.trim()
  if (!apiKey) return fail("Az AI szolgáltatás nincs beállítva.", 503)

  let messages: Message[]
  try {
    const raw = await request.text()
    if (raw.length > 30_000) return fail("Az üzenet túl hosszú.", 413)
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== "object" || !("messages" in body)) return fail("Hiányzó üzenetek.", 400)
    const list = (body as { messages?: unknown }).messages
    if (!Array.isArray(list) || list.length === 0 || list.length > 12) return fail("Érvénytelen beszélgetés.", 400)
    messages = list.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("Invalid message")
      const value = item as Record<string, unknown>
      if ((value.role !== "user" && value.role !== "assistant") || typeof value.content !== "string" || !value.content.trim() || value.content.length > 4000) throw new Error("Invalid message")
      return { role: value.role, content: value.content.trim() } as Message
    })
    if (messages[messages.length - 1].role !== "user" || messages.reduce((sum, item) => sum + item.content.length, 0) > 18000) return fail("Érvénytelen üzenetek.", 400)
  } catch {
    return fail("Érvénytelen üzenetformátum.", 400)
  }

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Az Evölingo magyar nyelvű tanulást segítő asszisztense vagy. Válaszolj érthetően, tömören és segítőkészen magyarul, hacsak a felhasználó más nyelvet nem kér. Segíts a nyelvtanulásban, gyakorlásban és tanulástervezésben. Ne állítsd, hogy ChatGPT vagy, és ne találj ki személyes adatokat." },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1200,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    })
    if (!upstream.ok) {
      console.error("[chat] AI provider status", upstream.status)
      if (upstream.status === 429) return fail("Az AI most túlterhelt. Próbáld újra később.", 429)
      if (upstream.status === 410 || upstream.status === 404) return fail("A beállított AI modell nem érhető el.", 502)
      return fail("Az AI szolgáltatás jelenleg nem érhető el.", 502)
    }
    const result = await upstream.json() as { choices?: Array<{ message?: { content?: unknown } }> }
    const value = result.choices?.[0]?.message?.content
    const reply = typeof value === "string" ? value : Array.isArray(value) ? value.map(part => part && typeof part === "object" && "text" in part ? String(part.text) : "").join("") : ""
    if (!reply.trim() || reply.length > 30000) return fail("Az AI nem adott értelmezhető választ.", 502)
    return NextResponse.json({ reply: reply.trim() }, { headers })
  } catch (cause) {
    console.error("[chat] AI request failed", cause instanceof Error ? cause.name : "unknown")
    return fail("Hálózati hiba történt. Próbáld újra.", 502)
  }
}
