import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, Sparkles, BookOpen, Brain, Info, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getNotificationsCached, invalidateNotificationsCache } from "@/lib/notificationStore";

const ICONS = {
  info: Info,
  success: Sparkles,
  quiz: Brain,
  course: BookOpen,
  warning: AlertCircle,
};

const COLORS = {
  info: "text-primary bg-primary/10 border-primary/25",
  success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  quiz: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
  course: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/25",
  warning: "text-destructive bg-destructive/10 border-destructive/25",
};

export default function NotificationBell({ className }) {
  const { profile } = useAuth();
  const { isEn, t } = useLocale();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return getNotificationsCached(profile.id, 30);
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? 120_000 : false,
    refetchOnWindowFocus: false,
  });

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (n) => {
    if (n.read) return;
    await base44.entities.Notification.update(n.id, { read: true });
    invalidateNotificationsCache(profile?.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
  };

  const markAllRead = async () => {
    await Promise.all(
      items.filter((n) => !n.read).map((n) => base44.entities.Notification.update(n.id, { read: true }))
    );
    invalidateNotificationsCache(profile?.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    await base44.entities.Notification.delete(id);
    invalidateNotificationsCache(profile?.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
  };

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return isEn ? "Just now" : "دلوقتي";
    if (diff < 3600) return isEn ? `${Math.floor(diff / 60)}m ago` : `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return isEn ? `${Math.floor(diff / 3600)}h ago` : `منذ ${Math.floor(diff / 3600)} س`;
    return isEn ? `${Math.floor(diff / 86400)}d ago` : `منذ ${Math.floor(diff / 86400)} يوم`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t("notifications")}
          className={cn(
            "relative grid size-9 place-items-center rounded-xl border border-border bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer",
            className
          )}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
        dir={isEn ? "ltr" : "rtl"}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">{t("notifications")}</span>
            {unread > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-semibold">
                {unread} {isEn ? "new" : "جديد"}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="size-3.5" /> {t("markAllRead")}
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="size-8 mx-auto mb-2 opacity-30" />
              {t("noNotifications")}
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.type] || Info;
              const color = COLORS[n.type] || COLORS.info;
              const Wrapper = n.link ? Link : "div";
              const wrapperProps = n.link ? { to: n.link, onClick: () => { markRead(n); setOpen(false); } } : { onClick: () => markRead(n) };
              return (
                <Wrapper
                  key={n.id}
                  {...wrapperProps}
                  className={cn(
                    "flex items-start gap-3 p-3.5 hover:bg-secondary/60 transition-colors cursor-pointer group",
                    !n.read && "bg-primary/[0.05]"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-xs font-semibold truncate text-foreground", !n.read && "text-primary")}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{timeAgo(n.created_date)}</span>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  </div>
                  <button
                    onClick={(e) => remove(n.id, e)}
                    aria-label={isEn ? "Delete notification" : "حذف الإشعار"}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Wrapper>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}