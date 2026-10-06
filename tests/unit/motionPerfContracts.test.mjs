/**
 * Motion performance contracts — regression guards for the compositor budget.
 *
 * Context (measured on Dashboard, Sep 2026): animated `filter: drop-shadow()`
 * keyframes repaint every frame on the main thread (no compositor path exists
 * for filters). With ~10 icons in the hero + 3 per course card, scroll work
 * (scrollbar updates, marquee, canvas sequence) starved and every animation
 * read as "delayed". A window-level getBoundingClientRect on every pointermove
 * (Saturn parallax) forced reflow mid-scroll. These tests pin the
 * source-level contracts that keep the hot paths paint-free. They read the
 * shipped source directly — if someone reintroduces the pattern, CI fails
 * with the reason in the assertion message.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIREBASE_ENV_VARS } from "../../src/lib/firebaseConfig.js";

const read = (p) => readFileSync(p, "utf8");

test("AnimatedMicroIcons never animates filter (static glow only)", () => {
  const src = read("src/components/ui/AnimatedMicroIcons.jsx");
  assert.equal(
    /filter:\s*\[/.test(src),
    false,
    "framer `filter: [...]` keyframes found — animating drop-shadow repaints " +
    "every frame on the main thread and starved the compositor during scroll. " +
    "Keep the glow static (filter in `style`) and animate transform/opacity only."
  );
  assert.ok(
    src.includes("drop-shadow"),
    "static glow was removed too — visual regression; keep drop-shadow in style, not in animate"
  );
});

test("CinematicTiltCard: pointer path is ref-driven (no setState per mousemove)", () => {
  const src = read("src/components/ui/CinematicTiltCard.jsx");
  for (const banned of ["setCoords", "setTilt"]) {
    assert.equal(src.includes(banned), false, `state-setter "${banned}" is back — that design re-rendered the whole card subtree 60-120x/s`);
  }
  assert.ok(src.includes("requestAnimationFrame"), "rAF loop missing");
  assert.ok(src.includes('"--mx"'), "glow anchor must be written via CSS custom properties");
  // Per-frame writes go through the single tick(), not React state.
  assert.ok(src.includes("a.dirty = true"), "pointermove must mark dirty + wake the loop, not setState");
});

test("CardSpotlight: mousemove writes CSS vars through frameScheduler, not state", () => {
  const src = read("src/components/ui/CardSpotlight.jsx");
  assert.equal(src.includes("setPosition"), false, "setPosition state writes reintroduced in the mousemove path");
  assert.ok(src.includes('"--sx"') && src.includes("mutate("), "glow anchor must go through mutate() + CSS custom properties");
});

test("MagneticButton: JS transform on its own layer, CSS scale on a nested element", () => {
  const src = read("src/components/ui/MagneticButton.jsx");
  assert.ok(src.includes("translate3d"), "magnetic loop must write translate3d");
  assert.ok(
    src.includes("hover:scale-[1.02]"),
    "scale layer separated from the JS-transform layer was removed — CSS transition would re-interpolate the JS writes again"
  );
});

test("SaturnCosmos3D: no layout reads in the pointermove hot path", () => {
  const src = read("src/components/dashboard/SaturnCosmos3D.jsx");
  assert.equal(
    /handlePointerMove[\s\S]{0,400}?getBoundingClientRect/.test(src),
    false,
    "getBoundingClientRect inside pointermove forces reflow on every mouse move (scroll jank) — cache viewport dims on resize instead"
  );
});

test("usePullToRefresh: listeners subscribed once (effect deps exclude pullDistance)", () => {
  const src = read("src/hooks/usePullToRefresh.js");
  const depMatch = src.match(/},\s*\[([^\]]*)\]\);/);
  assert.ok(depMatch, "effect dependency array not found");
  assert.equal(
    depMatch[1].includes("pullDistance"),
    false,
    "pullDistance in the effect deps re-subscribes three window listeners on every touchmove tick"
  );
});

test("KineticTextReveal: no permanent will-change layers on heading words", () => {
  const src = read("src/components/ui/KineticTextReveal.jsx");
  assert.equal(
    src.includes("will-change-transform"),
    false,
    "one compositor layer per word is permanent RAM + repaint cost — WebKit hoards will-change memory; drop it (animation is one-shot)"
  );
});

test("SmartDailyPlanBanner: every sound helper it calls is imported", () => {
  const src = read("src/components/dashboard/SmartDailyPlanBanner.jsx");
  const calls = [...src.matchAll(/\bplay[A-Z]\w*\(/g)].map((m) => m[0].slice(0, -1));
  assert.ok(calls.length > 0, "expected at least one play*() call");
  for (const fn of calls) {
    assert.ok(
      new RegExp(`import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}\\s*from`).test(src),
      `${fn}() is called but never imported — ReferenceError at runtime (killed the focus-session celebration phase)`
    );
  }
});

test("firebase.js validates config before init and reports missing vars", () => {
  const src = read("src/lib/firebase.js");
  assert.ok(
    src.includes("validateFirebaseConfig"),
    "config validation removed — a missing VITE_FIREBASE_API_KEY would surface as a generic auth/invalid-api-key again"
  );
  assert.ok(
    src.includes("firebaseConfigWarning"),
    "warning message helper missing from firebase.js"
  );
});

test("gsap entrances on Landing/Dashboard respect prefers-reduced-motion", () => {
  for (const page of ["src/pages/Landing.jsx", "src/pages/Dashboard.jsx"]) {
    const src = read(page);
    // A page may legitimately run no gsap entrances at all (even better for
    // idle time). The contract only applies WHEN a gsap context exists.
    if (!/gsap\.context/.test(src)) continue;
    assert.ok(
      /prefers-reduced-motion/.test(src),
      `${page} runs gsap entrances unconditionally — must gate on prefers-reduced-motion`
    );
  }
});

test(".env.example documents all six Firebase client vars", () => {
  const example = read(".env.example");
  for (const key of FIREBASE_ENV_VARS) {
    assert.ok(example.includes(key), `.env.example is missing ${key}`);
  }
});

test("BottomTabBar never animates filter (static glow, transform motion)", () => {
  const src = read("src/components/BottomTabBar.jsx");
  assert.equal(
    /filter:\s*\[/.test(src),
    false,
    "animated drop-shadow keyframes reintroduced in the tab bar — repaints every frame on the main thread"
  );
});

test("Layout: MotionConfig must not force reducedMotion=always from saver mode", () => {
  const src = read("src/components/Layout.jsx");
  assert.equal(
    src.includes('reducedMotion={isPowerSaver'),
    false,
    "saver detection can flip ON mid-session (battery/connection signals) and silently kills every whileHover/whileTap — the scroll-to-unlock hover bug. Use reducedMotion=user; power-saver gating belongs to WebGL/preloader only."
  );
  assert.ok(src.includes('reducedMotion="user"'), "expected reducedMotion=user");
});

test("Layout uses logical properties for the sidebar offset (RTL-safe)", () => {
  const src = read("src/components/Layout.jsx");
  assert.equal(
    src.includes('md:mr-64') || src.includes('md:ml-64'),
    false,
    "physical margins are direction-dependent — use md:ms-64 + start-0 so RTL/LTR share one rule"
  );
  assert.ok(src.includes("md:ms-64") && src.includes("start-0"), "logical sidebar anchoring missing");
});

test("btn-primary-glow: static box-shadow only, never a ::before halo", () => {
  const css = read("src/index.css");
  const block = css.match(/\.btn-primary-glow\s*\{[\s\S]*?\n  \}/);
  assert.ok(block, ".btn-primary-glow block not found");
  assert.equal(
    block[0].includes("position: relative"),
    false,
    ".btn-primary-glow grew positioning scaffolding again — that was the ::before halo experiment that painted a visible blue band around every glowing button (user-vetoed)"
  );
  assert.equal(
    /\.btn-primary-glow::before/.test(css),
    false,
    "::before halo rule reintroduced on .btn-primary-glow — user vetoed the blue ring; glow stays a static box-shadow"
  );
});

test("scan-line animates transform only (never layout properties)", () => {
  const css = read("src/index.css");
  const block = css.match(/@keyframes scan-vert \{[\s\S]*?\n  \}/);
  assert.ok(block, "scan-vert keyframes not found");
  assert.equal(
    /\btop:/.test(block[0]),
    false,
    "scan-vert animates `top` again — layout+paint every frame for 3.5s infinite on the hero glass card, and button hovers inside it queue behind those repaints"
  );
  assert.ok(block[0].includes("translateY"), "scan-vert must sweep via transform");
});

test("repeated-list icon contexts pass animated={false} (compositor budget)", () => {
  // Course-card badges render 3 icons per card (3N on a full library) and the
  // sidebar renders 10 on every page — infinite keyframes there meant the app
  // was NEVER idle (the measured Dashboard-vs-Landing asymmetry).
  const courseCard = read("src/components/CourseCard.jsx");
  assert.ok(
    courseCard.includes("animated={false}"),
    "course-card badge icons animate infinitely per card again — pass animated={false} in repeated grid contexts"
  );
  const layout = read("src/components/Layout.jsx");
  const falseCount = (layout.match(/animated=\{false\}/g) || []).length;
  assert.ok(
    falseCount >= 2,
    "sidebar nav icons must use animated={false} (nav mounts on every page and never unmounts)"
  );
});

test("AnimatedMicroIcons exposes the animated prop on motion icons (loaders excluded)", () => {
  const src = read("src/components/ui/AnimatedMicroIcons.jsx");
  const count = (src.match(/animated = true/g) || []).length;
  // Lightning, Brain, Document, Trophy, Flame, Rocket, BotCore, Upload, Success
  assert.ok(
    count >= 9,
    `expected the animated prop on all 9 motion icons, found ${count} — a new icon may be missing the density escape hatch`
  );
  // Loaders/spinners intentionally keep animating: they exist to show activity.
  const loader = src.match(/export const AnimatedLoader[\s\S]*$/);
  assert.ok(loader, "AnimatedLoader not found");
  assert.equal(
    loader[0].includes("animated = true"),
    false,
    "AnimatedLoader must stay always-on (a paused spinner is meaningless)"
  );
});

test("CinematicTiltCard glow overlays ride the @property glide (no per-frame React gradients)", () => {
  const src = read("src/components/ui/CinematicTiltCard.jsx");
  // commit 56bc503 built the .tilt-glow/.tilt-gleam @property interpolation —
  // the component must actually use it, or the glow teleports with the spring
  // (the measured Dashboard-vs-Landing feel gap) and React serializes the
  // gradient background string on every render.
  assert.ok(
    /className=["'`]tilt-glow /.test(src),
    "glow overlay is not using the .tilt-glow @property glide class — the laser anchor teleports instead of gliding"
  );
  assert.ok(
    /className=["'`]tilt-gleam /.test(src),
    "gleam overlay is not using the .tilt-gleam @property glide class"
  );
  assert.equal(
    /background:\s*`radial-gradient/.test(src),
    false,
    "React is serializing a radial-gradient string again — the gradient lives in index.css (.tilt-glow/.tilt-gleam), fed by --glow-color"
  );
});

test("pulse-dot ring animates transform/opacity only (never box-shadow)", () => {
  const css = read("src/index.css");
  const block = css.match(/@keyframes pulse-ring \{[\s\S]*?\n  \}/);
  assert.ok(block, "pulse-ring keyframes not found");
  assert.equal(
    /box-shadow/.test(block[0]),
    false,
    "pulse-ring animates box-shadow again — main-thread repaint every frame, infinite, on the hero chip inside the tilt card (hover work queued behind it)"
  );
  assert.ok(
    /transform: scale/.test(block[0]) && /opacity/.test(block[0]),
    "pulse-ring must scale+fade a pseudo-element ring (compositor-only)"
  );
});

test("UnlockProButton: static glow, no infinite box-shadow animation, no stale transition-all", () => {
  const src = read("src/components/ui/UnlockProButton.jsx");
  assert.equal(
    /animation:[^;]*proBreath|@keyframes\s+proBreath/.test(src),
    false,
    "the infinite breathing box-shadow glow is back — repaints every frame exactly while the user hovers; glow must be static"
  );
  assert.ok(
    !src.includes("transition-all"),
    "transition-all drags framer's mount transform into the hover transition inside cards — transition specific properties instead"
  );
  assert.ok(
    /border-radius:\s*1rem/.test(src),
    "unlock button radius is no longer utility-overridable (proportion contract)"
  );
});

test("hero-adjacent interactive elements avoid transition-all + hover scale", () => {
  // The atmosphere-switcher trigger and the daily-plan CTA sit inside/near
  // tilt cards — the exact spot where transition-all + per-hover scale reads
  // as 'delayed neon' on every machine.
  const switcher = read("src/components/theme/StudyAtmosphereSwitcher.jsx");
  const trigger = switcher.match(/Trigger Button[\s\S]*?createPortal/);
  assert.ok(trigger, "switcher trigger block not found");
  assert.equal(
    trigger[0].includes("transition-all"),
    false,
    "atmosphere switcher trigger uses transition-all again (drags framer mount transform into hover)"
  );
  assert.equal(
    /hover:scale/.test(trigger[0]),
    false,
    "hover scale on the switcher trigger jitters against the tilt card's transform — feedback = border/bg colors only (§7)"
  );

  const banner = read("src/components/dashboard/SmartDailyPlanBanner.jsx");
  assert.equal(
    banner.includes("hover:shadow-"),
    false,
    "daily-plan CTA animates box-shadow on hover again — repaints the full glow gradient banner per flip"
  );
  assert.ok(
    banner.includes("btn-lift"),
    "daily-plan CTA lost the btn-lift recipe (transform-only press feedback)"
  );
});

test("sidebar shell: no backdrop-filter on the root, no transition-all in the menu", () => {
  // Measured: the sidebar root carried blur(32px) while its nav is an
  // overflow-y-auto container — every menu scroll tick re-rasterized the
  // blur bands (~4.5M texture samples/frame at 260px × 1080p × ~16 taps),
  // and every hover layer flip re-sampled the backdrop again. The gradient
  // underneath is 95-98% opaque, so the blur was invisible anyway.
  const src = read("src/components/Layout.jsx");
  const sidebar = src.match(/const sidebar = \([\s\S]*?return \(/);
  assert.ok(sidebar, "sidebar JSX block not found");
  assert.equal(
    /backdropFilter|backdrop-blur/.test(sidebar[0]),
    false,
    "backdrop-filter is back on the sidebar — its nav is a scroll container, so every scroll tick re-rasterizes the blur (§6); the near-opaque gradient makes the blur invisible anyway"
  );
  assert.equal(
    sidebar[0].includes("transition-all"),
    false,
    "transition-all reintroduced in the sidebar menu — hover layer flips re-transition every property (the 'intensive render while scrolling the menu' report)"
  );
});

test("Button: explicit transition list, no hover:scale, no blur on transformed buttons", () => {
  const src = read("src/components/ui/button.jsx");
  // Strip line comments — the ban is on CODE, and the rationale comments
  // legitimately name the banned patterns (learned from the proBreath false
  // positive: bans must match usage, not documentation).
  const code = src.replace(/^\s*\/\/.*$/gm, "");
  assert.equal(
    code.includes("transition-all"),
    false,
    "transition-all is back on the Button base — it drags every property (incl. framer mount transforms) into the hover path app-wide"
  );
  assert.equal(
    code.includes("hover:scale"),
    false,
    "hover:scale is back on Button variants — per-hover layer churn + fights JS transforms inside cards (§7)"
  );
  assert.equal(
    /backdrop-blur|backdropFilter/.test(code),
    false,
    "backdrop-filter on a hover-transformed button re-samples its backdrop every hover frame — use a solid tint (the glass read survives)"
  );
});

test("useSmoothScroll: ref-driven wheel glide with native-scroll gates", () => {
  const src = read("src/lib/useSmoothScroll.js");
  const code = src.replace(/^\s*\/\/.*$/gm, "");
  // The wheel path must never touch React state (§2 pointer-effect pattern,
  // applied to scroll) and must ride the tested motionMath.damp.
  assert.equal(
    /useState|setState/.test(code),
    false,
    "useSmoothScroll stores wheel state in React state — refs + self-parking rAF only; setState per wheel event re-renders the whole Layout"
  );
  assert.ok(code.includes("damp"), "glide must use motionMath.damp (frame-rate independent)");
  // Gates: every one of these keeps native scrolling when matched.
  assert.ok(/prefers-reduced-motion/.test(code), "reduced-motion gate missing — smoothing is motion, it must stay native");
  assert.ok(code.includes("ctrlKey"), "pinch-zoom gate missing — trackpad zoom must not be hijacked");
  assert.ok(code.includes("enabledRef.current"), "power-saver gate missing — saver must flip back to native live");
  assert.ok(code.includes("findScrollableAncestor"), "inner-scrollable gate missing — the sidebar menu would stop scrolling natively");
  assert.ok(code.includes("passive: false"), "wheel listener must be non-passive or preventDefault throws");
});

test("canvas 2D scenes glow via pre-rendered sprites, never per-frame shadowBlur", () => {
  // 180 shadow-filled arcs/frame = a multi-pass blur rasterization per
  // particle per frame (the 3D-gallery heavy path). Sprites + globalAlpha
  // drawImage give the same glow for a fraction of the cost.
  for (const file of [
    "src/components/ui/CinematicHoloVisualizer.jsx",
    "src/components/ui/NeuralCore3D.jsx",
  ]) {
    const code = read(file).replace(/^\s*\/\/.*$/gm, "");
    assert.equal(
      code.includes("shadowBlur"),
      false,
      `${file} sets ctx.shadowBlur per particle again — per-frame multi-pass blur rasterization; pre-render glow sprites and drawImage with globalAlpha`
    );
    assert.ok(
      code.includes("drawImage") && code.includes("globalAlpha"),
      `${file} lost the sprite draw path (drawImage + globalAlpha)`
    );
  }
});

test("NeuralCore3D animates with delta-time (frame-rate independent)", () => {
  const code = read("src/components/ui/NeuralCore3D.jsx").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(
    /angle \+= [\d.]+ \* step/.test(code),
    "angle advances per-frame again — on 120Hz displays the core spins 2× fast; integrate with the clamped dt step like every other scene"
  );
  const resumeBlock = code.match(/const resume = \(\) => \{[\s\S]*?\n    \};/);
  assert.ok(resumeBlock && resumeBlock[0].includes("lastTime = performance.now()"),
    "resume() must reset lastTime or the first frame after tab-return/scroll-in lurches");
});

test("soundSynthesizer: no AudioContext escapes until the autoplay policy allows it", () => {
  // Chrome warns 'The AudioContext was not allowed to start' 16x when
  // playSwoosh (route changes) created/resumed the context before any user
  // gesture. The context must be created lazily, unlocked on a real gesture,
  // and getAudioContext must return null while it is still suspended (every
  // play* caller already guards on null → pre-gesture calls are silent no-ops).
  const code = read("src/lib/soundSynthesizer.js").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(
    code.includes("registerGestureUnlock"),
    "gesture unlock missing — the context is never created/resumed on a user gesture"
  );
  assert.ok(
    /pointerdown[\s\S]{0,200}keydown[\s\S]{0,200}touchend/.test(code),
    "gesture unlock must listen to pointerdown/keydown/touchend (desktop + mobile)"
  );
  assert.equal(
    /return this\.ctx;/.test(code),
    false,
    "getAudioContext returns the raw context again — suspended contexts make Chrome log an autoplay error per call; return null unless state === 'running'"
  );
});

test("firebaseDb: db is null when unconfigured — never a truthy {} that defeats guards", () => {
  // db = database || {} made every `if (!db)` guard in firestore.js lie
  // (!{} === false), so collection({}, name) threw 'Expected first argument
  // to collection()' on every query without Firebase env vars.
  const code = read("src/lib/firebaseDb.js").replace(/^\s*\/\/.*$/gm, "");
  assert.equal(
    /database \|\| \{\}/.test(code),
    false,
    "db falls back to {} again — the truthy empty object defeats every !db guard and turns config issues into collection() TypeErrors"
  );
  assert.ok(/export const db = database;/.test(code), "db must export the real handle or null");
});

test("AnimatedMicroIcons static tier sets opacity via style, never animate-without-initial", () => {
  // animate={{ opacity: 0.7 }} with no initial fired framer's 'animating
  // opacity from undefined' warning 32x (the sidebar's 10 static icons).
  const code = read("src/components/ui/AnimatedMicroIcons.jsx").replace(/^\s*\/\/.*$/gm, "");
  const badAnimate = code
    .split("\n")
    .some((l) => l.includes("animate=") && /:\s*\{\s*opacity:\s*[\d.]+\s*\}\s*\}/.test(l));
  assert.equal(
    badAnimate,
    false,
    "a static animate={{ opacity: N }} branch is back — framer warns 'animating opacity from undefined' (no initial); set opacity via style instead"
  );
});

test("aurora orbs: no filter blur on animated fixed layers", () => {
  // Root-system defect: 3 fixed orbs (480/380/300px) animated transform while
  // carrying filter: blur(70-90px) — a moving blurred layer re-rasterizes its
  // blur EVERY frame, ~3M+ texture samples/frame, on every page, forever
  // (the balanced-mode menu lag). The radial-gradient stops are the falloff.
  const css = read("src/index.css");
  for (const orb of ["cyan", "purple", "gold"]) {
    const block = css.match(new RegExp(`\\.aurora-orb-${orb} \\{[\\s\\S]*?\\n  \\}`));
    assert.ok(block, `aurora-orb-${orb} block missing`);
    assert.equal(
      /filter:\s*blur/.test(block[0]),
      false,
      `aurora-orb-${orb} carries a blur filter while animating — moving blurred layers re-rasterize per frame; bake the falloff into the gradient stops`
    );
    assert.ok(
      /will-change:\s*transform/.test(block[0]),
      `aurora-orb-${orb} layer not pinned — the infinite transform must stay compositor-side`
    );
  }
});

test("summary popup: solid shell, unblurred scroll container, no sticky blur header", () => {
  const code = read("src/components/course/AssistantLanguagePopup.jsx")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\//g, ""); // strip JSX block comments too
  assert.equal(
    /glass-card[^"`]*overflow-y-auto|overflow-y-auto[^"`]*glass-card/.test(code),
    false,
    "the backdrop-filtered shell is the scroll container again — every scroll frame re-rasterizes the blur bands (§6, the twitchy upload popup)"
  );
  assert.equal(
    /sticky[\s\S]{0,200}backdrop-blur|backdrop-blur[\s\S]{0,200}sticky/.test(code),
    false,
    "sticky backdrop-blur header is back — re-rasterizes while the body scrolls; static shrink-0 header instead"
  );
  assert.equal(
    code.includes("transition-all"),
    false,
    "transition-all inside the popup (option grids churn layers while the sheet scrolls)"
  );
});

test("balanced 3D tier keeps compositing on the main GPU", () => {
  const code = read("src/lib/webglQuality.js").replace(/^\s*\/\/.*$/gm, "");
  const balanced = code.match(/balanced:\s*\{[^}]*\}/);
  assert.ok(balanced, "balanced preset missing");
  assert.equal(
    balanced[0].includes("low-power"),
    false,
    "powerPreference 'low-power' steers COMPOSITING onto the integrated GPU on hybrid systems — compositing is most of the frame cost (balanced-mode lag); the DPR/AA caps carry the power saving"
  );
});

test("every pdfjs getDocument has a paired destroy (memory leak guard)", () => {
  // The '1GB after navigating' report: extractPdfTextClient and
  // extractImagesFromPdf never called loadingTask.destroy() — each upload
  // retained the file buffer + parsed page structures (≈3-4× file size)
  // until GC felt like it, and repeated uploads piled up hundreds of MB.
  // Parity rule: every pipeline that opens a PDF must release it (a missing
  // destroy on ANY getDocument fails this test).
  for (const file of [
    "src/lib/fileProcessing.js",
    "src/lib/imageExtractor.js",
    "src/lib/ocr.js",
  ]) {
    const code = read(file).replace(/^\s*\/\/.*$/gm, "");
    const opened = (code.match(/getDocument\(/g) || []).length;
    const released = (code.match(/\.destroy\(\)/g) || []).length;
    assert.equal(
      released,
      opened,
      `${file}: ${opened} getDocument() vs ${released} destroy() — a pdf document outlives its pipeline and retains the file buffer (the 1GB memory-growth report)`
    );
  }
});

test("FlashcardsView arrows are gated (offscreen, typing, dialogs, IME)", () => {
  // The keyboard 'resistance' report: global arrow handlers consumed keys
  // while the flashcards sat below the fold (dashboard page would not scroll
  // with arrows) and while typing. The handler must no-op in every case.
  const code = read("src/components/course/FlashcardsView.jsx").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(code.includes("viewOnscreen"), "offscreen gate missing — arrows must not fight page scroll when the view is below the fold");
  assert.ok(code.includes("isContentEditable") && code.includes("TEXTAREA"), "typing gate missing — keys must pass through inputs/textareas/contenteditable");
  assert.ok(code.includes('[role="dialog"]'), "dialog gate missing — arrows must not navigate behind open dialogs");
  assert.ok(code.includes("isComposing"), "IME gate missing — Arabic virtual keyboards emit composition keydowns that must pass through");
});

// ─── Kandil455-port regression pins (added during the cheatsheet audit) ─────

test("no transition-all on hover-bearing lines outside mockups", async () => {
  const { execSync } = await import("node:child_process");
  let hits = "";
  try {
    hits = execSync(
      `grep -rn "transition-all" src/ --include='*.jsx' | grep "hover:" | grep -v mockups || true`,
      { encoding: "utf8" }
    );
  } catch { /* grep no-match = clean */ }
  assert.equal(
    hits.trim(),
    "",
    `transition-all reintroduced on interactive elements (§7): ${hits.split("\n").slice(0, 3).join(" | ")}`
  );
});

