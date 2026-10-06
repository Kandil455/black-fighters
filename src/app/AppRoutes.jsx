import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageLoader from '@/components/PageLoader';
import { publicRoutes } from '@/app/routes/publicRoutes';
import { theoryRoutes } from '@/app/routes/theoryRoutes';
import { practicalRoutes } from '@/app/routes/practicalRoutes';
import { assessmentRoutes } from '@/app/routes/assessmentRoutes';
import { communityRoutes } from '@/app/routes/communityRoutes';
import { accountRoutes } from '@/app/routes/accountRoutes';
import { systemRoutes } from '@/app/routes/systemRoutes';
import { mockupRoutes } from '@/app/routes/mockupRoutes';

export default function AppRoutes() {
  return <Suspense fallback={<PageLoader />}><Routes>{mockupRoutes}{publicRoutes}<Route element={<ProtectedRoute />}><Route element={<Layout />}>{theoryRoutes}{practicalRoutes}{assessmentRoutes}{communityRoutes}{accountRoutes}{systemRoutes}</Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>;
}
