import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { playClick } from "@/lib/sounds";
import { useLocale } from "@/lib/LocaleContext";
import { Plus, BookOpen, BrainCircuit, Flame, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS_CONFIG = [
  {
    key: "today",
    root: "/dashboard",
    labelAr: "اليوم",
    labelEn: "Today",
    icon: BookOpen,
    match: ["/dashboard", "/course"],
  },
  {
    key: "studio",
    root: "/quizzes",
    labelAr: "أدوات",
    labelEn: "Studio",
    icon: BrainCircuit,
    match: ["/quizzes", "/practical", "/youtube-ai", "/tools"],
  },
  {
    key: "create",
    root: "/create",
    labelAr: "رفع",
    labelEn: "Upload",
    center: true,
    match: ["/create"],
  },
  {
    key: "review",
    root: "/review",
    labelAr: "المراجعة",
    labelEn: "Review",
    icon: Flame,
    match: ["/review"],
  },
  {
    key: "me",
    root: "/profile",
    labelAr: "حسابي",
    labelEn: "Account",
    icon: User,
    match: ["/stats", "/profile", "/subscriptions", "/settings", "/leaderboard", "/friends", "/groups"],
  },
];

function getActiveTab(pathname) {
  for (const tab of TABS_CONFIG) {
    if (tab.center) continue;
    if (
      tab.match.some(
        (m) => pathname === m || pathname.startsWith(m + "/") || pathname.startsWith(m)
      )
    ) {
      return tab.key;
    }
  }
  return "today";
}

export default function BottomTabBar() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = getActiveTab(location.pathname);

  const handleTab = (tab) => {
    playClick();
    if (tab.center) {
      navigate("/create");
      return;
    }
    navigate(tab.root);
  };

  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-[#D5DEE7] pb-safe"
      dir={dir}
    >
      <nav
        className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-between"
        aria-label={isEn ? "Bottom Navigation" : "التنقّل السفلي"}
      >
        {TABS_CONFIG.map((tab) => {
          const active = !tab.center && tab.key === activeKey;
          const label = isEn ? tab.labelEn : tab.labelAr;
          const Icon = tab.icon;

          if (tab.center) {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTab(tab)}
                aria-label={label}
                className="flex items-center justify-center mx-1 px-3.5 py-2 rounded-md bg-[#0B1F33] text-white hover:bg-[#071624] transition-colors duration-150"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            );
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTab(tab)}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-1 gap-1 rounded-md transition-colors duration-150 min-w-0",
                active
                  ? "text-[#2B8A9E]"
                  : "text-[#5A6B7D] hover:text-[#0B1F33]"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate leading-none">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
