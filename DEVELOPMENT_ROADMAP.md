# IIIAK Development Roadmap

## Phase 1: Performance and stability

Status: implemented in this release.

- Parse PDF, DOCX, and PPTX files in a module Web Worker with progress events.
- Split very large text in the worker and keep a compatibility fallback.
- Use hierarchical map/reduce summarization instead of concatenating independent summaries.
- Load Three.js, jsPDF, html2canvas, Mammoth, JSZip, and PDF.js only when needed.
- Pause 3D when hidden or offscreen and dispose WebGL resources correctly.
- Add automatic/manual Battery Saver based on reduced motion, Save-Data, CPU, memory, and battery.
- Add a real PWA manifest, service worker, local icons, runtime caching, and update handling.
- Cache profiles, course lists, course contents, and flashcard progress in IndexedDB.
- Queue XP/study actions offline and replay them after reconnection.
- Add optimized local avatar images and a licensed CC0 frame pack.

## Phase 2: AI quality and million-character documents

Priority: next.

1. Persist each processing job and chunk state so a refresh can resume instead of restarting.
2. Add content fingerprints to prevent duplicate chunks and repeated billing.
3. Build a document outline pass before the map stage: language, subject, headings, page ranges, and glossary.
4. Run specialized map prompts for definitions, laws, examples, tables, and exam points.
5. Reduce summaries hierarchically with source-part metadata and coverage checks.
6. Add a final verifier that compares extracted key terms against the final summary and retries missing sections.
7. Store page citations with every summary section so the student can jump to the source.
8. Stream progress and partial results from a server job instead of keeping a long browser request open.

### Router policy

- Development/free mode: `openrouter/free`, accepting that the selected model is random and availability/rate limits vary.
- Quality mode: `openrouter/auto`, with a user-visible spend cap.
- Production reliability: a task-specific primary model plus an ordered `models` fallback list.
- Structured JSON tasks must request structured-output-capable models and validate the schema before saving.
- Log the actual returned model, latency, token usage, retries, and task type for quality evaluation.
- Never send a million characters in one prompt; use worker extraction, chunk maps, hierarchical reduction, and verification.

OpenRouter references:

- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://openrouter.ai/docs/guides/routing/auto-model-selection
- https://openrouter.ai/docs/guides/routing/model-fallbacks

## Phase 3: Offline-first study

- Download/remove a course explicitly for offline use and show storage size.
- Cache course media and generated attachments, not only text records.
- Add conflict-aware progress records with operation IDs and server acknowledgements.
- Provide a sync center showing pending, failed, and completed operations.
- Add storage quotas, LRU cleanup, and an offline readiness test.

## Phase 4: Product and cosmetics

- Separate cosmetic rarity from price and calculate prices from earn rate, not visual similarity.
- Add preview-before-purchase, categories, search, and reduced-motion previews.
- Expand only with assets that have a recorded commercial license and local optimized copies.
- Keep AIK as the assistant face and add expression states, lip movement, and optional voice without loading a full 3D model by default.
- Add lightweight animated WebP/Lottie skins; load full 3D mascot skins only on demand.

## Phase 5: Quality gates

- Unit tests for chunk boundaries, JSON repair, merge coverage, queue replay, and pricing.
- Integration tests for large PDF extraction, cancellation, retry, refresh-resume, and offline launch.
- Mobile performance budgets for initial JavaScript, memory, long tasks, FPS, and battery usage.
- Accessibility checks for keyboard flow, focus, contrast, RTL, reduced motion, and screen readers.
- Error monitoring with release versions and privacy-safe AI request telemetry.
