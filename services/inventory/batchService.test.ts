import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StockBatch } from '../../types';
import { supabase } from '../../lib/supabase';
import { batchService } from './batchService';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn().mockResolvedValue({ activeBranchId: 'BR1', orgId: 'ORG1' }),
  },
}));

describe('batchService edge cases', () => {
  const mockBatches: StockBatch[] = [
    {
      id: 'expired',
      branchId: 'BR1',
      drugId: 'D1',
      batchNumber: 'OLD',
      expiryDate: '2020-01-01',
      quantity: 10,
      costPrice: 10,
      dateReceived: '2020-01-01',
      version: 1,
    },
    {
      id: 'soon',
      branchId: 'BR1',
      drugId: 'D1',
      batchNumber: 'SOON',
      expiryDate: '2030-01-01',
      quantity: 50,
      costPrice: 12,
      dateReceived: '2024-01-01',
      version: 1,
    },
    {
      id: 'later',
      branchId: 'BR1',
      drugId: 'D1',
      batchNumber: 'LATER',
      expiryDate: '2031-01-01',
      quantity: 100,
      costPrice: 15,
      dateReceived: '2024-01-01',
      version: 1,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ new_qty: 1, new_ver: 2 }],
      error: null,
    });
  });

  it('allocates across valid batches in FEFO order', async () => {
    vi.spyOn(batchService, 'getAllBatches').mockResolvedValue(mockBatches);

    const allocations = await batchService.allocateStock('D1', 60, 'BR1', false);

    expect(allocations).toEqual([
      { batchId: 'soon', quantity: 50, expiryDate: '2030-01-01', batchNumber: 'SOON' },
      { batchId: 'later', quantity: 10, expiryDate: '2031-01-01', batchNumber: 'LATER' },
    ]);
  });

  it('throws when an atomic decrement affects no rows', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null });

    await expect(batchService.updateBatchQuantity('soon', -1, true)).rejects.toThrow(
      'Insufficient batch stock'
    );
  });

  it('rolls back earlier batch deductions if a later allocation fails', async () => {
    vi.spyOn(batchService, 'getAllBatches').mockResolvedValue(mockBatches.slice(1));
    const updateSpy = vi.spyOn(batchService, 'updateBatchQuantity');
    updateSpy
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('Insufficient batch stock'))
      .mockResolvedValueOnce(null);

    await expect(batchService.allocateStock('D1', 60, 'BR1', true)).rejects.toThrow(
      'Insufficient batch stock'
    );

    expect(updateSpy).toHaveBeenNthCalledWith(1, 'soon', -50, true);
    expect(updateSpy).toHaveBeenNthCalledWith(2, 'later', -10, true);
    expect(updateSpy).toHaveBeenNthCalledWith(3, 'soon', 50, true);
  });

  it('returns partial quantities to original allocations without over-restoring', async () => {
    const rpc = vi.mocked(supabase.rpc);

    await batchService.returnStock(
      [
        { batchId: 'soon', quantity: 50, expiryDate: '2030-01-01', batchNumber: 'SOON' },
        { batchId: 'later', quantity: 10, expiryDate: '2031-01-01', batchNumber: 'LATER' },
      ],
      12,
      'D1',
      'BR1'
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('atomic_increment_batch', {
      p_batch_id: 'soon',
      p_delta: 12,
    });
  });
});
