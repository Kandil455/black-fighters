import { base44 } from "@/api/base44Client";

// توليد Friend ID فريد قصير
export function genFriendId() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BF-${part()}-${part()}`;
}

// التأكد من وجود friend_id للمستخدم وإنشاؤه لو مش موجود
export async function ensureFriendId(user) {
  if (user?.friend_id) return user.friend_id;
  const fid = genFriendId();
  await base44.auth.updateMe({ friend_id: fid });
  return fid;
}

// مفتاح المحادثة بين طرفين (مرتب عشان يبقى ثابت من الجهتين)
export function threadKey(a, b) {
  return [a, b].sort().join("__");
}

// مفتاح محادثة المساعد الشخصي
export function aiThreadKey(userId) {
  return `ai__${userId}`;
}