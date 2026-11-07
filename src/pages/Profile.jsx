import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Check,
  Flame,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
  Zap,
  Gift,
  Shield,
} from "lucide-react";
import { getReferralLink, shareReferralLink } from "@/lib/referralService";
import { PaymentIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import AvatarUploader from "@/components/profile/AvatarUploader";
import { useLocale } from "@/lib/LocaleContext";
import TelegramLinkAction from "@/components/telegram/TelegramLinkAction";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { PROFILE_COLORS } from "@/lib/avatars";

/**
 * Profile page.
 *
 * The owner removed every RPG/game layer (dragon frames, animated titles,
 * 3D orbit gems, banners, the theme/3D tab, mascot models, and the
 * "Final Boss" title). What remains is what a study platform needs: your photo,
 * your name, your accent colour, privacy toggles, referral link and Telegram.
 *
 * Fields the stores used to write (profile_frame, active_banner, *_title_key,
 * active_orbit_effects, enable_3d) are still SAVED as harmless static values so
 * existing user documents stay valid — they are simply never displayed.
 */
export default function Profile() {
  const { profile, isAdmin, refreshProfile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const hydratedUserRef = useRef(null);
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [profileColor, setProfileColor] = useState("cyan");
  const [allowFriendReqs, setAllowFriendReqs] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadDraft = (source) => {
    if (!source) return;
    const localAvatar =
      typeof window !== "undefined"
        ? localStorage.getItem("local_avatar_fallback")
        : "";
    setFullName(source.full_name || "");
    setAvatar(source.avatar_url || localAvatar || "");
    setIsVideo(!!source.avatar_is_video);
    setProfileColor(source.profile_color || "cyan");
    setAllowFriendReqs(source.allow_friend_requests !== false);
    setShowStats(source.show_stats !== false);
  };

  useEffect(() => {
    if (!profile) return;
    setUser((current) => (current ? { ...current, ...profile } : profile));

    const profileId = profile.id || profile.email;
    if (hydratedUserRef.current !== profileId) {
      hydratedUserRef.current = profileId;
      setSavedSnapshot(profile);
      loadDraft(profile);
    }
  }, [profile]);

  // Compare against the SAVED snapshot, not the live profile object: stores used
  // to mutate the live object after purchases and made Save flip to
  // "All changes saved" without persisting.
  const saved = savedSnapshot || profile;
  const dirty =
    !!saved &&
    (fullName.trim() !== (saved.full_name || "").trim() ||
      avatar !== (saved.avatar_url || "") ||
      isVideo !== !!saved.avatar_is_video ||
      profileColor !== (saved.profile_color || "cyan") ||
      allowFriendReqs !== (saved.allow_friend_requests !== false) ||
      showStats !== (saved.show_stats !== false));

  const save = async () => {
    setSaving(true);
    try {
      const patch = {
        full_name: fullName.trim() || user?.full_name || "Black Fighters Student",
        avatar_url: avatar || null,
        avatar_is_video: isVideo,
        profile_color: profileColor,
        allow_friend_requests: allowFriendReqs,
        show_stats: showStats,
        // Cosmetic RPG fields are pinned to their neutral values so a profile
        // saved before this change never renders a leftover dragon frame.
        profile_frame: "none",
        active_frame: "none",
        active_banner: "none",
        profile_title_key: "none",
        active_title: "none",
        active_orbit_effects: [],
        active_orbit_effect: "none",
        avatar_3d_model: "none",
        enable_3d: false,
      };

      const res = await invokeSecureFunction("profile-actions", {
        action: "updateProfile",
        patch,
      });
      const savedProfile = res?.data?.profile || { ...user, ...patch };
      if (avatar) {
        localStorage.setItem("local_avatar_fallback", avatar);
      } else {
        localStorage.removeItem("local_avatar_fallback");
      }
      setUser(savedProfile);
      setSavedSnapshot(savedProfile);
      loadDraft(savedProfile);
      refreshProfile?.().catch(() => {});
      toast.success(isEn ? "Profile updated ✅" : "تم حفظ البروفايل بنجاح ✅");
    } catch (error) {
      toast.error(
        error.message ||
          (isEn ? "Could not save your profile" : "تعذر حفظ البروفايل"),
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    loadDraft(savedSnapshot || profile);
    toast.info(
      isEn ? "Reverted to last saved profile" : "رجعنا لآخر تعديل محفوظ",
    );
  };

  if (!user) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const accentHex = PROFILE_COLORS[profileColor]?.hex || "#00e5ff";

  return (
    <div className="mx-auto max-w-6xl pb-28" dir={dir}>
      <header className="mb-7">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-primary">
          <Sparkles className="h-4 w-4" /> {isEn ? "Profile" : "الملف الشخصي"}
        </div>
        <h1 className="text-3xl font-black sm:text-4xl">
          {isEn ? "Your profile" : "ملفك الشخصي"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {isEn
            ? "Update your photo, name and accent colour — changes appear everywhere in the app."
            : "عدّل صورتك واسمك ولونك — التغييرات بتظهر في كل المنصة فورًا."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div
            className="overflow-hidden rounded-[28px] border bg-card shadow-sm"
            style={{ borderColor: `${accentHex}66` }}
          >
            <div className="relative flex flex-col items-center px-6 py-7">
              <AnimatedAvatar
                src={avatar}
                isVideo={isVideo}
                size={132}
                fallback={user.profile_emoji || "BF"}
                withSound={isAdmin}
              />
              <h2 className="mt-5 text-xl font-black">
                {fullName || user.full_name || "Black Fighters Student"}
              </h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 font-mono font-bold tabular-nums text-amber-600">
                  <PaymentIcon size={16} />{" "}
                  {Number(user.credits ?? 10).toLocaleString()}{" "}
                  {isEn ? "Credits" : "كريدت"}
                </span>
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 font-mono tabular-nums text-foreground"
                  style={{ background: `${accentHex}16` }}
                >
                  <Zap className="h-3.5 w-3.5" />{" "}
                  {Number(user.total_xp ?? 0).toLocaleString()} XP
                </span>
                {(user.current_streak ?? 0) > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-400/10 px-2.5 py-1 font-mono tabular-nums text-orange-600">
                    <Flame className="h-3.5 w-3.5" /> {user.current_streak}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Display name */}
          <div className="glass-card rounded-3xl border border-border/80 bg-card/60 p-4">
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-muted-foreground">
              {isEn ? "Display Name" : "اسم المستخدم"}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isEn ? "Enter your name..." : "اكتب اسمك..."}
              className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm font-bold text-foreground outline-none transition-colors focus:border-primary"
              maxLength={35}
            />
          </div>

          {/* Referral program */}
          <div className="glass-card rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-background p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
                <Gift className="h-4 w-4" />
                {isEn ? "Invite & Earn Rewards" : "نظام الدعوات ومكافآت زيتا 🎁"}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                {Number(user?.referrals_count ?? 0)} / 100
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {isEn
                ? "Earn +5 Credits and +5,000 Tokens for each invited friend. Invite 100 to get a 100 EGP subscription free!"
                : "اكسب ٥ كريدت و ٥,٠٠٠ توكن لكل صديق ينضم برابطك. وادعُ ١٠٠ طالب لتحصل على اشتراك بـ ١٠٠ ج مجاناً بالكامل!"}
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={getReferralLink(user)}
                className="flex-1 truncate rounded-xl border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-foreground outline-none select-all"
              />
              <button
                type="button"
                onClick={() => {
                  shareReferralLink(user, "copy");
                  toast.success(
                    isEn ? "Referral link copied! 📋" : "تم نسخ رابط دعوتك! 📋",
                  );
                }}
                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-emerald-500"
              >
                {isEn ? "Copy" : "نسخ"}
              </button>
            </div>
          </div>

          {/* Privacy */}
          <div className="glass-card rounded-3xl border border-border p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-muted-foreground">
              {isEn ? "Privacy & Social Settings" : "إعدادات الخصوصية والتحديات"}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold">
                    {isEn
                      ? "Allow Friend/Challenge Requests"
                      : "السماح بطلبات الصداقة والتحديات"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? "Let others send you requests from the Arena"
                      : "السماح للآخرين بإرسال طلبات لك من لوحة الشرف"}
                  </p>
                </div>
                <Switch
                  checked={allowFriendReqs}
                  onCheckedChange={setAllowFriendReqs}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold">
                    {isEn ? "Show Public Stats" : "إظهار إحصائياتي للعامة"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? "Display your XP and rank to others"
                      : "عرض نقاطك ومستواك في الترتيب العام"}
                  </p>
                </div>
                <Switch checked={showStats} onCheckedChange={setShowStats} />
              </div>
            </div>
          </div>

          {/* Telegram */}
          <div className="relative overflow-hidden rounded-[24px] border border-primary/30 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-primary">
                  Telegram Bot
                </span>
              </div>
              {user?.telegram_chat_id ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {isEn ? "Linked ✔" : "مرتبط ✔"}
                </span>
              ) : (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {isEn ? "Not Linked" : "غير مرتبط"}
                </span>
              )}
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {isEn
                ? "Connect with @Black_Fighters_FREE_bot to take interactive EBE & OSPE quizzes right inside Telegram!"
                : "اربط حسابك مع بوت @Black_Fighters_FREE_bot لتمتحن كويزات النظري (EBE) والعملي (OSPE) مباشرة من التيليجرام!"}
            </p>
            <TelegramLinkAction
              linked={Boolean(user?.telegram_chat_id)}
              onChange={() => refreshProfile?.()}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="rounded-[24px] border border-border/60 bg-card/55 p-4 sm:p-5">
            <AvatarUploader
              isAdmin={isAdmin}
              avatar={avatar}
              name={user?.full_name || ""}
              onPick={async ({ url, isVideo: video }) => {
                setAvatar(url);
                setIsVideo(video);
                if (url) {
                  localStorage.setItem("local_avatar_fallback", url);
                  try {
                    const res = await invokeSecureFunction("profile-actions", {
                      action: "updateProfile",
                      patch: { avatar_url: url, avatar_is_video: !!video },
                    });
                    if (res?.data?.profile) setSavedSnapshot(res.data.profile);
                    toast.success(
                      isEn
                        ? "Avatar updated permanently! 🖼️"
                        : "تم حفظ الصورة الشخصية وتثبيتها بنجاح! 🖼️",
                    );
                  } catch (err) {
                    console.warn("Avatar auto-save note:", err);
                  }
                }
              }}
            />
          </div>

          {/* Accent colour only — the Theme/3D tabs were removed */}
          <div className="rounded-[28px] border border-border/60 bg-card/55 p-4 sm:p-5">
            <Tabs defaultValue="appearance">
              <TabsList className="mb-5 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-background/50 p-1.5 scrollbar-none">
                <TabsTrigger
                  value="appearance"
                  className="min-h-10 shrink-0 gap-2 rounded-xl px-3 font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <Palette className="h-4 w-4" />{" "}
                  {isEn ? "Accent Colour" : "لون الهالة"}
                </TabsTrigger>
                <TabsTrigger
                  value="achievements"
                  className="min-h-10 shrink-0 gap-2 rounded-xl px-3 font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <Shield className="h-4 w-4" />{" "}
                  {isEn ? "Progress" : "تقدّمي"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appearance" className="mt-0">
                <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
                  <div className="mb-3">
                    <p className="flex items-center gap-2 text-sm font-black">
                      <Palette className="h-4 w-4 text-primary" />
                      {isEn
                        ? "Profile Aura & Accent Color"
                        : "لون هالة وثيم البروفايل"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isEn
                        ? "Controls the glow around your profile card."
                        : "يتحكم في لون الإضاءة حول بطاقتك الشخصية."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(PROFILE_COLORS).map(([key, c]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProfileColor(key)}
                        aria-label={c.name || key}
                        className="h-10 w-10 rounded-full border-2 transition-transform hover:scale-105"
                        style={{
                          background: c.hex,
                          borderColor:
                            profileColor === key ? "#0f172a" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="achievements" className="mt-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: isEn ? "XP" : "نقاط الخبرة",
                      value: Number(user.total_xp ?? 0).toLocaleString(),
                    },
                    {
                      label: isEn ? "Streak" : "أيام متتالية",
                      value: Number(user.current_streak ?? 0),
                    },
                    {
                      label: isEn ? "Credits" : "الكريدت",
                      value: Number(user.credits ?? 0).toLocaleString(),
                    },
                    {
                      label: isEn ? "Invites" : "الدعوات",
                      value: Number(user.referrals_count ?? 0),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border/60 bg-background/40 p-4 text-center"
                    >
                      <p className="font-mono text-xl font-black tabular-nums">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-5 md:ps-[calc(16rem+1.25rem)] md:pe-5">
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-border/70 bg-background/90 p-2 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || saving}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground disabled:opacity-40"
            aria-label={isEn ? "Revert changes" : "إلغاء التغييرات"}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <Button
            onClick={save}
            disabled={!dirty || saving}
            className="h-11 flex-1 gap-2 font-black"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {dirty
              ? isEn
                ? "Save Changes"
                : "حفظ التغييرات"
              : isEn
                ? "All changes saved"
                : "جميع التغييرات محفوظة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
