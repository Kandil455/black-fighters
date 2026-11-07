import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';
import { LECTURE_CONFIG } from '@/features/lectures/lib/config';

const PdfTools = lazyWithRetry(() => import('@/pages/PdfTools'));
const ImageExtractor = lazyWithRetry(() => import('@/pages/ImageExtractor'));
const Lectures = LECTURE_CONFIG.FEATURE_LECTURES
  ? lazyWithRetry(() => import('@/pages/Lectures'))
  : null;

/**
 * Practical-tool routes.
 *
 * The lecture transcriber is switched off with FEATURE_LECTURES. Its routes are
 * declared as data and only mounted when the flag is on, so the nav link
 * disappears with them (Layout reads the same flag). `Lectures.jsx` stays a
 * lazy import, so the page costs nothing while the feature is off.
 * Flipping FEATURE_LECTURES back to `true` restores everything.
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
    {LECTURE_CONFIG.FEATURE_LECTURES
      ? LECTURE_PATHS.map((path) => (
          <Route key={path} path={path} element={<Lectures />} />
        ))
      : null}
  </>
);
