import { NextRequest, NextResponse } from "next/server"
import { ownedRun } from "../access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const access = await ownedRun(request, id)
    if (access.status !== 200) {
      return NextResponse.json(
        { error: access.status === 401 ? "Cowork session required." : "Run not found." },
        { status: access.status },
      )
    }

    const events = await access.db.collection("cowork_events")
      .find({ run_id: id }, { projection: { _id: 0, event_id: 1, run_id: 1, conversation_id: 1, seq: 1, type: 1, ts: 1, payload: 1 } })
      .sort({ seq: 1 })
      .limit(1000)
      .toArray()
    const approvalDocs = await access.db.collection("cowork_approvals")
      .find({ run_id: id, status: "pending", expires_at: { $gt: new Date().toISOString() } }, { projection: { _id: 0, id: 1, action_digest: 1, tool_name: 1, summary: 1, risk: 1, args_redacted: 1 } })
      .limit(50).toArray()
    const approvals = approvalDocs.map(approval => ({ ...approval, id: String(approval.id), action_digest: String(approval.action_digest), summary: String(approval.summary || "Permission required."), risk: String(approval.risk || "medium") }))
    return NextResponse.json({ run: access.run, events, approvals }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Run snapshot is unavailable." }, { status: 503 })
  }
}
