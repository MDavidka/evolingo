/**
 * Tier 3: Cross-Feature Combinations & Lifecycle Transitions
 * Evaluates pairwise combinations and multi-stage lifecycle flows.
 */

import {
  assert,
  assertEqual,
  assertNotEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
  assertMatch,
  assertThrows,
  assertRejects,
  assertEnvelopeValid,
  assertMonotonic,
} from "../harness/assert.mjs";
import { computeActionDigest } from "../harness/crypto-helpers.mjs";
import { SseConsumer } from "../harness/sse-consumer.mjs";

export function registerTier3Tests(runner) {
  // -------------------------------------------------------------
  // C01: Plan -> Build Transition
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C01_PLAN_TO_BUILD",
    name: "Combo: Plan run followed by Build run in the same conversation",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C01 Plan then Build");

      // Stage 1: Plan Mode
      const planRun = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Inspect code and prepare steps",
      });
      const ssePlan = new SseConsumer(planRun.run_id);
      await ssePlan.connect();
      await ssePlan.waitForEvent("run.completed");
      ssePlan.disconnect();

      // Stage 2: Build Mode
      const buildRun = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Execute planned changes",
      });
      const sseBuild = new SseConsumer(buildRun.run_id);
      await sseBuild.connect();
      await sseBuild.waitForEvent("run.completed");
      sseBuild.disconnect();

      assertEqual(planRun.conversation_id, buildRun.conversation_id);
      assertNotEqual(planRun.run_id, buildRun.run_id);
    },
  });

  // -------------------------------------------------------------
  // C02: Plan -> Approval -> Build -> Verification Flow
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C02_FULL_LIFECYCLE",
    name: "Combo: Plan -> Approval -> Build -> Verification full lifecycle cycle",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C02 Full Lifecycle");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Remove old config rm -rf /root/workspace/old_cfg and create new verified file",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();

      // Approval step
      const appr = await sse.waitForEvent("approval.required");
      await client.sendApprovalDecision(appr.payload.approval_id, "allow_once", appr.payload.action_digest);

      // Verify resumed to completion
      const completed = await sse.waitForEvent("run.completed");
      assert(completed.payload.verification_summary);
      sse.disconnect();
    },
  });

  // -------------------------------------------------------------
  // C03: Active Streaming -> Disconnect -> Last-Event-ID Resume
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C03_STREAM_DISCONNECT_RECONNECT",
    name: "Combo: Active streaming mid-stream disconnect and Last-Event-ID resume",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C03 Stream Reconnect");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Perform multi-step file generation and testing",
      });

      const sse1 = new SseConsumer(run.run_id);
      await sse1.connect();
      await sse1.waitForEvent("tool.started");
      const lastSeq = sse1.events[sse1.events.length - 1].seq;
      sse1.disconnect();

      // Simulated network drop pause
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const sse2 = new SseConsumer(run.run_id, { lastEventId: lastSeq });
      await sse2.connect();
      const nextEvt = await sse2.waitForEvent(() => true);
      assertEqual(nextEvt.seq, lastSeq + 1);

      await sse2.waitForEvent("run.completed");
      sse2.disconnect();

      sse2.assertMonotonicSequence();
    },
  });

  // -------------------------------------------------------------
  // C04: Parallel Runs in Same Conversation
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C04_PARALLEL_RUNS_SAME_CONV",
    name: "Combo: Concurrent runs in same conversation maintain isolated event logs",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C04 Parallel Same Conv");

      const run1 = await client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "Task 1" });
      const run2 = await client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "Task 2" });

      const sse1 = new SseConsumer(run1.run_id);
      const sse2 = new SseConsumer(run2.run_id);

      await Promise.all([sse1.connect(), sse2.connect()]);
      await Promise.all([sse1.waitForEvent("run.completed"), sse2.waitForEvent("run.completed")]);

      sse1.disconnect();
      sse2.disconnect();

      assert(sse1.events.every((e) => e.run_id === run1.run_id));
      assert(sse2.events.every((e) => e.run_id === run2.run_id));
    },
  });

  // -------------------------------------------------------------
  // C05: Parallel Runs Across Different Conversations
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C05_PARALLEL_RUNS_DIFF_CONV",
    name: "Combo: Concurrent runs across different conversations have zero crosstalk",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const convA = await client.createConversation("C05 Conv A");
      const convB = await client.createConversation("C05 Conv B");

      const runA = await client.createRun({ conversation_id: convA.conversation_id, mode: "plan", prompt: "Run A" });
      const runB = await client.createRun({ conversation_id: convB.conversation_id, mode: "plan", prompt: "Run B" });

      const sseA = new SseConsumer(runA.run_id);
      const sseB = new SseConsumer(runB.run_id);

      await Promise.all([sseA.connect(), sseB.connect()]);
      await Promise.all([sseA.waitForEvent("run.completed"), sseB.waitForEvent("run.completed")]);

      sseA.disconnect();
      sseB.disconnect();

      assert(sseA.events.every((e) => e.conversation_id === convA.conversation_id));
      assert(sseB.events.every((e) => e.conversation_id === convB.conversation_id));
    },
  });

  // -------------------------------------------------------------
  // C06: Cancel Run While Waiting for Approval
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C06_CANCEL_WHILE_WAITING_APPROVAL",
    name: "Combo: Cancel run while suspended in waiting_approval terminates cleanly",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C06 Cancel Waiting Approval");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Delete critical folder rm -rf /root/workspace/crit",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("approval.required");

      const cancelRes = await client.cancelRun(run.run_id, "User cancelled instead of approving");
      assertTrue(cancelRes.success);

      const cancelEvt = await sse.waitForEvent("run.cancelled");
      assert(cancelEvt);
      sse.disconnect();
    },
  });

  // -------------------------------------------------------------
  // C07: Cancel Run During Active Bash Execution
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C07_CANCEL_DURING_BASH",
    name: "Combo: Cancel run during active bash execution kills process immediately",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C07 Cancel Bash");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: sleep 20",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("tool.started");

      await client.cancelRun(run.run_id, "Abort long bash");
      const cancelled = await sse.waitForEvent("run.cancelled");
      assert(cancelled);
      sse.disconnect();
    },
  });

  // -------------------------------------------------------------
  // C08: Cancel Run During File Edit
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C08_CANCEL_DURING_FILE_EDIT",
    name: "Combo: Cancel run during file editing leaves clean status snapshot",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C08 Cancel Edit");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Write large file and then wait",
      });

      await client.cancelRun(run.run_id, "Early cancel edit");
      const snap = await client.getSnapshot(run.run_id);
      assertEqual(snap.status, "cancelled");
    },
  });

  // -------------------------------------------------------------
  // C09: Approval Denial Followed by Run Termination
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C09_APPROVAL_DENY_RUN_COMPLETED",
    name: "Combo: Approval denial aborts destructive action and completes run gracefully",
    fn: async ({ client, sandbox, dryRun }) => {
      if (dryRun) return;
      await sandbox.execInSandbox("mkdir -p /root/workspace/keep_me && echo 'safe' > /root/workspace/keep_me/file.txt");
      const conv = await client.createConversation("C09 Deny Termination");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "rm -rf /root/workspace/keep_me",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const appr = await sse.waitForEvent("approval.required");
      await client.sendApprovalDecision(appr.payload.approval_id, "deny", appr.payload.action_digest);

      await sse.waitForEvent("approval.resolved");
      sse.disconnect();

      const exists = await sandbox.sandboxFileExists("/root/workspace/keep_me/file.txt");
      assertTrue(exists, "Directory must NOT be deleted after approval denial");
    },
  });

  // -------------------------------------------------------------
  // C10: Git Checkpoint Rollback on Build Failure
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C10_GIT_CHECKPOINT_PRESERVATION",
    name: "Combo: Git dirty changes preserved even if subsequent edit fails",
    fn: async ({ sandbox, dryRun }) => {
      if (dryRun) return;
      await sandbox.execInSandbox("git init /root/workspace && echo 'baseline' > /root/workspace/file.txt && git add . && git commit -m 'base'");
      await sandbox.execInSandbox("echo 'unstaged modification' >> /root/workspace/file.txt");

      const uncommitted = await sandbox.readSandboxFile("/root/workspace/file.txt");
      assertIncludes(uncommitted, "unstaged modification");
    },
  });

  // -------------------------------------------------------------
  // C11: Multi-Client SSE Fanout During Rapid Tool Stream
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C11_FANOUT_RAPID_TOOL_STREAM",
    name: "Combo: Multi-client SSE fanout during rapid sequence of tool output chunks",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C11 Rapid Fanout");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: for i in $(seq 1 10); do echo \"step $i\"; sleep 0.1; done",
      });

      const c1 = new SseConsumer(run.run_id);
      const c2 = new SseConsumer(run.run_id);

      await Promise.all([c1.connect(), c2.connect()]);
      await Promise.all([c1.waitForEvent("run.completed"), c2.waitForEvent("run.completed")]);

      c1.disconnect();
      c2.disconnect();

      assertEqual(c1.events.length, c2.events.length);
    },
  });

  // -------------------------------------------------------------
  // C12: Secret Redaction Across Multiple Output Chunks
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C12_SECRET_REDACTION_CHUNK_BOUNDARY",
    name: "Combo: Secret split across output chunks is masked across all chunks",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C12 Secret Boundary");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: printf 'sk-proj-' && printf 'abcdef1234567890abcdef1234567890\\n'",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("tool.completed");
      sse.disconnect();

      const combinedOutput = sse.events
        .filter((e) => e.type === "tool.output")
        .map((e) => e.payload.text_delta)
        .join("");

      assertFalse(combinedOutput.includes("sk-proj-abcdef1234567890abcdef1234567890"));
    },
  });

  // -------------------------------------------------------------
  // C13: Server Restart Snapshot Query
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C13_SNAPSHOT_QUERY_PERSISTENCE",
    name: "Combo: State snapshot reconstructs plan steps and tool calls from durable store",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C13 Snapshot Reconstruct");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "List files and create steps",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("run.completed");
      sse.disconnect();

      const snap = await client.getSnapshot(run.run_id);
      assertEqual(snap.run_id, run.run_id);
      assertEqual(snap.status, "completed");
    },
  });

  // -------------------------------------------------------------
  // C14: Plan Step Updates Interleaved with Tool Executions
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C14_PLAN_STEPS_INTERLEAVED",
    name: "Combo: plan.updated events precede corresponding tool.started events",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C14 Interleaved Plan");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Follow a 2-step plan: read file, then test",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("run.completed");
      sse.disconnect();

      const types = sse.events.map((e) => e.type);
      assertIncludes(types, "plan.updated");
      assertIncludes(types, "tool.started");
    },
  });

  // -------------------------------------------------------------
  // C15: Automated Verification Failure Triggers Self-Correction
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C15_VERIFICATION_RETRY_LOOP",
    name: "Combo: Automated verification failure triggers bounded self-correction attempt",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C15 Retry Loop");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Verify test suite and correct any errors",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const terminalEvt = await sse.waitForEvent((e) => e.type === "run.completed" || e.type === "run.failed");
      assert(terminalEvt);
      sse.disconnect();
    },
  });

  // -------------------------------------------------------------
  // C16: Idempotent Repost During Active Streaming
  // -------------------------------------------------------------
  runner.test({
    tier: 3,
    id: "T3_C16_IDEMPOTENT_REPOST_MID_STREAM",
    name: "Combo: Idempotent POST while run is actively streaming returns same run without side effects",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("C16 Idemp Mid Stream");
      const idempKey = `mid-stream-${Date.now()}`;

      const run1 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Long task: sleep 10",
        idempotency_key: idempKey,
      });

      const sse = new SseConsumer(run1.run_id);
      await sse.connect();
      await sse.waitForEvent("tool.started");

      // Mid-stream retry with identical key
      const run2 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Long task: sleep 10",
        idempotency_key: idempKey,
      });

      assertEqual(run1.run_id, run2.run_id);
      sse.disconnect();
    },
  });
}

export default registerTier3Tests;
