/**
 * Password Hashing Utilities
 * Uses bcryptjs (pure JS) for consistent, environment-independent hashing.
 */

import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const BCRYPT_PATTERN = /^\$2[aby]\$/;

function isBcryptHash(storedHash: string): boolean {
  return BCRYPT_PATTERN.test(storedHash);
}

/**
 * Hash a password using bcrypt.
 * Output is deterministic in every environment (no crypto.subtle dependency).
 * Uses `$2a$` version for full compatibility with pgcrypto.crypt() on Supabase.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  const salt2a = `${salt.slice(0, 2)}a${salt.slice(3)}`;
  return bcrypt.hash(password, salt2a);
}

/**
 * Verify a password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false; // Failsafe
  if (!isBcryptHash(storedHash)) return false;
  return bcrypt.compare(password, storedHash);
}
