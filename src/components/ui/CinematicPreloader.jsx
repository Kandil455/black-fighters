import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function CinematicPreloader({ onComplete }) {
  const containerRef = useRef(null);
  const orbRef = useRef(null);
  const videoRef = useRef(null);
  const lettersRef = useRef([]);
  const subtitleRef = useRef(null);
  const lineRef = useRef(null);
  const percentRef = useRef(null);
  const progressBarRef = useRef(null);
  const glowRef = useRef(null);
  const [display, setDisplay] = useState(true);
  const [isMuted, setIsMuted] = useState(true);


  useEffect(() => {
    const isMobile = typeof window !== "undefined" && (window.innerWidth < 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 1024));
    // DEEP LINKS skip the intro: /q/:id and /challenge arrive from Telegram
    // or a shared description — the user's intent is to take a quiz NOW.
    // Forcing the full-screen black intro first read as an 'infinite empty
    // black page' bug. Direct-intent routes go straight to the content.
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const isDeepLink = path.startsWith("/q/") || path.startsWith("/challenge");
    if (isMobile || isDeepLink || sessionStorage.getItem("bf_video_intro_v2") === "true") {
      setDisplay(false);
      onComplete?.();
      return;
    }

    let isDone = false;
    let cleanup = () => {};
    let fallbackTimer;

    const finish = async () => {
      if (isDone) return;
      isDone = true;
      sessionStorage.setItem("bf_video_intro_v2", "true");
      
      const { gsap } = await import("gsap");
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          yPercent: -100,
          opacity: 0,
          duration: 0.7,
          ease: "power3.inOut",
          onComplete: () => {
            setDisplay(false);
            onComplete?.();
          },
        });
      } else {
        setDisplay(false);
        onComplete?.();
      }
    };

    import("gsap").then(({ gsap }) => {
      if (isDone) return; // if already skipped
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: finish,
        });

        gsap.set(lettersRef.current.filter(Boolean), { y: 25, opacity: 0 });
        gsap.set(subtitleRef.current, { y: 15, opacity: 0 });
        gsap.set(lineRef.current, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(progressBarRef.current, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(orbRef.current, { scale: 0.85, opacity: 0, y: -15 });

        // Force a maximum time so we never hang
        fallbackTimer = setTimeout(finish, 6000);

        tl.to(orbRef.current, {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "expo.out",
        })
        .to(progressBarRef.current, { scaleX: 1, duration: 2.8, ease: "power1.inOut" }, "-=0.5")
        .to(
          percentRef.current,
          {
            innerHTML: 100,
            duration: 2.8,
            ease: "none",
            snap: { innerHTML: 1 },
            onUpdate: function () {
              if (percentRef.current) {
                percentRef.current.innerHTML = Math.round(this.targets()[0].innerHTML) + "%";
              }
            },
          },
          "<"
        )
        .to(
          lettersRef.current.filter(Boolean),
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "back.out(1.5)" },
          "-=2.0"
        )
        .to(subtitleRef.current, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=1.5")
        .to(lineRef.current, { scaleX: 1, duration: 0.8, ease: "power3.inOut" }, "-=1.0")
        .to({}, { duration: 0.4 });

        if (glowRef.current) {
          gsap.to(glowRef.current, {
            scale: 1.25,
            opacity: 0.8,
            duration: 1.6,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        }
      }, containerRef);
      
      cleanup = () => ctx.revert();
    });

    return () => {
      clearTimeout(fallbackTimer);
      cleanup();
    };
  }, [onComplete]);


  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      videoRef.current.play().catch(() => {});
    }
  };


  const handleSkip = async () => {
    sessionStorage.setItem("bf_video_intro_v2", "true");
    const { gsap } = await import("gsap");
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        yPercent: -100,
        opacity: 0,
        duration: 0.35,
        ease: "power3.inOut",
        onComplete: () => {
          setDisplay(false);
          onComplete?.();
        },
      });
    } else {
      setDisplay(false);
      onComplete?.();
    }
  };

  if (!display) return null;

  const LETTERS = "BLACK FIGHTERS".split("");

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ backgroundColor: "#06070a" }}
    >
      {/* Ambient Radial Nebula Glow */}
      <div
        ref={glowRef}
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,242,254,0.18) 0%, rgba(121,40,202,0.1) 45%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.5,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-md px-4 sm:px-6">
        {/* Holographic Black Fighters Spartan Video Container */}
        <div ref={orbRef} className="relative flex flex-col items-center justify-center w-full">
          {/* Animated Neon Pulse Rings behind video */}
          <div
            className="absolute -inset-3.5 rounded-3xl opacity-40 blur-2xl animate-pulse pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(0,242,254,0.7) 0%, rgba(121,40,202,0.4) 60%, transparent 80%)",
            }}
          />

          {/* Cinematic Video Hologram Container */}
          <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-cyan-400/40 bg-black/95 shadow-[0_0_40px_rgba(0,242,254,0.35),inset_0_0_20px_rgba(0,242,254,0.15)] backdrop-blur-2xl group">
            <video
              ref={videoRef}
              poster="/videos/black-fighters-poster.jpg"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              className="w-full h-full object-cover select-none pointer-events-none"
            >
              <source src="/videos/black-fighters-intro.webm" type="video/webm" />
              <source src="/videos/black-fighters-intro.mp4" type="video/mp4" />
            </video>

            {/* Corner Tech Anchors */}
            <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
            <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={toggleMute}
              className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-[11px] font-mono font-bold text-cyan-300 border border-cyan-500/40 transition shadow-lg backdrop-blur-md cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
              <span>{isMuted ? "Sound Off" : "Sound On"}</span>
            </button>
          </div>
        </div>

        {/* Brand Letters: Forced LTR so it spells BLACK FIGHTERS strictly */}
        <div
          className="flex items-center gap-1.5 overflow-hidden select-none"
          dir="ltr"
          style={{ direction: "ltr", display: "flex", flexDirection: "row", unicodeBidi: "isolate" }}
        >
          {LETTERS.map((letter, i) => (
            <span
              key={i}
              ref={(el) => (lettersRef.current[i] = el)}
              style={{
                fontSize: "clamp(1.3rem, 4vw, 2.1rem)",
                fontWeight: "900",
                letterSpacing: letter === " " ? "0.3em" : "0.08em",
                background: "linear-gradient(180deg, #FFFFFF 0%, #00f2fe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: "var(--font-heading, sans-serif)",
                display: "inline-block",
                minWidth: letter === " " ? "0.6rem" : "auto",
                filter: "drop-shadow(0 0 10px rgba(0,242,254,0.35))",
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </div>

        {/* Subtitle */}
        <div ref={subtitleRef}>
          <p
            style={{
              fontSize: "9px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "rgba(0,245,255,0.9)",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            NEXT-GEN STUDY ECOSYSTEM
          </p>
        </div>

        {/* Separator Line */}
        <div className="w-full flex items-center">
          <div
            className="w-full h-[1px]"
            ref={lineRef}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.5), rgba(191,95,255,0.5), transparent)",
            }}
          />
        </div>

        {/* Progress Bar & Real Counter */}
        <div className="w-full space-y-2" dir="ltr">
          <div className="flex justify-between items-center text-xs">
            <span style={{ fontSize: "8px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              INITIALIZING
            </span>
            <span
              ref={percentRef}
              style={{
                fontSize: "12px",
                fontWeight: "900",
                color: "#00f5ff",
                fontFamily: "monospace",
                textShadow: "0 0 10px rgba(0,245,255,0.8)",
              }}
            >
              0%
            </span>
          </div>
          <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              ref={progressBarRef}
              className="h-full rounded-full w-full"
              style={{ background: "linear-gradient(90deg, #00f5ff, #bf5fff, #00f5ff)", boxShadow: "0 0 10px rgba(0,245,255,0.7)" }}
            />
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="mt-1 text-[10px] tracking-[0.2em] font-bold text-white/40 hover:text-white/80 transition-colors uppercase cursor-pointer"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          تخطي — Skip ↵
        </button>
      </div>
    </div>
  );
}
