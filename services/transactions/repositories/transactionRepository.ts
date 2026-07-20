import { supabase } from '../../../lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

interface TransactionRpcSuccess {
  success?: boolean;
  error?: string;
  sale?: Record<string, unknown>;
}

interface TransactionRpcResult {
  data: TransactionRpcSuccess | null;
  error: PostgrestError | null;
}

interface CheckoutPayload {
  branchId: string;
  orgId: string;
  shiftId?: string;
  timestamp: string;
  performerId: string;
  performerName: string;
  items: {
    id: string;
    name: string;
    dosageForm?: string;
    quantity: number;
    isUnit: boolean;
    publicPrice: number;
    discount: number;
  }[];
  customerName: string;
  customerPhone?: string;
  customerCode?: string;
  customerAddress?: string;
  customerStreetAddress?: string;
  earnedPoints: number;
  paymentMethod: string;
  saleType: string;
  status: string;
  deliveryFee: number;
  globalDiscount: number;
  total: number;
  subtotal: number;
}

interface CancellationPayload {
  saleId: string;
  branchId: string;
  orgId: string;
  performerId: string;
  performerName: string;
}

interface OrderModificationPayload {
  saleId: string;
  branchId: string;
  orgId: string;
  performerId: string;
  performerName: string;
  total: number;
  subtotal: number;
  globalDiscount: number;
  items: {
    id: string;
    name: string;
    dosageForm?: string;
    quantity: number;
    isUnit: boolean;
    publicPrice: number;
    discount: number;
  }[];
}

interface ReturnPayload {
  saleId: string;
  branchId: string;
  orgId: string;
  performerId: string;
  performerName: string;
  returnType: string;
  reason: string;
  notes?: string;
  items: {
    drugId: string;
    saleItemId: string;
    quantity: number;
    isUnit: boolean;
    condition: string;
  }[];
}

interface FinalizeDeliveryPayload {
  saleId: string;
  shiftId?: string;
  performerId: string;
  performerName: string;
}

export const transactionRepository = {
  async processCheckout(payload: CheckoutPayload): Promise<TransactionRpcResult> {
    return supabase.rpc('process_checkout', { p_payload: payload });
  },

  async processCancellation(payload: CancellationPayload): Promise<TransactionRpcResult> {
    return supabase.rpc('process_cancellation', { p_payload: payload });
  },

  async processOrderModification(payload: OrderModificationPayload): Promise<TransactionRpcResult> {
    return supabase.rpc('process_order_modification', { p_payload: payload });
  },

  async processReturn(payload: ReturnPayload): Promise<TransactionRpcResult> {
    return supabase.rpc('process_return', { p_payload: payload });
  },

  async finalizeDeliveryOrder(payload: FinalizeDeliveryPayload): Promise<TransactionRpcResult> {
    return supabase.rpc('finalize_delivery_order', { p_payload: payload });
  },

  async deletePurchase(id: string): Promise<void> {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
  },
};
