import React, { useState } from "react";
import { Lock, Check, Coins, Loader2, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE_TITLES, TIER_LABELS, ownsTitle } from "@/lib/avatars";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function TitleStore({ user, selected, onSelect, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const credits = user?.credits ?? 0;

  const buy = async (key, price) => {
    if (credits < price) return toast.error("كريدتس مش كافية — ذاكر وحل كويزات 💪");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "title", key });
      if (data?.error) return toast.error(data.error);
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 80, spread: 75, origin: { y: 0.6 } });
      toast.success(`فتحت لقب ${PROFILE_TITLES[key].label}! 🎉`);
      onUserUpdate?.({ credits: data.credits, owned_titles: data.owned_titles });
      onSelect(key);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "حصل خطأ في الشراء");
    } finally {
      setBuying(null);
    }
  };

  const TIER_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3, exclusive: 4 };
  const entries = Object.entries(PROFILE_TITLES)
    .filter(([key, t]) => {
      // اللقب الحصري يظهر فقط لمن يملكه
      if (t.exclusive) return ownsTitle(user, key);
      return true;
    })
    .sort(([, a], [, b]) => {
      const tierDiff = (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0);
      return tierDiff !== 0 ? tierDiff : (a.price ?? 0) - (b.price ?? 0);
    });

  return (
    <div>
      <p className="text-sm font-bold mb-1">Profile Titles</p>
      <p className="text-xs text-muted-foreground mb-4">Ranked by rarity and animation quality</p>
      <div className="grid gap-2.5">
        {entries.map(([key, t]) => {
          const owned = ownsTitle(user, key);
          const isSelected = selected === key;
          const tier = TIER_LABELS[t.tier] || TIER_LABELS.common;
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.01 }}
              onClick={() => (owned ? onSelect(key) : buy(key, t.price))}
              disabled={buying === key}
              className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 text-start transition-colors overflow-hidden ${
                isSelected ? "border-primary neon-glow-cyan bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                {key === "none" ? (
                  <span className="text-sm font-bold text-muted-foreground">No title</span>
                ) : (
                  <AnimatedTitle titleKey={key} animate={isSelected} />
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold" style={{ color: tier.color }}>{tier.label}</span>
                  {t.exclusive && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
              </div>

              {isSelected && owned ? (
                <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </span>
              ) : !owned ? (
                <span className="flex items-center gap-1 shrink-0">
                  {buying === key ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : t.exclusive ? (
                    <Lock className="w-4 h-4 text-red-400" />
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Coins className="w-3.5 h-3.5" /> {t.price}
                    </span>
                  )}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