test("LottieIcons glow is static (no animated filter arrays)", () => {
  const src = read("src/components/ui/LottieIcons.jsx");
  assert.equal(
    /filter:\s*\[/.test(src),
    false,
    "per-frame drop-shadow keyframes reintroduced in LottieIcons — main-thread repaint per frame (§4)"
  );
});

test("Focus-Room overlay never combines backdrop-blur with its scroll container", () => {
  const src = read("src/components/dashboard/SmartDailyPlanBanner.jsx");
  assert.equal(
    /backdrop-blur[^"']*overflow-y-auto|overflow-y-auto[^"']*backdrop-blur/.test(src),
    false,
    "the blur shell is the scroll container again — re-rasterizes every scroll frame (§6)"
  );
});

test("Landing page uses clean static LineVault sections without mounting heavy 3D WebGL or tilt-card hover-lift", () => {
  const src = read("src/pages/Landing.jsx");
  assert.equal(
    /<HellKnight3DBackground/.test(src),
    false,
    "Landing page must stay clean and free of the heavy 3D WebGL background in the unified LineVault design"
  );
  const comp = read("src/components/ui/HellKnight3DBackground.jsx");
  assert.ok(
    comp.includes("use3DQuality") && comp.includes("prefersReducedMotion"),
    "HellKnight3DBackground component must keep its saver/knob/reduced-motion gates"
  );
});

test("HellKnight scene honors power/reduced-motion/memory contracts (§4/§5/§9)", () => {
  const src = read("src/components/ui/HellKnight3DBackground.jsx");
  assert.ok(src.includes("use3DQuality"), "scene must consult use3DQuality — Battery Saver + heavy-3D knob decide whether WebGL runs at all");
  assert.ok(src.includes("prefersReducedMotion"), "scene must honor prefers-reduced-motion (§8)");
  assert.ok(src.includes("createResolutionGovernor"), "scene must auto-step resolution on sustained slow frames (§5)");
  assert.ok(/geometry\??\.dispose/.test(src), "scene must dispose geometries/materials/textures on unmount — the GLTF RAM leak (§9)");
  assert.ok(src.includes("visibilityGate") || /sceneOnScreen/.test(src), "loop must park when the scene is offscreen (§5 render-on-demand)");
});

test("progress bars animate compositor properties, never width (§1)", async () => {
  const { execSync } = await import("node:child_process");
  let hits = "";
  try {
    hits = execSync(
      `grep -rn 'animate={{ width:' src/pages/ src/components/ --include='*.jsx' | grep -v mockups; grep -rn 'animate={{ height:' src/pages/ src/components/ --include='*.jsx' | grep -v 'height: "auto"' | grep -v mockups || true`,
      { encoding: "utf8", shell: "/bin/bash" }
    );
  } catch { /* no match = clean */ }
  assert.equal(
    hits.trim(),
    "",
    `width/height animation reintroduced (§1 layout+paint per frame): ${hits.split("\n")[0]}`
  );
});

// ─── Landing cards: the 15-card hover/scroll tax (cards audit) ─────────────

test("CinematicTiltCard scroll invalidation never boots the rAF loop (§5)", () => {
  const src = read("src/components/ui/CinematicTiltCard.jsx");
  const effect = src.slice(
    src.indexOf("While hovered, scrolling invalidates"),
    src.indexOf("}, [hovered]);")
  );
  assert.ok(effect.length > 0, "scroll-invalidation effect moved or renamed");
  assert.ok(
    /requestAnimationFrame/.test(effect),
    "scroll invalidation must be rAF-throttled to one flag-set per scroll frame"
  );
  assert.ok(
    !/\bwake\(\)/.test(effect),
    "scroll handler boots the loop again — a hover during scroll started a 60fps getBoundingClientRect rAF per card × 10 cards"
  );
});

test("CardSpotlight scroll invalidation is rAF-throttled, never a per-event closure", () => {
  const src = read("src/components/ui/CardSpotlight.jsx");
  const effect = src.slice(
    src.indexOf("Scrolling while the glow is active invalidates"),
    src.indexOf("}, [active]);")
  );
  assert.ok(effect.length > 0, "scroll-invalidation effect moved or renamed");
  assert.ok(
    /requestAnimationFrame/.test(effect),
    "scroll invalidation must be rAF-throttled — the old handler churned a closure per scroll event × 14 cards"
  );
  assert.ok(
    !/setActive\(/.test(effect),
    "scroll handler must never touch React state"
  );
});

test("knight resolution governor only samples full-budget frames (§5A)", () => {
  const src = read("src/components/ui/HellKnight3DBackground.jsx");
  const at = src.indexOf("createResolutionGovernor(renderer");
  const call = src.slice(at, at + 240);
  assert.ok(
    /slowMs:\s*33/.test(call) && /fastMs:\s*20/.test(call),
    "governor thresholds reverted — default slowMs=22 reads the 33ms ambient budget as 'sustained slow' and permanently degraded the knight to 0.55× DPR (recovery needs <13ms = 144Hz)"
  );
  assert.ok(
    /frameBudget === FRAME_BUDGET\.full\) governance\(\)/.test(src),
    "governor must sample ONLY full-budget frames — ambient frames are budget-paced (33ms by design), not performance-paced"
  );
});

test("knight visibilityGate does one layout read per scroll frame, not per event", () => {
  const src = read("src/components/ui/HellKnight3DBackground.jsx");
  const gate = src.slice(
    src.indexOf("const visibilityGate"),
    src.indexOf('window.addEventListener("scroll", visibilityGate')
  );
  assert.ok(gate.length > 0, "visibilityGate moved or renamed");
  assert.ok(
    /visibilityQueued/.test(gate) && /requestAnimationFrame/.test(gate),
    "visibilityGate must rAF-throttle its getBoundingClientRect — it is a fixed full-viewport layer and ran a forced layout per scroll event"
  );
});

test("running knight scene steps the glass tier down; poster mode keeps it sharp", () => {
  const src = read("src/components/ui/HellKnight3DBackground.jsx");
  assert.ok(
    src.includes('dataset.scene = "3d"'),
    "scene tier must be published on <html> so card glass steps down while the knight owns frames"
  );
  assert.ok(
    /delete document\.documentElement\.dataset\.scene/.test(src),
    "cleanup must remove the scene tier — every other route keeps the sharp glass"
  );
  const css = read("src/index.css");
  assert.ok(
    /html\[data-scene="3d"\]\s*{[\s\S]{0,200}--blur-card:\s*10px/.test(css),
    "scene glass tier missing — the knight's ambient frames must not fight 28px backdrop-filters on 15 cards"
  );
  const hoverBlock = css.match(/\.ios-glass-card:hover, \.glass-card:hover\s*{[\s\S]*?\n  }/);
  assert.ok(hoverBlock, "glass-card hover rule moved or renamed");
  assert.ok(
    !/box-shadow/.test(hoverBlock[0]),
    "card hover re-interpolates box-shadow again (§4 static glow) — queued paint behind the tilt-glow gradients while the knight rendered"
  );
});

test("Landing never combines hover-lift with the JS-driven tilt transform", () => {
  const src = read("src/pages/Landing.jsx");
  assert.ok(
    !src.includes("hover-lift"),
    "hover-lift re-added to a CinematicTiltCard — its transition: transform re-interpolates every per-frame JS tilt write (the floaty lag, index.css NOTE)"
  );
});

test("every Lottie wrapper forwards loop", () => {
  const src = read("src/components/ui/LottieIcons.jsx");
  const exports = [...src.matchAll(/export const (Lottie[A-Z]\w*)\s*=/g)].map((m) => m[1]);
  assert.ok(exports.length >= 10, "expected exported Lottie icon wrappers");
  for (const name of exports) {
    const fnBlockMatch = src.match(new RegExp(`export const ${name} = memo\\(function ${name}\\(([^)]*)\\)[\\s\\S]*?return \\([\\s\\S]*?<LottieIcon([\\s\\S]*?)\\/>\\s*\\);`));
    assert.ok(fnBlockMatch, `${name} definition or JSX block not found`);
    const [_, params, props] = fnBlockMatch;
    assert.ok(
      params.includes("loop"),
      `${name} does not accept loop prop`
    );
    assert.ok(
      /loop=\{loop\}/.test(props),
      `${name} accepts loop but does not forward loop={loop} to <LottieIcon>`
    );
  }
});

test("ShimmerButton pauses animations until hover and contains no blur-[2px]", () => {
  const src = read("src/components/ui/ShimmerButton.jsx");
  assert.equal(
    src.includes("blur-[2px]"),
    false,
    "blur-[2px] found on ShimmerButton — software filter blur on spark layer repaints; soften via conic gradient color stops instead"
  );
  assert.ok(
    src.includes("[animation-play-state:paused]") && src.includes("group-hover:[animation-play-state:running]"),
    "ShimmerButton must pause its animations ([animation-play-state:paused]) until group-hover"
  );
});

test("Landing contains no backdrop-blur-md marquee pills or inline style objects", () => {
  const src = read("src/pages/Landing.jsx");
  assert.equal(
    src.includes("backdrop-blur-md"),
    false,
    "backdrop-blur-md found on Landing — keep Landing surfaces flat and crisp"
  );
  assert.equal(
    src.includes("style={{"),
    false,
    "inline style={{}} found in Landing.jsx — use LineVault tokens and Tailwind classes only"
  );
});

test("HellKnight custom-event listeners use { signal: inputAC.signal } and activeTheme is not in the main scene deps array", () => {
  const src = read("src/components/ui/HellKnight3DBackground.jsx");
  const stanceMatches = [...src.matchAll(/addEventListener\(\s*["']hellknight-battle-stance["'][^)]*\)/g)].map(m => m[0]);
  const slashMatches = [...src.matchAll(/addEventListener\(\s*["']hellknight-heavy-slash["'][^)]*\)/g)].map(m => m[0]);
  assert.ok(stanceMatches.length > 0 && slashMatches.length > 0, "HellKnight battle stance/heavy slash listeners not found");
  for (const m of [...stanceMatches, ...slashMatches]) {
    assert.ok(
      m.includes("signal: inputAC.signal"),
      `listener "${m}" missing signal: inputAC.signal — leaks on unmount`
    );
  }
  assert.equal(
    /removeEventListener\(\s*["']hellknight-battle-stance["']/.test(src),
    false,
    "stale removeEventListener for hellknight-battle-stance found — rely on inputAC abort signal instead of mismatched function refs"
  );
  assert.equal(
    /removeEventListener\(\s*["']hellknight-heavy-slash["']/.test(src),
    false,
    "stale removeEventListener for hellknight-heavy-slash found — rely on inputAC abort signal instead of mismatched function refs"
  );
  const mainEffectDepsMatch = src.match(/init3D\(\);[\s\S]*?return\s*\(\)\s*=>[\s\S]*?\}, \[(.*?)\]\);/);
  assert.ok(mainEffectDepsMatch, "main scene useEffect dependency array not found");
  assert.equal(
    mainEffectDepsMatch[1].includes("activeTheme"),
    false,
    "activeTheme in main scene useEffect deps array triggers full Three.js scene teardown and re-init on theme click"
  );
});

test("AnimatedTitle/KineticTextReveal animate no filter/box-shadow", () => {
  const titleSrc = read("src/components/profile/AnimatedTitle.jsx");
  assert.equal(
    /animate=\{[^}]*boxShadow/.test(titleSrc),
    false,
    "AnimatedTitle animates boxShadow — repaints every frame; move glow to static style"
  );
  assert.equal(
    /animate=\{[^}]*backgroundPosition/.test(titleSrc),
    false,
    "AnimatedTitle animates backgroundPosition — repaints every frame; use static gradient or transform-only sheen"
  );

  const kineticSrc = read("src/components/ui/KineticTextReveal.jsx");
  assert.equal(
    /filter:\s*["']blur/.test(kineticSrc),
    false,
    "KineticTextReveal animates filter blur — repaints every frame during text entrance; animate opacity and transform only"
  );
});
