import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5,    // 5 min — Firebase data rarely stale
      gcTime:    1000 * 60 * 15,   // 15 min garbage collection
      refetchOnMount: false,        // use cache on navigation
      refetchOnReconnect: false,    // Firebase handles offline sync
    },
    mutations: {
      retry: 0,
    },
  },
});
