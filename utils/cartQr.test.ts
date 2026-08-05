import { describe, expect, it } from 'vitest';
import {
  MAX_CHARS,
  mergeDuplicateLines,
  parsePage,
  serializePages,
  toIsoMonth,
  toMmyy,
  type CartQrLine,
} from './cartQr';

const item = (over: Partial<import('../types/purchases').PurchaseItem> = {}) => ({
  id: 'i',
  drugId: 'd',
  barcode: '6221000000011',
  name: 'Test',
  quantity: 1,
  costPrice: 10,
  publicPrice: 20,
  expiryDate: '0326',
  ...over,
});

describe('toIsoMonth', () => {
  it('accepts MMYY', () => {
    expect(toIsoMonth('0326')).toBe('2026-03');
  });
  it('accepts YYYY-MM', () => {
    expect(toIsoMonth('2026-03')).toBe('2026-03');
  });
  it('accepts YYYY-MM-DD', () => {
    expect(toIsoMonth('2026-03-15')).toBe('2026-03');
  });
  it('accepts MM/YYYY and MM/YY', () => {
    expect(toIsoMonth('03/2026')).toBe('2026-03');
    expect(toIsoMonth('03/26')).toBe('2026-03');
  });
  it('rejects garbage and invalid months', () => {
    expect(toIsoMonth('')).toBeNull();
    expect(toIsoMonth('1326')).toBeNull();
    expect(toIsoMonth('not-a-date')).toBeNull();
  });
});

describe('toMmyy', () => {
  it('converts YYYY-MM to MMYY', () => {
    expect(toMmyy('2026-03')).toBe('0326');
  });
  it('passes through unparseable input', () => {
    expect(toMmyy('garbage')).toBe('garbage');
  });
});

describe('sanitization (via serializePages)', () => {
  it('skips lines without an international barcode', () => {
    const result = serializePages([item({ barcode: '' }), item({ barcode: '6221000000012' })], { timestamp: 0 });
    expect(result.pages[0].includes('6221000000012')).toBe(true);
    expect(result.pages[0].includes('6221000000011')).toBe(false);
  });

  it('skips barcodes containing delimiters or stray chars', () => {
    const bad = item({ barcode: '622100|0001' });
    const nl = item({ barcode: '622100\n0001' });
    const result = serializePages([bad, nl, item({ barcode: '6221000000013' })], { timestamp: 0 });
    expect(result.pages[0].includes('6221000000013')).toBe(true);
    expect(result.pages[0].includes('622100|')).toBe(false);
    expect(result.pages[0].includes('622100\n')).toBe(false);
  });

  it('skips zero/negative/NaN quantities', () => {
    const result = serializePages(
      [
        item({ barcode: 'A', quantity: 0 }),
        item({ barcode: 'B', quantity: -3 }),
        item({ barcode: 'C', quantity: Number.NaN }),
        item({ barcode: 'D', quantity: 4 }),
      ],
      { timestamp: 0 }
    );
    expect(result.pages[0].includes('D|4|2026-03')).toBe(true);
    expect(result.pages[0].includes('|C|')).toBe(false);
  });

  it('skips lines with unparseable expiry', () => {
    const result = serializePages([item({ barcode: 'E', expiryDate: 'bogus' }), item({ barcode: 'F' })], { timestamp: 0 });
    expect(result.pages[0].includes('F|1|2026-03')).toBe(true);
    expect(result.pages[0].includes('E|')).toBe(false);
  });
});

