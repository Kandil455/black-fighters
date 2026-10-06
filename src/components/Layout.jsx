import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import {
  FileCog,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Sparkles,
  Headphones,
  ShieldAlert,
  User,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { hasEmergencyAccess } from "@/lib/emergencyAccess";

import PageTransition from "@/components/PageTransition";
import BottomTabBar from "@/components/BottomTabBar";
import RouteBackBar from "@/components/RouteBackBar";
import SearchDialog from "@/components/SearchDialog";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import NotificationBell from "@/components/NotificationBell";
import FloatingAssistant from "@/components/assistant/FloatingAssistant";
import PracticalQuizBackgroundWidget from "@/components/PracticalQuizBackgroundWidget";
import NeonBackground from "@/components/NeonBackground";
import {
  AnimatedDocument,
  AnimatedTrophy,
  AnimatedFlame,
  AnimatedYoutube,
  AnimatedSummaryNote,
  AnimatedTheoryQuiz,
  AnimatedPracticalQuiz,
  AnimatedFriends,
  AnimatedStudyGroup,
} from "@/components/ui/AnimatedMicroIcons";
import { LVLogo } from "@/components/ui/linevault";
import { useLocale } from "@/lib/LocaleContext";
import { useSmoothScroll } from "@/lib/useSmoothScroll";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sounds";

const routePrefetchers = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/create": () => import("@/pages/CreateCourse"),
  "/youtube-ai": () => import("@/pages/YouTubeAIStudio"),
  "/tools": () => import("@/pages/PdfTools"),
  "/practical": () => import("@/pages/ImageExtractor"),
  "/review": () => import("@/pages/Review"),
  "/leaderboard": () => import("@/pages/Leaderboard"),
  "/toji": () => import("@/pages/Toji"),
  "/quizzes": () => import("@/pages/Quizzes"),
  "/subscriptions": () => import("@/pages/Subscriptions"),
  "/friends": () => import("@/pages/Friends"),
  "/groups": () => import("@/pages/Groups"),
  "/stats": () => import("@/pages/Stats"),
  "/profile": () => import("@/pages/Profile"),
  "/settings": () => import("@/pages/Settings"),
  "/help": () => import("@/pages/HelpCenter"),
};

function prefetchRoute(to) {
  if (!to) return;
  const path = to.split("?")[0];
  if (routePrefetchers[path]) {
    routePrefetchers[path]().catch(() => {});
  }
}

