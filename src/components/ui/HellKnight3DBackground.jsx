import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Swords, Shield, Zap, Sparkles, Flame, ChevronUp, ChevronDown } from "lucide-react";
import { use3DQuality, prefersReducedMotion, createResolutionGovernor } from "@/lib/webglQuality";

/**
 * HellKnight3DBackground.jsx
 * 
 * High-performance, lightweight 3D battleground featuring the Hell Knight.
 * Built for "BLACK FIGHTERS" with Three.js WebGL.
 * Features 3D Basalt Runic Battlefield Arena, Glowing Cyan Visor Eyes, 
 * Dynamic Combat Attack Slashing, and Battle Stance integration.
 */

const MODELS_DATA = [
  {
    id: "axe",
    name: "فأس الجحيم",
    nameEn: "Hell Axe",
    icon: Swords,
    url: "/models/hell-knight-axe.glb",
    desc: "محارب الفأس الدموي الثقيل",
  },
  {
    id: "shield",
    name: "درع الفولاذ",
    nameEn: "Iron Bulwark",
    icon: Shield,
    url: "/models/hell-knight-shield.glb",
    desc: "فارس الصد ودرع الميدان",
  },
  {
    id: "cannon",
    name: "المدفع الحارق",
    nameEn: "Hell Cannon",
    icon: Zap,
    url: "/models/hell-knight-cannon.glb",
    desc: "مدفع الدك والاشتعال التكتيكي",
  },
];

const THEMES = [
  {
    id: "cyan",
    name: "سايبر نيون",
    nameEn: "Cyber Neon",
    color: "#00f2fe",
    armorColor: 0x151c26,
    hemiSky: 0x1d3d57,
    hemiGround: 0x070d14,
    keyLight: 0xa8e6ff,
    fillLight: 0x5a2d82,
    rimLight: 0x00f5ff,
    underLight: 0x00d4ff,
    chestLight: 0x00e5ff,
    metalness: 0.72,
    roughness: 0.32,
  },
  {
    id: "blood",
    name: "لهيب الدم",
    nameEn: "Blood Forge",
    color: "#ff0055",
    armorColor: 0x24141a,
    hemiSky: 0x5e1c28,
    hemiGround: 0x12060b,
    keyLight: 0xffa0b4,
    fillLight: 0x8c3418,
    rimLight: 0xff1144,
    underLight: 0xff3300,
    chestLight: 0xff4466,
    metalness: 0.70,
    roughness: 0.34,
  },
  {
    id: "void",
    name: "الهاوية الفضية",
    nameEn: "Abyssal Silver",
    color: "#e2e8f0",
    armorColor: 0x1c222e,
    hemiSky: 0x3d4b68,
    hemiGround: 0x0e121a,
    keyLight: 0xffffff,
    fillLight: 0x586b88,
    rimLight: 0xf1f5f9,
    underLight: 0x64748b,
    chestLight: 0xdde5ed,
    metalness: 0.75,
    roughness: 0.30,
  },
];

