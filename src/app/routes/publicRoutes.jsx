import React from 'react';
import { Navigate, Outlet, Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';
import { useAuth } from '@/lib/AuthContext';
import Layout from '@/components/Layout';

const Landing = lazyWithRetry(() => import('@/pages/Landing'));
const Login = lazyWithRetry(() => import('@/pages/Login'));
const Register = lazyWithRetry(() => import('@/pages/Register'));
const ForgotPassword = lazyWithRetry(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'));
const SharedQuiz = lazyWithRetry(() => import('@/pages/SharedQuiz'));
const ChallengeNew = lazyWithRetry(() => import('@/pages/ChallengeNew'));
const ChallengeRoom = lazyWithRetry(() => import('@/pages/ChallengeRoom'));
const TelegramMiniApp = lazyWithRetry(() => import('@/pages/TelegramMiniApp'));
const AtlasPrototypes = lazyWithRetry(() => import('@/pages/AtlasPrototypes'));
const HelpCenter = lazyWithRetry(() => import('@/pages/HelpCenter'));

function HybridLayoutRoute() {
  const { isAuthenticated, profile } = useAuth();
  const isInsideTelegramWebView =
    typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
  if (isAuthenticated && profile && !profile.is_locked && !isInsideTelegramWebView) {
    return <Layout />;
  }
  return <Outlet />;
}

export const publicRoutes = (
  <>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/q/:id" element={<SharedQuiz />} />
    <Route path="/challenge/new/:quizId" element={<ChallengeNew />} />
    <Route path="/challenge/:id" element={<ChallengeRoom />} />
    <Route element={<HybridLayoutRoute />}>
      <Route path="/tg" element={<TelegramMiniApp />} />
      <Route path="/tg/*" element={<TelegramMiniApp />} />
      <Route path="/atlas" element={<AtlasPrototypes />} />
      <Route path="/help" element={<HelpCenter />} />
    </Route>
    <Route path="/youtube-studio" element={<Navigate to="/youtube-ai" replace />} />
    <Route path="/image-extractor" element={<Navigate to="/practical" replace />} />
  </>
);
