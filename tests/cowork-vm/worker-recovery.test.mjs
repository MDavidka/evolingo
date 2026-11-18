import { test, after } from "node:test";
import { strict as assert } from "node:assert";
import nextEnv from "@next/env";
import { MongoEventStore } from "../../app/lib/cowork-vm/storage/mongo-event-store.ts";
import { interruptExpiredRuns } from "../../app/lib/cowork-vm/run-worker.ts";
import { closeDatabase, getDatabase } from "../../lib/mongodb.ts";

nextEnv.loadEnvConfig(process.cwd());

const conversationIds = [];
const runIds = [];

after(async () => {
  try {
    if (runIds.length) {
      const db = await getDatabase();
      await db.collection("cowork_events").deleteMany({ run_id: { $in: runIds } });
      await db.collection("cowork_audit").deleteMany({ run_id: { $in: runIds } });
      await db.collection("cowork_runs").deleteMany({ id: { $in: runIds } });
    }
    if (conversationIds.length) {
      const db = await getDatabase();
      await db.collection("cowork_conversations").deleteMany({ id: { $in: conversationIds } });
    }
  } finally {
    await closeDatabase();
  }
});

test("worker recovery interrupts expired approvals and orphaned planning runs, but leaves fresh planning alone", async () => {
  const db = await getDatabase();
  const store = new MongoEventStore(db);
  const conversation = await store.createConversation("Worker recovery test", "cowork-test", "owner-test");
  conversationIds.push(conversation.id);
  const run = await store.createRun({
    conversation_id: conversation.id,
    workspace_id: "a".repeat(64),
    mode: "build",
    prompt: "Recovery fixture; must not execute",
  });
  runIds.push(run.id);
  await db.collection("cowork_runs").updateOne(
    { id: run.id },
    { $set: { status: "waiting_approval", lease_expires_at: new Date(Date.now() - 60_000) } },
  );

  const orphaned = await store.createRun({
    conversation_id: conversation.id,
    workspace_id: "a".repeat(64),
    mode: "build",
    prompt: "Orphaned planning fixture; must not execute",
  });
  runIds.push(orphaned.id);
  await db.collection("cowork_runs").updateOne(
    { id: orphaned.id },
    { $set: { created_at: new Date(Date.now() - 60_000).toISOString() } },
  );

  const fresh = await store.createRun({
    conversation_id: conversation.id,
    workspace_id: "a".repeat(64),
    mode: "plan",
    prompt: "Fresh planning fixture; preserve",
  });
  runIds.push(fresh.id);

  await interruptExpiredRuns(db, store);
  await interruptExpiredRuns(db, store);

  const recovered = await store.getRun(run.id);
  assert.equal(recovered.status, "interrupted");
  assert.match(recovered.error, /was not replayed/);
  const events = await store.getEvents(run.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "run.status");
  assert.equal(events[0].payload.status, "interrupted");

  const abandoned = await store.getRun(orphaned.id);
  assert.equal(abandoned.status, "interrupted");
  assert.match(abandoned.error, /did not enter the worker queue/);
  const abandonedEvents = await store.getEvents(orphaned.id);
  assert.equal(abandonedEvents.length, 1);
  assert.equal(abandonedEvents[0].payload.status, "interrupted");

  const recent = await store.getRun(fresh.id);
  assert.equal(recent.status, "planning");
  assert.equal((await store.getEvents(fresh.id)).length, 0);
});
