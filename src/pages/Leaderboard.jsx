import React from "react";
import { useQuery } from "@tanstack/react-query";
import { auth, entities } from "@/api/index";
import { Crown, Shield, Zap } from "@/components/ui/animatedIcons";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import { useLocale } from "@/lib/LocaleContext";
import { isOwnerEmail, OWNER_EMAILS } from "@/lib/permissions";

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

      const ranked = userList
        .filter((u) => !isFounder(u))
        .filter((u) => (u?.total_answered || 0) > 0 || (u?.total_xp || 0) > 0)
        .sort((a, b) => (b.total_xp || b.total_correct || 0) - (a.total_xp || a.total_correct || 0));

      return { me, admin, ranked };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="max-w-3xl mx-auto space-y-3 py-12">
        <div className="card text-center py-16">
          <span className="mono">جاري تحميل لوحة الشرف...</span>
        </div>
      </div>
    );
  }

  const me = data.me || {};
  const admin = data.admin || {};
  const ranked = data.ranked || [];
  const isAdminMe = me?.role === "admin" || me?.email === "ibrahimkandil000@gmail.com";
  const myRank = me?.id ? ranked.findIndex((u) => u?.id === me.id) : -1;

  return (
    <div dir={dir} className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Editorial Header */}
      <div className="hd text-center">
        <span className="mono">{isEn ? "Weekly League" : "الدوري الأسبوعي"}</span>
        <h1 className="serif">
          {isEn ? "Hall of " : "لوحة "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "Champions." : "المتصدرين."}</em>
        </h1>
        <p className="mx-auto" style={{ color: "var(--mute)" }}>
          {isEn
            ? "Compete with peers, conquer quizzes, and accumulate XP for batch supremacy"
            : "تنافس مع زملائك في الدفعة وحل الكويزات وتصدر قائمة الأبطال"}
        </p>
      </div>

      {/* 👑 SOVEREIGN FOUNDER & PLATFORM OVERLORD (ALPHA) */}
      <div className="card" style={{ borderColor: "var(--sig)" }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
            <div className="relative shrink-0 pt-1">
              <AnimatedAvatar
                src={admin.avatar_url || (typeof window !== "undefined" ? localStorage.getItem("local_avatar_fallback") : null)}
                isVideo={!!admin.avatar_is_video}
                frame={admin.profile_frame || "spartanApex"}
                size={84}
                fallback="👑"
                withSound={false}
              />
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap"
                style={{ background: "var(--sig)", color: "var(--sigink)" }}
              >
                <Crown className="w-3 h-3 fill-current" animated={false} />
                {isEn ? "Grandmaster" : "القمة المطلقة"}
              </div>
            </div>

            <div className="mt-2 sm:mt-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="tag on text-[0.72rem]">
                  <Shield className="w-3 h-3" animated={false} />
                  {isEn ? "Platform Founder & Overlord" : "القائد العام ومؤسس المنصة 👑"}
                </span>
                <span className="mono text-[0.72rem]">Supreme Zenith</span>
              </div>

              <h2 className="serif text-2xl flex items-center justify-center sm:justify-start gap-2">
                {admin.full_name || "Ibrahim Kandil (Alpha 👑)"}
                <span style={{ color: "var(--sig)" }}>⚡</span>
              </h2>

              <div className="mt-1 flex justify-center sm:justify-start">
                <AnimatedTitle titleKey={admin.profile_title_key || "owner"} size="sm" />
              </div>

              <p className="mt-2 text-xs leading-relaxed max-w-md" style={{ color: "var(--mute)" }}>
                {isEn
                  ? "Sovereign platform architect presiding over the arena. Standing as an honorary mentor above ranks to empower all warriors."
                  : "مؤسس وقائد منظومة Black Fighters — يتصدر عرش المنصة الشرفي تحفيزاً وتكريماً لكافة الطلاب والمقاتلين ⚔️"}
              </p>
            </div>
          </div>

          <div className="p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-center sm:text-end shrink-0">
            <span className="mono block text-[0.68rem]">
              {isEn ? "RANK STATUS" : "الرتبة الأكاديمية"}
            </span>
            <span className="font-bold text-sm block" style={{ color: "var(--sig)" }}>
              {isEn ? "Honorary #0" : "شرفي #0"}
            </span>
            <span className="mono block text-[0.68rem] mt-2">
              {isEn ? "AUTHORITY" : "الصلاحية"}
            </span>
            <span className="mono font-bold text-xs flex items-center gap-1 justify-center sm:justify-end">
              <Zap className="w-3 h-3" style={{ color: "var(--sig)" }} animated={false} />
              Master Access
            </span>
          </div>
        </div>
      </div>

      {/* PODIUM for Top 3 Students */}
      {ranked.length >= 3 && (
        <div className="podium mx-auto my-6">
          {/* #2 Rank */}
          <div className="pod">
            <span className="av">{ranked[1].full_name?.[0] || "٢"}</span>
            <b className="text-sm truncate max-w-[110px]">{ranked[1].full_name}</b>
            <span className="mono text-xs">{ranked[1].total_xp || 0} XP</span>
            <span className="mono text-[0.68rem]" style={{ color: "var(--mute)" }}>#2</span>
          </div>

          {/* #1 Rank (Center, taller, signal border) */}
          <div className="pod one">
            <span className="av me" style={{ width: 52, height: 52, fontSize: "1.2rem" }}>
              {ranked[0].full_name?.[0] || "١"}
            </span>
            <b className="text-sm truncate max-w-[120px]" style={{ color: "var(--sig)" }}>
              {ranked[0].full_name}
            </b>
            <span className="mono text-xs font-bold" style={{ color: "var(--sig)" }}>
              {ranked[0].total_xp || 0} XP
            </span>
            <span className="tag on text-[0.68rem]">#1 بطل الأسبوع</span>
          </div>

          {/* #3 Rank */}
          <div className="pod">
            <span className="av">{ranked[2].full_name?.[0] || "٣"}</span>
            <b className="text-sm truncate max-w-[110px]">{ranked[2].full_name}</b>
            <span className="mono text-xs">{ranked[2].total_xp || 0} XP</span>
            <span className="mono text-[0.68rem]" style={{ color: "var(--mute)" }}>#3</span>
          </div>
        </div>
      )}

      {/* User's Current Rank Banner */}
      {isAdminMe ? (
        <div className="card py-3 px-4 flex flex-row items-center justify-between border-[var(--sig)]">
          <span className="mono text-xs flex items-center gap-2" style={{ color: "var(--sig)" }}>
            <Crown className="w-4 h-4" animated={false} />
            {isEn ? "Your Sovereign Rank" : "رتبتك السيادية"}
          </span>
          <span className="mono font-bold text-sm" style={{ color: "var(--sig)" }}>
            #0 (Platform Founder 👑)
          </span>
        </div>
      ) : myRank >= 0 && (
        <div className="card py-3 px-4 flex flex-row items-center justify-between">
          <span className="mono text-xs">
            {isEn ? "Your Current Rank" : "ترتيبك الحالي"}
          </span>
          <span className="mono font-bold text-sm" style={{ color: "var(--sig)" }}>
            #{myRank + 1}
          </span>
        </div>
      )}

      {/* Ranked List */}
      <div className="card" style={{ gap: 0 }}>
        {ranked.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--mute)" }}>
            <p className="text-sm">
              {isEn ? "No quizzes solved yet! Be the first to rank." : "لم يتم حل أي كويزات بعد! كن أول من يبدأ التحدي ⚡️"}
            </p>
          </div>
        ) : (
          ranked.map((u, i) => (
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
          ))
        )}
      </div>
    </div>
  );
}