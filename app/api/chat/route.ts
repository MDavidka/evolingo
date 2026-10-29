import { NextRequest, NextResponse } from "next/server"
import { parseModelUI, type IntelligentUI } from "../../intelligent-ui/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 45

type Role = "user" | "assistant"
type Message = { role: Role; content: string }

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = process.env.EVO_AI_MODEL?.trim() || "minimaxai/minimax-m3.1-flash"
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers })
}


/** Intelligent UI is an optional progressive enhancement, not an executable model response. */
const UI_ENABLED = process.env.EVO_INTELLIGENT_UI_ENABLED !== "false"
const replyPrompt = "Az Evölingo magyar nyelvű tanulási asszisztense vagy. Válaszolj magyarul, érthetően, és ne találj ki személyes tanulási adatokat."
function uiCandidate(value: string) {
  const input = value.toLocaleLowerCase("hu")
  if (/csak (rövid|szöveges)|only text|no ui|felület nélkül/.test(input)) return false
  return /nyelvtan|igeidő|present |past |future |grammar|tense|különbség|hasonlít|összehasonl|gyakorol|teszt|kvíz|quiz|szókincs|szavak|szót|tanulókárty|flashcard|szótanul|terv|órarend|idővonal|timeline|példamondat|erasmus/.test(input)
}
const uiInstructions = [
  'Csak érvényes JSON objektumot adj meg, markdown vagy kód nélkül.',
  'A felhasználói kérés és az asszisztens válasza alapján válassz 0-2 oktatási UI elemet. Ha a szöveg elég, legyen üres tömb.',
  'Gyökér: {"version":"1","blocks":[]}. Csak a version és blocks kulcsok használhatók.',
  'Minden blokknál pontosan id, type és props kulcs szerepeljen. Az id csak angol betűt, számot vagy kötőjelet tartalmazzon.',
  'Megengedett blokkok formátumai:',
  '{"id":"rule-1","type":"grammar_rule","props":{"title":"Cím","rule":"Rövid szabály","examples":["Angol példamondat."]}}',
  '{"id":"quiz-1","type":"quiz_choice","props":{"question":"Melyik helyes?","choices":["A","B"],"correctIndex":0,"explanation":"Magyarázat"}}',
  '{"id":"vocab-1","type":"vocabulary_flashcard","props":{"title":"Szókincs","cards":[{"front":"English","back":"magyar","example":"English example"}]}}',
  '{"id":"compare-1","type":"comparison_table","props":{"title":"Összehasonlítás","columns":["A","B"],"rows":[{"label":"Szempont","left":"A értéke","right":"B értéke"}]}}',
  '{"id":"timeline-1","type":"tense_timeline","props":{"title":"Idővonal","steps":[{"phase":"past","label":"Múlt","detail":"Esemény"},{"phase":"present","label":"Jelen","detail":"Eredmény"}]}}',
  '{"id":"plan-1","type":"study_plan","props":{"title":"Heti terv","days":[{"day":"Hétfő","task":"15 perc tanulás"}]}}',
  'A progress_bars típus NEM engedélyezett a modell számára, mert hitelesített felhasználói adatot igényel.',
  'Ne adj meg HTML-t, JS-t, JSX-et, URL-t, külső műveleteket, szerverhívásokat vagy személyes statisztikákat.',
  'Legfeljebb 12 tanulókártya, 8 összehasonlító sor, 7 nap, 5 válasz, 5 lépés és 5 példamondat legyen.',
  'Minden UI-szöveg magyar legyen (kivéve a tanult nyelvű példákat). A JSON legyen rövid és a kvíz helyes válasza pontos.',
].join("\n")

async function providerCompletion(apiKey: string, messages: Message[], system: string, maxTokens: number, timeout: number): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, ...messages], temperature: 0.5, max_tokens: maxTokens, stream: false }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) {
    console.error("[chat] AI provider status", response.status)
    throw new Error(response.status === 429 ? "Az AI jelenleg túlterhelt." : response.status === 410 || response.status === 404 ? "A modell nem érhető el." : "Az AI szolgáltatás nem érhető el.")
  }
  const result = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
  const value = result.choices?.[0]?.message?.content
  const answer = typeof value === "string" ? value : Array.isArray(value) ? value.map(part => part && typeof part === "object" && "text" in part ? String(part.text) : "").join("") : ""
  if (!answer.trim() || answer.length > 30000) throw new Error("Az AI nem adott értelmezhető választ.")
  return answer.trim()
}

async function optionalUI(apiKey: string, question: string, reply: string): Promise<IntelligentUI | null> {
  if (!UI_ENABLED || !uiCandidate(question)) return null
  try {
    const prompt = "Kérés: " + question.slice(0, 1100) + "\nVálasz: " + reply.slice(0, 2300) + "\nCsak JSON legyen az eredmény."
    const raw = await providerCompletion(apiKey, [{ role: "user", content: prompt }], uiInstructions, 1300, 12000)
    return parseModelUI(raw)
  } catch (error) {
    console.error("[chat] optional UI unavailable", error instanceof Error ? error.name : "unknown")
    return null
  }
}

function makeStream(apiKey: string, messages: Message[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (type: string, data: Record<string, unknown> = {}) =>
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ type, ...data }) + "\n\n"))
      try {
        const reply = await providerCompletion(apiKey, messages, replyPrompt, 1400, 25000)
        emit("text", { reply })
        const ui = await optionalUI(apiKey, messages[messages.length - 1].content, reply)
        if (ui?.blocks.length) emit("ui", { ui })
        emit("done")
      } catch (error) {
        emit("error", { error: error instanceof Error ? error.message : "Hálózati hiba történt." })
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

  const apiKey = process.env.EVO_AI?.trim() || process.env.EVO_Ai?.trim()
  if (!apiKey) return fail("Az AI szolgáltatás nincs beállítva.", 503)

  let messages: Message[]
  let interactive = false
  try {
    const raw = await request.text()
    if (raw.length > 30_000) return fail("Az üzenet túl hosszú.", 413)
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== "object" || !("messages" in body)) return fail("Hiányzó üzenetek.", 400)
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

  if (interactive) return new Response(makeStream(apiKey, messages), {
    headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" },
  })

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
