/**
 * Supplier Account Repository — data access for supplier AP/ledger features.
 * Wraps the supplier_account_queries / reversal / payment RPCs and provides
 * client-side open-payable computation for the allocation UI.
 */

import { supabase } from '../../../lib/supabase';
import type {
  RecordSupplierPaymentInput,
  SupplierAgingRow,
  SupplierOpenPayable,
  SupplierPayment,
  SupplierPaymentAllocation,
  SupplierStatementRow,
} from '../../../types';

const toNum = (v: unknown): number => Number(v ?? 0);

export const supplierAccountRepository = {
  async getBalance(supplierId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_supplier_balance', {
      p_supplier_id: supplierId,
    });
    if (error) throw error;
    return toNum(data);
  },

  async getStatement(
    supplierId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SupplierStatementRow[]> {
    const { data, error } = await supabase.rpc('get_supplier_statement', {
      p_supplier_id: supplierId,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });
    if (error) throw error;
    return ((data as Record<string, unknown>[]) || []).map((row, index) => ({
      id: `${row.entry_date || ''}-${row.source_id || ''}-${index}`,
      entryDate: String(row.entry_date || ''),
      entryType: String(row.entry_type || ''),
      sourceTable: String(row.source_table || ''),
      sourceId: String(row.source_id || ''),
      debit: toNum(row.debit),
      credit: toNum(row.credit),
      runningBalance: toNum(row.running_balance),
    }));
  },

  async getAging(branchId: string, asOfDate?: string): Promise<SupplierAgingRow[]> {
    const { data, error } = await supabase.rpc('get_supplier_aging', {
      p_branch_id: branchId,
      p_as_of_date: asOfDate || null,
    });
    if (error) throw error;
    return ((data as Record<string, unknown>[]) || []).map((row) => ({
      id: String(row.supplier_id || ''),
      supplierId: String(row.supplier_id || ''),
      supplierName: String(row.supplier_name || ''),
      currentAmount: toNum(row.current_amount),
      due1To30: toNum(row.due_1_30),
      due31To60: toNum(row.due_31_60),
      due61To90: toNum(row.due_61_90),
      dueOver90: toNum(row.due_over_90),
      totalOpen: toNum(row.total_open),
    }));
  },

  /**
   * Open payables for one supplier — computed client-side mirroring
   * fn_purchase_open_amount so the allocation panel can show invoices.
   */
  async getOpenPayables(supplierId: string, branchId: string): Promise<SupplierOpenPayable[]> {
    const [purchasesRes, allocRes, returnsRes] = await Promise.all([
      supabase
        .from('purchases')
        .select('id, invoice_id, date, due_date, total_cost')
        .eq('supplier_id', supplierId)
        .eq('branch_id', branchId)
        .in('status', ['received', 'completed'])
        .order('date', { ascending: true }),
      supabase
        .from('supplier_payment_allocations')
        .select('purchase_id, amount, supplier_payments(voided_at)'),
      supabase
        .from('purchase_returns')
        .select('purchase_id, total_refund')
        .eq('payment_method', 'credit')
        .neq('status', 'rejected'),
    ]);

    if (purchasesRes.error) throw purchasesRes.error;
    if (allocRes.error) throw allocRes.error;
    if (returnsRes.error) throw returnsRes.error;

    const paidByPurchase = new Map<string, number>();
    const allocations = allocRes.data as {
      purchase_id: string;
      amount: number;
      supplier_payments?: { voided_at?: string | null } | { voided_at?: string | null }[] | null;
    }[];
    for (const alloc of allocations || []) {
      const payment = Array.isArray(alloc?.supplier_payments)
        ? alloc.supplier_payments[0]
        : alloc?.supplier_payments;
      if (alloc?.purchase_id && !payment?.voided_at) {
        paidByPurchase.set(alloc.purchase_id, (paidByPurchase.get(alloc.purchase_id) || 0) + toNum(alloc.amount));
      }
    }

    const creditByPurchase = new Map<string, number>();
    const creditReturns = returnsRes.data as { purchase_id: string; total_refund: number }[];
    for (const ret of creditReturns || []) {
      if (ret?.purchase_id) {
        creditByPurchase.set(ret.purchase_id, (creditByPurchase.get(ret.purchase_id) || 0) + toNum(ret.total_refund));
      }
    }

    const openPayables: SupplierOpenPayable[] = [];
    const purchases = purchasesRes.data as {
      id: string;
      invoice_id?: string;
      date: string;
      due_date?: string;
      total_cost: number;
    }[];
    for (const p of purchases || []) {
      const open = Math.max(
        toNum(p.total_cost) - (paidByPurchase.get(p.id) || 0) - (creditByPurchase.get(p.id) || 0),
        0
      );
      if (open <= 0.005) continue;
      openPayables.push({
        id: p.id,
        purchaseId: p.id,
        invoiceId: p.invoice_id || undefined,
        date: p.date,
        dueDate: p.due_date || undefined,
        totalCost: toNum(p.total_cost),
        openAmount: open,
      });
    }

    openPayables.sort((a, b) => {
      const aDue = a.dueDate || a.date;
      const bDue = b.dueDate || b.date;
      return aDue.localeCompare(bDue) || a.date.localeCompare(b.date);
    });
    return openPayables;
  },

  async getPayments(options: {
    supplierId?: string;
    branchId?: string;
    includeVoided?: boolean;
  }): Promise<SupplierPayment[]> {
    let query = supabase
      .from('supplier_payments')
      .select('*, suppliers(name), supplier_payment_allocations(purchase_id, amount)');

    if (options.supplierId) query = query.eq('supplier_id', options.supplierId);
    if (options.branchId) query = query.eq('branch_id', options.branchId);
    if (!options.includeVoided) query = query.is('voided_at', null);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return ((data as Record<string, any>[]) || []).map((row) => this.mapPaymentFromDb(row));
  },

  async getPaymentById(id: string): Promise<SupplierPayment | null> {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*, suppliers(name), supplier_payment_allocations(purchase_id, amount)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapPaymentFromDb(data) : null;
  },

  mapPaymentFromDb(db: Record<string, any>): SupplierPayment {
    const supplier = Array.isArray(db.suppliers)
      ? (db.suppliers as any[])[0]
      : (db.suppliers as any) || undefined;
    const allocations = (db.supplier_payment_allocations as any[] | undefined) || [];
    return {
      id: db.id,
      orgId: db.org_id || undefined,
      branchId: db.branch_id,
      serialId: db.serial_id || undefined,
      supplierId: db.supplier_id,
      date: db.date,
      amount: toNum(db.amount),
      paymentMethod: (db.payment_method as SupplierPayment['paymentMethod']) || 'cash',
      reference: db.reference || undefined,
      notes: db.notes || undefined,
      voidedAt: db.voided_at || null,
      createdBy: db.created_by || undefined,
      createdByName: db.created_by_name || undefined,
      createdAt: db.created_at || undefined,
      updatedAt: db.updated_at || undefined,
      supplierName: supplier?.name || undefined,
      allocations: (allocations || []).map(
        (a: any): SupplierPaymentAllocation => ({
          id: a.id,
          orgId: a.org_id || undefined,
          paymentId: a.payment_id || undefined,
          purchaseId: a.purchase_id,
          amount: toNum(a.amount),
        })
      ),
    };
  },

  async recordPayment(
    input: RecordSupplierPaymentInput
  ): Promise<{ paymentId?: string; serialId?: string; success?: boolean }> {
    const payload: Record<string, unknown> = {
      supplierId: input.supplierId,
      branchId: input.branchId,
      orgId: input.orgId,
      amount: input.amount,
      date: input.date,
      paymentMethod: input.paymentMethod,
      reference: input.reference || null,
      notes: input.notes || null,
      performedBy: input.performedBy || null,
      performedByName: input.performedByName || null,
      shiftId: input.shiftId || null,
      allocations:
        input.allocations && input.allocations.length > 0
          ? input.allocations.map((a) => ({ purchaseId: a.purchaseId, amount: a.amount }))
          : [],
    };
    const { data, error } = await supabase.rpc('record_supplier_payment', {
      p_payload: payload,
      p_context: 'standalone',
    });
    if (error) throw error;
    return (data as { paymentId?: string; serialId?: string; success?: boolean }) || {};
  },

  async voidPayment(params: {
    paymentId: string;
    reason?: string;
    shiftId?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<{ success?: boolean }> {
    const { data, error } = await supabase.rpc('void_supplier_payment', {
      p_payment_id: params.paymentId,
      p_reason: params.reason || null,
      p_shift_id: params.shiftId || null,
      p_performer_id: params.performedBy || null,
      p_performer_name: params.performedByName || null,
    });
    if (error) throw error;
    return (data as { success?: boolean }) || {};
  },

  async reversePurchase(params: {
    purchaseId: string;
    reason?: string;
    shiftId?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<{ success?: boolean }> {
    const { data, error } = await supabase.rpc('reverse_supplier_purchase', {
      p_purchase_id: params.purchaseId,
      p_reason: params.reason || null,
      p_shift_id: params.shiftId || null,
      p_performer_id: params.performedBy || null,
      p_performer_name: params.performedByName || null,
    });
    if (error) throw error;
    return (data as { success?: boolean }) || {};
  },

  async reversePurchaseReturn(params: {
    returnId: string;
    reason?: string;
    shiftId?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<{ success?: boolean }> {
    const { data, error } = await supabase.rpc('reverse_supplier_purchase_return', {
      p_return_id: params.returnId,
      p_reason: params.reason || null,
      p_shift_id: params.shiftId || null,
      p_performer_id: params.performedBy || null,
      p_performer_name: params.performedByName || null,
    });
    if (error) throw error;
    return (data as { success?: boolean }) || {};
  },
};