export default function HellKnight3DBackground({ className = "" }) {
  // §4 contracts: Battery Saver, the explicit heavy-3D knob and
  // prefers-reduced-motion decide whether the WebGL scene runs at all.
  // use3DQuality folds saver mode + the knob into one flag (c78941b);
  // reduced-motion is an accessibility signal, never a power signal.
  const quality3d = use3DQuality();
  const skip3D = useMemo(
    () => quality3d.isPowerSaver || prefersReducedMotion(),
    [quality3d.isPowerSaver]
  );

  const mountRef = useRef(null);
  const visibilityACRef = useRef(null);
  const inputACRef = useRef(null);
  const [activeModelId, setActiveModelId] = useState("axe");
  const [activeThemeId, setActiveThemeId] = useState("cyan");
  const [, setIsLoaded] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  // References for animation loop & 3D objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelGroupRef = useRef(null);
  const currentMeshRef = useRef(null);
  const lightsRef = useRef({});
  const particlesRef = useRef(null);
  const loadedCacheRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ progress: 0, targetProgress: 0 });
  const shockwaveRef = useRef({ intensity: 0 });
  const attackRef = useRef({ active: false, time: 0, duration: 0.52 });
  const stanceRef = useRef({ active: false, time: 0, duration: 1.2 });
  const heavySlashRef = useRef({ active: false, time: 0, duration: 0.85 });
  const visorRef = useRef(null);
  const arenaRef = useRef(null);
  const arenaRingRef = useRef(null);
  const groundGlowRef = useRef(null);
  const reqIdRef = useRef(null);

  const activeTheme = useMemo(() => {
    return THEMES.find((t) => t.id === activeThemeId) || THEMES[0];
  }, [activeThemeId]);

  // Theme hot-swap: the scene effect reads the CURRENT theme through this ref
  // (declared AFTER activeTheme — a useRef(activeTheme) above the useMemo
  // declaration is a temporal-dead-zone crash on mount).
  const activeThemeRef = useRef(activeTheme);

  // ── Shockwave Trigger ───────────────────────────────────────────────────────
  const triggerShockwave = useCallback(() => {
    shockwaveRef.current.intensity = 1.0;
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 600);
  }, []);

  // ── Combat Attack Slash Trigger ─────────────────────────────────────────────
  const triggerAttack = useCallback(() => {
    attackRef.current.active = true;
    attackRef.current.time = 0;
    triggerShockwave();
  }, [triggerShockwave]);

  // ── Battle Stance Trigger (Hero Hover "ابدأ الآن") ───────────────────────────
  const triggerBattleStance = useCallback(() => {
    stanceRef.current.active = true;
    stanceRef.current.time = 0;
    triggerShockwave();
  }, [triggerShockwave]);

  // ── Heavy Screen-Slash Charge Trigger ("ابدأ الآن" Click) ───────────────────
  const triggerHeavySlash = useCallback(() => {
    heavySlashRef.current.active = true;
    heavySlashRef.current.time = 0;
    triggerShockwave();
  }, [triggerShockwave]);

  // ── Initialize Three.js Scene ──────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === "undefined") return;
    // §4: saver/knob/reduced-motion users get the static poster —
    // no WebGL context, no 717KB three.js download, no loop.
    if (skip3D) return;

    let disposed = false;

    async function init3D() {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (disposed || !container) return;

        // 1. Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.FogExp2(0x07090e, 0.045);

        // 2. Camera
        const aspect = window.innerWidth / window.innerHeight;
        const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
        camera.position.set(0, 0.2, 4.8);
        cameraRef.current = camera;

        // 3. Renderer
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        rendererRef.current = renderer;

        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 4. Model Group
        const modelGroup = new THREE.Group();
        const isDesktop = window.innerWidth >= 1024;
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        const posX = isDesktop ? 1.4 : isTablet ? 0.75 : 0;
        const posZ = isDesktop ? 0.2 : isTablet ? 0 : -0.4;
        const scaleVal = isDesktop ? 0.95 : isTablet ? 0.85 : 0.75;

        // Base feet at -1.45, so knight's torso is at Y = 0
        modelGroup.position.set(posX, -1.45, posZ);
        modelGroup.scale.set(scaleVal, scaleVal, scaleVal);
        scene.add(modelGroup);
        modelGroupRef.current = modelGroup;

        // 4.1 3D Battleground Basalt Arena Platform
        const arenaGroup = new THREE.Group();
        arenaGroup.position.set(posX, -1.5, posZ);
        scene.add(arenaGroup);
        arenaRef.current = arenaGroup;

        // Circular basalt stone disc
        const arenaGeo = new THREE.CylinderGeometry(2.8, 3.2, 0.22, 64);
        const arenaCanvas = document.createElement("canvas");
        arenaCanvas.width = 512;
        arenaCanvas.height = 512;
        const aCtx = arenaCanvas.getContext("2d");
        aCtx.fillStyle = "#090d14";
        aCtx.fillRect(0, 0, 512, 512);

        // Concentric glowing warrior rings
        aCtx.strokeStyle = "rgba(0, 245, 255, 0.5)";
        aCtx.lineWidth = 4;
        aCtx.beginPath();
        aCtx.arc(256, 256, 215, 0, Math.PI * 2);
        aCtx.stroke();

        aCtx.strokeStyle = "rgba(0, 245, 255, 0.3)";
        aCtx.lineWidth = 2.5;
        aCtx.beginPath();
        aCtx.arc(256, 256, 160, 0, Math.PI * 2);
        aCtx.stroke();

        aCtx.strokeStyle = "rgba(0, 245, 255, 0.6)";
        aCtx.lineWidth = 5;
        aCtx.beginPath();
        aCtx.arc(256, 256, 100, 0, Math.PI * 2);
        aCtx.stroke();

        // 16 radial mystic rune ticks
        for (let i = 0; i < 16; i++) {
          const ang = (i * Math.PI * 2) / 16;
          aCtx.strokeStyle = i % 2 === 0 ? "rgba(0, 245, 255, 0.65)" : "rgba(124, 58, 237, 0.5)";
          aCtx.lineWidth = i % 2 === 0 ? 3 : 1.5;
          aCtx.beginPath();
          aCtx.moveTo(256 + Math.cos(ang) * 160, 256 + Math.sin(ang) * 160);
          aCtx.lineTo(256 + Math.cos(ang) * 215, 256 + Math.sin(ang) * 215);
          aCtx.stroke();
        }

        const arenaTexture = new THREE.CanvasTexture(arenaCanvas);
        const arenaMat = new THREE.MeshStandardMaterial({
          map: arenaTexture,
          color: 0x18202d,
          roughness: 0.55,
          metalness: 0.4,
          bumpMap: arenaTexture,
          bumpScale: 0.04,
        });
        const arenaMesh = new THREE.Mesh(arenaGeo, arenaMat);
        arenaGroup.add(arenaMesh);

        // Spinning Runic Energy Ring
        const ringGeo = new THREE.RingGeometry(2.35, 2.55, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(activeThemeRef.current.keyLight),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.12;
        arenaGroup.add(ringMesh);
        arenaRingRef.current = ringMesh;

        // Ground Core Glow
        const groundGlowGeo = new THREE.CircleGeometry(2.7, 32);
        const groundGlowMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(activeThemeRef.current.underLight),
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });
        const groundGlowMesh = new THREE.Mesh(groundGlowGeo, groundGlowMat);
        groundGlowRef.current = groundGlowMesh;
        groundGlowMesh.rotation.x = -Math.PI / 2;
        groundGlowMesh.position.y = 0.115;
        arenaGroup.add(groundGlowMesh);

        // 5. Dynamic High-Contrast Lighting System
        // Base ambient hemisphere
        const hemiLight = new THREE.HemisphereLight(activeThemeRef.current.hemiSky, activeThemeRef.current.hemiGround, 2.0);
        scene.add(hemiLight);

        // Main key light (angled from front right)
        const keyLight = new THREE.DirectionalLight(activeThemeRef.current.keyLight, 2.8);
        keyLight.position.set(4, 3, 5);
        keyLight.target = modelGroup;
        scene.add(keyLight);

        // Front left fill light
        const fillLight = new THREE.DirectionalLight(activeThemeRef.current.fillLight, 1.4);
        fillLight.position.set(-4, 2, 4);
        fillLight.target = modelGroup;
        scene.add(fillLight);

        // Back rim light (godly highlights on horns, shoulders & weapons)
        const rimLight = new THREE.DirectionalLight(activeThemeRef.current.rimLight, 3.5);
        rimLight.position.set(0, 4, -4);
        rimLight.target = modelGroup;
        scene.add(rimLight);

        // Overhead direct light
        const overheadLight = new THREE.DirectionalLight(0xffffff, 2.5);
        overheadLight.position.set(0, 6, 2);
        overheadLight.target = modelGroup;
        scene.add(overheadLight);

        // Molten ground point light under feet
        const underLight = new THREE.PointLight(activeThemeRef.current.underLight, 2.5, 9);
        underLight.position.set(posX, -1.3, 1.2);
        scene.add(underLight);

        // Front chest illumination light (reveals armor and weapon details)
        const chestLight = new THREE.PointLight(activeThemeRef.current.chestLight, 2.2, 8);
        chestLight.position.set(posX, 0.2, 2.0);
        scene.add(chestLight);

        lightsRef.current = { hemiLight, keyLight, fillLight, rimLight, overheadLight, underLight, chestLight };

        // 6. Floating Molten Ember & Energy Particles
        const isMobile = window.innerWidth < 768;
        const particleCount = isMobile ? 24 : 56;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color1 = new THREE.Color(activeThemeRef.current.keyLight);
        const color2 = new THREE.Color(activeThemeRef.current.fillLight);

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 8 + posX;
          positions[i * 3 + 1] = Math.random() * 6 - 2;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

          velocities[i * 3] = (Math.random() - 0.5) * 0.005;
          velocities[i * 3 + 1] = Math.random() * 0.014 + 0.005;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;

          const mixedColor = color1.clone().lerp(color2, Math.random());
          colors[i * 3] = mixedColor.r;
          colors[i * 3 + 1] = mixedColor.g;
          colors[i * 3 + 2] = mixedColor.b;
        }

        particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const pCanvas = document.createElement("canvas");
        pCanvas.width = 32;
        pCanvas.height = 32;
        const pCtx = pCanvas.getContext("2d");
        const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(255, 255, 255, 0.75)");
        grad.addColorStop(0.7, "rgba(255, 255, 255, 0.2)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        pCtx.fillStyle = grad;
        pCtx.fillRect(0, 0, 32, 32);

        const particleTexture = new THREE.CanvasTexture(pCanvas);
        const particleMat = new THREE.PointsMaterial({
          size: 0.16,
          map: particleTexture,
          transparent: true,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const particleSystem = new THREE.Points(particleGeo, particleMat);
        scene.add(particleSystem);
        particlesRef.current = { system: particleSystem, velocities, count: particleCount };

        // 7. Load Default Model
        const loader = new GLTFLoader();

        async function loadModel(modelInfo) {
          if (loadedCacheRef.current[modelInfo.id]) {
            displayModel(loadedCacheRef.current[modelInfo.id]);
            return;
          }

          loader.load(
            modelInfo.url,
            (gltf) => {
              if (disposed) return;
              const sceneMesh = gltf.scene;

              // Apply custom obsidian metal shader material with smooth normals
              sceneMesh.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                  if (child.geometry) {
                    child.geometry.computeVertexNormals();
                  }
                  child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(activeThemeRef.current.armorColor),
                    metalness: activeThemeRef.current.metalness,
                    roughness: activeThemeRef.current.roughness,
                    envMapIntensity: 2.0,
                  });
                }
              });

              loadedCacheRef.current[modelInfo.id] = sceneMesh;
              displayModel(sceneMesh);
              setIsLoaded(true);
            },
            undefined,
            (err) => console.error("Error loading 3D model:", err)
          );
        }

        function displayModel(sceneMesh) {
          if (!modelGroupRef.current) return;
          modelGroupRef.current.clear();
          modelGroupRef.current.add(sceneMesh);

          // Glowing Visor & Radiant Eyes System (anchored directly to helmet slit)
          const visorGroup = new THREE.Group();
          visorGroup.name = "visorGroup";
          visorGroup.position.set(-0.09, 2.26, 0.47);

          // Horizontal visor eye slit mesh
          const slitGeo = new THREE.PlaneGeometry(0.24, 0.04);
          const slitMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(activeThemeRef.current.keyLight),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.98,
          });
          const slitMesh = new THREE.Mesh(slitGeo, slitMat);
          slitMesh.rotation.y = 0.04;
          visorGroup.add(slitMesh);

          // Visor soft glow halo
          const glowGeo = new THREE.PlaneGeometry(0.45, 0.16);
          const glowMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(activeThemeRef.current.keyLight),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          glowMesh.position.z = 0.01;
          visorGroup.add(glowMesh);

          // Piercing eye point light shining forward
          const visorLight = new THREE.PointLight(activeThemeRef.current.keyLight, 6.0, 3.2);
          visorLight.position.set(0, 0, 0.14);
          visorGroup.add(visorLight);

          sceneMesh.add(visorGroup);
          visorRef.current = { group: visorGroup, light: visorLight, flare: glowMesh, mat: slitMat };

          currentMeshRef.current = sceneMesh;
          sceneMesh.rotation.y = -0.25;
        }

        sceneRef.current.loadModelFn = loadModel;

        const initialModel = MODELS_DATA.find((m) => m.id === activeModelId) || MODELS_DATA[0];
        loadModel(initialModel);

        // 8. Event Listeners (Parallax, Scroll, Stance)
        const onPointerMove = (e) => {
          const x = (e.clientX / window.innerWidth) * 2 - 1;
          const y = -(e.clientY / window.innerHeight) * 2 + 1;
          mouseRef.current.targetX = x;
          mouseRef.current.targetY = y;
        };

        const onScroll = () => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          scrollRef.current.targetProgress = Math.min(1, Math.max(0, scrollY / maxScroll));
        };

        const onResize = () => {
          if (!cameraRef.current || !rendererRef.current) return;
          const w = window.innerWidth;
          const h = window.innerHeight;
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);

          const desk = w >= 1024;
          const tab = w >= 768 && w < 1024;
          const curX = desk ? 1.4 : tab ? 0.75 : 0;
          const curZ = desk ? 0.2 : tab ? 0 : -0.4;
          const curScale = desk ? 0.95 : tab ? 0.85 : 0.75;

          if (modelGroupRef.current) {
            modelGroupRef.current.position.set(curX, -1.45, curZ);
            modelGroupRef.current.scale.set(curScale, curScale, curScale);
          }
          if (arenaRef.current) {
            arenaRef.current.position.set(curX, -1.5, curZ);
          }
          if (lightsRef.current.underLight) {
            lightsRef.current.underLight.position.x = curX;
          }
          if (lightsRef.current.chestLight) {
            lightsRef.current.chestLight.position.x = curX;
          }
        };

        const handleBattleStanceEvent = () => {
          triggerBattleStance();
        };

        const handleHeavySlashEvent = () => {
          triggerHeavySlash();
        };

        const inputAC = new AbortController();
        inputACRef.current = inputAC;
        window.addEventListener("pointermove", onPointerMove, { passive: true, signal: inputAC.signal });
        window.addEventListener("scroll", onScroll, { passive: true, signal: inputAC.signal });
        window.addEventListener("resize", onResize, { passive: true, signal: inputAC.signal });
        window.addEventListener("hellknight-battle-stance", handleBattleStanceEvent, { passive: true, signal: inputAC.signal });
        window.addEventListener("hellknight-heavy-slash", handleHeavySlashEvent, { passive: true, signal: inputAC.signal });
        onScroll();

        // §5 adaptive sharpness: sustained slow frames step the DPR down,
        // fast frames step it back up — the sheet's resolution governor.
        // Measured bug: the homepage loop idles at 30fps by design (§5A), and
        // 33ms frames read as "sustained slow" — the governor walked DPR down
        // to 0.55× while idle and never recovered (recovery needs <13ms =
        // 144Hz). Fix: the governor only samples FULL-budget frames (below);
        // ambient freezes DPR at whatever the last active period earned.
        const governance = createResolutionGovernor(renderer, {
          slowMs: 33,
          fastMs: 20,
        });

        // §5 render-on-demand: produce frames ONLY while the tab is visible
        // and the scene's host region is on screen. Scrolling past the hero
        // parks the loop entirely (cancelAnimationFrame, zero GPU/CPU work).
        const visibilityAC = new AbortController();
        visibilityACRef.current = visibilityAC;
        let sceneOnScreen = true;
        let parked = false;
        let visibilityQueued = false;
        const visibilityGate = () => {
          if (visibilityQueued) return; // one layout read per scroll FRAME, not per event
          visibilityQueued = true;
          requestAnimationFrame(() => {
            visibilityQueued = false;
            if (disposed || !container) return;
            const rect = container.getBoundingClientRect();
            const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
            if (onScreen !== sceneOnScreen) {
              sceneOnScreen = onScreen;
              if (onScreen && !parked) {
                clock.getDelta(); // discard the pause gap — no first-frame lurch
                reqIdRef.current = requestAnimationFrame(animate);
              } else if (!onScreen && reqIdRef.current) {
                cancelAnimationFrame(reqIdRef.current);
                reqIdRef.current = null;
              }
            }
          });
        };
        window.addEventListener("scroll", visibilityGate, { passive: true, signal: visibilityAC.signal });
        // §5 scene-tier CSS hook: main-thread card work (glass blur radii,
        // shadow layers) steps DOWN while the knight actually owns frames.
        // Poster mode never sets it — HTML stays at the sharp tier.
        const html = document.documentElement;
        html.dataset.scene = "3d";
        document.addEventListener(
          "visibilitychange",
          () => {
            if (document.hidden) {
              parked = true;
              if (reqIdRef.current) {
                cancelAnimationFrame(reqIdRef.current);
                reqIdRef.current = null;
              }
            } else {
              parked = false;
              visibilityGate();
            }
          },
          { signal: visibilityAC.signal }
        );

        // 9. Master Animation Loop — adaptive frame budget:
        //    60fps while the user interacts (pointermove/scroll/attack),
        //    30fps ambient when idle >2.5s (embers drift fine at 30;
        //    halves GPU/CPU + battery draw — measured §5 exception duty).
        //    User decision: the loop NEVER fully parks on the homepage.
        let clock = new THREE.Clock();
        const FRAME_BUDGET = { full: 0, ambient: 1000 / 30 };
        let frameBudget = FRAME_BUDGET.ambient; // idle until an explicit scene interaction
        let lastActivity = performance.now();
        const markActivity = () => {
          lastActivity = performance.now();
          frameBudget = FRAME_BUDGET.full;
        };
        // CRITICAL (the hover-neon contention report): pointermove/scroll do
        // NOT boost the scene. Hovering the content cards IS constant
        // pointermove — boosting there pinned WebGL at 60fps exactly during
        // card hovers and starved the DOM tilt-glow gradient paints (the
        // 'mouse movement is bad with graphics on, smooth with it off'
        // report). The parallax is a slow-follow lerp (0.05) — visually
        // fine at 30fps for a background layer. Only EXPLICIT scene
        // interactions buy the full 60fps budget:
        window.addEventListener("hellknight-battle-stance", markActivity, { passive: true, signal: inputAC.signal });
        window.addEventListener("hellknight-heavy-slash", markActivity, { passive: true, signal: inputAC.signal });
        container.addEventListener("pointerdown", markActivity, { passive: true, signal: inputAC.signal });

        const animate = () => {
          if (!sceneOnScreen || parked) {
            reqIdRef.current = null;
            return; // parked — the gate re-arms the loop when visible again
          }
          reqIdRef.current = requestAnimationFrame(animate);

          // ambient throttle: skip frames beyond the active budget
          const now = performance.now();
          if (now - lastActivity > 2500 && frameBudget !== FRAME_BUDGET.ambient) {
            frameBudget = FRAME_BUDGET.ambient;
          }
          if (frameBudget > 0 && now - (animate.lastFrame || 0) < frameBudget) return;
          animate.lastFrame = now;

          // Ambient frames are budget-paced, not performance-paced — sampling
          // them here would degrade DPR for idle pacing (the measured bug).
          if (frameBudget === FRAME_BUDGET.full) governance();

          if (document.hidden) return;

          const delta = clock.getDelta();
          const elapsedTime = clock.getElapsedTime();

          // Smooth lerp mouse parallax
          mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
          mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

          // Smooth lerp scroll
          scrollRef.current.progress += (scrollRef.current.targetProgress - scrollRef.current.progress) * 0.06;
          const scrollProg = scrollRef.current.progress;

          // Decay shockwave
          if (shockwaveRef.current.intensity > 0) {
            shockwaveRef.current.intensity = Math.max(0, shockwaveRef.current.intensity - delta * 2.2);
          }
          const shock = shockwaveRef.current.intensity;

          // Combat Attack Slash Animation
          let attackOffY = 0;
          let attackOffZ = 0;
          let attackRotX = 0;
          let attackRotY = 0;
          let attackRotZ = 0;

          if (attackRef.current.active) {
            attackRef.current.time += delta;
            const p = attackRef.current.time / attackRef.current.duration;
            if (p >= 1) {
              attackRef.current.active = false;
            } else {
              if (p < 0.22) {
                // Phase 1: Windup pullback
                const w = p / 0.22;
                attackRotY = w * 0.32;
                attackRotZ = w * 0.14;
                attackOffZ = -w * 0.18;
              } else if (p < 0.65) {
                // Phase 2: Violent Slash Strike!
                const s = (p - 0.22) / 0.43;
                const strikeEase = Math.sin(s * Math.PI * 0.5);
                attackRotY = 0.32 - strikeEase * 0.85;
                attackRotZ = 0.14 - strikeEase * 0.42;
                attackRotX = strikeEase * 0.25;
                attackOffZ = strikeEase * 0.42;
                attackOffY = -strikeEase * 0.1;

                // Screen shake on strike
                if (cameraRef.current && s < 0.45) {
                  cameraRef.current.position.x += (Math.random() - 0.5) * 0.035;
                  cameraRef.current.position.y += (Math.random() - 0.5) * 0.025;
                }
              } else {
                // Phase 3: Elastic recovery
                const r = (p - 0.65) / 0.35;
                const recEase = 1 - Math.sin(r * Math.PI * 0.5);
                attackRotY = -recEase * 0.53;
                attackRotZ = -recEase * 0.28;
                attackRotX = recEase * 0.25;
                attackOffZ = recEase * 0.42;
                attackOffY = -recEase * 0.1;
              }
            }
          }

          // Battle Stance Animation (on "ابدأ الآن" hover/click)
          let stanceScale = 1;
          let stanceOffY = 0;
          let stanceRotX = 0;

          if (stanceRef.current.active) {
            stanceRef.current.time += delta;
            const sp = stanceRef.current.time / stanceRef.current.duration;
            if (sp >= 1) {
              stanceRef.current.active = false;
            } else {
              const curve = Math.sin(sp * Math.PI);
              stanceScale = 1 + curve * 0.09;
              stanceOffY = curve * 0.16;
              stanceRotX = -curve * 0.12;

              // Visor eyes intense flare
              if (visorRef.current) {
                visorRef.current.light.intensity = 6.5 + curve * 14.0;
                visorRef.current.flare.scale.set(1 + curve * 1.6, 1 + curve * 1.6, 1);
              }
              if (arenaRingRef.current) {
                arenaRingRef.current.material.opacity = 0.8 + curve * 0.2;
              }
            }
          }

          // Animate Runic Ring on floor
          if (arenaRingRef.current) {
            arenaRingRef.current.rotation.z += delta * 0.45;
          }

          // Heavy Screen-Slash Charging Attack Animation (on "ابدأ الآن" click)
          let heavySlashOffX = 0;
          let heavySlashOffY = 0;
          let heavySlashOffZ = 0;
          let heavySlashRotX = 0;
          let heavySlashRotY = 0;
          let heavySlashRotZ = 0;

          if (heavySlashRef.current.active) {
            heavySlashRef.current.time += delta;
            const hp = heavySlashRef.current.time / heavySlashRef.current.duration;
            if (hp >= 1) {
              heavySlashRef.current.active = false;
            } else {
              if (hp < 0.16) {
                // Phase 1: Rapid menacing windup: pulls weapon back, tilts body, visor flares!
                const w = hp / 0.16;
                heavySlashRotY = w * 0.45;
                heavySlashRotZ = w * 0.22;
                heavySlashOffZ = -w * 0.25;
                heavySlashOffY = w * 0.12;
                if (visorRef.current?.light) {
                  visorRef.current.light.intensity = 6.5 + w * 14.0;
                }
              } else if (hp < 0.52) {
                // Phase 2: DEVASTATING CHARGE & SCREEN-SLASHING STRIKE!
                const s = (hp - 0.16) / 0.36;
                const strikeCurve = Math.sin(s * Math.PI * 0.5);
                heavySlashRotY = 0.45 - strikeCurve * 1.25;
                heavySlashRotZ = 0.22 - strikeCurve * 0.75;
                heavySlashRotX = strikeCurve * 0.42;
                heavySlashOffZ = strikeCurve * 1.05; // Clear forward lunge towards camera.
                heavySlashOffY = -strikeCurve * 0.24;
                heavySlashOffX = -strikeCurve * 0.42;

                if (cameraRef.current && s < 0.6) {
                  cameraRef.current.position.x += (Math.random() - 0.5) * 0.02;
                  cameraRef.current.position.y += (Math.random() - 0.5) * 0.015;
                }

                if (visorRef.current?.light) {
                  visorRef.current.light.intensity = 12.0;
                }
                if (arenaRingRef.current) {
                  arenaRingRef.current.material.opacity = 1.0;
                  arenaRingRef.current.rotation.z += delta * 4.0;
                }
              } else {
                // Phase 3: Transition portal follow-through
                const r = (hp - 0.52) / 0.33;
                const recCurve = 1 - Math.sin(r * Math.PI * 0.5);
                heavySlashRotY = -recCurve * 0.8;
                heavySlashRotZ = -recCurve * 0.53;
                heavySlashRotX = recCurve * 0.42;
                heavySlashOffZ = recCurve * 0.78;
                heavySlashOffY = -recCurve * 0.2;
                heavySlashOffX = -recCurve * 0.32;
              }
            }
          }

          // Animate Model Group
          if (modelGroupRef.current) {
            // Idle breathing & living weight oscillation
            const breathe = Math.sin(elapsedTime * 1.6) * 0.025;
            const floatY = Math.cos(elapsedTime * 1.2) * 0.025;

            const desk = window.innerWidth >= 1024;
            const tab = window.innerWidth >= 768 && window.innerWidth < 1024;
            const basePosX = desk ? 1.4 - scrollProg * 0.45 : tab ? 0.75 - scrollProg * 0.25 : 0;
            const basePosZ = (desk ? 0.2 : tab ? 0 : -0.4) + scrollProg * 0.25 - shock * 0.15;
            const basePosY = -1.45 + floatY + shock * 0.08;

            modelGroupRef.current.position.set(
              basePosX + heavySlashOffX,
              basePosY + attackOffY + stanceOffY + heavySlashOffY,
              basePosZ + attackOffZ + heavySlashOffZ
            );

            // Rotation driven by: Base pose + Scroll choreo + Mouse parallax + Living sway + Combat attack + Heavy Slash
            const scrollRotY = scrollProg * Math.PI * 0.7;
            const mouseRotY = mouseRef.current.x * 0.4;
            const swayRotY = Math.sin(elapsedTime * 0.8) * 0.035;

            const mouseRotX = -mouseRef.current.y * 0.18;
            const shockRotX = -shock * 0.08;

            modelGroupRef.current.rotation.y = -0.25 + scrollRotY + mouseRotY + swayRotY + attackRotY + heavySlashRotY;
            modelGroupRef.current.rotation.x = mouseRotX + shockRotX + attackRotX + stanceRotX + heavySlashRotX;
            modelGroupRef.current.rotation.z = Math.sin(elapsedTime * 1.0) * 0.015 - mouseRef.current.x * 0.04 + attackRotZ + heavySlashRotZ;

            const baseScale = desk ? 0.95 : tab ? 0.85 : 0.75;
            const scaleFactor = baseScale * (1 + breathe + shock * 0.04) * stanceScale;
            modelGroupRef.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }

          // Animate Dynamic Lights based on Shockwave
          if (lightsRef.current.keyLight) {
            const pulseMul = 1.0 + shock * 2.2;
            lightsRef.current.keyLight.intensity = 2.8 * pulseMul;
            lightsRef.current.fillLight.intensity = 1.4 * pulseMul;
            lightsRef.current.rimLight.intensity = 3.5 * pulseMul;
            lightsRef.current.underLight.intensity = (2.5 + Math.sin(elapsedTime * 3) * 0.4) * pulseMul;
            if (lightsRef.current.chestLight) {
              lightsRef.current.chestLight.intensity = 2.2 * pulseMul;
            }
          }

          // Animate Particles (rising ember field)
          if (particlesRef.current) {
            const { system, velocities, count } = particlesRef.current;
            const posAttr = system.geometry.attributes.position;
            const posArray = posAttr.array;
            const desk = window.innerWidth >= 1024;
            const curBaseX = desk ? 1.4 : 0;

            for (let i = 0; i < count; i++) {
              posArray[i * 3 + 1] += velocities[i * 3 + 1] * (1 + shock * 2.2);
              posArray[i * 3] += Math.sin(elapsedTime * 1.5 + i) * 0.003 + velocities[i * 3];
              posArray[i * 3 + 2] += velocities[i * 3 + 2];

              // Reset particles looping back to bottom
              if (posArray[i * 3 + 1] > 4) {
                posArray[i * 3 + 1] = -2;
                posArray[i * 3] = (Math.random() - 0.5) * 8 + curBaseX;
                posArray[i * 3 + 2] = (Math.random() - 0.5) * 6;
              }
            }
            posAttr.needsUpdate = true;
          }

          // Render
          renderer.render(scene, camera);
        };


        animate();
      } catch (err) {
        console.error("Three.js init error:", err);
      }
    }

    init3D();

    return () => {
      disposed = true;
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      // §9 memory contract: dispose EVERYTHING the scene allocated —
      // geometries, materials and their textures — or every visit to this
      // route leaks a full GLTF knight until GC pressure-collects it.
      const scene = sceneRef.current;
      if (scene?.traverse) {
        scene.traverse((obj) => {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
          for (const m of mats) {
            for (const key of Object.keys(m)) {
              const v = m[key];
              if (v && v.isTexture) v.dispose?.();
            }
            m.dispose?.();
          }
        });
      }
      sceneRef.current = null;
      visibilityACRef.current?.abort();
      inputACRef.current?.abort();
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      // §5 scene-tier hook: restore the sharp CSS tier for every other route.
      delete document.documentElement.dataset.scene;
    };
  }, [triggerShockwave, triggerBattleStance, triggerHeavySlash, skip3D]);

  // Mutate lights and materials dynamically on theme change without tearing down Three.js scene
  useEffect(() => {
    activeThemeRef.current = activeTheme;
    const lights = lightsRef.current;
    if (lights) {
      lights.hemiLight?.color?.set?.(activeTheme.hemiSky);
      lights.hemiLight?.groundColor?.set?.(activeTheme.hemiGround);
      lights.keyLight?.color?.set?.(activeTheme.keyLight);
      lights.fillLight?.color?.set?.(activeTheme.fillLight);
      lights.rimLight?.color?.set?.(activeTheme.rimLight);
      lights.underLight?.color?.set?.(activeTheme.underLight);
      lights.chestLight?.color?.set?.(activeTheme.chestLight);
    }
    if (arenaRingRef.current?.material) {
      arenaRingRef.current.material.color?.set?.(activeTheme.keyLight);
    }
    if (groundGlowRef.current?.material) {
      groundGlowRef.current.material.color?.set?.(activeTheme.underLight);
    }
    const visor = visorRef.current;
    if (visor) {
      visor.mat?.color?.set?.(activeTheme.keyLight);
      visor.flare?.material?.color?.set?.(activeTheme.keyLight);
      visor.light?.color?.set?.(activeTheme.keyLight);
    }
    if (currentMeshRef.current) {
      currentMeshRef.current.traverse((child) => {
        if (child.isMesh && child.material && child.name !== "visorGroup" && child.parent?.name !== "visorGroup") {
          child.material.color?.set?.(activeTheme.armorColor);
          if (activeTheme.metalness !== undefined) child.material.metalness = activeTheme.metalness;
          if (activeTheme.roughness !== undefined) child.material.roughness = activeTheme.roughness;
        }
      });
    }
  }, [activeTheme]);


  // ── Weapon Switching Handler ──────────────────────────────────────────────
  const handleSelectModel = (modelInfo) => {
    setActiveModelId(modelInfo.id);
    triggerShockwave();
    if (sceneRef.current && sceneRef.current.loadModelFn) {
      sceneRef.current.loadModelFn(modelInfo);
    }
  };

  // ── Theme Switching Handler ───────────────────────────────────────────────
  const handleSelectTheme = (theme) => {
    setActiveThemeId(theme.id);
    triggerShockwave();

    // Update lights in real-time
    const lights = lightsRef.current;
    if (lights.keyLight) {
      lights.hemiLight.color.set(theme.hemiSky);
      lights.hemiLight.groundColor.set(theme.hemiGround);
      lights.keyLight.color.set(theme.keyLight);
      lights.fillLight.color.set(theme.fillLight);
      lights.rimLight.color.set(theme.rimLight);
      lights.underLight.color.set(theme.underLight);
      if (lights.chestLight) {
        lights.chestLight.color.set(theme.chestLight);
      }
    }

    // Update arena rune ring
    if (arenaRingRef.current) {
      arenaRingRef.current.material.color.set(theme.keyLight);
    }

    // Update visor eye lights
    if (visorRef.current?.light) {
      visorRef.current.light.color.set(theme.color);
    }

    // Update model material
    if (currentMeshRef.current) {
      currentMeshRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.set(theme.armorColor);
          child.material.metalness = theme.metalness;
          child.material.roughness = theme.roughness;
        }
      });
    }

    // Update particle colors
    if (particlesRef.current) {
      const { system, count } = particlesRef.current;
      const colorAttr = system.geometry.attributes.color;
      const colorArr = colorAttr.array;
      const c1 = new (window.THREE?.Color || system.material.color.constructor)(theme.keyLight);
      const c2 = new (window.THREE?.Color || system.material.color.constructor)(theme.fillLight);

      for (let i = 0; i < count; i++) {
        const m = c1.clone().lerp(c2, Math.random());
        colorArr[i * 3] = m.r;
        colorArr[i * 3 + 1] = m.g;
        colorArr[i * 3 + 2] = m.b;
      }
      colorAttr.needsUpdate = true;
    }
  };

  // §4 poster mode: saver / heavy-3D-off / reduced-motion users get a
  // static gradient shell — same atmosphere, zero WebGL, zero loop, zero
  // HUD for a knight that does not exist.
  if (skip3D) {
    return (
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
        style={{
          background: "radial-gradient(ellipse 90% 80% at 75% 45%, #0f121d 0%, #07090e 65%, #030407 100%)",
        }}
      />
    );
  }

  return (
    <>
      {/* FIXED 3D Canvas — Sits behind all content, clicks trigger weapon slash */}
      <div
        ref={mountRef}
        onClick={triggerAttack}
        className={`fixed inset-0 z-0 pointer-events-auto cursor-crosshair overflow-hidden ${className}`}
        style={{
          background: "radial-gradient(ellipse 90% 80% at 75% 45%, #0f121d 0%, #07090e 65%, #030407 100%)",
        }}
      />

      {/* Atmospheric Vignette & Deep Space Overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 40%, rgba(3, 4, 7, 0.7) 90%)`,
        }}
      />

      {/* Shockwave Pulse Flash Visualizer */}
      <div
        className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-500 ${
          pulseActive ? "opacity-35" : "opacity-0"
        }`}
        style={{
          background: `radial-gradient(circle at 75% 50%, ${activeTheme.color} 0%, transparent 70%)`,
        }}
      />

      {/* ── Interactive 3D Warrior HUD Dock (Alpha Control Panel) ── */}
      <div className="fixed bottom-6 end-6 z-30 flex flex-col items-end gap-2.5 font-sans select-none">
        {/* Toggle HUD Button */}
        <button
          onClick={() => setHudOpen((prev) => !prev)}
          className="group flex items-center gap-2.5 px-4 py-2 rounded-full ios-glass-dock border border-white/15 text-xs font-black text-white hover:border-cyan-400/50 shadow-2xl transition-colors duration-300 backdrop-blur-xl"
          style={{
            boxShadow: `0 0 20px -3px ${activeTheme.color}35`,
          }}
          title="ترسانة المحارب والمظهر ثلاثي الأبعاد"
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: activeTheme.color }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: activeTheme.color }}
            />
          </span>
          <span className="tracking-wide">
            {MODELS_DATA.find((m) => m.id === activeModelId)?.name}
          </span>
          <span className="text-white/40 group-hover:text-white transition-colors">
            {hudOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </span>
        </button>

        {/* Expanded HUD Panel */}
        {hudOpen && (
          <div
            className="w-72 p-4 rounded-3xl ios-glass-card border border-white/20 shadow-2xl backdrop-blur-2xl flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-250 text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-black text-white">ترسانة بلاك فايترز 3D</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                60 FPS
              </span>
            </div>

            {/* Model Weapon Selection */}
            <div>
              <div className="text-[10px] font-bold text-white/50 mb-2 flex items-center gap-1.5">
                <Swords className="w-3 h-3 text-cyan-400" />
                <span>اختر سلاح الفارس:</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MODELS_DATA.map((item) => {
                  const Icon = item.icon;
                  const isCur = activeModelId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectModel(item)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-colors ${
                        isCur
                          ? "bg-white/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,242,254,0.3)]"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${isCur ? "text-cyan-400" : "text-white/50"}`} />
                      <span className="text-[11px] font-black">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lighting Theme Selection */}
            <div>
              <div className="text-[10px] font-bold text-white/50 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>هالة الطاقة والإضاءة:</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map((theme) => {
                  const isCur = activeThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[10px] font-bold transition-colors ${
                        isCur
                          ? "bg-white/15 text-white border-white/40 shadow-lg"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span>{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactical Combat Trigger */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50">
              <span className="font-mono text-cyan-400">انقر الشاشة لتنفيذ هجوم</span>
              <button
                onClick={triggerAttack}
                className="text-cyan-300 font-bold hover:underline flex items-center gap-1"
              >
                <span>ضربة سلاح ⚡</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
