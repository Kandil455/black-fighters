import { useEffect } from "react";
import { toast } from "sonner";
import { flushOfflineActions } from "@/lib/offlineDb";

export default function OfflineManager() {
  useEffect(() => {
    const sync = async () => {
      document.documentElement.dataset.network = "online";
      const synced = await flushOfflineActions(async (item) => {
        if (item.kind === "xp") {
          const { base44 } = await import("@/api/base44Client");
          await base44.functions.invoke("awardProgress", item.payload);
        } else if (item.kind === "study") {
          const { recordStudy } = await import("@/lib/gamification");
          await recordStudy(item.payload, { skipOfflineQueue: true });
        }
      }).catch(() => 0);
      if (synced) toast.success(`تمت مزامنة ${synced} عملية مذاكرة`);
    };
    const offline = () => {
      document.documentElement.dataset.network = "offline";
      toast("أنت بدون إنترنت", { description: "الكورسات المحفوظة والبطاقات ما زالت متاحة" });
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", offline);
    if (navigator.onLine) sync(); else offline();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", offline);
    };
  }, []);
  return null;
}
