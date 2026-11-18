import { coworkModel } from "@/lib/arlen/models"
import { createHash, randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "../../../../../../lib/mongodb"
import { coworkOwnerFor, hasSameOrigin } from "../../../../../lib/cowork-vm/auth"
import { MongoEventStore } from "../../../../../lib/cowork-vm/storage/mongo-event-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON content type required." }, { status: 415 })
  }
  const ownerId = await coworkOwnerFor(request)
  if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })

  try {
    const { id: conversationId } = await context.params
    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid run request." }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : ""
    const mode = input.mode === undefined ? "plan" : input.mode
    if (!prompt || prompt.length > 12000 || (mode !== "plan" && mode !== "build")) {
      return NextResponse.json({ error: "A prompt up to 12000 characters and a valid mode are required." }, { status: 400 })
    }

    const db = await getDatabase()
    const conversation = await db.collection("cowork_conversations").findOne(
      { id: conversationId, owner_id: ownerId },
      { projection: { _id: 0, id: 1 } },
    )
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 })

    const workerState = await db.collection<any>("cowork_worker_state").findOne(
      { _id: "primary", expires_at: { $gt: new Date() } },
      { projection: { _id: 1 } },
    )
    if (!workerState) {
      return NextResponse.json({ error: "Cowork run worker is unavailable." }, { status: 503 })
    }

    const suppliedKey = request.headers.get("idempotency-key")?.trim()
    if (suppliedKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(suppliedKey)) {
      return NextResponse.json({ error: "Invalid idempotency key." }, { status: 400 })
    }
    const idempotencyKey = suppliedKey || randomUUID()
    const store = new MongoEventStore(db)
    const existing = await store.getRunByIdempotencyKey?.(idempotencyKey, conversationId)
    if (existing) {
      if (existing.workspace_id !== ownerId || existing.prompt !== prompt || existing.mode !== mode) {
        return NextResponse.json({ error: "Idempotency key was already used for a different run." }, { status: 409 })
      }
      if (existing.status !== "planning") {
        return NextResponse.json({ run: existing }, { status: 200, headers: { "Cache-Control": "no-store" } })
      }
    }
    const run = await store.createRun({
      conversation_id: conversationId,
      workspace_id: ownerId,
      mode,
      prompt,
      model_id: coworkModel(),
      engine_version: "2.2.7",
      idempotency_key: idempotencyKey,
    })
    if (run.workspace_id !== ownerId || run.prompt !== prompt || run.mode !== mode) {
      return NextResponse.json({ error: "Idempotency key was already used for a different run." }, { status: 409 })
    }

    const messageId = `msg_${createHash("sha256").update(`${conversationId}:${idempotencyKey}`).digest("hex").slice(0, 32)}`
    const createdAt = new Date().toISOString()
    await db.collection<any>("cowork_messages").updateOne(
      { _id: messageId },
      { $setOnInsert: {
        id: messageId, conversation_id: conversationId, owner_id: ownerId,
        role: "user", content: prompt, created_at: createdAt,
      } },
      { upsert: true },
    )
    await db.collection("cowork_conversations").updateOne(
      { id: conversationId, owner_id: ownerId }, { $set: { updated_at: createdAt } },
    )
    if (run.status === "planning") {
      await store.appendEvent({
        event_id: `evt_${run.id}_queued`,
        run_id: run.id,
        conversation_id: conversationId,
        type: "run.queued",
        ts: createdAt,
        payload: { mode, engine_version: "2.2.7" },
      })
      await db.collection<any>("cowork_runs").updateOne(
        { id: run.id, status: "planning" },
        { $set: { status: "queued", updated_at: new Date().toISOString() } },
      )
    }

    const latestRun = await store.getRun(run.id)
    return NextResponse.json({ run: latestRun || run }, { status: 202, headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Cowork run could not be queued." }, { status: 503 })
  }
}
