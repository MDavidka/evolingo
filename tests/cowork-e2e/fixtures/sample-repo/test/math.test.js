import test from "node:test";
import assert from "node:assert";
import { add, subtract, multiply } from "../src/math.js";

test("add computes sum correctly", () => {
  assert.strictEqual(add(2, 3), 5);
  assert.strictEqual(add(-1, 1), 0);
});

test("subtract computes difference correctly", () => {
  assert.strictEqual(subtract(10, 4), 6);
});

test("multiply computes product correctly", () => {
  assert.strictEqual(multiply(3, 7), 21);
});
