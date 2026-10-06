import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const Friends = lazyWithRetry(() => import('@/pages/Friends'));
const Groups = lazyWithRetry(() => import('@/pages/Groups'));
const Toji = lazyWithRetry(() => import('@/pages/Toji'));

export const communityRoutes = <><Route path="/friends" element={<Friends />} /><Route path="/groups" element={<Groups />} /><Route path="/toji" element={<Toji />} /></>;
