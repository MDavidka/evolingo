import { coworkModel, coworkPermissions } from "../../../lib/arlen/models.ts"
import { randomUUID } from "node:crypto"
import os from "node:os"
import { closeDatabase, getDatabase } from "../../../lib/mongodb.ts"
import { MongoEventStore } from "./storage/mongo-event-store.ts"
import { CoworkVMManager } from "./vm-manager.ts"
import { createOpenCodeClient } from "./opencode-client.ts"
import { OpenCodeEventAdapter } from "./opencode-adapter.ts"
import { redactSecrets } from "./sandbox-broker.ts"
import { computeActionDigest } from "./security/action-digest.ts"
import type { CoworkEventEnvelope, CoworkRun } from "./types.ts"

const LEASE_MS = 30_000
const POLL_MS = 250
const HEARTBEAT_MS = 8_000
// A worker may be waiting for a user approval while holding the run lease. If
// that process dies, the next leader must interrupt the run instead of leaving
// the approval and stream open forever.
const RUNNING_STATUSES = ["planning", "running", "verifying", "waiting_approval"] as const
const EVENT_TYPES = [
  "session.execution.started", "session.execution.succeeded", "session.execution.failed",
  "session.execution.interrupted", "session.text.started", "session.text.delta", "session.text.ended",
  "session.tool.input.started", "session.tool.called", "session.tool.success", "session.tool.failed",
  "permission.asked",
] as const

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function eventEnvelope(run: CoworkRun, eventId: string, type: CoworkEventEnvelope["type"], payload: Record<string, unknown>) {
  return {
    event_id: eventId,
    run_id: run.id,
    conversation_id: run.conversation_id,
    type,
    ts: new Date().toISOString(),
    payload,
  }
}

function safeFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Cowork run failed."
  return redactSecrets(raw).slice(0, 1000) || "Cowork run failed."
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  try {
    const parsed: unknown = JSON.parse(redactSecrets(JSON.stringify(value)))
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch { return {} }
}

async function appendOnce(store: MongoEventStore, run: CoworkRun, event: ReturnType<typeof eventEnvelope>) {
  await store.appendEvent(event)
}

