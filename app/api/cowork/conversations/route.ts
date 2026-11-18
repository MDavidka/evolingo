import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "../../../../lib/mongodb"
import { coworkOwnerFor, hasSameOrigin } from "../../../lib/cowork-vm/auth"
import { MongoEventStore } from "../../../lib/cowork-vm/storage/mongo-event-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const ownerId = await coworkOwnerFor(request)
    if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })

    const db = await getDatabase()
    const conversations = await db.collection("cowork_conversations")
      .find({ owner_id: ownerId }, { projection: { _id: 0, id: 1, title: 1, workspace_id: 1, created_at: 1, updated_at: 1 } })
      .sort({ updated_at: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json({ conversations }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Cowork conversations are unavailable." }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }

  try {
    const ownerId = await coworkOwnerFor(request)
    if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return NextResponse.json({ error: "JSON content type required." }, { status: 415 })
    }

    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid conversation data." }, { status: 400 })
    }
    const titleValue = (body as Record<string, unknown>).title
    if (titleValue !== undefined && (typeof titleValue !== "string" || titleValue.trim().length > 120)) {
      return NextResponse.json({ error: "Title must be 120 characters or fewer." }, { status: 400 })
    }

    const title = typeof titleValue === "string" && titleValue.trim()
      ? titleValue.trim()
      : "New Cowork conversation"
    // Ownership and workspace scope are always derived from the server session.
    const conversation = await new MongoEventStore().createConversation(title, ownerId, ownerId)
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        workspace_id: conversation.workspace_id,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      },
    }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Cowork conversation could not be created." }, { status: 503 })
  }
}
