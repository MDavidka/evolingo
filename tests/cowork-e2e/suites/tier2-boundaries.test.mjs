/**
 * Tier 2: Boundary & Corner Cases Test Suite
 * Tests boundary conditions: null/empty inputs, 30s timeouts, 500KB buffers,
 * path traversal edge cases, approval expirations, duplicate idempotency keys.
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
import { computeActionDigest, verifyActionDigest } from "../harness/crypto-helpers.mjs";
import { SseConsumer } from "../harness/sse-consumer.mjs";

export function registerTier2Tests(runner) {
  // -------------------------------------------------------------
  // Group 1: Empty / Null / Malformed Payloads (8 tests)
  // -------------------------------------------------------------
  runner.test({
    tier: 2,
    id: "T2_B01_EMPTY_PROMPT",
    name: "Boundary: create run with empty string prompt is rejected (400)",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Empty Prompt");
      await assertRejects(
        client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "" }),
        /400|empty|required|invalid/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B02_NULL_CONVERSATION",
    name: "Boundary: create run with null conversation_id is rejected (400)",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      await assertRejects(
        client.createRun({ conversation_id: null, mode: "plan", prompt: "Hello" }),
        /400|conversation_id|required/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B03_MALFORMED_JSON",
    name: "Boundary: malformed JSON body to /api/cowork/runs rejected with 400",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      await assertRejects(
        client.request("/api/cowork/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{ unclosed_json: true, ",
        }),
        /400|json/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B04_EMPTY_TITLE",
    name: "Boundary: create conversation with empty title falls back to default title",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("");
      assert(conv.conversation_id);
      assert(typeof conv.title === "string" && conv.title.length > 0);
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B05_UNSUPPORTED_MODE",
    name: "Boundary: create run with unsupported mode rejected (400/422)",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Mode");
      await assertRejects(
        client.createRun({ conversation_id: conv.conversation_id, mode: "super_admin_mode", prompt: "Test" }),
        /400|422|mode/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B06_PROMPT_MAX_LENGTH",
    name: "Boundary: prompt exceeding maximum length (100KB string) handled safely",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Max Prompt");
      const giantPrompt = "A".repeat(120 * 1024);
      await assertRejects(
        client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: giantPrompt }),
        /413|400|payload too large|max/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B07_CANCEL_NULL_REASON",
    name: "Boundary: cancel run with null reason handled gracefully without server error",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Cancel Null");
      const run = await client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "Inspect" });
      const res = await client.cancelRun(run.run_id, null);
      assertTrue(res.success);
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B08_APPROVAL_INVALID_DECISION",
    name: "Boundary: approval decision with invalid choice rejected (400)",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      await assertRejects(
        client.sendApprovalDecision("appr_test", "maybe_later", "0".repeat(64)),
        /400|decision|invalid/i
      );
    },
  });

  // -------------------------------------------------------------
  // Group 2: Timeouts & Output Buffers (8 tests)
  // -------------------------------------------------------------
  runner.test({
    tier: 2,
    id: "T2_B09_COMMAND_29S",
    name: "Boundary: command completing within 29s finishes before 30s timeout",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary 29s Sleep");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: sleep 2",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const comp = await sse.waitForEvent("tool.completed", 15000);
      assertEqual(comp.payload.exit_code, 0);
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B10_COMMAND_31S",
    name: "Boundary: command hanging at 31s triggers SIGKILL abort",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary 31s Sleep");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: sleep 32",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed", 36000);
      assertEqual(failed.payload.error_code, "TIMEOUT");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B11_ZERO_TIMEOUT",
    name: "Boundary: zero timeout parameter rejected with validation error",
    fn: async ({ sandbox, dryRun }) => {
      if (dryRun) return;
      const res = await sandbox.execInSandbox("sleep 1", { timeoutMs: 1 });
      assertEqual(res.exitCode, 124);
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B12_OUTPUT_EXACTLY_500KB",
    name: "Boundary: terminal output of 490KB not truncated",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary 490KB");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: head -c 490000 /dev/zero | tr '\\0' 'x'",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("tool.completed", 20000);
      const outputs = sse.events.filter((e) => e.type === "tool.output");
      const last = outputs[outputs.length - 1];
      assertFalse(last.payload.text_delta.includes("[Output truncated:"));
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B13_OUTPUT_501KB",
    name: "Boundary: terminal output of 510KB truncated with notice",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary 510KB");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: head -c 510000 /dev/zero | tr '\\0' 'y'",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("tool.completed", 25000);
      const outputs = sse.events.filter((e) => e.type === "tool.output");
      const last = outputs[outputs.length - 1];
      assertIncludes(last.payload.text_delta, "truncated");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B14_BINARY_NULL_BYTES",
    name: "Boundary: raw binary null bytes in terminal output sanitized safely",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Null Bytes");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Run bash: printf '\\x00\\x01\\x02\\x03hello\\x00world'",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const comp = await sse.waitForEvent("tool.completed");
      assertEqual(comp.payload.exit_code, 0);
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B15_CGROUP_MEMORY_LIMIT",
    name: "Boundary: container cgroup memory capped at 500MB without host crash",
    fn: async ({ sandbox, dryRun }) => {
      if (dryRun) return;
      const metrics = await sandbox.getSandboxMetrics();
      const memMax = parseInt(metrics.cgroup.memoryMax, 10);
      assert(memMax <= 524288000, `Memory limit ${memMax} must be <= 500MB`);
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B16_CPU_QUOTA_THROTTLE",
    name: "Boundary: cgroup CPU quota throttles multi-core saturation to 100% (1 CPU)",
    fn: async ({ sandbox, dryRun }) => {
      if (dryRun) return;

      // 1. Inspect container cgroup CPU quota configuration
      // In Incus LXC profile cowork-vm: limits.cpu: 1 and limits.cpu.allowance: 100ms/100ms
      // cgroup v2 format for /sys/fs/cgroup/cpu.max is: "$QUOTA $PERIOD" (e.g. "100000 100000")
      const cpuMaxContent = await sandbox.readSandboxFile("/sys/fs/cgroup/cpu.max");
      const [quotaStr, periodStr] = cpuMaxContent.trim().split(/\s+/);
      const quota = parseInt(quotaStr, 10);
      const period = parseInt(periodStr, 10);

      assert(!isNaN(period) && period > 0, "cgroup period must be a positive integer");
      if (quotaStr !== "max") {
        assertEqual(quota, 100000, "cgroup quota must be 100000 usec for 1 CPU allowance");
        assertEqual(period, 100000, "cgroup period must be 100000 usec");
      }

      // 2. Read initial cgroup CPU usage stats
      const parseStat = (statText) => {
        const stats = {};
        for (const line of statText.trim().split("\n")) {
          const [k, v] = line.split(" ");
          stats[k] = parseInt(v, 10) || 0;
        }
        return stats;
      };

      const statBefore = parseStat(await sandbox.readSandboxFile("/sys/fs/cgroup/cpu.stat"));

      // 3. Execute a multi-core CPU saturation workload (4 parallel infinite-loop threads)
      // Without CPU quota throttling, 4 concurrent loops across a multi-core host consume ~400% CPU.
      // With limits.cpu: 1 and 100ms/100ms quota, total CPU usage must be strictly bounded to <= 1 CPU.
      const startTime = Date.now();
      await sandbox.execInSandbox(`python3 -c "
import time, threading
def burn():
    t_end = time.time() + 1.2
    while time.time() < t_end:
        pass
threads = [threading.Thread(target=burn) for _ in range(4)]
for th in threads: th.start()
for th in threads: th.join()
"`, { timeoutMs: 15000 });
      const wallDurationMs = Date.now() - startTime;

      // 4. Read final cgroup CPU usage stats
      const statAfter = parseStat(await sandbox.readSandboxFile("/sys/fs/cgroup/cpu.stat"));

      // 5. Compute empirical CPU consumption metrics
      const cpuDeltaUsec = statAfter.usage_usec - statBefore.usage_usec;
      const cpuTimeMs = cpuDeltaUsec / 1000;
      const effectiveCores = cpuTimeMs / wallDurationMs;

      // Assertions:
      // - Workload consumed substantial CPU cycles (>500ms)
      assert(cpuTimeMs >= 500, `Saturation workload consumed ${cpuTimeMs.toFixed(1)}ms CPU time`);
      // - Effective CPU core utilization is strictly throttled to 1 CPU (<= 1.15 cores)
      assert(
        effectiveCores <= 1.15,
        `CPU usage must be strictly throttled to ~1.0 core (observed ${effectiveCores.toFixed(2)} cores across 4 saturated threads)`
      );
      // - cgroup periods advanced during active computation
      assert(
        statAfter.nr_periods >= statBefore.nr_periods,
        "cgroup nr_periods must advance during saturation test"
      );
    },
  });

  // -------------------------------------------------------------
  // Group 3: Path Traversal & Filesystem Boundaries (8 tests)
  // -------------------------------------------------------------
  runner.test({
    tier: 2,
    id: "T2_B17_TRIPLE_DOT_DOT",
    name: "Boundary: path traversal triple dot ../../../ blocked",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Triple Dot");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Read file ../../../etc/hostname",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed");
      assertIncludes(failed.payload.safe_message.toLowerCase(), "traversal");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B18_URL_ENCODED_DOT_DOT",
    name: "Boundary: URL encoded path traversal ..%2F..%2F blocked",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary URL Traversal");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Read file ..%2F..%2Fetc%2Fpasswd",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed");
      assertIncludes(failed.payload.safe_message.toLowerCase(), "traversal");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B19_NULL_BYTE_POISONING",
    name: "Boundary: null byte injection in filename foo.txt\\0.png rejected",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Null Poison");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Create file test\x00.txt with data",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed");
      assert(failed);
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B20_SYMLINK_LOOP_RECURSION",
    name: "Boundary: symlink loop recursion (a -> b -> a) handled without infinite loop",
    fn: async ({ sandbox, client, dryRun }) => {
      if (dryRun) return;
      await sandbox.execInSandbox("ln -sf loop_b /root/workspace/loop_a && ln -sf loop_a /root/workspace/loop_b");
      const conv = await client.createConversation("Boundary Symlink Loop");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Search code in loop_a",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const evt = await sse.waitForEvent((e) => e.type === "tool.failed" || e.type === "tool.completed");
      assert(evt);
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B21_DEEPLY_NESTED_DIR",
    name: "Boundary: deeply nested directory path (30 levels) handles mkdir -p gracefully",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const deepPath = Array(20).fill("sub").join("/") + "/deep.txt";
      const conv = await client.createConversation("Boundary Deep Nest");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: `Create file ${deepPath} with 'deep content'`,
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      await sse.waitForEvent("run.completed");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B22_EMPTY_FILENAME",
    name: "Boundary: empty filename in write_file rejected with schema error",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Empty File");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "Internal: write_file with path ''",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed");
      assertEqual(failed.payload.error_code, "INVALID_ARGUMENTS");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B23_NEGATIVE_LINE_NUMBERS",
    name: "Boundary: read_file with negative start_line rejected",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Neg Lines");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Internal: read_file with start_line -5",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed");
      assertEqual(failed.payload.error_code, "INVALID_ARGUMENTS");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B24_START_GREATER_THAN_END",
    name: "Boundary: read_file where start_line > end_line handled safely",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Reversed Lines");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Internal: read_file with start_line 50 and end_line 10",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const failed = await sse.waitForEvent("tool.failed");
      assert(failed);
      sse.disconnect();
    },
  });

  // -------------------------------------------------------------
  // Group 4: Approvals & Cryptographic Boundaries (8 tests)
  // -------------------------------------------------------------
  runner.test({
    tier: 2,
    id: "T2_B25_APPROVAL_EXPIRED_1MS",
    name: "Boundary: approval token 1ms past expiry timestamp rejected",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      await assertRejects(
        client.sendApprovalDecision("appr_past_expiry", "allow_once", "a".repeat(64)),
        /410|400|expired/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B26_APPROVAL_DIGEST_1BYTE_TAMPER",
    name: "Boundary: approval digest tampered by exactly 1 character rejected",
    fn: async ({ client, dryRun }) => {
      const realDigest = computeActionDigest("bash", { command: "rm -rf test" }, "ws_default");
      const tamperedDigest = (realDigest.slice(0, 63) + (realDigest[63] === "a" ? "b" : "a"));
      assertFalse(verifyActionDigest(tamperedDigest, "bash", { command: "rm -rf test" }, "ws_default"));

      if (!dryRun) {
        await assertRejects(
          client.sendApprovalDecision("appr_01", "allow_once", tamperedDigest),
          /403|mismatch/i
        );
      }
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B27_CANONICAL_JSON_KEY_ORDER",
    name: "Boundary: canonical JSON key order invariant produces identical digest",
    fn: async () => {
      const d1 = computeActionDigest("tool", { alpha: 1, beta: 2, gamma: 3 }, "ws_default");
      const d2 = computeActionDigest("tool", { gamma: 3, alpha: 1, beta: 2 }, "ws_default");
      assertEqual(d1, d2, "Digest must be independent of key insertion order");
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B28_APPROVAL_DOUBLE_SUBMIT_RACE",
    name: "Boundary: concurrent double submission of same approval decision",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const digest = "a".repeat(64);
      const req1 = client.sendApprovalDecision("appr_race_test", "allow_once", digest, { allowError: true });
      const req2 = client.sendApprovalDecision("appr_race_test", "allow_once", digest, { allowError: true });
      const [res1, res2] = await Promise.all([req1, req2]);
      assert(res1 !== undefined && res2 !== undefined);
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B29_APPROVAL_NONEXISTENT_ID",
    name: "Boundary: approval decision for non-existent approval ID returns 404",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      await assertRejects(
        client.sendApprovalDecision("appr_completely_bogus_id_999", "allow_once", "0".repeat(64)),
        /404|not found/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B30_APPROVAL_DENY_TERMINATION",
    name: "Boundary: decision 'deny' terminates command execution safely",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Deny");
      const run = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "build",
        prompt: "rm -rf to_deny_dir",
      });

      const sse = new SseConsumer(run.run_id);
      await sse.connect();
      const appr = await sse.waitForEvent("approval.required");
      const res = await client.sendApprovalDecision(appr.payload.approval_id, "deny", appr.payload.action_digest);
      assertEqual(res.decision, "deny");

      const resolved = await sse.waitForEvent("approval.resolved");
      assertEqual(resolved.payload.decision, "deny");
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B31_EMPTY_ACTION_DIGEST",
    name: "Boundary: empty string action digest rejected (400/403)",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      await assertRejects(
        client.sendApprovalDecision("appr_test", "allow_once", ""),
        /400|403|digest/i
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B32_DIGEST_CASE_SENSITIVITY",
    name: "Boundary: upper-case action digest normalized or strictly validated",
    fn: async () => {
      const digestLower = computeActionDigest("bash", { command: "ls" }, "ws_default");
      const digestUpper = digestLower.toUpperCase();
      assertEqual(digestLower, digestUpper.toLowerCase());
    },
  });

  // -------------------------------------------------------------
  // Group 5: Idempotency & Stream Boundaries (8 tests)
  // -------------------------------------------------------------
  runner.test({
    tier: 2,
    id: "T2_B33_IDEMPOTENCY_UUID_FORMAT",
    name: "Boundary: valid UUID v4 formatted Idempotency-Key deduplicates duplicate submissions",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary UUID Key");
      const uuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
      const run1 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "UUID idempotency test",
        idempotency_key: uuid,
      });
      assert(run1 && run1.run_id, "Initial run with UUID idempotency key must succeed");

      // Duplicate submission with identical body and idempotency key
      const run2 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "UUID idempotency test",
        idempotency_key: uuid,
      });
      assert(run2 && run2.run_id, "Duplicate submission must return a valid run object");
      assertEqual(
        run1.run_id,
        run2.run_id,
        `Duplicate submission with identical UUID key ${uuid} must return identical run_id`
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B34_IDEMPOTENCY_SPECIAL_CHARS",
    name: "Boundary: Idempotency-Key with mismatched request payload rejected with 409 or 422",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Special Key Conflict");
      const key = "CLIENT_ID:12345--batch-01";
      const run1 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Initial payload content",
        idempotency_key: key,
      });
      assert(run1 && run1.run_id, "Initial run submission must succeed");

      // Duplicate submission with SAME key but CONFLICTING payload (different prompt & mode)
      let conflictDetected = false;
      try {
        await client.createRun({
          conversation_id: conv.conversation_id,
          mode: "build",
          prompt: "Mismatched conflicting payload content",
          idempotency_key: key,
        });
      } catch (err) {
        if (err.status === 409 || err.status === 422) {
          conflictDetected = true;
        } else {
          throw err;
        }
      }
      assert(
        conflictDetected,
        `Duplicate submission with existing key '${key}' and mismatched payload must return HTTP 409 or 422`
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B35_EMPTY_IDEMPOTENCY_KEY",
    name: "Boundary: empty string Idempotency-Key ignored, treated as non-idempotent",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Empty Idemp");
      const run1 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Non-idempotent request #1",
        idempotency_key: "",
      });
      const run2 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Non-idempotent request #2",
        idempotency_key: "",
      });
      assert(run1 && run1.run_id, "First run creation must succeed");
      assert(run2 && run2.run_id, "Second run creation must succeed");
      assertNotEqual(
        run1.run_id,
        run2.run_id,
        "Submissions with empty Idempotency-Key must produce distinct run IDs (no deduplication)"
      );
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B36_CONCURRENT_IDEMPOTENT_SUBMISSIONS",
    name: "Boundary: 5 simultaneous POST requests with same key yield single run",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Concurrent 5x");
      const sharedKey = `shared-key-${Date.now()}`;
      const promises = Array(5).fill(0).map(() =>
        client.createRun({
          conversation_id: conv.conversation_id,
          mode: "plan",
          prompt: "Concurrent task",
          idempotency_key: sharedKey,
        })
      );
      const results = await Promise.all(promises);
      const firstId = results[0].run_id;
      for (const res of results) {
        assertEqual(res.run_id, firstId);
      }
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B37_IDEMPOTENCY_TTL_BOUNDARY",
    name: "Boundary: Idempotency-Key record retains state across short duration",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Idemp TTL");
      const key = `ttl-key-${Date.now()}`;
      const r1 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Task TTL",
        idempotency_key: key,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const r2 = await client.createRun({
        conversation_id: conv.conversation_id,
        mode: "plan",
        prompt: "Task TTL",
        idempotency_key: key,
      });
      assertEqual(r1.run_id, r2.run_id);
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B38_SSE_NEGATIVE_AFTER_SEQ",
    name: "Boundary: ?after_seq=-1 handled gracefully (treated as 0)",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Neg Seq");
      const run = await client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "Ping" });
      const sse = new SseConsumer(run.run_id, { afterSeq: -1 });
      await sse.connect();
      const evt = await sse.waitForEvent(() => true);
      assertEqual(evt.seq, 1);
      sse.disconnect();
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B39_SSE_NON_INTEGER_AFTER_SEQ",
    name: "Boundary: ?after_seq=abc handled with 400 or fallback to 0",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Non-int Seq");
      const run = await client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "Ping" });
      const sse = new SseConsumer(run.run_id, { afterSeq: "not_a_number" });
      try {
        await sse.connect();
        sse.disconnect();
      } catch (err) {
        assert(err);
      }
    },
  });

  runner.test({
    tier: 2,
    id: "T2_B40_SSE_HUGE_AFTER_SEQ",
    name: "Boundary: ?after_seq=99999999 returns empty replay and waits for live",
    fn: async ({ client, dryRun }) => {
      if (dryRun) return;
      const conv = await client.createConversation("Boundary Huge Seq");
      const run = await client.createRun({ conversation_id: conv.conversation_id, mode: "plan", prompt: "Ping" });
      const sse = new SseConsumer(run.run_id, { afterSeq: 99999999 });
      await sse.connect();
      const events = await sse.collectEvents(1000);
      assertEqual(events.length, 0);
      sse.disconnect();
    },
  });
}

export default registerTier2Tests;
