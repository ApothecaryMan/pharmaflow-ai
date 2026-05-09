import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useComputedInventory } from './useComputedInventory';
import { permissionsService } from '../../services/auth/permissionsService';
import { getGroupingKey } from '../../services/inventory/batchService';
import type { Drug, StockBatch } from '../../types';

// Mock dependencies
vi.mock('../../services/auth/permissionsService', () => ({
  permissionsService: {
    can: vi.fn(),
  },
}));

vi.mock('../../services/inventory/batchService', () => ({
  getGroupingKey: vi.fn((drug: Drug) => drug.id), // Default to ID for testing
}));

describe('useComputedInventory', () => {
  const mockDrugs: Drug[] = [
    { id: 'd1', name: 'Drug A', branchId: 'b1', costPrice: 10 } as Drug,
    { id: 'd2', name: 'Drug B', branchId: 'b1', costPrice: 20 } as Drug,
  ];

  const mockBatches: StockBatch[] = [
    { id: 'b1_1', drugId: 'd1', quantity: 5, expiryDate: '2026-12-31', branchId: 'b1', costPrice: 10 } as StockBatch,
    { id: 'b1_2', drugId: 'd1', quantity: 10, expiryDate: '2026-06-30', branchId: 'b1', costPrice: 10 } as StockBatch,
    { id: 'b2_1', drugId: 'd2', quantity: 15, expiryDate: '2027-01-01', branchId: 'b1', costPrice: 20 } as StockBatch,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (permissionsService.can as any).mockReturnValue(true);
  });

  it('should group batches and sum quantities correctly', () => {
    const { result } = renderHook(() => useComputedInventory(mockDrugs, mockBatches, 'b1'));

    expect(result.current).toHaveLength(2);
    
    const drugA = result.current.find(d => d.name === 'Drug A');
    expect(drugA?.stock).toBe(15);
    expect(drugA?.expiryDate).toBe('2026-06-30'); // Earliest
    expect(drugA?.batches).toHaveLength(2);
    // Should be sorted by expiry
    expect(drugA?.batches?.[0].id).toBe('b1_2'); 
  });

  it('should filter by branchId', () => {
    const mixedBatches = [
      ...mockBatches,
      { id: 'other_branch', drugId: 'd1', quantity: 100, branchId: 'b2' } as StockBatch,
    ];
    
    const { result } = renderHook(() => useComputedInventory(mockDrugs, mixedBatches, 'b1'));
    
    const drugA = result.current.find(d => d.name === 'Drug A');
    expect(drugA?.stock).toBe(15); // Should not include branch b2
  });

  it('should hide financials if user lacks permission', () => {
    (permissionsService.can as any).mockReturnValue(false);
    
    const { result } = renderHook(() => useComputedInventory(mockDrugs, mockBatches, 'b1'));
    
    const drugA = result.current.find(d => d.name === 'Drug A');
    expect(drugA?.costPrice).toBe(0);
    expect(drugA?.batches?.[0].costPrice).toBe(0);
  });

  it('should include drugs with zero stock', () => {
    const emptyInventory = [
      ...mockDrugs,
      { id: 'd3', name: 'Empty Drug', branchId: 'b1' } as Drug,
    ];
    
    const { result } = renderHook(() => useComputedInventory(emptyInventory, mockBatches, 'b1'));
    
    const emptyDrug = result.current.find(d => d.name === 'Empty Drug');
    expect(emptyDrug).toBeDefined();
    expect(emptyDrug?.stock).toBe(0);
  });
});
