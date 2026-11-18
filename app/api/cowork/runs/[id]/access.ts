import type { NextRequest } from "next/server"
import { getDatabase } from "../../../../../lib/mongodb"
import { coworkOwnerFor } from "../../../../lib/cowork-vm/auth"

export async function ownedRun(request: NextRequest, runId: string) {
  const ownerId = await coworkOwnerFor(request)
  if (!ownerId) return { status: 401 as const }

  const db = await getDatabase()
  const run = await db.collection("cowork_runs").findOne(
    { id: runId },
    { projection: { _id: 0, id: 1, conversation_id: 1, workspace_id: 1, mode: 1, status: 1, prompt: 1, model_id: 1, engine_version: 1, seq_counter: 1, created_at: 1, updated_at: 1, completed_at: 1, error: 1, cancel_requested_at: 1 } },
  )
  if (!run) return { status: 404 as const }

  const conversation = await db.collection("cowork_conversations").findOne(
    { id: run.conversation_id, owner_id: ownerId },
    { projection: { _id: 0, id: 1 } },
  )
  if (!conversation) return { status: 404 as const }
  return { status: 200 as const, db, ownerId, run }
}
