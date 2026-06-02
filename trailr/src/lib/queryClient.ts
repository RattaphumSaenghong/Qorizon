import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client.
 *
 * Config choices:
 * - staleTime 0: individual hooks set their own stale times
 * - retry 2: retry failed requests twice before showing error
 * - refetchOnWindowFocus false: avoids surprise re-fetches on tab switch in web preview
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
