/**
 * Strict assertion library and schema validators for Cowork E2E test suite.
 */

import nodeAssert from "node:assert";

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

/**
 * 18 Canonical Cowork Event Types defined in protocols/EVENTS_AND_MESSAGES.md
 */
export const CANONICAL_EVENT_TYPES = Object.freeze([
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
]);

/**
 * Basic truthy assertion.
 */
export function assert(condition, message = "Assertion failed") {
  if (!condition) {
    throw new AssertionError(message, condition, true);
  }
}

/**
 * Deep or strict equality comparison.
 */
export function assertEqual(actual, expected, message = "") {
  try {
    nodeAssert.deepStrictEqual(actual, expected);
  } catch {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    const msg = message
      ? `${message}\n  Expected: ${expectedStr}\n  Received: ${actualStr}`
      : `Expected ${expectedStr} but got ${actualStr}`;
    throw new AssertionError(msg, actual, expected);
  }
}

/**
 * Strict inequality.
 */
export function assertNotEqual(actual, unexpected, message = "") {
  const actualStr = JSON.stringify(actual);
  const unexpectedStr = JSON.stringify(unexpected);
  if (actualStr === unexpectedStr) {
    const msg = message
      ? `${message}\n  Unexpected: ${unexpectedStr}`
      : `Did not expect ${unexpectedStr}`;
    throw new AssertionError(msg, actual, unexpected);
  }
}

/**
 * Asserts value is strictly true.
 */
export function assertTrue(value, message = "Expected value to be strictly true") {
  if (value !== true) {
    throw new AssertionError(message, value, true);
  }
}

/**
 * Asserts value is strictly false.
 */
export function assertFalse(value, message = "Expected value to be strictly false") {
  if (value !== false) {
    throw new AssertionError(message, value, false);
  }
}

/**
 * Asserts haystack contains needle (string or array).
 */
export function assertIncludes(haystack, needle, message = "") {
  if (typeof haystack === "string") {
    if (!haystack.includes(needle)) {
      const msg = message || `Expected string to include "${needle}"`;
      throw new AssertionError(msg, haystack, needle);
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.some((item) => JSON.stringify(item) === JSON.stringify(needle))) {
      const msg = message || `Expected array to include ${JSON.stringify(needle)}`;
      throw new AssertionError(msg, haystack, needle);
    }
  } else {
    throw new AssertionError("assertIncludes target must be a string or array", haystack);
  }
}

/**
 * Asserts string matches RegExp pattern.
 */
export function assertMatch(string, regex, message = "") {
  const re = typeof regex === "string" ? new RegExp(regex) : regex;
  if (!re.test(String(string))) {
    const msg = message || `Expected "${string}" to match regex ${regex}`;
    throw new AssertionError(msg, string, regex);
  }
}

/**
 * Asserts synchronous function throws error.
 */
export function assertThrows(fn, expectedErrorOrRegex, message = "") {
  let threw = false;
  let caughtError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    caughtError = err;
  }
  if (!threw) {
    throw new AssertionError(message || "Expected function to throw, but it succeeded");
  }
  if (expectedErrorOrRegex) {
    const errText = caughtError ? (caughtError.message || String(caughtError)) : "";
    if (typeof expectedErrorOrRegex === "string") {
      assertIncludes(errText, expectedErrorOrRegex, message);
    } else if (expectedErrorOrRegex instanceof RegExp) {
      assertMatch(errText, expectedErrorOrRegex, message);
    }
  }
  return caughtError;
}

/**
 * Asserts asynchronous function or promise rejects.
 */
export async function assertRejects(asyncFnOrPromise, expectedErrorOrRegex, message = "") {
  let threw = false;
  let caughtError = null;
  try {
    if (typeof asyncFnOrPromise === "function") {
      await asyncFnOrPromise();
    } else {
      await asyncFnOrPromise;
    }
  } catch (err) {
    threw = true;
    caughtError = err;
  }
  if (!threw) {
    throw new AssertionError(message || "Expected async operation to reject, but it resolved");
  }
  if (expectedErrorOrRegex) {
    const errText = caughtError ? (caughtError.message || String(caughtError)) : "";
    if (typeof expectedErrorOrRegex === "string") {
      assertIncludes(errText, expectedErrorOrRegex, message);
    } else if (expectedErrorOrRegex instanceof RegExp) {
      assertMatch(errText, expectedErrorOrRegex, message);
    }
  }
  return caughtError;
}

/**
 * Validates that an object is a compliant CoworkEventEnvelope.
 * Checks: event_id, run_id, conversation_id, seq, type, ts, payload.
 */
export function assertEnvelopeValid(event, expectedRunId = null) {
  assert(event && typeof event === "object", "Event envelope must be a non-null object");

  // Validate event_id
  assert(
    typeof event.event_id === "string" && event.event_id.trim().length > 0,
    `Invalid event_id: ${JSON.stringify(event.event_id)}`
  );

  // Validate run_id
  assert(
    typeof event.run_id === "string" && event.run_id.trim().length > 0,
    `Invalid run_id: ${JSON.stringify(event.run_id)}`
  );
  if (expectedRunId) {
    assertEqual(event.run_id, expectedRunId, "Event run_id must match expected run_id");
  }

  // Validate conversation_id
  assert(
    typeof event.conversation_id === "string" && event.conversation_id.trim().length > 0,
    `Invalid conversation_id: ${JSON.stringify(event.conversation_id)}`
  );

  // Validate seq
  assert(
    Number.isInteger(event.seq) && event.seq >= 1,
    `Event seq must be a positive integer, got: ${event.seq}`
  );

  // Validate type
  assert(
    CANONICAL_EVENT_TYPES.includes(event.type),
    `Unknown event type: "${event.type}". Must be one of canonical 18 types.`
  );

  // Validate ts (strict ISO 8601 string)
  const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  assert(
    typeof event.ts === "string" && ISO_8601_REGEX.test(event.ts) && !isNaN(Date.parse(event.ts)),
    `Invalid ISO timestamp ts: ${JSON.stringify(event.ts)}`
  );

  // Validate payload
  assert(
    event.payload !== null && typeof event.payload === "object",
    `Event payload must be an object, got ${typeof event.payload}`
  );
}

/**
 * Validates that a list of events has strictly monotonic sequence numbers:
 * seq = 1, 2, 3, ... (or strictly increasing seq values without duplicates or backward steps).
 * Also verifies run_id consistency.
 */
export function assertMonotonic(events, options = { strictContiguous: false }) {
  assert(Array.isArray(events), "Events must be an array");
  if (events.length === 0) return;

  const firstRunId = events[0].run_id;
  let previousSeq = null;

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    assertEnvelopeValid(evt);

    assertEqual(
      evt.run_id,
      firstRunId,
      `Event at index ${i} has mismatched run_id: expected ${firstRunId}, got ${evt.run_id}`
    );

    if (previousSeq !== null) {
      if (options.strictContiguous) {
        assertEqual(
          evt.seq,
          previousSeq + 1,
          `Non-contiguous seq jump at index ${i}: expected ${previousSeq + 1}, got ${evt.seq}`
        );
      } else {
        assert(
          evt.seq > previousSeq,
          `Sequence violation at index ${i}: seq ${evt.seq} is not strictly greater than previous ${previousSeq}`
        );
      }
    }
    previousSeq = evt.seq;
  }
}

export default {
  AssertionError,
  CANONICAL_EVENT_TYPES,
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
};
