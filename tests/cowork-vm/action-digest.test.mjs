import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  canonicalJsonStringify,
  deterministicStringify,
  computeActionDigest,
  verifyActionDigest,
  generateApprovalToken,
  verifyApprovalToken,
} from "../../app/lib/cowork-vm/security/action-digest.ts";

test("canonicalJsonStringify serializes primitives identically to JSON.stringify", () => {
  assert.equal(canonicalJsonStringify("hello"), JSON.stringify("hello"));
  assert.equal(canonicalJsonStringify(12345), JSON.stringify(12345));
  assert.equal(canonicalJsonStringify(true), JSON.stringify(true));
  assert.equal(canonicalJsonStringify(false), JSON.stringify(false));
  assert.equal(canonicalJsonStringify(null), "null");
  assert.equal(canonicalJsonStringify(-0), "0");
});

test("canonicalJsonStringify recursively sorts object keys lexicographically", () => {
  const obj1 = { z: 1, a: 2, m: 3 };
  const obj2 = { a: 2, m: 3, z: 1 };
  const obj3 = { m: 3, z: 1, a: 2 };

  const expected = '{"a":2,"m":3,"z":1}';
  assert.equal(canonicalJsonStringify(obj1), expected);
  assert.equal(canonicalJsonStringify(obj2), expected);
  assert.equal(canonicalJsonStringify(obj3), expected);
});

test("canonicalJsonStringify handles deeply nested objects and arrays deterministically", () => {
  const complexA = {
    command: "bash -c",
    env: { PATH: "/usr/bin", FOO: "bar" },
    flags: ["-v", "-f"],
    options: { timeout: 3000, retry: { max: 3, backoff: true } },
  };

  const complexB = {
    options: { retry: { backoff: true, max: 3 }, timeout: 3000 },
    flags: ["-v", "-f"],
    env: { FOO: "bar", PATH: "/usr/bin" },
    command: "bash -c",
  };

  assert.equal(canonicalJsonStringify(complexA), canonicalJsonStringify(complexB));
  assert.equal(deterministicStringify(complexA), canonicalJsonStringify(complexB));
});

test("canonicalJsonStringify ignores undefined object properties and turns undefined array elements into null", () => {
  const obj = { a: 1, b: undefined };
  assert.equal(canonicalJsonStringify(obj), '{"a":1}');

  const arr = [1, undefined, 3];
  assert.equal(canonicalJsonStringify(arr), '[1,null,3]');
});

test("computeActionDigest produces 64-char hex SHA-256 invariant to object key ordering", () => {
  const args1 = { command: "rm -rf /tmp/cache", force: true, flags: ["-r", "-f"] };
  const args2 = { flags: ["-r", "-f"], force: true, command: "rm -rf /tmp/cache" };

  const digest1 = computeActionDigest({
    tool_name: "bash",
    args: args1,
    workspace_id: "ws-alpha",
  });

  const digest2 = computeActionDigest({
    tool_name: "bash",
    args: args2,
    workspace_id: "ws-alpha",
  });

  assert.match(digest1, /^[0-9a-f]{64}$/);
  assert.equal(digest1, digest2);
});

test("computeActionDigest supports positional argument calling convention with identical output", () => {
  const toolName = "write_file";
  const args = { path: "/app/config.json", content: '{"port": 8080}' };
  const workspaceId = "ws-prod";

  const digestFromObject = computeActionDigest({
    tool_name: toolName,
    args,
    workspace_id: workspaceId,
  });

  const digestFromPositional = computeActionDigest(toolName, args, workspaceId);

  assert.equal(digestFromObject, digestFromPositional);
});

test("computeActionDigest is sensitive to argument, tool name, and workspace changes", () => {
  const base = {
    tool_name: "bash",
    args: { cmd: "npm test" },
    workspace_id: "ws-1",
  };
  const baseDigest = computeActionDigest(base);

  // Different command
  const diffArg = computeActionDigest({
    tool_name: "bash",
    args: { cmd: "npm run build" },
    workspace_id: "ws-1",
  });
  assert.notEqual(baseDigest, diffArg);

  // Different tool
  const diffTool = computeActionDigest({
    tool_name: "sh",
    args: { cmd: "npm test" },
    workspace_id: "ws-1",
  });
  assert.notEqual(baseDigest, diffTool);

  // Different workspace
  const diffWs = computeActionDigest({
    tool_name: "bash",
    args: { cmd: "npm test" },
    workspace_id: "ws-2",
  });
  assert.notEqual(baseDigest, diffWs);
});

test("verifyActionDigest returns true for matching digests and false for tampered data", () => {
  const tool = "bash";
  const args = { script: "echo safe" };
  const ws = "ws-safe";
  const digest = computeActionDigest(tool, args, ws);

  // Valid positional verification
  assert.equal(verifyActionDigest(digest, tool, args, ws), true);

  // Valid object verification
  assert.equal(
    verifyActionDigest({
      expected_digest: digest,
      tool_name: tool,
      args,
      workspace_id: ws,
    }),
    true
  );

  // Tampered digest string
  const tamperedDigest = digest.slice(0, -1) + (digest.endsWith("a") ? "b" : "a");
  assert.equal(verifyActionDigest(tamperedDigest, tool, args, ws), false);

  // Tampered argument
  const tamperedArgs = { script: "echo dangerous" };
  assert.equal(verifyActionDigest(digest, tool, tamperedArgs, ws), false);

  // Invalid length digest
  assert.equal(verifyActionDigest("too-short", tool, args, ws), false);
});

