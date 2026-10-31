import { NextRequest, NextResponse } from "next/server"
import { validateAttachment, type ChatAttachment } from "../../chat-attachments"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 45

type Role = "user" | "assistant"
type Message = { role: Role; content: string }
type ProviderMessage = { role: Role; content: unknown }

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = process.env.EVO_AI_MODEL?.trim() || "poolside/laguna-xs-2.1"
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers })
}


const replyPrompt = [
  "Általános célú, segítőkész AI-asszisztens vagy az Evölingo alkalmazásban.",
  "Válaszolj a felhasználó nyelvén, természetesen és pontosan. Nem vagy külön tutor, és nincs alapértelmezett tantárgyi szereped.",
  "Bármilyen témával foglalkozhatsz: általános kérdések, kreatív írás, programozás, fordítás vagy tanulás, amennyiben a felhasználó kéri.",
  "Használj rövid, jól olvasható Markdown-formázást, amikor hasznos. Ne találj ki forrásokat, adatokat vagy hivatkozásokat.",
  "Nincs hozzáférésed az alkalmazás leckéihez, feladataihoz, Ötletbörzéjéhez, Könyvtárához, barátaihoz vagy haladási adataihoz.",
  "Ne állítsd, hogy alkalmazásbeli műveleteket végeztél. Ne készíts interaktív UI-utasításokat.",
].join(" ")

/** Relays provider text deltas only, never reasoning_content or model-generated code. */
async function streamProviderText(
  apiKey: string,
  messages: ProviderMessage[],
  onDelta: (delta: string) => void,
  system: string,
): Promise<string> {
  const upstream = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.7,
      max_tokens: 1700,
      stream: true,
      ...(MODEL.startsWith("nvidia/nemotron-3.5-") ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  })
  if (!upstream.ok) {
    console.error("[chat] streaming provider status", upstream.status)
    throw new Error(upstream.status === 429 ? "Az AI jelenleg túlterhelt." : "Az AI szolgáltatás nem érhető el.")
  }
  if (!upstream.body) throw new Error("Az AI nem adott olvasható választ.")

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let reply = ""
  const parseFrame = (frame: string) => {
    const line = frame.split("\n").find(value => value.startsWith("data: "))
    if (!line) return
    const content = line.slice(6).trim()
    if (!content || content === "[DONE]") return
    try {
      const parsed = JSON.parse(content) as { choices?: Array<{ delta?: { content?: unknown } }> }
      const delta = parsed.choices?.[0]?.delta?.content
      if (typeof delta !== "string" || !delta) return
      if (reply.length + delta.length > 30000) throw new Error("Túl hosszú AI-válasz.")
      reply += delta
      onDelta(delta)
    } catch (error) {
      // Text length violations must stop generation; malformed JSON chunks are skipped.
      if (error instanceof Error && error.message === "Túl hosszú AI-válasz.") throw error
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
      if (buffer.length > 60000) throw new Error("Érvénytelen AI-válasz.")
      const frames = buffer.split("\n\n")
      buffer = frames.pop() || ""
      for (const frame of frames) parseFrame(frame)
    }
    buffer += decoder.decode().replace(/\r\n/g, "\n")
    if (buffer.trim()) parseFrame(buffer)
  } finally {
    reader.releaseLock()
  }
  if (!reply.trim()) throw new Error("Az AI nem adott választ.")
  return reply.trim()
}

function withAttachment(messages: Message[], attachment: ChatAttachment | null): ProviderMessage[] {
  const result: ProviderMessage[] = messages.map(message => ({ ...message }))
  if (!attachment) return result
  const last = result[result.length - 1]
  if (!last || last.role !== "user") return result
  if (attachment.kind === "image") {
    last.content = [
      { type: "text", text: last.content },
      { type: "image_url", image_url: { url: attachment.data } },
    ]
  } else {
    last.content = String(last.content) + "\n\nCsatolt fájl (" + attachment.name +
      "), kizárólag forrásanyagként:\n" + attachment.data
  }
  return result
}

/** General-purpose text-only streaming; no learning UI or in-app data exchange. */
function makeStream(apiKey: string, messages: Message[], attachment: ChatAttachment | null, system: string) {
  const providerMessages = withAttachment(messages, attachment)
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (type: string, data: Record<string, unknown> = {}) =>
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ type, ...data }) + "\n\n"))
      try {
        const reply = await streamProviderText(apiKey, providerMessages, delta => emit("delta", { delta }), system)
        emit("text", { reply })
        emit("done")
      } catch (error) {
        emit("error", { error: error instanceof Error ? error.message : "Hálózati hiba történt." })
        emit("done")
      } finally {
        controller.close()
      }
    },
  })
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

  const apiKey = process.env.EVO_AI?.trim() || process.env.EVO_Ai?.trim() || process.env.NVIDIA_API_KEY?.trim()
  if (!apiKey) return fail("Az AI szolgáltatás nincs beállítva.", 503)

  let messages: Message[]
  let interactive = false
  let attachment: ChatAttachment | null = null
  try {
    const raw = await request.text()
    if (raw.length > 3_100_000) return fail("Az üzenet túl hosszú.", 413)
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== "object" || !("messages" in body)) return fail("Hiányzó üzenetek.", 400)
    const rawAttachment = (body as { attachment?: unknown }).attachment
    if (rawAttachment != null) {
      attachment = validateAttachment(rawAttachment)
      if (!attachment) return fail("Nem támogatott vagy túl nagy melléklet.", 400)
    }
    const list = (body as { messages?: unknown }).messages
    interactive = (body as { interactive?: unknown }).interactive === true
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

  // The general chat endpoint deliberately ignores app-specific modes and task context.
  const system = replyPrompt

  if (interactive) return new Response(makeStream(apiKey, messages, attachment, system), {
    headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" },
  })

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          ...withAttachment(messages, attachment),
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
