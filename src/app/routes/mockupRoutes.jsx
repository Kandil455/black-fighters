import { Route } from 'react-router-dom';
import SummaryMockupA from '@/pages/mockups/SummaryMockupA';
import SummaryMockupB from '@/pages/mockups/SummaryMockupB';
import SummaryMockupC from '@/pages/mockups/SummaryMockupC';
import UnifiedQuizMockup from '@/pages/mockups/UnifiedQuizMockup';
import AtlasPrototypes from '@/pages/AtlasPrototypes';

export const mockupRoutes = <><Route path="/mockup/a" element={<SummaryMockupA />} /><Route path="/mockup/b" element={<SummaryMockupB />} /><Route path="/mockup/c" element={<SummaryMockupC />} /><Route path="/mockup/quiz" element={<UnifiedQuizMockup />} /><Route path="/mockup/atlas" element={<AtlasPrototypes />} /></>;
