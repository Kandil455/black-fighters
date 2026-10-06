import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const Subscriptions = lazyWithRetry(() => import('@/pages/Subscriptions'));
const Profile = lazyWithRetry(() => import('@/pages/Profile'));
const PublicProfile = lazyWithRetry(() => import('@/pages/PublicProfile'));
const Settings = lazyWithRetry(() => import('@/pages/Settings'));

export const accountRoutes = <><Route path="/subscriptions" element={<Subscriptions />} /><Route path="/profile" element={<Profile />} /><Route path="/u/:id" element={<PublicProfile />} /><Route path="/settings" element={<Settings />} /></>;
