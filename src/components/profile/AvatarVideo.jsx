import React, { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// فيديو الأفاتار — يشتغل تلقائي (مكتوم لازم للمتصفح) مع زر صغير لتشغيل الصوت وعزل كامل للطبقة
export default function AvatarVideo({ src }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);

  const toggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const v = ref.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    if (!next) { v.volume = 1; v.play?.().catch(() => {}); }
    setMuted(next);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-[inherit]"
      style={{
        isolation: "isolate",
        transform: "translate3d(0,0,0)",
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
      }}
    >
      <video
        ref={ref}
        src={src}
        className="w-full h-full max-w-full max-h-full object-cover rounded-[inherit]"
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
        autoPlay
        loop
        muted
        playsInline
      />
      <button
        onClick={toggle}
        className="absolute bottom-1 right-1 z-20 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white hover:bg-black/90 transition shadow-md"
        title={muted ? "تشغيل الصوت" : "كتم الصوت"}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}