import test from "node:test";
import assert from "node:assert/strict";
import { normalizeApiBase, apiUrl, resolveMediaUrl } from "../../src/lib/apiBase.js";

const HOST = "https://api.blackfighters.site/api";

test("unset / blank base falls back to same-origin /api (behaviour unchanged)", () => {
  assert.equal(normalizeApiBase(undefined), "/api");
  assert.equal(normalizeApiBase("   "), "/api");
  assert.equal(apiUrl("upload-media", "/api"), "/api/upload-media");
});

test("trailing slashes are trimmed, leading slashes on the name are ignored", () => {
  assert.equal(normalizeApiBase(`${HOST}/`), HOST);
  assert.equal(apiUrl("/youtube-transcript", HOST), `${HOST}/youtube-transcript`);
});

test("resolveMediaUrl only prefixes stored stream-media paths and only for an absolute base", () => {
  const stored = "/api/stream-media?p=documents%2Ffile_1.pdf&t=application%2Fpdf";
  assert.equal(resolveMediaUrl(stored, HOST), `${HOST}/stream-media?p=documents%2Ffile_1.pdf&t=application%2Fpdf`);
  assert.equal(resolveMediaUrl(stored, "/api"), stored);
  assert.equal(resolveMediaUrl("https://cdn.example.com/a.png", HOST), "https://cdn.example.com/a.png");
  assert.equal(resolveMediaUrl("data:image/png;base64,AAAA", HOST), "data:image/png;base64,AAAA");
  assert.equal(resolveMediaUrl("/api/other?x=1", HOST), "/api/other?x=1");
  assert.equal(resolveMediaUrl(undefined, HOST), undefined);
  assert.equal(resolveMediaUrl(null, HOST), null);
});
