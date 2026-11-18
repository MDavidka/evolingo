import { NextRequest, NextResponse } from "next/server"
import type { Db } from "mongodb"
import { getDatabase } from "../../../../lib/mongodb.ts"
import { coworkOwnerFor } from "../../../../app/lib/cowork-vm/auth.ts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const TERMINAL_EVENT_TYPES = ["run.completed", "run.failed", "run.cancelled"]
const terminalStatuses = new Set(["completed", "failed", "cancelled", "interrupted"])
const encoder = new TextEncoder()

const eventIndexesCache = new WeakMap<Db, Promise<void>>()

/**
 * Ensures index on cowork_events: { run_id: 1, type: 1 }
 */
export async function ensureEventIndexes(db: Db): Promise<void> {
  if (!eventIndexesCache.has(db)) {
    const p = (async () => {
      await db.collection("cowork_events").createIndex({ run_id: 1, type: 1 })
    })().catch(err => {
      eventIndexesCache.delete(db)
      throw err
    })
    eventIndexesCache.set(db, p)
  }
  return eventIndexesCache.get(db)
}

/**
 * Optimized query to check if a terminal event has been logged for a run.
 * Utilizes compound index { run_id: 1, type: 1 } and projection { _id: 1, seq: 1, type: 1 }.
 */
export async function queryTerminalEvent(db: Db, runId: string) {
  await ensureEventIndexes(db)
  return db.collection("cowork_events").findOne(
    { run_id: runId, type: { $in: TERMINAL_EVENT_TYPES } },
    { projection: { _id: 1, seq: 1, type: 1 } },
  )
}

/**
 * Optimized query to retrieve events for a run with index-backed cursor replay.
 */
export async function queryEventsByRun(
  db: Db,
  runId: string,
  afterSeq = 0,
  limit = 100,
) {
  await ensureEventIndexes(db)
  return db
    .collection("cowork_events")
    .find(
      { run_id: runId, seq: { $gt: afterSeq } },
      {
        projection: {
          _id: 0,
          event_id: 1,
          run_id: 1,
          conversation_id: 1,
          seq: 1,
          type: 1,
          ts: 1,
          payload: 1,
        },
      },
    )
    .sort({ seq: 1 })
    .limit(limit)
    .toArray()
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = await coworkOwnerFor(request)
    if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const runId = searchParams.get("run_id") || searchParams.get("id")
    if (!runId) {
      return NextResponse.json({ error: "run_id query parameter is required." }, { status: 400 })
    }

    const db = await getDatabase()
    await ensureEventIndexes(db)

    // Verify run access
    const run = await db.collection("cowork_runs").findOne(
      { id: runId, owner_id: ownerId },
      { projection: { _id: 0, id: 1, status: 1 } },
    )
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 })

    const acceptHeader = request.headers.get("accept") || ""
    const isSSE = acceptHeader.includes("text/event-stream")

    const lastEventId = request.headers.get("last-event-id")
    const queryCursor = searchParams.get("after_seq")
    const cursorText = lastEventId || queryCursor || "0"
    if (!/^\d+$/.test(cursorText) || !Number.isSafeInteger(Number(cursorText))) {
      return NextResponse.json({ error: "Invalid event cursor." }, { status: 400 })
    }
    let cursor = Number(cursorText)

    // If standard JSON query requested (non-streaming polling)
    if (!isSSE && searchParams.get("stream") !== "true") {
      const typeFilter = searchParams.get("type")
      if (typeFilter && TERMINAL_EVENT_TYPES.includes(typeFilter)) {
        const terminalEvent = await queryTerminalEvent(db, runId)
        return NextResponse.json({ terminalEvent }, { headers: { "Cache-Control": "no-store" } })
      }
      const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500)
      const events = await queryEventsByRun(db, runId, cursor, limit)
      return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } })
    }

    // SSE Streaming mode
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let lastHeartbeat = Date.now()
        try {
          controller.enqueue(encoder.encode(": connected\n\n"))
          while (!cancelled && !request.signal.aborted) {
            const events = await queryEventsByRun(db, runId, cursor, 100)

            if (events.length > 0) {
              let chunk = ""
              for (const event of events) {
                cursor = Number(event.seq)
                chunk += `id: ${cursor}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
              }
              controller.enqueue(encoder.encode(chunk))
            }

            const current = await db.collection("cowork_runs").findOne(
              { id: runId },
              { projection: { _id: 0, status: 1 } },
            )
            if (!current) break

            if (terminalStatuses.has(String(current.status)) && events.length === 0) {
              const terminalEvent = await queryTerminalEvent(db, runId)
              const interruptedEvent =
                current.status === "interrupted"
                  ? await db.collection("cowork_events").findOne(
                      { run_id: runId, type: "run.status", "payload.status": "interrupted" },
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
          // Client disconnect or transient error ends stream cleanly
        } finally {
          try {
            controller.close()
          } catch {}
        }
      },
      cancel() {
        cancelled = true
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
  } catch {
    return NextResponse.json({ error: "Run events are unavailable." }, { status: 503 })
  }
}
