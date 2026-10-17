import React, { useState } from "react";
import { Lock, Check, Coins, Loader2, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE_BANNERS, ownsBanner } from "@/lib/avatars";
import ProfileBanner from "@/components/profile/ProfileBanner";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useLocale } from "@/lib/LocaleContext";

export default function BannerStore({ user, selected, onSelect, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const { locale } = useLocale();
  const isEn = locale === "en";
  const credits = user?.credits ?? 0;

  const buy = async (key, price) => {
    if (credits < price) return toast.error("كريدتس مش كافية — ذاكر وحل كويزات 💪");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "banner", key });
      if (data?.error) return toast.error(data.error);
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      toast.success(`فتحت بانر ${PROFILE_BANNERS[key].labelAr || PROFILE_BANNERS[key].label}! 🎉`);
      onUserUpdate?.({ credits: data.credits, owned_banners: data.owned_banners });
      onSelect(key);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "حصل خطأ في الشراء");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-black flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          {isEn ? "Animated RPG Game Scene Banners" : "بنرات مشاهد الألعاب المتحركة"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEn
            ? "Live panoramic RPG scenes with flying dragons, lightning storms, and cyber portals."
            : "مشاهد بانورامية حية مرسومة بتنانين محلقّة، صواعق رعدية، وبوابات طاقة تتحرك أعلى بطاقتك."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {Object.entries(PROFILE_BANNERS).map(([key, b]) => {
          const owned = ownsBanner(user, key);
          const isSelected = selected === key;

          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ y: -3 }}
              onClick={() => (owned ? onSelect(key) : buy(key, b.price))}
              disabled={buying === key}
              className={`group relative rounded-2xl overflow-hidden border-2 text-start transition-all ${
                isSelected
                  ? "border-primary shadow-[0_0_26px_rgba(25,240,140,0.25)]"
                  : owned
                  ? "border-border/80 hover:border-primary/50"
                  : "border-border/50 hover:border-amber-400/50"
              }`}
              title={b.label}
            >
              {/* Live Animated RPG Banner Scene */}
              <ProfileBanner banner={key} previewMode={true} className="rounded-none" />

              {/* Bottom Info Bar */}
              <div className="relative z-10 flex items-center justify-between gap-2 bg-card/90 px-3.5 py-2.5 border-t border-white/10">
                <span className="text-xs font-black text-foreground truncate">
                  {isEn ? b.label : b.labelAr || b.label}
                </span>

                {buying === key ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : isSelected && owned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black text-primary-foreground shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" /> {isEn ? "Active" : "مُفعّل"}
                  </span>
                ) : owned ? (
                  <span className="text-[11px] font-bold text-emerald-400 shrink-0">
                    {isEn ? "Unlocked" : "مفتوح ✔"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-xs font-black text-amber-300 font-mono tabular-nums shrink-0">
                    <Lock className="w-3 h-3" />
                    <Coins className="w-3 h-3" /> {b.price}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
