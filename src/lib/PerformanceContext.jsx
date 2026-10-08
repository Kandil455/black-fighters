import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getDevice3DCapability, getDeviceTier, resetDeviceTierCache } from "@/lib/webglQuality";

const STORAGE_KEY = "iiiak_performance_mode";
const HEAVY_3D_KEY = "iiiak_heavy_3d";
const PerformanceContext = createContext(null);

function getSavedMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "auto";
  } catch {
    return "auto";
  }
}

/**
 * Synchronous, pre-React read for mount-time gates that must know BEFORE
 * first paint (e.g. the cinematic intro). "Skip" here means "this is
 * motion-heavy content", which is exactly what prefers-reduced-motion asks
 * us to avoid — so the OS motion preference IS consulted here, on purpose.
 * It is NOT a power/classification signal anywhere else in the app.
 */
export function isPowerSaverSync() {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || "auto";
    if (saved === "saver") return true;
    if (saved === "full") {
      // Manual Full mode overrides the intro skip too (explicit user choice).
      return false;
    }
  } catch {
    // private browsing — fall through to auto detection
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return true;
  if (navigator.connection?.saveData) return true;
  return Number(navigator.hardwareConcurrency || 8) <= 4 && Number(navigator.deviceMemory || 8) <= 4;
}

/**
 * AUTO POWER CLASSIFICATION — device/battery signals ONLY.
 *
 * History (measured bug): this used to treat prefers-reduced-motion as a
 * device-weakness signal, which silently degraded the whole app (dead
 * transitions, frozen 3D, preloader skip) for users whose OS reports
 * reduced-motion — while the rest of their machine was perfectly capable.
 * Motion preference is an accessibility concern now handled exclusively by
 * framer's reducedMotion="user" + per-component matchMedia gates.
 */
function initialAutoState() {
  if (typeof navigator === "undefined") return { saver: false, reason: "" };
  const saveData = navigator.connection?.saveData;
  const weakCpu = Number(navigator.hardwareConcurrency || 8) <= 4;
  const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
  if (saveData) return { saver: true, reason: "توفير البيانات مفعّل" };
  if (weakCpu && lowMemory) return { saver: true, reason: "إمكانيات الجهاز محدودة" };
  return { saver: false, reason: "الجهاز مناسب للوضع الكامل" };
}

/** Device capability for the heavy-3D knob (memoized probe in webglQuality). */
function getSavedHeavy3d() {
  try {
    return localStorage.getItem(HEAVY_3D_KEY) || "auto";
  } catch {
    return "auto";
  }
}

function weakDeviceFor3D() {
  try {
    return Boolean(getDevice3DCapability().weak);
  } catch {
    return false;
  }
}

export function PerformanceProvider({ children }) {
  const [mode, setModeState] = useState(getSavedMode);
  const [heavy3d, setHeavy3dState] = useState(getSavedHeavy3d);
  const [autoState, setAutoState] = useState(initialAutoState);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateSignals = () => setAutoState(initialAutoState());
    media?.addEventListener?.("change", updateSignals);
    navigator.connection?.addEventListener?.("change", updateSignals);

    let battery;
    const updateBattery = () => {
      if (battery && !battery.charging && battery.level <= 0.25) {
        setAutoState({ saver: true, reason: "البطارية أقل من 25%" });
      } else {
        updateSignals();
      }
    };
    navigator.getBattery?.().then((value) => {
      battery = value;
      battery.addEventListener("levelchange", updateBattery);
      battery.addEventListener("chargingchange", updateBattery);
      updateBattery();
    }).catch(() => {});

    return () => {
      media?.removeEventListener?.("change", updateSignals);
      navigator.connection?.removeEventListener?.("change", updateSignals);
      battery?.removeEventListener?.("levelchange", updateBattery);
      battery?.removeEventListener?.("chargingchange", updateBattery);
    };
  }, []);

  const setMode = (next) => {
    const safe = ["auto", "full", "saver"].includes(next) ? next : "auto";
    try {
      localStorage.setItem(STORAGE_KEY, safe);
    } catch {
      // Private browsing can block storage; the setting still applies now.
    }
    setModeState(safe);
  };

  const setHeavy3d = (next) => {
    const safe = ["auto", "on", "off"].includes(next) ? next : "auto";
    try {
      localStorage.setItem(HEAVY_3D_KEY, safe);
    } catch {}
    setHeavy3dState(safe);
  };

  const isPowerSaver = mode === "saver" || (mode === "auto" && autoState.saver);

  // Heavy-content knob: manual override wins, otherwise device capability.
  const heavy3dAuto = weakDeviceFor3D();
  const heavyEnabled =
    heavy3d === "on" ? true : heavy3d === "off" ? false : !heavy3dAuto;

  // One device tier for every heavy feature (blur, animation, 3D, large media).
  const [tier, setTier] = useState(() => getDeviceTier().tier);

  useEffect(() => {
    document.documentElement.dataset.performance = isPowerSaver ? "saver" : "full";
  }, [isPowerSaver]);

  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);

  // A connection change can move a device between tiers (e.g. saveData switched
  // on mid-session) — re-resolve so the CSS/feature gates follow it.
  useEffect(() => {
    const connection = navigator.connection;
    if (!connection?.addEventListener) return undefined;
    const onChange = () => {
      resetDeviceTierCache();
      setTier(getDeviceTier().tier);
    };
    connection.addEventListener("change", onChange);
    return () => connection.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(() => ({
    mode,
    setMode,
    isPowerSaver,
    tier,
    isLite: tier === "lite",
    heavy3d,
    setHeavy3d,
    heavyEnabled,
    heavy3dAuto,
    reason: mode === "auto" ? autoState.reason : mode === "saver" ? "تم اختياره يدويًا" : "الوضع الكامل مختار يدويًا",
  }), [mode, isPowerSaver, tier, heavy3d, heavyEnabled, heavy3dAuto, autoState.reason]);

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceMode() {
  const value = useContext(PerformanceContext);
  if (!value) throw new Error("usePerformanceMode must be used within PerformanceProvider");
  return value;
}
