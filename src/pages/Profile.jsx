import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Check,
  CircleDot,
  Flame,
  ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
  Zap,
  Gift,
} from "lucide-react";
import { getReferralLink, shareReferralLink } from "@/lib/referralService";
import { PaymentIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import FrameStore from "@/components/profile/FrameStore";
import BannerStore from "@/components/profile/BannerStore";
import DecorPicker from "@/components/profile/DecorPicker";
import AvatarUploader from "@/components/profile/AvatarUploader";
import Avatar3DOrbit from "@/components/profile/Avatar3DOrbit";
import Tilt3DCard from "@/components/profile/Tilt3DCard";
import ProfileBanner from "@/components/profile/ProfileBanner";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import MascotSkin from "@/components/course/MascotSkin";
import MascotSkinStore from "@/components/course/MascotSkinStore";
import { MASCOT_SKINS } from "@/lib/mascotSkins";
import { useLocale } from "@/lib/LocaleContext";
import TelegramLinkAction from "@/components/telegram/TelegramLinkAction";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { ownsBanner, ownsFrame, ownsTitle, PROFILE_COLORS } from "@/lib/avatars";
import { usePerformanceMode } from "@/lib/PerformanceContext";

const toOrbitList = (value) => Array.isArray(value)
  ? value
  : value && value !== "none" ? [value] : [];

export default function Profile() {
  const { profile, isAdmin, refreshProfile } = useAuth();
  const { isPowerSaver } = usePerformanceMode();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const hydratedUserRef = useRef(null);
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [frame, setFrame] = useState("none");
  const [banner, setBanner] = useState("none");
  const [titleKey, setTitleKey] = useState("none");
  const [profileColor, setProfileColor] = useState("cyan");
  const [orbitEffects, setOrbitEffects] = useState([]);
  const [enable3d, setEnable3d] = useState(true);
  // Draft state for the privacy toggles — they only persist when the user hits
  // Save (same contract as every other field in the Identity Studio).
  const [allowFriendReqs, setAllowFriendReqs] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState("frames");
  const [saving, setSaving] = useState(false);
  const [mascotStoreOpen, setMascotStoreOpen] = useState(false);

  const loadDraft = (source) => {
    if (!source) return;
    const localAvatar = typeof window !== "undefined" ? localStorage.getItem("local_avatar_fallback") : "";
    setFullName(source.full_name || "");
    setAvatar(source.avatar_url || localAvatar || "");
    setIsVideo(!!source.avatar_is_video);
    setFrame(source.profile_frame || source.active_frame || "none");
    setBanner(source.active_banner || "none");
    setTitleKey(source.profile_title_key || source.active_title || "none");
    setProfileColor(source.profile_color || "cyan");
    setOrbitEffects(toOrbitList(source.active_orbit_effects?.length ? source.active_orbit_effects : (source.avatar_3d_model || source.active_orbit_effect)));
    setEnable3d(source.enable_3d !== false);
    setAllowFriendReqs(source.allow_friend_requests !== false);
    setShowStats(source.show_stats !== false);
  };

  useEffect(() => {
    if (!profile) return;
    setUser((current) => current ? ({
      ...current,
      ...profile,
      owned_frames: profile.owned_frames || current.owned_frames,
      owned_banners: profile.owned_banners || current.owned_banners,
      owned_titles: profile.owned_titles || current.owned_titles,
      owned_orbit_effects: profile.owned_orbit_effects || current.owned_orbit_effects,
      owned_mascot_skins: profile.owned_mascot_skins || current.owned_mascot_skins,
    }) : profile);

    const profileId = profile.id || profile.email;
    if (hydratedUserRef.current !== profileId) {
      hydratedUserRef.current = profileId;
      setSavedSnapshot(profile);
      loadDraft(profile);
    }
  }, [profile]);

  // `dirty` compares against the SAVED snapshot — not the live `profile`/`user`
  // object, which stores may mutate after purchases. Comparing against the live
  // object made the button flip to "All changes saved" without saving and never
  // re-enable afterwards.
  const saved = savedSnapshot || profile;
  const dirty = !!saved && (
    fullName.trim() !== (saved.full_name || "").trim() ||
    avatar !== (saved.avatar_url || "") ||
    isVideo !== !!saved.avatar_is_video ||
    frame !== (saved.profile_frame || "none") ||
    banner !== (saved.active_banner || "none") ||
    titleKey !== (saved.profile_title_key || "none") ||
    profileColor !== (saved.profile_color || "cyan") ||
    enable3d !== (saved.enable_3d !== false) ||
    allowFriendReqs !== (saved.allow_friend_requests !== false) ||
    showStats !== (saved.show_stats !== false) ||
    JSON.stringify(orbitEffects) !== JSON.stringify(toOrbitList(saved.active_orbit_effects?.length ? saved.active_orbit_effects : saved.avatar_3d_model))
  );

  const save = async () => {
    setSaving(true);
    try {
      const isAdminUser = isAdmin || user?.role === "admin" || user?.email === "ibrahimkandil000@gmail.com";
      const safeFrame = (isAdminUser || ownsFrame(user, frame)) ? frame : "none";
      const safeBanner = (isAdminUser || ownsBanner(user, banner)) ? banner : "none";
      const safeTitle = (isAdminUser || ownsTitle(user, titleKey)) ? titleKey : "none";
      const ownedOrbits = Array.isArray(user?.owned_orbit_effects) ? user.owned_orbit_effects : [];
      const safeOrbitEffects = (isAdminUser ? orbitEffects : orbitEffects.filter((key) => ownedOrbits.includes(key))).slice(0, 5);

      const patch = {
        full_name: fullName.trim() || user?.full_name || "Black Fighters Student",
        avatar_url: avatar || null,
        avatar_is_video: isVideo,
        profile_frame: safeFrame,
        active_frame: safeFrame,
        active_banner: safeBanner,
        profile_title_key: safeTitle,
        active_title: safeTitle,
        profile_color: profileColor,
        avatar_3d_model: safeOrbitEffects[0] || "none",
        active_orbit_effects: safeOrbitEffects,
        active_orbit_effect: safeOrbitEffects[0] || "none",
        enable_3d: enable3d,
        allow_friend_requests: allowFriendReqs,
        show_stats: showStats,
      };

      // ONE persistence path: the secure server function. It re-validates
      // ownership against the SAVED server profile, strips protected fields,
      // and applies the same cosmetic whitelist the client checks here.
      const res = await invokeSecureFunction("profile-actions", { action: "updateProfile", patch });
      const savedProfile = res?.data?.profile || { ...user, ...patch };
      if (avatar) {
        localStorage.setItem("local_avatar_fallback", avatar);
      } else {
        localStorage.removeItem("local_avatar_fallback");
      }
      setUser(savedProfile);
      setSavedSnapshot(savedProfile);
      loadDraft(savedProfile);
      // Keep the global auth store in sync (header avatar/name, other pages)
      refreshProfile?.().catch(() => {});
      toast.success(isEn ? "Profile updated and loadout activated! ✨" : "تم حفظ الـLoadout وتفعيله بنجاح ✨");
    } catch (error) {
      toast.error(error.message || (isEn ? "Could not save customizations" : "تعذر حفظ التخصيصات"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    loadDraft(savedSnapshot || profile);
    toast.info(isEn ? "Reverted to last saved profile" : "رجعنا لآخر تخصيص محفوظ");
  };

  if (!user) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const accentHex = PROFILE_COLORS[profileColor]?.hex || "#00e5ff";
  const ownedMascotCount = Array.isArray(profile?.owned_mascot_skins) ? profile.owned_mascot_skins.length : 1;

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
            ? "Update your photo, name, frame and accent colour — changes appear everywhere in the app."
            : "عدّل صورتك واسمك وإطارك ولونك — التغييرات بتظهر في كل المنصة فورًا."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <Tilt3DCard enabled={enable3d && !isPowerSaver}>
            <div
              className="overflow-hidden rounded-[28px] border bg-card/80 shadow-2xl"
              style={{ borderColor: `${accentHex}66`, boxShadow: `0 24px 70px ${accentHex}18` }}
            >
              <ProfileBanner banner={banner} className="rounded-none" />
              <div className={`relative flex flex-col items-center px-6 pb-7 ${banner === "none" ? "pt-8" : "-mt-10 pt-0"}`}>
                <Avatar3DOrbit model={orbitEffects} size={132}>
                  <AnimatedAvatar
                    src={avatar}
                    isVideo={isVideo}
                    frame={frame}
                    size={132}
                    fallback={user.profile_emoji || "III"}
                    withSound={isAdmin}
                  />
                </Avatar3DOrbit>
                <h2 className="mt-5 text-xl font-black">{fullName || user.full_name || "Black Fighters Student"}</h2>
                {titleKey !== "none" && <div className="mt-2"><AnimatedTitle titleKey={titleKey} size="lg" /></div>}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 px-3 py-1 text-amber-300 font-mono font-bold shadow-sm">
                    <PaymentIcon size={16} /> {Number(user.credits ?? 10).toLocaleString()} {isEn ? "Credits" : "كريدت"}
                  </span>
                  {/* The accent defaults to neon cyan (#00e5ff): 1.54:1 as text on white. It is
                      kept as the chip's tint but the number itself is ink. */}
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-foreground" style={{ background: `${accentHex}16` }}><Zap className="h-3.5 w-3.5" /> {user.total_xp ?? 0} XP</span>
                  {(user.current_streak ?? 0) > 0 && <span className="flex items-center gap-1 rounded-full bg-orange-400/10 px-2.5 py-1 text-orange-300"><Flame className="h-3.5 w-3.5" /> {user.current_streak}</span>}
                </div>
              </div>
            </div>
          </Tilt3DCard>

          {/* User Display Name Input Card */}
          <div className="glass-card rounded-3xl p-4 border border-border/80 bg-card/60">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">
              {isEn ? "Display Name" : "اسم المستخدم"}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isEn ? "Enter your name..." : "اكتب اسمك..."}
              className="w-full bg-background/70 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none focus:border-primary transition-colors"
              maxLength={35}
            />
          </div>

          {/* Referral / Invite Program Card */}
          <div className="glass-card rounded-3xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-background shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Gift className="w-4 h-4" />
                {isEn ? "Invite & Earn Rewards" : "نظام الدعوات ومكافآت زيتا 🎁"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {Number(user?.referrals_count ?? 0)} / 100
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {isEn 
                ? "Earn +5 Credits and +5,000 Tokens for each invited friend. Invite 100 to get a 100 EGP subscription free!" 
                : "اكسب ٥ كريدت و ٥,٠٠٠ توكن لكل صديق ينضم برابطك. وادعُ ١٠٠ طالب لتحصل على اشتراك بـ ١٠٠ ج مجاناً بالكامل!"}
            </p>
            <div className="flex items-center gap-2">
              <input 
                readOnly 
                value={getReferralLink(user)} 
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-300 outline-none truncate select-all"
              />
              <button
                type="button"
                onClick={() => {
                  shareReferralLink(user, "copy");
                  toast.success(isEn ? "Referral link copied! 📋" : "تم نسخ رابط دعوتك! 📋");
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors shrink-0"
              >
                {isEn ? "Copy" : "نسخ"}
              </button>
            </div>
          </div>

                      {/* Privacy Settings Section */}
            <div className="glass-card rounded-3xl p-6 border border-border">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4">
                {isEn ? "Privacy & Social Settings" : "إعدادات الخصوصية والتحديات"}
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{isEn ? "Allow Friend/Challenge Requests" : "السماح بطلبات الصداقة والتحديات"}</p>
                    <p className="text-[11px] text-muted-foreground">{isEn ? "Let others send you requests from the Arena" : "السماح للآخرين بإرسال طلبات لك من لوحة الشرف"}</p>
                  </div>
                  <Switch checked={allowFriendReqs} onCheckedChange={setAllowFriendReqs} />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{isEn ? "Show Public Stats" : "إظهار إحصائياتي للعامة"}</p>
                    <p className="text-[11px] text-muted-foreground">{isEn ? "Display your XP and rank to others" : "عرض نقاطك ومستواك في الترتيب العام"}</p>
                  </div>
                  <Switch checked={showStats} onCheckedChange={setShowStats} />
                </div>
              </div>
            </div>

            {/* Telegram Bot Linking Card */}
          <div className="rounded-[24px] border border-primary/30 bg-primary/5 p-4 relative overflow-hidden shadow-lg shadow-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-primary">Telegram Bot</span>
              </div>
              {user?.telegram_chat_id ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isEn ? "Linked ✔" : "مرتبط ✔"}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isEn ? "Not Linked" : "غير مرتبط"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {isEn
                ? "Connect with @black_fighters_bot to take interactive EBE & OSPE quizzes right inside Telegram!"
                : "اربط حسابك مع بوت @black_fighters_bot لتمتحن كويزات النظري (EBE) والعملي (OSPE) مباشرة من التيليجرام!"}
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
                    toast.success(isEn ? "Avatar updated permanently! 🖼️" : "تم حفظ الصورة الشخصية وتثبيتها بنجاح! 🖼️");
                  } catch (err) {
                    console.warn("Avatar auto-save note:", err);
                  }
                }
              }}
            />
          </div>

          <div className="rounded-[28px] border border-border/60 bg-card/55 p-3 sm:p-5">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-5 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-background/50 p-1.5 scrollbar-none">
                {[
                  { value: "frames", label: isEn ? "Frames" : "الإطارات", icon: CircleDot },
                  { value: "banners", label: isEn ? "Banners" : "البانرات", icon: ImageIcon },
                  { value: "decor", label: isEn ? "Effects" : "التأثيرات", icon: Palette },
                  { value: "mascots", label: isEn ? "3D Models" : "المجسمات 3D", icon: Bot },
                ].map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="min-h-10 shrink-0 gap-2 rounded-xl px-3 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                    <Icon className="h-4 w-4" /> {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="frames" className="mt-0">
                <FrameStore user={user} avatar={avatar} isVideo={isVideo} selected={frame} onSelect={setFrame} onUserUpdate={(patch) => setUser((current) => ({ ...current, ...patch }))} />
              </TabsContent>
              <TabsContent value="banners" className="mt-0">
                <BannerStore user={user} selected={banner} onSelect={setBanner} onUserUpdate={(patch) => setUser((current) => ({ ...current, ...patch }))} />
              </TabsContent>
              <TabsContent value="decor" className="mt-0">
                <DecorPicker
                  user={user}
                  titleKey={titleKey} onTitleKey={setTitleKey}
                  onUserUpdate={(patch) => setUser((current) => ({ ...current, ...patch }))}
                  profileColor={profileColor} onProfileColor={setProfileColor}
                  model3d={orbitEffects} onModel3d={setOrbitEffects}
                  enable3d={enable3d} onEnable3d={setEnable3d}
                />
              </TabsContent>
              <TabsContent value="mascots" className="mt-0">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Character Collection</p>
                        <h3 className="mt-1 text-lg font-black">
                          {isEn ? "3D Models with Dynamic Actions" : "مجسمات حقيقية بحركات مختلفة"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isEn ? "Each 3D model includes Idle, Action, and Talk animations." : "كل GLB له Idle وAction وTalk، ويتم تحميل مجسم واحد فقط وقت المعاينة."}
                        </p>
                      </div>
                      <Button type="button" onClick={() => setMascotStoreOpen(true)} className="h-11 shrink-0 font-black">
                        {isEn ? "Open Store" : "فتح المتجر"}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {MASCOT_SKINS.filter((skin) => skin.model3d).map((skin) => (
                      <button key={skin.id} type="button" onClick={() => setMascotStoreOpen(true)} className="rounded-2xl border border-border/60 bg-background/35 p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/50">
                        <MascotSkin skinId={skin.id} size={76} animate={false} render3d={false} showFx={false} className="mx-auto" />
                        <span className="mt-2 block text-xs font-black">{skin.name}</span>
                        <span className="mt-1 block text-[10px] font-bold text-amber-300">{skin.price} {isEn ? "Credits" : "كريدت"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      <MascotSkinStore open={mascotStoreOpen} onClose={() => setMascotStoreOpen(false)} />

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-5 md:ps-[calc(16rem+1.25rem)] md:pe-5">
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-border/70 bg-background/90 p-2 shadow-2xl backdrop-blur-xl">
          <button type="button" onClick={reset} disabled={!dirty || saving} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:text-foreground disabled:opacity-40" aria-label={isEn ? "Revert changes" : "إلغاء التغييرات"}>
            <RotateCcw className="h-4 w-4" />
          </button>
          <Button onClick={save} disabled={!dirty || saving} className="h-11 flex-1 gap-2 font-black">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {dirty ? (isEn ? "Save Loadout" : "حفظ التخصيص") : (isEn ? "All changes saved" : "جميع التغييرات محفوظة")}
          </Button>
        </div>
      </div>
    </div>
  );
}
