import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { 
  sanitizeExpiryInput, 
  checkExpiryStatus, 
  formatExpiryDisplay,
  parseExpiryDisplay
} from './expiryUtils';

describe('ExpiryUtils', () => {
  describe('sanitizeExpiryInput', () => {
    it('should allow valid digits', () => {
      expect(sanitizeExpiryInput('1')).toBe('1');
      expect(sanitizeExpiryInput('12')).toBe('12');
    });

    it('should prepend 0 for months 2-9 if typed as first char', () => {
      // If user types '2', it becomes '02'
      expect(sanitizeExpiryInput('2')).toBe('02');
      expect(sanitizeExpiryInput('9')).toBe('09');
      // '1' is ambiguous (could be 10, 11, 12), so it stays '1'
      expect(sanitizeExpiryInput('1')).toBe('1');
    });

    it('should reject non-digits', () => {
      expect(sanitizeExpiryInput('a')).toBeNull();
      expect(sanitizeExpiryInput('1a')).toBeNull();
    });

    it('should limit to 4 digits', () => {
      expect(sanitizeExpiryInput('12345')).toBeNull();
    });

    it('should validate month range (01-12)', () => {
      // '13' is invalid month
      expect(sanitizeExpiryInput('13')).toBeNull();
      // '00' is invalid
      expect(sanitizeExpiryInput('00')).toBeNull();
    });
  });

  describe('checkExpiryStatus', () => {
    beforeEach(() => {
        // Mock current date to 2026-06-01 for consistent tests
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-01'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return valid for future dates', () => {
      // 1226 -> Dec 2026 (Future)
      expect(checkExpiryStatus('1226')).toBe('valid');
      // 0127 -> Jan 2027 (Future)
      expect(checkExpiryStatus('0127')).toBe('valid');
    });

    it('should return invalid for past dates', () => {
      // 0126 -> Jan 2026 (Past relative to June 2026)
      expect(checkExpiryStatus('0126')).toBe('invalid');
      // 0526 -> May 2026 (Past)
      expect(checkExpiryStatus('0526')).toBe('invalid');
    });

    it('should return near-expiry for dates within 3 months', () => {
      // 0726 -> July 2026 (1 month away)
      expect(checkExpiryStatus('0726')).toBe('near-expiry');
      // 0826 -> Aug 2026 (2 months away)
      expect(checkExpiryStatus('0826')).toBe('near-expiry');
      // 0926 -> Sept 2026 (3 months away)
      expect(checkExpiryStatus('0926')).toBe('near-expiry');
    });

    it('should return valid if more than 3 months away', () => {
      // 1026 -> Oct 2026 (4 months away)
      expect(checkExpiryStatus('1026')).toBe('valid');
      // My logic might check <= 3, so 4 is safe
    });

    it('should handle incomplete input', () => {
       expect(checkExpiryStatus('12', { checkIncomplete: true })).toBe('incomplete');
    });
  });

  describe('formatExpiryDisplay', () => {
      it('should format MMYY to MM/20YY', () => {
          expect(formatExpiryDisplay('1225')).toBe('12/2025');
      });
      it('should ignore incomplete or formatted dates', () => {
          expect(formatExpiryDisplay('12')).toBe('12');
          expect(formatExpiryDisplay('12/2025')).toBe('12/2025');
      });
  });
});
