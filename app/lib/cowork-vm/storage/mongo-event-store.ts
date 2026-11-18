/**
 * MongoDB-backed Event Store & State Persistence for Cowork VM
 * Milestone 1 (M1: Durable Event Store & Cryptographic State)
 *
 * Implements:
 * - ICoworkStorage interface
 * - Atomic monotonic per-run sequence numbers (run_id, seq) starting at 1
 * - Replay querying via getEvents(run_id, after_seq)
 * - Client idempotency key deduplication on createRun
 * - JIT human approval creation and cryptographic resolution
 * - Lazy idempotent index creation cached via WeakMap
 */

import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Db, Collection, Filter } from "mongodb";
import { getDatabase, withDatabaseTransaction } from "../../../../lib/mongodb.ts";
import type {
  ICoworkStorage,
  CoworkConversation,
  CoworkRun,
  CoworkRunStatus,
  CoworkMode,
  CoworkEventEnvelope,
  CoworkApprovalRequest,
  CoworkAuditRecord,
} from "../types.ts";
import { CoworkAuditLogger } from "./audit-logger.ts";

const mongoIndexesCache = new WeakMap<Db, Promise<void>>();

interface ConversationDoc extends CoworkConversation {
  _id: string;
}

interface RunDoc extends CoworkRun {
  _id: string;
}

interface ApprovalDoc extends CoworkApprovalRequest {
  _id: string;
}

interface EventDoc extends CoworkEventEnvelope {
  _id: string;
}

export class MongoEventStore implements ICoworkStorage {
  private dbPromise?: Promise<Db> | Db;
  private auditLogger: CoworkAuditLogger;

  constructor(db?: Db | Promise<Db>) {
    this.dbPromise = db;
    this.auditLogger = new CoworkAuditLogger(db);
  }

  private async getDb(): Promise<Db> {
    if (this.dbPromise) {
      return this.dbPromise;
    }
    return getDatabase();
  }

  /**
   * Lazily ensures all required collections have their unique and compound indexes.
   */
  async ensureIndexes(db?: Db): Promise<void> {
    const targetDb = db || (await this.getDb());
    if (!mongoIndexesCache.has(targetDb)) {
      const p = (async () => {
        // 1. cowork_events: unique per (run_id, seq), index on ts for time queries
        const events = targetDb.collection<EventDoc>("cowork_events");
        await events.createIndex({ run_id: 1, seq: 1 }, { unique: true });
        await events.createIndex({ run_id: 1, seq: 1, ts: 1 });

        // 2. cowork_runs: compound unique idempotency key, query indexes
        const runs = targetDb.collection<RunDoc>("cowork_runs");
        await runs.createIndex({ id: 1 }, { unique: true });
        await runs.createIndex(
          { conversation_id: 1, idempotency_key: 1 },
          {
            unique: true,
            partialFilterExpression: { idempotency_key: { $type: "string" } },
          }
        );
        await runs.createIndex({ conversation_id: 1, created_at: -1 });

        // 3. cowork_approvals: unique approval_id, run lookup
        const approvals = targetDb.collection<ApprovalDoc>("cowork_approvals");
        await approvals.createIndex({ id: 1 }, { unique: true });
        await approvals.createIndex(
          { approval_id: 1 },
          { unique: true, sparse: true }
        );
        await approvals.createIndex({ run_id: 1, status: 1 });

        // 4. cowork_conversations: unique id, owner lookup
        const convs = targetDb.collection<ConversationDoc>("cowork_conversations");
        await convs.createIndex({ id: 1 }, { unique: true });
        await convs.createIndex({ owner_id: 1, updated_at: -1 });

        // 5. cowork_audit: delegated to CoworkAuditLogger
        await this.auditLogger.ensureIndexes(targetDb);
      })().catch((err) => {
        mongoIndexesCache.delete(targetDb);
        throw err;
      });
      mongoIndexesCache.set(targetDb, p);
    }
    return mongoIndexesCache.get(targetDb);
  }

  // ==========================================================================
  // Conversations
  // ==========================================================================

