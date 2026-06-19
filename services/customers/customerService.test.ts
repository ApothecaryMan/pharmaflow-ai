import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { settingsService } from '../settings/settingsService';
import { customerService } from './customerService';
import { customerRepository } from './repositories/customerRepository';

// Mocks
vi.mock('./repositories/customerRepository', () => ({
  customerRepository: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByPhone: vi.fn(),
    findByFilters: vi.fn(),
    insert: vi.fn(),
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

vi.mock('../../utils/idGenerator', () => ({
  idGenerator: {
    generate: vi.fn().mockResolvedValue('C_NEW'),
    uuid: vi.fn().mockReturnValue('C_NEW'),
    code: vi.fn().mockReturnValue('CUST-NEW'),
  },
}));

describe('CustomerService', () => {
  let mockCustomer: Customer;

  beforeEach(() => {
    mockCustomer = {
      id: 'C1',
      name: 'John Doe',
      branchId: 'B1',
      phone: '123',
      points: 100,
    } as Customer;

    vi.clearAllMocks();
    vi.mocked(settingsService.getAll).mockResolvedValue({
      branchCode: 'B1',
      activeBranchId: 'B1',
      orgId: 'ORG_1',
    } as any);
    vi.mocked(idGenerator.generate).mockResolvedValue('C_NEW');
    vi.mocked(idGenerator.uuid).mockReturnValue('C_NEW');
  });

  it('should create customer with correct defaults', async () => {
    const newCustomer = { name: 'Jane Doe', phone: '456' };
    const created = await customerService.create(newCustomer as any);

    expect(created.id).toBe('C_NEW');
    expect(created.branchId).toBe('B1');
    expect(created.points).toBe(0);
    expect(customerRepository.insert).toHaveBeenCalled();
  });

  it('should add loyalty points', async () => {
    vi.mocked(customerRepository.getById).mockResolvedValue(mockCustomer);
    vi.mocked(customerRepository.update).mockImplementation(async (id, updates) => {
      return { ...mockCustomer, ...updates } as Customer;
    });

    const updated = await customerService.addLoyaltyPoints('C1', 50);
    expect(updated.points).toBe(150); // 100 + 50
    expect(customerRepository.update).toHaveBeenCalledWith('C1', { points: 150 });
  });

  it('should redeem loyalty points if sufficient', async () => {
    vi.mocked(customerRepository.getById).mockResolvedValue(mockCustomer);
    vi.mocked(customerRepository.update).mockImplementation(async (id, updates) => {
      return { ...mockCustomer, ...updates } as Customer;
    });

    const updated = await customerService.redeemLoyaltyPoints('C1', 50);
    expect(updated.points).toBe(50); // 100 - 50
    expect(customerRepository.update).toHaveBeenCalledWith('C1', { points: 50 });
  });

  it('should fail to redeem if points insufficient', async () => {
    vi.mocked(customerRepository.getById).mockResolvedValue(mockCustomer);

    await expect(customerService.redeemLoyaltyPoints('C1', 200)).rejects.toThrow(
      'Insufficient points'
    );
  });
});
