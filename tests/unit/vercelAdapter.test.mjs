/**
 * Vercel adapter contracts — binary bodies must never be UTF-8 decoded.
 *
 * The bug this pins: `await request.text()` on a multipart upload replaces every
 * invalid UTF-8 sequence with U+FFFD, so a PDF arrived corrupted while the upload
 * reported success.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { adaptNetlifyHandler } from "../../api/_netlify-adapter.mjs";

function makeRequest({ method = "POST", contentType = "application/json", body } = {}) {
  const headers = contentType ? { "content-type": contentType } : {};
  return new Request("https://api.example.com/api/test", {
    method,
    headers,
    body,
    duplex: "half",
  });
}

test("JSON bodies are delivered as text (every existing handler expects a string)", async () => {
  let seen = null;
  const handler = async (event) => {
    seen = event;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  };
  const res = await adaptNetlifyHandler(handler)(makeRequest({ body: '{"a":1}' }));
  assert.equal(seen.body, '{"a":1}');
  assert.equal(seen.isBase64Encoded, false);
  assert.equal(await res.text(), '{"ok":true}');
});

test("multipart bodies are delivered as bytes (base64 + isBase64Encoded)", async () => {
  // A byte sequence that is NOT valid UTF-8 — exactly what a PDF/PNG contains.
  const invalidUtf8 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  let seen = null;
  const handler = async (event) => {
    seen = event;
    return { statusCode: 200, body: "{}" };
  };

  await adaptNetlifyHandler(handler)(
    makeRequest({ contentType: "multipart/form-data; boundary=----X", body: invalidUtf8 }),
  );

  assert.equal(seen.isBase64Encoded, true, "a binary body must be flagged as base64");
  const roundTripped = Buffer.from(seen.body, "base64");
  assert.ok(
    roundTripped.equals(invalidUtf8),
    "the binary payload changed in transit — the adapter decoded it as UTF-8",
  );
});

test("responses can be binary too", async () => {
  const bytes = Buffer.from([0x00, 0xff, 0x10]);
  const handler = async () => ({ statusCode: 200, isBase64Encoded: true, body: bytes.toString("base64") });
  const res = await adaptNetlifyHandler(handler)(makeRequest({ body: "{}" }));
  const received = Buffer.from(await res.arrayBuffer());
  assert.ok(received.equals(bytes), "binary response bodies are mangled");
});

test("GET never tries to read a body", async () => {
  let seen = null;
  const handler = async (event) => {
    seen = event;
    return { statusCode: 200, body: "{}" };
  };
  await adaptNetlifyHandler(handler)(makeRequest({ method: "GET", contentType: "", body: undefined }));
  assert.equal(seen.body, "");
});
