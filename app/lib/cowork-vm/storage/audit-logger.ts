/**
 * Immutable Audit Logger for Cowork VM Actions & Security Decisions
 * Milestone 1 (M1: Durable Event Store & Cryptographic State)
 *
 * Implements:
 * - Immutable append-only audit trail in collection `cowork_audit`
 * - Automatic UUID generation and ISO 8601 timestamps
 * - Querying by run_id, actor_id, action with timestamp sorting
 * - Lazy idempotent index creation
 */

import { randomUUID } from "node:crypto";
import type { Db, Collection, Filter } from "mongodb";
import { getDatabase } from "../../../../lib/mongodb.ts";
import type { CoworkAuditRecord } from "../types.ts";

const auditIndexesCache = new WeakMap<Db, Promise<void>>();

export interface AuditQueryFilter {
  run_id?: string;
  actor_id?: string;
  action?: string;
  resource?: string;
  result?: CoworkAuditRecord["result"];
  limit?: number;
}

export class CoworkAuditLogger {
  private dbPromise?: Promise<Db> | Db;

  constructor(db?: Db | Promise<Db>) {
    this.dbPromise = db;
  }

  private async getDb(): Promise<Db> {
    if (this.dbPromise) {
      return this.dbPromise;
    }
    return getDatabase();
  }

  /**
   * Ensures the necessary indexes are created idempotently on `cowork_audit`.
   */
  async ensureIndexes(db?: Db): Promise<void> {
    const targetDb = db || (await this.getDb());
    if (!auditIndexesCache.has(targetDb)) {
      const p = (async () => {
        const coll = targetDb.collection<CoworkAuditRecord>("cowork_audit");
        await coll.createIndex({ timestamp: -1 });
        await coll.createIndex({ run_id: 1, timestamp: -1 });
        await coll.createIndex({ actor_id: 1, timestamp: -1 });
        await coll.createIndex({ action: 1 });
      })().catch((err) => {
        auditIndexesCache.delete(targetDb);
        throw err;
      });
      auditIndexesCache.set(targetDb, p);
    }
    return auditIndexesCache.get(targetDb);
  }

  /**
   * Records an immutable audit log entry.
   * Updates or deletions on `cowork_audit` are strictly prohibited.
   */
  async recordAudit(
    record:
      | CoworkAuditRecord
      | (Omit<CoworkAuditRecord, "id" | "timestamp"> & {
          id?: string;
          timestamp?: string;
        })
  ): Promise<CoworkAuditRecord> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const fullRecord: CoworkAuditRecord = {
      id: record.id || `aud_${randomUUID()}`,
      actor_id: record.actor_id,
      run_id: record.run_id,
      conversation_id: record.conversation_id,
      action: record.action,
      resource: record.resource,
      result: record.result,
      details: record.details || {},
      timestamp: record.timestamp || new Date().toISOString(),
    };

    const coll = db.collection<CoworkAuditRecord>("cowork_audit");
    await coll.insertOne(fullRecord as any);

    return fullRecord;
  }

  /**
   * Queries audit records with optional filters, sorted newest to oldest.
   */
  async queryAudit(filter: AuditQueryFilter = {}): Promise<CoworkAuditRecord[]> {
    const db = await this.getDb();
    await this.ensureIndexes(db);

    const mongoFilter: Filter<CoworkAuditRecord> = {};

    if (filter.run_id) {
      mongoFilter.run_id = filter.run_id;
    }
    if (filter.actor_id) {
      mongoFilter.actor_id = filter.actor_id;
    }
    if (filter.action) {
      mongoFilter.action = filter.action;
    }
    if (filter.resource) {
      mongoFilter.resource = filter.resource;
    }
    if (filter.result) {
      mongoFilter.result = filter.result;
    }

    const coll = db.collection<CoworkAuditRecord>("cowork_audit");
    const limit = Math.max(1, Math.min(filter.limit ?? 100, 1000));

    const records = await coll
      .find(mongoFilter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    // Map away MongoDB internal _id field if present
    return records.map((r: any) => ({
      id: r.id,
      actor_id: r.actor_id,
      run_id: r.run_id,
      conversation_id: r.conversation_id,
      action: r.action,
      resource: r.resource,
      result: r.result,
      details: r.details,
      timestamp: r.timestamp,
    }));
  }

  /** Alias for queryAudit */
  async queryAuditLogs(filter: AuditQueryFilter = {}): Promise<CoworkAuditRecord[]> {
    return this.queryAudit(filter);
  }
}
