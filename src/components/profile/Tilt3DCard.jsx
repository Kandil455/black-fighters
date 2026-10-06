import React, { useRef, useEffect, useState } from "react";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { damp, computePointerTarget } from "@/lib/motionMath";
import { measure, mutate } from "@/lib/frameScheduler";

const ZERO_RECT = { left: 0, top: 0, width: 0, height: 0 };
const TILT_SMOOTHING = 12;

/**
 * كارت بتأثير 3D حقيقي — يميل ويتحرك بعمق حسب حركة الماوس/اللمس.
 */
export default function Tilt3DCard({ children, enabled = true, className = "", maxTilt = 12 }) {
  const { isPowerSaver } = usePerformanceMode();
  const cardRef = useRef(null);
  const rectRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const anim = useRef({
    clientX: 0,
    clientY: 0,
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    hovered: false,
    dirty: false,
    raf: 0,
    last: 0,
    reduced: false,
  });

  const tick = (now) => {
    const a = anim.current;
    const dt = a.last ? Math.min((now - a.last) / 1000, 0.032) : 0.016;
    a.last = now;

    const el = cardRef.current;
    if (!el) {
      a.raf = 0;
      a.last = 0;
      return;
    }

    if (!rectRef.current) {
      rectRef.current = el.getBoundingClientRect();
    }

    const target = computePointerTarget(
      a.clientX,
      a.clientY,
      rectRef.current || ZERO_RECT,
      maxTilt
    );

    const targetRotX = a.hovered ? target.rotateX : 0;
    const targetRotY = a.hovered ? target.rotateY : 0;
    const targetGlareX = a.hovered ? target.px : 50;

    a.rotateX = damp(a.rotateX, targetRotX, TILT_SMOOTHING, dt);
    a.rotateY = damp(a.rotateY, targetRotY, TILT_SMOOTHING, dt);
    a.glareX = damp(a.glareX, targetGlareX, TILT_SMOOTHING, dt);

    const settled =
      Math.abs(a.rotateX - targetRotX) < 0.01 &&
      Math.abs(a.rotateY - targetRotY) < 0.01 &&
      Math.abs(a.glareX - targetGlareX) < 0.05 &&
      !a.dirty;

    a.dirty = false;

    mutate(() => {
      if (!el) return;
      el.style.transform = `perspective(900px) rotateX(${a.rotateX.toFixed(3)}deg) rotateY(${a.rotateY.toFixed(3)}deg)`;
      el.style.setProperty("--gx", `${a.glareX.toFixed(2)}%`);
    });

    if (settled) {
      a.raf = 0;
      a.last = 0;
      if (!a.hovered) {
        mutate(() => {
          if (el) {
            el.style.transform = "";
            el.style.setProperty("--gx", "50%");
          }
        });
      }
      return;
    }
    a.raf = requestAnimationFrame(tick);
  };

  const wake = () => {
    const a = anim.current;
    if (a.reduced || a.raf) return;
    a.last = 0;
    a.raf = requestAnimationFrame(tick);
  };

  useEffect(() => {
    anim.current.reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    return () => {
      if (anim.current.raf) cancelAnimationFrame(anim.current.raf);
      anim.current.raf = 0;
    };
  }, []);

  useEffect(() => {
    if (!hovered) return;
    let queued = false;
    const invalidate = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        rectRef.current = null;
        anim.current.dirty = true;
      });
    };
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("scroll", invalidate, { capture: true });
      window.removeEventListener("resize", invalidate);
    };
  }, [hovered]);

  const onMove = (e) => {
    const a = anim.current;
    if (a.reduced || !cardRef.current) return;
    a.clientX = e.clientX;
    a.clientY = e.clientY;
    a.dirty = true;
    wake();
  };

  const onEnter = (e) => {
    const a = anim.current;
    a.hovered = true;
    a.clientX = e.clientX;
    a.clientY = e.clientY;
    measure(() => {
      rectRef.current = cardRef.current?.getBoundingClientRect() || null;
    });
    wake();
    setHovered(true);
  };

  const onLeave = () => {
    const a = anim.current;
    a.hovered = false;
    a.dirty = true;
    rectRef.current = null;
    wake();
    setHovered(false);
  };

  if (!enabled || isPowerSaver) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
    >
      <div style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}>
        {children}
      </div>
      {/* بريق يتحرك مع الإمالة */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at var(--gx, 50%) 0%, rgba(255,255,255,0.12), transparent 55%)",
          opacity: hovered ? 1 : 0,
        }}
      />
    </div>
  );
}
