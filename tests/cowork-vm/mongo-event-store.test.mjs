import { test, after } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { MongoEventStore } from "../../app/lib/cowork-vm/storage/mongo-event-store.ts";
import { computeActionDigest } from "../../app/lib/cowork-vm/security/action-digest.ts";
import { getDatabase } from "../../lib/mongodb.ts";

const createdRunIds = new Set();
const createdConvIds = new Set();
const createdApprovalIds = new Set();

after(async () => {
  try {
    const db = await getDatabase();
    if (createdRunIds.size > 0) {
      const runArray = Array.from(createdRunIds);
      await db.collection("cowork_runs").deleteMany({ id: { $in: runArray } });
      await db.collection("cowork_events").deleteMany({ run_id: { $in: runArray } });
      await db.collection("cowork_audit").deleteMany({ run_id: { $in: runArray } });
    }
    if (createdConvIds.size > 0) {
      await db.collection("cowork_conversations").deleteMany({ id: { $in: Array.from(createdConvIds) } });
    }
    if (createdApprovalIds.size > 0) {
      await db.collection("cowork_approvals").deleteMany({ id: { $in: Array.from(createdApprovalIds) } });
    }
  } catch (err) {
    console.error("Cleanup error in mongo-event-store.test.mjs:", err);
  } finally {
    if (globalThis.evolingoMongo?.client) {
      await globalThis.evolingoMongo.client.close();
    }
  }
});

test("MongoEventStore creates and retrieves conversation thread", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Test Agent Thread", "ws-sandbox-01", "user_alice");

  createdConvIds.add(conv.id);
  assert.ok(conv.id.startsWith("conv_"));
  assert.equal(conv.title, "Test Agent Thread");
  assert.equal(conv.workspace_id, "ws-sandbox-01");

  const fetched = await store.getConversation(conv.id);
  assert.ok(fetched);
  assert.equal(fetched.id, conv.id);
  assert.equal(fetched.title, "Test Agent Thread");
});

test("MongoEventStore createRun supports idempotency key deduplication (Acceptance A09)", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Idempotency Conv");
  createdConvIds.add(conv.id);

  const idempotencyKey = `idem_${randomUUID()}`;

  // First run creation
  const run1 = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Refactor database queries",
    idempotency_key: idempotencyKey,
  });
  createdRunIds.add(run1.id);

  assert.ok(run1.id.startsWith("run_"));
  assert.equal(run1.status, "planning");
  assert.equal(run1.idempotency_key, idempotencyKey);
  assert.equal(run1.seq_counter, 0);

  // Duplicate request with the exact same idempotency key
  const run2 = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Refactor database queries - retry duplicate",
    idempotency_key: idempotencyKey,
  });

  // Must return identical run document, not create a new one
  assert.equal(run2.id, run1.id);
  assert.equal(run2.created_at, run1.created_at);
  assert.equal(run2.prompt, run1.prompt);
});

test("MongoEventStore appendEvent allocates atomic monotonic sequence numbers starting at 1", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Seq Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Test sequencing",
  });
  createdRunIds.add(run.id);

  // Append first event
  const evt1 = await store.appendEvent({
    run_id: run.id,
    conversation_id: conv.id,
    type: "run.started",
    payload: { engine_version: "1.0.0", mode: "build" },
  });
  assert.equal(evt1.seq, 1);
  assert.ok(evt1.event_id.startsWith("evt_"));

  // Append second event
  const evt2 = await store.appendEvent({
    run_id: run.id,
    conversation_id: conv.id,
    type: "plan.updated",
    payload: { revision: 1, steps: [{ id: "s1", title: "Plan", status: "completed" }] },
  });
  assert.equal(evt2.seq, 2);

  // Append third event
  const evt3 = await store.appendEvent({
    run_id: run.id,
    conversation_id: conv.id,
    type: "run.completed",
    payload: { verification_summary: "All checks passed" },
  });
  assert.equal(evt3.seq, 3);

  // Verify run sequence counter updated
  const updatedRun = await store.getRun(run.id);
  assert.equal(updatedRun.seq_counter, 3);
});

test("MongoEventStore does not persist heartbeat events in cowork_events", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Heartbeat Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "plan",
    prompt: "Test heartbeat",
  });
  createdRunIds.add(run.id);

  // Append business event
  await store.appendEvent({
    run_id: run.id,
    conversation_id: conv.id,
    type: "run.started",
    payload: { engine_version: "1.0.0", mode: "plan" },
  });

  // Send heartbeat keepalive
  const hb = await store.appendEvent({
    run_id: run.id,
    conversation_id: conv.id,
    type: "heartbeat",
    payload: { server_time: new Date().toISOString() },
  });
  assert.equal(hb.type, "heartbeat");

  // Only business event should be in database log
  const eventsInDb = await store.getEvents(run.id);
  assert.equal(eventsInDb.length, 1);
  assert.equal(eventsInDb[0].type, "run.started");
});

