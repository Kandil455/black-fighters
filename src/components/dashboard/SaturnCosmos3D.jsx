import React, { useEffect, useRef, useState } from "react";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { use3DQuality, createResolutionGovernor } from "@/lib/webglQuality";

export default function SaturnCosmos3D({ power = 1 }) {
  const mountRef = useRef(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const { isPowerSaver: saverMode, heavyEnabled } = usePerformanceMode();
  // Battery-saver mode OR heavy-3D knob set to off both park the scene.
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

    // Mouse coordinates for interactive 3D parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    // Pointer tracking runs on the WINDOW. Parallax needs only a normalized
    // direction, so we derive it from cached viewport dimensions instead of
    // calling getBoundingClientRect() on every pointermove — a layout read
    // in the pointer hot path forced reflow mid-scroll (scroll jank on the
    // whole dashboard). Cache is refreshed on resize only.
    let vw = window.innerWidth || 1;
    let vh = window.innerHeight || 1;
    const handleResize = () => {
      vw = window.innerWidth || 1;
      vh = window.innerHeight || 1;
    };
    window.addEventListener("resize", handleResize, { passive: true });

    const handlePointerMove = (e) => {
      if (disposed || document.hidden) return;
      targetMouseX = (e.clientX / vw) * 2 - 1;
      targetMouseY = -((e.clientY / vh) * 2 - 1);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const start = async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 1.2, 4.6);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: true, powerPreference: quality.powerPreference });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
      const govern = createResolutionGovernor(renderer);
      renderer.setSize(280, 280);
      mount.appendChild(renderer.domElement);

      const rootGroup = new THREE.Group();
      rootGroup.rotation.z = THREE.MathUtils.degToRad(26.7);
      rootGroup.rotation.x = THREE.MathUtils.degToRad(12);
      scene.add(rootGroup);

      // 1. Saturn Planet Sphere
      const planetGeometry = new THREE.SphereGeometry(1.05, 64, 64);
      
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, "#00f5ff");
      grad.addColorStop(0.2, "#0088cc");
      grad.addColorStop(0.4, "#bf5fff");
      grad.addColorStop(0.6, "#00ff88");
      grad.addColorStop(0.8, "#141428");
      grad.addColorStop(1.0, "#00f5ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      
      for (let i = 0; i < 512; i += 6) {
        ctx.fillStyle = i % 12 === 0 ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(0, i, 512, 3);
      }

      const planetTexture = new THREE.CanvasTexture(canvas);
      const planetMaterial = new THREE.MeshStandardMaterial({
        map: planetTexture,
        roughness: 0.3,
        metalness: 0.2,
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      rootGroup.add(planet);

      // 2. Realistic Multi-layer Saturn Rings
      const ringGeometry = new THREE.RingGeometry(1.35, 2.3, 128);
      
      const ringCanvas = document.createElement("canvas");
      ringCanvas.width = 512;
      ringCanvas.height = 1;
      const rCtx = ringCanvas.getContext("2d");
      const rGrad = rCtx.createLinearGradient(0, 0, 512, 0);
      rGrad.addColorStop(0.0, "rgba(0, 245, 255, 0.0)");
      rGrad.addColorStop(0.12, "rgba(0, 245, 255, 0.85)");
      rGrad.addColorStop(0.44, "rgba(191, 95, 255, 0.95)");
      rGrad.addColorStop(0.52, "rgba(0, 0, 0, 0.0)"); // Cassini gap
      rGrad.addColorStop(0.62, "rgba(0, 255, 136, 0.8)");
      rGrad.addColorStop(0.92, "rgba(0, 245, 255, 0.6)");
      rGrad.addColorStop(1.0, "rgba(0, 245, 255, 0.0)");
      rCtx.fillStyle = rGrad;
      rCtx.fillRect(0, 0, 512, 1);

      const ringTexture = new THREE.CanvasTexture(ringCanvas);
      const ringMaterial = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2;
      rootGroup.add(rings);

      // 3. Orbiting Moons
      const moonGroup = new THREE.Group();
      scene.add(moonGroup);

      const moon1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f5ff })
      );
      const moon2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xbf5fff })
      );
      moonGroup.add(moon1, moon2);

      // 4. Surrounding Cosmic Particles
      const starGeo = new THREE.BufferGeometry();
      const starCount = 80;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPos[i] = (Math.random() - 0.5) * 8;
        starPos[i + 1] = (Math.random() - 0.5) * 8;
        starPos[i + 2] = (Math.random() - 0.5) * 6;
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0x00f5ff,
        size: 0.045,
        transparent: true,
        opacity: 0.7,
      });
      const starField = new THREE.Points(starGeo, starMat);
      scene.add(starField);

      // 5. Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0x00f5ff, 3);
      keyLight.position.set(4, 3, 3);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0xbf5fff, 3.5, 9);
      rimLight.position.set(-3, -2, 2);
      scene.add(rimLight);

      let moonAngle = 0;
      let lastTime = performance.now();

      const animate = () => {
        if (disposed || document.hidden || !inViewport) return;
        const now = performance.now();
        // Delta-time: motion speed is frame-rate independent (no stutter/jitter on frame drops)
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        const step = 60 * delta;

        // Smooth Lerp Mouse Parallax
        // Snappy, frame-rate independent camera follow (was floaty 0.06/frame)
        const follow = 1 - Math.pow(0.85, step);
        mouseX += (targetMouseX - mouseX) * follow;
        mouseY += (targetMouseY - mouseY) * follow;

        camera.position.x = mouseX * 0.9;
        camera.position.y = 1.2 + mouseY * 0.7;
        camera.lookAt(0, 0, 0);

        // SPEED CURVE (calculated, not guessed): rotation was LINEAR in
        // `power` (= course count): power=200 → 0.5+10 = 10.5× base → moons
        // advanced 0.022×10.5 = 0.231 rad/frame = 13.2°/frame ≈ 794°/s —
        // beyond ~10-15°/frame the eye strobes (moons teleport around the
        // orbit instead of travelling). Saturating curve: 0.5 + 1.5·p/(p+15)
        // → 0.5× at 0 courses, 1.25× at 15, 1.66× at 50, asymptote 2.0×.
        // Max moon speed = 0.044 rad/frame = 2.5°/frame ≈ 152°/s: lively,
        // always sub-strobe, identical math at any frame rate via `step`.
        const speed = (0.5 + 1.5 * (power / (power + 15))) * step;

        planet.rotation.y += 0.009 * speed;
        rings.rotation.z += 0.003 * speed;
        starField.rotation.y += 0.0006 * step;

        // Moons orbit
        moonAngle += 0.022 * speed;
        moon1.position.set(Math.cos(moonAngle) * 2.7, Math.sin(moonAngle * 0.5) * 0.5, Math.sin(moonAngle) * 2.7);
        moon2.position.set(Math.cos(moonAngle * 0.7 + 2) * 3.2, Math.sin(moonAngle * 0.8) * 0.6, Math.sin(moonAngle * 0.7 + 2) * 3.2);

        // Smooth floating bob
        rootGroup.position.y = Math.sin(now * 0.0018) * 0.08;
        rootGroup.rotation.y = mouseX * 0.4;

        renderer.render(scene, camera);
        govern();
        frame = requestAnimationFrame(animate);
      };

      const resume = () => {
        cancelAnimationFrame(frame);
        // Drop the time accumulated while parked, or the first frame after
        // resume animates a clamped 50ms jump (visible as a lurch on every
        // tab return / scroll-in).
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
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("visibilitychange", resume);
        planetGeometry.dispose();
        planetMaterial.dispose();
        planetTexture.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
        ringTexture.dispose();
        starGeo.dispose();
        starMat.dispose();
      };
    };

    start().catch((err) => {
      console.warn("Saturn 3D WebGL fallback:", err);
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
  // Primitive knobs, not the `quality` object: use3DQuality() returns a fresh
  // object every render, so `quality` as a dep tore the whole WebGL scene down
  // and rebuilt it (context loss, re-import, texture re-upload) on every
  // parent re-render.
  }, [power, isPowerSaver, quality.antialias, quality.pixelRatioCap, quality.powerPreference]);

  if (isPowerSaver || webglUnavailable) {
    return (
      <div className="mx-auto h-[280px] w-[280px] flex items-center justify-center relative">
        <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-primary via-cyan-400 to-accent opacity-30 blur-2xl" />
        <div className="w-28 h-28 rounded-full border-2 border-primary/50 flex items-center justify-center relative z-10">
          <div className="w-36 h-10 border border-accent/60 rounded-[50%] rotate-[-25deg] absolute" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mountRef} 
      className="mx-auto h-[280px] w-[280px] flex items-center justify-center cursor-pointer select-none"
      title="حرك الماوس لتفاعل زاوية الرؤية الفلكية"
    />
  );
}