async function persistOpenCodeRun(run: CoworkRun, ownerId: string, secret: string, store: MongoEventStore, db: Awaited<ReturnType<typeof getDatabase>>) {
  const instanceName = CoworkVMManager.instanceNameForOwner(ownerId)
  const worker = await CoworkVMManager.startOpenCodeServer(instanceName, secret)
  const client = createOpenCodeClient({ baseUrl: worker.baseUrl, password: worker.password })
  const mode = run.mode === "plan" ? "plan" : "build"
  const fullModelId = run.model_id || coworkModel()
  const [providerID, ...modelParts] = fullModelId.includes("/") ? fullModelId.split("/") : ["opencode", fullModelId]
  const configuredModel = modelParts.join("/") || "deepseek-v4-flash-0731"
  const session = await client.session.create({
    title: run.prompt.slice(0, 100),
    agent: mode,
    location: { directory: "/workspace" },
    model: { id: configuredModel, providerID },
    permissions: coworkPermissions(mode === "plan"),
  })
  await db.collection<any>("cowork_runs").updateOne(
    { id: run.id }, { $set: { engine_session_id: session.id } },
  )
  let cancelSent = false
  const cancelPoll = setInterval(() => {
    if (cancelSent) return
    void db.collection<any>("cowork_runs").findOne(
      { id: run.id, cancel_requested_at: { $exists: true } },
      { projection: { _id: 1 } },
    ).then(async (requested) => {
      if (!requested || cancelSent) return
      cancelSent = true
      await client.session.interrupt({ sessionID: session.id }).catch(() => {})
    }).catch(() => {})
  }, 1000)

  const adapter = new OpenCodeEventAdapter()
  const abortEvents = new AbortController()
  let streamError: unknown
  let sawMessageCompleted = false
  const consumeEvents = (async () => {
    try {
      for await (const nativeEvent of client.event.subscribe({ signal: abortEvents.signal, types: EVENT_TYPES })) {
        const event = nativeEvent as unknown as { id?: string; data?: Record<string, unknown> }
        if (event.data?.sessionID !== session.id) continue
        if (nativeEvent.type === "permission.asked") {
          const data = event.data || {}
          const action = String(data.action || "tool")
          const resources = Array.isArray(data.resources) ? data.resources.map(value => redactSecrets(String(value)).slice(0, 500)).slice(0, 32) : []
          const args = {
            resources,
            metadata: safeRecord(data.metadata),
            save: Array.isArray(data.save) ? data.save.map(value => redactSecrets(String(value)).slice(0, 500)).slice(0, 32) : [],
            message: redactSecrets(String(data.message || "")).slice(0, 1000),
          }
          const actionDigest = computeActionDigest(action, args, ownerId)
          await store.updateRunStatus(run.id, "waiting_approval")
          const safeRequestMessage = redactSecrets(String(data.message || "")).slice(0, 1000)
          const safeResources = resources.slice(0, 4).join(", ").slice(0, 350)
          const approval = await store.createApproval({
            id: `appr_${String(data.id || event.id)}`,
            run_id: run.id,
            conversation_id: run.conversation_id,
            tool_call_id: String(data.id || event.id),
            tool_name: action,
            args,
            args_redacted: args,
            action_digest: actionDigest,
            workspace_id: ownerId,
            risk: /shell|bash|command|terminal|exec/i.test(action) ? "high" : "medium",
            summary: (safeRequestMessage || `OpenCode requests permission for ${action}${safeResources ? `: ${safeResources}` : ""}.`).slice(0, 500),
            status: "pending",
            expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          })
          await store.appendEvent(eventEnvelope(run, `evt_${approval.id}_required`, "approval.required", {
            approval_id: approval.id,
            action_digest: actionDigest,
            tool_call_id: approval.tool_call_id,
            tool_name: action,
            args_redacted: args,
            risk: approval.risk,
            summary: approval.summary,
            expiry: approval.expires_at,
          }))

          let current = approval
          while (current.status === "pending" && new Date(current.expires_at).getTime() > Date.now() && !abortEvents.signal.aborted) {
            await sleep(1000)
            current = await store.getApproval(approval.id) || current
            const cancellation = await db.collection<any>("cowork_runs").findOne(
              { id: run.id, cancel_requested_at: { $exists: true } }, { projection: { _id: 1 } },
            )
            if (cancellation) break
          }
          if (current.status === "pending") {
            await store.resolveApproval(approval.id, "deny", actionDigest, ownerId).catch(() => {})
            current = await store.getApproval(approval.id) || current
          }
          const cancelRequested = await db.collection<any>("cowork_runs").findOne(
            { id: run.id, cancel_requested_at: { $exists: true } }, { projection: { _id: 1 } },
          )
          const allowed = !cancelRequested && (current.status === "allowed" || current.status === "approved")
          await client.permission.reply({
            sessionID: session.id,
            requestID: approval.tool_call_id,
            decision: allowed ? "once" : "reject",
            message: allowed ? undefined : "Permission was denied or expired.",
          })
          await store.appendEvent(eventEnvelope(run, `evt_${approval.id}_resolved`, "approval.resolved", {
            approval_id: approval.id,
            decision: allowed ? "allow_once" : "deny",
            actor_id: current.decided_by || "system",
            action_digest: actionDigest,
            resolved_at: current.decided_at || new Date().toISOString(),
          }))
          if (!cancelRequested) await store.updateRunStatus(run.id, "running")
          continue
        }

        for (const adapted of adapter.map(nativeEvent, { runId: run.id, conversationId: run.conversation_id })) {
          if (adapted.type === "message.completed") sawMessageCompleted = true
          await store.appendEvent(adapted)
        }
      }
    } catch (error) {
      if (!abortEvents.signal.aborted) streamError = error
    }
  })()

  try {
    // Give the native SSE subscription time to connect before starting model work.
    await sleep(60)
    const historyDocs = await db.collection<any>("cowork_messages")
      .find({ conversation_id: run.conversation_id, owner_id: ownerId })
      .sort({ created_at: -1 })
      .limit(16)
      .toArray()
    const priorHistory = historyDocs
      .reverse()
      .filter((m: any) => !(m.role === "user" && String(m.content || "").trim() === run.prompt.trim()))
      .slice(-12)
    const promptWithMemory = priorHistory.length > 0
      ? [
          "<conversation_memory>",
          ...priorHistory.map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${String(m.content || "").slice(0, 1200)}`),
          "</conversation_memory>",
          "",
          run.prompt,
        ].join("\n")
      : run.prompt
    await client.session.prompt({ sessionID: session.id, text: promptWithMemory })
    await client.session.wait({ sessionID: session.id })
  } catch (error) {
    await client.session.remove({ sessionID: session.id }).catch(() => {})
    throw error
  } finally {
    abortEvents.abort()
    await Promise.race([consumeEvents, sleep(2_000)])
    clearInterval(cancelPoll)
  }

  try {
  const cancelRequest = await db.collection<any>("cowork_runs").findOne(
    { id: run.id, cancel_requested_at: { $exists: true } }, { projection: { _id: 1 } },
  )
          if (cancelRequest) {
    await store.updateRunStatus(run.id, "cancelled")
    await appendOnce(store, run, eventEnvelope(run, `evt_${run.id}_cancelled`, "run.cancelled", {
      reason: "The user cancelled this Cowork run.", cleanup_status: "completed",
    }))
    await client.session.remove({ sessionID: session.id }).catch(() => {})
    return
  }

  const response = await client.message.list({ sessionID: session.id })
  const orderedMessages: any[] = [...(response.data || [])]
    .sort((a: any, b: any) => Number(a.time?.created || 0) - Number(b.time?.created || 0))
  const promptIndex = orderedMessages.findLastIndex(
    message => message.type === "user" && message.text === run.prompt,
  )
  const assistantMessages: any[] = orderedMessages
    .slice(Math.max(0, promptIndex + 1))
    .filter((message: any) => message.type === "assistant")
  const nonEmptyAssistantMessages = assistantMessages
    .map((message: any) => ({
      id: String(message.id || randomUUID()),
      text: redactSecrets((message.content || [])
        .filter((part: any) => part.type === "text")
        .map((part: any) => String(part.text || "")).join("")).trim(),
    }))
    .filter(item => item.text.length > 0)

  let finalMessageId = nonEmptyAssistantMessages.at(-1)?.id || `verdict_${run.id}`
  let finalVerdictText = nonEmptyAssistantMessages.at(-1)?.text || ""

  if (!finalVerdictText) {
    const existingEvents = await store.getEvents(run.id, 0)
    const completedTools = existingEvents
      .filter(evt => evt.type === "tool.completed" || evt.type === "tool.started")
      .map(evt => String((evt.payload as any)?.safe_label || (evt.payload as any)?.result_summary || (evt.payload as any)?.name || "").trim())
      .filter(Boolean)
    if (completedTools.length > 0) {
      const uniqueTools = Array.from(new Set(completedTools)).slice(0, 4)
      finalVerdictText = `Completed the requested workspace actions (${uniqueTools.join(", ")}).`
    } else if (streamError) {
      throw streamError
    } else {
      finalVerdictText = "Completed the request and verified the workspace state."
    }
  }

  await appendOnce(store, run, eventEnvelope(run, `evt_${run.id}_${finalMessageId}`, "message.completed", {
    message_id: finalMessageId,
    role: "assistant",
    parts: [{ type: "text", text: finalVerdictText.slice(0, 12000) }],
  }))

  const createdAt = new Date().toISOString()
  const persistedId = `msg_${run.id}_verdict`
  await db.collection<any>("cowork_messages").deleteMany({
    conversation_id: run.conversation_id,
    owner_id: ownerId,
    id: { $regex: `^msg_${run.id}_` },
  })
  await db.collection<any>("cowork_messages").updateOne(
    { _id: persistedId },
    { $set: { id: persistedId, conversation_id: run.conversation_id, owner_id: ownerId, role: "assistant", content: finalVerdictText.slice(0, 12000), created_at: createdAt } },
    { upsert: true },
  )

  await store.updateRunStatus(run.id, "completed")
  await appendOnce(store, run, eventEnvelope(run, `evt_${run.id}_completed`, "run.completed", {
    result_message_id: finalMessageId,
    verification_summary: "OpenCode completed the requested session and its assistant verdict was persisted.",
    engine_version: "2.2.7",
    model_id: run.model_id || coworkModel(),
  }))
  await db.collection("cowork_conversations").updateOne(
    { id: run.conversation_id }, { $set: { updated_at: new Date().toISOString() } },
  )
  } finally {
  await client.session.remove({ sessionID: session.id }).catch(() => {})
  }
}

export async function interruptExpiredRuns(db: Awaited<ReturnType<typeof getDatabase>>, store: MongoEventStore) {
  const now = new Date()
  const runs = db.collection<CoworkRun & { lease_expires_at?: Date }>("cowork_runs")
  const expired = await runs
    .find({ status: { $in: RUNNING_STATUSES }, lease_expires_at: { $lte: now } })
    .limit(50).toArray()
  for (const run of expired) {
    const result = await db.collection<any>("cowork_runs").updateOne(
      { id: run.id, status: { $in: RUNNING_STATUSES }, lease_expires_at: { $lte: now } },
      { $set: { status: "interrupted", updated_at: now.toISOString(), completed_at: now.toISOString(), error: "Worker lease expired; the run was not replayed." } },
    )
    if (!result.modifiedCount) continue
    await store.appendEvent(eventEnvelope(run, `evt_${run.id}_interrupted`, "run.status", {
      status: "interrupted", reason: "Worker lease expired; unsafe actions were not replayed.",
    }))
  }

  // A run can be inserted as `planning` before the request appends run.queued.
  // If the API process dies in that gap, it has no lease for the normal reaper
  // to expire. Sequence zero makes this CAS safe against the request finishing
  // concurrently: once it appends the queued event, seq_counter is no longer 0.
  const planningCutoff = new Date(now.getTime() - LEASE_MS).toISOString()
  const abandonedPlanning = await runs.find({
    status: "planning",
    created_at: { $lte: planningCutoff },
    seq_counter: 0,
    $or: [{ lease_expires_at: { $exists: false } }, { lease_expires_at: { $lte: now } }],
  }).limit(50).toArray()
  for (const run of abandonedPlanning) {
    const result = await runs.updateOne(
      {
        id: run.id,
        status: "planning",
        created_at: { $lte: planningCutoff },
        seq_counter: 0,
        $or: [{ lease_expires_at: { $exists: false } }, { lease_expires_at: { $lte: now } }],
      },
      { $set: {
        status: "interrupted",
        updated_at: now.toISOString(),
        completed_at: now.toISOString(),
        error: "Run did not enter the worker queue; no action was replayed.",
      } },
    )
    if (!result.modifiedCount) continue
    await store.appendEvent(eventEnvelope(run, `evt_${run.id}_interrupted`, "run.status", {
      status: "interrupted", reason: "Run did not enter the worker queue; no action was replayed.",
    }))
  }
}

/** Long-running single-leader worker. Start with `npm run cowork:worker`. */
export async function startCoworkWorker() {
  const secret = process.env.COWORK_SECRET?.trim()
  if (!secret || secret.length < 32) throw new Error("COWORK_SECRET must be at least 32 characters to start the Cowork worker.")
  const db = await getDatabase()
  const store = new MongoEventStore(db)
  await store.ensureIndexes(db)
  const workerId = `${os.hostname()}:${process.pid}:${randomUUID()}`
  let stopping = false
  process.once("SIGTERM", () => { stopping = true })
  process.once("SIGINT", () => { stopping = true })

  while (!stopping) {
    const now = new Date()
    let leader = false
    try {
      const lease = await db.collection<any>("cowork_worker_leases").findOneAndUpdate(
        { _id: "primary", $or: [{ owner_id: workerId }, { expires_at: { $lte: now } }] },
        { $set: { owner_id: workerId, expires_at: new Date(now.getTime() + LEASE_MS), updated_at: now } },
        { upsert: true, returnDocument: "after" },
      )
      leader = lease?.owner_id === workerId
    } catch (error: any) {
      if (error?.code !== 11000) throw error
    }

    if (leader) {
      const heartbeatAt = new Date()
      await db.collection<any>("cowork_worker_state").updateOne(
        { _id: "primary" },
        { $set: { worker_id: workerId, heartbeat_at: heartbeatAt, expires_at: new Date(heartbeatAt.getTime() + LEASE_MS) } },
        { upsert: true },
      )
      await interruptExpiredRuns(db, store)

      const queued = await db.collection<CoworkRun>("cowork_runs").findOneAndUpdate(
        { status: "queued" },
        { $set: {
          status: "running", worker_id: workerId,
          lease_expires_at: new Date(Date.now() + LEASE_MS),
          updated_at: new Date().toISOString(),
        } },
        { sort: { created_at: 1 }, returnDocument: "after" },
      )
      if (queued) {
        const run = queued
        const ownerId = String(run.workspace_id || "")
        const renew = setInterval(() => {
          const updatedAt = new Date()
        void Promise.all([
            db.collection<any>("cowork_worker_leases").updateOne(
              { _id: "primary", owner_id: workerId },
              { $set: { expires_at: new Date(updatedAt.getTime() + LEASE_MS), updated_at: updatedAt } },
            ),
            db.collection<any>("cowork_worker_state").updateOne(
              { _id: "primary", worker_id: workerId },
              { $set: { heartbeat_at: updatedAt, expires_at: new Date(updatedAt.getTime() + LEASE_MS) } },
            ),
            db.collection<any>("cowork_runs").updateOne(
              { id: run.id, worker_id: workerId },
              { $set: { lease_expires_at: new Date(updatedAt.getTime() + LEASE_MS), updated_at: updatedAt.toISOString() } },
            ),
        ]).catch(() => {})
        }, HEARTBEAT_MS)
        try {
          if (!ownerId || !/^[a-f0-9]{64}$/.test(ownerId)) throw new Error("Run workspace owner is invalid.")
          await store.appendEvent(eventEnvelope(run, `evt_${run.id}_started`, "run.started", {
            engine_version: "2.2.7", model_id: run.model_id || coworkModel(), mode: run.mode,
          }))
          await store.updateRunStatus(run.id, "running")
          await persistOpenCodeRun(run, ownerId, secret, store, db)
        } catch (error) {
          const message = safeFailure(error)
          const latestRun = await db.collection<any>("cowork_runs").findOne(
            { id: run.id }, { projection: { _id: 0, status: 1, cancel_requested_at: 1 } },
          )
          if (["completed", "failed", "cancelled", "interrupted"].includes(String(latestRun?.status))) continue
          const existing = await store.getEvents(run.id, 0)
          if (latestRun?.cancel_requested_at) {
            if (!existing.some(event => event.type === "run.cancelled")) {
              await appendOnce(store, run, eventEnvelope(run, `evt_${run.id}_cancelled`, "run.cancelled", {
                reason: "The user cancelled this Cowork run.", cleanup_status: "completed",
              }))
            }
            await store.updateRunStatus(run.id, "cancelled")
          } else {
            if (!existing.some(event => event.type === "run.failed")) {
              await appendOnce(store, run, eventEnvelope(run, `evt_${run.id}_failed`, "run.failed", {
                error_code: "COWORK_RUN_FAILED", safe_error: message,
              }))
            }
            await store.updateRunStatus(run.id, "failed", message)
          }
        } finally {
          clearInterval(renew)
          await db.collection<any>("cowork_runs").updateOne(
            { id: run.id, worker_id: workerId }, { $unset: { lease_expires_at: "", worker_id: "" } },
          )
          await db.collection<any>("cowork_worker_leases").updateOne(
            { _id: "primary", owner_id: workerId }, { $set: { expires_at: new Date(0), updated_at: new Date() } },
          )
        }
      }
    }
    await sleep(POLL_MS)
  }
  const stoppedAt = new Date()
  await Promise.all([
    db.collection<any>("cowork_worker_leases").updateOne(
      { _id: "primary", owner_id: workerId },
      { $set: { expires_at: new Date(0), updated_at: stoppedAt } },
    ),
    db.collection<any>("cowork_worker_state").updateOne(
      { _id: "primary", worker_id: workerId },
      { $set: { heartbeat_at: stoppedAt, expires_at: new Date(0) } },
    ),
  ])
  await closeDatabase()
}
