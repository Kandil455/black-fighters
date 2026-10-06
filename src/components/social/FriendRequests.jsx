import React from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, UserCheck } from "lucide-react";
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
    <div className="glass-card rounded-2xl p-5 border border-border/50" dir={dir}>
      <div className="flex items-center gap-2 mb-3 text-[hsl(152,100%,50%)]">
        <UserCheck className="w-5 h-5" />
        <span className="font-bold text-sm">
          {isEn ? `Friend Requests (${requests.length})` : `طلبات الصداقة (${requests.length})`}
        </span>
      </div>
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-3 bg-secondary/40 rounded-xl p-2.5">
            <AnimatedAvatar animate={false} src={r.requester_avatar} size={40} fallback="🎓" />
            <span className="flex-1 font-bold text-sm truncate">{r.requester_name}</span>
            <button onClick={() => accept(r)} className="w-9 h-9 rounded-lg bg-[hsl(152,100%,50%)]/15 hover:bg-[hsl(152,100%,50%)]/25 flex items-center justify-center">
              <Check className="w-4 h-4 text-[hsl(152,100%,50%)]" />
            </button>
            <button onClick={() => reject(r)} className="w-9 h-9 rounded-lg bg-destructive/15 hover:bg-destructive/25 flex items-center justify-center">
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}