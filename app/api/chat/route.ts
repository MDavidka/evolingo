import { NextRequest, NextResponse } from "next/server"
import { validateAttachment, type ChatAttachment } from "../../chat-attachments"
import { modeInstruction } from "@/lib/arlen/modes"
import { modelProfile, profileFor } from "@/lib/arlen/models"
import { chatEventWriter } from "@/lib/arlen/events"
import { detectVisualIntent } from "@/lib/arlen/visual-intelligence"
import {
  shouldTriggerWebSearch,
  planSearchQueries,
  executeWebSearchTool,
  formatWebSearchContext,
  type WebSearchOutput,
} from "@/lib/arlen/web-search"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 45

type Role = "user" | "assistant"
type Message = { role: Role; content: string }
type ProviderMessage = { role: Role; content: unknown }

const coarenaKey = () => process.env.COARENA_API_KEY?.trim()
const zroKey = () => process.env.ZRO_API_KEY?.trim()
const apiURL = () => coarenaKey() ? "https://coarena.ai/api/v1/chat/completions" : zroKey() ? "https://zro.moonmath.ai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions"
const GLOBAL_RATE_WINDOW_MS = 60_000
const GLOBAL_RATE_LIMIT = 100
const globalRequestTimes: number[] = []
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }

function fail(error: string, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json({ error }, { status, headers: { ...headers, ...extraHeaders } })
}

/** One process-wide sliding window: requests from every client share the same 100/min budget. */
function consumeGlobalRequest(now = Date.now()) {
  const cutoff = now - GLOBAL_RATE_WINDOW_MS
  while (globalRequestTimes.length && globalRequestTimes[0] <= cutoff) globalRequestTimes.shift()
  if (globalRequestTimes.length >= GLOBAL_RATE_LIMIT) return false
  globalRequestTimes.push(now)
  return true
}


const replyPrompt = modeInstruction("chat")

