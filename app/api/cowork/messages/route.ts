import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Db } from "mongodb"
import { getDatabase } from "../../../../lib/mongodb.ts"
import { coworkOwnerFor, hasSameOrigin } from "../../../../app/lib/cowork-vm/auth.ts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export type StoredMessage = {
  id: string
  conversation_id: string
  owner_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

const messageIndexesCache = new WeakMap<Db, Promise<void>>()

/**
 * Ensures compound index on cowork_messages: { conversation_id: 1, owner_id: 1, created_at: 1, id: 1 }
 */
export async function ensureMessageIndexes(db: Db): Promise<void> {
  if (!messageIndexesCache.has(db)) {
    const p = (async () => {
      await db.collection<StoredMessage>("cowork_messages").createIndex(
        { conversation_id: 1, owner_id: 1, created_at: 1, id: 1 },
      )
    })().catch(err => {
      messageIndexesCache.delete(db)
      throw err
    })
    messageIndexesCache.set(db, p)
  }
  return messageIndexesCache.get(db)
}

/**
 * Optimized query retrieving messages using compound index and selective projection.
 */
export async function queryCoworkMessages(
  db: Db,
  params: { conversation_id: string; owner_id: string; limit?: number },
): Promise<StoredMessage[]> {
  await ensureMessageIndexes(db)
  const limit = Math.max(1, Math.min(params.limit ?? 500, 500))
  return db
    .collection<StoredMessage>("cowork_messages")
    .find(
      { conversation_id: params.conversation_id, owner_id: params.owner_id },
      { projection: { _id: 0, id: 1, conversation_id: 1, owner_id: 1, role: 1, content: 1, created_at: 1 } },
    )
    .sort({ created_at: 1, id: 1 })
    .limit(limit)
    .toArray()
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = await coworkOwnerFor(request)
    if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id") || searchParams.get("id")
    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id query parameter is required." }, { status: 400 })
    }

    const db = await getDatabase()
    await ensureMessageIndexes(db)

    const conversation = await db.collection("cowork_conversations").findOne(
      { id: conversationId, owner_id: ownerId },
      { projection: { _id: 0, id: 1 } },
    )
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 })

    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 500

    const messages = await queryCoworkMessages(db, {
      conversation_id: conversationId,
      owner_id: ownerId,
      limit,
    })

    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Conversation messages are unavailable." }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON content type required." }, { status: 415 })
  }

  try {
    const ownerId = await coworkOwnerFor(request)
    if (!ownerId) return NextResponse.json({ error: "Cowork session required." }, { status: 401 })

    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 })
    }

    const { conversation_id, role, content } = body as Record<string, unknown>
    if (typeof conversation_id !== "string" || !conversation_id.trim()) {
      return NextResponse.json({ error: "conversation_id is required." }, { status: 400 })
    }
    if (role !== "user" || typeof content !== "string" || !content.trim() || content.length > 12000) {
      return NextResponse.json({ error: "A user message of 1 to 12000 characters is required." }, { status: 400 })
    }

    const db = await getDatabase()
    await ensureMessageIndexes(db)

    const conversation = await db.collection("cowork_conversations").findOne(
      { id: conversation_id, owner_id: ownerId },
      { projection: { _id: 0, id: 1 } },
    )
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 })

    const message: StoredMessage = {
      id: `msg_${randomUUID()}`,
      conversation_id,
      owner_id: ownerId,
      role: "user",
      content: content.trim(),
      created_at: new Date().toISOString(),
    }

    await db.collection<StoredMessage>("cowork_messages").insertOne(message)
    await db.collection("cowork_conversations").updateOne(
      { id: conversation_id, owner_id: ownerId },
      { $set: { updated_at: message.created_at } },
    )

    return NextResponse.json(
      {
        message: {
          id: message.id,
          conversation_id: message.conversation_id,
          role: message.role,
          content: message.content,
          created_at: message.created_at,
        },
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch {
    return NextResponse.json({ error: "Message could not be saved." }, { status: 503 })
  }
}
