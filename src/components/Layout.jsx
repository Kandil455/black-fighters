import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { LECTURE_CONFIG } from "@/features/lectures/lib/config";
import {
  FileCog,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Sparkles,
  Headphones,
  User,
  CreditCard,
  HelpCircle,
  Award,
  Sun,
  Moon,
} from "lucide-react";

import PageTransition from "@/components/PageTransition";
import BottomTabBar from "@/components/BottomTabBar";
import RouteBackBar from "@/components/RouteBackBar";
import SearchDialog from "@/components/SearchDialog";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import NotificationBell from "@/components/NotificationBell";
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
import { useStudyTheme } from "@/lib/StudyThemeContext";
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
  const { isDark, toggleColorMode } = useStudyTheme();
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

  const PRIMARY_HUBS = [
    {
      title: locale === "ar" ? "اليوم والمكتبة" : "Today & Library",
      items: [
        { to: "/dashboard", label: locale === "ar" ? "اليوم والمقررات" : "Today & Courses", icon: DocumentIcon },
        { to: "/create", label: locale === "ar" ? "رفع وتلخيص محاضرة" : "Upload & Summarize", icon: SummaryNoteIcon },
        // Lecture transcriber is behind FEATURE_LECTURES (currently off) — the
        // link must disappear together with its routes, never lead to a 404.
        ...(LECTURE_CONFIG.FEATURE_LECTURES
          ? [{ to: "/lectures", label: locale === "ar" ? "تفريغ المحاضرات الصوتية" : "Audio Lecture Transcriber", icon: Headphones }]
          : []),
      ],
    },
    {
      title: locale === "ar" ? "الاستوديو والأدوات" : "Studio & Tools",
      items: [
        { to: "/quizzes", label: locale === "ar" ? "بنك الكويزات النظري" : "Theory Quizzes", icon: TheoryQuizIcon },
        { to: "/practical", label: locale === "ar" ? "معمل العملي والصور" : "Practical Lab", icon: PracticalQuizIcon },
        { to: "/youtube-ai", label: locale === "ar" ? "استوديو يوتيوب AI" : "YouTube Studio", icon: YoutubeIcon },
        { to: "/tools", label: locale === "ar" ? "استوديو أدوات PDF" : "PDF Tools", icon: FileCog },
      ],
    },
    {
      title: locale === "ar" ? "المراجعة والتثبيت" : "Review & Mastery",
      items: [
        { to: "/review", label: locale === "ar" ? "المراجعة وتثبيت الحفظ" : "Smart Review", icon: FlameIcon },
        { to: "/stats", label: locale === "ar" ? "إحصائيات التقدم والأداء" : "Mastery & Stats", icon: TrophyIcon },
      ],
    },
    {
      title: locale === "ar" ? "المجتمع الدراسي" : "Study Community",
      items: [
        { to: "/leaderboard", label: locale === "ar" ? "لوحة الشرف الأكاديمية" : "Honor Roll", icon: TrophyIcon },
        { to: "/friends", label: locale === "ar" ? "الأصدقاء والمراجعات" : "Study Peers", icon: FriendsIcon },
        { to: "/groups", label: locale === "ar" ? "مجموعات الدفعة" : "Study Groups", icon: StudyGroupIcon },
      ],
    },
    {
      title: locale === "ar" ? "الحساب والرصيد" : "Account & Credits",
      items: [
        { to: "/subscriptions", label: locale === "ar" ? "الرصيد والباقات" : "Credits & Plans", icon: CreditCard },
        { to: "/certificates", label: locale === "ar" ? "الشهادات والتراخيص" : "Certificates", icon: Award },
        { to: "/profile", label: locale === "ar" ? "الملف الشخصي" : "Profile", icon: User },
        { to: "/settings", label: locale === "ar" ? "الإعدادات ومفاتيح AI" : "Settings & AI Keys", icon: Settings },
        { to: "/help", label: locale === "ar" ? "مركز المساعدة" : "Help Center", icon: HelpCircle },
      ],
    },
  ];

  const sidebar = (
    <div className={cn("flex flex-col h-full select-none transition-colors duration-200", isDark ? "bg-[#090c11] text-[#f5f7fa]" : "bg-white text-[#0f172a]")}>
      <div className={cn("flex items-center justify-between px-4 py-4 border-b", isDark ? "border-white/[0.08]" : "border-slate-200")}>
        <LVLogo to="/dashboard" label={locale === "ar" ? "منصة IIIAK الأكاديمية" : "IIIAK Academic"} />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleColorMode}
            title={isDark ? (locale === "ar" ? "تفعيل الوضع النهاري (الأبيض)" : "Switch to Light Mode") : (locale === "ar" ? "تفعيل الوضع الليلي" : "Switch to Dark Mode")}
            aria-label="تبديل المظهر"
            className="apple-glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-[#f5f7fa] transition-colors duration-150 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
          <NotificationBell />
        </div>
      </div>

      <div className="px-3.5 pt-3.5 pb-2 space-y-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={cn(
            "apple-glass-btn w-full rounded-xl px-3 py-2 text-start flex items-center justify-between text-xs transition-colors duration-150 cursor-pointer border",
            isDark
              ? "bg-[#0e131b] hover:bg-white/[0.05] border-white/[0.08] hover:border-[#19f08c]/40 text-[#9aa4b2] hover:text-[#f5f7fa]"
              : "bg-slate-100/80 hover:bg-slate-200/60 border-slate-200 text-slate-700 hover:text-slate-900"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0 text-[#19f08c]" />
            <span className="font-medium truncate">{t("search")}</span>
          </span>
          <kbd className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono border", isDark ? "bg-[#05070a] text-[#9aa4b2] border-white/10" : "bg-white text-slate-500 border-slate-200")}>
            ⌘K
          </kbd>
        </button>

        <div className={cn("p-0.5 rounded-xl border flex items-center text-xs font-medium", isDark ? "bg-[#0e131b] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center transition-colors duration-150 whitespace-nowrap cursor-pointer",
              locale === "ar"
                ? "bg-[#19f08c] text-[#03150c] font-bold"
                : isDark ? "text-[#9aa4b2] hover:text-[#f5f7fa]" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>العربية</span>
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg font-mono flex items-center justify-center transition-colors duration-150 whitespace-nowrap cursor-pointer",
              locale === "en"
                ? "bg-[#19f08c] text-[#03150c] font-bold"
                : isDark ? "text-[#9aa4b2] hover:text-[#f5f7fa]" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span>EN</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto scrollbar-none overscroll-contain">
        {PRIMARY_HUBS.map((hub) => (
          <div key={hub.title} className="space-y-1">
            <p className="px-3 text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#646e7d]">
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
                        ? "bg-[#19f08c]/12 text-[#19f08c] font-semibold border border-[#19f08c]/35"
                        : "text-[#9aa4b2] hover:text-[#f5f7fa] hover:bg-white/[0.04] border border-transparent"
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
                          "w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150",
                          active
                            ? "text-[#19f08c]"
                            : "text-[#9aa4b2] group-hover:text-[#f5f7fa]"
                        )}
                      >
                        {Icon?.displayName?.startsWith("Icon(") ? (
                          <Icon className="w-4 h-4" size={16} animated={false} />
                        ) : (
                          <Icon className="w-4 h-4" size={16} />
                        )}
                      </div>
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("p-3 border-t space-y-2", isDark ? "border-white/[0.08] bg-[#090c11]" : "border-slate-200 bg-white")}>
        <div className="hidden" aria-hidden="true">
          <DocumentIcon size={14} animated={false} />
          <SummaryNoteIcon size={14} animated={false} />
        </div>

        <div className={cn("rounded-xl border p-2.5 space-y-2", isDark ? "bg-[#0e131b] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#19f08c] shrink-0" />
              <span className={cn("text-xs font-semibold truncate", isDark ? "text-[#f5f7fa]" : "text-slate-800")}>
                {isPro
                  ? profile?.subscription_plan_name || (locale === "en" ? "Pro Vault" : "باقة برو نشطة")
                  : locale === "en"
                  ? "Free Vault"
                  : "الباقة المجانية"}
              </span>
            </div>
            <Link
              to="/subscriptions"
              onClick={() => setMobileOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-[#19f08c] text-[#03150c] text-[11px] font-bold hover:bg-[#3bf59d] transition-colors shrink-0 whitespace-nowrap"
            >
              {isPro
                ? locale === "en"
                  ? "Manage"
                  : "إدارة"
                : locale === "en"
                ? "Top Up"
                : "شحن الرصيد"}
            </Link>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.07]">
            <a
              href="https://wa.me/201009275685"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] text-[#9aa4b2] hover:text-[#f5f7fa] hover:bg-white/[0.04] transition-colors whitespace-nowrap"
            >
              <Headphones className="w-3 h-3 text-[#19f08c]" />
              <span>{locale === "en" ? "Support" : "الدعم الفني"}</span>
            </a>
            {authUser?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] text-[#19f08c] hover:bg-white/[0.04] transition-colors font-semibold whitespace-nowrap"
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
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#f5f7fa] truncate">
                {profile?.displayName || profile?.full_name || t("studentDefault")}
              </div>
              <div className="text-[11px] font-mono tabular text-[#19f08c] truncate" dir="ltr">
                {Number(profile?.credits ?? 10).toLocaleString()} cr · {profile?.xp || 0} XP
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-[#9aa4b2] hover:text-[#ff5d6c] p-1.5 rounded-lg hover:bg-[#ff5d6c]/10 transition-colors shrink-0 cursor-pointer"
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
        className={cn(
          "min-h-screen relative selection:bg-[#19f08c]/20 transition-colors duration-200",
          isDark ? "bg-[#05070a] text-[#f5f7fa]" : "bg-[#f8fafc] text-[#0f172a]"
        )}
      >
        <NeonBackground />

        <aside
          className={cn(
            "hidden md:flex fixed inset-y-0 start-0 w-64 lg:w-64 z-30 flex-col transition-colors duration-200",
            dir === "rtl" ? "border-e" : "border-s",
            isDark ? "border-white/[0.08] bg-[#090c11]" : "border-slate-200 bg-white shadow-xs"
          )}
        >
          {sidebar}
        </aside>

        <header
          className={cn(
            "md:hidden sticky top-0 z-40 backdrop-blur-xl border-b flex items-center justify-between px-4 py-2.5 pt-safe pr-safe pl-safe transition-colors duration-200",
            isDark
              ? "bg-[#05070a]/85 border-white/[0.08] text-[#f5f7fa]"
              : "bg-white/90 border-slate-200 text-[#0f172a] shadow-xs"
          )}
        >
          <LVLogo to="/dashboard" label={locale === "ar" ? "منصة IIIAK الأكاديمية" : "IIIAK Academic"} />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleColorMode}
              aria-label="تبديل المظهر"
              className={cn(
                "apple-glass-btn tap-target w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                isDark ? "text-[#9aa4b2] hover:text-[#f5f7fa]" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className={cn(
                "apple-glass-btn tap-target w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer",
                isDark
                  ? "text-[#9aa4b2] hover:text-[#f5f7fa] bg-[#0e131b] border border-white/10"
                  : "text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200"
              )}
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="apple-glass-btn w-8 h-8 rounded-lg flex items-center justify-center bg-[#0e131b] border border-white/10 text-xs font-mono font-semibold text-[#19f08c]"
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
              className="apple-glass-btn tap-target w-8 h-8 rounded-lg flex items-center justify-center bg-[#0e131b] border border-white/10 text-[#f5f7fa]"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className={`absolute inset-y-0 start-0 w-72 bg-[#090c11] ${
                dir === "rtl" ? "border-s" : "border-e"
              } border-white/[0.08] flex flex-col shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#9aa4b2]">
                  {locale === "ar" ? "الأقسام الدراسية" : "Academic Hub"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="apple-glass-btn w-8 h-8 rounded-lg flex items-center justify-center bg-[#0e131b] border border-white/10 text-[#9aa4b2] hover:text-[#f5f7fa]"
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
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </MotionConfig>
  );
}
