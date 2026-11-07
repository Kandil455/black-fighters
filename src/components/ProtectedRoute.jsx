import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import PageLoader from '@/components/PageLoader';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoadingAuth, profile } = useAuth();
  const location = useLocation();

  // لو لسه بنشيك حالة تسجيل الدخول
  if (isLoadingAuth) {
    return <PageLoader message="جاري التحقق من تسجيل الدخول..." />;
  }

  // لو مش مسجل دخول -> رجعه للوجن مع حفظ الصفحة اللي كان رايحها
  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // لو الحساب مقفول من الأدمن
  if (profile?.is_locked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="glass-card rounded-3xl p-8 max-w-md border border-rose-500/20">
          <h2 className="text-xl font-black text-rose-400 mb-2">الحساب موقوف مؤقتاً</h2>
          <p className="text-sm text-muted-foreground">تواصل مع الإدارة لمراجعة حالة حسابك.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
