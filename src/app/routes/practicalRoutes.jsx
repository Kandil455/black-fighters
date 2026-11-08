import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const PdfTools = lazyWithRetry(() => import('@/pages/PdfTools'));
const ImageExtractor = lazyWithRetry(() => import('@/pages/ImageExtractor'));
const Lectures = lazyWithRetry(() => import('@/pages/Lectures'));

/**
 * Practical-tool routes.
 * Audio lecture transcriber (/lectures) is always mounted.
 */
const LECTURE_PATHS = [
  '/lectures',
  '/lectures/new',
  '/lectures/:id',
  '/lectures/:id/print',
];

export const practicalRoutes = (
  <>
    <Route path="/tools" element={<PdfTools />} />
    <Route path="/practical" element={<ImageExtractor />} />
    {LECTURE_PATHS.map((path) => (
      <Route key={path} path={path} element={<Lectures />} />
    ))}
  </>
);
