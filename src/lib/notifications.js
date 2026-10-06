const loadBase44 = () => import("@/api/base44Client").then((m) => m.base44);

// مفتاح اليوم لمنع تكرار نفس الإشعار في نفس اليوم
const todayKey = () => new Date().toISOString().slice(0, 10);

// إنشاء إشعار مع منع التكرار عبر dedupe_key
export async function pushNotification(userId, { type = "system", title, body, icon, link, dedupe }) {
  if (!userId || !title) return;
  try {
    const base44 = await loadBase44();
    if (dedupe) {
      const existing = await base44.entities.Notification.filter({ user_id: userId, dedupe_key: dedupe }, "-created_date", 1);
      if (existing?.length) return;
    }
    await base44.entities.Notification.create({
      user_id: userId, type, title, body, icon, link,
      read: false, dedupe_key: dedupe || `${type}-${Date.now()}`,
    });
  } catch { /* صامت */ }
}

// عدد غير المقروء
export async function getUnreadCount(userId) {
  try {
    const base44 = await loadBase44();
    const list = await base44.entities.Notification.filter({ user_id: userId, read: false }, "-created_date", 50);
    return list.length;
  } catch { return 0; }
}

// جلب الإشعارات
export async function listNotifications(userId, limit = 30) {
  try {
    const base44 = await loadBase44();
    return await base44.entities.Notification.filter({ user_id: userId }, "-created_date", limit);
  } catch { return []; }
}

// تعليم كمقروء
export async function markRead(id) {
  try {
    const base44 = await loadBase44();
    await base44.entities.Notification.update(id, { read: true });
  } catch {}
}

export async function markAllRead(userId) {
  try {
    const base44 = await loadBase44();
    const unread = await base44.entities.Notification.filter({ user_id: userId, read: false }, "-created_date", 50);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
  } catch {}
}

// توليد إشعارات تلقائية: بطاقات المراجعة المستحقة اليوم + تحديات
export async function generateAutoNotifications(userId) {
  if (!userId) return;
  const t = todayKey();
  try {
    const base44 = await loadBase44();
    // 1) بطاقات المراجعة المستحقة
    const cards = await base44.entities.ReviewCard.filter({ created_by_id: userId }, "-due_date", 200);
    const dueCount = cards.filter(c => {
      const due = (c.due_date || "").slice(0, 10);
      return due && due <= t;
    }).length;
    if (dueCount > 0) {
      await pushNotification(userId, {
        type: "review",
        title: `عندك ${dueCount} بطاقة للمراجعة النهاردة 🧠`,
        body: "راجعها دلوقتي عشان تثبّت المعلومة وتكسب XP",
        icon: "🧠",
        link: "/review",
        dedupe: `review-${t}`,
      });
    }
  } catch {}
}
