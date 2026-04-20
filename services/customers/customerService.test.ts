import { describe, it, expect, beforeEach, vi } from 'vitest';
import { customerService } from './customerService';
import { storage } from '../../utils/storage';
import { settingsService } from '../settings/settingsService';
import { idGenerator } from '../../utils/idGenerator';
import { Customer } from '../../types';

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

describe('CustomerService', () => {
  let mockCustomers: Customer[];

  beforeEach(() => {
    mockCustomers = [
      { id: 'C1', name: 'John Doe', branchId: 'B1', phone: '123', points: 100 } as Customer
    ];
    vi.clearAllMocks();
    (storage.get as any).mockReturnValue(mockCustomers);
    (settingsService.getAll as any).mockResolvedValue({ branchCode: 'B1' });
    (idGenerator.generate as any).mockReturnValue('C_NEW');
  });

  it('should create customer with correct defaults', async () => {
    const newCustomer = { name: 'Jane Doe', phone: '456' };
    const created = await customerService.create(newCustomer as any);
    
    expect(created.id).toBe('C_NEW');
    expect(created.branchId).toBe('B1');
    expect(created.points).toBe(0);
    expect(storage.set).toHaveBeenCalled();
  });

  it('should add loyalty points', async () => {
    const updated = await customerService.addLoyaltyPoints('C1', 50);
    expect(updated.points).toBe(150); // 100 + 50
    expect(storage.set).toHaveBeenCalled();
  });

  it('should redeem loyalty points if sufficient', async () => {
    const updated = await customerService.redeemLoyaltyPoints('C1', 50);
    expect(updated.points).toBe(50); // 100 - 50
  });

  it('should fail to redeem if points insufficient', async () => {
    await expect(customerService.redeemLoyaltyPoints('C1', 200)).rejects.toThrow('Insufficient points');
  });
});
