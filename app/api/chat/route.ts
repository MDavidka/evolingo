import { NextRequest, NextResponse } from "next/server"
import { parseModelUI, type IntelligentUI } from "../../intelligent-ui/schema"
import { projectVisualResponse } from "../../intelligent-ui/visual-policy"
import { classifyVisualIntent, getVisualSelectionHint, shouldPlanVisuals, VISUAL_CAPABILITIES } from "../../intelligent-ui/orchestrator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 45

type Role = "user" | "assistant"
type Message = { role: Role; content: string }

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = process.env.EVO_AI_MODEL?.trim() || "nvidia/nemotron-3.5-lightning-30b-a3b"
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers })
}


/** Intelligent UI is an optional progressive enhancement, not an executable model response. */
const UI_ENABLED = process.env.EVO_INTELLIGENT_UI_ENABLED !== "false"
const replyPrompt = [
  "Az Evölingo magyar nyelvű tanulási asszisztense vagy. Pontosan, érthetően és természetesen válaszolj magyarul.",
  "Használj szabályos Markdown formázást, ha javítja az érthetőséget: rövid címsorok, **kiemelés**, példamondatok, felsorolások, összehasonlító táblázatok és működő HTTPS forráshivatkozások.",
  "Ne adj nyers HTML-t, JSX-et, JSON UI-leírást vagy kódot a felület vezérlésére.",
  "Képet kizárólag létező, igazolható HTTPS-forrásból idézz, ne találj ki képhivatkozást.",
  "Egyszerű kérdésre válaszolj röviden, felesleges kártyák, jelölések és táblázatok nélkül.",
  "Ne találj ki személyes tanulási adatot, és ne állítsd, hogy ChatGPT vagy.",
].join(" ")

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
  '{"id":"concept-1","type":"concept_card","props":{"title":"Fontos szabály","description":"Rövid, hasznos magyarázat.","icon":"idea","badge":"Tipp"}}',
  '{"id":"chart-1","type":"chart_card","props":{"title":"Példa grafikon","chartType":"bar","source":"example","unit":"pont","points":[{"label":"A","value":8},{"label":"B","value":13}]}}',
  'chartType csak bar, line vagy donut lehet. A forrás mindig source: example, és a kártya szemléltető adatok feliratot kap. Csak akkor kérj grafikont, ha a felhasználó példadiagramot vagy összehasonlító számsort kér.',
  'SOHA ne állítsd, hogy a modell személyes tanulási haladási statisztikákat ismer. Nincs jogosultság hitelesített értékek előállítására. A chart_card source: verified kizárólag a kliens megbízható adataiból keletkezhet.',
  'A study_calculator kizárólag tanulásiidő-kalkulációhoz használható. Példa: {"id":"calc-1","type":"study_calculator","props":{"title":"Tanulási idő kiszámítása","dailyMinutes":30,"daysPerWeek":5,"weeks":4}}. A napi percek csak 5-ösével választhatók 5 és 120 között, a napok 1-7, a hetek 1-12 között. Az alkalmazás számol, ne generálj futtatható képletet.',
  'Kizárólag az engedélyezett blokkokat választhatod: '+VISUAL_CAPABILITIES.join(', ')+'.',
  'A progress_bars típus NEM engedélyezett a modell számára, mert hitelesített felhasználói adatot igényel.',
  'Ne adj meg HTML-t, JS-t, JSX-et, URL-t, külső műveleteket, szerverhívásokat vagy személyes statisztikákat.',
  'Legfeljebb 12 tanulókártya, 8 összehasonlító sor, 7 nap, 5 válasz, 5 lépés és 5 példamondat legyen.',
  'Minden UI-szöveg magyar legyen (kivéve a tanult nyelvű példákat). A JSON legyen rövid és a kvíz helyes válasza pontos.',
].join("\n")

async function providerCompletion(apiKey: string, messages: Message[], system: string, maxTokens: number, timeout: number): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, ...messages], temperature: 0.5, max_tokens: maxTokens, stream: false, ...(MODEL.startsWith("nvidia/nemotron-3.5-") ? { chat_template_kwargs: { enable_thinking: false } } : {}) }),
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
  if (!UI_ENABLED || !shouldPlanVisuals(question)) return null
  const prompt = "Kérés: " + question.slice(0, 1100) + "\nVálasz: " + reply.slice(0, 2300) + "\nJavasolt megjelenítés: " + getVisualSelectionHint(question) + "\nCsak JSON legyen az eredmény."
  try {
    const raw = await providerCompletion(apiKey, [{ role: "user", content: prompt }], uiInstructions, 1300, 8000)
    const parsed = parseModelUI(raw)
    if (parsed) return parsed.blocks.length ? parsed : null
    // Bounded retry on schema failure, never a second request on a valid empty result.
    const retry = await providerCompletion(apiKey, [{ role: "user", content: prompt + "\nAz előző válasz formátuma hibás volt. Javítsd ki a JSON-szerkezetet, egyéb szöveg nélkül." }], uiInstructions, 900, 4000)
    const safe = parseModelUI(retry)
    return safe?.blocks.length ? safe : null
  } catch (error) {
    console.error("[chat] optional UI unavailable", error instanceof Error ? error.name : "unknown")
    return null
  }
}

/** Relays provider text deltas only, never reasoning_content or model-generated code. */
async function streamProviderText(
  apiKey: string,
  messages: Message[],
  onDelta: (delta: string) => void,
): Promise<string> {
  const upstream = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: replyPrompt }, ...messages],
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

function makeStream(apiKey: string, messages: Message[]) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (type: string, data: Record<string, unknown> = {}) =>
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ type, ...data }) + "\n\n"))
      try {
        const question = messages[messages.length - 1].content
        // For quiz requests, keep the answer entirely on the server until
        // submission. Even the streamed prose must not reveal the solution.
        if (UI_ENABLED && classifyVisualIntent(question) === "quiz") {
          const planned = await optionalUI(apiKey, question,
            "Készíts ellenőrizhető, helyes válaszú feleletválasztós kvízt a felhasználó témájából.")
          const safe = planned ? projectVisualResponse(planned) : null
          const questions = safe?.blocks.filter(block => block.type === "quiz_choice") ?? []
          if (questions.length) {
            emit("text", { reply: "Válassz a gyakorlókérdés lehetőségei közül. A megoldás ellenőrzés után jelenik meg." })
            emit("ui", { ui: { version: "1", blocks: questions } })
          } else {
            emit("text", { reply: "Most nem sikerült ellenőrizhető kvízt készíteni. Próbáld újra, vagy kérj szöveges magyarázatot." })
          }
          emit("done")
          return
        }
        const reply = await streamProviderText(apiKey, messages, delta => emit("delta", { delta }))
        emit("text", { reply })
        const ui = await optionalUI(apiKey, messages[messages.length - 1].content, reply)
        const publicUI = ui ? projectVisualResponse(ui) : null
        if (publicUI?.blocks.length) emit("ui", { ui: publicUI })
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
          { role: "system", content: replyPrompt },
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
