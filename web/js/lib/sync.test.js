import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSyncDirection } from "./sync.js";

test("no remote backup yet -> push", () => {
  assert.equal(resolveSyncDirection("2026-01-02T00:00:00Z", null), "push");
});

test("fresh device with no local edits -> pull", () => {
  assert.equal(resolveSyncDirection(null, "2026-01-02T00:00:00Z"), "pull");
});

test("newer side wins", () => {
  assert.equal(resolveSyncDirection("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"), "pull");
  assert.equal(resolveSyncDirection("2026-01-03T00:00:00Z", "2026-01-02T00:00:00Z"), "push");
});
