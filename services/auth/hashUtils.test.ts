import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './hashUtils';

describe('HashUtils', () => {
  it('should hash a password consistently', async () => {
    const password = 'mySecretPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).toBeDefined();
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
    expect(hash1).toBe(hash2); // Deterministic
  });

  it('should verify correct password', async () => {
    const password = 'correctBatteryHorse';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'securePassword';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('should handle empty password', async () => {
    const hash = await hashPassword('');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(true);
  });
});