/** Relays provider text deltas only, never reasoning_content or model-generated code. */
async function streamProviderText(
  apiKey: string,
  messages: ProviderMessage[],
  onDelta: (delta: string) => void,
  system: string,
  options: { signal?: AbortSignal; maxTokens?: number; modelOverride?: string; temperature?: number; candidates?: string[] } = {},
): Promise<string> {
  const MODEL = options.modelOverride || modelProfile("fast").primary!
  const candidates = [...new Set([MODEL, ...(options.candidates || [])])]

  const keys = [...new Set([apiKey, process.env.ZRO_API_KEY_FALLBACK?.trim()].filter((k): k is string => Boolean(k)))]
  let upstream: Response | null = null
  let lastStatus = 502
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidateModel = candidates[attempt % candidates.length]
    const candidateKey = keys[attempt % keys.length]
    const res = await fetch(apiURL(), {
      method: "POST",
      headers: { Authorization: "Bearer " + candidateKey, "Content-Type": "application/json", Connection: "keep-alive" },
      body: JSON.stringify({
        model: candidateModel,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 1200,
        stream: true,
        ...(candidateModel.startsWith("deepseek-") ? { thinking: { type: "disabled" } } : {}),
        ...(candidateModel.startsWith("nvidia/nemotron-3.5-") ? { reasoning: { effort: "none" } } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout((options.maxTokens ?? 1200) > 1200 ? 24500 : 30000)]),
    })
    if (res.ok) {
      upstream = res
      break
    }
    lastStatus = res.status
    if (res.status !== 429 && res.status !== 502 && res.status !== 503 && res.status !== 504) break
    await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)))
  }
  if (!upstream || !upstream.ok) {
    console.error("[chat] streaming provider status", lastStatus)
    throw new Error(lastStatus === 429 ? "Az AI jelenleg túlterhelt." : "Az AI szolgáltatás nem érhető el.")
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

/** Chat streams structured web_search tool events when live external verification is needed. */
function makeStream(
  apiKey: string, messages: Message[], attachment: ChatAttachment | null,
  baseSystem: string, signal: AbortSignal, sessionId: string,
  runWebSearch: boolean, lastUserPrompt: string,
) {
  const encoder = new TextEncoder()
  const frame = chatEventWriter(sessionId)
  const abort = new AbortController()
  const combinedSignal = AbortSignal.any([signal, abort.signal])
  let closed = false
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Parameters<typeof frame>[0]) => {
        if (!closed) controller.enqueue(encoder.encode(frame(event)))
      }
      controller.enqueue(encoder.encode(": connected\n\n"))
      try {
        let system = baseSystem
        if (runWebSearch && lastUserPrompt.trim().length > 0) {
          const executionId = `search_${crypto.randomUUID().slice(0, 12)}`
          const plannedQueries = planSearchQueries(lastUserPrompt)
          const primaryQuery = plannedQueries[0] || lastUserPrompt.trim().slice(0, 180)

          emit({
            type: "tool.started",
            executionId,
            tool: "web_search",
            status: "searching",
            title: "Searching the web",
            query: primaryQuery,
            queries: plannedQueries,
          })

          const searchOut = await executeWebSearchTool(
            { query: lastUserPrompt, count: 15, retrievePages: true },
            {
              signal: combinedSignal,
              prunePayload: true,
              streamPartial: (partialResults) => {
                if (!combinedSignal.aborted && partialResults.length > 0) {
                  emit({
                    type: "tool.results",
                    executionId,
                    tool: "web_search",
                    query: primaryQuery,
                    queries: plannedQueries,
                    results: partialResults,
                  })
                }
              },
              callbacks: {
                onStepStarted: (stepId, status, label, query) => {
                  if (!combinedSignal.aborted) {
                    emit({
                      type: "tool.step.started",
                      executionId,
                      tool: "web_search",
                      stepId,
                      status,
                      label,
                      ...(query ? { query } : {}),
                    })
                  }
                },
                onStepCompleted: (stepId, label) => {
                  if (!combinedSignal.aborted) {
                    emit({
                      type: "tool.step.completed",
                      executionId,
                      tool: "web_search",
                      stepId,
                      status: "completed",
                      label,
                    })
                  }
                },
              },
            },
          )

          if (combinedSignal.aborted) {
            emit({
              type: "tool.cancelled",
              executionId,
              tool: "web_search",
              status: "cancelled",
              query: primaryQuery,
            })
            return
          }

          if (searchOut.status === "failed") {
            emit({
              type: "tool.failed",
              executionId,
              tool: "web_search",
              status: "failed",
              error: searchOut.diagnostics.error || "Web search provider unavailable.",
              query: primaryQuery,
            })
            system += `\n\n[WEB SEARCH FAILED: The external search provider failed (${searchOut.diagnostics.error || "unavailable"}). Do NOT fabricate citations or pretend a search succeeded. State clearly if live verification could not be completed.]`
          } else {
            emit({
              type: "tool.results",
              executionId,
              tool: "web_search",
              query: searchOut.query,
              queries: searchOut.queries,
              results: searchOut.results,
            })
            emit({
              type: "tool.step.started",
              executionId,
              tool: "web_search",
              stepId: "step_prepare",
              status: "preparing",
              label: "Preparing answer",
            })
            emit({
              type: "tool.step.completed",
              executionId,
              tool: "web_search",
              stepId: "step_prepare",
              status: "completed",
              label: "Preparing answer",
            })
            const countLabel = searchOut.results.length === 1 ? "1 source" : `${searchOut.results.length} sources`
            emit({
              type: "tool.completed",
              executionId,
              tool: "web_search",
              status: "completed",
              summary: `Searched the web · ${countLabel}`,
              sourceCount: searchOut.results.length,
              durationMs: searchOut.durationMs,
              query: searchOut.query,
              queries: searchOut.queries,
              results: searchOut.results,
            })
            system += formatWebSearchContext(searchOut.results, searchOut.query)
          }
        }

        const profile = modelProfile(profileFor("chat", { vision: attachment?.kind === "image" }))
        const reply = await streamProviderText(apiKey, withAttachment(messages, attachment),
          delta => emit({ type: "delta", delta }), system,
          { signal: combinedSignal, maxTokens: profile.maxTokens, modelOverride: profile.primary, candidates: profile.candidates })
        emit({ type: "text", reply })
        emit({ type: "done" })
      } catch (error) {
        if (!combinedSignal.aborted) {
          emit({ type: "error", error: error instanceof Error ? error.message.slice(0, 1000) : "AI request failed." })
          emit({ type: "done" })
        }
      } finally {
        if (!closed) { closed = true; controller.close() }
      }
    },
    cancel() { closed = true; abort.abort() },
  })
}

