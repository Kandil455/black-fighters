/**
 * Multipart parsing for the server-mediated upload endpoint.
 *
 * Why this deserves direct tests: it replaced a browser→Telegram uploader that
 * held the bot token in the client bundle. If this parser is subtly wrong the
 * symptom is a corrupt PDF in a student's library, not an exception — so the
 * boundary/CRLF/base64 cases are pinned here rather than discovered in production.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { parseMultipart } from "../../netlify/functions/telegram-upload.mjs";

const BOUNDARY = "----BFTestBoundary123";

function buildBody({ filename = "slides.pdf", mimeType = "application/pdf", content = Buffer.from("PDF-CONTENT") } = {}) {
  return Buffer.concat([
    Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
}

const CT = `multipart/form-data; boundary=${BOUNDARY}`;

test("parses a single file part with its exact bytes", () => {
  const payload = Buffer.from("PDF-CONTENT-0123456789");
  const files = parseMultipart(buildBody({ content: payload }), CT);
  assert.equal(files.length, 1);
  assert.equal(files[0].filename, "slides.pdf");
  assert.equal(files[0].mimeType, "application/pdf");
  assert.ok(files[0].content.equals(payload), "payload bytes were altered (boundary CRLF handling)");
});

test("binary content survives (no utf8 round-trip corruption)", () => {
  // Every byte value that can appear in a real PDF/PNG stream.
  const payload = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const files = parseMultipart(buildBody({ filename: "scan.png", mimeType: "image/png", content: payload }), CT);
  assert.ok(files[0].content.equals(payload), "high bytes were mangled — the body was decoded as text");
});

test("quoted boundaries parse", () => {
  const files = parseMultipart(buildBody(), `multipart/form-data; boundary="${BOUNDARY}"`);
  assert.equal(files.length, 1);
});

test("base64-encoded bodies (host-emitted) parse correctly", () => {
  const files = parseMultipart(buildBody().toString("base64"), CT, true);
  assert.equal(files.length, 1);
  assert.equal(files[0].content.toString("utf8"), "PDF-CONTENT");
});

test("a trailing CRLF never becomes part of the file", () => {
  const files = parseMultipart(buildBody({ content: Buffer.from("X") }), CT);
  assert.equal(files[0].content.toString("utf8"), "X", "the boundary's CRLF leaked into the uploaded file");
});

test("missing boundary / missing file part / empty body all fail loudly", () => {
  assert.throws(() => parseMultipart(buildBody(), "multipart/form-data"), /INVALID_MULTIPART_BOUNDARY/);
  assert.equal(parseMultipart(buildBody(), CT).length, 1);
  assert.deepEqual(parseMultipart(Buffer.from("not multipart at all"), CT), []);
  assert.deepEqual(parseMultipart("", CT), []);
  // A part that is not the `file` field is ignored.
  const other = Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="note"\r\n\r\nhello\r\n--${BOUNDARY}--\r\n`);
  assert.deepEqual(parseMultipart(other, CT), []);
});
