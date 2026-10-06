import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import { BadgeProvider } from '@/lib/BadgeContext';
import { LocaleProvider } from '@/lib/LocaleContext';
import { PerformanceProvider } from '@/lib/PerformanceContext';
import { StudyThemeProvider } from '@/lib/StudyThemeContext';
import { queryClientInstance } from '@/lib/query-client';
import SmoothScroll from '@/components/ui/SmoothScroll';

export default function AppProviders({ children }) {
  return <PerformanceProvider><LocaleProvider><AuthProvider><StudyThemeProvider><QueryClientProvider client={queryClientInstance}><BadgeProvider><SmoothScroll>{children}</SmoothScroll></BadgeProvider></QueryClientProvider></StudyThemeProvider></AuthProvider></LocaleProvider></PerformanceProvider>;
}
