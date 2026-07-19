import { QueryClient } from '@tanstack/react-query';

export const STALE_TIMES = {
  inventory: 5 * 60 * 1000,
  todaySales: 2 * 60 * 1000,
  sales: 5 * 60 * 1000,
  purchases: 5 * 60 * 1000,
  employees: 60 * 60 * 1000,
  customers: 30 * 60 * 1000,
  branches: 60 * 60 * 1000,
  suppliers: 30 * 60 * 1000,
  batches: 5 * 60 * 1000,
  returns: 5 * 60 * 1000,
  org: 60 * 60 * 1000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.inventory,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 2,
    },
  },
});
