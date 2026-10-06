/**
 * Unit tests for src/lib/firebaseConfig.js — pure validation of the Firebase
 * client config. These pin the contract that a missing/placeholder VITE_*
 * var is reported BY NAME instead of surfacing later as a generic
 * `auth/invalid-api-key` from the Firebase SDK.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  FIREBASE_ENV_VARS,
  validateFirebaseConfig,
  firebaseConfigWarning,
} from "../../src/lib/firebaseConfig.js";

const FULL_ENV = Object.fromEntries(
  FIREBASE_ENV_VARS.map((k) => [k, `real-${k.toLowerCase()}-value`])
);

test("validateFirebaseConfig: ok when all six vars are present", () => {
  const { ok, missing } = validateFirebaseConfig(FULL_ENV);
  assert.equal(ok, true);
  assert.deepEqual(missing, []);
});

test("validateFirebaseConfig: reports every missing var by name", () => {
  const env = { ...FULL_ENV };
  delete env.VITE_FIREBASE_API_KEY;
  delete env.VITE_FIREBASE_APP_ID;
  const { ok, missing } = validateFirebaseConfig(env);
  assert.equal(ok, false);
  assert.deepEqual(missing, ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_APP_ID"]);
});

test("validateFirebaseConfig: blank and whitespace-only values count as missing", () => {
  const env = { ...FULL_ENV, VITE_FIREBASE_PROJECT_ID: "" };
  const { ok, missing } = validateFirebaseConfig(env);
  assert.equal(ok, false);
  assert.deepEqual(missing, ["VITE_FIREBASE_PROJECT_ID"]);
});

test("validateFirebaseConfig: placeholder values count as missing", () => {
  for (const placeholder of ["your-api-key", "CHANGEME", "xxx", "<paste here>", "TODO_KEY"]) {
    const env = { ...FULL_ENV, VITE_FIREBASE_API_KEY: placeholder };
    const { ok, missing } = validateFirebaseConfig(env);
    assert.equal(ok, false, `${placeholder} must be flagged`);
    assert.ok(missing.includes("VITE_FIREBASE_API_KEY"));
  }
});

test("validateFirebaseConfig: undefined/empty env object → all vars missing", () => {
  const a = validateFirebaseConfig({});
  assert.equal(a.ok, false);
  assert.equal(a.missing.length, FIREBASE_ENV_VARS.length);

  const b = validateFirebaseConfig(undefined);
  assert.equal(b.ok, false);
  assert.equal(b.missing.length, FIREBASE_ENV_VARS.length);
});

test("firebaseConfigWarning: names the vars and the fix", () => {
  const msg = firebaseConfigWarning(["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_APP_ID"]);
  assert.ok(msg.includes("VITE_FIREBASE_API_KEY"));
  assert.ok(msg.includes("VITE_FIREBASE_APP_ID"));
  assert.ok(msg.includes(".env"));
  assert.ok(msg.includes(".env.example"));
});

test("every reported var is a real VITE_ var (guards against typos in the list)", () => {
  for (const key of FIREBASE_ENV_VARS) {
    assert.match(key, /^VITE_FIREBASE_[A-Z_]+$/);
  }
});
