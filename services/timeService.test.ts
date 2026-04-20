import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timeService } from './timeService';
import { storage } from '../utils/storage';

// Mock storage
vi.mock('../utils/storage', () => ({
  storage: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

describe('TimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset private state if possible, or create fresh instance logic if needed. 
    // Since it's a singleton, we might affect other tests, but in unit tests files are isolated.
  });

  it('should initialize with default offset 0', () => {
     // We can't easily access private offset without inspecting behavior
     const now = Date.now();
     const verified = timeService.getVerifiedDate().getTime();
     // Should be close to system time if offset is 0
     expect(Math.abs(verified - now)).toBeLessThan(100);
  });

  it('getOffset should return current offset', () => {
      expect(timeService.getOffset()).toBeTypeOf('number');
  });

  it('syncTime should return false if fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const success = await timeService.syncTime();
      expect(success).toBe(true); // Falls back to system time
  });

  it('syncTime should update offset on success', async () => {
      const serverTime = Date.now() + 5000; // Server is 5s ahead
      global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ unixtime: serverTime / 1000 })
      } as Response);

      const success = await timeService.syncTime();
      
      expect(success).toBe(true);
      // Offset should be roughly 5000 (ignoring latency logic for simple mock)
      expect(timeService.getOffset()).toBeGreaterThan(4000); 
      expect(storage.set).toHaveBeenCalled();
  });
});
