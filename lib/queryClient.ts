import { QueryClient } from '@tanstack/react-query';

export const STALE_TIMES = {
  inventory: 5 * 60 * 1000,
  sales: 2 * 60 * 1000,
  purchases: 2 * 60 * 1000,
  employees: 30 * 60 * 1000,
  customers: 10 * 60 * 1000,
  branches: 30 * 60 * 1000,
  suppliers: 10 * 60 * 1000,
  batches: 5 * 60 * 1000,
  returns: 5 * 60 * 1000,
  org: 60 * 60 * 1000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.inventory,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});
