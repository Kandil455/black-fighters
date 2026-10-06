/**
 * CanvasScrollSequence.jsx
 * 
 * A FIXED fullscreen background layer that sits behind ALL page content.
 * The video frames advance as the user scrolls through the ENTIRE page.
 * This is NOT a section — it's a fixed background, like a wallpaper.
 * 
 * Usage: Place once in Landing.jsx. It renders a position:fixed canvas at z-index:0.
 *        All other content must have position:relative and z-index >= 1.
 */
import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_FRAMES = 82;

export default function CanvasScrollSequence() {
  const canvasRef   = useRef(null);
  const imagesRef   = useRef([]);
  const drawnRef    = useRef(-1);
  const rafRef      = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // ── Preload frames: ≤4 in flight, the rest trickle in IDLE time ──────────
  // (was: all 82 at once — a decode/bandwidth burst exactly when the hero text
  //  and Lotties need the main thread on weak devices / 3G)
  useEffect(() => {
    let loaded = 0;
    let active = 0;
    let cancelled = false; // stop idle pumps + setState after unmount (agy §8.1)
    const pending = [];    // idle/timeout handles so cleanup can cancel them
    const imgs = new Array(TOTAL_FRAMES);
    imagesRef.current = imgs;
    const idle = (cb) => {
      if (window.requestIdleCallback) {
        const id = window.requestIdleCallback(cb);
        pending.push({ type: "idle", id });
        return id;
      }
      const id = setTimeout(cb, 80);
      pending.push({ type: "timeout", id });
      return id;
    };

    const markLoaded = (i) => {
      if (cancelled) return;
      loaded += 1;
      setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
      // Draw frame 1 immediately so user never sees a blank screen
      if (i === 1 && canvasRef.current) {
        drawnRef.current = -1;
        drawFrame(0);
      }
      if (loaded >= TOTAL_FRAMES) setIsReady(true);
    };

    const startOne = (i) => {
      active += 1;
      const img = new Image();
      imgs[i - 1] = img;
      const done = () => {
        active -= 1;
        if (cancelled) return;
        markLoaded(i);
        idle(pump); // next batch only when the browser is idle
      };
      img.onload = done;
      img.onerror = done; // never wedge the loading overlay on a missing frame
      img.src = `/sequence/frame_${String(i).padStart(3, "0")}.jpg`;
    };

    const queue = Array.from({ length: TOTAL_FRAMES }, (_, k) => k + 1);
    function pump() {
      if (cancelled) return;
      while (active < 4 && queue.length > 0) startOne(queue.shift());
    }
    pump(); // frame 1 first, ≤4 concurrent; the rest during idle time

    return () => {
      cancelled = true;
      pending.forEach((handle) => {
        if (handle.type === "idle") window.cancelIdleCallback?.(handle.id);
        else clearTimeout(handle.id);
      });
      imgs.forEach((img) => {
        if (img) {
          img.onload = null;
          img.onerror = null;
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw a frame ────────────────────────────────────────────────────────
  const drawFrame = useCallback((progress) => {
    const canvas = canvasRef.current;
    if (!canvas || imagesRef.current.length === 0) return;

    const idx = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(progress * (TOTAL_FRAMES - 1)))
    );

    if (idx === drawnRef.current) return;

    const img = imagesRef.current[idx];
    // Frame still downloading — don't mark it drawn; retry on next scroll
    if (!img || !img.complete || !img.naturalWidth) return;
    drawnRef.current = idx;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Resize canvas buffer to match viewport
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── Rotate -90° (CCW): portrait frames (540×960) → landscape view ──
    const imgW = img.naturalWidth;   // 540
    const imgH = img.naturalHeight;  // 960

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 2); // 90° counter-clockwise

    // After -90° rotation: image width maps to screen height, image height maps to screen width
    // Cover calc: drawn width must cover screen H, drawn height must cover screen W
    const scale = Math.max(H / imgW, W / imgH);
    const dW = imgW * scale;
    const dH = imgH * scale;

    ctx.drawImage(img, -dW / 2, -dH / 2, dW, dH);
    ctx.restore(); // undo rotation

    // Very subtle vignette — keep colors vibrant!
    const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }, []);

  // ── Scroll listener → drive frame index ─────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
        drawFrame(progress);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Also handle resize
    const onResize = () => {
      drawnRef.current = -1; // force redraw
      onScroll();
    };
    window.addEventListener("resize", onResize, { passive: true });

    // Draw initial frame
    if (isReady) {
      drawnRef.current = -1;
      onScroll();
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame, isReady]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* FIXED fullscreen canvas — sits BEHIND everything */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          pointerEvents: "none",
          display: "block",
        }}
      />

      {/* Loading overlay — only while frames still loading */}
      {!isReady && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#07080c",
            transition: "opacity 0.4s ease",
          }}
        >
          <div style={{ width: 200, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
            <div
              style={{
                height: "100%",
                width: "100%",
                // transform (compositor) instead of animating width (layout thrash)
                transform: `scaleX(${Math.max(0, Math.min(100, loadProgress)) / 100})`,
                transformOrigin: typeof document !== "undefined" && document.dir === "rtl" ? "right" : "left",
                background: "linear-gradient(90deg, #00f5ff, #bf5fff)",
                borderRadius: 4,
                transition: "transform 0.15s ease",
              }}
            />
          </div>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#00f5ff", fontWeight: 700, letterSpacing: "0.15em" }}>
            {loadProgress}%
          </span>
        </div>
      )}
    </>
  );
}
