import { useEffect, useRef } from "react";
import { toast } from "sonner";

// يسجّل Service Worker ويتحقق من التحديثات بهدوء.
// عند توفر نسخة جديدة: toast لطيف غير مزعج بزر "تحديث" (اختياري) — التطبيق يشتغل عادي بدونه.
export default function PWAUpdater() {
  const reloadedRef = useRef(false);
  const reloadRequestedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith("iiiak-")).map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    let refreshing = false;
    let intervalId;
    const handleControllerChange = () => {
      // A newly installed worker may claim the page while the user is typing or
      // authenticating. Reload only after the user explicitly accepts an update.
      if (!reloadRequestedRef.current || refreshing || reloadedRef.current) return;
      refreshing = true;
      reloadedRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");

        // فحص دوري للتحديثات كل 30 دقيقة (بهدوء)
        intervalId = window.setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            // فيه نسخة جديدة جاهزة + المستخدم شغّال على نسخة قديمة
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              toast("في تحديث جديد للتطبيق ✨", {
                description: "اضغط تحديث عشان تجرب أحدث نسخة",
                duration: 10000,
                action: {
                  label: "تحديث",
                  onClick: () => {
                    reloadRequestedRef.current = true;
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                  },
                },
              });
            }
          });
        });
      } catch {
        /* تجاهل بصمت */
      }
    };

    register();
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
