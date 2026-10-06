import React, { useEffect, useRef, useState } from "react";
import { use3DQuality, prefersReducedMotion } from "@/lib/webglQuality";

const DEFAULT_ACTIONS = {
  idle: ["Idle", "Standing", "Survey"],
  active: ["Dance", "Jump", "Walking", "Running", "Idle"],
  talking: ["Talking", "Dance", "Idle"],
};

function useVisible(ref) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "180px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}

export default function Mascot3DModel({ model, size = 80, state = "idle", glow = "#00e5ff", animate = true, fallback = null }) {
  const mountRef = useRef(null);
  const mixerRef = useRef(null);
  const actionRef = useRef(null);
  const actionPlayerRef = useRef(() => {});
  const stateRef = useRef(state);
  const rendererRef = useRef(null);
  const frameRef = useRef(0);
  const resumeRef = useRef(null); // restarts the parked render loop on demand
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const visible = useVisible(mountRef);
  const visibleRef = useRef(false);
  visibleRef.current = visible;
  const quality = use3DQuality();
  // Boot ONCE the first time the mascot is visible; afterwards keep the scene
  // alive and idle-skip while offscreen. (`visible` used to sit in the boot
  // effect deps — that tore down and rebuilt the whole WebGL scene on every
  // scroll in/out. See report ت٤.)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (visible) setReady(true);
  }, [visible]);

  useEffect(() => {
    stateRef.current = state;
    actionPlayerRef.current(state);
  }, [state]);

  // Restart the parked render loop when the mascot scrolls back into view or the
  // tab becomes visible again (tick() parks itself while offscreen — agy §8.1).
  useEffect(() => {
    if (!ready) return;
    if (visibleRef.current && !document.hidden) resumeRef.current?.();
    const onVisibility = () => {
      if (!document.hidden && visibleRef.current) resumeRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [ready, visible]);

  useEffect(() => {
    if (!model?.url || !animate || !ready || prefersReducedMotion() || typeof window === "undefined") return;
    let disposed = false;
    let scene;
    let camera;
    let renderer;
    let clock;

    async function boot() {
      try {
        setFailed(false);
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (disposed || !mountRef.current) return;

        scene = new THREE.Scene();
        scene.background = null;
        camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, model.cameraY ?? 0.2, model.cameraZ ?? 5.2);

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: quality.antialias,
          powerPreference: quality.powerPreference,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, model.pixelRatioCap ?? quality.pixelRatioCap));
        renderer.setSize(size, size, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.style.width = `${size}px`;
        renderer.domElement.style.height = `${size}px`;
        rendererRef.current = renderer;
        mountRef.current.innerHTML = "";
        mountRef.current.appendChild(renderer.domElement);

        // ── Drag-to-rotate ─────────────────────────────────────────────
        renderer.domElement.style.cursor = "grab";
        renderer.domElement.addEventListener("pointerdown", (e) => {
          isDraggingRef.current = true;
          prevMouseRef.current = { x: e.clientX, y: e.clientY };
          rotationVelocityRef.current = 0;
          renderer.domElement.style.cursor = "grabbing";
          renderer.domElement.setPointerCapture(e.pointerId);
        });
        renderer.domElement.addEventListener("pointermove", (e) => {
          if (!isDraggingRef.current) return;
          const dx = e.clientX - prevMouseRef.current.x;
          prevMouseRef.current = { x: e.clientX, y: e.clientY };
          if (root) root.rotation.y += dx * 0.012;
          rotationVelocityRef.current = dx * 0.012;
        });
        renderer.domElement.addEventListener("pointerup", () => {
          isDraggingRef.current = false;
          renderer.domElement.style.cursor = "grab";
        });
        renderer.domElement.addEventListener("pointerleave", () => {
          isDraggingRef.current = false;
          renderer.domElement.style.cursor = "grab";
        });

        const ambient = new THREE.HemisphereLight(0xffffff, 0x1a1830, 2.4);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(2, 4, 4);
        scene.add(key);
        const rim = new THREE.PointLight(glow, 7, 5);
        rim.position.set(-2, 1.5, 2);
        scene.add(rim);

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(model.url);
        if (disposed) return;
        const root = gltf.scene;
        root.rotation.x = model.rotationX ?? 0;
        root.rotation.y = model.rotationY ?? 0;
        root.rotation.z = model.rotationZ ?? 0;

        if (model.tint) {
          root.traverse((obj) => {
            if (!obj.material) return;
            const wasArray = Array.isArray(obj.material);
            const materials = wasArray ? obj.material : [obj.material];
            const tinted = materials.map((mat) => {
              const copy = mat.clone();
              if (copy.color?.offsetHSL) copy.color.offsetHSL(0, 0, model.tintStrength ?? 0.08);
              if (copy.emissive?.set) {
                copy.emissive.set(model.tint);
                copy.emissiveIntensity = model.emissiveIntensity ?? 0.08;
              }
              return copy;
            });
            obj.material = wasArray ? tinted : tinted[0];
          });
        }

        const box = new THREE.Box3().setFromObject(root);
        const boxSize = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(boxSize.x, boxSize.y, boxSize.z, 0.0001);
        const fitTarget = model.fitSize ?? 2.45;
        const fitScale = model.disableAutoFit ? 1 : fitTarget / maxAxis;
        root.scale.multiplyScalar((model.scale ?? 1) * fitScale);
        root.updateMatrixWorld(true);

        const fittedBox = new THREE.Box3().setFromObject(root);
        const center = fittedBox.getCenter(new THREE.Vector3());
        root.position.sub(center);
        root.position.x += model.x ?? 0;
        root.position.y += model.y ?? 0;
        root.position.z += model.z ?? 0;
        scene.add(root);
        camera.lookAt(0, model.lookAtY ?? 0, 0);

        const mixer = new THREE.AnimationMixer(root);
        mixerRef.current = mixer;
        const clips = gltf.animations || [];
        const playState = (nextState) => {
          const preferred = model.actions?.[nextState] || DEFAULT_ACTIONS[nextState] || DEFAULT_ACTIONS.idle;
          const clip = preferred.map((name) => THREE.AnimationClip.findByName(clips, name)).find(Boolean) || clips[0];
          if (!clip || actionRef.current?.getClip?.() === clip) return;
          const previous = actionRef.current;
          const next = mixer.clipAction(clip);
          previous?.fadeOut?.(0.18);
          next.reset().fadeIn(0.18).play();
          actionRef.current = next;
        };
        actionPlayerRef.current = playState;
        playState(stateRef.current);

        clock = new THREE.Clock();
        const tick = () => {
          if (disposed) return;
          // ت٤ render-on-demand: skip mixer math + GPU work while hidden/offscreen
          if (document.hidden || !visibleRef.current) {
            // Park the loop completely — was: re-schedule a 60fps no-op frame
            // forever (agy §8.1). resumeRef() restarts it when it matters.
            frameRef.current = 0;
            return;
          }
          const delta = Math.min(clock.getDelta(), 0.05);
          mixer.update(delta);
          if (isDraggingRef.current) {
            // user is actively dragging — rotation applied in pointermove
          } else {
            // inertia decay after drag, then fall back to gentle auto-rotate
            rotationVelocityRef.current *= 0.92;
            if (Math.abs(rotationVelocityRef.current) > 0.0002) {
              root.rotation.y += rotationVelocityRef.current;
            } else {
              root.rotation.y += model.autoRotate === false ? 0 : (model.autoRotateSpeed ?? 0.0035) * 0.4;
            }
          }
          if (!document.hidden) renderer.render(scene, camera);
          frameRef.current = requestAnimationFrame(tick);
        };
        // Park/resume plumbing for the offscreen case (see the guard in tick()).
        resumeRef.current = () => {
          if (disposed || frameRef.current) return;
          clock.getDelta(); // drop the parked interval so motion stays continuous
          frameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        if (!disposed) setFailed(true);
      }
    }

    boot();

    return () => {
      disposed = true;
      resumeRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      mixerRef.current?.stopAllAction?.();
      mixerRef.current = null;
      actionRef.current = null;
      actionPlayerRef.current = () => {};
      if (scene) {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
          materials.forEach((mat) => {
            Object.values(mat).forEach((value) => {
              if (value?.isTexture) value.dispose?.();
            });
            mat.dispose?.();
          });
        });
      }
      rendererRef.current?.dispose?.();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
    // Depend on the PRIMITIVE quality knobs — `quality` itself is a fresh object
    // every render (webglQuality.use3DQuality), so using it as a dep rebuilt the
    // scene on every parent render too.
  }, [animate, glow, model, size, ready, quality.antialias, quality.pixelRatioCap, quality.powerPreference]);

  if (failed || !model?.url || !animate || prefersReducedMotion()) return fallback;

  // NOTE on the CSS drop-shadow filter: it re-rasterizes the canvas layer on
  // every GPU frame the WebGL loop produces. Fine for one hero mascot; when
  // several small mascots render (chat header + bubble + input row), the
  // filter cost multiplies. Small sizes (<= 48px) skip the filter — the rim
  // light inside the scene already provides the glow cue there.
  const filter = size <= 48 ? undefined : `drop-shadow(0 0 ${Math.round(size * 0.18)}px ${glow}88)`;

  return (
    <div
      ref={mountRef}
      className="relative z-[2] flex items-center justify-center"
      style={{ width: size, height: size, filter }}
      aria-label={model.name || "3D mascot"}
    />
  );
}
