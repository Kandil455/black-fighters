import React from "react";
import { useQuery } from "@tanstack/react-query";
import { auth, entities } from '@/api/index';
import { Skeleton } from "@/components/ui/skeleton";
import { Swords, Crown, Shield, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import { TrophyIcon } from "@/components/ui/icons";
import { useLocale } from "@/lib/LocaleContext";
import { isOwnerEmail, OWNER_EMAILS } from "@/lib/permissions";

// The founder account is excluded from every competitive list by uid as well as
// by role/email: those doc fields are not reliably persisted, so relying on them
// alone let the owner rank as a normal student.
const FOUNDER_UID = "up3y6pub7IgB1PpEMTcMASO2ei33";
const OWNER_EMAIL = OWNER_EMAILS[0];

export default function Leaderboard() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const [me, users] = await Promise.all([
        auth.me().catch(() => null),
        entities.User.filter({}, "-total_xp", 100).catch(() => []),
      ]);
      const userList = Array.isArray(users) ? users : [];

      // ONE predicate for "this is the platform owner, not a competitor".
      //
      // The old check relied on `role === 'admin'` / an exact email match, neither
      // of which is reliably persisted (the create rule pins role to 'user', and
      // `email` is not self-writable), so the owner's own document could slip
      // through, sort to the top and render as rank #0 with a crown.
      const isFounder = (u) => Boolean(u) && (
        u.id === FOUNDER_UID ||
        String(u.role || "").toLowerCase() === "admin" ||
        isOwnerEmail(u.email)
      );

      const foundAdmin = userList.find(isFounder);
      const admin = foundAdmin || (isFounder(me) ? me : {
        id: "admin_alpha",
        full_name: "Ibrahim Kandil (Alpha 👑)",
        email: OWNER_EMAIL,
        role: "admin",
        profile_frame: "spartanApex",
        profile_title_key: "owner",
        avatar_url: null,
        avatar_is_video: false,
        total_xp: 99999,
        total_correct: 999,
        total_answered: 999,
      });

      // Never dress the founder card in the VIEWER's cosmetics: that made the card
      // show the viewer's own photo/frame whenever the owner had none, and in dev
      // it rewrote the owner's identity for every visitor.
      const ranked = userList
        .filter((u) => !isFounder(u))
        .filter((u) => (u?.total_answered || 0) > 0 || (u?.total_xp || 0) > 0)
        .sort((a, b) => (b.total_xp || b.total_correct || 0) - (a.total_xp || a.total_correct || 0));

      return { me, admin, ranked };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  const me = data.me || {};
  const admin = data.admin || {};
  const ranked = data.ranked || [];
  const isAdminMe = me?.role === "admin" || me?.email === "ibrahimkandil000@gmail.com";
  const myRank = me?.id ? ranked.findIndex((u) => u?.id === me.id) : -1;

  return (
    <div dir={dir} className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[#3DDC97]/10 border border-[#3DDC97]/30 mx-auto mb-2">
          <TrophyIcon className="w-14 h-14" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gradient">
          {isEn ? "Hall of Fame & Leaderboard" : "لوحة الشرف والتحديات"}
        </h1>
        <p className="text-sm text-white/60">
          {isEn 
            ? "Compete with fellow scholars, solve quizzes, and accumulate XP for global supremacy"
            : "تنافس مع زملائك في الكلية وحل الكويزات لجمع نقاط الخبرة XP"}
        </p>
      </motion.div>

      {/* 👑 SOVEREIGN FOUNDER & PLATFORM OVERLORD (ALPHA) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl glass border border-[#3DDC97]/35 p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
            <div className="relative shrink-0 mb-4 sm:mb-0 pt-1">
              <AnimatedAvatar
                src={admin.avatar_url || (typeof window !== "undefined" ? localStorage.getItem("local_avatar_fallback") : null)}
                isVideo={!!admin.avatar_is_video}
                frame={admin.profile_frame || "spartanApex"}
                size={92}
                fallback="👑"
                withSound={false}
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#3DDC97] text-[#03150c] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap z-20">
                <Crown className="w-3 h-3 fill-current" />
                {isEn ? "Grandmaster" : "القمة المطلقة"}
              </div>
            </div>

            <div className="mt-2 sm:mt-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#3DDC97]/15 text-[#3DDC97] border border-[#3DDC97]/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {isEn ? "Platform Founder & Overlord" : "القائد العام ومؤسس المنصة 👑"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-white/75 border border-white/10">
                  Supreme Zenith
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                {admin.full_name || "Ibrahim Kandil (Alpha 👑)"}
                <span className="text-[#3DDC97] text-lg">⚡</span>
              </h2>

              <div className="mt-1 flex justify-center sm:justify-start">
                <AnimatedTitle titleKey={admin.profile_title_key || "owner"} size="sm" />
              </div>

              <p className="mt-2 text-xs text-white/60 max-w-md leading-relaxed">
                {isEn 
                  ? "Sovereign platform architect presiding over the arena. Standing as an honorary mentor above ranks to empower all warriors."
                  : "مؤسس وقائد منظومة Black Fighters — يتصدر عرش المنصة الشرفي تحفيزاً وتكريماً لكافة الطلاب والمقاتلين ⚔️"}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-center gap-2 shrink-0 bg-[#07080C]/70 border border-white/10 rounded-2xl p-3">
            <div className="text-center sm:text-end">
              <span className="text-[10px] uppercase font-bold text-white/50 block">
                {isEn ? "Rank Status" : "الرتبة الأكاديمية"}
              </span>
              <span className="text-sm font-bold text-[#3DDC97] flex items-center gap-1 justify-center sm:justify-end">
                <Sparkles className="w-3.5 h-3.5" />
                {isEn ? "Honorary #0" : "شرفي #0"}
              </span>
            </div>
            <div className="text-center sm:text-end sm:mt-1">
              <span className="text-[10px] uppercase font-bold text-white/50 block">
                {isEn ? "Authority" : "الصلاحية"}
              </span>
              <span className="text-xs font-mono font-bold text-white/80 flex items-center gap-1 justify-center sm:justify-end">
                <Zap className="w-3.5 h-3.5 text-[#3DDC97]" />
                Master Access
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* WEEKLY STUDENT CHAMPION */}
      {ranked.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 mb-10 rounded-3xl glass border border-[#3DDC97]/35 p-6 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#3DDC97]/15 border border-[#3DDC97]/30 px-3 py-1 text-[#3DDC97] text-xs font-bold uppercase mb-4">
            <TrophyIcon className="w-4 h-4" />
            {isEn ? "Weekly Student Champion" : "بطل الطلاب الأسبوعي"}
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img src={ranked[0].avatar_url || "/icons/black-fighters-192.png"} className="w-24 h-24 rounded-full border-2 border-[#3DDC97] object-cover" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#3DDC97] text-[#03150c] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                #1 Rank
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white">{ranked[0].full_name || ranked[0].name || (isEn ? "Anonymous" : "مجهول")}</h2>
              <p className="text-sm text-[#3DDC97] font-bold font-mono">{ranked[0].total_xp || 0} XP</p>
              <p className="text-xs text-white/55 mt-1 max-w-sm mx-auto">
                {isEn ? "Highest activity this week among students. Earned the Weekly Champion Frame & Title!" : "الأعلى نشاطاً هذا الأسبوع بين الطلاب. حصل على إطار ولقب البطل الأسبوعي!"}
              </p>
            </div>
            
            {me?.id !== ranked[0].id && ranked[0].allow_friend_requests !== false && (
              <div className="flex items-center gap-3 mt-2">
                <button className="px-5 py-2 rounded-full bg-[#3DDC97]/15 text-[#3DDC97] font-bold border border-[#3DDC97]/30 hover:bg-[#3DDC97]/25 transition-colors text-sm flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  {isEn ? "Send Challenge Request" : "إرسال طلب تحدي (صداقة)"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {isAdminMe ? (
        <div className="glass rounded-2xl px-6 py-4 border border-[#3DDC97]/35 bg-[#3DDC97]/5 flex items-center justify-between">
          <span className="text-xs font-bold text-[#3DDC97] font-mono uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#3DDC97]" />
            {isEn ? "Your Sovereign Rank" : "رتبتك السيادية"}
          </span>
          <span className="font-bold text-xl text-[#3DDC97] font-mono flex items-center gap-2">
            #0 (Platform Founder 👑)
          </span>
        </div>
      ) : myRank >= 0 && (
        <div className="glass rounded-2xl px-6 py-4 border border-[#3DDC97]/30 flex items-center justify-between">
          <span className="text-xs font-bold text-white/60 font-mono uppercase tracking-wider">
            {isEn ? "Your Current Rank" : "ترتيبك الحالي"}
          </span>
          <span className="font-bold text-xl text-[#3DDC97] font-mono flex items-center gap-2">
            #{myRank + 1}
          </span>
        </div>
      )}

      {ranked.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center border border-white/10">
          <Swords className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60 text-sm">
            {isEn ? "No quizzes solved yet! Be the first warrior to enter the arena ⚡️" : "لم يتم حل أي كويزات بعد! كن أول من يبدأ التحدي ⚡️"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((u, i) => (
            <LeaderboardRow
              key={u.id}
              rank={i}
              name={u.full_name || (isEn ? "Elite Student" : "طالب متميز")}
              correct={u.total_correct || 0}
              answered={u.total_answered || 0}
              isMe={u.id === me.id}
              xp={u.total_xp || 0}
              avatar={u.avatar_url || ""}
              isVideo={Boolean(u.avatar_is_video)}
              frame={u.profile_frame || u.active_frame || "none"}
            />
          ))}
        </div>
      )}
    </div>
  );
}