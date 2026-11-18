import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "../../../../../../lib/mongodb"
import { coworkOwnerFor, hasSameOrigin } from "../../../../../lib/cowork-vm/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }
type StoredMessage = {
  id: string
  conversation_id: string
  owner_id: string
  role: "user"
  content: string
  created_at: string
}

async function ownedConversation(request: NextRequest, id: string) {
  const ownerId = await coworkOwnerFor(request)
  if (!ownerId) return { response: NextResponse.json({ error: "Cowork session required." }, { status: 401 }) }
  const db = await getDatabase()
  const conversation = await db.collection("cowork_conversations").findOne(
    { id, owner_id: ownerId },
    { projection: { _id: 0, id: 1 } },
  )
  if (!conversation) return { response: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) }
  return { ownerId, db }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const owned = await ownedConversation(request, id)
    if ("response" in owned) return owned.response

    const messages = await owned.db.collection<StoredMessage>("cowork_messages")
      .find({ conversation_id: id, owner_id: owned.ownerId }, { projection: { _id: 0, id: 1, role: 1, content: 1, created_at: 1 } })
      .sort({ created_at: 1, id: 1 })
      .limit(500)
      .toArray()
    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Conversation messages are unavailable." }, { status: 503 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON content type required." }, { status: 415 })
  }

  try {
    const { id } = await context.params
    const owned = await ownedConversation(request, id)
    if ("response" in owned) return owned.response

    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid message." }, { status: 400 })
    }
    const { role, content } = body as Record<string, unknown>
    if (role !== "user" || typeof content !== "string" || !content.trim() || content.length > 12000) {
      return NextResponse.json({ error: "A user message of 1 to 12000 characters is required." }, { status: 400 })
    }

    const message: StoredMessage = {
      id: `msg_${randomUUID()}`,
      conversation_id: id,
      owner_id: owned.ownerId,
      role: "user",
      content: content.trim(),
      created_at: new Date().toISOString(),
    }
    await owned.db.collection<StoredMessage>("cowork_messages").insertOne(message)
    await owned.db.collection("cowork_conversations").updateOne(
      { id, owner_id: owned.ownerId },
      { $set: { updated_at: message.created_at } },
    )
    return NextResponse.json({ message: { id: message.id, role: message.role, content: message.content, created_at: message.created_at } }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "Message could not be saved." }, { status: 503 })
  }
}
