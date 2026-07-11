import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, Sale } from '../../types';
import * as useSalesQuery from './useSalesQuery';
import * as useCustomersQuery from './useCustomersQuery';
import { useCustomers } from './useCustomersQuery';

import { useQuery } from '@tanstack/react-query';

// Mock the internal hook since it's exported from the same file, we can spy on it
// Or better yet, mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('./useSalesQuery', () => ({
  useRecentSales: vi.fn(),
}));

describe('useCustomers (Enrichment Logic)', () => {
  const mockCustomers: Customer[] = [
    { code: 'CUST-001', name: 'John Doe', branchId: 'branch-1' } as Customer,
    { code: 'CUST-002', name: 'Jane Smith', branchId: 'branch-1' } as Customer,
  ];

  const mockSales: Sale[] = [
    { id: 's1', customerCode: 'CUST-001', branchId: 'branch-1', total: 100, date: '2026-07-01T10:00:00Z' } as Sale,
    { id: 's2', customerCode: 'CUST-001', branchId: 'branch-1', total: 50, date: '2026-07-02T10:00:00Z' } as Sale,
    // CUST-002 has no sales
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useQuery for useRawCustomers
    (useQuery as any).mockReturnValue({
      data: mockCustomers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.spyOn(useSalesQuery, 'useRecentSales').mockReturnValue({
      data: mockSales,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  it('should enrich customers with totalPurchases, lastVisit, and visitCount', () => {
    const { result } = renderHook(() => useCustomers('branch-1'));

    const customers = result.current.data;
    expect(customers).toHaveLength(2);

    // Assert CUST-001 (Has sales)
    const john = customers.find((c: any) => c.code === 'CUST-001');
    expect(john).toBeDefined();
    expect(john?.totalPurchases).toBe(150); // 100 + 50
    expect(john?.visitCount).toBe(2);
    expect(john?.lastVisit).toBe('2026-07-02T10:00:00.000Z');

    // Assert CUST-002 (No sales)
    const jane = customers.find((c: any) => c.code === 'CUST-002');
    expect(jane).toBeDefined();
    expect(jane?.totalPurchases).toBe(0);
    expect(jane?.visitCount).toBe(0);
    expect(jane?.lastVisit).toBeNull();
  });
});
