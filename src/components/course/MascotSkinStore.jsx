import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Coins, Check, Lock, X, Sparkles, Gift, Percent } from "lucide-react";
import { MASCOT_SKINS, TIER_LABELS } from "@/lib/mascotSkins";
import MascotSkin from "@/components/course/MascotSkin";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MascotSkinStore({ open, onClose }) {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(null);
  const [preview3dId, setPreview3dId] = useState(null);

  const owned = profile?.owned_mascot_skins || ["default"];
  const active = profile?.active_mascot_skin || "default";
  const credits = Number(profile?.credits ?? 0);

  const isOwned = (id) => id === "default" || owned.includes(id);

  useEffect(() => {
    const active3d = MASCOT_SKINS.find((skin) => skin.id === active && skin.model3d);
    setPreview3dId(active3d?.id || null);
  }, [active]);

  const buy = async (skin) => {
    if (credits < skin.price) {
      toast.error(`محتاج ${skin.price} كريدت — رصيدك ${credits}`);
      return;
    }
    setBusy(skin.id);
    try {
      await base44.functions.invoke("purchaseCosmetic", { type: "mascot", key: skin.id, equip: true });
      await refreshProfile();
      toast.success(`اشتريت ${skin.name} وفعّلته! 🎉`);
    } catch {
      toast.error("حصل خطأ — جرب تاني");
    } finally {
      setBusy(null);
    }
  };

  const equip = async (skin) => {
    setBusy(skin.id);
    try {
      await base44.functions.invoke("purchaseCosmetic", { type: "mascot", key: skin.id, equip: true });
      await refreshProfile();
      toast.success(`فعّلت ${skin.name} ✨`);
    } catch {
      toast.error("حصل خطأ — جرب تاني");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="glass-card neon-glow-purple rounded-3xl border border-accent/30 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-l from-accent/10 to-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-black text-lg">متجر أشكال الماسكوت</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm font-bold text-yellow-400 bg-yellow-400/10 rounded-full px-3 py-1">
                  <Coins className="w-4 h-4" /> {credits}
                </span>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 scrollbar-none">
              {MASCOT_SKINS.filter((skin) => skin.id !== "default").map((skin) => {
                const ownedSkin = isOwned(skin.id);
                const activeSkin = active === skin.id;
                const tier = TIER_LABELS[skin.tier] || TIER_LABELS.free;
                return (
                  <div
                    key={skin.id}
                    className={cn("relative rounded-2xl border p-4 bg-card/40 flex flex-col", tier.ring, activeSkin && "ring-2 ring-primary")}
                    onMouseEnter={() => skin.model3d && setPreview3dId(skin.id)}
                    onFocus={() => skin.model3d && setPreview3dId(skin.id)}
                  >
                    {activeSkin && (
                      <span className="absolute top-2 left-2 z-10 text-[10px] font-black bg-primary text-primary-foreground rounded-full px-2 py-0.5">مفعّل</span>
                    )}
                    <span className={cn("absolute top-2 right-2 z-10 text-[10px] font-black", tier.color)}>{tier.label}</span>
                    {skin.model3d && (
                      <span className="absolute top-8 right-2 z-10 text-[10px] font-black rounded-full bg-cyan-400/15 text-cyan-200 border border-cyan-300/30 px-2 py-0.5">
                        Real 3D
                      </span>
                    )}

                    <div
                      role={skin.model3d ? "button" : undefined}
                      tabIndex={skin.model3d ? 0 : undefined}
                      className="flex justify-center py-2 outline-none"
                      onClick={() => skin.model3d && setPreview3dId(skin.id)}
                    >
                      <MascotSkin skinId={skin.id} size={88} state="active" render3d={preview3dId === skin.id} />
                    </div>

                    <p className="font-bold text-sm text-center mt-1">{skin.name}</p>
                    <p className="text-[11px] text-muted-foreground text-center mb-2 leading-snug">{skin.desc}</p>
                    {skin.model3d?.licenseId && (
                      <p className="text-[10px] text-cyan-300/80 text-center mb-2">
                        GLB • CC0 licensed
                      </p>
                    )}

                    <div className="space-y-1 mb-3">
                      {skin.dailyCredits > 0 && (
                        <p className="flex items-center gap-1.5 text-[11px] text-[hsl(152,100%,50%)]">
                          <Gift className="w-3 h-3" /> +{skin.dailyCredits} كريدت كل يوم
                        </p>
                      )}
                      {skin.discountPct > 0 && (
                        <p className="flex items-center gap-1.5 text-[11px] text-cyan-300">
                          <Percent className="w-3 h-3" /> خصم {skin.discountPct}% على التلخيص
                        </p>
                      )}
                    </div>

                    <div className="mt-auto">
                      {ownedSkin ? (
                        activeSkin ? (
                          <Button disabled variant="outline" size="sm" className="w-full gap-1 font-bold">
                            <Check className="w-4 h-4 text-primary" /> مفعّل
                          </Button>
                        ) : (
                          <Button onClick={() => equip(skin)} disabled={busy === skin.id} size="sm" className="w-full font-bold">
                            تفعيل
                          </Button>
                        )
                      ) : (
                        <Button onClick={() => buy(skin)} disabled={busy === skin.id || credits < skin.price} size="sm"
                          className="w-full gap-1.5 font-bold">
                          {credits < skin.price ? <Lock className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                          {skin.price} كريدت
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
