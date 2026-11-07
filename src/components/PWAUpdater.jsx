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
    const AUTO_KEY = "bf_sw_auto_reloaded";

    const activateNewWorker = (worker, { silent = false } = {}) => {
      if (!worker) return;
      // Auto-apply at startup, once per tab-session: users keep stale bundles
      // for weeks otherwise ("تحديث" toast expires, fixes never reach them).
      if (silent) {
        if (sessionStorage.getItem(AUTO_KEY)) return;
        sessionStorage.setItem(AUTO_KEY, "1");
      }
      reloadRequestedRef.current = true;
      worker.postMessage({ type: "SKIP_WAITING" });
    };

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

        // If a newer worker is already queued, activate it silently at boot.
        if (reg.waiting && navigator.serviceWorker.controller) {
          activateNewWorker(reg.waiting, { silent: true });
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            // فيه نسخة جديدة جاهزة + المستخدم شغّال على نسخة قديمة
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              activateNewWorker(newWorker, { silent: true });
              toast("تم تحديث التطبيق تلقائيًا ✨", { duration: 6000 });
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
