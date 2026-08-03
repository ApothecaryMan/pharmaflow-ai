/**
 * useSupplierAccountMutations — mutations for supplier AP actions.
 * Invalidates the relevant supplier-account and purchases caches on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { supplierAccountService } from '../../services/suppliers/supplierAccountService';
import { useAuthStore } from '../../stores/authStore';
import type { RecordSupplierPaymentInput, SupplierPaymentMethod } from '../../types';

function usePerformer() {
  const employee = useAuthStore((s) => s.currentEmployee);
  return {
    performedBy: employee?.id,
    performedByName: employee?.name,
  };
}

export interface RecordSupplierPaymentVars {
  supplierId: string;
  amount: number;
  date: string;
  paymentMethod: SupplierPaymentMethod;
  reference?: string;
  notes?: string;
  allocations?: { purchaseId: string; amount: number }[];
}

export function useRecordSupplierPayment() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const { performedBy, performedByName } = usePerformer();

  return useMutation({
    mutationFn: (vars: RecordSupplierPaymentVars) =>
      supplierAccountService.recordPayment({
        ...vars,
        branchId,
        performedBy,
        performedByName,
      } as RecordSupplierPaymentInput),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.all(branchId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.account.payments(vars.supplierId, branchId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.account.balance(vars.supplierId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.account.openPayables(vars.supplierId, branchId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.account.aging(branchId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all(branchId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.cashTransactions });
    },
  });
}

export function useVoidSupplierPayment() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const { performedBy, performedByName } = usePerformer();

  return useMutation({
    mutationFn: (vars: { paymentId: string; supplierId?: string; reason?: string }) =>
      supplierAccountService.voidPayment({
        paymentId: vars.paymentId,
        reason: vars.reason,
        branchId,
        performedBy,
        performedByName,
      }),
    onSuccess: (_data, vars) => {
      if (vars.supplierId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.payments(vars.supplierId, branchId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.balance(vars.supplierId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.openPayables(vars.supplierId, branchId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.account.aging(branchId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all(branchId) });
    },
  });
}

export function useReverseSupplierPurchase() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const { performedBy, performedByName } = usePerformer();

  return useMutation({
    mutationFn: (vars: { purchaseId: string; supplierId?: string; reason?: string }) =>
      supplierAccountService.reversePurchase({
        purchaseId: vars.purchaseId,
        reason: vars.reason,
        branchId,
        performedBy,
        performedByName,
      }),
    onSuccess: (_data, vars) => {
      if (vars.supplierId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.balance(vars.supplierId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.openPayables(vars.supplierId, branchId),
        });
        void queryClient.invalidateQueries({
          queryKey: ['suppliers', 'account', 'statement', vars.supplierId],
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.payments(vars.supplierId, branchId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.account.aging(branchId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all(branchId) });
    },
  });
}

export function useReverseSupplierPurchaseReturn() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const { performedBy, performedByName } = usePerformer();

  return useMutation({
    mutationFn: (vars: { returnId: string; supplierId?: string; reason?: string }) =>
      supplierAccountService.reversePurchaseReturn({
        returnId: vars.returnId,
        reason: vars.reason,
        branchId,
        performedBy,
        performedByName,
      }),
    onSuccess: (_data, vars) => {
      if (vars.supplierId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.balance(vars.supplierId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.openPayables(vars.supplierId, branchId),
        });
        void queryClient.invalidateQueries({
          queryKey: ['suppliers', 'account', 'statement', vars.supplierId],
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.account.payments(vars.supplierId, branchId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.account.aging(branchId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all(branchId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.returns.purchases(branchId) });
    },
  });
}
