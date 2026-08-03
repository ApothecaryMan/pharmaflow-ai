/**
 * Supplier Account Service — AP orchestration for supplier payables.
 *
 * Wraps the supplier-account RPCs behind a typed API and resolves the
 * active branch / current shift so callers (hooks/pages) stay thin.
 */

import { cashService } from '../cash/cashService';
import { settingsService } from '../settings/settingsService';
import { supplierAccountRepository } from './repositories/supplierAccountRepository';
import type {
  RecordSupplierPaymentInput,
  SupplierAgingRow,
  SupplierOpenPayable,
  SupplierPayment,
  SupplierStatementRow,
} from '../../types';

export interface SupplierAccountContext {
  branchId: string;
  orgId?: string;
  performedBy?: string;
  performedByName?: string;
}

class SupplierAccountService {
  private async resolveContext(input?: {
    branchId?: string;
    orgId?: string;
  }): Promise<SupplierAccountContext> {
    const settings = await settingsService.getAll();
    return {
      branchId: input?.branchId || settings.activeBranchId || settings.branchCode || '',
      orgId: input?.orgId || settings.orgId,
    };
  }

  async getBalance(supplierId: string): Promise<number> {
    return supplierAccountRepository.getBalance(supplierId);
  }

  async getStatement(
    supplierId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SupplierStatementRow[]> {
    return supplierAccountRepository.getStatement(supplierId, dateFrom, dateTo);
  }

  async getAging(branchId?: string, asOfDate?: string): Promise<SupplierAgingRow[]> {
    const ctx = await this.resolveContext({ branchId });
    if (!ctx.branchId) throw new Error('A valid branch is required to load aging report');
    return supplierAccountRepository.getAging(ctx.branchId, asOfDate);
  }

  async getOpenPayables(supplierId: string, branchId?: string): Promise<SupplierOpenPayable[]> {
    const ctx = await this.resolveContext({ branchId });
    if (!ctx.branchId) throw new Error('A valid branch is required to load open payables');
    return supplierAccountRepository.getOpenPayables(supplierId, ctx.branchId);
  }

  async getPayments(options: {
    supplierId?: string;
    branchId?: string;
    includeVoided?: boolean;
  }): Promise<SupplierPayment[]> {
    const ctx = await this.resolveContext({ branchId: options.branchId });
    return supplierAccountRepository.getPayments({
      supplierId: options.supplierId,
      branchId: options.branchId || ctx.branchId || undefined,
      includeVoided: options.includeVoided,
    });
  }

  async getPaymentById(id: string): Promise<SupplierPayment | null> {
    return supplierAccountRepository.getPaymentById(id);
  }

  /**
   * Record a standalone (non-receipt) supplier payment.
   * For cash, resolves the current open shift automatically.
   */
  async recordPayment(input: RecordSupplierPaymentInput): Promise<{
    paymentId?: string;
    serialId?: string;
    success?: boolean;
  }> {
    const ctx = await this.resolveContext({ branchId: input.branchId, orgId: input.orgId });
    if (!ctx.branchId) throw new Error('A valid branch is required to record a payment');

    let shiftId = input.shiftId;
    if (input.paymentMethod === 'cash' && !shiftId) {
      const shift = await cashService.getCurrentShift(ctx.branchId);
      if (shift) shiftId = shift.id;
    }

    return supplierAccountRepository.recordPayment({
      ...input,
      branchId: ctx.branchId,
      orgId: input.orgId || ctx.orgId,
      shiftId,
      performedBy: input.performedBy || ctx.performedBy,
      performedByName: input.performedByName || ctx.performedByName,
    });
  }

  async voidPayment(params: {
    paymentId: string;
    reason?: string;
    branchId?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<{ success?: boolean }> {
    const ctx = await this.resolveContext({ branchId: params.branchId });
    let shiftId: string | undefined;
    if (ctx.branchId) {
      const shift = await cashService.getCurrentShift(ctx.branchId);
      if (shift) shiftId = shift.id;
    }
    return supplierAccountRepository.voidPayment({
      paymentId: params.paymentId,
      reason: params.reason,
      shiftId,
      performedBy: params.performedBy || ctx.performedBy,
      performedByName: params.performedByName || ctx.performedByName,
    });
  }

  async reversePurchase(params: {
    purchaseId: string;
    reason?: string;
    branchId?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<{ success?: boolean }> {
    const ctx = await this.resolveContext({ branchId: params.branchId });
    let shiftId: string | undefined;
    if (ctx.branchId) {
      const shift = await cashService.getCurrentShift(ctx.branchId);
      if (shift) shiftId = shift.id;
    }
    return supplierAccountRepository.reversePurchase({
      purchaseId: params.purchaseId,
      reason: params.reason,
      shiftId,
      performedBy: params.performedBy || ctx.performedBy,
      performedByName: params.performedByName || ctx.performedByName,
    });
  }

  async reversePurchaseReturn(params: {
    returnId: string;
    reason?: string;
    branchId?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<{ success?: boolean }> {
    const ctx = await this.resolveContext({ branchId: params.branchId });
    let shiftId: string | undefined;
    if (ctx.branchId) {
      const shift = await cashService.getCurrentShift(ctx.branchId);
      if (shift) shiftId = shift.id;
    }
    return supplierAccountRepository.reversePurchaseReturn({
      returnId: params.returnId,
      reason: params.reason,
      shiftId,
      performedBy: params.performedBy || ctx.performedBy,
      performedByName: params.performedByName || ctx.performedByName,
    });
  }
}

export const supplierAccountService = new SupplierAccountService();
