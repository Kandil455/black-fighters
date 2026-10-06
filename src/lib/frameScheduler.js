/**
 * frameScheduler.js
 * fastdom-style measure/mutate batching (review warning #4).
 *
 * Layout thrashing happens when DOM reads (getBoundingClientRect/offsetWidth…)
 * and writes (style/class…) interleave inside one frame — every write
 * invalidates layout, so the next read recomputes it. Route ALL measurement
 * through measure() and ALL DOM writes through mutate() so each frame does:
 * read everything → write everything (a single layout pass).
 *
 * Also exports clearWillChangeOnEnd — Safari/WebKit hoards RAM for
 * will-change layers, so promotion must end with the animation (warning #2).
 */

let reads = [];
let writes = [];
let scheduled = false;

function flush() {
  scheduled = false;
  const pendingReads = reads;
  const pendingWrites = writes;
  reads = [];
  writes = [];
  for (const fn of pendingReads) {
    if (typeof fn === "function") fn();
  }
  for (const fn of pendingWrites) {
    if (typeof fn === "function") fn();
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(flush);
}

/** Queue a DOM read (layout query) for the read phase of the next frame. */
export function measure(fn) {
  if (typeof fn !== "function") return;
  reads.push(fn);
  schedule();
}

/** Queue a DOM write (style/class mutation) for the write phase of the same frame. */
export function mutate(fn) {
  if (typeof fn !== "function") return;
  writes.push(fn);
  schedule();
}

/**
 * onAnimationEnd / onTransitionEnd handler: drop a temporary will-change
 * promotion so WebKit stops pinning the extra layer (warning #2).
 * Usage: <motion.div style={{ willChange: "transform" }} onAnimationEnd={clearWillChangeOnEnd} />
 */
export function clearWillChangeOnEnd(event) {
  const target = event?.currentTarget || event?.target;
  if (target && target.style) target.style.willChange = "auto";
}