test("MongoEventStore concurrent appendEvent calls produce strictly unique contiguous sequences", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Concurrency Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Concurrent appends test",
  });
  createdRunIds.add(run.id);

  // Fire 5 concurrent appends simultaneously
  const results = await Promise.all([
    store.appendEvent({
      run_id: run.id,
      conversation_id: conv.id,
      type: "tool.output",
      payload: { tool_call_id: "tc_1", chunk_seq: 1, stream: "stdout", text_delta: "Chunk A" },
    }),
    store.appendEvent({
      run_id: run.id,
      conversation_id: conv.id,
      type: "tool.output",
      payload: { tool_call_id: "tc_1", chunk_seq: 2, stream: "stdout", text_delta: "Chunk B" },
    }),
    store.appendEvent({
      run_id: run.id,
      conversation_id: conv.id,
      type: "tool.output",
      payload: { tool_call_id: "tc_1", chunk_seq: 3, stream: "stdout", text_delta: "Chunk C" },
    }),
    store.appendEvent({
      run_id: run.id,
      conversation_id: conv.id,
      type: "tool.output",
      payload: { tool_call_id: "tc_1", chunk_seq: 4, stream: "stdout", text_delta: "Chunk D" },
    }),
    store.appendEvent({
      run_id: run.id,
      conversation_id: conv.id,
      type: "tool.output",
      payload: { tool_call_id: "tc_1", chunk_seq: 5, stream: "stdout", text_delta: "Chunk E" },
    }),
  ]);

  const assignedSeqs = results.map((e) => e.seq).sort((a, b) => a - b);
  assert.deepEqual(assignedSeqs, [1, 2, 3, 4, 5]);

  // Verify unique compound index prevented any duplicates
  const allInDb = await store.getEvents(run.id);
  assert.equal(allInDb.length, 5);
  const dbSeqs = allInDb.map((e) => e.seq);
  assert.deepEqual(dbSeqs, [1, 2, 3, 4, 5]);
});

test("MongoEventStore getEvents supports SSE Replay with after_seq cursor (Acceptance A05)", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Replay Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Replay test",
  });
  createdRunIds.add(run.id);

  for (let i = 1; i <= 6; i++) {
    await store.appendEvent({
      run_id: run.id,
      conversation_id: conv.id,
      type: "message.delta",
      payload: { message_id: "msg_1", part_id: "p_1", delta_seq: i, text_delta: `token_${i} ` },
    });
  }

  // Fetch all events from beginning (after_seq = 0)
  const allEvents = await store.getEvents(run.id, 0);
  assert.equal(allEvents.length, 6);
  assert.equal(allEvents[0].seq, 1);
  assert.equal(allEvents[5].seq, 6);

  // Resume after seq = 3 (e.g. client reconnected with Last-Event-ID: 3)
  const resumedEvents = await store.getEvents(run.id, 3);
  assert.equal(resumedEvents.length, 3);
  assert.equal(resumedEvents[0].seq, 4);
  assert.equal(resumedEvents[1].seq, 5);
  assert.equal(resumedEvents[2].seq, 6);

  // Replay beyond current last_seq returns empty array
  const emptyReplay = await store.getEvents(run.id, 100);
  assert.equal(emptyReplay.length, 0);
});

test("MongoEventStore updateRunStatus updates state and completion timestamp", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Status Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "plan",
    prompt: "Status test",
  });
  createdRunIds.add(run.id);

  await store.updateRunStatus(run.id, "running");
  const running = await store.getRun(run.id);
  assert.equal(running.status, "running");
  assert.equal(running.completed_at, undefined);

  await store.updateRunStatus(run.id, "completed");
  const completed = await store.getRun(run.id);
  assert.equal(completed.status, "completed");
  assert.ok(completed.completed_at);
});

