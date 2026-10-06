import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const Admin = lazyWithRetry(() => import('@/pages/Admin'));
const EmergencyHub = lazyWithRetry(() => import('@/pages/EmergencyHub'));

export const systemRoutes = <><Route path="/emergency" element={<EmergencyHub />} /><Route path="/admin" element={<Admin />} /></>;
