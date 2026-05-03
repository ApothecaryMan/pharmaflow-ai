import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { salesService } from '../../services/sales';
import { returnService } from '../../services/returns';
import { inventoryService } from '../../services/inventory';
import { purchaseService } from '../../services/purchases';
import type { StockBatch } from '../../types';

interface RealtimeSyncProps {
  activeBranchId: string;
  setSales: React.Dispatch<React.SetStateAction<any[]>>;
  setReturns: React.Dispatch<React.SetStateAction<any[]>>;
  setInventory: React.Dispatch<React.SetStateAction<any[]>>;
  setBatches: React.Dispatch<React.SetStateAction<StockBatch[]>>;
  setPurchases: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useRealtimeSync = ({
  activeBranchId,
  setSales,
  setReturns,
  setInventory,
  setBatches,
  setPurchases,
}: RealtimeSyncProps) => {
  useEffect(() => {
    if (!activeBranchId) return;

    // Subscribe to Sales
    const salesChannel = supabase
      .channel(`sales-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('Real-time Sale Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSale = salesService.mapFromDb(payload.new);
            setSales(prev => [newSale, ...prev.filter(s => s.id !== newSale.id)]);
          } else if (payload.eventType === 'DELETE') {
            setSales((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log(`Sales Subscription Status (${activeBranchId}):`, status);
      });

    // Subscribe to Returns
    const returnsChannel = supabase
      .channel(`returns-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'returns',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('Real-time Return Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newReturn = returnService.mapFromDb(payload.new);
            setReturns(prev => [newReturn, ...prev.filter(r => r.id !== newReturn.id)]);
          } else if (payload.eventType === 'DELETE') {
            setReturns((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log(`Returns Subscription Status (${activeBranchId}):`, status);
      });

    // Subscribe to Inventory (Drugs)
    const drugsChannel = supabase
      .channel(`drugs-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drugs',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('Real-time Drug Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newDrug = inventoryService.mapFromDb(payload.new);
            setInventory(prev => [newDrug, ...prev.filter(d => d.id !== newDrug.id)]);
          } else if (payload.eventType === 'DELETE') {
            setInventory((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to Stock Batches
    const batchesChannel = supabase
      .channel(`batches-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_batches',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('Real-time Batch Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newBatch: StockBatch = {
              id: payload.new.id,
              drugId: payload.new.drug_id,
              quantity: payload.new.quantity,
              expiryDate: payload.new.expiry_date,
              costPrice: payload.new.cost_price,
              batchNumber: payload.new.batch_number,
              dateReceived: payload.new.date_received,
              branchId: payload.new.branch_id,
              orgId: payload.new.org_id,
              version: payload.new.version
            };
            
            setBatches(prev => [newBatch, ...prev.filter(b => b.id !== newBatch.id)]);
          } else if (payload.eventType === 'DELETE') {
            setBatches((prev) => prev.filter((b) => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to Purchases
    const purchasesChannel = supabase
      .channel(`purchases-realtime-${activeBranchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
          filter: `branch_id=eq.${activeBranchId}`,
        },
        (payload: any) => {
          if (import.meta.env.DEV) console.log('Real-time Purchase Event:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newPurchase = purchaseService.mapFromDb(payload.new);
            setPurchases(prev => [newPurchase, ...prev.filter(p => p.id !== newPurchase.id)]);
          } else if (payload.eventType === 'DELETE') {
            setPurchases((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(returnsChannel);
      supabase.removeChannel(drugsChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(purchasesChannel);
    };
  }, [activeBranchId, setSales, setReturns, setInventory, setBatches, setPurchases]);
};
