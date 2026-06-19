import { describe, expect, it } from 'vitest';
import { formatCurrency } from './currency';

describe('CurrencyUtils', () => {
  it('should format EGP by default (EGP)', () => {
    const formatted = formatCurrency(1000);
    expect(formatted).toContain('EGP');
    expect(formatted).toContain('1,000');
  });

  it('should format other currencies', () => {
    // EGP with specific locale
    const egp = formatCurrency(50.5, 'EGP', 'en-US');
    expect(egp).toContain('EGP');
    expect(egp).toContain('50.50');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toContain('0.00');
  });
});