describe('paginate', () => {
  it('returns a single page for a small cart', () => {
    const cart = Array.from({ length: 20 }, (_, i) => item({ barcode: `CODE${i}`, quantity: 1 }));
    const result = serializePages(cart, { timestamp: 123 });
    expect(result.pages.length).toBe(1);
    expect(result.pages[0]).toMatch(/^PFAQ\|1\|1\|0\|123\|20\n/);
    expect(result.pages[0].length).toBeLessThanOrEqual(MAX_CHARS);
  });

  it('always splits into whole rows, no upper-page refusal', () => {
    const cart = Array.from({ length: 200 }, (_, i) =>
      item({ barcode: `9${String(i).padStart(16, '0')}`, quantity: 1 })
    );
    const result = serializePages(cart, { timestamp: 789 });
    // Generates as many pages as needed — every page <= MAX_CHARS and row-complete.
    expect(result.pages.length).toBeGreaterThan(1);
    for (const p of result.pages) {
      expect(p.length).toBeLessThanOrEqual(MAX_CHARS);
      // Header line: PFAQ|1|<total>|<i>|789|<count> — count is an integer equals row count.
      const lines = p.split('\n');
      const header = lines[0].split('|');
      const declaredCount = Number(header[5]);
      const actualRows = lines.length - 1;
      expect(declaredCount).toBe(actualRows);
    }
  });

  it('splits a large cart into pages each <= MAX_CHARS', () => {
    // Long barcodes force multiple pages.
    const cart = Array.from({ length: 60 }, (_, i) =>
      item({ barcode: `9${String(i).padStart(12, '0')}`, quantity: 1 })
    );
    const result = serializePages(cart, { timestamp: 456 });
    expect(result.pages.length).toBeGreaterThan(1);
    for (const p of result.pages) {
      expect(p.length).toBeLessThanOrEqual(MAX_CHARS);
    }
    // Headers carry page index and total.
    expect(result.pages[0]).toMatch(new RegExp(`^PFAQ\\|1\\|${result.pages.length}\\|0\\|456`));
    expect(result.pages[result.pages.length - 1]).toMatch(
      new RegExp(`^PFAQ\\|1\\|${result.pages.length}\\|${result.pages.length - 1}\\|456`)
    );
  });
});

describe('parsePage', () => {
  it('returns null for an unknown header', () => {
    expect(parsePage('HELLO|1|1|0|1|1')).toBeNull();
    expect(parsePage('PFAQ|9|1|0|1|1')).toBeNull();
    expect(parsePage('')).toBeNull();
  });

  it('parses a single page with header count and counts invalid lines', () => {
    const payload = [
      'PFAQ|1|1|0|123|4',
      '6221000000011|2|2026-03',
      '6221000000012|bad|2026-03',
      'too|many|fields|here',
      '6221000000013|5|2027-01',
    ].join('\n');
    const parsed = parsePage(payload);
    if (!parsed) throw new Error('expected a parse result');
    expect(parsed.fragment).toEqual({ pageIndex: 0, totalPages: 1, ts: 123 });
    expect(parsed.count).toBe(4);
    expect(parsed.invalid).toBe(2);
    expect(parsed.lines).toEqual([
      { code: '6221000000011', qty: 2, expiry: '2026-03' },
      { code: '6221000000013', qty: 5, expiry: '2027-01' },
    ]);
  });

  it('rejects out-of-range page indices', () => {
    expect(parsePage('PFAQ|1|3|7|123|1\nA|1|2026-03')).toBeNull();
  });
});

describe('mergeDuplicateLines', () => {
  const line = (code: string, expiry: string, qty: number): CartQrLine => ({ code, expiry, qty });

  it('merges same barcode + same expiry', () => {
    const out = mergeDuplicateLines([
      line('A', '2026-03', 2),
      line('A', '2026-03', 3),
      line('A', '2026-03', 1),
    ]);
    expect(out).toEqual([line('A', '2026-03', 6)]);
  });

  it('keeps same barcode with different expiry as separate lines', () => {
    const out = mergeDuplicateLines([
      line('A', '2026-03', 2),
      line('A', '2027-01', 5),
    ]);
    expect(out).toHaveLength(2);
  });

  it('preserves first-seen order', () => {
    const out = mergeDuplicateLines([
      line('B', '2026-03', 1),
      line('A', '2026-03', 1),
      line('B', '2026-03', 1),
      line('C', '2026-03', 1),
    ]);
    expect(out.map((l) => l.code)).toEqual(['B', 'A', 'C']);
    expect(out[0].qty).toBe(2);
  });
});
