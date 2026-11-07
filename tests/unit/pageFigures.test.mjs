/**
 * Pure unit tests for the page-snapshot helpers in src/lib/summaryFigures.js.
 * No browser APIs, no pdf.js, no Firebase writes — the two helpers under test
 * only transform plain arrays, so they run in Node exactly as they do in the app.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeFigureSets,
  pickPageSnapshotTargets,
} from "../../src/lib/summaryFigures.js";

/** Build a figure the way attachPdfPageFiguresToSummary persists page snapshots. */
const pageFigure = (page, url = `https://media.example/page-${page}.jpg`) => ({
  page,
  url,
  kind: "page",
  width: 770,
  height: 1100,
  caption: "",
});

test("pickPageSnapshotTargets: empty/unusable PDF has no targets", () => {
  assert.deepEqual(pickPageSnapshotTargets(), []);
  assert.deepEqual(pickPageSnapshotTargets({}), []);
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 0 }), []);
  assert.deepEqual(pickPageSnapshotTargets({ numPages: -3 }), []);
  assert.deepEqual(pickPageSnapshotTargets({ numPages: Number.NaN }), []);
});

test("pickPageSnapshotTargets: no explicit request targets the first min(max, numPages) pages", () => {
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 10, max: 4 }), [1, 2, 3, 4]);
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 3, max: 12 }), [1, 2, 3]);
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 5 }), [1, 2, 3, 4, 5]);
  // An explicitly empty list is the same thing as "no request".
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 5, requestedPages: [] }), [1, 2, 3, 4, 5]);
});

test("pickPageSnapshotTargets: requested pages are de-duplicated and sorted", () => {
  assert.deepEqual(
    pickPageSnapshotTargets({ numPages: 10, requestedPages: [5, 2, 2, 9, 5, 2] }),
    [2, 5, 9],
  );
});

test("pickPageSnapshotTargets: requested pages are clamped to numPages and invalid entries dropped", () => {
  assert.deepEqual(
    pickPageSnapshotTargets({ numPages: 5, requestedPages: [0, -1, 3, 99, "x", null] }),
    [3, 5],
  );
  // Numeric strings and fractions are accepted (fractions floor).
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 5, requestedPages: ["4", 4.9] }), [4]);
  // An explicit request that parses to nothing attaches nothing — no silent fallback.
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 5, requestedPages: ["x"] }), []);
});

test("pickPageSnapshotTargets: the target list is capped at max", () => {
  assert.deepEqual(
    pickPageSnapshotTargets({
      numPages: 20,
      requestedPages: Array.from({ length: 20 }, (_, index) => index + 1),
      max: 6,
    }),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 5, max: 0 }), []);
});

test("pickPageSnapshotTargets: existing figures with a URL cover their page", () => {
  const existingFigures = [pageFigure(2), { page: 4, url: "  https://media.example/x.jpg  " }];
  assert.deepEqual(
    pickPageSnapshotTargets({ numPages: 6, requestedPages: [1, 2, 3, 4], existingFigures }),
    [1, 3],
  );
  // Default (guarantee) mode also skips covered pages while keeping page order.
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 6, max: 4, existingFigures }), [1, 3]);
});

test("pickPageSnapshotTargets: url-less existing figures are still counted as pages to snapshot", () => {
  const existingFigures = [{ page: 3, width: 800, height: 600, caption: "legacy upload that never rendered" }];
  assert.deepEqual(
    pickPageSnapshotTargets({ numPages: 5, requestedPages: [3], existingFigures }),
    [3],
  );
  assert.deepEqual(pickPageSnapshotTargets({ numPages: 5, max: 4, existingFigures }), [1, 2, 3, 4]);
});

test("mergeFigureSets: empty inputs produce an empty result and never mutate inputs", () => {
  assert.deepEqual(mergeFigureSets(), []);
  assert.deepEqual(mergeFigureSets([], []), []);
  assert.deepEqual(mergeFigureSets(null, undefined), []);

  const existing = [pageFigure(1)];
  const incoming = [pageFigure(2)];
  const existingSnapshot = [...existing];
  const incomingSnapshot = [...incoming];

  const merged = mergeFigureSets(existing, incoming);
  assert.deepEqual(merged, [...existing, ...incoming]);
  assert.notEqual(merged, existing);
  assert.deepEqual(existing, existingSnapshot);
  assert.deepEqual(incoming, incomingSnapshot);

  assert.deepEqual(mergeFigureSets(existing, incoming, { max: 0 }), []);
});

test("mergeFigureSets: existing figures win their page and keep their order", () => {
  const embedded = { page: 2, url: "https://media.example/embedded-2.png", width: 640, height: 480, caption: "" };
  const duplicateSnapshot = pageFigure(5, "https://media.example/duplicate-5.jpg");
  const snapshot5 = pageFigure(5);

  const merged = mergeFigureSets([embedded], [pageFigure(2), duplicateSnapshot, snapshot5]);

  assert.deepEqual(merged, [embedded, duplicateSnapshot]);
  // The exact persisted existing object is preserved (not re-created/copied).
  assert.equal(merged[0], embedded);
});

test("mergeFigureSets: caps the merged list, existing figures first and url-less ones kept", () => {
  const legacy = { page: 1, width: 300, height: 200 }; // persisted before URLs existed
  const existing = [legacy, pageFigure(2), pageFigure(3), pageFigure(4)];

  // Cap smaller than the existing list: only the first `max` existing entries survive.
  assert.deepEqual(mergeFigureSets(existing, [pageFigure(5)], { max: 3 }), [
    legacy,
    existing[1],
    existing[2],
  ]);

  // Cap reached after 4 existing + 1 incoming: page 1 stays covered by the url-less
  // existing figure, so only the uncovered page 5 snapshot is appended.
  const merged = mergeFigureSets(existing, [pageFigure(1), pageFigure(5), pageFigure(6)], { max: 5 });
  assert.deepEqual(merged, [legacy, existing[1], existing[2], existing[3], pageFigure(5)]);
});