test("MongoEventStore approval resolution enforces cryptographic digest, single-use and audit (Acceptance A13, A14)", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Approval Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Destructive operation test",
  });
  createdRunIds.add(run.id);

  const toolName = "bash";
  const toolArgs = { command: "rm -rf /tmp/scratch_dir" };
  const workspaceId = "cowork-default";
  const actionDigest = computeActionDigest(toolName, toolArgs, workspaceId);

  // 1. Create Approval Request
  const approval = await store.createApproval({
    run_id: run.id,
    conversation_id: conv.id,
    tool_call_id: "tc_destructive_01",
    tool_name: toolName,
    args: toolArgs,
    action_digest: actionDigest,
    workspace_id: workspaceId,
    risk: "high",
    summary: "Delete scratch directory",
  });
  createdApprovalIds.add(approval.id);

  assert.ok(approval.id.startsWith("appr_"));
  assert.equal(approval.status, "pending");

  // 2. Reject mismatched digest (tamper attempt)
  const tamperedDigest = actionDigest.slice(0, -1) + (actionDigest.endsWith("0") ? "1" : "0");
  await assert.rejects(
    async () => {
      await store.resolveApproval(approval.id, "allow_once", tamperedDigest, "user_admin");
    },
    /DIGEST_MISMATCH/
  );

  // Status must remain pending after tamper attempt
  const afterTamper = await store.getApproval(approval.id);
  assert.equal(afterTamper.status, "pending");

  // 3. Resolve successfully with valid digest
  const resolved = await store.resolveApproval(approval.id, "allow_once", actionDigest, "user_admin");
  assert.equal(resolved, true);

  const afterResolution = await store.getApproval(approval.id);
  assert.equal(afterResolution.status, "allowed");
  assert.equal(afterResolution.decision, "allow_once");
  assert.equal(afterResolution.decided_by, "user_admin");

  // 4. Reject second resolution (Single-use enforcement)
  await assert.rejects(
    async () => {
      await store.resolveApproval(approval.id, "allow_once", actionDigest, "user_admin");
    },
    /APPROVAL_ALREADY_USED/
  );

  // 5. Verify audit records were created
  const auditLogs = await store.queryAudit({ run_id: run.id });
  assert.ok(auditLogs.length >= 2); // Tamper attempt + grant decision
  const grantLog = auditLogs.find((l) => l.action === "approval.grant");
  assert.ok(grantLog);
  assert.equal(grantLog.result, "success");
  assert.equal(grantLog.actor_id, "user_admin");

  const tamperLog = auditLogs.find((l) => l.action === "approval.tamper_detected");
  assert.ok(tamperLog);
  assert.equal(tamperLog.result, "denied");
});

test("MongoEventStore resolveApproval rejects expired approvals (Acceptance A14)", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Expiry Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Expiry test",
  });
  createdRunIds.add(run.id);

  const actionDigest = computeActionDigest("bash", { command: "drop table users" }, "ws-default");

  // Create an already-expired approval (expired 1 minute ago)
  const expiredApproval = await store.createApproval({
    run_id: run.id,
    conversation_id: conv.id,
    tool_call_id: "tc_expired_01",
    tool_name: "bash",
    args: { command: "drop table users" },
    action_digest: actionDigest,
    workspace_id: "ws-default",
    risk: "critical",
    summary: "Drop users table",
    expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
  });
  createdApprovalIds.add(expiredApproval.id);

  await assert.rejects(
    async () => {
      await store.resolveApproval(expiredApproval.id, "allow_once", actionDigest, "user_admin");
    },
    /APPROVAL_EXPIRED/
  );

  const afterExpired = await store.getApproval(expiredApproval.id);
  assert.equal(afterExpired.status, "expired");
});

test("MongoEventStore resolveApproval atomic CAS prevents TOCTOU concurrent resolution races", async () => {
  const store = new MongoEventStore();
  const conv = await store.createConversation("Race Conv");
  createdConvIds.add(conv.id);

  const run = await store.createRun({
    conversation_id: conv.id,
    mode: "build",
    prompt: "Concurrent approval race test",
  });
  createdRunIds.add(run.id);

  const toolName = "bash";
  const toolArgs = { command: "systemctl restart nginx" };
  const workspaceId = "cowork-default";
  const actionDigest = computeActionDigest(toolName, toolArgs, workspaceId);

  const approval = await store.createApproval({
    run_id: run.id,
    conversation_id: conv.id,
    tool_call_id: "tc_race_01",
    tool_name: toolName,
    args: toolArgs,
    action_digest: actionDigest,
    workspace_id: workspaceId,
    risk: "high",
    summary: "Restart web server",
  });
  createdApprovalIds.add(approval.id);

  assert.equal(approval.status, "pending");

  // Fire two simultaneous resolution calls racing against each other
  const results = await Promise.allSettled([
    store.resolveApproval(approval.id, "allow_once", actionDigest, "caller_allow"),
    store.resolveApproval(approval.id, "deny", actionDigest, "caller_deny"),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  // Exactly one must win the race and fulfill
  assert.equal(fulfilled.length, 1, "Exactly one concurrent resolution must fulfill");
  assert.equal(fulfilled[0].value, true);

  // Exactly one must lose the race and be rejected with APPROVAL_ALREADY_USED
  assert.equal(rejected.length, 1, "Exactly one concurrent resolution must reject");
  assert.match(rejected[0].reason.message, /APPROVAL_ALREADY_USED/);

  // Database document must reflect the winner's decision and not be pending
  const finalDoc = await store.getApproval(approval.id);
  assert.ok(finalDoc.status === "allowed" || finalDoc.status === "denied");
  assert.notEqual(finalDoc.status, "pending");
});
