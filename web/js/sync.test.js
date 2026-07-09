import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSyncDirection } from "./sync.js";

// Pure decision logic only — the network calls (pullRemote/pushRemote/
// connectSync) need `fetch` + `localStorage`, which aren't Node globals;
// those are covered by the Playwright browser tests instead.

test("pushes when there's no remote data yet", () => {
  assert.equal(resolveSyncDirection("2026-01-01T00:00:00.000Z", null), "push");
  assert.equal(resolveSyncDirection(null, null), "push");
});

test("pulls when local has never recorded a change but remote has data", () => {
  assert.equal(resolveSyncDirection(null, "2026-01-01T00:00:00.000Z"), "pull");
});

test("pulls when remote is newer than local", () => {
  assert.equal(resolveSyncDirection("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"), "pull");
});

test("pushes when local is newer than remote", () => {
  assert.equal(resolveSyncDirection("2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z"), "push");
});

test("pushes on an exact tie (idempotent no-op)", () => {
  const t = "2026-01-01T00:00:00.000Z";
  assert.equal(resolveSyncDirection(t, t), "push");
});
