import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Zap } from "lucide-react";
import { use3DQuality } from "@/lib/webglQuality";

export default function CinematicHoloVisualizer({ className = "w-72 h-72 sm:w-96 sm:h-96" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const quality = use3DQuality();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || quality.isPowerSaver) return;

    let disposed = false;
    let observer = null;
    let inViewport = true;
    const ctx = canvas.getContext("2d");
    let raf;
    let angle = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap);

    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let hovered = false;

    let hoverRect = null;
    const handlePointerMove = (e) => {
      const rect = hoverRect || container.getBoundingClientRect();
      if (!hoverRect) hoverRect = rect;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = x * 0.9;
      targetMouseY = y * 0.9;
    };

    const handlePointerEnter = () => {
      hoverRect = container.getBoundingClientRect();
      hovered = true;
      setIsHovered(true);
    };

    const handlePointerLeave = () => {
      hoverRect = null;
      hovered = false;
      setIsHovered(false);
      targetMouseX = 0;
      targetMouseY = 0;
    };

    const handleScroll = () => {
      hoverRect = null;
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });

    const resize = () => {
      hoverRect = null;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // ── GLOW SPRITES (calculated optimization) ──────────────────────────
    // The old loop set ctx.shadowBlur per particle: 180 shadow-filled arcs
    // per frame = a multi-pass blur rasterization PER PARTICLE per frame.
    // Instead each ring color gets ONE pre-rendered radial-gradient sprite
    // (drawn once below); per frame we do 180 cheap drawImage calls with
    // globalAlpha — same soft-glow look, a fraction of the raster cost.
    const makeGlowSprite = (rgb) => {
      const s = 64;
      const c = document.createElement("canvas");
      c.width = s; c.height = s;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, `rgba(${rgb}, 1)`);
      grad.addColorStop(0.25, `rgba(${rgb}, 0.55)`);
      grad.addColorStop(0.6, `rgba(${rgb}, 0.12)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      return c;
    };
    const sprites = {
      "0, 245, 255": makeGlowSprite("0, 245, 255"),
      "191, 95, 255": makeGlowSprite("191, 95, 255"),
      "0, 255, 136": makeGlowSprite("0, 255, 136"),
    };

    // 3D holographic quantum rings. Particle density scales with the
    // quality tier: full = unchanged look, balanced = 60% (weaker GPUs),
    // saver never reaches here (scene parked).
    const density = quality.tier === "full" ? 1 : 0.6;
    const rings = [
      { radius: 100, count: Math.round(60 * density), tiltX: 1.1, tiltY: 0.3, speed: 0.014, color: "0, 245, 255" },
      { radius: 75,  count: Math.round(45 * density), tiltX: -0.8, tiltY: 0.6, speed: -0.018, color: "191, 95, 255" },
      { radius: 130, count: Math.round(75 * density), tiltX: 0.4, tiltY: -0.9, speed: 0.009, color: "0, 255, 136" },
    ];

    const particles = [];
    rings.forEach((ring, rIdx) => {
      for (let i = 0; i < ring.count; i++) {
        const theta = (i / ring.count) * Math.PI * 2;
        particles.push({
          ringIndex: rIdx,
          theta,
          radius: ring.radius,
          size: Math.random() * 2 + 1,
        });
      }
    });

    let lastTime = performance.now();
    const draw = () => {
      if (disposed || document.hidden || !inViewport) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      const step = 60 * Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Snappy, frame-rate independent pointer follow
      const follow = 1 - Math.pow(0.85, step);
      mouseX += (targetMouseX - mouseX) * follow;
      mouseY += (targetMouseY - mouseY) * follow;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const speedMultiplier = hovered ? 1.8 : 1.0;
      angle += 0.01 * speedMultiplier * step;

      // Central Quantum Energy Core
      const coreRadius = (55 + Math.sin(angle * 3) * 4) * (canvas.width / 360);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGrad.addColorStop(0, "rgba(0, 245, 255, 0.85)");
      coreGrad.addColorStop(0.35, "rgba(191, 95, 255, 0.5)");
      coreGrad.addColorStop(0.7, "rgba(0, 255, 136, 0.2)");
      coreGrad.addColorStop(1, "transparent");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Project 3D particles on tilted orbits
      particles.forEach((p) => {
        const ring = rings[p.ringIndex];
        p.theta += ring.speed * speedMultiplier;

        const scaleRatio = canvas.width / 360;
        const r = p.radius * scaleRatio;

        // 3D coordinates on tilted ring
        let x = r * Math.cos(p.theta);
        let y = r * Math.sin(p.theta) * Math.cos(ring.tiltX + mouseY);
        let z = r * Math.sin(p.theta) * Math.sin(ring.tiltX + mouseY);

        // Rotate in Y axis
        let rx = x * Math.cos(ring.tiltY + mouseX + angle * 0.3) - z * Math.sin(ring.tiltY + mouseX + angle * 0.3);
        let rz = z * Math.cos(ring.tiltY + mouseX + angle * 0.3) + x * Math.sin(ring.tiltY + mouseX + angle * 0.3);

        const fov = 320;
        const scale = fov / (fov + rz);
        const px = cx + rx * scale;
        const py = cy + y * scale;

        if (scale > 0) {
          const sprite = sprites[ring.color];
          const size = p.size * scale * (hovered ? 1.4 : 1.1) * 6; // sprite spans the soft falloff
          const alpha = Math.max(0.2, Math.min(1, (scale - 0.5) * 1.9));
          ctx.globalAlpha = alpha;
          ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
          ctx.globalAlpha = 1;
        }
      });

      raf = requestAnimationFrame(draw);
    };

    const resume = () => {
      cancelAnimationFrame(raf);
      lastTime = performance.now();
      if (!document.hidden && inViewport && !disposed) {
        raf = requestAnimationFrame(draw);
      }
    };

    observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      resume();
    }, { rootMargin: "100px" });
    observer.observe(container);
    document.addEventListener("visibilitychange", resume);

    draw();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", resume);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", resize);
    };
  }, [quality.isPowerSaver, quality.pixelRatioCap]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center justify-center select-none cursor-pointer transition-transform duration-300 ${isHovered ? "scale-105" : "scale-100"} ${className}`}
      title="حرك الماوس مباشرة فوق المجسم للتفاعل 3D"
    >
      {/* Outer Hologram Energy Rings */}
      <motion.div
        className="absolute inset-4 rounded-full border border-primary/30 border-dashed"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-10 rounded-full border border-accent/35"
        animate={{ rotate: -360, scale: [0.98, 1.03, 0.98] }}
        transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } }}
      />
      <div className={`absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent blur-3xl transition-opacity duration-300 pointer-events-none ${isHovered ? "opacity-90" : "opacity-50"}`} />

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full relative z-10 pointer-events-none" />

      {/* Floating Hologram Telemetry Badges */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-2 -right-2 z-20 ios-glass-dock px-3.5 py-1.5 rounded-2xl text-[11px] font-black text-primary flex items-center gap-1.5 border border-primary/40 shadow-[0_8px_20px_rgba(0,245,255,0.25)]"
      >
        <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="font-mono">120 FPS Realtime</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-2 -left-2 z-20 ios-glass-dock px-3.5 py-1.5 rounded-2xl text-[11px] font-black text-[hsl(152,100%,50%)] flex items-center gap-1.5 border border-[hsl(152,100%,50%)]/40 shadow-[0_8px_20px_rgba(0,255,136,0.25)]"
      >
        <Zap className="w-3.5 h-3.5 text-[hsl(152,100%,50%)]" />
        <span className="font-mono">Interactive 3D</span>
      </motion.div>
    </div>
  );
}
