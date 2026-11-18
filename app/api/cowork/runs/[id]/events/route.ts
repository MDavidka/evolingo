import { NextRequest, NextResponse } from "next/server"
import { ownedRun } from "../access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }
const terminalStatuses = new Set(["completed", "failed", "cancelled", "interrupted"])
const TERMINAL_EVENT_TYPES = ["run.completed", "run.failed", "run.cancelled"]
const encoder = new TextEncoder()

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  let access: Awaited<ReturnType<typeof ownedRun>>
  try {
    access = await ownedRun(request, id)
  } catch {
    return NextResponse.json({ error: "Run events are unavailable." }, { status: 503 })
  }
  if (access.status !== 200) {
    return NextResponse.json(
      { error: access.status === 401 ? "Cowork session required." : "Run not found." },
      { status: access.status },
    )
  }

  const lastEventId = request.headers.get("last-event-id")
  const queryCursor = new URL(request.url).searchParams.get("after_seq")
  const cursorText = lastEventId || queryCursor || "0"
  if (!/^\d+$/.test(cursorText) || !Number.isSafeInteger(Number(cursorText))) {
    return NextResponse.json({ error: "Invalid event cursor." }, { status: 400 })
  }
  let cursor = Number(cursorText)
  let cancelled = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastHeartbeat = Date.now()
      try {
        controller.enqueue(encoder.encode(": connected\n\n"))
        while (!cancelled && !request.signal.aborted) {
          const events = await access.db.collection("cowork_events")
            .find({ run_id: id, seq: { $gt: cursor } }, { projection: { _id: 0, event_id: 1, run_id: 1, conversation_id: 1, seq: 1, type: 1, ts: 1, payload: 1 } })
            .sort({ seq: 1 })
            .limit(100)
            .toArray()

          if (events.length > 0) {
            let chunk = ""
            for (const event of events) {
              cursor = Number(event.seq)
              chunk += `id: ${cursor}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
            }
            controller.enqueue(encoder.encode(chunk))
          }

          const current = await access.db.collection("cowork_runs").findOne(
            { id }, { projection: { _id: 0, status: 1 } },
          )
          if (!current) break
          if (terminalStatuses.has(String(current.status)) && events.length === 0) {
            // Terminal status and its terminal event are separate durable writes in
            // some recovery/cancel paths. Keep replay open until the authoritative
            // terminal event lands so a client cannot miss it in that write window.
            const terminalEvent = await access.db.collection("cowork_events").findOne(
              { run_id: id, type: { $in: TERMINAL_EVENT_TYPES } },
              { projection: { _id: 1, seq: 1 } },
            )
            const interruptedEvent = current.status === "interrupted"
              ? await access.db.collection("cowork_events").findOne(
                  { run_id: id, type: "run.status", "payload.status": "interrupted" },
                  { projection: { _id: 1, seq: 1 } },
                )
              : null
            const terminalSeq = Number(terminalEvent?.seq ?? interruptedEvent?.seq ?? Number.MAX_SAFE_INTEGER)
            if (terminalSeq <= cursor) break
          }

          if (Date.now() - lastHeartbeat >= 15000) {
            controller.enqueue(encoder.encode(": heartbeat\n\n"))
            lastHeartbeat = Date.now()
          }
          await new Promise(resolve => setTimeout(resolve, events.length > 0 ? 60 : 180))
        }
      } catch {
        // A disconnect or transient database error ends this stream. Clients resume from the last sequence.
      } finally {
        try { controller.close() } catch {}
      }
    },
    cancel() {
      cancelled = true
      // Disconnecting this reader does not cancel the durable run.
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
