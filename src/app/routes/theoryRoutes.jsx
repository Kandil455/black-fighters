import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
const CreateCourse = lazyWithRetry(() => import('@/pages/CreateCourse'));
const YouTubeAIStudio = lazyWithRetry(() => import('@/pages/YouTubeAIStudio'));
const CourseView = lazyWithRetry(() => import('@/pages/CourseView'));
const Review = lazyWithRetry(() => import('@/pages/Review'));
const StudyPlanner = lazyWithRetry(() => import('@/pages/StudyPlanner'));

export const theoryRoutes = <><Route path="/dashboard" element={<Dashboard />} /><Route path="/planner" element={<StudyPlanner />} /><Route path="/create" element={<CreateCourse />} /><Route path="/youtube-ai" element={<YouTubeAIStudio />} /><Route path="/course/:id" element={<CourseView />} /><Route path="/review" element={<Review />} /></>;