export async function POST(request: NextRequest) {
  if (!consumeGlobalRequest()) {
    return fail("A közös API-keret megtelt. Próbáld újra egy perc múlva.", 429, { "Retry-After": "60" })
  }

  const apiKey = coarenaKey() || zroKey() || process.env.EVO_AI?.trim() || process.env.EVO_Ai?.trim() || process.env.NVIDIA_API_KEY?.trim()
  if (!apiKey) return fail("Az AI szolgáltatás nincs beállítva.", 503)

  let messages: Message[]
  let interactive = false
  let webSearchRequested = false
  let sessionId: string = crypto.randomUUID()
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
    webSearchRequested = (body as { webSearch?: unknown }).webSearch === true
    const suppliedSession = (body as { sessionId?: unknown }).sessionId
    if (typeof suppliedSession === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(suppliedSession)) sessionId = suppliedSession
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

  const lastUserPrompt = messages[messages.length - 1]?.content || ""
  const detectedVisual = detectVisualIntent(lastUserPrompt)
  const isSimpleGreeting = /^(hi|hello|hey|szia|helló|hali|jó napot|thanks|köszönöm|ok|rendben)[!.?]*$/i.test(lastUserPrompt.trim())
  const runWebSearch = shouldTriggerWebSearch(lastUserPrompt, webSearchRequested)

  const visualHint = detectedVisual
    ? `\n\n[VISUAL INTELLIGENCE DIRECTIVE: Include a valid fenced \`\`\`arlen-visual JSON block in this response using component "${detectedVisual}" (and any complementary visual block such as text.heading, icon.grid, timeline.numbered, map.preview, or chart.bar) with accurate data.]`
    : !isSimpleGreeting && lastUserPrompt.length > 12
      ? `\n\n[VISUAL INTELLIGENCE DIRECTIVE: Whenever this topic involves places, steps, icons, comparisons, statistics, progress, files, or structured concepts, include a valid fenced \`\`\`arlen-visual JSON block alongside your Markdown explanation.]`
      : ""

  const baseSystem = replyPrompt + visualHint

  if (interactive) return new Response(makeStream(apiKey, messages, attachment, baseSystem, request.signal, sessionId, runWebSearch, lastUserPrompt), {
    headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" },
  })

  let system = baseSystem
  let searchResult: WebSearchOutput | undefined
  if (runWebSearch) {
    searchResult = await executeWebSearchTool({ query: lastUserPrompt, count: 15, retrievePages: true }, { signal: request.signal, prunePayload: true })
    if (searchResult.status === "completed") {
      system += formatWebSearchContext(searchResult.results, searchResult.query)
    }
  }

  try {
    const profile = modelProfile(profileFor("chat", { vision: attachment?.kind === "image" }))
    const MODEL = profile.primary!
    const upstream = await fetch(apiURL(), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Connection: "keep-alive" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          ...withAttachment(messages, attachment),
        ],
        temperature: 0.7,
        max_tokens: profile.maxTokens,
        stream: false,
        ...(MODEL.startsWith("deepseek-") ? { thinking: { type: "disabled" } } : {}),
        ...(MODEL.startsWith("nvidia/nemotron-3.5-") ? { reasoning: { effort: "none" } } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(25000)]),
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
    return NextResponse.json(
      {
        reply: reply.trim(),
        ...(searchResult ? { search: searchResult } : {}),
      },
      { headers },
    )
  } catch (cause) {
    console.error("[chat] AI request failed", cause instanceof Error ? cause.name : "unknown")
    return fail("Hálózati hiba történt. Próbáld újra.", 502)
  }
}
