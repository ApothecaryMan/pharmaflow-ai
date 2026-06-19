import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Supplier } from '../../types';
import { settingsService } from '../settings/settingsService';
import { supplierService } from './supplierService';
import { supplierRepository } from './repositories/supplierRepository';
import { supabase } from '../../lib/supabase';

// Mocks
vi.mock('./repositories/supplierRepository', () => ({
  supplierRepository: {
    mapFromDb: (db: any) => ({
      id: db.id,
      name: db.name,
      branchId: db.branch_id,
      orgId: db.org_id,
      contactPerson: db.contact_person,
      phone: db.phone,
      email: db.email,
      address: db.address,
      governorate: db.governorate,
      city: db.city,
      area: db.area,
      supplierCode: db.supplier_code,
      status: db.status,
    }),
    mapToDb: (s: any) => ({
      id: s.id,
      name: s.name,
      branch_id: s.branchId,
      org_id: s.orgId,
    }),
    getAll: vi.fn(),
    getById: vi.fn(),
    createWithRpc: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('../settings/settingsService', () => ({
  settingsService: {
    getAll: vi.fn(),
  },
}));

describe('SupplierService', () => {
  const branchUuid = '00000000-0000-0000-0000-000000000001';
  const orgUuid = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(settingsService.getAll).mockResolvedValue({
      branchCode: 'MAIN',
      activeBranchId: branchUuid,
      orgId: orgUuid,
    } as any);
  });

  it('should create supplier', async () => {
    const newSup = { name: 'New Supplier', phone: '123' };
    const createdSup = { id: 'S_NEW', ...newSup, branchId: branchUuid, orgId: orgUuid } as Supplier;
    
    vi.mocked(supplierRepository.createWithRpc).mockResolvedValue(createdSup);

    const result = await supplierService.create(newSup as any);

    expect(result.id).toBe('S_NEW');
    expect(supplierRepository.createWithRpc).toHaveBeenCalledWith(
      newSup,
      branchUuid,
      orgUuid
    );
  });

  it('should search suppliers', async () => {
    // We mock the DB format returning from supabase
    const mockDbSuppliers = [
      {
        id: 'S1',
        name: 'Pharma Dist',
        branch_id: branchUuid,
        org_id: orgUuid,
        contact_person: 'John',
      },
    ];

    // Spy on supabase.from to return mockDbSuppliers for the search query
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((onfulfilled) =>
        Promise.resolve({ data: mockDbSuppliers, error: null }).then(onfulfilled)
      ),
    } as any);

    const results = await supplierService.search('Pharma');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('S1');
  });

  it('should delete supplier', async () => {
    vi.mocked(supplierRepository.delete).mockResolvedValue(true);

    const result = await supplierService.delete('S1');

    expect(result).toBe(true);
    expect(supplierRepository.delete).toHaveBeenCalledWith('S1');
  });
});
