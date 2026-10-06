import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Brain, Cpu, Zap } from "lucide-react";
import { use3DQuality } from "@/lib/webglQuality";

export default function NeuralCore3D({ className = "w-48 h-48 sm:w-64 sm:h-64" }) {
  const canvasRef = useRef(null);
  const quality = use3DQuality();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || quality.isPowerSaver) return;

    let disposed = false;
    let observer = null;
    let inViewport = true;
    const ctx = canvas.getContext("2d");
    let raf;
    let angle = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr || 300;
      canvas.height = rect.height * dpr || 300;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // ── GLOW SPRITES (same optimization as CinematicHoloVisualizer): the
    // old loop set ctx.shadowBlur per node — a multi-pass blur rasterization
    // per node per frame. Pre-rendered radial-gradient sprites + globalAlpha
    // drawImage give the same soft-glow look for a fraction of the cost.
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
    const cyanSprite = makeGlowSprite("0, 245, 255");
    const violetSprite = makeGlowSprite("191, 95, 255");

    // 3D Sphere particles (density scales with the quality tier)
    const particleCount = quality.tier === "full" ? 45 : 27;
    const radius = 65;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.sqrt(particleCount * Math.PI) * theta;
      particles.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(theta),
        baseSize: Math.random() * 2 + 1.2,
      });
    }

    let lastTime = performance.now();
    const draw = () => {
      if (disposed || document.hidden || !inViewport) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      // Delta-time: identical rotation speed at 60Hz and 120Hz (and no lurch
      // after resume — lastTime resets below before restarting the loop).
      const step = 60 * Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      angle += 0.012 * step;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosB = Math.cos(angle * 0.7);
      const sinB = Math.sin(angle * 0.7);

      // Draw glowing central orb
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, radius * 1.1);
      grad.addColorStop(0, "rgba(0, 245, 255, 0.45)");
      grad.addColorStop(0.4, "rgba(191, 95, 255, 0.25)");
      grad.addColorStop(0.8, "rgba(0, 255, 136, 0.1)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Transform & sort 3D points
      const projected = particles.map((p) => {
        // Y-axis rotation
        let x1 = p.x * cosA - p.z * sinA;
        let z1 = p.z * cosA + p.x * sinA;
        // X-axis rotation
        let y2 = p.y * cosB - z1 * sinB;
        let z2 = z1 * cosB + p.y * sinB;

        const fov = 180;
        const scale = fov / (fov + z2);
        return {
          px: cx + x1 * scale * (canvas.width / 280),
          py: cy + y2 * scale * (canvas.height / 280),
          scale,
          z: z2,
          size: p.baseSize * scale,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      // Draw connection lines
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 42) {
            const alpha = (1 - dist / 42) * 0.35 * Math.min(p1.scale, p2.scale);
            ctx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // Draw nodes (pre-rendered glow sprites instead of per-node shadowBlur)
      for (const p of projected) {
        const alpha = Math.max(0.2, (p.scale - 0.4) * 1.5);
        const sprite = p.z > 0 ? cyanSprite : violetSprite;
        const size = p.size * 6; // sprite spans the soft falloff
        ctx.globalAlpha = p.z > 0 ? alpha : alpha * 0.8;
        ctx.drawImage(sprite, p.px - size / 2, p.py - size / 2, size, size);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };

    const resume = () => {
      cancelAnimationFrame(raf);
      // Drop the parked interval so the first frame after resume doesn't lurch.
      lastTime = performance.now();
      if (!document.hidden && inViewport && !disposed) {
        raf = requestAnimationFrame(draw);
      }
    };

    observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      resume();
    }, { rootMargin: "100px" });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", resume);

    draw();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("resize", resize);
    };
  }, [quality.isPowerSaver, quality.pixelRatioCap]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer pulsing energy rings */}
      <motion.div
        className="absolute inset-2 rounded-full border border-primary/30 border-dashed"
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-6 rounded-full border border-accent/30"
        animate={{ rotate: -360, scale: [0.96, 1.04, 0.96] }}
        transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
      />
      <motion.div
        className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent blur-3xl opacity-75 pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Interactive 3D Canvas */}
      <canvas ref={canvasRef} className="w-full h-full relative z-10 pointer-events-none" />

      {/* Floating mini stats chips */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-2 -right-4 z-20 ios-glass-pill px-3 py-1 rounded-full text-[10px] font-black text-primary flex items-center gap-1 border border-primary/30 shadow-lg"
      >
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        <span>Gemini 3.7 AI</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-2 -left-4 z-20 ios-glass-pill px-3 py-1 rounded-full text-[10px] font-black text-[hsl(152,100%,50%)] flex items-center gap-1 border border-[hsl(152,100%,50%)]/30 shadow-lg"
      >
        <Zap className="w-3 h-3 text-[hsl(152,100%,50%)]" />
        <span>100% Dynamic 3D</span>
      </motion.div>
    </div>
  );
}
