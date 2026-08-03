/**
 * useSupplierAccount — react-query hooks for supplier AP read models.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { supplierAccountService } from '../../services/suppliers/supplierAccountService';
import type {
  SupplierAgingRow,
  SupplierOpenPayable,
  SupplierPayment,
  SupplierStatementRow,
} from '../../types';

export function useSupplierBalance(supplierId: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.account.balance(supplierId),
    queryFn: () => supplierAccountService.getBalance(supplierId),
    enabled: !!supplierId,
    staleTime: 30 * 1000,
  });
}

export function useSupplierStatement(supplierId: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.account.statement(supplierId, dateFrom, dateTo),
    queryFn: () => supplierAccountService.getStatement(supplierId, dateFrom, dateTo) as Promise<SupplierStatementRow[]>,
    enabled: !!supplierId,
    staleTime: 30 * 1000,
  });
}

export function useSupplierAging(branchId: string, asOfDate?: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.account.aging(branchId, asOfDate),
    queryFn: () => supplierAccountService.getAging(branchId, asOfDate) as Promise<SupplierAgingRow[]>,
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
}

export function useSupplierOpenPayables(supplierId: string, branchId: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.account.openPayables(supplierId, branchId),
    queryFn: () => supplierAccountService.getOpenPayables(supplierId, branchId) as Promise<SupplierOpenPayable[]>,
    enabled: !!supplierId && !!branchId,
    staleTime: 30 * 1000,
  });
}

export function useSupplierPaymentsList(options: { supplierId?: string; branchId: string }) {
  return useQuery({
    queryKey: queryKeys.suppliers.account.payments(options.supplierId || 'all', options.branchId),
    queryFn: () =>
      supplierAccountService.getPayments({
        supplierId: options.supplierId,
        branchId: options.branchId,
      }) as Promise<SupplierPayment[]>,
    enabled: !!options.branchId,
    staleTime: 30 * 1000,
  });
}
