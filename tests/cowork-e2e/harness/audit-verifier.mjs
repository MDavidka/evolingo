/**
 * Audit Log Verifier for Avalingo / Evolingo Cowork Agentic Compatibility.
 * Queries the MongoDB collection `cowork_audit` to verify immutable audit logs.
 */

import { MongoClient } from "mongodb";

export async function queryAuditRecords(filter = {}) {
  // Automatically load local environment if MONGO_URI is missing
  try {
    if (!process.env.MONGO_URI && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(".env.local");
    }
  } catch {}

  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/evolingo";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });

  try {
    await client.connect();
    const dbName = process.env.MONGO_DB_NAME || "evolingo";
    const db = client.db(dbName);
    const coll = db.collection("cowork_audit");

    const query = {};
    if (filter.run_id) query.run_id = filter.run_id;
    if (filter.action) query.action = filter.action;
    if (filter.actor_id) query.actor_id = filter.actor_id;

    const limit = Math.max(1, Math.min(filter.limit || 50, 500));
    const records = await coll
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return records;
  } finally {
    await client.close();
  }
}

export default queryAuditRecords;
