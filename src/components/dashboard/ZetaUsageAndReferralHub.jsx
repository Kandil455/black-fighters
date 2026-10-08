import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Copy, Check, Users, Activity } from "lucide-react";
import { PaymentIcon } from "@/components/ui/icons";
import { getReferralLink, shareReferralLink } from "@/lib/referralService";
import { REFERRAL_REWARDS } from "@/lib/plans";
import { playClick } from "@/lib/sounds";
import { toast } from "sonner";

export default function ZetaUsageAndReferralHub({ user, isEn = false }) {
  const [copied, setCopied] = useState(false);

  const credits = Number(user?.credits ?? 10);
  const creditsUsed = Number(user?.credits_used ?? 0);
  const referralsCount = Number(user?.referrals_count ?? 0);
  const targetInvites = REFERRAL_REWARDS.targetInvitesForFreePlan || 100;
  const progressPercent = Math.min(100, Math.round((referralsCount / targetInvites) * 100));

  const referralLink = getReferralLink(user);

  const handleCopy = () => {
    playClick();
    shareReferralLink(user, "copy");
    setCopied(true);
    toast.success(isEn ? "Referral link copied to clipboard! 📋" : "تم نسخ رابط الدعوة بنجاح! 📋");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    playClick();
    shareReferralLink(user, "whatsapp");
  };

  const handleShareTelegram = () => {
    playClick();
    shareReferralLink(user, "telegram");
  };

  return (
    <div className="w-full space-y-5" data-purpose="zeta-usage-and-referral-hub">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="relative overflow-hidden rounded-2xl glass-card p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <PaymentIcon size={18} />
              {isEn ? "Available Credits" : "الكريدت المتاح"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {isEn ? "Platform Currency" : "عملة المنصة"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-400 tabular-nums">
              {credits.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">{isEn ? "Credits" : "كريدت"}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{isEn ? "Used:" : "المستهلك:"} <strong className="text-slate-200">{creditsUsed}</strong></span>
            <Link to="/subscriptions" onClick={playClick} className="text-amber-400 hover:underline font-bold text-[11px] flex items-center gap-0.5">
              {isEn ? "Recharge" : "شحن"} &rarr;
            </Link>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl glass-card p-5 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-card to-background shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" />
              {isEn ? "Plan & Operations" : "الخطة والعمليات"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase">
              {user?.subscription_plan || "Free"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {user?.subscription_plan === "supreme" || user?.subscription_plan === "pro"
                ? (isEn ? "Unlimited" : "غير محدود 🚀")
                : (isEn ? "2 / Day" : "2 يومياً")}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{isEn ? "AI Engine Power:" : "قوة محركات الـ AI:"} <strong className="text-purple-300">{isEn ? "Full Unlocked ⚡" : "مفتوح بالكامل ⚡"}</strong></span>
            <Link to="/subscriptions" onClick={playClick} className="text-purple-400 hover:underline font-bold text-[11px]">
              {isEn ? "Upgrade" : "ترقية"} &rarr;
            </Link>
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl glass-card p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-background shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              {isEn ? "Invited Friends" : "الطلاب المدعوون"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              +10 Cr
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400 tabular-nums">
              {referralsCount}
            </span>
            <span className="text-xs text-muted-foreground">/ {targetInvites} {isEn ? "Friends" : "طالب"}</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-green-400 h-full rounded-full transition-colors duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-300/90 font-medium">
              {referralsCount >= targetInvites
                ? (isEn ? "👑 100 EGP Plan Unlocked Free!" : "👑 مبروك! اشتراك الـ 100 ج مفعّل مجاناً!")
                : (isEn ? `Earned: ${referralsCount * 10} Credits` : `أرباحك: ${referralsCount * 10} كريدت مجاني`)}
            </p>
          </div>
        </div>

      </div>

      <div
        dir={isEn ? "ltr" : "rtl"}
        className="relative overflow-hidden rounded-3xl border border-gray-800 bg-[#0a1115] shadow-2xl transition-all"
      >
        <div className="absolute -top-14 -right-14 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-14 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col w-full gap-8 p-8">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-fit whitespace-nowrap px-4 py-1.5 rounded-full border border-emerald-500/40 bg-transparent text-emerald-400 text-sm flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? "Zeta Referral & Rewards System 🎁" : "نظام الدعوات ومكافآت زيتا 🎁"}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-fit whitespace-nowrap px-3 py-1.5 rounded-full border border-emerald-500/35 bg-transparent text-emerald-300 text-xs flex items-center gap-1.5">
                <Users className="w-3 h-3 shrink-0" />
                <span>{isEn ? "+10 Credits per friend" : "١٠ كريدت لكل صديق"}</span>
              </div>
              <div className="w-fit whitespace-nowrap px-3 py-1.5 rounded-full border border-amber-500/40 bg-transparent text-amber-300 text-xs flex items-center gap-1.5">
                <span>👑</span>
                <span>{isEn ? "40 invites = 100 EGP plan FREE" : "٤٠ دعوة = اشتراك ١٠٠ ج مجاناً"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-center w-full gap-10 lg:gap-12">

            <div className="flex flex-col items-start w-full lg:flex-1 gap-5">
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white text-right leading-[1.5] w-full text-balance">
                {isEn
                  ? "Invite your peers and get 10 credits instantly for each student!"
                  : "ادعُ زملاءك واكسب ١٠ كريدت فوراً عن كل طالب!"}
              </h2>

              <p className="text-gray-400 text-sm md:text-base leading-relaxed w-full max-w-xl text-pretty">
                {isEn
                  ? "Share your invite link with peers on WhatsApp and Telegram. As soon as they register, 10 free credits are added to your account instantly. Invite 40 students and get the 100 EGP subscription completely free! 👑"
                  : "شارك رابط دعوتك مع زملائك على الواتساب وتيليجرام — أول ما يسجلوا هينزل في حسابك فوراً ١٠ كريدت مجانية. ولو دعوت ٤٠ طالب هتاخد اشتراك الـ ١٠٠ جنيه مجاناً بالكامل! 👑"}
              </p>
            </div>

            <div className="flex flex-col w-full lg:w-[380px] xl:w-[420px] shrink-0 gap-4">
              <div className="flex flex-row items-center justify-between w-full bg-[#05080a] border border-gray-700 rounded-xl p-1.5">
                <span className="text-gray-400 text-sm px-4 truncate font-mono" dir="ltr">
                  {referralLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 bg-cyan-400 text-black font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-cyan-300 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>{isEn ? "Copied" : "تم النسخ"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 stroke-[2.5]" />
                      <span>{isEn ? "Copy" : "نسخ"}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-row items-center justify-between w-full gap-3">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex-1 flex justify-center items-center gap-2 bg-[#05080a] border border-emerald-900/50 text-emerald-500 py-3 rounded-xl font-medium hover:bg-emerald-900/20 transition cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-current shrink-0" />
                  <span>{isEn ? "WhatsApp" : "واتساب"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex-1 flex justify-center items-center gap-2 bg-[#05080a] border border-blue-900/50 text-blue-500 py-3 rounded-xl font-medium hover:bg-blue-900/20 transition cursor-pointer"
                  title="Share on Telegram"
                >
                  <TelegramIcon className="w-4 h-4 fill-current shrink-0" />
                  <span>{isEn ? "Telegram" : "تيليجرام"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.476-.15-.676.15-.2.301-.776.978-.952 1.179-.176.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.783-1.676-2.084-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.2-.301.301-.502.1-.201.05-.376-.025-.526-.075-.15-.676-1.631-.927-2.235-.245-.588-.494-.508-.677-.517l-.578-.01c-.2 0-.526.075-.802.376-.276.301-1.052 1.028-1.052 2.508s1.077 2.909 1.228 3.11c.15.201 2.12 3.238 5.136 4.542.717.31 1.277.496 1.713.634.72.229 1.376.197 1.895.119.578-.087 1.78-.727 2.03-1.429.251-.702.251-1.304.176-1.429-.075-.125-.276-.201-.577-.351z" />
      <path d="M12.004 2C6.486 2 2.012 6.474 2.012 11.993c0 1.947.56 3.764 1.528 5.303L2 22l4.838-1.503a9.945 9.945 0 0 0 5.166 1.496h.005c5.518 0 9.992-4.474 9.992-9.993A9.95 9.95 0 0 0 12.004 2zm0 18.257h-.004a8.28 8.28 0 0 1-4.223-1.154l-.303-.18-3.138.975.992-3.057-.197-.314a8.272 8.272 0 0 1-1.266-4.534c0-4.57 3.719-8.288 8.29-8.288 2.213 0 4.293.863 5.859 2.428 1.565 1.566 2.426 3.647 2.426 5.861 0 4.57-3.719 8.289-8.289 8.289z" />
    </svg>
  );
}

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}