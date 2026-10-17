import React, { useState } from "react";
import { Check, Coins, Loader2, Lock, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ORBIT_EFFECTS, TIER_LABELS, ownsOrbitEffect } from "@/lib/avatars";
import { toast } from "sonner";
import OrbitEffectGlyph from "@/components/profile/OrbitEffectGlyph";
import Avatar3DOrbit from "@/components/profile/Avatar3DOrbit";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { useLocale } from "@/lib/LocaleContext";

const MAX_ACTIVE = 5;

export default function OrbitStore({ user, selected = [], onChange, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const [previewHover, setPreviewHover] = useState(null);
  const { locale } = useLocale();
  const isEn = locale === "en";
  const active = Array.isArray(selected) ? selected : selected && selected !== "none" ? [selected] : [];

  const toggle = (key) => {
    if (active.includes(key)) return onChange(active.filter((item) => item !== key));
    if (active.length >= MAX_ACTIVE) {
      return toast.error(isEn ? `You can equip up to ${MAX_ACTIVE} orbit relics` : `يمكنك تفعيل حتى ${MAX_ACTIVE} جواهر مدار معاً`);
    }
    onChange([...active, key]);
  };

  const buy = async (key) => {
    const item = ORBIT_EFFECTS[key];
    if (Number(user?.credits || 0) < item.price) {
      return toast.error(isEn ? "Not enough credits" : "كريدتس غير كافية — ذاكر وحل كويزات 💪");
    }
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "orbit", key });
      onUserUpdate?.({ credits: data.credits, owned_orbit_effects: data.owned_orbit_effects });
      onChange([...active, key].slice(0, MAX_ACTIVE));
      toast.success(isEn ? `${item.label} unlocked!` : `فتحت جوهرة المدار ${item.labelAr || item.label}! ✨`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  const stageModels = previewHover
    ? [...new Set([previewHover, ...active])].slice(0, MAX_ACTIVE)
    : active.length
    ? active
    : ["dragon", "crown"];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {isEn ? "3D Collectible Orbit Relics" : "مقتنيات وجواهر المدار ثلاثية الأبعاد"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? `Combine up to ${MAX_ACTIVE} animated 3D relics orbiting your avatar simultaneously.`
              : `ركّب حتى ${MAX_ACTIVE} جواهر ومقتنيات ثلاثية الأبعاد تدور وتلمع حياً حول صورتك.`}
          </p>
        </div>
        {!!active.length && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 text-xs font-bold hover:border-primary/40 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> {isEn ? "Clear Orbit" : "إخلاء المدار"} ({active.length}/{MAX_ACTIVE})
          </button>
        )}
      </div>

      {/* Live Rotating 3D Orbit Stage Preview */}
      <div className="relative flex flex-col items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 via-background/70 to-background/90 py-7 px-4 overflow-hidden">
        <div className="text-[11px] font-black text-primary mb-4 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {previewHover
            ? isEn
              ? `Live Previewing: ${ORBIT_EFFECTS[previewHover]?.label}`
              : `معاينة حية الآن: ${ORBIT_EFFECTS[previewHover]?.labelAr}`
            : active.length
            ? isEn
              ? `Active Orbit Loadout (${active.length}/${MAX_ACTIVE})`
              : `المدار المفعّل حالياً (${active.length}/${MAX_ACTIVE})`
            : isEn
            ? "Hover or tap any 3D relic below to preview its live orbit"
            : "مرّر أو اضغط على أي جوهرة بالأسفل لمعاينة دورانها الحي"}
        </div>

        <div className="my-2">
          <Avatar3DOrbit model={stageModels} size={104}>
            <AnimatedAvatar
              src={user?.avatar_url}
              isVideo={!!user?.avatar_is_video}
              frame={user?.profile_frame || user?.active_frame || "emeraldTech"}
              size={104}
              fallback={user?.profile_emoji || "BF"}
              animate={true}
            />
          </Avatar3DOrbit>
        </div>
      </div>

      {/* 3D Collectible Gems Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(ORBIT_EFFECTS).map(([key, item]) => {
          const owned = ownsOrbitEffect(user, key);
          const equipped = active.includes(key);
          const tier = TIER_LABELS[item.tier || "vanguard"] || TIER_LABELS.vanguard;

          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ y: -3 }}
              onMouseEnter={() => setPreviewHover(key)}
              onMouseLeave={() => setPreviewHover(null)}
              onClick={() => (owned ? toggle(key) : buy(key))}
              disabled={buying === key}
              className={`group relative flex flex-col items-center justify-between rounded-2xl border-2 p-3.5 text-center transition-all overflow-hidden ${
                equipped
                  ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(25,240,140,0.2)]"
                  : owned
                  ? "border-border/80 bg-card/70 hover:border-primary/50"
                  : "border-border/50 bg-card/45 hover:border-primary/40"
              }`}
            >
              {/* Top Tier & Lock/Check Row */}
              <div className="w-full flex items-center justify-between text-[10px] font-bold mb-1 z-10">
                <span style={{ color: tier.color }}>{isEn ? tier.labelEn : tier.labelAr}</span>
                <span>
                  {buying === key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : equipped ? (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />
                    </span>
                  ) : !owned ? (
                    <Lock className="h-3.5 w-3.5 text-amber-300/80" />
                  ) : null}
                </span>
              </div>

              {/* Live Floating & Sparkling 3D Gem */}
              <div className="my-2 flex items-center justify-center h-14 w-14">
                <OrbitEffectGlyph
                  kind={item.kind}
                  color={item.color}
                  secondary={item.secondary}
                  size={50}
                  animated={true}
                />
              </div>

              <span className="mt-1 block text-xs font-black truncate max-w-full">
                {isEn ? item.label : item.labelAr || item.label}
              </span>

              {owned ? (
                <span className="mt-1 text-[10px] font-bold text-emerald-400">
                  {equipped ? (isEn ? "Orbiting ✔" : "يدور الآن ✔") : (isEn ? "Tap to Equip" : "اضغط للتركيب")}
                </span>
              ) : (
                <span className="mt-1 flex items-center justify-center gap-1 text-xs font-black text-amber-400 font-mono tabular-nums">
                  <Coins className="h-3.5 w-3.5" /> {item.price}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
