import React from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { useLocale } from "@/lib/LocaleContext";
import { pushNotification } from "@/lib/notifications";

export default function FriendRequests({ requests, onChange }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const accept = async (r) => {
    await base44.entities.Friendship.update(r.id, { status: "accepted" });
    if (r.requester_id) {
      await pushNotification(r.requester_id, {
        type: "social",
        title: "تم قبول طلب الصداقة 🎉",
        body: `قبل ${r.addressee_name || "صديقك"} طلب صداقتك الآن`,
        icon: "user-check",
        link: "/friends",
      }).catch(() => {});
    }
    toast.success(isEn ? `You and ${r.requester_name} are now friends 🎉` : `بقيت صاحب ${r.requester_name} 🎉`);
    onChange?.();
  };

  const reject = async (r) => {
    await base44.entities.Friendship.delete(r.id);
    onChange?.();
  };

  if (!requests?.length) return null;

  return (
    <div className="card" style={{ gap: 0 }} dir={dir}>
      <div className="pb-3 border-b border-[var(--line)]">
        <span className="mono">
          {isEn ? `Friend Requests (${requests.length})` : `طلبات الصداقة (${requests.length})`}
        </span>
      </div>
      <div>
        {requests.map((r) => (
          <div key={r.id} className="row px-2">
            <AnimatedAvatar animate={false} src={r.requester_avatar} size={38} fallback="🎓" />
            <span className="grow">
              <b className="text-sm block">{r.requester_name}</b>
              <small className="mono text-[0.7rem]">{isEn ? "Wants to connect" : "طلب صداقة"}</small>
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => accept(r)} className="btn sm">
                {isEn ? "Accept" : "اقبل"}
              </button>
              <button onClick={() => reject(r)} className="btn sm line">
                {isEn ? "Decline" : "ارفض"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}