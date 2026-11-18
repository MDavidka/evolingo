import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { MongoEventStore } from "../../app/lib/cowork-vm/storage/mongo-event-store.ts";
import { closeDatabase, getDatabase } from "../../lib/mongodb.ts";

nextEnv.loadEnvConfig(process.cwd());

const baseUrl = process.env.COWORK_TEST_BASE_URL;

function readSSEEvents(body) {
  return body.trim().split("\n\n").filter(Boolean).map(block => {
    const id = Number(block.match(/^id: (\d+)$/m)?.[1]);
    const type = block.match(/^event: ([^\n]+)$/m)?.[1];
    const data = JSON.parse(block.match(/^data: (.+)$/m)?.[1] || "null");
    return { id, type, eventId: data.event_id };
  });
}

test("live SSE clients receive the same sequence and Last-Event-ID resumes it", { skip: !baseUrl }, async () => {
  const origin = new URL(baseUrl).origin;
  const db = await getDatabase();
  let sessionId;
  let conversationId;
  let runId;
  try {
    const bootstrap = await fetch(new URL("/api/state", baseUrl));
    assert.equal(bootstrap.status, 200);
    const cookie = bootstrap.headers.get("set-cookie")?.match(/evolingo_session=([^;,]+)/)?.[1];
    assert.ok(cookie, "guest bootstrap must issue an HTTP-only session cookie");
    sessionId = cookie;

    const created = await fetch(new URL("/api/cowork/conversations", baseUrl), {
      method: "POST",
      headers: { Cookie: `evolingo_session=${sessionId}`, Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Live SSE acceptance" }),
    });
    assert.equal(created.status, 201);
    conversationId = (await created.json()).conversation.id;
    const ownerId = createHash("sha256").update(`cowork-owner:${sessionId}`).digest("hex");
    const store = new MongoEventStore(db);
    const run = await store.createRun({
      conversation_id: conversationId,
      workspace_id: ownerId,
      mode: "build",
      prompt: "SSE acceptance fixture; do not execute",
    });
    runId = run.id;

    await store.appendEvent({
      event_id: `evt_${run.id}_started`, run_id: run.id, conversation_id: conversationId,
      type: "run.started", payload: { test: true },
    });
    await store.appendEvent({
      event_id: `evt_${run.id}_delta`, run_id: run.id, conversation_id: conversationId,
      type: "message.delta", payload: { delta: "ordered" },
    });
    await store.appendEvent({
      event_id: `evt_${run.id}_completed`, run_id: run.id, conversation_id: conversationId,
      type: "run.completed", payload: { test: true },
    });
    await store.updateRunStatus(run.id, "completed");

    const streamURL = new URL(`/api/cowork/runs/${encodeURIComponent(run.id)}/events`, baseUrl);
    const read = async headers => {
      const response = await fetch(streamURL, { headers: { Cookie: `evolingo_session=${sessionId}`, ...headers } });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") || "", /text\/event-stream/);
      return readSSEEvents(await response.text());
    };
    const [clientA, clientB] = await Promise.all([read({}), read({})]);
    assert.deepEqual(clientA, clientB);
    assert.deepEqual(clientA.map(event => [event.id, event.type]), [
      [1, "run.started"], [2, "message.delta"], [3, "run.completed"],
    ]);

    const resumed = await read({ "Last-Event-ID": "1" });
    assert.deepEqual(resumed, clientA.slice(1));
  } finally {
    if (runId) {
      await db.collection("cowork_events").deleteMany({ run_id: runId });
      await db.collection("cowork_audit").deleteMany({ run_id: runId });
      await db.collection("cowork_runs").deleteOne({ id: runId });
    }
    if (conversationId) {
      await db.collection("cowork_messages").deleteMany({ conversation_id: conversationId });
      await db.collection("cowork_conversations").deleteOne({ id: conversationId });
    }
    if (sessionId) await db.collection("users").deleteOne({ _id: sessionId });
    await closeDatabase();
  }
});
