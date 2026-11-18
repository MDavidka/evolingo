/**
 * Cryptographic helpers for Avalingo / Evolingo Cowork Agentic Compatibility.
 * Implements canonical JSON serialization and SHA-256 action digest computation.
 */

import crypto from "node:crypto";

/**
 * Recursively sort keys of an object or array to produce canonical JSON.
 * @param {*} value - The input value to canonicalize.
 * @returns {string} - Deterministic canonical JSON string.
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serializedElements = value.map((elem) => {
      const canonical = canonicalJson(elem);
      return canonical === undefined ? "null" : canonical;
    });
    return `[${serializedElements.join(",")}]`;
  }

  const sortedKeys = Object.keys(value).sort();
  const serializedEntries = [];

  for (const key of sortedKeys) {
    const val = value[key];
    if (val !== undefined && typeof val !== "function" && typeof val !== "symbol") {
      serializedEntries.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
    }
  }

  return `{${serializedEntries.join(",")}}`;
}

/**
 * Computes SHA-256 action digest according to the Cowork specification:
 * SHA256(tool_name + ":" + canonical_json_sort_keys(arguments) + ":" + workspace_id)
 *
 * @param {string} toolName - Name of the tool (e.g., 'bash', 'write_file').
 * @param {object} args - Arguments passed to the tool.
 * @param {string} [workspaceId="ws_default"] - Target workspace identifier.
 * @returns {string} 64-character lowercase hex SHA-256 digest.
 */
export function computeActionDigest(toolName, args, workspaceId = "ws_default") {
  if (!toolName || typeof toolName !== "string") {
    throw new TypeError("toolName must be a non-empty string");
  }
  const canonicalArgs = canonicalJson(args || {});
  const payload = `${toolName}:${canonicalArgs}:${workspaceId || "ws_default"}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Verifies whether a given digest matches the expected action parameters.
 *
 * @param {string} digest - Hex digest to verify.
 * @param {string} toolName - Tool name.
 * @param {object} args - Arguments.
 * @param {string} [workspaceId="ws_default"] - Workspace ID.
 * @returns {boolean} True if matching, false otherwise.
 */
export function verifyActionDigest(digest, toolName, args, workspaceId = "ws_default") {
  // Defect 6: Validate exactly 64 hexadecimal characters to prevent multi-byte UTF-8 RangeError
  if (!digest || typeof digest !== "string" || !/^[0-9a-f]{64}$/i.test(digest)) {
    return false;
  }
  const expected = computeActionDigest(toolName, args, workspaceId);
  const digestBuf = Buffer.from(digest.toLowerCase(), "utf8");
  const expectedBuf = Buffer.from(expected.toLowerCase(), "utf8");
  if (digestBuf.byteLength !== expectedBuf.byteLength) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuf, expectedBuf);
}

export default {
  canonicalJson,
  computeActionDigest,
  verifyActionDigest,
};
