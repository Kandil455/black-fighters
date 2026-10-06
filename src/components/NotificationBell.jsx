import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, BellOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  listNotifications, getUnreadCount, markRead, markAllRead, generateAutoNotifications,
} from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function NotificationBell() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [list, count] = await Promise.all([listNotifications(userId), getUnreadCount(userId)]);
    setItems(list);
    setUnread(count);
  }, [userId]);

  // توليد تلقائي عند الدخول + جلب
  useEffect(() => {
    if (!userId) return;
    (async () => {
      await generateAutoNotifications(userId);
      await refresh();
    })();
  }, [userId, refresh]);

  const onOpen = async () => {
    setOpen(o => !o);
    if (!open) await refresh();
  };

  const handleRead = async (n) => {
    if (!n.read) { await markRead(n.id); setUnread(u => Math.max(0, u - 1)); setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); }
  };

  const handleAllRead = async () => {
    await markAllRead(userId);
    setUnread(0);
    setItems(prev => prev.map(x => ({ ...x, read: true })));
  };

  const fmt = (d) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ar }); } catch { return ""; } };

  return (
    <div className="relative">
      <button onClick={onOpen} className="relative p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="الإشعارات">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-[10px] font-black text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="absolute left-0 mt-2 w-80 max-w-[90vw] z-50 glass-card rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <span className="font-black text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> الإشعارات</span>
                {unread > 0 && (
                  <button onClick={handleAllRead} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> تعليم الكل كمقروء
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto scrollbar-none">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <BellOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">لا توجد إشعارات</p>
                  </div>
                ) : (
                  items.map((n) => {
                    const Inner = (
                      <div className={`flex gap-3 px-4 py-3 border-b border-border/30 transition-colors hover:bg-secondary/40 ${!n.read ? "bg-primary/5" : ""}`}>
                        <div className="text-xl shrink-0">{n.icon || "🔔"}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${!n.read ? "font-bold" : "font-medium text-muted-foreground"}`}>{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{fmt(n.created_date)}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </div>
                    );
                    return n.link ? (
                      <Link key={n.id} to={n.link} onClick={() => { handleRead(n); setOpen(false); }}>{Inner}</Link>
                    ) : (
                      <button key={n.id} onClick={() => handleRead(n)} className="w-full text-right">{Inner}</button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}