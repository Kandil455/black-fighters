import React, { useState } from "react";
import { Lock, Check, Coins, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { AVATAR_FRAMES, ownsFrame } from "@/lib/avatars";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// متجر الإطارات: يعرض كل الإطارات، يفتح المملوكة ويشتري الباقي بالكريدتس.
export default function FrameStore({ user, avatar, isVideo, selected, onSelect, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const credits = user?.credits ?? 0;

  const buy = async (key, price) => {
    if (credits < price) return toast.error("كريدتس مش كافية — ذاكر وحل كويزات عشان تجمّع 💪");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "frame", key });
      if (data?.error) return toast.error(data.error);
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success(`فتحت إطار ${AVATAR_FRAMES[key].label}! 🎉`);
      onUserUpdate?.({ credits: data.credits, owned_frames: data.owned_frames });
      onSelect(key);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "حصل خطأ في الشراء");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold">Animated Frames</p>
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
          <Coins className="w-4 h-4" /> {credits} Credits
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {Object.entries(AVATAR_FRAMES).map(([key, f]) => {
          const owned = ownsFrame(user, key);
          const isSelected = selected === key;
          return (
            <motion.div key={key} whileHover={{ y: -3 }} className="flex flex-col items-center gap-2">
              <button
                onClick={() => (owned ? onSelect(key) : buy(key, f.price))}
                disabled={buying === key}
                className={`relative rounded-2xl p-3 w-full flex justify-center transition-colors border-2 ${
                  isSelected ? "border-primary neon-glow-cyan bg-primary/5" : "border-border hover:border-primary/40"
                }`}
                title={f.label}
              >
                <AnimatedAvatar src={avatar} isVideo={isVideo} frame={key} size={60} fallback={user?.profile_emoji || "🙂"} animate={isSelected} />
                {!owned && (
                  <span className="absolute inset-0 rounded-2xl bg-background/55 backdrop-blur-[1px] flex items-center justify-center">
                    {buying === key ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                  </span>
                )}
                {isSelected && owned && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
              </button>
              <span className={`text-[11px] font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>{f.label}</span>
              {!owned ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                  <Coins className="w-3 h-3" /> {f.price}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Unlocked</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
