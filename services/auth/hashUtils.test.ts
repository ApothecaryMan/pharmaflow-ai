import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './hashUtils';

describe('HashUtils', () => {
  it('should produce a bcrypt hash in every environment', async () => {
    const hash = await hashPassword('mySecretPassword123');

    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^\$2a\$/);
  });

  it('should verify a correct password against a bcrypt hash', async () => {
    const hash = await hashPassword('correctBatteryHorse');

    expect(await verifyPassword('correctBatteryHorse', hash)).toBe(true);
  });

  it('should reject an incorrect password against a bcrypt hash', async () => {
    const hash = await hashPassword('securePassword');

    expect(await verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('should reject non-bcrypt stored hashes', async () => {
    expect(await verifyPassword('123456', '8d969eef6ecad3c29a3a629280e686cf0')).toBe(false);
  });

  it('should handle empty password hash as failsafe', async () => {
    expect(await verifyPassword('', '')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
  });

  it('should verify against a known fixed $2a$ hash (pgcrypto-compatible shape)', async () => {
    // Pinned fixture: a $2a$ cost-10 hash that pgcrypto's crypt() can verify.
    // Guards the bcryptjs <-> pgcrypto cross-implementation contract.
    expect(
      await verifyPassword(
        '123456',
        '$2a$10$ilJl3QcGbT66M0IHKxMCF.He.0Qtm.D/QmncNWeLzf/JtcmYrzzcO'
      )
    ).toBe(true);
    expect(
      await verifyPassword(
        'wrong',
        '$2a$10$ilJl3QcGbT66M0IHKxMCF.He.0Qtm.D/QmncNWeLzf/JtcmYrzzcO'
      )
    ).toBe(false);
  });

  it('should verify an Arabic password against a fixed $2a$ hash (UTF-8)', async () => {
    expect(
      await verifyPassword(
        'مرحبا123',
        '$2a$10$ilJl3QcGbT66M0IHKxMCF.3mcv9qU5hkyj9Jh1VhU3skrbHHCe6He'
      )
    ).toBe(true);
  });

  it('should support non-ASCII (Arabic) passwords', async () => {
    const password = 'مرحبا123';
    const hash = await hashPassword(password);

    expect(await verifyPassword(password, hash)).toBe(true);
  });
});