  async createConversation(
    title?: string,
    workspace_id?: string,
    owner_id?: string
  ): Promise<CoworkConversation> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const now = new Date().toISOString();
    const convId = `conv_${randomUUID()}`;

    const conv: ConversationDoc = {
      _id: convId,
      id: convId,
      title: title || "Untitled Conversation",
      workspace_id: workspace_id || "cowork-default",
      owner_id: owner_id || "system",
      created_at: now,
      updated_at: now,
    };

    await db.collection<ConversationDoc>("cowork_conversations").insertOne(conv);

    return {
      id: conv.id,
      title: conv.title,
      workspace_id: conv.workspace_id,
      owner_id: conv.owner_id,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
    };
  }

  async getConversation(conversation_id: string): Promise<CoworkConversation | null> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const filter: Filter<ConversationDoc> = {
      $or: [{ id: conversation_id }, { _id: conversation_id }],
    };
    const doc = await db.collection<ConversationDoc>("cowork_conversations").findOne(filter);

    if (!doc) return null;

    return {
      id: doc.id || doc._id,
      title: doc.title,
      workspace_id: doc.workspace_id,
      owner_id: doc.owner_id,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }

  // ==========================================================================
  // Runs & Idempotency
  // ==========================================================================

  async createRun(params: {
    conversation_id: string;
    mode: CoworkMode;
    prompt: string;
    workspace_id?: string;
    model_id?: string;
    engine_version?: string;
    idempotency_key?: string;
  }): Promise<CoworkRun> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const coll = db.collection<RunDoc>("cowork_runs");

    // 1. If idempotency_key is provided, check if it already exists
    if (params.idempotency_key) {
      const existing = await coll.findOne({
        conversation_id: params.conversation_id,
        idempotency_key: params.idempotency_key,
      });

      if (existing) {
        return this.mapRunDoc(existing);
      }
    }

    const now = new Date().toISOString();
    const runId = `run_${randomUUID()}`;

    const newRun: RunDoc = {
      _id: runId,
      id: runId,
      conversation_id: params.conversation_id,
      workspace_id: params.workspace_id || "cowork-default",
      mode: params.mode || "build",
      status: "planning" as CoworkRunStatus,
      prompt: params.prompt,
      model_id: params.model_id || (process.env.ZRO_API_KEY?.trim() ? "zro/deepseek-v4-flash-0731" : "opencode/big-pickle"),
      engine_version: params.engine_version || "2.2.7",
      idempotency_key: params.idempotency_key,
      seq_counter: 0,
      created_at: now,
      updated_at: now,
    };

    try {
      await coll.insertOne(newRun);
      return this.mapRunDoc(newRun);
    } catch (err: any) {
      // If concurrent request inserted the same idempotency_key, return the existing run
      if (err.code === 11000 && params.idempotency_key) {
        const existing = await coll.findOne({
          conversation_id: params.conversation_id,
          idempotency_key: params.idempotency_key,
        });
        if (existing) {
          return this.mapRunDoc(existing);
        }
      }
      throw err;
    }
  }

  async getRun(run_id: string): Promise<CoworkRun | null> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const filter: Filter<RunDoc> = {
      $or: [{ id: run_id }, { _id: run_id }],
    };
    const doc = await db.collection<RunDoc>("cowork_runs").findOne(filter);

    if (!doc) return null;
    return this.mapRunDoc(doc);
  }

  async getRunByIdempotencyKey(
    key: string,
    conversation_id?: string
  ): Promise<CoworkRun | null> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const filter: Filter<RunDoc> = { idempotency_key: key };
    if (conversation_id) {
      filter.conversation_id = conversation_id;
    }

    const doc = await db.collection<RunDoc>("cowork_runs").findOne(filter);
    if (!doc) return null;
    return this.mapRunDoc(doc);
  }

  async updateRunStatus(
    run_id: string,
    status: CoworkRunStatus,
    error?: string
  ): Promise<void> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const now = new Date().toISOString();
    const updateDoc: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    if (error !== undefined) {
      updateDoc.error = error;
    }

    if (
      status === "completed" ||
      status === "failed" ||
      status === "cancelled" ||
      status === "interrupted"
    ) {
      updateDoc.completed_at = now;
    }

    const filter: Filter<RunDoc> = {
      $or: [{ id: run_id }, { _id: run_id }],
    };

    await db.collection<RunDoc>("cowork_runs").updateOne(
      filter,
      { $set: updateDoc }
    );
  }

  private mapRunDoc(doc: RunDoc): CoworkRun {
    return {
      id: doc.id || doc._id,
      conversation_id: doc.conversation_id,
      workspace_id: doc.workspace_id,
      mode: doc.mode,
      status: doc.status,
      prompt: doc.prompt,
      model_id: doc.model_id,
      engine_version: doc.engine_version,
      idempotency_key: doc.idempotency_key,
      seq_counter: doc.seq_counter ?? 0,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      completed_at: doc.completed_at,
      error: doc.error,
    };
  }

  // ==========================================================================
  // Events & Atomic Monotonic Sequences
  // ==========================================================================

  async appendEvent(
    event: Omit<CoworkEventEnvelope, "seq"> & { seq?: number }
  ): Promise<CoworkEventEnvelope> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const now = event.ts || new Date().toISOString();
    const eventId = event.event_id || `evt_${randomUUID()}`;

    // Delivery Invariant: Heartbeat events are server keepalives, NOT persisted
    if (event.type === "heartbeat") {
      return {
        event_id: eventId,
        run_id: event.run_id,
        conversation_id: event.conversation_id,
        seq: event.seq || 0,
        type: event.type,
        ts: now,
        payload: event.payload as any,
      };
    }

    const appendInTransaction = async (
      targetDb: Db,
      session: import("mongodb").ClientSession,
    ): Promise<CoworkEventEnvelope> => {
      const eventsColl = targetDb.collection<EventDoc>("cowork_events")
      const existing = await eventsColl.findOne({ _id: eventId }, { session })
      if (existing) {
        if (existing.run_id !== event.run_id || existing.conversation_id !== event.conversation_id) {
          throw new Error("Event id is already assigned to another run")
        }
        return {
          event_id: existing.event_id || existing._id,
          run_id: existing.run_id,
          conversation_id: existing.conversation_id,
          seq: existing.seq,
          type: existing.type,
          ts: existing.ts,
          payload: existing.payload,
        }
      }

      const runsColl = targetDb.collection<RunDoc>("cowork_runs");
      const runFilter: Filter<RunDoc> = {
        $or: [{ id: event.run_id }, { _id: event.run_id }],
      };

      const updatedRun = await runsColl.findOneAndUpdate(
        runFilter,
        { $inc: { seq_counter: 1 }, $set: { updated_at: now } },
        { returnDocument: "after", session },
      );
      if (!updatedRun) throw new Error(`Cannot append event: run '${event.run_id}' does not exist`)

      const envelope: CoworkEventEnvelope = {
        event_id: eventId,
        run_id: event.run_id,
        conversation_id: event.conversation_id,
        seq: updatedRun.seq_counter,
        type: event.type,
        ts: now,
        payload: event.payload as any,
      };
      await eventsColl.insertOne(
        { _id: eventId, ...envelope },
        { session },
      )
      return envelope
    }

    if (!this.dbPromise) {
      return withDatabaseTransaction(appendInTransaction)
    }

    // Preserve injected database support while retaining the same atomic contract.
    const session = db.client.startSession()
    try {
      let result: CoworkEventEnvelope | undefined
      await session.withTransaction(async () => {
        result = await appendInTransaction(db, session)
      }, {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        maxCommitTimeMS: 5000,
      })
      if (!result) throw new Error("Event transaction completed without a result")
      return result
    } finally {
      await session.endSession()
    }
  }

  async getEvents(
    run_id: string,
    after_seq: number = 0
  ): Promise<CoworkEventEnvelope[]> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const coll = db.collection<EventDoc>("cowork_events");
    const docs = await coll
      .find({
        run_id,
        seq: { $gt: after_seq || 0 },
      })
      .sort({ seq: 1 })
      .toArray();

    return docs.map((doc: EventDoc) => ({
      event_id: doc.event_id || doc._id,
      run_id: doc.run_id,
      conversation_id: doc.conversation_id,
      seq: doc.seq,
      type: doc.type,
      ts: doc.ts,
      payload: doc.payload,
    }));
  }

  // ==========================================================================
  // Approvals & Cryptographic Verification
  // ==========================================================================

  async createApproval(
    approval:
      | CoworkApprovalRequest
      | (Omit<CoworkApprovalRequest, "id" | "status" | "expires_at"> & {
          id?: string;
          status?: CoworkApprovalRequest["status"];
          expires_at?: string;
        })
  ): Promise<CoworkApprovalRequest> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const id = approval.id || `appr_${randomUUID()}`;
    const now = approval.created_at || approval.requested_at || new Date().toISOString();
    // Default expiry 5 minutes into the future
    const defaultExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const expiresAt = approval.expires_at || approval.expiry_ts || defaultExpiry;

    const record: ApprovalDoc = {
      _id: id,
      id,
      approval_id: id,
      run_id: approval.run_id,
      conversation_id: approval.conversation_id,
      tool_call_id: approval.tool_call_id,
      tool_name: approval.tool_name,
      args: approval.args || {},
      args_redacted: approval.args_redacted || {},
      action_digest: approval.action_digest,
      workspace_id: approval.workspace_id || "cowork-default",
      risk: approval.risk,
      summary: approval.summary,
      status: approval.status || "pending",
      requested_at: now,
      created_at: now,
      expires_at: expiresAt,
      expiry_ts: expiresAt,
    };

    await db.collection<ApprovalDoc>("cowork_approvals").insertOne(record);

    return {
      id: record.id,
      approval_id: record.approval_id,
      run_id: record.run_id,
      conversation_id: record.conversation_id,
      tool_call_id: record.tool_call_id,
      tool_name: record.tool_name,
      args: record.args,
      args_redacted: record.args_redacted,
      action_digest: record.action_digest,
      workspace_id: record.workspace_id,
      risk: record.risk,
      summary: record.summary,
      status: record.status,
      requested_at: record.requested_at,
      created_at: record.created_at,
      expires_at: record.expires_at,
      expiry_ts: record.expiry_ts,
    };
  }

  async getApproval(approval_id: string): Promise<CoworkApprovalRequest | null> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const filter: Filter<ApprovalDoc> = {
      $or: [{ id: approval_id }, { approval_id: approval_id }, { _id: approval_id }],
    };
    const doc = await db.collection<ApprovalDoc>("cowork_approvals").findOne(filter);

    if (!doc) return null;
    return this.mapApprovalDoc(doc);
  }

  async resolveApproval(
    approval_id: string,
    decision: "allow_once" | "deny",
    action_digest: string,
    actor_id: string = "system"
  ): Promise<boolean> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const coll = db.collection<ApprovalDoc>("cowork_approvals");
    const filter: Filter<ApprovalDoc> = {
      $or: [{ id: approval_id }, { approval_id: approval_id }, { _id: approval_id }],
    };
    const approvalDoc = await coll.findOne(filter);

    if (!approvalDoc) {
      throw new Error(`APPROVAL_NOT_FOUND: Approval not found: ${approval_id}`);
    }

    const approval = this.mapApprovalDoc(approvalDoc);

    // 1. Status Check: Must be currently pending
    if (approval.status !== "pending") {
      throw new Error(
        `APPROVAL_ALREADY_USED: Approval ${approval_id} has status '${approval.status}'`
      );
    }

    // 2. Expiry Check
    const expiryTime = new Date(approval.expires_at).getTime();
    if (Date.now() > expiryTime) {
      const expiryFilter: Filter<ApprovalDoc> = {
        $and: [
          { $or: [{ id: approval_id }, { approval_id: approval_id }, { _id: approval_id }] },
          { status: "pending" },
        ],
      };
      await coll.updateOne(
        expiryFilter,
        { $set: { status: "expired", decided_at: new Date().toISOString() } }
      );
      await this.recordAudit({
        actor_id,
        run_id: approval.run_id,
        conversation_id: approval.conversation_id,
        action: "approval.expire",
        resource: approval.tool_name,
        result: "denied",
        details: { approval_id, reason: "expired", expiry: approval.expires_at },
      });
      throw new Error(`APPROVAL_EXPIRED: Approval ${approval_id} expired at ${approval.expires_at}`);
    }

    // 3. Digest Check: Constant-time comparison
    let digestsMatch = false;
    try {
      const expectedBuf = Buffer.from(approval.action_digest, "hex");
      const submittedBuf = Buffer.from(action_digest, "hex");
      if (
        expectedBuf.length === 32 &&
        submittedBuf.length === 32 &&
        timingSafeEqual(expectedBuf, submittedBuf)
      ) {
        digestsMatch = true;
      }
    } catch {
      digestsMatch = false;
    }

    if (!digestsMatch) {
      await this.recordAudit({
        actor_id,
        run_id: approval.run_id,
        conversation_id: approval.conversation_id,
        action: "approval.tamper_detected",
        resource: approval.tool_name,
        result: "denied",
        details: {
          approval_id,
          expected_digest: approval.action_digest,
          submitted_digest: action_digest,
        },
      });
      throw new Error(
        `DIGEST_MISMATCH: Action digest does not match original approval request`
      );
    }

    // 4. Update status atomically and record audit
    const now = new Date().toISOString();
    const newStatus = decision === "allow_once" ? "allowed" : "denied";

    const updateFilter: Filter<ApprovalDoc> = {
      $and: [
        { $or: [{ id: approval_id }, { approval_id: approval_id }, { _id: approval_id }] },
        { status: "pending" },
      ],
    };

    const updateResult = await coll.updateOne(
      updateFilter,
      {
        $set: {
          status: newStatus,
          decision,
          decided_at: now,
          decided_by: actor_id,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      const currentDoc = await coll.findOne(filter);
      if (!currentDoc) {
        throw new Error(`APPROVAL_NOT_FOUND: Approval not found: ${approval_id}`);
      }
      const current = this.mapApprovalDoc(currentDoc);
      if (current.status === "allowed" || current.status === "denied") {
        throw new Error(
          `APPROVAL_ALREADY_USED: Approval ${approval_id} has already been resolved with status '${current.status}'`
        );
      }
      if (current.status === "expired") {
        throw new Error(
          `APPROVAL_EXPIRED: Approval ${approval_id} has expired`
        );
      }
      throw new Error(
        `APPROVAL_ALREADY_USED: Approval ${approval_id} has status '${current.status}'`
      );
    }

    await this.recordAudit({
      actor_id,
      run_id: approval.run_id,
      conversation_id: approval.conversation_id,
      action: decision === "allow_once" ? "approval.grant" : "approval.deny",
      resource: approval.tool_name,
      result: decision === "allow_once" ? "success" : "denied",
      details: {
        approval_id,
        decision,
        action_digest,
      },
    });

    return true;
  }

  private mapApprovalDoc(doc: ApprovalDoc): CoworkApprovalRequest {
    return {
      id: doc.id || doc._id,
      approval_id: doc.approval_id || doc.id || doc._id,
      run_id: doc.run_id,
      conversation_id: doc.conversation_id,
      tool_call_id: doc.tool_call_id,
      tool_name: doc.tool_name,
      args: doc.args || {},
      args_redacted: doc.args_redacted || {},
      action_digest: doc.action_digest,
      workspace_id: doc.workspace_id,
      risk: doc.risk,
      summary: doc.summary,
      status: doc.status,
      requested_at: doc.requested_at,
      created_at: doc.created_at,
      expires_at: doc.expires_at,
      expiry_ts: doc.expiry_ts,
      decided_at: doc.decided_at,
      decided_by: doc.decided_by,
      decision: doc.decision,
    };
  }

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  async recordAudit(
    record:
      | CoworkAuditRecord
      | (Omit<CoworkAuditRecord, "id" | "timestamp"> & {
          id?: string;
          timestamp?: string;
        })
  ): Promise<CoworkAuditRecord> {
    return this.auditLogger.recordAudit(record);
  }

  async queryAudit(filter: {
    run_id?: string;
    actor_id?: string;
    action?: string;
    limit?: number;
  }): Promise<CoworkAuditRecord[]> {
    return this.auditLogger.queryAudit(filter);
  }
}