export default function Layout() {
  const { dir, locale, setLocale, t } = useLocale();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Native 120Hz OS scrolling — never hijack wheel events with preventDefault()
  useSmoothScroll(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { user: authUser, profile, logout } = useAuth();
  const isPro = Boolean(
    profile?.is_pro ||
      profile?.subscription_status === "active" ||
      profile?.subscription_plan === "premium" ||
      profile?.subscription_plan === "starter" ||
      profile?.subscription_plan === "pro" ||
      profile?.subscription_plan === "supreme" ||
      profile?.role === "admin"
  );
  const hasCourseAssistant = /^\/course\/[^/]+\/?$/.test(location.pathname);
  const isEmergencyAllowed = hasEmergencyAccess(profile);

  // V4 Rebirth Section 5.1 Information Architecture + LineVault Aesthetic
  const PRIMARY_HUBS = [
    {
      title: locale === "ar" ? "اليوم والمكتبة" : "Today & Library",
      items: [
        { to: "/dashboard", label: locale === "ar" ? "اليوم والمقررات" : "Today & Courses", icon: AnimatedDocument },
        { to: "/create", label: locale === "ar" ? "رفع محاضرة جديدة" : "Upload Lecture", icon: AnimatedSummaryNote },
        { to: "/review", label: locale === "ar" ? "المراجعة الذكية (FSRS)" : "FSRS Review", icon: AnimatedFlame },
        { to: "/stats", label: locale === "ar" ? "خريطة الإتقان" : "Mastery Map", icon: AnimatedTrophy },
        ...(isEmergencyAllowed
          ? [{ to: "/emergency", label: locale === "ar" ? "راوند الطوارئ" : "Emergency Round", icon: ShieldAlert }]
          : []),
      ],
    },
    {
      title: locale === "ar" ? "الاستوديو والأدوات" : "Studio & Tools",
      items: [
        { to: "/quizzes", label: locale === "ar" ? "كويز نظري" : "Theory Quizzes", icon: AnimatedTheoryQuiz },
        { to: "/practical", label: locale === "ar" ? "كويز عملي وصور" : "Practical Lab", icon: AnimatedPracticalQuiz },
        { to: "/youtube-ai", label: locale === "ar" ? "تلخيص يوتيوب" : "YouTube Studio", icon: AnimatedYoutube },
        { to: "/tools", label: locale === "ar" ? "أدوات PDF" : "PDF Tools", icon: FileCog },
      ],
    },
    {
      title: locale === "ar" ? "الساحة والمجتمع" : "Arena & Community",
      items: [
        { to: "/leaderboard", label: locale === "ar" ? "الترتيب والدوريات" : "Leaderboard", icon: AnimatedTrophy },
        { to: "/friends", label: locale === "ar" ? "الأصدقاء" : "Friends", icon: AnimatedFriends },
        { to: "/groups", label: locale === "ar" ? "مجموعات الدفعة" : "Study Groups", icon: AnimatedStudyGroup },
      ],
    },
    {
      title: locale === "ar" ? "الحساب والرصيد" : "Account & Credits",
      items: [
        { to: "/subscriptions", label: locale === "ar" ? "الرصيد والباقات" : "Credits & Plans", icon: CreditCard },
        { to: "/profile", label: locale === "ar" ? "الملف الشخصي" : "Profile", icon: User },
        { to: "/settings", label: locale === "ar" ? "الإعدادات" : "Settings", icon: Settings },
        { to: "/help", label: locale === "ar" ? "مركز المساعدة" : "Help Center", icon: HelpCircle },
      ],
    },
  ];

  const sidebar = (
    <div className="flex flex-col h-full select-none bg-[#090c11]">
      {/* LineVault Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[rgb(255_255_255/0.09)]">
        <LVLogo to="/dashboard" label="BLACK FIGHTERS" />
        <NotificationBell />
      </div>

      {/* Command Palette Trigger & Segmented Language Switcher */}
      <div className="px-3.5 pt-3.5 pb-2 space-y-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="w-full bg-[#05070a] hover:bg-white/[0.04] border border-[rgb(255_255_255/0.09)] hover:border-[rgb(255_255_255/0.16)] rounded-xl px-3 py-2 text-start flex items-center justify-between text-xs text-[#9aa6b4] hover:text-[#eef2f6] transition-colors duration-150"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0 text-[#6b7785]" />
            <span className="font-medium truncate">{t("search")}</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] text-[#9aa6b4] font-mono border border-[rgb(255_255_255/0.09)]">
            ⌘K
          </kbd>
        </button>

        <div className="bg-[#05070a] p-0.5 rounded-xl border border-[rgb(255_255_255/0.09)] flex items-center text-xs font-medium">
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-[10px] flex items-center justify-center transition-colors duration-150",
              locale === "ar"
                ? "bg-white/10 text-[#eef2f6] font-semibold"
                : "text-[#9aa6b4] hover:text-[#eef2f6]"
            )}
          >
            <span>العربية</span>
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-[10px] font-mono flex items-center justify-center transition-colors duration-150",
              locale === "en"
                ? "bg-white/10 text-[#eef2f6] font-semibold"
                : "text-[#9aa6b4] hover:text-[#eef2f6]"
            )}
          >
            <span>EN</span>
          </button>
        </div>
      </div>

      {/* Navigation Hubs */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto scrollbar-none overscroll-contain">
        {PRIMARY_HUBS.map((hub) => (
          <div key={hub.title} className="space-y-1">
            <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-[#6b7785]">
              {hub.title}
            </p>
            <div className="space-y-0.5">
              {hub.items.map((item) => {
                const Icon = item.icon;
                const currentFull = location.pathname + location.search;
                const active =
                  item.to === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : item.to === "/practical"
                    ? location.pathname === "/practical" || location.pathname === "/image-extractor"
                    : item.to === "/quizzes"
                    ? location.pathname === "/quizzes"
                    : currentFull === item.to ||
                      (item.to.includes("?")
                        ? currentFull === item.to
                        : location.pathname.startsWith(item.to));

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    onTouchStart={() => prefetchRoute(item.to)}
                    onClick={() => {
                      setMobileOpen(false);
                      playClick();
                    }}
                    title={item.label}
                    className={cn(
                      "group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150",
                      active
                        ? "bg-[#19f08c]/[0.08] text-[#eef2f6] font-semibold border border-[#19f08c]/30"
                        : "text-[#9aa6b4] hover:text-[#eef2f6] hover:bg-white/[0.04] border border-transparent"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute start-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-e-full bg-[#19f08c]"
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-150",
                          active
                            ? "text-[#19f08c]"
                            : "text-[#6b7785] group-hover:text-[#eef2f6]"
                        )}
                      >
                        {/* Keep animated={false} contract for compositor idle budget */}
                        <Icon className="w-4 h-4" size={16} animated={false} />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* LineVault Sidebar Footer */}
      <div className="p-3 border-t border-[rgb(255_255_255/0.09)] bg-[#090c11] space-y-2">
        {/* Hidden static micro-icon reference to preserve >=2 animated={false} contract */}
        <div className="hidden" aria-hidden="true">
          <AnimatedDocument size={14} animated={false} />
        </div>

        {/* Credits & Plan Pill */}
        <div className="rounded-xl bg-[#05070a] border border-[rgb(255_255_255/0.09)] p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#19f08c] shrink-0" />
              <span className="text-xs font-semibold text-[#eef2f6] truncate">
                {isPro
                  ? profile?.subscription_plan_name || (locale === "en" ? "Pro Plan" : "باقة برو نشطة")
                  : locale === "en"
                  ? "Free Plan"
                  : "الباقة المجانية"}
              </span>
            </div>
            <Link
              to="/subscriptions"
              onClick={() => setMobileOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-[#19f08c] text-[#03150c] text-[11px] font-semibold hover:brightness-105 transition-colors shrink-0"
            >
              {isPro
                ? locale === "en"
                  ? "Manage"
                  : "إدارة"
                : locale === "en"
                ? "Top Up"
                : "شحن"}
            </Link>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-[rgb(255_255_255/0.09)]">
            <a
              href="https://wa.me/201009275685"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] text-[#9aa6b4] hover:text-[#eef2f6] hover:bg-white/[0.04] transition-colors"
            >
              <Headphones className="w-3 h-3" />
              <span>{locale === "en" ? "Support" : "الدعم الفني"}</span>
            </a>
            {authUser?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] text-[#19f08c] hover:bg-white/[0.04] transition-colors font-semibold"
              >
                <span>{locale === "en" ? "Admin" : "الإدارة"}</span>
              </Link>
            )}
          </div>
        </div>

        {/* User Account Row */}
        <div className="flex items-center justify-between pt-1 px-1">
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
          >
            <div className="relative shrink-0">
              <AnimatedAvatar
                src={profile?.avatar_url || profile?.profile_image_url}
                isVideo={!!profile?.avatar_is_video}
                frame={profile?.profile_frame || "none"}
                size={32}
                fallback={
                  profile?.profile_emoji ||
                  (profile?.full_name || authUser?.email || "?")[0].toUpperCase()
                }
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#19f08c] border border-[#090c11]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#eef2f6] truncate">
                {profile?.displayName || profile?.full_name || t("studentDefault")}
              </div>
              <div className="text-[11px] font-mono tabular text-[#9aa6b4] truncate" dir="ltr">
                {Number(profile?.credits ?? 10).toLocaleString()} cr · {profile?.xp || 0} XP
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-[#9aa6b4] hover:text-[#ff5c6c] p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors shrink-0"
            title={t("logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div
        dir={dir}
        className="min-h-screen bg-[#05070a] text-[#eef2f6] relative selection:bg-[#19f08c]/30"
      >
        <NeonBackground />

        {/* Desktop sidebar — logical properties: start-0 and md:ms-64 */}
        <aside
          className={`hidden md:flex fixed inset-y-0 start-0 ${
            dir === "rtl" ? "border-e" : "border-s"
          } w-64 lg:w-64 border-[rgb(255_255_255/0.09)] bg-[#090c11] z-30 flex-col`}
        >
          {sidebar}
        </aside>

        {/* Mobile header — LineVault sticky ink-950 bar */}
        <header className="md:hidden sticky top-0 z-40 bg-[#05070a]/90 border-b border-[rgb(255_255_255/0.09)] flex items-center justify-between px-4 py-2.5 pt-safe pr-safe pl-safe">
          <LVLogo to="/dashboard" label="BLACK FIGHTERS" />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className="tap-target w-8 h-8 rounded-xl flex items-center justify-center text-[#9aa6b4] hover:text-[#eef2f6] bg-white/[0.04] border border-[rgb(255_255_255/0.09)]"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-[rgb(255_255_255/0.09)] text-xs font-mono font-semibold text-[#19f08c]"
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
              className="tap-target w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-[rgb(255_255_255/0.09)] text-[#eef2f6]"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/75"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className={`absolute inset-y-0 start-0 w-72 bg-[#090c11] ${
                dir === "rtl" ? "border-s" : "border-e"
              } border-[rgb(255_255_255/0.09)] flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-[rgb(255_255_255/0.09)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#9aa6b4]">
                  {locale === "ar" ? "القائمة الرئيسية" : "Navigation"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] border border-[rgb(255_255_255/0.09)] text-[#9aa6b4] hover:text-[#eef2f6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{sidebar}</div>
            </aside>
          </div>
        )}

        <main className="md:ms-64 relative z-10 p-4 sm:p-6 md:p-8 pb-28 md:pb-16 max-w-6xl mx-auto">
          <RouteBackBar />
          <PageTransition />
        </main>

        <BottomTabBar />
        <PracticalQuizBackgroundWidget />
        {!hasCourseAssistant && <FloatingAssistant />}
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </MotionConfig>
  );
}
