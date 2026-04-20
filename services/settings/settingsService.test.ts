import { describe, it, expect, beforeEach, vi } from 'vitest';
import { settingsService } from './settingsService';
import { storage } from '../../utils/storage';
import { AppSettings } from './types';

// Mock storage
vi.mock('../../utils/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('SettingsService', () => {
  const defaultSettings = { 
    darkMode: false, 
    language: 'EN',
    branchCode: 'B1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default settings if storage is empty', async () => {
    (storage.get as any).mockReturnValue({});
    const settings = await settingsService.getAll();
    expect(settings.branchCode).toBe('B1'); // Default
    expect(settings.language).toBe('EN');
  });

  it('should merge stored settings with defaults', async () => {
    (storage.get as any).mockReturnValue({ branchCode: 'TEST_BRANCH', language: 'AR' });
    const settings = await settingsService.getAll();
    expect(settings.branchCode).toBe('TEST_BRANCH');
    expect(settings.language).toBe('AR');
    expect(settings.darkMode).toBe(false); // Default preserved
  });

  it('should update a single setting', async () => {
    (storage.get as any).mockReturnValue({});
    await settingsService.set('darkMode', true);
    
    expect(storage.set).toHaveBeenCalled();
    // Get the second arg of first call to storage.set
    const setCallArgs = (storage.set as any).mock.calls[0];
    expect(setCallArgs[1].darkMode).toBe(true);
  });
});
