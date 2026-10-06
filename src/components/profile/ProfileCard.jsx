import React from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Shield } from "lucide-react";
import { CreditCoin3D } from "@/components/ui/Custom3DIcons";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import Avatar3DOrbit from "@/components/profile/Avatar3DOrbit";
import Tilt3DCard from "@/components/profile/Tilt3DCard";
import ProfileBanner from "@/components/profile/ProfileBanner";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import { PROFILE_COLORS } from "@/lib/avatars";

// كرت بروفايل قابل لإعادة الاستخدام (المعاينة + الصفحة العامة)
export default function ProfileCard({ user }) {
  const accentHex = PROFILE_COLORS[user?.profile_color]?.hex || "#00e5ff";
  const titleKey = user?.profile_title_key || "none";
  const isAdmin = user?.role === "admin";
  const orbitEffects = Array.isArray(user?.active_orbit_effects) && user.active_orbit_effects.length
    ? user.active_orbit_effects
    : user?.avatar_3d_model || "none";

  return (
    <Tilt3DCard enabled={user?.enable_3d !== false}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative glass-card rounded-3xl border overflow-hidden"
        style={{
          borderColor: isAdmin ? "#fbbf24aa" : `${accentHex}55`,
          boxShadow: isAdmin ? "0 0 36px #fbbf2455, 0 0 90px #ef444422" : `0 0 24px ${accentHex}22`
        }}
      >
        <ProfileBanner banner={user?.active_banner || "none"} className="rounded-none" />
        {isAdmin && (
          <div className="absolute top-4 left-4 z-10 rounded-full border border-amber-300/60 bg-black/60 px-3 py-1 text-xs font-black text-amber-300 shadow-[0_0_18px_rgba(251,191,36,.45)]">
            ADMIN MASTER
          </div>
        )}
        <div className="flex flex-col items-center p-8 -mt-12">
          <Avatar3DOrbit model={orbitEffects} size={140}>
            <AnimatedAvatar
              src={user?.avatar_url}
              isVideo={!!user?.avatar_is_video}
              frame={user?.profile_frame || "none"}
              size={140}
              fallback={user?.profile_emoji || "👑"}
              withSound={isAdmin}
            />
          </Avatar3DOrbit>
          <h2 className="text-xl font-black mt-4 flex items-center gap-2">
            {user?.full_name || "طالب Black Fighters"}
            {isAdmin && <Shield className="w-4 h-4 text-amber-400" />}
          </h2>
          {titleKey !== "none" && <div className="mt-1.5"><AnimatedTitle titleKey={titleKey} size="lg" /></div>}
          {user?.bio && <p className="text-sm text-muted-foreground text-center mt-3 max-w-md">{user.bio}</p>}
          <div className="flex items-center gap-3 mt-3 text-sm">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/25">
              <CreditCoin3D size={18} /> {user?.credits ?? 0}
            </span>
            <span className="flex items-center gap-1 font-bold" style={{ color: accentHex }}>
              <Zap className="w-4 h-4" /> {user?.total_xp ?? 0} XP
            </span>
            {(user?.current_streak ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-orange-400 font-bold">
                <Flame className="w-4 h-4" /> {user.current_streak}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Tilt3DCard>
  );
}
