import React from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Shield } from "lucide-react";
import { PaymentIcon } from "@/components/ui/icons";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import Avatar3DOrbit from "@/components/profile/Avatar3DOrbit";
import Tilt3DCard from "@/components/profile/Tilt3DCard";
import ProfileBanner from "@/components/profile/ProfileBanner";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import { PROFILE_COLORS } from "@/lib/avatars";

export default function ProfileCard({ user }) {
  const accentHex = PROFILE_COLORS[user?.profile_color]?.hex || "#00e5ff";
  const titleKey = user?.profile_title_key || user?.active_title || "none";
  const frameKey = user?.profile_frame || user?.active_frame || "none";
  const isAdmin = user?.role === "admin" || user?.email === "ibrahimkandil000@gmail.com";
  const orbitEffects =
    Array.isArray(user?.active_orbit_effects) && user.active_orbit_effects.length
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
          boxShadow: isAdmin
            ? "0 0 36px #fbbf2455, 0 0 90px #ef444422"
            : `0 0 24px ${accentHex}22`,
        }}
      >
        <ProfileBanner banner={user?.active_banner || "ocean"} className="rounded-none" />
        {isAdmin && (
          <div className="absolute top-3 left-3 z-20 rounded-full border border-amber-300/60 bg-black/70 px-3 py-1 text-[10px] font-black text-amber-300 shadow-[0_0_18px_rgba(251,191,36,.45)]">
            ADMIN MASTER
          </div>
        )}
        <div className="flex flex-col items-center p-7 -mt-12 relative z-10">
          <Avatar3DOrbit model={orbitEffects} size={136}>
            <AnimatedAvatar
              src={user?.avatar_url}
              isVideo={!!user?.avatar_is_video}
              frame={frameKey}
              size={136}
              fallback={user?.profile_emoji || "👑"}
              withSound={isAdmin}
              animate={true}
            />
          </Avatar3DOrbit>
          <h2 className="text-xl font-black mt-5 flex items-center gap-2">
            {user?.full_name || "طالب Black Fighters"}
            {isAdmin && <Shield className="w-4 h-4 text-amber-400" />}
          </h2>
          {titleKey !== "none" && (
            <div className="mt-2">
              <AnimatedTitle titleKey={titleKey} size="lg" animate={true} />
            </div>
          )}
          {user?.bio && (
            <p className="text-sm text-muted-foreground text-center mt-3 max-w-md">{user.bio}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4 text-xs font-bold font-mono tabular-nums">
            <span className="flex items-center gap-1.5 text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/25">
              <PaymentIcon size={16} /> {Number(user?.credits ?? 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-foreground bg-white/[0.06] border border-white/10 px-3 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> {Number(user?.total_xp ?? 0).toLocaleString()} XP
            </span>
            {(user?.current_streak ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-orange-300 bg-orange-400/10 border border-orange-400/25 px-3 py-1 rounded-full">
                <Flame className="w-3.5 h-3.5" /> {user.current_streak}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Tilt3DCard>
  );
}
