import React, { useEffect, useRef, useState } from "react";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { use3DQuality, createResolutionGovernor } from "@/lib/webglQuality";

export default function StudyOrbit3D({ power = 1 }) {
  const mountRef = useRef(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const { isPowerSaver: saverMode, heavyEnabled } = usePerformanceMode();
  const isPowerSaver = saverMode || !heavyEnabled;
  const quality = use3DQuality();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || isPowerSaver) return;

    let disposed = false;
    let frame = 0;
    let renderer;
    let observer;
    let cleanupScene = () => {};
    let inViewport = true;

    const start = async () => {
      // Three.js is a separate chunk and is never downloaded in saver mode.
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 4;

      renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: true, powerPreference: quality.powerPreference });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
      const govern = createResolutionGovernor(renderer);
      renderer.setSize(260, 260);
      mount.appendChild(renderer.domElement);

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x003a44, roughness: 0.25 })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.45, 0.025, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0xa855f7 })
      );
      ring.rotation.x = Math.PI / 2.6;
      scene.add(core, ring, new THREE.AmbientLight(0xffffff, 1.4));

      const light = new THREE.PointLight(0x00f5ff, 2.2, 8);
      light.position.set(2, 2, 3);
      scene.add(light);

      let lastTime = performance.now();
      const animate = () => {
        if (disposed || document.hidden || !inViewport) return;
        const now = performance.now();
        // Delta-time: frame-rate independent, jitter-free motion
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const step = 60 * delta;
        core.rotation.x += (0.006 + power * 0.0004) * step;
        core.rotation.y += 0.01 * step;
        ring.rotation.z += 0.012 * step;
        renderer.render(scene, camera);
        govern();
        frame = requestAnimationFrame(animate);
      };
      const resume = () => {
        cancelAnimationFrame(frame);
        // Drop the time accumulated while parked — see SaturnCosmos3D resume().
        lastTime = performance.now();
        if (!document.hidden && inViewport && !disposed) frame = requestAnimationFrame(animate);
      };
      document.addEventListener("visibilitychange", resume);
      observer = new IntersectionObserver(([entry]) => {
        inViewport = entry.isIntersecting;
        resume();
      }, { rootMargin: "100px" });
      observer.observe(mount);
      resume();

      cleanupScene = () => {
        document.removeEventListener("visibilitychange", resume);
        scene.traverse((object) => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose?.());
          else object.material?.dispose?.();
        });
      };
    };

    start().catch(() => {
      if (!disposed) setWebglUnavailable(true);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      cleanupScene();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer.domElement?.remove();
      }
    };
  // Primitive knobs, not the `quality` object — see SaturnCosmos3D.
  }, [power, isPowerSaver, quality.antialias, quality.pixelRatioCap, quality.powerPreference]);

  if (isPowerSaver || webglUnavailable) {
    return <div className="mx-auto h-[260px] w-[260px] flex items-center justify-center" aria-label={isPowerSaver ? "عرض ثلاثي الأبعاد متوقف لتوفير الطاقة" : "عرض ثابت لأن WebGL غير متاح"}>
      <div className="w-36 h-36 rounded-[35%] rotate-45 border-2 border-primary/40 bg-primary/10 shadow-[0_0_45px_hsl(var(--primary)/.22)]" />
    </div>;
  }
  return <div ref={mountRef} className="mx-auto h-[260px] w-[260px]" />;
}
