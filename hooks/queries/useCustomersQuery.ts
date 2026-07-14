import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../lib/queryKeys';
import { customerService } from '../../services/customers';
import type { Customer, Sale } from '../../types';
import { useRecentSales } from './useSalesQuery';

export function useRawCustomers(branchId: string) {
  return useQuery({
    queryKey: queryKeys.customers.all(branchId),
    queryFn: () => customerService.getAll(branchId) as Promise<Customer[]>,
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCustomers(branchId: string) {
  const {
    data: rawCustomers = [],
    isLoading: isCustLoading,
    error: custError,
    refetch: refetchCust,
  } = useRawCustomers(branchId);
  const {
    data: sales = [],
    isLoading: isSalesLoading,
    error: salesError,
    refetch: refetchSales,
  } = useRecentSales(branchId);

  const enrichedCustomers = useMemo(() => {
    return rawCustomers.map((customer: Customer) => {
      const customerSales = sales.filter(
        (s: Sale) => s.customerCode === customer.code && s.branchId === customer.branchId
      );
      const totalPurchases = customerSales.reduce((sum: number, s: Sale) => sum + s.total, 0);
      const lastVisit =
        customerSales.length > 0
          ? Math.max(...customerSales.map((s: Sale) => new Date(s.date).getTime()))
          : null;

      return {
        ...customer,
        totalPurchases,
        lastVisit: lastVisit ? new Date(lastVisit).toISOString() : null,
        visitCount: customerSales.length,
      };
    });
  }, [rawCustomers, sales]);

  return {
    data: enrichedCustomers,
    isLoading: isCustLoading || isSalesLoading,
    error: custError || salesError,
    refetch: () => {
      refetchCust();
      refetchSales();
    },
  };
}
