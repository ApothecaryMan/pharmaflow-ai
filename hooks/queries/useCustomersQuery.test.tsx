import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../types';
import { useCustomers } from './useCustomersQuery';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('useCustomers', () => {
  const mockCustomers: Customer[] = [
    { code: 'CUST-001', name: 'John Doe', branchId: 'branch-1' } as Customer,
    { code: 'CUST-002', name: 'Jane Smith', branchId: 'branch-1' } as Customer,
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useQuery as any).mockReturnValue({
      data: mockCustomers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('should return customers from useRawCustomers directly', () => {
    const { result } = renderHook(() => useCustomers('branch-1'));

    const customers = result.current.data;
    expect(customers).toHaveLength(2);
    expect(customers).toEqual(mockCustomers);
  });

  it('should pass enabled option to useRawCustomers', () => {
    renderHook(() => useCustomers('branch-1', { enabled: false }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });
});
