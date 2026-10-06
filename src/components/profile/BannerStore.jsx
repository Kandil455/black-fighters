import React, { useState } from "react";
import { Lock, Check, Coins, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE_BANNERS, ownsBanner } from "@/lib/avatars";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function BannerStore({ user, selected, onSelect, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const credits = user?.credits ?? 0;

  const buy = async (key, price) => {
    if (credits < price) return toast.error("كريدتس مش كافية — ذاكر وحل كويزات 💪");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "banner", key });
      if (data?.error) return toast.error(data.error);
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      toast.success(`فتحت بانر ${PROFILE_BANNERS[key].label}! 🎉`);
      onUserUpdate?.({ credits: data.credits, owned_banners: data.owned_banners });
      onSelect(key);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "حصل خطأ في الشراء");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div>
      <p className="text-sm font-bold mb-4">Animated Banners</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(PROFILE_BANNERS).map(([key, b]) => {
          const owned = ownsBanner(user, key);
          const isSelected = selected === key;
          return (
            <motion.button
              key={key}
              whileHover={{ y: -2 }}
              onClick={() => (owned ? onSelect(key) : buy(key, b.price))}
              disabled={buying === key}
              className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-colors ${
                isSelected ? "border-primary neon-glow-cyan" : "border-border hover:border-primary/40"
              }`}
              title={b.label}
            >
              {/* خلفية متدرّجة متحركة */}
              {key === "none" ? (
                <span className="absolute inset-0 bg-secondary" />
              ) : (
                <>
                  {b.poster && <img src={b.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
                  <motion.span
                    className="absolute inset-0"
                    style={{ background: b.css, backgroundSize: "220% 220%", opacity: b.poster ? 0.42 : 1 }}
                    animate={isSelected ? { backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] } : undefined}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}
              {/* لمعة مارّة */}
              {key !== "none" && isSelected && (
                <motion.span
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)" }}
                  animate={{ x: ["-120%", "120%"] }}
                  transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
                />
              )}
              {/* صورة الإطار لو موجودة */}
              {b.img && <img src={b.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none" />}
              <span className="absolute bottom-1 left-1.5 text-[11px] font-bold text-white drop-shadow z-10">{b.label}</span>
              {!owned && (
                <span className="absolute inset-0 bg-background/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
                  {buying === key ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Coins className="w-3 h-3" /> {b.price}
                      </span>
                    </>
                  )}
                </span>
              )}
              {isSelected && owned && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
