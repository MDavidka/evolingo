import { test, after } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { CoworkAuditLogger } from "../../app/lib/cowork-vm/storage/audit-logger.ts";
import { getDatabase } from "../../lib/mongodb.ts";

after(async () => {
  if (globalThis.evolingoMongo?.client) {
    await globalThis.evolingoMongo.client.close();
  }
});

test("CoworkAuditLogger records audit entries immutably with auto-generated id and timestamp", async () => {
  const logger = new CoworkAuditLogger();
  const testRunId = `test_run_${randomUUID()}`;

  const entry = await logger.recordAudit({
    actor_id: "user_test_01",
    run_id: testRunId,
    action: "approval.grant",
    resource: "bash",
    result: "success",
    details: { command: "npm test", permission: "execute" },
  });

  assert.ok(entry.id.startsWith("aud_"));
  assert.equal(entry.actor_id, "user_test_01");
  assert.equal(entry.run_id, testRunId);
  assert.equal(entry.action, "approval.grant");
  assert.equal(entry.result, "success");
  assert.ok(!Number.isNaN(Date.parse(entry.timestamp)));

  // Query back to verify persistence
  const queried = await logger.queryAudit({ run_id: testRunId });
  assert.equal(queried.length, 1);
  assert.equal(queried[0].id, entry.id);
  assert.equal(queried[0].resource, "bash");
  assert.deepEqual(queried[0].details, { command: "npm test", permission: "execute" });

  // Cleanup test documents
  const db = await getDatabase();
  await db.collection("cowork_audit").deleteMany({ run_id: testRunId });
});

test("CoworkAuditLogger queryAudit filters by actor_id and sorts newest first", async () => {
  const logger = new CoworkAuditLogger();
  const testActor = `actor_${randomUUID()}`;
  const testRunId = `test_run_${randomUUID()}`;

  // Insert two sequential entries with distinct timestamps
  const first = await logger.recordAudit({
    actor_id: testActor,
    run_id: testRunId,
    action: "step.start",
    resource: "workspace",
    result: "success",
    timestamp: "2026-11-12T10:00:00.000Z",
  });

  const second = await logger.recordAudit({
    actor_id: testActor,
    run_id: testRunId,
    action: "step.end",
    resource: "workspace",
    result: "success",
    timestamp: "2026-11-12T10:05:00.000Z",
  });

  const results = await logger.queryAudit({ actor_id: testActor });
  assert.equal(results.length, 2);
  // Timestamp descending: second should come first
  assert.equal(results[0].action, "step.end");
  assert.equal(results[1].action, "step.start");

  // Cleanup
  const db = await getDatabase();
  await db.collection("cowork_audit").deleteMany({ actor_id: testActor });
});

test("CoworkAuditLogger enforces append-only immutability contract", () => {
  const logger = new CoworkAuditLogger();
  // Ensure no delete, update, or drop methods are exposed on the logger class
  assert.equal(typeof logger.deleteAudit, "undefined");
  assert.equal(typeof logger.updateAudit, "undefined");
  assert.equal(typeof logger.dropAudit, "undefined");
});
