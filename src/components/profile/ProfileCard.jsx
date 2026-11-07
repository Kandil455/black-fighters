import React from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Shield } from "lucide-react";
import { PaymentIcon } from "@/components/ui/icons";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { PROFILE_COLORS } from "@/lib/avatars";

/**
 * ProfileCard — clean student card: photo, name, bio, credits, XP, streak.
 * All RPG cosmetics (3D tilt, orbit effects, banners, animated titles, frames)
 * were removed by the owner; this is a study platform, not a game.
 */
export default function ProfileCard({ user }) {
  const accentHex = PROFILE_COLORS[user?.profile_color]?.hex || "#00e5ff";
  const isAdmin =
    user?.role === "admin" || user?.email === "ibrahimkandil000@gmail.com";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card relative overflow-hidden rounded-3xl border"
      style={{
        borderColor: isAdmin ? "#fbbf24aa" : `${accentHex}55`,
        boxShadow: isAdmin ? "0 0 36px #fbbf2455" : `0 0 24px ${accentHex}22`,
      }}
    >
      <div className="relative z-10 flex flex-col items-center p-7">
        <AnimatedAvatar
          src={user?.avatar_url}
          isVideo={!!user?.avatar_is_video}
          size={136}
          fallback={user?.profile_emoji || "🎓"}
          withSound={isAdmin}
        />
        <h2 className="mt-5 flex items-center gap-2 text-xl font-black">
          {user?.full_name || "طالب Black Fighters"}
          {isAdmin && <Shield className="h-4 w-4 text-amber-400" />}
        </h2>
        {user?.bio && (
          <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
            {user.bio}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 font-mono text-xs font-bold tabular-nums">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-amber-300">
            <PaymentIcon size={16} /> {Number(user?.credits ?? 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-foreground">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />{" "}
            {Number(user?.total_xp ?? 0).toLocaleString()} XP
          </span>
          {(user?.current_streak ?? 0) > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-1 text-orange-300">
              <Flame className="h-3.5 w-3.5" /> {user.current_streak}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
