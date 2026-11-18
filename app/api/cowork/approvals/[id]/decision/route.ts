import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "../../../../../../lib/mongodb"
import { coworkOwnerFor, hasSameOrigin } from "../../../../../lib/cowork-vm/auth"
import { MongoEventStore } from "../../../../../lib/cowork-vm/storage/mongo-event-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON content type required." }, { status: 415 })
  }
  const ownerId = await coworkOwnerFor(request)
  if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })

  try {
    const { id: approvalId } = await context.params
    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 })
    }
    const { decision, action_digest: actionDigest } = body as Record<string, unknown>
    if ((decision !== "allow_once" && decision !== "deny") || typeof actionDigest !== "string" || !/^[a-f0-9]{64}$/.test(actionDigest)) {
      return NextResponse.json({ error: "A valid decision and action digest are required." }, { status: 400 })
    }

    const db = await getDatabase()
    const store = new MongoEventStore(db)
    const approval = await store.getApproval(approvalId)
    if (!approval) return NextResponse.json({ error: "Approval not found." }, { status: 404 })
    const run = await db.collection("cowork_runs").findOne(
      { id: approval.run_id }, { projection: { _id: 0, id: 1, conversation_id: 1 } },
    )
    if (!run) return NextResponse.json({ error: "Approval not found." }, { status: 404 })
    const conversation = await db.collection("cowork_conversations").findOne(
      { id: run.conversation_id, owner_id: ownerId }, { projection: { _id: 0, id: 1 } },
    )
    if (!conversation) return NextResponse.json({ error: "Approval not found." }, { status: 404 })

    await store.resolveApproval(approvalId, decision, actionDigest, ownerId)
    await store.appendEvent({
      event_id: `evt_${approval.id}_resolved`,
      run_id: approval.run_id,
      conversation_id: approval.conversation_id || run.conversation_id,
      type: "approval.resolved",
      ts: new Date().toISOString(),
      payload: { approval_id: approval.id, decision, actor_id: ownerId, action_digest: actionDigest, resolved_at: new Date().toISOString() },
    })
    return NextResponse.json({ approval_id: approval.id, status: decision === "allow_once" ? "allowed" : "denied" }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval could not be resolved."
    const status = /EXPIRED|ALREADY_USED|DIGEST_MISMATCH/.test(message) ? 409 : 503
    return NextResponse.json({ error: status === 409 ? message : "Approval could not be resolved." }, { status })
  }
}
