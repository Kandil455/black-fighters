import React, { useState } from "react";
import { Lock, Check, Coins, Loader2, Sparkles, Flame } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { AVATAR_FRAMES, TIER_LABELS, ownsFrame } from "@/lib/avatars";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useLocale } from "@/lib/LocaleContext";

// متجر الإطارات المتحركة — النسخة النظيفة قبل أجنحة البطاقة
export default function FrameStore({ user, avatar, isVideo, selected, onSelect, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const [filterTier, setFilterTier] = useState("all");
  const { locale } = useLocale();
  const isEn = locale === "en";
  const credits = user?.credits ?? 0;

  const buy = async (key, price) => {
    if (price < 0) {
      return toast.info(isEn ? "Exclusive VIP rank frame — unlocked with VIP tiers!" : "إطار سيادة خاص بباقات VIP المميزة 👑");
    }
    if (credits < price) return toast.error("كريدتس مش كافية — ذاكر وحل كويزات عشان تجمّع 💪");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "frame", key });
      if (data?.error) return toast.error(data.error);
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success(`فتحت إطار ${AVATAR_FRAMES[key].labelAr || AVATAR_FRAMES[key].label}! 🎉`);
      onUserUpdate?.({ credits: data.credits, owned_frames: data.owned_frames });
      onSelect(key);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "حصل خطأ في الشراء");
    } finally {
      setBuying(null);
    }
  };

  const entries = Object.entries(AVATAR_FRAMES).filter(([key, f]) => {
    if (filterTier === "all") return true;
    if (filterTier === "unlocked") return ownsFrame(user, key);
    return (f.tier || "vanguard") === filterTier;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            {isEn ? "Animated Avatar Frames" : "متجر الإطارات المتحركة"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? "Choose and equip animated frames for your avatar."
              : "اختر الإطار المناسب لبروفايلك وفعّله بضغطة واحدة."}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3.5 py-1.5 rounded-xl font-mono tabular-nums">
          <Coins className="w-4 h-4 text-amber-400" /> {Number(credits).toLocaleString()} {isEn ? "Credits" : "كريدت"}
        </span>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: isEn ? "All Frames" : "كل الإطارات" },
          { id: "unlocked", label: isEn ? "Owned" : "المملوكة" },
          { id: "legendary", label: isEn ? "Legendary" : "الأسطورية" },
          { id: "epic", label: isEn ? "Epic" : "الملحمية" },
          { id: "rare", label: isEn ? "Rare" : "النادرة" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTier(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
              filterTier === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
        {entries.map(([key, f]) => {
          const owned = ownsFrame(user, key);
          const isSelected = selected === key;
          const tierObj = TIER_LABELS[f.tier || "vanguard"] || TIER_LABELS.vanguard;
          const glow = f.glow && f.glow !== "transparent" ? f.glow : "#19f08c";

          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ y: -4 }}
              onClick={() => (owned ? onSelect(key) : buy(key, f.price))}
              disabled={buying === key}
              className={`group relative flex flex-col items-center justify-between rounded-2xl p-4 text-center transition-colors border-2 overflow-hidden ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_28px_rgba(25,240,140,0.22)]"
                  : owned
                  ? "border-border/80 bg-card/70 hover:border-primary/50"
                  : "border-border/50 bg-card/45 hover:border-primary/40"
              }`}
              style={
                isSelected
                  ? { borderColor: glow, boxShadow: `0 12px 32px -8px ${glow}44` }
                  : undefined
              }
            >
              {/* Ambient Glow */}
              {key !== "none" && (
                <div
                  className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full blur-2xl opacity-35 group-hover:opacity-65 transition-opacity"
                  style={{ background: glow }}
                />
              )}

              {/* Top Status Badge */}
              <div className="w-full flex items-center justify-between text-[10px] font-bold mb-2 z-10">
                <span style={{ color: tierObj.color }} className="truncate">
                  {isEn ? tierObj.labelEn : tierObj.labelAr}
                </span>
                {isSelected && owned ? (
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />
                  </span>
                ) : !owned ? (
                  <Lock className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                )}
              </div>

              {/* Live Animated Frame Preview */}
              <div className="relative my-3 flex items-center justify-center w-24 h-24 z-10">
                <AnimatedAvatar
                  src={avatar}
                  isVideo={isVideo}
                  frame={key}
                  size={68}
                  fallback={user?.profile_emoji || "BF"}
                  animate={true}
                />
              </div>

              {/* Frame Name & Action / Price */}
              <div className="w-full mt-2 z-10">
                <p className={`text-xs font-black truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {isEn ? f.label : f.labelAr || f.label}
                </p>
                <div className="mt-1.5 flex items-center justify-center">
                  {buying === key ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : owned ? (
                    <span className="text-[11px] font-bold text-emerald-400">
                      {isSelected ? (isEn ? "Equipped ✔" : "مُفعّل حالياً ✔") : (isEn ? "Tap to Equip" : "اضغط للتفعيل")}
                    </span>
                  ) : f.price < 0 ? (
                    <span className="text-[10px] font-black text-rose-400">
                      {isEn ? "VIP Exclusive" : "حصري VIP 👑"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-400 font-mono tabular-nums">
                      <Coins className="w-3.5 h-3.5" /> {f.price}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
