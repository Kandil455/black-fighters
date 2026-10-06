import { Route } from 'react-router-dom';
import { lazyWithRetry } from '@/app/lazyWithRetry';

const PdfTools = lazyWithRetry(() => import('@/pages/PdfTools'));
const ImageExtractor = lazyWithRetry(() => import('@/pages/ImageExtractor'));

export const practicalRoutes = <><Route path="/tools" element={<PdfTools />} /><Route path="/practical" element={<ImageExtractor />} /></>;
