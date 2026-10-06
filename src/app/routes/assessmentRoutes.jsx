import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const Quizzes = lazyWithRetry(() => import('@/pages/Quizzes'));
const Leaderboard = lazyWithRetry(() => import('@/pages/Leaderboard'));
const Stats = lazyWithRetry(() => import('@/pages/Stats'));

export const assessmentRoutes = <><Route path="/quizzes" element={<Quizzes />} /><Route path="/leaderboard" element={<Leaderboard />} /><Route path="/stats" element={<Stats />} /></>;
