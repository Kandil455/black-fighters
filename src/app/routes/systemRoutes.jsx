import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const Admin = lazyWithRetry(() => import('@/pages/Admin'));

export const systemRoutes = <><Route path="/admin" element={<Admin />} /></>;
