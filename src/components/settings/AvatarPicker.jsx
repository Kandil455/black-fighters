import React, { useState } from "react";
import { Crown, Check, Loader2, Palette, Lock, Coins, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import GeneratedAvatar from "@/components/GeneratedAvatar";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { AVATAR_STYLES, AVATAR_FRAMES, ownsFrame } from "@/lib/avatars";
import { useLocale } from "@/lib/LocaleContext";

// Premium profile avatar + animated frame selection
export default function AvatarPicker({ profile, onSaved }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [frame, setFrame] = useState(profile?.profile_frame || "none");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (frame !== "none" && !ownsFrame(profile, frame)) {
      return toast.error(
        isEn 
          ? "You must purchase this frame from your Profile store first! 🔒" 
          : "لازم تشتري الإطار ده الأول من صفحة البروفايل عشان تقدر تفعله! 🔒"
      );
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ avatar_url: avatar || null, profile_frame: frame });
      toast.success(isEn ? "Profile updated ✨" : "اتحفظ البروفايل بتاعك ✨");
      onSaved?.({ avatar_url: avatar, profile_frame: frame });
    } catch (e) {
      toast.error(e.message || (isEn ? "Failed to save profile" : "حصل خطأ في الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card neon-glow-purple rounded-3xl p-8 border border-accent/30" dir={dir}>
      <h2 className="font-extrabold text-lg mb-2 flex items-center gap-2">
        <Crown className="w-5 h-5 text-accent" /> {isEn ? "Premium Profile" : "بروفايل البريميوم"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isEn 
          ? "Choose your avatar and animated frame — exclusive to Pro members 👑"
          : "اختار صورتك وإطارك المتحرك — حصري لأعضاء البريميوم 👑"}
      </p>

      {/* Preview — generated */}
      <div className="flex justify-center mb-8">
        {avatar && avatar.startsWith("linear-gradient") ? (
          <GeneratedAvatar name={profile?.full_name || profile?.email || "؟"} styleId={AVATAR_STYLES.find(s => s.gradient === avatar)?.id} size={120} />
        ) : (
          <AnimatedAvatar src={avatar} frame={frame} size={120} fallback={profile?.profile_emoji || "👑"} />
        )}
      </div>

      {/* Color picker — no AI images */}
      <p className="text-sm font-bold mb-3 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> {isEn ? "Avatar Color" : "لون الأفاتار"}</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setAvatar(s.gradient)}
            className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-colors flex items-center justify-center ${avatar === s.gradient ? "border-accent neon-glow-purple scale-105" : "border-border hover:border-accent/50"}`}
            style={{ background: s.gradient }}
            title={s.label}
          >
            <span className="text-white font-black text-lg drop-shadow">{(profile?.full_name || "?")[0]?.toUpperCase() || "؟"}</span>
            {avatar === s.gradient && <span className="absolute inset-0 bg-white/15 flex items-center justify-center"><Check className="w-5 h-5 text-white drop-shadow" /></span>}
          </button>
        ))}
      </div>

      {/* Frame selector */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-accent" />
          {isEn ? "Animated Frames (Store)" : "الإطارات المتحركة (المتجر)"}
        </p>
        <a
          href="/profile"
          className="text-xs text-accent hover:underline flex items-center gap-1 font-bold"
        >
          {isEn ? "Open Profile Store" : "متجر البروفايل"}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
        {Object.entries(AVATAR_FRAMES).map(([key, f]) => {
          const owned = key === "none" || ownsFrame(profile, key);
          const isSelected = frame === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (!owned) {
                  return toast.error(
                    isEn
                      ? `Locked 🔒 (${f.price} Credits). Buy it from Profile Store to unlock and test!`
                      : `الإطار ده مقفول 🔒 (${f.price} كريدت). لازم تشتريه الأول من متجر البروفايل عشان تجربه وتفعله!`
                  );
                }
                setFrame(key);
              }}
              className={`relative flex flex-col items-center p-2.5 rounded-2xl border-2 transition-colors ${
                isSelected
                  ? "border-accent bg-accent/10 shadow-lg scale-105"
                  : owned
                  ? "border-border/70 hover:border-accent/50 bg-card/40"
                  : "border-border/30 bg-card/20 opacity-60 hover:opacity-85 cursor-not-allowed"
              }`}
              title={owned ? f.label : `${f.label} - ${f.price} Credits (Locked)`}
            >
              <div className="relative mb-1">
                <AnimatedAvatar
                  src={avatar}
                  frame={key}
                  size={52}
                  fallback="👑"
                  animate={isSelected && owned}
                />
                {!owned && (
                  <span className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-amber-300" />
                  </span>
                )}
                {isSelected && owned && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center shadow">
                    <Check className="w-2.5 h-2.5 text-accent-foreground stroke-[3]" />
                  </span>
                )}
              </div>

              <span className={`text-[10px] font-bold truncate max-w-full ${isSelected ? "text-accent" : "text-foreground"}`}>
                {f.label}
              </span>

              {!owned ? (
                <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 mt-0.5">
                  <Coins className="w-2.5 h-2.5" />
                  {f.price}
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  {key === "none" ? (isEn ? "Default" : "افتراضي") : (isEn ? "Unlocked" : "مملوك")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 font-bold gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {isEn ? "Save Profile" : "حفظ البروفايل"}
      </Button>
    </div>
  );
}