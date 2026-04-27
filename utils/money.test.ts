import { describe, expect, it } from 'vitest';
import { money, pricing } from './money';

describe('money precision edge cases', () => {
  it('avoids binary floating point drift for common currency operations', () => {
    expect(money.add(0.1, 0.2)).toBe(0.3);
    expect(money.subtract(10.0, 9.99)).toBe(0.01);
    expect(pricing.discountAmount(35, 33.33)).toBe(11.67);
  });

  it('allocates every cent when splitting uneven totals', () => {
    const split = money.allocate(35, [1, 1, 1]);

    expect(split).toEqual([11.67, 11.67, 11.66]);
    expect(split.reduce((sum, value) => money.add(sum, value), 0)).toBe(35);
  });
});