test("generateApprovalToken and verifyApprovalToken validate HMAC cryptographic binding", () => {
  const approvalId = "appr_12345678-abcd";
  const actionDigest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const secret = "super-secret-key-m1";

  const token = generateApprovalToken(approvalId, actionDigest, secret);
  assert.ok(token.startsWith("tok_"));

  // Valid verification
  assert.equal(verifyApprovalToken(token, approvalId, actionDigest, secret), true);

  // Tampered approval ID
  assert.equal(verifyApprovalToken(token, "appr_different", actionDigest, secret), false);

  // Tampered action digest
  assert.equal(
    verifyApprovalToken(
      token,
      approvalId,
      "0000000000000000000000000000000000000000000000000000000000000000",
      secret
    ),
    false
  );

  // Wrong secret
  assert.equal(verifyApprovalToken(token, approvalId, actionDigest, "wrong-secret"), false);

  // Corrupted token
  assert.equal(verifyApprovalToken("tok_invalidhex", approvalId, actionDigest, secret), false);
});

test("canonicalJsonStringify correctly serializes sparse arrays with holes to valid JSON", () => {
  // Array holes created via sparse literal
  const sparse1 = [, , 1];
  const out1 = canonicalJsonStringify(sparse1);
  assert.equal(out1, "[null,null,1]");
  assert.deepEqual(JSON.parse(out1), [null, null, 1]);
  assert.equal(out1, JSON.stringify(sparse1));

  // Array created via constructor with size
  const sparse2 = new Array(3);
  const out2 = canonicalJsonStringify(sparse2);
  assert.equal(out2, "[null,null,null]");
  assert.deepEqual(JSON.parse(out2), [null, null, null]);
  assert.equal(out2, JSON.stringify(sparse2));

  // Trailing holes
  const sparse3 = [1, 2, , ];
  const out3 = canonicalJsonStringify(sparse3);
  assert.equal(out3, "[1,2,null]");
  assert.deepEqual(JSON.parse(out3), [1, 2, null]);
  assert.equal(out3, JSON.stringify(sparse3));

  // Nested sparse arrays
  const nestedSparse = { list: [, "item", ,] };
  const outNested = canonicalJsonStringify(nestedSparse);
  assert.equal(outNested, '{"list":[null,"item",null]}');
  assert.deepEqual(JSON.parse(outNested), JSON.parse(JSON.stringify(nestedSparse)));
});

test("canonicalJsonStringify detects circular structures and throws TypeError", () => {
  // Direct circular object reference
  const circularObj = { name: "loop" };
  circularObj.self = circularObj;
  assert.throws(
    () => canonicalJsonStringify(circularObj),
    {
      name: "TypeError",
      message: /Converting circular structure to canonical JSON/,
    }
  );

  // Direct circular array reference
  const circularArr = [1, 2];
  circularArr.push(circularArr);
  assert.throws(
    () => canonicalJsonStringify(circularArr),
    {
      name: "TypeError",
      message: /Converting circular structure to canonical JSON/,
    }
  );

  // Indirect circular reference across multiple objects
  const nodeA = { id: "A" };
  const nodeB = { id: "B", toA: nodeA };
  nodeA.toB = nodeB;
  assert.throws(
    () => canonicalJsonStringify(nodeA),
    {
      name: "TypeError",
      message: /Converting circular structure to canonical JSON/,
    }
  );

  // Non-circular DAG (shared references without cycle) should serialize cleanly
  const shared = { constant: 42 };
  const dag = { first: shared, second: shared, items: [shared, shared] };
  const serialized = canonicalJsonStringify(dag);
  assert.equal(
    serialized,
    '{"first":{"constant":42},"items":[{"constant":42},{"constant":42}],"second":{"constant":42}}'
  );
  assert.deepEqual(JSON.parse(serialized), JSON.parse(JSON.stringify(dag)));
});

test("computeActionDigest prevents delimiter collisions when workspace_id or tool_name contain colons", () => {
  const args = { x: 1 };

  // Scenario A: workspace_id contains a colon
  const digestA = computeActionDigest({
    workspace_id: "ws:bash",
    tool_name: "exec",
    args,
  });

  // Scenario B: tool_name contains a colon
  const digestB = computeActionDigest({
    workspace_id: "ws",
    tool_name: "bash:exec",
    args,
  });

  // Must not collide even though unescaped concatenation ws:bash:exec:{"x":1} would collide
  assert.notEqual(digestA, digestB);
  assert.match(digestA, /^[0-9a-f]{64}$/);
  assert.match(digestB, /^[0-9a-f]{64}$/);

  // Verification also distinguishes between the two
  assert.equal(
    verifyActionDigest({
      expected_digest: digestA,
      workspace_id: "ws:bash",
      tool_name: "exec",
      args,
    }),
    true
  );
  assert.equal(
    verifyActionDigest({
      expected_digest: digestA,
      workspace_id: "ws",
      tool_name: "bash:exec",
      args,
    }),
    false
  );
});
