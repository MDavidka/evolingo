import { NextRequest, NextResponse } from "next/server"
import { ownedRun } from "../access"
import { MongoEventStore } from "../../../../../lib/cowork-vm/storage/mongo-event-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  if (!origin || !host) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  try {
    const parsedOrigin = new URL(origin)
    const protocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() || request.nextUrl.protocol.replace(":", "")
    if (parsedOrigin.host !== host || parsedOrigin.protocol !== `${protocol}:`) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const access = await ownedRun(request, id)
    if (access.status !== 200) {
      return NextResponse.json({ error: access.status === 401 ? "Cowork session required." : "Run not found." }, { status: access.status })
    }
    if (["completed", "failed", "cancelled", "interrupted"].includes(String(access.run.status))) {
      return NextResponse.json({ run: access.run }, { status: 200, headers: { "Cache-Control": "no-store" } })
    }

    const db = access.db
    const now = new Date().toISOString()
    if (access.run.status === "queued" || access.run.status === "planning") {
      const update = await db.collection("cowork_runs").updateOne(
        { id, status: { $in: ["queued", "planning"] } },
        { $set: { status: "cancelled", completed_at: now, updated_at: now } },
      )
      if (update.modifiedCount) {
        const store = new MongoEventStore(db)
        await store.appendEvent({
          event_id: `evt_${id}_cancelled`, run_id: id, conversation_id: access.run.conversation_id,
          type: "run.cancelled", ts: now,
          payload: { reason: "The user cancelled this Cowork run.", cleanup_status: "completed" },
        })
      }
    } else {
      const update = await db.collection("cowork_runs").updateOne(
        { id, status: { $in: ["running", "waiting_approval", "verifying"] } },
        { $set: { cancel_requested_at: now, updated_at: now } },
      )
    }
    const run = await db.collection("cowork_runs").findOne(
      { id }, { projection: { _id: 0, id: 1, conversation_id: 1, workspace_id: 1, mode: 1, status: 1, seq_counter: 1, created_at: 1, updated_at: 1, completed_at: 1 } },
    )
    return NextResponse.json({ run }, { status: 202, headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Cowork run could not be cancelled." }, { status: 503 })
  }
}
