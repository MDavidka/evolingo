import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  CANONICAL_SSE_EVENTS,
  COWORK_RUN_STATUSES,
  RISK_LEVELS,
  PERMISSION_TIERS,
} from "../../app/lib/cowork-vm/types.ts";

test("CANONICAL_SSE_EVENTS defines exactly the 18 protocol event types", () => {
  assert.equal(CANONICAL_SSE_EVENTS.length, 18);

  const expectedEvents = [
    "run.queued",
    "run.started",
    "run.status",
    "message.started",
    "message.delta",
    "message.completed",
    "plan.updated",
    "tool.started",
    "tool.output",
    "tool.completed",
    "tool.failed",
    "file.changed",
    "approval.required",
    "approval.resolved",
    "run.completed",
    "run.failed",
    "run.cancelled",
    "heartbeat",
  ];

  for (const eventName of expectedEvents) {
    assert.ok(
      CANONICAL_SSE_EVENTS.includes(eventName),
      `Missing canonical event type: ${eventName}`
    );
  }
});

test("COWORK_RUN_STATUSES covers all 8 canonical lifecycle states plus queued", () => {
  const expectedStatuses = [
    "planning",
    "running",
    "waiting_approval",
    "verifying",
    "completed",
    "failed",
    "cancelled",
    "interrupted",
  ];

  for (const status of expectedStatuses) {
    assert.ok(
      COWORK_RUN_STATUSES.includes(status),
      `Missing run status: ${status}`
    );
  }
});

test("RISK_LEVELS covers the 4 permission gate levels", () => {
  assert.deepEqual([...RISK_LEVELS], ["low", "medium", "high", "critical"]);
});

test("PERMISSION_TIERS covers the 5 sandbox isolation tiers", () => {
  assert.deepEqual(
    [...PERMISSION_TIERS],
    ["read", "write", "execute", "network", "privileged"]
  );
});

test("CoworkEventEnvelope enforces required envelope structure", () => {
  const envelope = {
    event_id: "evt_12345",
    run_id: "run_67890",
    conversation_id: "conv_abcde",
    seq: 1,
    type: "tool.started",
    ts: new Date().toISOString(),
    payload: {
      tool_call_id: "tc_01",
      name: "bash",
      safe_label: "List directory",
      args_redacted: { command: "ls -la" },
    },
  };

  assert.ok(envelope.event_id.startsWith("evt_"));
  assert.ok(envelope.run_id.startsWith("run_"));
  assert.ok(envelope.conversation_id.startsWith("conv_"));
  assert.equal(typeof envelope.seq, "number");
  assert.ok(Number.isInteger(envelope.seq) && envelope.seq >= 1);
  assert.ok(CANONICAL_SSE_EVENTS.includes(envelope.type));
  assert.ok(!Number.isNaN(Date.parse(envelope.ts)));
  assert.ok(envelope.payload && typeof envelope.payload === "object");
});

test("Message parts schema accommodates all 7 ordered part types", () => {
  const parts = [
    { type: "text", text: "I will now list the workspace files." },
    { type: "reasoning_summary", summary: "Need to verify current directory structure" },
    {
      type: "tool_call",
      tool_call_id: "tc_1",
      name: "bash",
      args: { command: "ls -la" },
      safe_label: "List directory",
    },
    {
      type: "tool_result",
      tool_call_id: "tc_1",
      output: "total 0\n-rw-r--r-- 1 root root 0 test.txt",
      exit_code: 0,
      duration_ms: 12,
    },
    {
      type: "artifact",
      artifact_id: "art_1",
      title: "Generated Test Script",
      path: "test.py",
      content: "print('hello')",
    },
    {
      type: "approval",
      approval_id: "appr_1",
      action_digest: "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
      risk: "high",
      status: "pending",
    },
    {
      type: "error",
      error_code: "EXEC_TIMEOUT",
      message: "Command exceeded 30000ms limit",
    },
  ];

  for (const part of parts) {
    assert.ok(part.type, "Part must have a type");
    if (part.type === "text") assert.equal(typeof part.text, "string");
    if (part.type === "reasoning_summary") assert.equal(typeof part.summary, "string");
    if (part.type === "tool_call") assert.equal(typeof part.tool_call_id, "string");
    if (part.type === "tool_result") assert.equal(typeof part.output, "string");
    if (part.type === "artifact") assert.equal(typeof part.artifact_id, "string");
    if (part.type === "approval") assert.equal(typeof part.action_digest, "string");
    if (part.type === "error") assert.equal(typeof part.error_code, "string");
  }
});
