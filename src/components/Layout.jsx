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
  DocumentIcon,
  TrophyIcon,
  FlameIcon,
  YoutubeIcon,
  SummaryNoteIcon,
  TheoryQuizIcon,
  PracticalQuizIcon,
  FriendsIcon,
  StudyGroupIcon,
} from "@/components/ui/icons";
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

  const PRIMARY_HUBS = [
    {
      title: locale === "ar" ? "اليوم والمكتبة" : "Today & Library",
      items: [
        { to: "/dashboard", label: locale === "ar" ? "اليوم والمقررات" : "Today & Courses", icon: DocumentIcon },
        { to: "/create", label: locale === "ar" ? "رفع محاضرة جديدة" : "Upload Lecture", icon: SummaryNoteIcon },
        { to: "/review", label: locale === "ar" ? "المراجعة الذكية (FSRS)" : "FSRS Review", icon: FlameIcon },
        { to: "/stats", label: locale === "ar" ? "خريطة الإتقان" : "Mastery Map", icon: TrophyIcon },
        ...(isEmergencyAllowed
          ? [{ to: "/emergency", label: locale === "ar" ? "راوند الطوارئ" : "Emergency Round", icon: ShieldAlert }]
          : []),
      ],
    },
    {
      title: locale === "ar" ? "الاستوديو والأدوات" : "Studio & Tools",
      items: [
        { to: "/quizzes", label: locale === "ar" ? "كويز نظري" : "Theory Quizzes", icon: TheoryQuizIcon },
        { to: "/practical", label: locale === "ar" ? "كويز عملي وصور" : "Practical Lab", icon: PracticalQuizIcon },
        { to: "/youtube-ai", label: locale === "ar" ? "تلخيص يوتيوب" : "YouTube Studio", icon: YoutubeIcon },
        { to: "/tools", label: locale === "ar" ? "أدوات PDF" : "PDF Tools", icon: FileCog },
      ],
    },
    {
      title: locale === "ar" ? "الساحة والمجتمع" : "Arena & Community",
      items: [
        { to: "/leaderboard", label: locale === "ar" ? "الترتيب والدوريات" : "Leaderboard", icon: TrophyIcon },
        { to: "/friends", label: locale === "ar" ? "الأصدقاء" : "Friends", icon: FriendsIcon },
        { to: "/groups", label: locale === "ar" ? "مجموعات الدفعة" : "Study Groups", icon: StudyGroupIcon },
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
    <div className="flex flex-col h-full select-none bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#D5DEE7]">
        <LVLogo to="/dashboard" label="Black Fighters" />
        <NotificationBell />
      </div>

      <div className="px-3.5 pt-3.5 pb-2 space-y-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="w-full bg-[#F6F8FA] hover:bg-[#EEF2F5] border border-[#D5DEE7] hover:border-[#B8CBD6] rounded-md px-3 py-2 text-start flex items-center justify-between text-xs text-[#5A6B7D] hover:text-[#0B1F33] transition-colors duration-150"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0 text-[#5A6B7D]" />
            <span className="font-medium truncate">{t("search")}</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] text-[#5A6B7D] font-mono border border-[#D5DEE7]">
            ⌘K
          </kbd>
        </button>

        <div className="bg-[#F6F8FA] p-0.5 rounded-md border border-[#D5DEE7] flex items-center text-xs font-medium">
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-[5px] flex items-center justify-center transition-colors duration-150",
              locale === "ar"
                ? "bg-white text-[#0B1F33] font-semibold shadow-sm"
                : "text-[#5A6B7D] hover:text-[#0B1F33]"
            )}
          >
            <span>العربية</span>
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-[5px] font-mono flex items-center justify-center transition-colors duration-150",
              locale === "en"
                ? "bg-white text-[#0B1F33] font-semibold shadow-sm"
                : "text-[#5A6B7D] hover:text-[#0B1F33]"
            )}
          >
            <span>EN</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto scrollbar-none overscroll-contain">
        {PRIMARY_HUBS.map((hub) => (
          <div key={hub.title} className="space-y-1">
            <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-[#8A97A8]">
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
                      "group relative flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors duration-150",
                      active
                        ? "bg-[#E6F3F6] text-[#0B1F33] font-semibold border border-[#C5D9E0]"
                        : "text-[#5A6B7D] hover:text-[#0B1F33] hover:bg-[#F6F8FA] border border-transparent"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute start-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-e-full bg-[#2B8A9E]"
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150",
                          active
                            ? "text-[#2B8A9E]"
                            : "text-[#8A97A8] group-hover:text-[#0B1F33]"
                        )}
                      >
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

      <div className="p-3 border-t border-[#D5DEE7] bg-white space-y-2">
        <div className="hidden" aria-hidden="true">
          <DocumentIcon size={14} animated={false} />
        </div>

        <div className="rounded-md bg-[#F6F8FA] border border-[#D5DEE7] p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#2B8A9E] shrink-0" />
              <span className="text-xs font-semibold text-[#0B1F33] truncate">
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
              className="px-2.5 py-1 rounded-md bg-[#0B1F33] text-white text-[11px] font-semibold hover:bg-[#071624] transition-colors shrink-0"
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

          <div className="flex items-center gap-1.5 pt-1 border-t border-[#D5DEE7]">
            <a
              href="https://wa.me/201009275685"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] text-[#5A6B7D] hover:text-[#0B1F33] hover:bg-white transition-colors"
            >
              <Headphones className="w-3 h-3" />
              <span>{locale === "en" ? "Support" : "الدعم الفني"}</span>
            </a>
            {authUser?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] text-[#2B8A9E] hover:bg-white transition-colors font-semibold"
              >
                <span>{locale === "en" ? "Admin" : "الإدارة"}</span>
              </Link>
            )}
          </div>
        </div>

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
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#2B8A9E] border border-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#0B1F33] truncate">
                {profile?.displayName || profile?.full_name || t("studentDefault")}
              </div>
              <div className="text-[11px] font-mono tabular text-[#5A6B7D] truncate" dir="ltr">
                {Number(profile?.credits ?? 10).toLocaleString()} cr · {profile?.xp || 0} XP
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-[#5A6B7D] hover:text-[#B42318] p-1.5 rounded-md hover:bg-[#FCECEF] transition-colors shrink-0"
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
        className="min-h-screen bg-[#F6F8FA] text-[#0B1F33] relative selection:bg-[#2B8A9E]/20"
      >
        <NeonBackground />

        <aside
          className={`hidden md:flex fixed inset-y-0 start-0 ${
            dir === "rtl" ? "border-e" : "border-s"
          } w-64 lg:w-64 border-[#D5DEE7] bg-white z-30 flex-col shadow-[0_0_0_1px_rgba(11,31,51,0.02)]`}
        >
          {sidebar}
        </aside>

        <header className="md:hidden sticky top-0 z-40 bg-white/95 border-b border-[#D5DEE7] flex items-center justify-between px-4 py-2.5 pt-safe pr-safe pl-safe">
          <LVLogo to="/dashboard" label="Black Fighters" />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className="tap-target w-8 h-8 rounded-md flex items-center justify-center text-[#5A6B7D] hover:text-[#0B1F33] bg-[#F6F8FA] border border-[#D5DEE7]"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="w-8 h-8 rounded-md flex items-center justify-center bg-[#F6F8FA] border border-[#D5DEE7] text-xs font-mono font-semibold text-[#2B8A9E]"
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
              className="tap-target w-8 h-8 rounded-md flex items-center justify-center bg-[#F6F8FA] border border-[#D5DEE7] text-[#0B1F33]"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-[#0B1F33]/35"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className={`absolute inset-y-0 start-0 w-72 bg-white ${
                dir === "rtl" ? "border-s" : "border-e"
              } border-[#D5DEE7] flex flex-col shadow-xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-[#D5DEE7] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5A6B7D]">
                  {locale === "ar" ? "القائمة الرئيسية" : "Navigation"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-md flex items-center justify-center bg-[#F6F8FA] border border-[#D5DEE7] text-[#5A6B7D] hover:text-[#0B1F33]"
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
