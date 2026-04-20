import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supplierService } from './supplierService';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { idGenerator } from '../../utils/idGenerator';
import { Supplier } from '../../types';

// Mocks
vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../utils/idGenerator', () => ({
  idGenerator: {
    generate: vi.fn(),
  },
}));

describe('SupplierService', () => {
  let mockSuppliers: Supplier[];

  beforeEach(() => {
    mockSuppliers = [
      { id: 'S1', name: 'Pharma Dist', branchId: 'B1', contactPerson: 'John' } as Supplier
    ];
    vi.clearAllMocks();
    (storage.get as any).mockReturnValue(mockSuppliers);
    (settingsService.getAll as any).mockResolvedValue({ branchCode: 'B1' });
    (idGenerator.generate as any).mockReturnValue('S_NEW');
  });

  it('should create supplier', async () => {
    const newSup = { name: 'New Supplier', phone: '123' };
    const result = await supplierService.create(newSup as any);
    
    expect(result.id).toBe('S_NEW');
    expect(storage.set).toHaveBeenCalled();
  });

  it('should search suppliers', async () => {
    const results = await supplierService.search('Pharma');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('S1');

    const empty = await supplierService.search('Unknown');
    expect(empty).toHaveLength(0);
  });

  it('should delete supplier', async () => {
    await supplierService.delete('S1');
    
    const setCall = (storage.set as any).mock.calls[0];
    const savedData = setCall[1];
    expect(savedData).toHaveLength(0); // S1 removed
  });
});
