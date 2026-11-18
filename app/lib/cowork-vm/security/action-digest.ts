/**
 * Cryptographic Action Digest & Approval Token Verification
 * Milestone 1 (M1: Durable Event Store & Cryptographic State)
 *
 * Implements:
 * - RFC 8785 deterministic canonical JSON serialization
 * - SHA-256 Action Digest calculation: SHA256(`${workspace_id}:${tool_name}:${canonicalJson(args)}`)
 * - Constant-time digest verification using timingSafeEqual
 * - HMAC-SHA256 Approval Token generation and verification
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Deterministic JSON serialization following RFC 8785 principles.
 * Recursively sorts dictionary keys lexicographically by UTF-16 code units.
 * Detects circular references using seen WeakSet and serializes sparse arrays with nulls.
 */
export function canonicalJsonStringify(
  obj: unknown,
  seen: WeakSet<object> = new WeakSet()
): string {
  if (obj === null || obj === undefined) {
    return "null";
  }

  const type = typeof obj;

  if (type === "boolean" || type === "number") {
    // Handle -0 normalization as per RFC 8785
    if (Object.is(obj, -0)) {
      return "0";
    }
    return JSON.stringify(obj);
  }

  if (type === "string") {
    return JSON.stringify(obj);
  }

  if (type === "bigint") {
    return JSON.stringify(obj.toString());
  }

  if (type === "symbol" || type === "function") {
    return "null";
  }

  if (type === "object") {
    if (seen.has(obj as object)) {
      throw new TypeError("Converting circular structure to canonical JSON");
    }
    seen.add(obj as object);

    try {
      if (Array.isArray(obj)) {
        const items: string[] = [];
        for (let i = 0; i < obj.length; i++) {
          const item = obj[i];
          if (item === undefined || typeof item === "function" || typeof item === "symbol") {
            items.push("null");
          } else {
            items.push(canonicalJsonStringify(item, seen));
          }
        }
        return `[${items.join(",")}]`;
      }

      const record = obj as Record<string, unknown>;
      const sortedKeys = Object.keys(record).sort();
      const pairs: string[] = [];

      for (const key of sortedKeys) {
        const val = record[key];
        // Skip undefined, functions, and symbols in object properties (like standard JSON.stringify)
        if (val === undefined || typeof val === "function" || typeof val === "symbol") {
          continue;
        }
        pairs.push(`${JSON.stringify(key)}:${canonicalJsonStringify(val, seen)}`);
      }

      return `{${pairs.join(",")}}`;
    } finally {
      seen.delete(obj as object);
    }
  }

  return JSON.stringify(obj);
}

/** Alias for canonicalJsonStringify */
export const deterministicStringify = canonicalJsonStringify;

export interface ActionDigestParams {
  tool_name?: string;
  toolName?: string;
  args: Record<string, unknown>;
  workspace_id?: string;
  workspaceId?: string;
}

/**
 * Computes a SHA-256 cryptographic hex digest over tool name, arguments, and workspace ID.
 *
 * Supported calling conventions:
 * 1. Object: computeActionDigest({ tool_name: "bash", args: { command: "ls" }, workspace_id: "ws-1" })
 * 2. Positional: computeActionDigest("bash", { command: "ls" }, "ws-1")
 */
export function computeActionDigest(
  toolNameOrParams: string | ActionDigestParams,
  maybeArgs?: Record<string, unknown>,
  maybeWorkspaceId?: string
): string {
  let toolName = "";
  let args: Record<string, unknown> = {};
  let workspaceId = "";

  if (typeof toolNameOrParams === "object" && toolNameOrParams !== null) {
    toolName = toolNameOrParams.tool_name ?? toolNameOrParams.toolName ?? "";
    args = toolNameOrParams.args ?? {};
    workspaceId = toolNameOrParams.workspace_id ?? toolNameOrParams.workspaceId ?? "";
  } else if (typeof toolNameOrParams === "string") {
    toolName = toolNameOrParams;
    args = maybeArgs ?? {};
    workspaceId = maybeWorkspaceId ?? "";
  }

  const safeWorkspaceId = encodeURIComponent(workspaceId);
  const safeToolName = encodeURIComponent(toolName);
  const canonicalArgs = canonicalJsonStringify(args);
  const canonicalPayload = `${safeWorkspaceId}:${safeToolName}:${canonicalArgs}`;

  return createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
}

export interface VerifyActionDigestParams {
  expected_digest?: string;
  expectedDigest?: string;
  tool_name?: string;
  toolName?: string;
  args: Record<string, unknown>;
  workspace_id?: string;
  workspaceId?: string;
}

/**
 * Verifies that an action matches its expected cryptographic digest using constant-time comparison.
 *
 * Supported calling conventions:
 * 1. Positional: verifyActionDigest(expectedDigest, toolName, args, workspaceId)
 * 2. Object: verifyActionDigest({ expected_digest, tool_name, args, workspace_id })
 */
export function verifyActionDigest(
  expectedDigestOrParams: string | VerifyActionDigestParams,
  maybeToolName?: string,
  maybeArgs?: Record<string, unknown>,
  maybeWorkspaceId?: string
): boolean {
  let expectedDigest = "";
  let computedDigest = "";

  if (typeof expectedDigestOrParams === "object" && expectedDigestOrParams !== null) {
    expectedDigest =
      expectedDigestOrParams.expected_digest ??
      expectedDigestOrParams.expectedDigest ??
      "";
    computedDigest = computeActionDigest({
      tool_name: expectedDigestOrParams.tool_name ?? expectedDigestOrParams.toolName,
      args: expectedDigestOrParams.args,
      workspace_id:
        expectedDigestOrParams.workspace_id ?? expectedDigestOrParams.workspaceId,
    });
  } else if (typeof expectedDigestOrParams === "string") {
    expectedDigest = expectedDigestOrParams;
    computedDigest = computeActionDigest(
      maybeToolName ?? "",
      maybeArgs ?? {},
      maybeWorkspaceId ?? ""
    );
  } else {
    return false;
  }

  if (
    !expectedDigest ||
    !computedDigest ||
    expectedDigest.length !== 64 ||
    computedDigest.length !== 64
  ) {
    return false;
  }

  try {
    const expectedBuf = Buffer.from(expectedDigest, "hex");
    const computedBuf = Buffer.from(computedDigest, "hex");
    if (expectedBuf.length !== computedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, computedBuf);
  } catch {
    return false;
  }
}

/**
 * Returns the effective secret for approval token HMAC signing.
 */
function getApprovalSecret(secret?: string): string {
  return (
    secret ||
    process.env.COWORK_SECRET ||
    process.env.ZRO_API_KEY ||
    "evolingo-cowork-approval-secret-v1"
  );
}

/**
 * Generates an HMAC-SHA256 signed approval token binding an approval ID to its action digest.
 */
export function generateApprovalToken(
  approvalId: string,
  actionDigest: string,
  secret?: string
): string {
  const effectiveSecret = getApprovalSecret(secret);
  const payload = `${approvalId}:${actionDigest}`;
  const signature = createHmac("sha256", effectiveSecret)
    .update(payload, "utf8")
    .digest("hex");
  return `tok_${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed approval token in constant time.
 */
export function verifyApprovalToken(
  token: string,
  approvalId: string,
  actionDigest: string,
  secret?: string
): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const expectedToken = generateApprovalToken(approvalId, actionDigest, secret);

  try {
    const tokenBuf = Buffer.from(token, "utf8");
    const expectedBuf = Buffer.from(expectedToken, "utf8");
    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
