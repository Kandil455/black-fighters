import React, { Suspense, lazy, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, Zap } from "lucide-react";
import { use3DQuality, createResolutionGovernor } from "@/lib/webglQuality";

export default function Spline3DHero({ className = "w-72 h-72 sm:w-96 sm:h-96" }) {
  const mountRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  // `hovered` drives the CSS aura ONLY — it must never be an effect dependency:
  // as a dep it tore the whole WebGL scene down (renderer.dispose + re-import of
  // three + full rebuild) on EVERY hover in/out. See AGY_ANIMATION_REVIEW.md §8.1.
  const hoveredRef = useRef(false);
  const quality = use3DQuality();
  const isPowerSaver = quality.isPowerSaver;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || isPowerSaver) return;

    let disposed = false;
    let frame;
    let renderer;
    let observer = null;
    let resumeScene = null;
    let inViewport = true;

    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    let hoverRect = null; // layout read cached per hover (warning #4)
    const handlePointerMove = (e) => {
      const rect = hoverRect || mount.getBoundingClientRect();
      if (!hoverRect) hoverRect = rect;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = x * 1.2;
      targetMouseY = y * 1.2;
    };

    const handlePointerEnter = () => {
      hoverRect = mount.getBoundingClientRect();
      hoveredRef.current = true;
      setHovered(true);
    };
    const handlePointerLeave = () => {
      hoverRect = null;
      hoveredRef.current = false;
      setHovered(false);
      targetMouseX = 0;
      targetMouseY = 0;
    };

    mount.addEventListener("pointermove", handlePointerMove);
    mount.addEventListener("pointerenter", handlePointerEnter);
    mount.addEventListener("pointerleave", handlePointerLeave);

    const initThree = async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 5.2);

      renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: true, powerPreference: quality.powerPreference });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
      const govern = createResolutionGovernor(renderer);
      renderer.setSize(mount.clientWidth || 360, mount.clientHeight || 360);
      mount.appendChild(renderer.domElement);

      // 1. Real 3D Faceted Quantum Core (Icosahedron)
      const geo = new THREE.IcosahedronGeometry(1.25, 2);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x00f5ff,
        emissive: 0x220044,
        roughness: 0.1,
        metalness: 0.9,
        transmission: 0.4,
        ior: 1.5,
        wireframe: false,
      });
      const core = new THREE.Mesh(geo, mat);
      scene.add(core);

      // 2. Wireframe Cage
      const wireGeo = new THREE.IcosahedronGeometry(1.4, 1);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xbf5fff,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const wireCage = new THREE.Mesh(wireGeo, wireMat);
      scene.add(wireCage);

      // 3. Orbiting Gyroscope Rings
      const ringGeo = new THREE.TorusGeometry(1.8, 0.025, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x00f5ff, metalness: 1, roughness: 0.2 });
      const ring1 = new THREE.Mesh(ringGeo, ringMat);
      const ring2 = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0xbf5fff, metalness: 1 }));
      ring1.rotation.x = Math.PI / 3;
      ring2.rotation.y = Math.PI / 3;
      scene.add(ring1, ring2);

      // 4. Lights
      const keyLight = new THREE.DirectionalLight(0x00f5ff, 4);
      keyLight.position.set(3, 4, 3);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0xbf5fff, 6, 10);
      rimLight.position.set(-3, -3, 2);
      scene.add(rimLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      let lastTime = performance.now();
      const animate = () => {
        if (disposed) return;
        // ت٤ render-on-demand: halt the loop while the tab is hidden or the
        // scene is offscreen — no math, no GPU work (mirrors StudyOrbit3D).
        if (document.hidden || !inViewport) return;

        const now = performance.now();
        const step = 60 * Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        // Snappy, frame-rate independent follow
        const follow = 1 - Math.pow(0.85, step);
        mouseX += (targetMouseX - mouseX) * follow;
        mouseY += (targetMouseY - mouseY) * follow;

        const speed = hoveredRef.current ? 0.025 : 0.01;
        core.rotation.y += speed;
        core.rotation.x += speed * 0.5;

        wireCage.rotation.y -= speed * 0.8;
        wireCage.rotation.z += speed * 0.4;

        ring1.rotation.z += speed * 1.2;
        ring2.rotation.x -= speed * 1.1;

        // Mouse tilt on hover
        scene.rotation.y = mouseX * 0.8;
        scene.rotation.x = -mouseY * 0.8;

        renderer.render(scene, camera);
        govern();
        frame = requestAnimationFrame(animate);
      };
      resumeScene = () => {
        cancelAnimationFrame(frame);
        // Drop the time accumulated while parked — see SaturnCosmos3D resume().
        lastTime = performance.now();
        if (!document.hidden && inViewport && !disposed) frame = requestAnimationFrame(animate);
      };
      observer = new IntersectionObserver(([entry]) => {
        inViewport = entry.isIntersecting;
        resumeScene();
      }, { rootMargin: "100px" });
      observer.observe(mount);
      document.addEventListener("visibilitychange", resumeScene);
      animate();
    };

    initThree();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (resumeScene) document.removeEventListener("visibilitychange", resumeScene);
      mount.removeEventListener("pointermove", handlePointerMove);
      mount.removeEventListener("pointerenter", handlePointerEnter);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
    };
    // Depend on the PRIMITIVE quality knobs — `quality` itself is a fresh object
    // every render (webglQuality.use3DQuality), so using it as a dep rebuilt the
    // scene on every parent render too.
  }, [isPowerSaver, quality.antialias, quality.pixelRatioCap, quality.powerPreference]);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Holographic Aura */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-accent/20 to-transparent blur-3xl transition-opacity duration-300 pointer-events-none ${hovered ? "opacity-90 scale-110" : "opacity-40"}`} />

      {/* 3D WebGL Canvas Viewport (skipped in Battery Saver — static aura stays) */}
      {!isPowerSaver && (
        <div
          ref={mountRef}
          className="w-full h-full cursor-pointer relative z-10 transition-transform duration-300 hover:scale-105"
          title="حرك الماوس مباشرة فوق المجسم للتحكم بزاوية الدوران 3D"
        />
      )}

      {/* Esports HUD Badges */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-2 -right-2 z-20 ios-glass-dock px-3 py-1.5 rounded-2xl text-[11px] font-black text-primary flex items-center gap-1.5 border border-primary/40 shadow-[0_8px_20px_rgba(0,245,255,0.3)] font-mono"
      >
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span>3D GLTF SHADER</span>
      </motion.div>

      <motion.div
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="absolute bottom-2 -left-2 z-20 ios-glass-dock px-3 py-1.5 rounded-2xl text-[11px] font-black text-[hsl(152,100%,50%)] flex items-center gap-1.5 border border-[hsl(152,100%,50%)]/40 shadow-[0_8px_20px_rgba(0,255,136,0.3)] font-mono"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>PBR METALLIC CORE</span>
      </motion.div>
    </div>
  );
}
