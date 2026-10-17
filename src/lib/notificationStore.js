import { base44 } from "@/api/base44Client";

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

export async function getNotificationsCached(userId, limit = 30) {
  if (!userId) return [];
  const key = `${userId}:${limit}`;
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) {
    return entry.items;
  }
  try {
    const items = await base44.entities.Notification.filter(
      { user_id: userId },
      "-created_date",
      limit
    );
    cache.set(key, { at: Date.now(), items: items || [] });
    return items || [];
  } catch {
    return [];
  }
}

export function invalidateNotificationsCache(userId) {
  if (!userId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      cache.delete(key);
    }
  }
}
