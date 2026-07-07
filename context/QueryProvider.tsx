import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryPersister } from '../lib/queryCache';

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
};

function createQueryClient() {
  return new QueryClient({
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
}

const queryClient = createQueryClient();

export { queryClient };

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 24 * 60 * 60 * 1000,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
