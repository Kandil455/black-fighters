import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import PageLoader from "@/components/PageLoader";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoadingAuth, profile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale !== "ar";
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <PageLoader
        message={
          isEn ? "Verifying session..." : "جاري التحقق من تسجيل الدخول..."
        }
      />
    );
  }

  if (!isAuthenticated || !profile) {
    const fullTarget = `${location.pathname}${location.search || ""}`;
    try {
      sessionStorage.setItem("bf_post_auth_redirect", fullTarget);
    } catch {}
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(fullTarget)}`}
        state={{ from: fullTarget }}
        replace
      />
    );
  }

  if (profile?.is_locked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="glass-card rounded-3xl p-8 max-w-md border border-rose-500/20">
          <h2 className="text-xl font-black text-rose-400 mb-2">
            {isEn
              ? "Account Temporarily Suspended"
              : "الحساب موقوف مؤقتاً"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "Please contact support to review your account status."
              : "تواصل مع الإدارة لمراجعة حالة حسابك."}
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
