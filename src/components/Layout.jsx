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
  User,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
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
  "/planner": () => import("@/pages/StudyPlanner"),
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("bf_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  useSmoothScroll(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bf_sidebar_collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

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
        { to: "/planner", label: locale === "ar" ? "حافظة البلوكات وجدول المذاكرة" : "Block Vault & Planner", icon: FolderKanban },
        { to: "/create", label: locale === "ar" ? "رفع محاضرة جديدة" : "Upload Lecture", icon: SummaryNoteIcon },
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
      title: locale === "ar" ? "المراجعة والتثبيت" : "Review & FSRS",
      items: [
        { to: "/review", label: locale === "ar" ? "المراجعة الذكية (FSRS)" : "FSRS Review", icon: FlameIcon },
        { to: "/stats", label: locale === "ar" ? "خريطة السيطرة والأداء" : "Mastery & Stats", icon: TrophyIcon },
      ],
    },
    {
      title: locale === "ar" ? "الساحة والمجتمع" : "Arena & Community",
      items: [
        { to: "/leaderboard", label: locale === "ar" ? "لوحة الشرف والدوريات" : "Leaderboard", icon: TrophyIcon },
        { to: "/friends", label: locale === "ar" ? "الأصدقاء والتحديات" : "Friends & Duels", icon: FriendsIcon },
        { to: "/groups", label: locale === "ar" ? "مجموعات الدفعة" : "Study Groups", icon: StudyGroupIcon },
      ],
    },
    {
      title: locale === "ar" ? "الحساب والرصيد" : "Account & Vault",
      items: [
        { to: "/subscriptions", label: locale === "ar" ? "خزنة الرصيد والباقات" : "Credits & Vault", icon: CreditCard },
        { to: "/profile", label: locale === "ar" ? "الملف الشخصي" : "Profile", icon: User },
        { to: "/settings", label: locale === "ar" ? "الإعدادات" : "Settings", icon: Settings },
        { to: "/help", label: locale === "ar" ? "مركز المساعدة" : "Help Center", icon: HelpCircle },
      ],
    },
  ];

  const CollapseArrowIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ExpandArrowIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  const sidebar = (
    <div className="flex flex-col h-full select-none bg-[#090c11] text-[#f5f7fa]">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
        <LVLogo to="/dashboard" label="Black Fighters" />
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <button
            type="button"
            onClick={toggleSidebar}
            title={locale === "ar" ? "إخفاء القائمة الجانبية" : "Collapse sidebar"}
            aria-label={locale === "ar" ? "إخفاء القائمة الجانبية" : "Collapse sidebar"}
            className="hidden md:inline-flex w-7 h-7 rounded-lg items-center justify-center bg-[#0e131b] border border-white/10 text-[#9aa4b2] hover:text-[#19f08c] hover:border-[#19f08c]/40 transition-colors cursor-pointer"
          >
            <CollapseArrowIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-3.5 pt-3.5 pb-2 space-y-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="w-full bg-[#0e131b] hover:bg-white/[0.05] border border-white/[0.08] hover:border-[#19f08c]/40 rounded-xl px-3 py-2 text-start flex items-center justify-between text-xs text-[#9aa4b2] hover:text-[#f5f7fa] transition-colors duration-150 cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0 text-[#19f08c]" />
            <span className="font-medium truncate">{t("search")}</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#05070a] text-[10px] text-[#9aa4b2] font-mono border border-white/10">
            ⌘K
          </kbd>
        </button>

        <div className="bg-[#0e131b] p-0.5 rounded-xl border border-white/[0.08] flex items-center text-xs font-medium">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg font-mono flex items-center justify-center transition-colors duration-150 whitespace-nowrap cursor-pointer",
              locale === "en"
                ? "bg-[#19f08c] text-[#03150c] font-bold"
                : "text-[#9aa4b2] hover:text-[#f5f7fa]"
            )}
          >
            <span>English</span>
          </button>
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={cn(
              "flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center transition-colors duration-150 whitespace-nowrap cursor-pointer",
              locale === "ar"
                ? "bg-[#19f08c] text-[#03150c] font-bold"
                : "text-[#9aa4b2] hover:text-[#f5f7fa]"
            )}
          >
            <span>العربية</span>
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

      <div className="p-3 border-t border-white/[0.08] bg-[#090c11] space-y-2">
        <div className="hidden" aria-hidden="true">
          <DocumentIcon size={14} animated={false} />
          <SummaryNoteIcon size={14} animated={false} />
        </div>

        <div className="rounded-xl bg-[#0e131b] border border-white/[0.08] p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#19f08c] shrink-0" />
              <span className="text-xs font-semibold text-[#f5f7fa] truncate">
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
        className="min-h-screen bg-[#05070a] text-[#f5f7fa] relative selection:bg-[#19f08c]/20"
      >
        <NeonBackground />

        <aside
          className={cn(
            "hidden md:flex fixed inset-y-0 start-0 w-64 lg:w-64 border-white/[0.08] bg-[#090c11] z-30 flex-col transition-transform duration-200 ease-out",
            dir === "rtl" ? "border-e" : "border-s",
            sidebarCollapsed && (dir === "rtl" ? "translate-x-full" : "-translate-x-full")
          )}
        >
          {sidebar}

          {/* Side Edge Collapse Arrow Handle when sidebar is open */}
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title={locale === "ar" ? "إخفاء الستارة الجانبية" : "Hide Sidebar"}
              aria-label={locale === "ar" ? "إخفاء الستارة الجانبية" : "Hide Sidebar"}
              className={cn(
                "hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 h-14 w-5 items-center justify-center bg-[#0e131b] border border-white/15 text-[#9aa4b2] hover:text-[#19f08c] hover:border-[#19f08c]/50 transition-colors cursor-pointer shadow-lg",
                dir === "rtl"
                  ? "-left-5 rounded-s-xl border-e-0"
                  : "-right-5 rounded-e-xl border-s-0"
              )}
            >
              <CollapseArrowIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </aside>

        {/* Side Edge Expand Tab when sidebar is collapsed */}
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title={locale === "ar" ? "إظهار الستارة الجانبية" : "Show Sidebar"}
            aria-label={locale === "ar" ? "إظهار الستارة الجانبية" : "Show Sidebar"}
            className={cn(
              "hidden md:flex fixed top-1/2 -translate-y-1/2 start-0 z-40 h-16 w-6 items-center justify-center bg-[#0e131b] border border-[#19f08c]/40 text-[#19f08c] hover:bg-[#19f08c] hover:text-[#03150c] transition-colors cursor-pointer shadow-[0_0_20px_rgba(25,240,140,0.25)]",
              dir === "rtl" ? "rounded-s-xl border-e-0" : "rounded-e-xl border-s-0"
            )}
          >
            <ExpandArrowIcon className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        <header className="md:hidden sticky top-0 z-40 bg-[#05070a]/85 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between px-4 py-2.5 pt-safe pr-safe pl-safe">
          <LVLogo to="/dashboard" label="Black Fighters" />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className="tap-target w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-[#f5f7fa] bg-[#0e131b] border border-white/10"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0e131b] border border-white/10 text-xs font-mono font-semibold text-[#19f08c]"
            >
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
              className="tap-target w-8 h-8 rounded-lg flex items-center justify-center bg-[#0e131b] border border-white/10 text-[#f5f7fa]"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs"
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
                  {locale === "ar" ? "القائمة الرئيسية" : "Main Menu"}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0e131b] border border-white/10 text-[#9aa4b2] hover:text-[#f5f7fa]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{sidebar}</div>
            </aside>
          </div>
        )}

        <main
          className={cn(
            "relative z-10 p-4 sm:p-6 md:p-8 pb-28 md:pb-16 max-w-6xl mx-auto transition-[margin] duration-200",
            sidebarCollapsed ? "md:ms-0" : "md:ms-64"
          )}
        >
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
